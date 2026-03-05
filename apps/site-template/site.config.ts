// apps/site-template/site.config.ts
// 当前站点的静态配置 - 新站克隆时修改此文件
// 运行时动态数据（导航、文章等）从 D1 数据库读取

import type { SiteConfig } from "@saas-matrix/core";

/**
 * 当前站点配置
 * TODO: 克隆新站后，修改以下字段
 */
const siteConfig: SiteConfig = {
    key: "site-template",         // TODO: 改为新站 key，例如 "mytool"
    domain: "yourtool.example.com", // TODO: 改为实际域名
    devDomain: "localhost",
    title: "My SaaS Tool",        // TODO: 改为站点标题
    description: "A powerful SaaS tool to boost your productivity.",  // TODO: 改为站点描述
    primaryColor: "#6366f1",      // TODO: 改为品牌主色
    locale: "en",
    gaId: undefined,              // TODO: 填写 Google Analytics ID（可选）
    socials: {
        twitter: "https://twitter.com/yourtool",   // TODO: 改为实际社交账号
        github: "https://github.com/yourtool",
        discord: undefined,
    },
};

export default siteConfig;
