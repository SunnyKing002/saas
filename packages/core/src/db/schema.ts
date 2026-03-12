// ============================================================
// packages/core/src/db/schema.ts
// D1 数据库 TypeScript 类型定义（与 schema.sql 对应）
// ============================================================

/** 站点信息 */
export interface Site {
    id: string;
    key: string;            // 站点唯一标识
    domain: string;         // 绑定主域名
    title: string;
    description: string;
    logo_url: string;
    primary_color: string;
    locale: string;         // 默认语言
    created_at: string;
    updated_at: string;
}

/** 导航链接 */
export interface NavLink {
    id: string;
    site_id: string;
    label: string;
    url: string;
    position: number;       // 排序权重
    target: string;         // _self | _blank
    created_at: string;
    updated_at: string;
}

/** 博客文章 */
export interface Post {
    id: string;
    site_id: string;
    slug: string;
    title: string;
    summary: string;
    content_markdown: string;
    cover_url: string;
    published_at: string | null; // null = 草稿
    updated_at: string;
}

/** 文档页面 */
export interface Doc {
    id: string;
    site_id: string;
    slug: string;
    title: string;
    content_markdown: string;
    order_index: number;    // 列表排序
    updated_at: string;
}

/** 用户（支持 Google OAuth 等第三方登录） */
export interface User {
    id: string;
    site_id: string;
    email: string;
    display_name: string;           // 显示名（来自 Google profile name）
    avatar_url: string;             // 头像 URL（来自 Google profile picture）
    email_verified: number;         // 0 | 1，Google 账户默认为 1
    password_hash: string | null;
    external_provider: string | null;       // "google" | "github" | ...
    external_provider_id: string | null;    // Google sub
    role: "user" | "admin";
    created_at: string;
    updated_at: string;
}

/** 登录会话 */
export interface Session {
    id: string;          // Session ID（随机 UUID，存于 Cookie）
    user_id: string;
    site_id: string;
    expires_at: string;  // ISO8601 过期时间
    created_at: string;
}

/** 定价套餐（含 Creem Product ID） */
export interface Plan {
    id: string;
    site_id: string;
    name: string;
    description: string;
    price: number;             // 价格（单位：分，USD）
    currency: string;
    billing_cycle: "monthly" | "yearly" | "one_time";
    credits_per_cycle: number; // 每周期（或一次）赠送积分数量
    creem_product_id: string | null; // Creem Product ID
    features_json: string;     // JSON 数组字符串
    is_active: number;         // 1=启用
    sort_order: number;
    created_at: string;
    updated_at: string;
}

/** 用户积分余额（乐观锁） */
export interface UserCredits {
    id: string;
    user_id: string;
    site_id: string;
    balance: number;   // 当前余额
    version: number;   // 乐观锁版本号
    updated_at: string;
}

/** 积分流水 */
export interface CreditTransaction {
    id: string;
    user_id: string;
    site_id: string;
    amount: number;        // 正数=充值，负数=扣减
    balance_after: number;
    type: "topup" | "deduct" | "refund" | "subscription_grant";
    reason: string;
    order_id: string | null;
    idempotency_key: string | null;
    created_at: string;
}

/** 用户订阅状态 */
export interface UserSubscription {
    id: string;
    user_id: string;
    site_id: string;
    plan_id: string;
    creem_subscription_id: string;
    creem_customer_id: string;
    status: "active" | "canceled" | "past_due" | "expired" | "trialing" | "paused";
    current_period_start: string | null;
    current_period_end: string | null;
    credits_granted_at: string | null;
    created_at: string;
    updated_at: string;
}

/** 支付订单 */
export interface PaymentOrder {
    id: string;
    user_id: string;
    site_id: string;
    plan_id: string | null;
    creem_checkout_id: string | null;
    creem_order_id: string | null;
    type: "subscription" | "one_time";
    status: "pending" | "paid" | "failed" | "refunded";
    amount: number;
    currency: string;
    credits_amount: number;
    created_at: string;
    updated_at: string;
}


// ============================================================
// Cloudflare D1 Database 接口类型（在 Worker 中使用）
// ============================================================

/** D1 查询结果 */
export interface D1Result<T = Record<string, unknown>> {
    results: T[];
    success: boolean;
    meta: Record<string, unknown>;
}

/** Cloudflare D1 数据库绑定接口（简化版，实际类型由 wrangler 生成） */
export interface D1Database {
    prepare(query: string): D1PreparedStatement;
    exec(query: string): Promise<D1Result>;
}

export interface D1PreparedStatement {
    bind(...values: unknown[]): D1PreparedStatement;
    first<T = Record<string, unknown>>(colName?: string): Promise<T | null>;
    run(): Promise<D1Result>;
    all<T = Record<string, unknown>>(): Promise<D1Result<T>>;
}
