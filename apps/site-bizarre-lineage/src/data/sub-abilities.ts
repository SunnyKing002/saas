// src/data/sub-abilities.ts
// Sub-Abilities data — updated March 2026 based on latest game data

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
    comingSoon?: boolean;   // If true, not yet available in-game
}

export interface SubMove {
    key: string;
    name: string;
    description: string;
}

export const subAbilities: SubAbility[] = [
    {
        slug: "hamon",
        name: "Hamon (The Ripple)",
        part: "Parts 1–2",
        description: "Channel the Ripple energy of the sun through your body. Strong anti-Vampire properties and solid crowd control make Hamon the most beginner-friendly sub-ability in Bizarre Lineage.",
        passive: "Passive HP regeneration in all conditions. All three Hamon moves deal bonus damage against Vampire-type players.",
        pvpValue: 7,
        pveValue: 7,
        survival: 5,
        bestStands: ["star-platinum", "crazy-diamond", "king-crimson", "the-hand", "magicians-red"],
        moves: [
            { key: "T", name: "Sunlight Yellow Overdrive", description: "A powerful Hamon barrage that stuns the target and deals heavy bonus damage to Vampire-type players." },
            { key: "Y", name: "Sendo Ripple Overdrive", description: "Send a Hamon wave forward that stuns all enemies it passes through. Deals extra damage to Vampires." },
            { key: "U", name: "Scarlet Overdrive", description: "A charged rushing dash-punch that ragdolls the target. Deals additional damage to Vampire users." },
        ],
        pros: [
            "Three moves all deal bonus damage vs Vampire — hard counter",
            "Excellent crowd control: stun and ragdoll on multiple moves",
            "Passive HP regen adds survivability in extended fights",
            "Great combo potential, easy to chain after Stand moves",
        ],
        cons: [
            "No defensive or mobility options",
            "Bonus effectiveness only vs Vampire — neutral vs all others",
            "Lower ceiling versus Spin in mirror PvP",
        ],
        howToGet: "Speak to the Ancient Ghost NPC near Bus Stop 13 and complete its Hamon initiation quest. No currency required — quest completion only.",
    },
    {
        slug: "spin",
        name: "Spin",
        part: "Part 7",
        description: "Master the art of the Steel Ball. Ranged pressure with block bypass makes Spin the highest-skill-cap sub-ability. ⚠️ Spin is currently not available in-game and is expected to be added in a future update.",
        passive: "Fully charged attacks bypass blocking. (Coming Soon)",
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
            "Excellent area lock-down potential",
        ],
        cons: [
            "Requires precise aim — high skill floor",
            "Low survival value — no defensive tools",
            "Currently unavailable — expected in a future update",
        ],
        howToGet: "Spin is not yet available in Bizarre Lineage. Follow the official Trello board for release announcements.",
        comingSoon: true,
    },
    {
        slug: "cyborg",
        name: "Cyborg",
        part: "Part 2",
        description: "Mechanical enhancements for maximum tankiness. UV blasts, machine gun fire, and missile barrages provide a unique stun-heavy toolkit. The best PvE sub-ability with the highest defensive stats.",
        passive: "Increases base defense by 15%, reducing all incoming damage. Immune to bleed effects.",
        pvpValue: 6,
        pveValue: 9,
        survival: 9,
        bestStands: ["purple-haze", "killer-queen", "golden-experience"],
        moves: [
            { key: "T", name: "Ultraviolet Radiation Apparatus", description: "Grab an opponent and fire concentrated UV blasts at them. Deals extra damage to Vampire-type players." },
            { key: "Y", name: "Machine Gun", description: "Open your torso and fire a rapid burst of bullets that briefly stuns enemies." },
            { key: "U", name: "Missile Volley", description: "Launch a volley of missiles in a straight line that explode on impact, stunning affected enemies." },
        ],
        pros: [
            "Highest survival rating — 15% damage reduction passive",
            "UV apparatus is a hard counter to Vampire users",
            "Stun tools on all three moves for excellent crowd control",
            "AoE damage excels in PvE mob grinding",
        ],
        cons: [
            "Lower PvP versatility — requires setups to be effective",
            "Missile Volley and Machine Gun require good positioning",
            "Slower playstyle doesn't suit aggressive Stands",
        ],
        howToGet: "Talk to Rudol von Stroheim NPC near Bus Stop 3 and complete his quest to become a Cyborg.",
    },
    {
        slug: "vampire-sub",
        name: "Vampire",
        part: "Parts 1–3",
        description: "Reject your humanity and embrace the power of DIO. Life-stealing blood abilities and powerful crowd control provide top-tier sustain in both PvP and PvE. Hard-countered by Hamon users.",
        passive: "Grants a blood meter that fills on combat hits. When full, provides a significant HP regeneration bonus (+0.04 HP/0.1s with High Speed Regeneration). Also gives constant passive HP regen (+0.02 HP/0.1s). Red dodge aura.",
        pvpValue: 7,
        pveValue: 8,
        survival: 8,
        bestStands: ["the-world", "killer-queen", "the-world-high-voltage"],
        moves: [
            { key: "T", name: "Space Ripper Stingy Eyes", description: "Fire pressurized blood beams from your eyes that stun and burn the opponent." },
            { key: "Y", name: "Leeching Terror", description: "Grab an opponent and drain their blood, healing yourself significantly." },
            { key: "U", name: "Flash Freeze", description: "Uppercut, freeze, then slam the opponent into the ground, leaving them stunned." },
        ],
        pros: [
            "Powerful blood meter provides a massive regeneration burst",
            "Space Ripper is excellent ranged pressure with stun+burn",
            "Leeching Terror (lifesteal) sustains through long 1vX fights",
            "Flash Freeze creates guaranteed combo openings",
        ],
        cons: [
            "Hard-countered by Hamon users — all Hamon moves deal extra damage",
            "Leeching Terror grab is punishable if whiffed in PvP",
            "Blood meter requires active combat to maintain its benefits",
        ],
        howToGet: "Obtain a Vampire Mask (drops randomly or from specific bosses) and use it. Then locate the Elder Vampire NPC inside Dio's Chapel and complete his quest to unlock all three Vampire abilities.",
    },
];

export function getSubBySlug(slug: string): SubAbility | undefined {
    return subAbilities.find((s) => s.slug === slug);
}

export function getAllSubSlugs(): string[] {
    return subAbilities.map((s) => s.slug);
}
