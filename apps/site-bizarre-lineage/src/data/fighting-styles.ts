// src/data/fighting-styles.ts
// 3 种 Fighting Style 数据

export interface FightingStyle {
    slug: string;
    name: string;
    description: string;
    comboPoential: number;  // 1-10
    damageScaling: number;  // 1-10
    range: "Close" | "Mid" | "Long";
    bestStands: string[];   // slugs
    moves: StyleMove[];
    pros: string[];
    cons: string[];
    howToGet: string;
}

export interface StyleMove {
    key: string;
    name: string;
    description: string;
}

export const fightingStyles: FightingStyle[] = [
    {
        slug: "boxing",
        name: "Boxing",
        description: "Reliable combos, high burst, close-range specialist. Great for extending M1 chains and maximizing damage output in close quarters. The most popular fighting style.",
        comboPoential: 9,
        damageScaling: 8,
        range: "Close",
        bestStands: ["whitesnake", "the-world", "star-platinum", "crazy-diamond", "king-crimson", "purple-haze"],
        moves: [
            { key: "B", name: "Jaw Breaker", description: "A powerful uppercut that launches opponents into the air for follow-up combos." },
            { key: "N", name: "Dash Punch", description: "Lunge forward with a fast punch, closing gaps quickly." },
            { key: "M", name: "Eye Gouge", description: "Temporarily blind the opponent, reducing their accuracy." },
        ],
        pros: [
            "Highest combo potential in the game",
            "Great M1 chain extensions",
            "Works with almost every Stand",
            "Easy to learn, hard to master",
        ],
        cons: [
            "Very short range — requires closing distance",
            "Struggles against kiting and zoning playstyles",
            "No sustain or defensive options",
        ],
        howToGet: "Talk to the Boxing Trainer at Bus Stop 3 (Gym). Costs $5,000.",
    },
    {
        slug: "kendo",
        name: "Kendo",
        description: "Excellent range and counter-attacks. Synergizes with fast or sword-based Stands. Provides a mid-range option for players who want reach without sacrificing damage.",
        comboPoential: 6,
        damageScaling: 7,
        range: "Mid",
        bestStands: ["anubis", "made-in-heaven", "c-moon", "weather-report"],
        moves: [
            { key: "B", name: "Quick Draw", description: "A fast unsheathing slash with good range." },
            { key: "N", name: "Counter Slash", description: "Parry an incoming attack and counter with a heavy slash." },
            { key: "M", name: "Multislash", description: "A series of rapid slashes hitting multiple times." },
        ],
        pros: [
            "Superior range compared to Boxing",
            "Counter Slash punishes aggressive players",
            "Great synergy with blade-based Stands",
            "Solid neutral game in PvP",
        ],
        cons: [
            "Lower combo potential than Boxing",
            "Counter requires precise timing",
            "Less burst damage in short windows",
        ],
        howToGet: "Talk to the Kendo Master at Bus Stop 7 (Dojo). Costs $7,500.",
    },
    {
        slug: "vampire",
        name: "Vampirism",
        description: "Provides high sustain and ranged pressure through life steal and blood-based attacks. The best defensive fighting style, but vulnerable to Hamon users.",
        comboPoential: 7,
        damageScaling: 6,
        range: "Mid",
        bestStands: ["the-world", "killer-queen", "whitesnake"],
        moves: [
            { key: "B", name: "Blood Drain", description: "Grab an opponent and drain their HP, healing yourself." },
            { key: "N", name: "Space Ripper Stingy Eyes", description: "Fire high-pressure blood beams from your eyes for ranged damage." },
            { key: "M", name: "Freeze Touch", description: "Freeze an opponent on contact, immobilizing them briefly." },
        ],
        pros: [
            "Life steal provides excellent sustain",
            "Space Ripper gives reliable ranged damage",
            "Freeze Touch creates combo openings",
            "Best style for extended fights and 1vX",
        ],
        cons: [
            "Takes extra damage from Hamon users (hard counter)",
            "Lower burst than Boxing in short trade windows",
            "Blood Drain requires a grab — punishable if whiffed",
        ],
        howToGet: "Find the Vampire NPC at night near Bus Stop 9. Costs $10,000 + Stone Mask.",
    },
];

export function getStyleBySlug(slug: string): FightingStyle | undefined {
    return fightingStyles.find((s) => s.slug === slug);
}

export function getAllStyleSlugs(): string[] {
    return fightingStyles.map((s) => s.slug);
}
