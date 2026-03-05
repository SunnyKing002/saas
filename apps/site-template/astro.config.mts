// apps/site-template/astro.config.mts
// Astro 配置：集成 React、Sitemap，输出静态 HTML，SEO 优先

import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import tsconfigPaths from "vite-tsconfig-paths";

// TODO: 将 site 改为你的实际域名（或通过环境变量注入）
const SITE_DOMAIN = process.env.SITE_DOMAIN || "https://yourtool.example.com";

export default defineConfig({
    // 站点根 URL（生成 sitemap 和 canonical URL 必需）
    site: SITE_DOMAIN,

    // 输出静态 HTML（默认策略：0 运行时 JS）
    // 若需要 SSR，改为 "server" 并配置 adapter
    output: "static",

    integrations: [
        // React 集成 - 用于交互式 Island 组件（登录框、定价组件等）
        react(),

        // 自动生成 sitemap.xml
        sitemap({
            // 可自定义序列化函数，过滤特定页面
            // filter: (page) => !page.includes('/admin'),
            changefreq: "weekly",
            priority: 0.7,
            lastmod: new Date(),
        }),
    ],

    // Vite 配置：解析 monorepo workspace 包
    vite: {
        plugins: [tsconfigPaths()],
        // 确保 SSR 构建时不外部化 workspace 包
        ssr: {
            noExternal: ["@saas-matrix/core", "@saas-matrix/ui"],
        },
    },
});
