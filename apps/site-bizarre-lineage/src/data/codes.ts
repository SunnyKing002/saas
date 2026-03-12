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
        code: "!code 100kLikes",
        reward: "1 Stat Point Essence, 1 Rare Chest",
        status: "active",
        addedDate: new Date().toISOString()
    },
    {
        code: "!code 30kLikes",
        reward: "1 Stat Point Essence",
        status: "active",
        addedDate: new Date().toISOString()
    },
    {
        code: "!code shutdownwoops",
        reward: "1 Stand Stat Essence",
        status: "active",
        addedDate: new Date().toISOString()
    },
    {
        code: "!code 1week",
        reward: "1 Stand Personality Essence",
        status: "active",
        addedDate: new Date().toISOString()
    }
];

export const expiredCodes: GameCode[] = [];

// 即将到来的可能奖励类型
export const expectedRewards = [
    { icon: "✨", name: "Stat Point Essence", description: "Instantly grants points to allocate to your character's combat stats." },
    { icon: "🧬", name: "Stand Personality Essence", description: "Used to reroll or modify your Stand's personality traits for hidden buffs." },
    { icon: "🎁", name: "Rare Chest", description: "Open for a chance to get high-tier accessories, cash, or drop-exclusive items." },
    { icon: "🏹", name: "Stand Arrow", description: "Use to roll for a random Stand. Higher rarity Stands have lower drop rates." },
];
