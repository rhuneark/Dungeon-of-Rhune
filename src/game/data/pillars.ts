import type { StatBlock } from './types.ts';

/**
 * Pillars are the roguelite layer: two choices drop between floors (only on
 * tiers with pillarsEnabled), the player walks to one, and its effect lasts
 * the rest of the run — plain flat StatBlock deltas, same units as gear
 * affixes and Rhunes, but never written to the save. 'buff' pillars are
 * small, safe, pure upside. 'specialized' pillars are a big spike to the
 * player paired with a matching multiplier on enemies for the rest of the
 * run (bigger risk, bigger payoff) — kept as separate multipliers rather
 * than folded into playerMods so dungeonScene can compound them with
 * statMultForFloor instead of fighting the flat-stat math.
 */
export interface PillarEnemyMods {
    hpMult?: number;
    damageMult?: number;
    speedMult?: number;
    /** Multiplies enemy spawn counts on future floors this run. */
    spawnMult?: number;
}

export interface PillarDef {
    id: string;
    name: string;
    description: string;
    kind: 'buff' | 'specialized';
    playerMods: Partial<StatBlock>;
    enemyMods?: PillarEnemyMods;
    color: number;
}

export const PILLARS: PillarDef[] = [
    // --- buff: small, safe, pure upside ---
    { id: 'pillar_might', name: 'Pillar of Might', description: '+6 damage.', kind: 'buff', playerMods: { damage: 6 }, color: 0xef4444 },
    { id: 'pillar_haste', name: 'Pillar of Haste', description: '+0.12 attack speed.', kind: 'buff', playerMods: { fireRate: 0.12 }, color: 0xf97316 },
    { id: 'pillar_vigor', name: 'Pillar of Vigor', description: '+18 max HP, healed on pickup.', kind: 'buff', playerMods: { maxHp: 18 }, color: 0x22c55e },
    { id: 'pillar_fortitude', name: 'Pillar of Fortitude', description: '+3 armor.', kind: 'buff', playerMods: { armor: 3 }, color: 0x71717a },
    { id: 'pillar_blade', name: 'Pillar of the Blade', description: '+5% crit chance.', kind: 'buff', playerMods: { critChance: 0.05 }, color: 0xfacc15 },
    { id: 'pillar_killing_blow', name: 'Pillar of the Killing Blow', description: '+40% crit damage.', kind: 'buff', playerMods: { critDamage: 0.4 }, color: 0xfbbf24 },
    { id: 'pillar_swiftness', name: 'Pillar of Swiftness', description: '+18 move speed.', kind: 'buff', playerMods: { moveSpeed: 18 }, color: 0x38bdf8 },
    { id: 'pillar_hoarder', name: 'Pillar of the Hoarder', description: '+45 loot radius, +0.15 luck.', kind: 'buff', playerMods: { magnetRadius: 45, luck: 0.15 }, color: 0xeab308 },
    { id: 'pillar_leech', name: 'Pillar of the Leech', description: '+5% lifesteal.', kind: 'buff', playerMods: { lifesteal: 0.05 }, color: 0xbe123c },
    { id: 'pillar_wards', name: 'Pillar of Wards', description: '+6% damage reduction.', kind: 'buff', playerMods: { damageReduction: 0.06 }, color: 0x818cf8 },
    { id: 'pillar_evasion', name: 'Pillar of Evasion', description: '+5% dodge chance.', kind: 'buff', playerMods: { dodgeChance: 0.05 }, color: 0x67e8f9 },
    { id: 'pillar_renewal', name: 'Pillar of Renewal', description: '+2 HP regen/sec, +5% floor-clear heal.', kind: 'buff', playerMods: { regen: 2, floorHealPct: 0.05 }, color: 0x4ade80 },

    // --- specialized: a big spike for you, matched by a multiplier on enemies ---
    {
        id: 'pillar_bloodrage',
        name: 'Pillar of Bloodrage',
        description: '+12 damage. Enemies deal 25% more damage.',
        kind: 'specialized',
        playerMods: { damage: 12 },
        enemyMods: { damageMult: 1.25 },
        color: 0xdc2626,
    },
    {
        id: 'pillar_adrenaline',
        name: 'Pillar of Adrenaline',
        description: '+60 move speed, +0.35 attack speed. Enemies move 30% faster.',
        kind: 'specialized',
        playerMods: { moveSpeed: 60, fireRate: 0.35 },
        enemyMods: { speedMult: 1.3 },
        color: 0xfb923c,
    },
    {
        id: 'pillar_bastion',
        name: 'Pillar of the Bastion',
        description: '+8 armor, +15% damage reduction. Enemies gain 40% more HP.',
        kind: 'specialized',
        playerMods: { armor: 8, damageReduction: 0.15 },
        enemyMods: { hpMult: 1.4 },
        color: 0x64748b,
    },
    {
        id: 'pillar_swarm',
        name: 'Pillar of the Swarm',
        description: '+2 projectiles, +2 pierce. 35% more enemies spawn each floor.',
        kind: 'specialized',
        playerMods: { projectileCount: 2, pierce: 2 },
        enemyMods: { spawnMult: 1.35 },
        color: 0x16a34a,
    },
    {
        id: 'pillar_frenzy',
        name: 'Pillar of Frenzy',
        description: '+15% crit chance, +60% crit damage. Enemies deal 20% more damage.',
        kind: 'specialized',
        playerMods: { critChance: 0.15, critDamage: 0.6 },
        enemyMods: { damageMult: 1.2 },
        color: 0xf59e0b,
    },
    {
        id: 'pillar_vampirism',
        name: 'Pillar of Vampirism',
        description: '+12% lifesteal, +6 heal on kill. Enemies gain 25% more HP.',
        kind: 'specialized',
        playerMods: { lifesteal: 0.12, healOnKill: 6 },
        enemyMods: { hpMult: 1.25 },
        color: 0x9f1239,
    },
    {
        id: 'pillar_overload',
        name: 'Pillar of Overload',
        description: '+0.5 attack speed. Enemies move 25% faster and deal 10% more damage.',
        kind: 'specialized',
        playerMods: { fireRate: 0.5 },
        enemyMods: { speedMult: 1.25, damageMult: 1.1 },
        color: 0xfacc15,
    },
    {
        id: 'pillar_colossus',
        name: 'Pillar of the Colossus',
        description: '+60 max HP, +4 thorns. Enemies gain 30% more HP and deal 15% more damage.',
        kind: 'specialized',
        playerMods: { maxHp: 60, thorns: 4 },
        enemyMods: { hpMult: 1.3, damageMult: 1.15 },
        color: 0x7c3aed,
    },
];
