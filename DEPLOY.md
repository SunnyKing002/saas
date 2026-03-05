# DEPLOY.md - SaaS Matrix 部署指南

## 前提准备

1. 注册 [Cloudflare 账号](https://cloudflare.com)（免费套餐即可）
2. 安装 Wrangler CLI：`npm install -g wrangler`
3. 登录：`wrangler login`

---

## Step 1：创建 D1 数据库

```bash
# 创建数据库（全局唯一名称）
wrangler d1 create saas-matrix-db

# 你将看到输出，记录下 database_id：
# ✅ Created database 'saas-matrix-db' with ID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

---

## Step 2：执行 Schema 初始化

```bash
# 生产环境
wrangler d1 execute saas-matrix-db --file=infra/db/schema.sql

# 本地开发（不实际连接 CF，仅本地 SQLite）
wrangler d1 execute saas-matrix-db --local --file=infra/db/schema.sql
```

---

## Step 3：配置 wrangler.toml

打开 `apps/site-template/wrangler.toml`，填写从 Step 1 获得的 `database_id`：

```toml
[[d1_databases]]
binding = "DB"
database_name = "saas-matrix-db"
database_id = "YOUR_DATABASE_ID_FROM_STEP_1"  # ← 在这里填入
```

---

## Step 4：插入第一个站点数据

```bash
wrangler d1 execute saas-matrix-db --command "
  INSERT OR IGNORE INTO sites (key, domain, title, description, primary_color)
  VALUES ('site-template', 'yourtool.example.com', 'My SaaS Tool', 'A powerful SaaS tool.', '#6366f1');
"

# 添加默认导航链接
wrangler d1 execute saas-matrix-db --command "
  INSERT INTO nav_links (site_id, label, url, position)
  SELECT id, 'Home', '/', 0 FROM sites WHERE key = 'site-template';
  INSERT INTO nav_links (site_id, label, url, position)
  SELECT id, 'Blog', '/blog', 1 FROM sites WHERE key = 'site-template';
  INSERT INTO nav_links (site_id, label, url, position)
  SELECT id, 'Docs', '/docs', 2 FROM sites WHERE key = 'site-template';
"
```

---

## Step 5：本地开发调试

```bash
# 终端 1：启动 Worker（绑定本地 D1）
cd apps/site-template
wrangler dev worker/index.ts --local
# Worker 运行在 http://localhost:8787

# 终端 2：启动 Astro
cp .env.example .env  # 复制并修改环境变量
pnpm dev
# 站点运行在 http://localhost:4321
```

---

## Step 6：部署 Worker

```bash
cd apps/site-template

# 部署 Worker（API 层）
wrangler deploy worker/index.ts

# 记录 Worker URL，例如：
# https://site-template-worker.youraccount.workers.dev
```

---

## Step 7：构建并部署 Astro 静态站点

```bash
# 设置构建时使用的 Worker URL
export WORKER_API_URL="https://site-template-worker.youraccount.workers.dev"
export SITE_DOMAIN="https://yourtool.example.com"
export SITE_KEY="site-template"

# 构建
pnpm build

# 部署到 Cloudflare Pages（首次创建项目）
wrangler pages deploy dist --project-name site-template

# 后续部署只需
wrangler pages deploy dist
```

---

## Step 8：绑定自定义域名

1. 在 Cloudflare Dashboard → Pages → 你的项目 → Custom domains
2. 添加域名：`yourtool.example.com`
3. 确认 DNS 记录（CNAME 指向 `*.pages.dev`）

---

## 创建新站（克隆）

使用内置脚本可以在分钟内克隆新站：

```bash
# 语法：pnpm create:site <siteKey> <domain> [title] [color]
pnpm create:site mytool2 mytool2.example.com "My Tool 2" "#10b981"
```

脚本会自动：
- 复制 `apps/site-template` → `apps/site-mytool2`
- 更新 `package.json`、`wrangler.toml`、`site.config.ts`
- 创建 `.env` 文件

然后按脚本输出的提示完成后续几步即可上线。

---

## 自动化 CI/CD（可选）

创建 `.github/workflows/deploy.yml`：

```yaml
name: Deploy All Sites
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
      - run: pnpm install
      - run: pnpm build
        env:
          WORKER_API_URL: ${{ secrets.WORKER_API_URL }}
          SITE_DOMAIN: ${{ secrets.SITE_DOMAIN }}
          SITE_KEY: ${{ secrets.SITE_KEY }}
      - run: wrangler pages deploy dist
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
```

---

## 后续扩展

| 功能 | 方案 |
|------|------|
| 用户登录 | 集成 Lucia Auth（支持 D1）或 Auth.js |
| 支付 | Stripe Checkout + D1 plans 表 |
| 图片存储 | Cloudflare R2 |
| 邮件发送 | Resend / Cloudflare Email Workers |
| 全文搜索 | Cloudflare Vectorize 或 Algolia |
| 监控 | Cloudflare Analytics（免费）|
