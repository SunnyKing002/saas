// src/data/codes.ts
// 兑换码数据 — 持续更新

export interface GameCode {
    code: string;
    reward: string;
    status: "active" | "expired";
    addedDate: string;    // ISO date
    expiryDate?: string;  // ISO date or undefined for permanent
}

// 当前无活跃码 — 代码系统尚未被开发者发布
// 关注此页面以获取第一时间更新
export const activeCodes: GameCode[] = [];

export const expiredCodes: GameCode[] = [];

// 即将到来的可能奖励类型
export const expectedRewards = [
    { icon: "🏹", name: "Stand Arrow", description: "Use to roll for a random Stand. Higher rarity Stands have lower drop rates." },
    { icon: "🍈", name: "Rokakaka Fruit", description: "Reset your current Stand. Useful when you get a low-tier Stand from an Arrow." },
    { icon: "💰", name: "In-game Cash", description: "Currency for buying items, Fighting Styles, and Sub-Abilities." },
    { icon: "⚡", name: "EXP Boost", description: "Temporary boost to experience gain for faster leveling." },
];
