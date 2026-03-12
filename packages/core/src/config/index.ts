// ============================================================
// packages/core/src/config/index.ts
// 多站点配置模型 - 站点基础配置定义和加载工具
// ============================================================

/** 站点前端静态配置（不频繁变更的配置，存储在代码中） */
export interface SiteConfig {
    /** 站点唯一 key，与 D1 sites.key 对应 */
    key: string;
    /** 绑定的主域名（生产）*/
    domain: string;
    /** 本地开发时使用的域名或 key（可选，默认 localhost） */
    devDomain?: string;
    /** 站点标题（兜底值，优先从 D1 读取） */
    title: string;
    /** 站点描述（兜底值） */
    description: string;
    /** 主题色 */
    primaryColor: string;
    /** 默认语言 */
    locale: string;
    /** 是否开启 Google Analytics（填写 GA ID） */
    gaId?: string;
    /** 社交链接（可选） */
    socials?: {
        twitter?: string;
        github?: string;
        discord?: string;
    };
}

/**
 * 所有站点配置注册表
 * 新增站点时，在此处添加一条配置即可
 * TODO: 随着站点增多，可以将此文件转化为 JSON 或从环境变量读取
 */
export const SITE_REGISTRY: SiteConfig[] = [
    {
        key: "site-template",
        domain: "yourtool.example.com",
        devDomain: "localhost",
        title: "My SaaS Tool",
        description: "A powerful SaaS tool to boost your productivity.",
        primaryColor: "#6366f1",
        locale: "en",
        socials: {
            twitter: "https://twitter.com/yourtool",
            github: "https://github.com/yourtool",
        },
    },
    {
        key: "bizarre-lineage",
        domain: "bizarre-lineage.com",
        title: "Bizarre Lineage",
        description: "The ultimate Bizarre Lineage Wiki for Roblox. Updated Stand Tier List, active codes, best builds, fighting styles, sub-abilities, and guides for PvP & PvE.",
        primaryColor: "#7c3aed",
        locale: "en",
    },
    // TODO: 在此添加新站点配置，例如：
    // {
    //   key: "mytool2",
    //   domain: "mytool2.example.com",
    //   title: "My Tool 2",
    //   description: "Another great SaaS tool.",
    //   primaryColor: "#10b981",
    //   locale: "en",
    // },
];

/** 根据域名查找站点配置（Astro/Worker 启动时使用） */
export function getSiteConfigByDomain(domain: string): SiteConfig | undefined {
    return SITE_REGISTRY.find(
        (s) => s.domain === domain || s.devDomain === domain
    );
}

/** 根据 key 查找站点配置 */
export function getSiteConfigByKey(key: string): SiteConfig | undefined {
    return SITE_REGISTRY.find((s) => s.key === key);
}

/** 获取当前环境的站点配置（从环境变量读取 SITE_KEY） */
export function getCurrentSiteConfig(): SiteConfig {
    const key = (typeof process !== "undefined" && process.env?.SITE_KEY) || "site-template";
    const config = getSiteConfigByKey(key);
    if (!config) {
        throw new Error(`[SaasMatrix] 未找到 key="${key}" 的站点配置，请检查 SITE_REGISTRY`);
    }
    return config;
}
