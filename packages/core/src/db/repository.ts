// ============================================================
// packages/core/src/db/repository.ts
// D1 数据库访问层（Repository Pattern）
// 所有数据库操作均通过此层进行，隔离业务逻辑与 SQL
// ============================================================

import type { D1Database, Site, NavLink, Post, Doc, Plan, User, Session, UserCredits, CreditTransaction, UserSubscription, PaymentOrder } from "./schema.js";

// ----------------------------------------------------------------
// SiteRepository - 站点数据访问
// ----------------------------------------------------------------

export class SiteRepository {
    constructor(private db: D1Database) { }

    /** 根据域名查找站点（Worker 入口用于站点识别） */
    async getSiteByDomain(domain: string): Promise<Site | null> {
        return this.db
            .prepare("SELECT * FROM sites WHERE domain = ? LIMIT 1")
            .bind(domain)
            .first<Site>();
    }

    /** 根据 key 查找站点 */
    async getSiteByKey(key: string): Promise<Site | null> {
        return this.db
            .prepare("SELECT * FROM sites WHERE key = ? LIMIT 1")
            .bind(key)
            .first<Site>();
    }

    /** 获取所有站点（deploy 脚本用） */
    async getAllSites(): Promise<Site[]> {
        const result = await this.db
            .prepare("SELECT * FROM sites ORDER BY created_at ASC")
            .all<Site>();
        return result.results;
    }

    /** 创建新站点 */
    async createSite(data: Omit<Site, "id" | "created_at" | "updated_at">): Promise<void> {
        await this.db
            .prepare(
                `INSERT INTO sites (key, domain, title, description, logo_url, primary_color, locale)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
            )
            .bind(
                data.key,
                data.domain,
                data.title,
                data.description,
                data.logo_url,
                data.primary_color,
                data.locale
            )
            .run();
    }
}

// ----------------------------------------------------------------
// NavLinkRepository - 导航链接数据访问
// ----------------------------------------------------------------

export class NavLinkRepository {
    constructor(private db: D1Database) { }

    /** 获取站点导航链接（按 position 升序） */
    async getNavLinks(siteId: string): Promise<NavLink[]> {
        const result = await this.db
            .prepare(
                "SELECT * FROM nav_links WHERE site_id = ? ORDER BY position ASC"
            )
            .bind(siteId)
            .all<NavLink>();
        return result.results;
    }

    /** 批量插入导航链接 */
    async createNavLinks(siteId: string, links: Omit<NavLink, "id" | "site_id" | "created_at" | "updated_at">[]): Promise<void> {
        for (const link of links) {
            await this.db
                .prepare(
                    "INSERT INTO nav_links (site_id, label, url, position, target) VALUES (?, ?, ?, ?, ?)"
                )
                .bind(siteId, link.label, link.url, link.position, link.target)
                .run();
        }
    }
}

// ----------------------------------------------------------------
// PostRepository - 博客文章数据访问
// ----------------------------------------------------------------

export class PostRepository {
    constructor(private db: D1Database) { }

    /** 获取站点已发布的文章列表（按发布时间倒序） */
    async getPosts(siteId: string): Promise<Post[]> {
        const result = await this.db
            .prepare(
                `SELECT id, site_id, slug, title, summary, cover_url, published_at, updated_at
         FROM posts
         WHERE site_id = ? AND published_at IS NOT NULL
         ORDER BY published_at DESC`
            )
            .bind(siteId)
            .all<Post>();
        return result.results;
    }

    /** 根据 slug 获取文章详情（含 Markdown 内容） */
    async getPostBySlug(siteId: string, slug: string): Promise<Post | null> {
        return this.db
            .prepare(
                "SELECT * FROM posts WHERE site_id = ? AND slug = ? AND published_at IS NOT NULL LIMIT 1"
            )
            .bind(siteId, slug)
            .first<Post>();
    }

    /** 创建文章 */
    async createPost(data: Omit<Post, "id" | "updated_at">): Promise<void> {
        await this.db
            .prepare(
                `INSERT INTO posts (site_id, slug, title, summary, content_markdown, cover_url, published_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
            )
            .bind(
                data.site_id,
                data.slug,
                data.title,
                data.summary,
                data.content_markdown,
                data.cover_url,
                data.published_at
            )
            .run();
    }
}

// ----------------------------------------------------------------
// DocRepository - 文档页面数据访问
// ----------------------------------------------------------------

export class DocRepository {
    constructor(private db: D1Database) { }

    /** 获取站点文档列表（按 order_index 升序） */
    async getDocs(siteId: string): Promise<Doc[]> {
        const result = await this.db
            .prepare(
                `SELECT id, site_id, slug, title, order_index, updated_at
         FROM docs WHERE site_id = ? ORDER BY order_index ASC`
            )
            .bind(siteId)
            .all<Doc>();
        return result.results;
    }

    /** 根据 slug 获取文档详情（含 Markdown 内容） */
    async getDocBySlug(siteId: string, slug: string): Promise<Doc | null> {
        return this.db
            .prepare("SELECT * FROM docs WHERE site_id = ? AND slug = ? LIMIT 1")
            .bind(siteId, slug)
            .first<Doc>();
    }

    /** 创建文档 */
    async createDoc(data: Omit<Doc, "id" | "updated_at">): Promise<void> {
        await this.db
            .prepare(
                `INSERT INTO docs (site_id, slug, title, content_markdown, order_index)
         VALUES (?, ?, ?, ?, ?)`
            )
            .bind(data.site_id, data.slug, data.title, data.content_markdown, data.order_index)
            .run();
    }
}



// ----------------------------------------------------------------
// UserRepository - 用户数据访问（支持 Google OAuth）
// ----------------------------------------------------------------

export class UserRepository {
    constructor(private db: D1Database) { }

    /** 根据 provider + providerId 查找用户（OAuth 登录使用） */
    async getUserByProvider(provider: string, providerId: string): Promise<User | null> {
        return this.db
            .prepare(
                "SELECT * FROM users WHERE external_provider = ? AND external_provider_id = ? LIMIT 1"
            )
            .bind(provider, providerId)
            .first<User>();
    }

    /** 根据邮箱和站点查找用户 */
    async getUserByEmail(siteId: string, email: string): Promise<User | null> {
        return this.db
            .prepare("SELECT * FROM users WHERE site_id = ? AND email = ? LIMIT 1")
            .bind(siteId, email)
            .first<User>();
    }

    /** 根据 ID 查找用户 */
    async getUserById(id: string): Promise<User | null> {
        return this.db
            .prepare("SELECT * FROM users WHERE id = ? LIMIT 1")
            .bind(id)
            .first<User>();
    }

    /**
     * Upsert Google OAuth 用户：
     * - 如果 provider+providerId 存在 → 更新 display_name、avatar_url
     * - 如果邮箱存在（已有账户）→ 绑定 provider 信息
     * - 否则 → 创建新用户
     */
    async upsertOAuthUser(data: {
        siteId: string;
        email: string;
        displayName: string;
        avatarUrl: string;
        provider: string;
        providerId: string;
        emailVerified?: boolean;
    }): Promise<User> {
        const { siteId, email, displayName, avatarUrl, provider, providerId, emailVerified = true } = data;

        // 1. 先找是否已有同 provider 账户
        let user = await this.getUserByProvider(provider, providerId);
        if (user) {
            // 更新资料
            await this.db
                .prepare(
                    `UPDATE users SET display_name = ?, avatar_url = ?, email_verified = ?,
                     updated_at = datetime('now') WHERE id = ?`
                )
                .bind(displayName, avatarUrl, emailVerified ? 1 : 0, user.id)
                .run();
            return (await this.getUserById(user.id))!;
        }

        // 2. 找已有邮箱账户（绑定 provider）
        user = await this.getUserByEmail(siteId, email);
        if (user) {
            await this.db
                .prepare(
                    `UPDATE users SET external_provider = ?, external_provider_id = ?,
                     display_name = ?, avatar_url = ?, email_verified = ?,
                     updated_at = datetime('now') WHERE id = ?`
                )
                .bind(provider, providerId, displayName, avatarUrl, emailVerified ? 1 : 0, user.id)
                .run();
            return (await this.getUserById(user.id))!;
        }

        // 3. 创建新用户
        const id = crypto.randomUUID();
        await this.db
            .prepare(
                `INSERT INTO users (id, site_id, email, display_name, avatar_url, email_verified,
                 external_provider, external_provider_id, role)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'user')`
            )
            .bind(id, siteId, email, displayName, avatarUrl, emailVerified ? 1 : 0, provider, providerId)
            .run();
        return (await this.getUserById(id))!;
    }
}

// ----------------------------------------------------------------
// SessionRepository - 登录会话数据访问
// ----------------------------------------------------------------

export class SessionRepository {
    constructor(private db: D1Database) { }

    /** 创建新 Session */
    async createSession(data: { id: string; userId: string; siteId: string; expiresAt: string }): Promise<void> {
        await this.db
            .prepare(
                "INSERT INTO sessions (id, user_id, site_id, expires_at) VALUES (?, ?, ?, ?)"
            )
            .bind(data.id, data.userId, data.siteId, data.expiresAt)
            .run();
    }

    /** 根据 Session ID 获取有效 Session */
    async getSession(id: string): Promise<Session | null> {
        return this.db
            .prepare(
                "SELECT * FROM sessions WHERE id = ? AND expires_at > datetime('now') LIMIT 1"
            )
            .bind(id)
            .first<Session>();
    }

    /** 删除 Session（登出） */
    async deleteSession(id: string): Promise<void> {
        await this.db.prepare("DELETE FROM sessions WHERE id = ?").bind(id).run();
    }

    /** 清理过期 Session */
    async deleteExpiredSessions(): Promise<void> {
        await this.db.prepare("DELETE FROM sessions WHERE expires_at <= datetime('now')").run();
    }
}

// ----------------------------------------------------------------
// PlanRepository - 定价套餐（Creem 版本）
// ----------------------------------------------------------------

export class PlanRepository {
    constructor(private db: D1Database) { }

    async getPlans(siteId: string): Promise<Plan[]> {
        const result = await this.db
            .prepare("SELECT * FROM plans WHERE site_id = ? AND is_active = 1 ORDER BY sort_order ASC")
            .bind(siteId)
            .all<Plan>();
        return result.results;
    }

    async getSubscriptionPlans(siteId: string): Promise<Plan[]> {
        const result = await this.db
            .prepare("SELECT * FROM plans WHERE site_id = ? AND billing_cycle != 'one_time' AND is_active = 1 ORDER BY sort_order ASC")
            .bind(siteId)
            .all<Plan>();
        return result.results;
    }

    async getCreditPackages(siteId: string): Promise<Plan[]> {
        const result = await this.db
            .prepare("SELECT * FROM plans WHERE site_id = ? AND billing_cycle = 'one_time' AND is_active = 1 ORDER BY sort_order ASC")
            .bind(siteId)
            .all<Plan>();
        return result.results;
    }

    async getPlanById(id: string): Promise<Plan | null> {
        return this.db.prepare("SELECT * FROM plans WHERE id = ? LIMIT 1").bind(id).first<Plan>();
    }

    async getPlanByCreemProductId(productId: string): Promise<Plan | null> {
        return this.db.prepare("SELECT * FROM plans WHERE creem_product_id = ? LIMIT 1").bind(productId).first<Plan>();
    }
}

// ----------------------------------------------------------------
// CreditRepository - 积分余额和流水
// ----------------------------------------------------------------

export class CreditRepository {
    constructor(private db: D1Database) { }

    /** 获取用户积分余额（不存在则返回 null） */
    async getCredits(userId: string): Promise<UserCredits | null> {
        return this.db
            .prepare("SELECT * FROM user_credits WHERE user_id = ? LIMIT 1")
            .bind(userId)
            .first<UserCredits>();
    }

    /** 确保用户积分记录存在，不存在则初始化为 0 */
    async ensureCreditsRecord(userId: string, siteId: string): Promise<UserCredits> {
        await this.db
            .prepare("INSERT OR IGNORE INTO user_credits (user_id, site_id, balance, version) VALUES (?, ?, 0, 0)")
            .bind(userId, siteId)
            .run();
        return (await this.getCredits(userId))!;
    }

    /**
     * 增加积分（带乐观锁 + 幂等键）
     * 返回操作后的余额，幂等键重复时返回 null
     */
    async addCredits(params: {
        userId: string;
        siteId: string;
        amount: number;
        type: CreditTransaction["type"];
        reason: string;
        orderId?: string;
        idempotencyKey?: string;
    }): Promise<number | null> {
        const { userId, siteId, amount, type, reason, orderId, idempotencyKey } = params;

        // 检查幂等键是否已处理
        if (idempotencyKey) {
            const existing = await this.db
                .prepare("SELECT id FROM credit_transactions WHERE idempotency_key = ? LIMIT 1")
                .bind(idempotencyKey)
                .first<{ id: string }>();
            if (existing) return null; // 已处理，幂等返回
        }

        await this.ensureCreditsRecord(userId, siteId);
        const credits = await this.getCredits(userId);
        if (!credits) throw new Error("Credits record not found after ensure");

        const newBalance = credits.balance + amount;
        if (newBalance < 0) throw new Error(`Insufficient credits: balance=${credits.balance}, required=${Math.abs(amount)}`);

        // 乐观锁更新
        const updateResult = await this.db
            .prepare("UPDATE user_credits SET balance = ?, version = version + 1, updated_at = datetime('now') WHERE user_id = ? AND version = ?")
            .bind(newBalance, userId, credits.version)
            .run();

        if (!updateResult.success || (updateResult.meta as any).changes === 0) {
            throw new Error("Optimistic lock conflict, please retry");
        }

        // 记录流水
        const txId = crypto.randomUUID();
        await this.db
            .prepare("INSERT INTO credit_transactions (id, user_id, site_id, amount, balance_after, type, reason, order_id, idempotency_key) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)")
            .bind(txId, userId, siteId, amount, newBalance, type, reason, orderId ?? null, idempotencyKey ?? null)
            .run();

        return newBalance;
    }

    /** 获取积分流水（最近 N 条） */
    async getTransactions(userId: string, limit = 20): Promise<CreditTransaction[]> {
        const result = await this.db
            .prepare("SELECT * FROM credit_transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT ?")
            .bind(userId, limit)
            .all<CreditTransaction>();
        return result.results;
    }
}

// ----------------------------------------------------------------
// SubscriptionRepository - 用户订阅状态
// ----------------------------------------------------------------

export class SubscriptionRepository {
    constructor(private db: D1Database) { }

    async getActiveSubscription(userId: string): Promise<UserSubscription | null> {
        return this.db
            .prepare("SELECT * FROM user_subscriptions WHERE user_id = ? AND status IN ('active','trialing') ORDER BY created_at DESC LIMIT 1")
            .bind(userId)
            .first<UserSubscription>();
    }

    async getByCreemSubscriptionId(creemSubscriptionId: string): Promise<UserSubscription | null> {
        return this.db
            .prepare("SELECT * FROM user_subscriptions WHERE creem_subscription_id = ? LIMIT 1")
            .bind(creemSubscriptionId)
            .first<UserSubscription>();
    }

    async upsertSubscription(data: Omit<UserSubscription, "id" | "created_at" | "updated_at">): Promise<void> {
        await this.db
            .prepare(`
                INSERT INTO user_subscriptions
                    (user_id, site_id, plan_id, creem_subscription_id, creem_customer_id, status,
                     current_period_start, current_period_end, credits_granted_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(creem_subscription_id) DO UPDATE SET
                    status = excluded.status,
                    current_period_start = excluded.current_period_start,
                    current_period_end = excluded.current_period_end,
                    credits_granted_at = COALESCE(user_subscriptions.credits_granted_at, excluded.credits_granted_at),
                    updated_at = datetime('now')
            `)
            .bind(
                data.user_id, data.site_id, data.plan_id, data.creem_subscription_id,
                data.creem_customer_id, data.status, data.current_period_start,
                data.current_period_end, data.credits_granted_at
            )
            .run();
    }

    async markCreditsGranted(creemSubscriptionId: string): Promise<void> {
        await this.db
            .prepare("UPDATE user_subscriptions SET credits_granted_at = datetime('now'), updated_at = datetime('now') WHERE creem_subscription_id = ?")
            .bind(creemSubscriptionId)
            .run();
    }
}

// ----------------------------------------------------------------
// PaymentOrderRepository - 支付订单
// ----------------------------------------------------------------

export class PaymentOrderRepository {
    constructor(private db: D1Database) { }

    async createOrder(data: Omit<PaymentOrder, "id" | "created_at" | "updated_at">): Promise<string> {
        const id = crypto.randomUUID();
        await this.db
            .prepare(`INSERT INTO payment_orders (id, user_id, site_id, plan_id, creem_checkout_id, type, status, amount, currency, credits_amount)
                      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
            .bind(id, data.user_id, data.site_id, data.plan_id, data.creem_checkout_id,
                  data.type, data.status, data.amount, data.currency, data.credits_amount)
            .run();
        return id;
    }

    async getByCheckoutId(checkoutId: string): Promise<PaymentOrder | null> {
        return this.db
            .prepare("SELECT * FROM payment_orders WHERE creem_checkout_id = ? LIMIT 1")
            .bind(checkoutId)
            .first<PaymentOrder>();
    }

    async updateOrderStatus(id: string, status: PaymentOrder["status"], creemOrderId?: string): Promise<void> {
        await this.db
            .prepare("UPDATE payment_orders SET status = ?, creem_order_id = COALESCE(?, creem_order_id), updated_at = datetime('now') WHERE id = ?")
            .bind(status, creemOrderId ?? null, id)
            .run();
    }
}

// ----------------------------------------------------------------
// 统一导出 - 通过 DB 对象快速创建所有 Repository
// ----------------------------------------------------------------

export interface Repositories {
    sites: SiteRepository;
    navLinks: NavLinkRepository;
    posts: PostRepository;
    docs: DocRepository;
    plans: PlanRepository;
    users: UserRepository;
    sessions: SessionRepository;
    credits: CreditRepository;
    subscriptions: SubscriptionRepository;
    orders: PaymentOrderRepository;
}

/** 工厂函数：传入 D1 实例，返回所有 Repository */
export function createRepositories(db: D1Database): Repositories {
    return {
        sites: new SiteRepository(db),
        navLinks: new NavLinkRepository(db),
        posts: new PostRepository(db),
        docs: new DocRepository(db),
        plans: new PlanRepository(db),
        users: new UserRepository(db),
        sessions: new SessionRepository(db),
        credits: new CreditRepository(db),
        subscriptions: new SubscriptionRepository(db),
        orders: new PaymentOrderRepository(db),
    };
}
