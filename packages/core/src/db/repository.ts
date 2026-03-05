// ============================================================
// packages/core/src/db/repository.ts
// D1 数据库访问层（Repository Pattern）
// 所有数据库操作均通过此层进行，隔离业务逻辑与 SQL
// ============================================================

import type { D1Database, Site, NavLink, Post, Doc, Plan } from "./schema.js";

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
// PlanRepository - 定价套餐数据访问（预留）
// ----------------------------------------------------------------

export class PlanRepository {
    constructor(private db: D1Database) { }

    /** 获取站点启用中的定价套餐 */
    async getPlans(siteId: string): Promise<Plan[]> {
        const result = await this.db
            .prepare(
                "SELECT * FROM plans WHERE site_id = ? AND is_active = 1 ORDER BY price ASC"
            )
            .bind(siteId)
            .all<Plan>();
        return result.results;
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
}

/** 工厂函数：传入 D1 实例，返回所有 Repository */
export function createRepositories(db: D1Database): Repositories {
    return {
        sites: new SiteRepository(db),
        navLinks: new NavLinkRepository(db),
        posts: new PostRepository(db),
        docs: new DocRepository(db),
        plans: new PlanRepository(db),
    };
}
