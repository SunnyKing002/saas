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
// 集成方式（已选方案）：
// Astro 构建为纯静态文件，Worker 作为「API 层」提供数据接口。
// Astro 在构建时（SSG）通过 fetch WORKER_API_URL 获取动态数据。
// 生产时：Astro Pages 和 Worker 均部署到 Cloudflare，Worker 提供 /api/* 路由。
// ============================================================

import { createRepositories } from "@saas-matrix/core";
import type { D1Database } from "@saas-matrix/core";

// Worker 环境绑定类型
export interface WorkerEnv {
    DB: D1Database;           // D1 数据库绑定（wrangler.toml 中配置）
    SITE_KEY: string;         // 当前站点 key（wrangler.toml vars 中配置）
    ENVIRONMENT: string;
}

// ----------------------------------------------------------------
// CORS 头（允许 Astro 构建时跨域请求）
// ----------------------------------------------------------------
const CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,OPTIONS",
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

            return errorResponse("Not Found", 404);
        } catch (err) {
            console.error("[Worker Error]", err);
            const message = err instanceof Error ? err.message : "Internal Server Error";
            return errorResponse(message, 500);
        }
    },
} satisfies ExportedHandler<WorkerEnv>;
