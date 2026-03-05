// apps/site-bizarre-lineage/astro.config.mts
// Astro 配置：集成 React、Sitemap，输出静态 HTML，SEO 优先

import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import tsconfigPaths from "vite-tsconfig-paths";

const SITE_DOMAIN = process.env.SITE_DOMAIN || "https://bizarre-lineage.com";

export default defineConfig({
    site: SITE_DOMAIN,
    output: "static",
    integrations: [
        react(),
        sitemap(),
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
