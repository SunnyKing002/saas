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

-- ⑤ users 表：用户（支持 Google OAuth 等第三方登录）
CREATE TABLE IF NOT EXISTS users (
  id                   TEXT    PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  site_id              TEXT    NOT NULL REFERENCES sites(id) ON DELETE CASCADE, -- 所属站点
  email                TEXT    NOT NULL,       -- 邮箱（登录账号）
  display_name         TEXT    NOT NULL DEFAULT '', -- 显示名（来自 Google profile name）
  avatar_url           TEXT    NOT NULL DEFAULT '', -- 头像 URL（来自 Google profile picture）
  email_verified       INTEGER NOT NULL DEFAULT 0,  -- 邮件是否已验证（Google 账户默认为 1）
  password_hash        TEXT,                  -- 密码哈希（可选，支持第三方登录时为 NULL）
  external_provider    TEXT,                  -- 第三方登录来源，例如 "google" / "github"
  external_provider_id TEXT,                 -- 第三方登录 ID（Google sub）
  role                 TEXT    NOT NULL DEFAULT 'user',  -- 角色：user / admin
  created_at           TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at           TEXT    NOT NULL DEFAULT (datetime('now')),
  UNIQUE(site_id, email),
  UNIQUE(external_provider, external_provider_id)  -- 同一 provider 账户唯一
);

CREATE INDEX IF NOT EXISTS idx_users_site_id ON users(site_id);
CREATE INDEX IF NOT EXISTS idx_users_provider ON users(external_provider, external_provider_id);

-- ⑥ sessions 表：登录会话
CREATE TABLE IF NOT EXISTS sessions (
  id          TEXT    PRIMARY KEY,
  user_id     TEXT    NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  site_id     TEXT    NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  expires_at  TEXT    NOT NULL,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

-- ⑦ plans 表：订阅套餐（含 Creem Product ID）
CREATE TABLE IF NOT EXISTS plans (
  id                TEXT    PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  site_id           TEXT    NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  name              TEXT    NOT NULL,            -- 套餐显示名称
  description       TEXT    NOT NULL DEFAULT '', -- 套餐描述
  price             REAL    NOT NULL DEFAULT 0,  -- 价格（分，USD）
  currency          TEXT    NOT NULL DEFAULT 'USD',
  billing_cycle     TEXT    NOT NULL DEFAULT 'monthly', -- monthly / yearly / one_time
  credits_per_cycle INTEGER NOT NULL DEFAULT 0,  -- 每周期赠送积分（订阅）或一次赠送（一次性）
  creem_product_id  TEXT,                         -- Creem Dashboard 中的 Product ID（必填）
  features_json     TEXT    NOT NULL DEFAULT '[]',-- 功能列表 JSON
  is_active         INTEGER NOT NULL DEFAULT 1,
  sort_order        INTEGER NOT NULL DEFAULT 0,  -- 展示顺序
  created_at        TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_plans_site_id ON plans(site_id);

-- ⑧ credit_packages 表：单次购买积分包（冗余，实际用 plans 表 billing_cycle='one_time'，此表作为视图方便查询）
-- 简化方案：直接用 plans 表区分订阅和单次，不另建表

-- ⑨ user_credits 表：用户积分余额（乐观锁）
CREATE TABLE IF NOT EXISTS user_credits (
  id         TEXT    PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id    TEXT    NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  site_id    TEXT    NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  balance    INTEGER NOT NULL DEFAULT 0,   -- 当前余额（整数积分）
  version    INTEGER NOT NULL DEFAULT 0,   -- 乐观锁版本号
  updated_at TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_user_credits_user_id ON user_credits(user_id);

-- ⑩ credit_transactions 表：积分流水（充值/扣减/退款）
CREATE TABLE IF NOT EXISTS credit_transactions (
  id             TEXT    PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id        TEXT    NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  site_id        TEXT    NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  amount         INTEGER NOT NULL,             -- 正数=充值，负数=扣减
  balance_after  INTEGER NOT NULL,             -- 操作后余额
  type           TEXT    NOT NULL,             -- topup / deduct / refund / subscription_grant
  reason         TEXT    NOT NULL DEFAULT '',  -- 业务说明（如：购买积分包100, 使用AI生成等）
  order_id       TEXT,                         -- 关联 payment_orders.id（充值时）
  idempotency_key TEXT,                        -- 幂等键（防止重复充值）
  created_at     TEXT    NOT NULL DEFAULT (datetime('now')),
  UNIQUE(idempotency_key)                      -- 幂等唯一约束
);

CREATE INDEX IF NOT EXISTS idx_credit_tx_user_id ON credit_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_tx_created_at ON credit_transactions(created_at DESC);

-- ⑪ user_subscriptions 表：用户订阅状态
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id                    TEXT    PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id               TEXT    NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  site_id               TEXT    NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  plan_id               TEXT    NOT NULL REFERENCES plans(id),
  creem_subscription_id TEXT    NOT NULL UNIQUE,  -- Creem 订阅 ID
  creem_customer_id     TEXT    NOT NULL,          -- Creem 客户 ID
  status                TEXT    NOT NULL,          -- active / canceled / past_due / expired / trialing / paused
  current_period_start  TEXT,                      -- 当前周期开始时间
  current_period_end    TEXT,                      -- 当前周期结束时间（到期时间）
  credits_granted_at    TEXT,                      -- 本周期积分已发放时间（防重复发放）
  created_at            TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at            TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_subs_user_id ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subs_creem_id ON user_subscriptions(creem_subscription_id);

-- ⑫ payment_orders 表：支付订单（防重放，记录 Creem checkout）
CREATE TABLE IF NOT EXISTS payment_orders (
  id                  TEXT    PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id             TEXT    NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  site_id             TEXT    NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  plan_id             TEXT    REFERENCES plans(id),
  creem_checkout_id   TEXT    UNIQUE,       -- Creem checkout session ID
  creem_order_id      TEXT    UNIQUE,       -- Creem 订单 ID（webhook 中返回）
  type                TEXT    NOT NULL,     -- subscription / one_time
  status              TEXT    NOT NULL DEFAULT 'pending', -- pending / paid / failed / refunded
  amount              REAL    NOT NULL DEFAULT 0,
  currency            TEXT    NOT NULL DEFAULT 'USD',
  credits_amount      INTEGER NOT NULL DEFAULT 0, -- 本次购买的积分数量
  created_at          TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at          TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_orders_user_id ON payment_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_checkout_id ON payment_orders(creem_checkout_id);

-- ============================================================
-- 初始化示例数据
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

-- 插入默认订阅套餐（TODO: 将 creem_product_id 替换为真实 Creem Product ID）
INSERT OR IGNORE INTO plans (site_id, name, description, price, billing_cycle, credits_per_cycle, creem_product_id, features_json, sort_order)
SELECT id, 'Starter', 'Perfect for individuals', 990, 'monthly', 500, 'prod_starter_TODO', '["500 credits/month","Email support","API access"]', 1
FROM sites WHERE key = 'site-template';

INSERT OR IGNORE INTO plans (site_id, name, description, price, billing_cycle, credits_per_cycle, creem_product_id, features_json, sort_order)
SELECT id, 'Pro', 'For power users and teams', 2990, 'monthly', 2000, 'prod_6FljzJlHd5JDqpEwCO0OY7', '["2000 credits/month","Priority support","API access","Advanced analytics"]', 2
FROM sites WHERE key = 'site-template';

INSERT OR IGNORE INTO plans (site_id, name, description, price, billing_cycle, credits_per_cycle, creem_product_id, features_json, sort_order)
SELECT id, 'Pro Yearly', 'Save 20% on Pro', 28700, 'yearly', 24000, 'prod_1cHvLmuKo9iGFHu5cEDgjg', '["2000 credits/month","Priority support","API access","Advanced analytics"]', 3
FROM sites WHERE key = 'site-template';

INSERT OR IGNORE INTO plans (site_id, name, description, price, billing_cycle, credits_per_cycle, creem_product_id, features_json, sort_order)
SELECT id, 'Credits 100', 'One-time credit topup', 190, 'one_time', 100, 'prod_credits100_TODO', '["100 credits","Never expire","Instant delivery"]', 10
FROM sites WHERE key = 'site-template';

INSERT OR IGNORE INTO plans (site_id, name, description, price, billing_cycle, credits_per_cycle, creem_product_id, features_json, sort_order)
SELECT id, 'Credits 500', 'One-time credit topup', 790, 'one_time', 500, 'prod_credits500_TODO', '["500 credits","Never expire","Best value"]', 11
FROM sites WHERE key = 'site-template';

INSERT OR IGNORE INTO plans (site_id, name, description, price, billing_cycle, credits_per_cycle, creem_product_id, features_json, sort_order)
SELECT id, 'Lifetime', 'One-time payment buyout', 19900, 'one_time', 10000, 'prod_6FljzJlHd5JDqpEwCO0OY7', '["10000 credits","Never expire","Maximum savings"]', 12
FROM sites WHERE key = 'site-template';
