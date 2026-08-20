import type { Rarity } from './types.ts';

export interface RarityDef {
    id: Rarity;
    label: string;
    /** Ground-glow / UI color, matches drop VFX to inventory chrome. */
    color: number;
    hex: string;
    /** How many affixes an item of this rarity rolls. */
    affixCount: number;
    /** Multiplies each rolled affix value and rhune magnitude. */
    valueMult: number;
    /** Base salvage currency per rarity tier. */
    salvageValue: number;
}

export const RARITIES: Record<Rarity, RarityDef> = {
    common: {
        id: 'common',
        label: 'Common',
        color: 0x9ca3af,
        hex: '#9ca3af',
        affixCount: 0,
        valueMult: 1,
        salvageValue: 1,
    },
    uncommon: {
        id: 'uncommon',
        label: 'Uncommon',
        color: 0x4ade80,
        hex: '#4ade80',
        affixCount: 1,
        valueMult: 1.25,
        salvageValue: 3,
    },
    rare: {
        id: 'rare',
        label: 'Rare',
        color: 0x60a5fa,
        hex: '#60a5fa',
        affixCount: 2,
        valueMult: 1.6,
        salvageValue: 8,
    },
    epic: {
        id: 'epic',
        label: 'Epic',
        color: 0xc084fc,
        hex: '#c084fc',
        affixCount: 3,
        valueMult: 2.1,
        salvageValue: 20,
    },
    legendary: {
        id: 'legendary',
        label: 'Legendary',
        color: 0xfbbf24,
        hex: '#fbbf24',
        affixCount: 4,
        valueMult: 2.8,
        salvageValue: 50,
    },
};

/** How much the `luck` stat boosts each rarity's weight — bigger payoff at the top end. */
const LUCK_RARITY_BOOST: Record<Rarity, number> = {
    common: 0,
    uncommon: 0.25,
    rare: 0.5,
    epic: 0.9,
    legendary: 1.4,
};

export function rollRarity(weights: Record<Rarity, number>, luck = 0): Rarity {
    const entries = Object.entries(weights) as [Rarity, number][];
    const adjusted = entries.map(([rarity, weight]) => [rarity, weight * (1 + luck * LUCK_RARITY_BOOST[rarity])] as [Rarity, number]);
    const total = adjusted.reduce((sum, [, w]) => sum + w, 0);
    let roll = Math.random() * total;
    for (const [rarity, weight] of adjusted) {
        roll -= weight;
        if (roll <= 0) return rarity;
    }
    return adjusted[adjusted.length - 1][0];
}
