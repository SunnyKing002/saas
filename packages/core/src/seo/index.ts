// ============================================================
// packages/core/src/seo/index.ts
// 通用 SEO 工具函数 - 生成 meta 标签、OG 信息、Sitemap 条目
// ============================================================

import type { SiteConfig } from "../config/index.js";

/** 页面 SEO 元信息 */
export interface SeoMeta {
    title: string;
    description: string;
    canonicalUrl?: string;
    ogImage?: string;
    ogType?: "website" | "article";
    twitterCard?: "summary" | "summary_large_image";
    noIndex?: boolean;          // 是否阻止爬取（如草稿页）
}

/** Sitemap URL 条目 */
export interface SitemapUrl {
    loc: string;
    lastmod?: string;
    changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
    priority?: number;
}

/**
 * 生成页面 <title> 标签内容
 * 格式：页面标题 | 站点名称
 */
export function buildPageTitle(pageTitle: string | undefined, siteTitle: string): string {
    return pageTitle || siteTitle;
}

/**
 * 构建完整的 SEO Meta 信息（合并站点默认值和页面特定值）
 */
export function buildSeoMeta(
    page: Partial<SeoMeta>,
    site: Pick<SiteConfig, "title" | "description" | "domain">
): SeoMeta {
    const baseUrl = `https://${site.domain}`;
    return {
        title: buildPageTitle(page.title, site.title),
        description: page.description || site.description,
        canonicalUrl: page.canonicalUrl,
        ogImage: page.ogImage || `${baseUrl}/og-image.png`, // TODO: 替换为实际 OG 图片
        ogType: page.ogType || "website",
        twitterCard: page.twitterCard || "summary_large_image",
        noIndex: page.noIndex || false,
    };
}

/**
 * 生成 Open Graph meta 标签数组（供 Astro 组件迭代渲染）
 */
export function buildOpenGraphTags(meta: SeoMeta, siteName: string): Record<string, string>[] {
    const tags: Record<string, string>[] = [
        { property: "og:type", content: meta.ogType || "website" },
        { property: "og:title", content: meta.title },
        { property: "og:description", content: meta.description },
        { property: "og:site_name", content: siteName },
    ];
    if (meta.canonicalUrl) {
        tags.push({ property: "og:url", content: meta.canonicalUrl });
    }
    if (meta.ogImage) {
        tags.push({ property: "og:image", content: meta.ogImage });
    }
    return tags;
}

/**
 * 生成 Twitter Card meta 标签数组
 */
export function buildTwitterCardTags(meta: SeoMeta): Record<string, string>[] {
    return [
        { name: "twitter:card", content: meta.twitterCard || "summary_large_image" },
        { name: "twitter:title", content: meta.title },
        { name: "twitter:description", content: meta.description },
        ...(meta.ogImage ? [{ name: "twitter:image", content: meta.ogImage }] : []),
    ];
}

/**
 * 生成 Sitemap XML 内容字符串
 */
export function generateSitemapXml(urls: SitemapUrl[]): string {
    const urlEntries = urls
        .map((u) => {
            const parts = [`    <loc>${escapeXml(u.loc)}</loc>`];
            if (u.lastmod) parts.push(`    <lastmod>${u.lastmod}</lastmod>`);
            if (u.changefreq) parts.push(`    <changefreq>${u.changefreq}</changefreq>`);
            if (u.priority !== undefined) parts.push(`    <priority>${u.priority.toFixed(1)}</priority>`);
            return `  <url>\n${parts.join("\n")}\n  </url>`;
        })
        .join("\n");

    return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urlEntries}\n</urlset>`;
}

/**
 * 生成 robots.txt 内容
 */
export function generateRobotsTxt(domain: string): string {
    return `User-agent: *
Allow: /

Sitemap: https://${domain}/sitemap.xml
`;
}

/** XML 特殊字符转义 */
function escapeXml(str: string): string {
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
}
