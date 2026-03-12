// ============================================================
// apps/site-template/worker/index.ts
// Cloudflare Worker 入口文件
//
// 架构说明：
// ┌─────────────────────────────────────────────────────────┐
// │  Cloudflare Pages（托管 Astro 静态资源 dist/）          │
// │    ↓ Pages Functions / Worker 拦截 API 请求             │
// │  Cloudflare Worker（本文件）                            │
// │    ↓ 识别站点 → 查询 D1 → 返回 JSON                    │
// │  Cloudflare D1（SQLite 数据库）                         │
// └─────────────────────────────────────────────────────────┘
//
// 认证流程（Google OAuth 2.0）：
// 1. 前端点击登录 → 跳转 /api/auth/google
// 2. Worker 重定向到 Google 授权页
// 3. Google 回调到 /api/auth/callback?code=...
// 4. Worker 换取 token → 获取用户信息 → 写入 D1 → Set-Cookie → 重定向首页
// 5. 前端请求 /api/auth/me → Worker 验证 Cookie → 返回用户信息
// ============================================================

import { createRepositories } from "@saas-matrix/core";
import type { D1Database } from "@saas-matrix/core";
import {
    buildGoogleAuthUrl,
    exchangeCodeForTokens,
    fetchGoogleUserInfo,
    generateSessionId,
    signSessionCookie,
    verifySessionCookie,
    buildSetCookieHeader,
    buildClearCookieHeader,
    extractSessionCookie,
    getSessionExpiresAt,
    generateOAuthState,
} from "@saas-matrix/core";
import {
    createCheckoutSession,
    verifyCreemWebhook,
    parseWebhookEvent,
    getCustomerPortalLink,
} from "./creem.js";

// Worker 环境绑定类型
export interface WorkerEnv {
    DB: D1Database;                 // D1 数据库绑定（wrangler.toml 中配置）
    SITE_KEY: string;               // 当前站点 key（wrangler.toml vars 中配置）
    ENVIRONMENT: string;
    // Google OAuth 配置
    GOOGLE_CLIENT_ID: string;
    GOOGLE_CLIENT_SECRET: string;   // 通过 wrangler secret put 存储
    JWT_SECRET: string;             // Session Cookie 签名密钥
    // Creem 支付配置
    CREEM_API_KEY: string;          // Creem API Key
    CREEM_WEBHOOK_SECRET: string;   // Creem Webhook 签名密钥
    CREDITS_API_KEY: string;        // 内部积分扣减接口密钥（供业务系统调用）
    CREEM_TEST_MODE: string;        // "true" 使用测试模式
}

// ----------------------------------------------------------------
// CORS 头（允许 Astro 构建时跨域请求）
// ----------------------------------------------------------------
const CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
};

function jsonResponse(data: unknown, status = 200): Response {
    return new Response(JSON.stringify(data), {
        status,
        headers: {
            "Content-Type": "application/json",
            ...CORS_HEADERS,
        },
    });
}

function errorResponse(message: string, status = 400): Response {
    return jsonResponse({ error: message }, status);
}

function redirectResponse(url: string, headers?: HeadersInit): Response {
    return new Response(null, {
        status: 302,
        headers: {
            Location: url,
            ...headers,
        },
    });
}

// ----------------------------------------------------------------
// 站点识别：根据请求 Host 或 query param 识别当前站点
// ----------------------------------------------------------------
async function resolveSite(request: Request, env: WorkerEnv, repos: ReturnType<typeof createRepositories>) {
    const url = new URL(request.url);

    // 优先使用 query param（构建时使用）：/api/posts?site=site-template
    const siteKey = url.searchParams.get("site") || env.SITE_KEY;

    // 从 D1 查找站点
    let site = await repos.sites.getSiteByKey(siteKey);

    // 若未找到，尝试通过 Host 域名查找
    if (!site) {
        const domain = request.headers.get("host")?.split(":")[0] || "";
        site = await repos.sites.getSiteByDomain(domain);
    }

    return site;
}

// ----------------------------------------------------------------
// Google OAuth 回调地址
// ----------------------------------------------------------------
function getGoogleCallbackUrl(request: Request): string {
    const url = new URL(request.url);
    return `${url.protocol}//${url.host}/api/auth/callback`;
}

// ----------------------------------------------------------------
// Worker 主入口
// ----------------------------------------------------------------
export default {
    async fetch(request: Request, env: WorkerEnv): Promise<Response> {
        const url = new URL(request.url);

        // OPTIONS 预检请求
        if (request.method === "OPTIONS") {
            return new Response(null, { status: 204, headers: CORS_HEADERS });
        }

        // 只处理 /api/* 路由，其他请求返回 404（Pages 静态资源由 CF Pages 直接托管）
        if (!url.pathname.startsWith("/api/")) {
            return errorResponse("Not Found", 404);
        }

        const repos = createRepositories(env.DB);

        // ---- 路由分发 ----
        try {
            // ============================================================
            // 认证路由（Google OAuth 2.0）
            // ============================================================

            // GET /api/auth/google → 发起 Google OAuth 授权
            if (url.pathname === "/api/auth/google" && request.method === "GET") {
                const state = generateOAuthState();
                const redirectUri = getGoogleCallbackUrl(request);
                const authUrl = buildGoogleAuthUrl(env.GOOGLE_CLIENT_ID, redirectUri, state);

                // 将 state 存入 Cookie 用于 CSRF 验证
                return redirectResponse(authUrl, {
                    "Set-Cookie": `oauth_state=${state}; Max-Age=600; Path=/; HttpOnly; SameSite=Lax`,
                });
            }

            // GET /api/auth/callback → Google OAuth 回调处理
            if (url.pathname === "/api/auth/callback" && request.method === "GET") {
                const code = url.searchParams.get("code");
                const state = url.searchParams.get("state");
                const error = url.searchParams.get("error");

                if (error) {
                    return redirectResponse(`/auth/login?error=${encodeURIComponent(error)}`);
                }

                if (!code || !state) {
                    return redirectResponse("/auth/login?error=invalid_request");
                }

                // 验证 CSRF state（从 Cookie 读取）
                const cookieHeader = request.headers.get("cookie") || "";
                const storedState = cookieHeader.match(/oauth_state=([^;]+)/)?.[1];
                if (!storedState || storedState !== state) {
                    return redirectResponse("/auth/login?error=state_mismatch");
                }

                // 查找站点
                const site = await resolveSite(request, env, repos);
                if (!site) {
                    return redirectResponse("/auth/login?error=site_not_found");
                }

                // 换取 Access Token
                const redirectUri = getGoogleCallbackUrl(request);
                const tokens = await exchangeCodeForTokens(
                    code,
                    env.GOOGLE_CLIENT_ID,
                    env.GOOGLE_CLIENT_SECRET,
                    redirectUri
                );

                // 获取 Google 用户信息
                const profile = await fetchGoogleUserInfo(tokens.access_token);

                // Upsert 用户到 D1
                const user = await repos.users.upsertOAuthUser({
                    siteId: site.id,
                    email: profile.email,
                    displayName: profile.name,
                    avatarUrl: profile.picture,
                    provider: "google",
                    providerId: profile.sub,
                    emailVerified: profile.email_verified,
                });

                // 创建 Session
                const sessionId = generateSessionId();
                const expiresAt = getSessionExpiresAt(30);
                await repos.sessions.createSession({
                    id: sessionId,
                    userId: user.id,
                    siteId: site.id,
                    expiresAt,
                });

                // 签名 Cookie 并重定向到首页
                const signedCookie = await signSessionCookie(sessionId, env.JWT_SECRET);
                const setCookieHeader = buildSetCookieHeader(signedCookie);

                return redirectResponse("/dashboard", {
                    "Set-Cookie": setCookieHeader,
                    // 清除 oauth_state cookie
                    "Set-Cookie-2": "oauth_state=; Max-Age=0; Path=/; HttpOnly",
                });
            }

            // GET /api/auth/me → 获取当前登录用户信息
            if (url.pathname === "/api/auth/me" && request.method === "GET") {
                const cookieHeader = request.headers.get("cookie");
                const rawCookie = extractSessionCookie(cookieHeader);

                if (!rawCookie) {
                    return jsonResponse({ user: null }, 200);
                }

                const sessionId = await verifySessionCookie(rawCookie, env.JWT_SECRET);
                if (!sessionId) {
                    return jsonResponse({ user: null }, 200);
                }

                const session = await repos.sessions.getSession(sessionId);
                if (!session) {
                    return jsonResponse({ user: null }, 200);
                }

                const user = await repos.users.getUserById(session.user_id);
                if (!user) {
                    return jsonResponse({ user: null }, 200);
                }

                return jsonResponse({
                    user: {
                        id: user.id,
                        email: user.email,
                        displayName: user.display_name,
                        avatarUrl: user.avatar_url,
                        role: user.role,
                    },
                });
            }

            // POST /api/auth/logout → 登出
            if (url.pathname === "/api/auth/logout" && request.method === "POST") {
                const cookieHeader = request.headers.get("cookie");
                const rawCookie = extractSessionCookie(cookieHeader);

                if (rawCookie) {
                    const sessionId = await verifySessionCookie(rawCookie, env.JWT_SECRET);
                    if (sessionId) {
                        await repos.sessions.deleteSession(sessionId);
                    }
                }

                return new Response(JSON.stringify({ success: true }), {
                    status: 200,
                    headers: {
                        "Content-Type": "application/json",
                        "Set-Cookie": buildClearCookieHeader(),
                        ...CORS_HEADERS,
                    },
                });
            }

            // ============================================================
            // 数据路由
            // ============================================================

            // GET /api/site - 获取当前站点信息（含导航）
            if (url.pathname === "/api/site") {
                const site = await resolveSite(request, env, repos);
                if (!site) return errorResponse("Site not found", 404);

                const navLinks = await repos.navLinks.getNavLinks(site.id);
                return jsonResponse({ site, navLinks });
            }

            // GET /api/posts - 获取文章列表
            if (url.pathname === "/api/posts") {
                const site = await resolveSite(request, env, repos);
                if (!site) return errorResponse("Site not found", 404);

                const posts = await repos.posts.getPosts(site.id);
                return jsonResponse({ posts });
            }

            // GET /api/posts/:slug - 获取文章详情
            const postMatch = url.pathname.match(/^\/api\/posts\/([^/]+)$/);
            if (postMatch) {
                const slug = postMatch[1];
                const site = await resolveSite(request, env, repos);
                if (!site) return errorResponse("Site not found", 404);

                const post = await repos.posts.getPostBySlug(site.id, slug);
                if (!post) return errorResponse("Post not found", 404);

                return jsonResponse(post);
            }

            // GET /api/docs - 获取文档列表
            if (url.pathname === "/api/docs") {
                const site = await resolveSite(request, env, repos);
                if (!site) return errorResponse("Site not found", 404);

                const docs = await repos.docs.getDocs(site.id);
                return jsonResponse({ docs });
            }

            // GET /api/docs/:slug - 获取文档详情
            const docMatch = url.pathname.match(/^\/api\/docs\/([^/]+)$/);
            if (docMatch) {
                const slug = docMatch[1];
                const site = await resolveSite(request, env, repos);
                if (!site) return errorResponse("Site not found", 404);

                const doc = await repos.docs.getDocBySlug(site.id, slug);
                if (!doc) return errorResponse("Doc not found", 404);

                return jsonResponse(doc);
            }

            // GET /api/plans - 获取定价套餐（预留）
            if (url.pathname === "/api/plans") {
                const site = await resolveSite(request, env, repos);
                if (!site) return errorResponse("Site not found", 404);

                const plans = await repos.plans.getPlans(site.id);
                return jsonResponse({ plans });
            }

            // GET /api/sitemap - 返回所有可生成 sitemap 的路径
            if (url.pathname === "/api/sitemap") {
                const site = await resolveSite(request, env, repos);
                if (!site) return errorResponse("Site not found", 404);

                const [posts, docs] = await Promise.all([
                    repos.posts.getPosts(site.id),
                    repos.docs.getDocs(site.id),
                ]);

                const paths = [
                    { path: "/", lastmod: new Date().toISOString().split("T")[0], priority: 1.0 },
                    { path: "/blog", lastmod: new Date().toISOString().split("T")[0], priority: 0.8 },
                    { path: "/docs", lastmod: new Date().toISOString().split("T")[0], priority: 0.8 },
                    ...posts.map((p) => ({
                        path: `/blog/${p.slug}`,
                        lastmod: p.updated_at.split("T")[0],
                        priority: 0.7,
                    })),
                    ...docs.map((d) => ({
                        path: `/docs/${d.slug}`,
                        lastmod: d.updated_at.split("T")[0],
                        priority: 0.6,
                    })),
                ];

                return jsonResponse({ site, paths });
            }

            // ============================================================
            // 支付路由 - Creem Payment
            // ============================================================

            // POST /api/payment/checkout - 创建 Creem Checkout Session
            if (url.pathname === "/api/payment/checkout" && request.method === "POST") {
                const rawCookie = extractSessionCookie(request.headers.get("cookie"));
                if (!rawCookie) return errorResponse("Unauthorized", 401);
                const sessionId = await verifySessionCookie(rawCookie, env.JWT_SECRET);
                if (!sessionId) return errorResponse("Invalid session", 401);
                const session = await repos.sessions.getSession(sessionId);
                if (!session || new Date(session.expires_at) < new Date()) return errorResponse("Session expired", 401);
                const user = await repos.users.getUserById(session.user_id);
                if (!user) return errorResponse("User not found", 401);

                const site = await resolveSite(request, env, repos);
                if (!site) return errorResponse("Site not found", 404);

                const checkoutBody = await request.json() as { planId?: string };
                if (!checkoutBody.planId) return errorResponse("planId is required", 400);

                const plan = await repos.plans.getPlanById(checkoutBody.planId);
                if (!plan || !plan.creem_product_id || plan.creem_product_id.endsWith("_TODO")) {
                    return errorResponse("Plan not configured - update creem_product_id in wrangler.toml", 400);
                }

                const useTestMode = env.CREEM_TEST_MODE === "true";
                const origin = request.headers.get("Origin") || `https://${url.hostname}`;

                const orderId = await repos.orders.createOrder({
                    user_id: user.id, site_id: site.id, plan_id: plan.id,
                    creem_checkout_id: null, creem_order_id: null,
                    type: plan.billing_cycle === "one_time" ? "one_time" : "subscription",
                    status: "pending", amount: plan.price, currency: plan.currency,
                    credits_amount: plan.credits_per_cycle,
                });

                const checkout = await createCheckoutSession({
                    productId: plan.creem_product_id,
                    successUrl: `${origin}/payment/success?orderId=${orderId}`,
                    customerEmail: user.email,
                    metadata: { userId: user.id, planId: plan.id, orderId, siteId: site.id },
                }, env.CREEM_API_KEY, useTestMode);

                return jsonResponse({ checkoutUrl: checkout.checkoutUrl, checkoutId: checkout.checkoutId });
            }

            // POST /api/payment/webhook - Creem Webhook（公开，Creem HMAC 签名验证）
            if (url.pathname === "/api/payment/webhook" && request.method === "POST") {
                const signature = request.headers.get("creem-signature") || "";
                const rawBody = await request.text();

                const isValid = await verifyCreemWebhook(rawBody, signature, env.CREEM_WEBHOOK_SECRET);
                if (!isValid) {
                    console.warn("[Webhook] Invalid signature");
                    return errorResponse("Invalid signature", 401);
                }

                const event = parseWebhookEvent(JSON.parse(rawBody));
                const { eventType, object: obj } = event;
                console.log("[Webhook]", eventType, obj?.id);

                const wbUserId = obj?.metadata?.userId;
                const wbPlanId = obj?.metadata?.planId;
                const wbSiteId = obj?.metadata?.siteId;
                if (!wbUserId || !wbSiteId) return jsonResponse({ received: true });

                const wbUser = await repos.users.getUserById(wbUserId);
                if (!wbUser) return jsonResponse({ received: true });

                // checkout.completed → 充值积分（一次性购买）
                if (eventType === "checkout.completed" && wbPlanId) {
                    const wbPlan = await repos.plans.getPlanById(wbPlanId);
                    if (wbPlan && wbPlan.credits_per_cycle > 0) {
                        await repos.credits.addCredits({
                            userId: wbUserId, siteId: wbSiteId, amount: wbPlan.credits_per_cycle,
                            type: "topup", reason: `Purchased: ${wbPlan.name}`,
                            idempotencyKey: `checkout-${obj?.id}-${wbUserId}`,
                        });
                    }
                }

                // subscription.active / paid → 订阅积分发放（防重发）
                if ((eventType === "subscription.active" || eventType === "subscription.paid") && wbPlanId) {
                    const subId = obj?.subscriptionId || obj?.id;
                    const customerId = obj?.customerId;
                    const wbPlan = await repos.plans.getPlanById(wbPlanId);
                    if (!subId || !customerId || !wbPlan) return jsonResponse({ received: true });

                    await repos.subscriptions.upsertSubscription({
                        user_id: wbUserId, site_id: wbSiteId, plan_id: wbPlanId,
                        creem_subscription_id: subId, creem_customer_id: customerId,
                        status: "active",
                        current_period_start: obj?.currentPeriodStart ?? null,
                        current_period_end: obj?.currentPeriodEnd ?? null,
                        credits_granted_at: null,
                    });

                    const existingSub = await repos.subscriptions.getByCreemSubscriptionId(subId);
                    const alreadyGranted = existingSub?.credits_granted_at && existingSub.current_period_start
                        && existingSub.credits_granted_at >= existingSub.current_period_start;

                    if (!alreadyGranted && wbPlan.credits_per_cycle > 0) {
                        const result = await repos.credits.addCredits({
                            userId: wbUserId, siteId: wbSiteId, amount: wbPlan.credits_per_cycle,
                            type: "subscription_grant", reason: `Subscription: ${wbPlan.name}`,
                            idempotencyKey: `sub-${subId}-${obj?.currentPeriodStart || "init"}`,
                        });
                        if (result !== null) await repos.subscriptions.markCreditsGranted(subId);
                    }
                }

                // subscription.canceled / expired
                if ((eventType === "subscription.canceled" || eventType === "subscription.expired") && wbPlanId) {
                    const subId = obj?.subscriptionId || obj?.id;
                    const customerId = obj?.customerId;
                    if (subId && customerId) {
                        await repos.subscriptions.upsertSubscription({
                            user_id: wbUserId, site_id: wbSiteId, plan_id: wbPlanId,
                            creem_subscription_id: subId, creem_customer_id: customerId,
                            status: eventType === "subscription.canceled" ? "canceled" : "expired",
                            current_period_start: obj?.currentPeriodStart ?? null,
                            current_period_end: obj?.currentPeriodEnd ?? null,
                            credits_granted_at: null,
                        });
                    }
                }

                return jsonResponse({ received: true });
            }

            // GET /api/payment/portal - 生成 Creem 客户门户链接（需登录 + 有订阅）
            if (url.pathname === "/api/payment/portal" && request.method === "GET") {
                const rawCookie = extractSessionCookie(request.headers.get("cookie"));
                if (!rawCookie) return errorResponse("Unauthorized", 401);
                const sessionId = await verifySessionCookie(rawCookie, env.JWT_SECRET);
                if (!sessionId) return errorResponse("Invalid session", 401);
                const session = await repos.sessions.getSession(sessionId);
                if (!session) return errorResponse("Session not found", 401);

                const sub = await repos.subscriptions.getActiveSubscription(session.user_id);
                if (!sub) return errorResponse("No active subscription", 404);

                const portalUrl = await getCustomerPortalLink(sub.creem_customer_id, env.CREEM_API_KEY, env.CREEM_TEST_MODE === "true");
                return jsonResponse({ portalUrl });
            }

            // ============================================================
            // 积分路由 - Credits
            // ============================================================

            // GET /api/credits/balance - 查询积分余额（需登录）
            if (url.pathname === "/api/credits/balance" && request.method === "GET") {
                const rawCookie = extractSessionCookie(request.headers.get("cookie"));
                if (!rawCookie) return errorResponse("Unauthorized", 401);
                const sessionId = await verifySessionCookie(rawCookie, env.JWT_SECRET);
                if (!sessionId) return errorResponse("Invalid session", 401);
                const session = await repos.sessions.getSession(sessionId);
                if (!session) return errorResponse("Session not found", 401);

                const [credits, sub, transactions] = await Promise.all([
                    repos.credits.getCredits(session.user_id),
                    repos.subscriptions.getActiveSubscription(session.user_id),
                    repos.credits.getTransactions(session.user_id, 20),
                ]);

                return jsonResponse({
                    balance: credits?.balance ?? 0,
                    subscription: sub ? { status: sub.status, periodEnd: sub.current_period_end, planId: sub.plan_id } : null,
                    recentTransactions: transactions,
                });
            }

            // POST /api/credits/deduct - 扣减积分（业务系统调用，x-credits-api-key 认证）
            if (url.pathname === "/api/credits/deduct" && request.method === "POST") {
                const apiKey = request.headers.get("x-credits-api-key")
                    || request.headers.get("authorization")?.replace("Bearer ", "");
                if (!apiKey || apiKey !== env.CREDITS_API_KEY) {
                    return errorResponse("Unauthorized: invalid API key", 401);
                }

                const deductBody = await request.json() as { userId?: string; amount?: number; reason?: string };
                const { userId: dUserId, amount: dAmount, reason: dReason } = deductBody;
                if (!dUserId || !dAmount || dAmount <= 0) {
                    return errorResponse("userId and amount (positive integer) are required", 400);
                }

                const site = await resolveSite(request, env, repos);
                if (!site) return errorResponse("Site not found", 404);

                try {
                    const balanceAfter = await repos.credits.addCredits({
                        userId: dUserId, siteId: site.id, amount: -Math.abs(dAmount),
                        type: "deduct", reason: dReason || "API deduction",
                    });
                    return jsonResponse({ success: true, deducted: dAmount, balanceAfter: balanceAfter ?? 0 });
                } catch (err) {
                    const msg = err instanceof Error ? err.message : "";
                    if (msg.includes("Insufficient")) return errorResponse("Insufficient credits", 402);
                    if (msg.includes("Optimistic lock")) return errorResponse("Conflict, please retry", 409);
                    throw err;
                }
            }

            // GET /api/subscriptions/me - 当前用户订阅状态（需登录）
            if (url.pathname === "/api/subscriptions/me" && request.method === "GET") {
                const rawCookie = extractSessionCookie(request.headers.get("cookie"));
                if (!rawCookie) return errorResponse("Unauthorized", 401);
                const sessionId = await verifySessionCookie(rawCookie, env.JWT_SECRET);
                if (!sessionId) return errorResponse("Invalid session", 401);
                const session = await repos.sessions.getSession(sessionId);
                if (!session) return errorResponse("Session not found", 401);

                const sub = await repos.subscriptions.getActiveSubscription(session.user_id);
                if (!sub) return jsonResponse({ subscription: null });

                const plan = await repos.plans.getPlanById(sub.plan_id);
                return jsonResponse({
                    subscription: {
                        ...sub,
                        plan: plan ? { id: plan.id, name: plan.name, creditsPerCycle: plan.credits_per_cycle, billingCycle: plan.billing_cycle } : null,
                    },
                });
            }

            // GET /api/plans - 获取所有可用套餐（公开）
            if (url.pathname === "/api/plans" && request.method === "GET") {
                const site = await resolveSite(request, env, repos);
                if (!site) return errorResponse("Site not found", 404);

                const [subscriptionPlans, creditPackages] = await Promise.all([
                    repos.plans.getSubscriptionPlans(site.id),
                    repos.plans.getCreditPackages(site.id),
                ]);
                return jsonResponse({ subscriptionPlans, creditPackages });
            }


            return errorResponse("Not Found", 404);
        } catch (err) {
            console.error("[Worker Error]", err);
            const message = err instanceof Error ? err.message : "Internal Server Error";
            return errorResponse(message, 500);
        }
    },
} satisfies ExportedHandler<WorkerEnv>;
