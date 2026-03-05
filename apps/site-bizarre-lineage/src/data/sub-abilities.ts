// src/data/sub-abilities.ts
// Sub-Abilities 数据

export interface SubAbility {
    slug: string;
    name: string;
    part: string;           // JoJo Part reference
    description: string;
    passive: string;
    pvpValue: number;       // 1-10
    pveValue: number;       // 1-10
    survival: number;       // 1-10
    bestStands: string[];   // Stand slugs
    moves: SubMove[];
    pros: string[];
    cons: string[];
    howToGet: string;
}

export interface SubMove {
    key: string;
    name: string;
    description: string;
}

export const subAbilities: SubAbility[] = [
    {
        slug: "hamon",
        name: "Hamon",
        part: "Parts 1-2",
        description: "Channel the energy of the sun through your body. High damage output, anti-Vampire properties, and the most beginner-friendly sub-ability.",
        passive: "Bonus damage vs Vampires, slight HP regeneration in sunlight.",
        pvpValue: 7,
        pveValue: 7,
        survival: 4,
        bestStands: ["star-platinum", "crazy-diamond", "king-crimson", "the-hand", "magicians-red"],
        moves: [
            { key: "T", name: "Hamon Punch", description: "Infuse your fist with Hamon energy for bonus damage. Extra effective against Vampires." },
            { key: "Y", name: "Hamon Overdrive", description: "Release a burst of Hamon energy in a wave, damaging all enemies in front of you." },
            { key: "U", name: "Zoom Punch", description: "Extend your arm using Hamon energy for a mid-range strike." },
        ],
        pros: [
            "Bonus damage vs Vampire users — hard counter",
            "Slight HP regen provides passive sustain",
            "Straightforward moves, easy to learn",
            "Solid all-around damage boost",
        ],
        cons: [
            "No defensive abilities",
            "Only effective counter is vs Vampire — neutral vs others",
            "Lower skill ceiling than Spin",
        ],
        howToGet: "Talk to the Hamon Master at Bus Stop 4. Costs $3,000.",
    },
    {
        slug: "spin",
        name: "Spin",
        part: "Part 7",
        description: "Master the art of the Steel Ball. Ranged pressure with block bypass makes Spin the highest-skill-cap sub-ability. Devastating in skilled hands.",
        passive: "Fully charged attacks bypass blocking.",
        pvpValue: 9,
        pveValue: 5,
        survival: 3,
        bestStands: ["made-in-heaven", "c-moon", "stone-free", "anubis"],
        moves: [
            { key: "T", name: "Steel Ball", description: "Throw a spinning steel ball that bypasses block on full charge." },
            { key: "Y", name: "Golden Rotation", description: "Enter a rotation state, boosting all projectile damage." },
            { key: "U", name: "Multi Ball", description: "Throw multiple steel balls in a spread pattern." },
        ],
        pros: [
            "Block bypass on charged attacks — extremely strong in PvP",
            "Ranged pressure without needing to close distance",
            "Highest PvP value of all sub-abilities",
            "Golden Rotation state boosts all ranged output",
        ],
        cons: [
            "Requires precise aim — high skill floor",
            "Low survival value — no defensive tools",
            "Weak in PvE due to single-target focus",
        ],
        howToGet: "Find Gyro Zeppeli near Bus Stop 6 (requires Prestige 1). Costs $15,000.",
    },
    {
        slug: "cyborg",
        name: "Cyborg",
        part: "Part 2",
        description: "Mechanical enhancements for maximum tankiness. Massive AoE damage and the highest survival rating of any sub-ability. The PvE king.",
        passive: "Increased base defense. Immune to bleed effects.",
        pvpValue: 5,
        pveValue: 9,
        survival: 9,
        bestStands: ["purple-haze", "killer-queen", "golden-experience"],
        moves: [
            { key: "T", name: "Rocket Punch", description: "Launch your mechanical fist as a ranged projectile." },
            { key: "Y", name: "UV Laser", description: "Fire a concentrated UV laser beam. Extra damage to Vampires." },
            { key: "U", name: "Self-Destruct", description: "Deal massive AoE damage around you (also damages yourself)." },
        ],
        pros: [
            "Highest survival rating — incredibly tanky",
            "Bleed immunity counters many PvP DoT effects",
            "UV Laser is effective against Vampire users",
            "AoE damage excels in PvE mob grinding",
        ],
        cons: [
            "Low PvP value — not competitive in high-level arenas",
            "Self-Destruct damages you — risky",
            "Slower playstyle doesn't suit aggressive Stands",
        ],
        howToGet: "Find Stroheim at Bus Stop 8. Costs $8,000.",
    },
    {
        slug: "vampire-sub",
        name: "Vampire",
        part: "Parts 1-3",
        description: "Embrace the darkness with life-stealing abilities. Strong sustain in PvP and PvE, but critically weak to Hamon users.",
        passive: "Life steal on melee hits. Reduced HP regen in sunlight.",
        pvpValue: 7,
        pveValue: 7,
        survival: 7,
        bestStands: ["the-world", "killer-queen", "the-world-high-voltage"],
        moves: [
            { key: "T", name: "Blood Suck", description: "Grab and drain an enemy's blood, healing yourself significantly." },
            { key: "Y", name: "Vaporization Freeze", description: "Freeze an enemy on touch, dealing damage and immobilizing them." },
            { key: "U", name: "Space Ripper", description: "Fire pressurized blood from your eyes as a ranged beam." },
        ],
        pros: [
            "Life steal provides strong sustain",
            "Vaporization Freeze creates guaranteed combo starters",
            "Good in extended fights and 1vX situations",
            "Synergizes with DIO's Stands (The World variants)",
        ],
        cons: [
            "Takes massive bonus damage from Hamon — hard countered",
            "Reduced HP regen in sunlight limits outdoor sustain",
            "Blood Suck grab is punishable if whiffed",
        ],
        howToGet: "Use a Stone Mask at night. Stone Masks spawn randomly or drop from bosses.",
    },
];

export function getSubBySlug(slug: string): SubAbility | undefined {
    return subAbilities.find((s) => s.slug === slug);
}

export function getAllSubSlugs(): string[] {
    return subAbilities.map((s) => s.slug);
}
