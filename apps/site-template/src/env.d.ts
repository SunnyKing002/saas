/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />
/// <reference types="@cloudflare/workers-types" />

// Astro 环境变量类型声明
interface ImportMetaEnv {
    readonly WORKER_API_URL: string;
    readonly SITE_DOMAIN: string;
    readonly SITE_KEY: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
