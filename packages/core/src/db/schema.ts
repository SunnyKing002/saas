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

/** 用户（预留） */
export interface User {
    id: string;
    site_id: string;
    email: string;
    password_hash: string | null;
    external_provider: string | null;       // google | github | ...
    external_provider_id: string | null;
    role: "user" | "admin";
    created_at: string;
    updated_at: string;
}

/** 定价套餐（预留） */
export interface Plan {
    id: string;
    site_id: string;
    name: string;
    price: number;
    currency: string;
    billing_cycle: "monthly" | "yearly";
    features_json: string;   // JSON 数组字符串，解析后为 string[]
    stripe_price_id: string | null; // TODO: Stripe Price ID
    is_active: number;       // 1 = 启用，0 = 禁用
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
