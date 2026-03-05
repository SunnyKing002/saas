#!/usr/bin/env tsx
// ============================================================
// packages/scripts/create-site.ts
// 新站克隆脚本
//
// 使用方法：
//   pnpm create:site <siteKey> <domain> [title] [color]
//
// 示例：
//   pnpm create:site mytool mytool.example.com "My Tool" "#10b981"
//
// 功能：
//   1. 将 apps/site-template 复制为 apps/site-{siteKey}
//   2. 更新 package.json 名称、wrangler.toml、site.config.ts
//   3. 输出后续操作提示（D1 数据插入等）
// ============================================================

import { cp, readFile, writeFile, rm } from "fs/promises";
import { existsSync } from "fs";
import { join, resolve } from "path";

// ---- 参数解析 ----
const [, , siteKey, domain, title = "My SaaS Tool", primaryColor = "#6366f1"] = process.argv;

if (!siteKey || !domain) {
    console.error("❌ 用法：pnpm create:site <siteKey> <domain> [title] [color]");
    console.error("   示例：pnpm create:site mytool mytool.example.com \"My Tool\" \"#10b981\"");
    process.exit(1);
}

// 验证 siteKey 格式
if (!/^[a-z0-9-]+$/.test(siteKey)) {
    console.error("❌ siteKey 只能包含小写字母、数字和连字符，例如：my-tool");
    process.exit(1);
}

// ---- 路径定义 ----
const ROOT_DIR = resolve(import.meta.dirname || process.cwd(), "../../");
const TEMPLATE_DIR = join(ROOT_DIR, "apps/site-template");
const TARGET_DIR = join(ROOT_DIR, `apps/site-${siteKey}`);

console.log(`\n🚀 正在创建新站：site-${siteKey}`);
console.log(`   域名：${domain}`);
console.log(`   标题：${title}`);
console.log(`   主题色：${primaryColor}\n`);

// ---- 检查目标目录 ----
if (existsSync(TARGET_DIR)) {
    console.error(`❌ 目录已存在：${TARGET_DIR}`);
    console.error("   请先删除该目录或换一个 siteKey");
    process.exit(1);
}

// ---- 复制模板目录 ----
console.log("📁 复制模板目录...");
await cp(TEMPLATE_DIR, TARGET_DIR, {
    recursive: true,
    filter: (src) => {
        // 排除构建产物和依赖
        const excludes = ["node_modules", "dist", ".astro", ".wrangler", ".env"];
        return !excludes.some((e) => src.includes(e));
    },
});

// ---- 更新 package.json ----
console.log("📝 更新 package.json...");
const pkgPath = join(TARGET_DIR, "package.json");
const pkg = JSON.parse(await readFile(pkgPath, "utf-8")) as Record<string, unknown>;
pkg.name = `@saas-matrix/site-${siteKey}`;
await writeFile(pkgPath, JSON.stringify(pkg, null, 2) + "\n");

// ---- 更新 wrangler.toml ----
console.log("📝 更新 wrangler.toml...");
const wranglerPath = join(TARGET_DIR, "wrangler.toml");
let wrangler = await readFile(wranglerPath, "utf-8");
wrangler = wrangler
    .replace(/name = "site-template-worker"/, `name = "site-${siteKey}-worker"`)
    .replace(/SITE_KEY = "site-template"/, `SITE_KEY = "${siteKey}"`);
await writeFile(wranglerPath, wrangler);

// ---- 更新 site.config.ts ----
console.log("📝 更新 site.config.ts...");
const configPath = join(TARGET_DIR, "site.config.ts");
const configContent = `// apps/site-${siteKey}/site.config.ts
// 由 create-site.ts 自动生成 - 可手动调整
import type { SiteConfig } from "@saas-matrix/core";

const siteConfig: SiteConfig = {
  key: "${siteKey}",
  domain: "${domain}",
  devDomain: "localhost",
  title: "${title}",
  description: "TODO: 填写站点描述",
  primaryColor: "${primaryColor}",
  locale: "en",
  gaId: undefined,                   // TODO: 填写 Google Analytics ID（可选）
  socials: {
    twitter: undefined,              // TODO: 填写 Twitter 链接
    github: undefined,               // TODO: 填写 GitHub 链接
    discord: undefined,
  },
};

export default siteConfig;
`;
await writeFile(configPath, configContent);

// ---- 创建 .env 文件 ----
console.log("📝 创建 .env 文件...");
const envContent = `# ${siteKey} 站点环境变量
SITE_DOMAIN=https://${domain}
SITE_KEY=${siteKey}
WORKER_API_URL=http://localhost:8787  # 本地 Worker 地址
`;
await writeFile(join(TARGET_DIR, ".env"), envContent);

// ---- 输出后续操作提示 ----
console.log(`
✅ 站点 site-${siteKey} 创建完成！

📂 新站目录：apps/site-${siteKey}/

🔧 接下来需要做：

1. 向 D1 数据库插入站点记录：
   cd apps/site-${siteKey}
   wrangler d1 execute saas-matrix-db --command "
     INSERT INTO sites (key, domain, title, description, primary_color)
     VALUES ('${siteKey}', '${domain}', '${title}', 'TODO: 描述', '${primaryColor}');
   "

2. 更新 packages/core/src/config/index.ts，在 SITE_REGISTRY 中添加：
   {
     key: "${siteKey}",
     domain: "${domain}",
     title: "${title}",
     primaryColor: "${primaryColor}",
     locale: "en",
   }

3. 在 pnpm 安装新包：
   pnpm install

4. 本地开发：
   pnpm --filter @saas-matrix/site-${siteKey} dev

5. 部署到 Cloudflare：
   pnpm --filter @saas-matrix/site-${siteKey} build
   wrangler pages deploy apps/site-${siteKey}/dist --project-name site-${siteKey}

详见 DEPLOY.md 获取完整指引。
`);
