// site.config.ts — Bizarre Lineage 站点配置

export const siteConfig = {
  // 基本信息
  key: "bizarre-lineage",
  title: "Bizarre Lineage",
  tagline: "Wiki, Tier List & Codes",
  description: "The ultimate Bizarre Lineage Wiki for Roblox. Updated Stand Tier List, active codes, best builds, fighting styles, sub-abilities, and guides for PvP & PvE.",
  domain: "bizarre-lineage.com",
  url: "https://bizarre-lineage.com",

  // 游戏链接
  robloxLink: "https://www.roblox.com/games/14890802310/Bizarre-Lineage",
  discordLink: "#", // TODO: 填入实际 Discord 链接
  trelloLink: "#",  // TODO: 公开 Trello 看板链接

  // 配色（JoJo 紫金暗色系）
  primaryColor: "#7c3aed",       // Violet 600
  accentColor: "#f59e0b",        // Amber 500 — 金色
  bgColor: "#0c0a1a",           // 深紫黑
  cardBg: "rgba(124,58,237,0.08)", // 半透明紫
  textColor: "#e2e8f0",
  textMuted: "#94a3b8",
  borderColor: "rgba(124,58,237,0.15)",

  // Tier 颜色
  tierColors: {
    "S+": "#ef4444",  // 红色
    S: "#f59e0b",     // 金色
    A: "#6366f1",     // 靛蓝
    B: "#22c55e",     // 绿色
  } as Record<string, string>,

  // SEO
  ogImage: "/og-image.png",
  locale: "en",

  // Google Analytics (TODO)
  gaId: "",
} as const;
