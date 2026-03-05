-- ============================================================
-- SaaS Matrix - D1 数据库 Schema
-- 数据库：Cloudflare D1 (SQLite 兼容)
-- 说明：支持一库多站，所有业务表通过 site_id 隔离
-- ============================================================

-- ① sites 表：站点基础信息
CREATE TABLE IF NOT EXISTS sites (
  id          TEXT    PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),  -- 主键，UUID
  key         TEXT    NOT NULL UNIQUE,  -- 站点唯一标识，代码中引用，例如 "mytool"
  domain      TEXT    NOT NULL UNIQUE,  -- 绑定的主域名，例如 "mytool.example.com"
  title       TEXT    NOT NULL,         -- 站点标题
  description TEXT    NOT NULL DEFAULT '', -- 站点描述，用于 SEO meta description
  logo_url    TEXT    NOT NULL DEFAULT '', -- Logo 图片地址
  primary_color TEXT  NOT NULL DEFAULT '#6366f1', -- 主题色（十六进制）
  locale      TEXT    NOT NULL DEFAULT 'en',       -- 默认语言，例如 "en" / "zh"
  created_at  TEXT    NOT NULL DEFAULT (datetime('now')), -- 创建时间
  updated_at  TEXT    NOT NULL DEFAULT (datetime('now'))  -- 最后更新时间
);

-- ② nav_links 表：导航链接/外链（动态注入，无需重新部署）
CREATE TABLE IF NOT EXISTS nav_links (
  id         TEXT    PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  site_id    TEXT    NOT NULL REFERENCES sites(id) ON DELETE CASCADE, -- 所属站点
  label      TEXT    NOT NULL,  -- 链接显示文字
  url        TEXT    NOT NULL,  -- 链接地址
  position   INTEGER NOT NULL DEFAULT 0,  -- 排序权重，越小越靠前
  target     TEXT    NOT NULL DEFAULT '_self', -- 链接打开方式：_self / _blank
  created_at TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_nav_links_site_id ON nav_links(site_id);

-- ③ posts 表：博客文章
CREATE TABLE IF NOT EXISTS posts (
  id               TEXT    PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  site_id          TEXT    NOT NULL REFERENCES sites(id) ON DELETE CASCADE, -- 所属站点
  slug             TEXT    NOT NULL,        -- URL 路径标识，例如 "my-first-post"
  title            TEXT    NOT NULL,        -- 文章标题
  summary          TEXT    NOT NULL DEFAULT '', -- 文章摘要（用于列表和 meta description）
  content_markdown TEXT    NOT NULL DEFAULT '', -- Markdown 格式正文
  cover_url        TEXT    NOT NULL DEFAULT '', -- 封面图地址
  published_at     TEXT,                    -- 发布时间（NULL 表示草稿）
  updated_at       TEXT    NOT NULL DEFAULT (datetime('now')),
  UNIQUE(site_id, slug)                     -- 同站 slug 唯一
);

CREATE INDEX IF NOT EXISTS idx_posts_site_id ON posts(site_id);
CREATE INDEX IF NOT EXISTS idx_posts_published_at ON posts(published_at DESC);

-- ④ docs 表：文档页面
CREATE TABLE IF NOT EXISTS docs (
  id               TEXT    PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  site_id          TEXT    NOT NULL REFERENCES sites(id) ON DELETE CASCADE, -- 所属站点
  slug             TEXT    NOT NULL,     -- URL 路径标识，例如 "getting-started"
  title            TEXT    NOT NULL,     -- 文档标题
  content_markdown TEXT    NOT NULL DEFAULT '', -- Markdown 格式内容
  order_index      INTEGER NOT NULL DEFAULT 0,  -- 文档在列表中的排序
  updated_at       TEXT    NOT NULL DEFAULT (datetime('now')),
  UNIQUE(site_id, slug)                  -- 同站 slug 唯一
);

CREATE INDEX IF NOT EXISTS idx_docs_site_id ON docs(site_id);

-- ⑤ users 表：用户（预留，后续扩展登录/权限系统）
CREATE TABLE IF NOT EXISTS users (
  id                  TEXT    PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  site_id             TEXT    NOT NULL REFERENCES sites(id) ON DELETE CASCADE, -- 所属站点
  email               TEXT    NOT NULL,      -- 邮箱（登录账号）
  password_hash       TEXT,                  -- 密码哈希（可选，支持第三方登录时为 NULL）
  external_provider   TEXT,                  -- 第三方登录来源，例如 "google" / "github"
  external_provider_id TEXT,                 -- 第三方登录 ID
  role                TEXT    NOT NULL DEFAULT 'user',  -- 角色：user / admin
  created_at          TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at          TEXT    NOT NULL DEFAULT (datetime('now')),
  UNIQUE(site_id, email)
);

CREATE INDEX IF NOT EXISTS idx_users_site_id ON users(site_id);

-- ⑥ plans 表：订阅套餐/定价（预留，后续扩展 Stripe 等支付）
CREATE TABLE IF NOT EXISTS plans (
  id            TEXT    PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  site_id       TEXT    NOT NULL REFERENCES sites(id) ON DELETE CASCADE, -- 所属站点
  name          TEXT    NOT NULL,          -- 套餐名称，例如 "Pro" / "Enterprise"
  price         REAL    NOT NULL DEFAULT 0, -- 价格（单位由 currency 决定）
  currency      TEXT    NOT NULL DEFAULT 'USD', -- 货币代码
  billing_cycle TEXT    NOT NULL DEFAULT 'monthly', -- 计费周期：monthly / yearly
  features_json TEXT    NOT NULL DEFAULT '[]',      -- 功能列表 JSON 数组
  stripe_price_id TEXT,                             -- TODO: Stripe Price ID（上线支付时填写）
  is_active     INTEGER NOT NULL DEFAULT 1,         -- 是否启用（1=是，0=否）
  created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_plans_site_id ON plans(site_id);

-- ============================================================
-- 初始化示例数据（可选，执行后删除或保留用于本地开发）
-- ============================================================

-- 插入默认站点（本地开发用）
INSERT OR IGNORE INTO sites (key, domain, title, description, primary_color)
VALUES (
  'site-template',
  'localhost',
  'My SaaS Tool',
  'A powerful SaaS tool for productivity',
  '#6366f1'
);
