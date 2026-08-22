import type { TierDef } from './types.ts';

/**
 * Static, data-driven difficulty tiers. unlockAtFloor gates are placeholder
 * tuning numbers (per the brief: playtesting, not a design decision) — reach
 * that floor depth in tier N to unlock tier N+1. This doubles as onboarding.
 */
export const TIERS: TierDef[] = [
    {
        id: 1,
        name: 'The Whimper',
        tagline: 'Barely a dungeon. Mostly a courtesy.',
        enemyStatMult: 1,
        unlockAtFloor: 5,
        lootWeights: { common: 60, uncommon: 30, rare: 9, epic: 1, legendary: 0 },
        color: 0x9ca3af,
        pillarsEnabled: true,
    },
    {
        id: 2,
        name: 'The Ruckus',
        tagline: 'Things are now technically trying to kill you.',
        enemyStatMult: 1.6,
        unlockAtFloor: 10,
        lootWeights: { common: 45, uncommon: 35, rare: 16, epic: 3.5, legendary: 0.5 },
        color: 0x4ade80,
        pillarsEnabled: true,
    },
    {
        id: 3,
        name: 'The Mayhem',
        tagline: 'Dodge more. Think less. Swing anyway.',
        enemyStatMult: 2.6,
        unlockAtFloor: 15,
        lootWeights: { common: 30, uncommon: 35, rare: 25, epic: 8, legendary: 2 },
        color: 0x60a5fa,
        pillarsEnabled: true,
    },
    {
        id: 4,
        name: 'The Oblivion',
        tagline: 'Nonsense monsters, unlimited, no refunds. Pillars drop between floors.',
        enemyStatMult: 4,
        unlockAtFloor: 20, // now gates The Undiluted instead of being the final tier
        lootWeights: { common: 15, uncommon: 30, rare: 32, epic: 17, legendary: 6 },
        color: 0xc084fc,
        pillarsEnabled: true,
    },
    {
        id: 5,
        name: 'The Undiluted',
        tagline: 'Same numbers as Oblivion. None of the Pillar nonsense.',
        enemyStatMult: 4,
        unlockAtFloor: 9999, // deepest tier — no further gate
        lootWeights: { common: 15, uncommon: 30, rare: 32, epic: 17, legendary: 6 },
        color: 0xe5e7eb,
        pillarsEnabled: false,
    },
];

export function getTier(id: number): TierDef {
    const t = TIERS.find((x) => x.id === id);
    if (!t) throw new Error(`Unknown tier: ${id}`);
    return t;
}
