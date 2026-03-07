// src/data/codes.ts
// 兑换码数据 — 持续更新

export interface GameCode {
    code: string;
    reward: string;
    status: "active" | "expired" | "upcoming";
    addedDate: string;    // ISO date
    expiryDate?: string;  // ISO date or undefined for permanent
}

// 活跃/即将到来的兑换码
export const activeCodes: GameCode[] = [
    {
        code: "200KLIKES",
        reward: "Stand Arrow & Rokakaka",
        status: "upcoming",
        addedDate: new Date().toISOString()
    }
];

export const expiredCodes: GameCode[] = [];

// 即将到来的可能奖励类型
export const expectedRewards = [
    { icon: "🏹", name: "Stand Arrow", description: "Use to roll for a random Stand. Higher rarity Stands have lower drop rates." },
    { icon: "🍈", name: "Rokakaka Fruit", description: "Reset your current Stand. Useful when you get a low-tier Stand from an Arrow." },
    { icon: "💰", name: "In-game Cash", description: "Currency for buying items, Fighting Styles, and Sub-Abilities." },
    { icon: "⚡", name: "EXP Boost", description: "Temporary boost to experience gain for faster leveling." },
];
