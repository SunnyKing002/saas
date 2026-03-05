# SaaS Matrix - 单人可维护的 SaaS 出海群站架构

> 零成本起步 · 分钟级克隆新站 · 一套代码维护 N 个站点 · SEO 友好

## 🏗️ 技术栈

| 层级 | 技术 |
|------|------|
| Monorepo | pnpm + Turborepo |
| 前端 | Astro 4（静态 HTML + React Islands） |
| 托管 | Cloudflare Pages |
| API/边缘层 | Cloudflare Workers |
| 数据库 | Cloudflare D1（SQLite） |
| UI 组件 | 自研 @saas-matrix/ui（可替换） |
| ORM | 自研轻量 Repository 封装 |

## 📁 目录结构

```
saas-matrix/
├── packages/
│   ├── ui/          # 共享 UI 组件库（Navbar/Footer/LoginDialog 等）
│   ├── core/        # 核心业务逻辑（DB schema、Repository、SEO 工具、认证占位）
│   └── scripts/     # 辅助脚本（create-site.ts 克隆新站）
├── apps/
│   └── site-template/  # 单站模板（克隆每个新站的基础）
│       ├── src/pages/   # Astro 页面（首页/博客/文档）
│       ├── src/components/  # Astro 组件（Navbar/Footer/SEO）
│       ├── src/layouts/ # 通用布局
│       ├── worker/      # Cloudflare Worker 入口（API 层）
│       ├── site.config.ts   # 站点静态配置
│       └── wrangler.toml    # Cloudflare 配置
└── infra/
    └── db/schema.sql    # D1 数据库建表 SQL
```

## 🚀 架构原理

```
用户请求
  └── Cloudflare CDN → Pages 返回静态 HTML
                    → Worker API (/api/*) 返回动态数据
                         └── 查询 D1 数据库
```

- **Astro 构建时**（SSG）：调用 Worker API 获取文章/文档列表，生成静态 HTML
- **运行时**：无 JS（0 runtime JS 策略），SEO 完全友好
- **动态导航**：修改 D1 中的 nav_links 表，Worker 实时返回最新数据，无需重新构建

## 💻 本地开发

### 前提条件

```bash
node >= 20
pnpm >= 9
```

### 安装依赖

```bash
cd saas-matrix
pnpm install
```

### 启动本地 Worker（D1 API 层）

```bash
cd apps/site-template
pnpm wrangler dev worker/index.ts --local
# Worker 运行在 http://localhost:8787
```

### 启动 Astro 开发服务器

```bash
# 新终端
cd apps/site-template
WORKER_API_URL=http://localhost:8787 pnpm dev
# 站点运行在 http://localhost:4321
```

### 一键构建所有 apps

```bash
pnpm build  # 在根目录执行，Turbo 并行构建
```

## ➕ 创建新站

```bash
# 语法：pnpm create:site <siteKey> <domain> [title] [color]
pnpm create:site mytool mytool.example.com "My Tool" "#10b981"
```

> 详见 [DEPLOY.md](./DEPLOY.md)

## 📝 常用命令

| 命令 | 说明 |
|------|------|
| `pnpm dev` | 并行启动所有 app 开发服务器 |
| `pnpm build` | 并行构建所有 app |
| `pnpm lint` | 检查代码规范 |
| `pnpm format` | 格式化所有文件 |
| `pnpm create:site` | 克隆新站脚本 |

## 📦 扩展指引

- **登录系统**：参考 `packages/core/src/auth/index.ts`，集成 Lucia Auth 或 Auth.js
- **支付**：在 `plans` 表添加 `stripe_price_id`，集成 Stripe Checkout
- **多语言**：在 `site.config.ts` 中配置 `locale`，结合 Astro i18n 路由
- **图片**：推荐使用 Cloudflare Images 或 R2 存储
