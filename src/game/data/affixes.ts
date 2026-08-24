import type { AffixDef, NodeLevelAffixDef, ProcAffixDef } from './types.ts';

/**
 * "X% chance on [cause] to [effect]" — the out-there proc affixes any piece
 * of gear can roll, on top of (or instead of) plain stat bonuses. Shared
 * across every pool below: a helm rolling "chance on kill to throw 5
 * daggers" is exactly as valid as a hammer rolling it. rarityMult scaling
 * (chance capped, magnitude scaled) happens in procAffixRuntime.ts, same
 * pattern as Rhune effects.
 */
export const PROC_AFFIXES: ProcAffixDef[] = [
    {
        kind: 'proc',
        id: 'proc_dagger_burst',
        label: 'Dagger Burst',
        cause: 'onHit',
        chanceMin: 0.12,
        chanceMax: 0.22,
        effect: { kind: 'projectileBurst', count: 5, damage: 4, element: 'physical' },
    },
    {
        kind: 'proc',
        id: 'proc_axe_burst',
        label: 'Axe Burst',
        cause: 'onCrit',
        chanceMin: 0.15,
        chanceMax: 0.28,
        effect: { kind: 'projectileBurst', count: 3, damage: 8, element: 'physical' },
    },
    {
        kind: 'proc',
        id: 'proc_chain_dagger',
        label: 'Chain Dagger',
        cause: 'onHit',
        chanceMin: 0.15,
        chanceMax: 0.28,
        effect: { kind: 'projectileBurst', count: 1, damage: 6, element: 'physical' },
    },
    {
        kind: 'proc',
        id: 'proc_retaliate_burst',
        label: 'Retaliation Burst',
        cause: 'onBeingHit',
        chanceMin: 0.1,
        chanceMax: 0.2,
        effect: { kind: 'projectileBurst', count: 5, damage: 5, element: 'physical' },
    },
    {
        kind: 'proc',
        id: 'proc_wander_axe',
        label: 'Wandering Axe',
        cause: 'onMove',
        chanceMin: 0.15,
        chanceMax: 0.3,
        effect: { kind: 'projectileBurst', count: 1, damage: 5, element: 'physical' },
    },
    {
        kind: 'proc',
        id: 'proc_explode_hit',
        label: 'Explosive Impact',
        cause: 'onHit',
        chanceMin: 0.1,
        chanceMax: 0.18,
        effect: { kind: 'explosion', damage: 12, radius: 70, element: 'fire' },
    },
    {
        kind: 'proc',
        id: 'proc_explode_kill',
        label: 'Chain Reaction',
        cause: 'onKill',
        chanceMin: 0.15,
        chanceMax: 0.25,
        effect: { kind: 'explosion', damage: 15, radius: 80, element: 'physical' },
    },
    {
        kind: 'proc',
        id: 'proc_explode_crit',
        label: 'Arcane Overload',
        cause: 'onCrit',
        chanceMin: 0.1,
        chanceMax: 0.2,
        effect: { kind: 'explosion', damage: 20, radius: 75, element: 'arcane' },
    },
    {
        kind: 'proc',
        id: 'proc_retaliate_nova',
        label: 'Retaliation Nova',
        cause: 'onBeingHit',
        chanceMin: 0.1,
        chanceMax: 0.2,
        effect: { kind: 'explosion', damage: 10, radius: 60, element: 'physical' },
    },
    {
        kind: 'proc',
        id: 'proc_heal_kill',
        label: 'Vital Harvest',
        cause: 'onKill',
        chanceMin: 0.2,
        chanceMax: 0.32,
        effect: { kind: 'heal', amount: 9 },
    },
    {
        kind: 'proc',
        id: 'proc_heal_hit',
        label: 'Adrenaline',
        cause: 'onBeingHit',
        chanceMin: 0.15,
        chanceMax: 0.28,
        effect: { kind: 'heal', amount: 8 },
    },
    {
        kind: 'proc',
        id: 'proc_heal_floor',
        label: 'Fresh Start',
        cause: 'onFloorClear',
        chanceMin: 0.25,
        chanceMax: 0.4,
        effect: { kind: 'heal', amount: 25 },
    },
    {
        kind: 'proc',
        id: 'proc_slow_hit',
        label: 'Chilling Touch',
        cause: 'onHit',
        chanceMin: 0.15,
        chanceMax: 0.28,
        effect: { kind: 'statusApply', status: 'slow', magnitude: 0.3, duration: 1.6 },
    },
    {
        kind: 'proc',
        id: 'proc_poison_hit',
        label: 'Envenomed Edge',
        cause: 'onHit',
        chanceMin: 0.15,
        chanceMax: 0.28,
        effect: { kind: 'statusApply', status: 'poison', magnitude: 3, duration: 3.5 },
    },
    {
        kind: 'proc',
        id: 'proc_shock_hit',
        label: 'Static Discharge',
        cause: 'onHit',
        chanceMin: 0.12,
        chanceMax: 0.22,
        effect: { kind: 'statusApply', status: 'shock', magnitude: 0.15, duration: 2 },
    },
    {
        kind: 'proc',
        id: 'proc_stun_crit',
        label: 'Concussive Blow',
        cause: 'onCrit',
        chanceMin: 0.2,
        chanceMax: 0.35,
        effect: { kind: 'statusApply', status: 'stun', magnitude: 1, duration: 0.5 },
    },
    {
        kind: 'proc',
        id: 'proc_retaliate_burn',
        label: 'Retaliatory Scorch',
        cause: 'onBeingHit',
        chanceMin: 0.15,
        chanceMax: 0.28,
        effect: { kind: 'statusApply', status: 'burn', magnitude: 5, duration: 2.5 },
    },
    {
        kind: 'proc',
        id: 'proc_boost_fire',
        label: 'Ember Rush',
        cause: 'onFloorClear',
        chanceMin: 0.25,
        chanceMax: 0.4,
        effect: { kind: 'elementBoost', element: 'fire', amount: 8, duration: 10 },
    },
    {
        kind: 'proc',
        id: 'proc_boost_ice',
        label: 'Cold Snap',
        cause: 'onHit',
        chanceMin: 0.12,
        chanceMax: 0.2,
        effect: { kind: 'elementBoost', element: 'ice', amount: 4, duration: 4 },
    },
    {
        kind: 'proc',
        id: 'proc_boost_lightning',
        label: 'Charged Strike',
        cause: 'onHit',
        chanceMin: 0.12,
        chanceMax: 0.2,
        effect: { kind: 'elementBoost', element: 'lightning', amount: 4, duration: 4 },
    },
    {
        kind: 'proc',
        id: 'proc_currency_kill',
        label: 'Grave Robbery',
        cause: 'onKill',
        chanceMin: 0.2,
        chanceMax: 0.35,
        effect: { kind: 'currency', amount: 3 },
    },
];

/**
 * "+N levels" to one specific pillar's Final Convergence node — see
 * data/types.ts's NodeLevelAffixDef and systems/skillTree.ts's node-level
 * scaling. Deliberately only 6 of these exist (one per pillar's capstone),
 * jewelry-only, and diluted into a pool of ~40 other possible rolls — the
 * rarity is the point.
 */
export const NODE_LEVEL_AFFIXES: NodeLevelAffixDef[] = [
    { kind: 'nodeLevel', id: 'nl_axiora', nodeId: 'axiora_capstone_aegis', label: 'Empowered Aegis of Axiora' },
    { kind: 'nodeLevel', id: 'nl_rhunekra', nodeId: 'rhunekra_capstone_fourth_rhune', label: 'Empowered Fourth Rhune' },
    { kind: 'nodeLevel', id: 'nl_hyphora', nodeId: 'hyphora_capstone_perfect_recall', label: 'Empowered Perfect Recall' },
    { kind: 'nodeLevel', id: 'nl_fluxxara', nodeId: 'fluxxara_capstone_chaotic_surge', label: 'Empowered Chaotic Surge' },
    { kind: 'nodeLevel', id: 'nl_vitalis', nodeId: 'vitalis_capstone_overflowing_life', label: 'Empowered Overflowing Life' },
    { kind: 'nodeLevel', id: 'nl_aeona', nodeId: 'aeona_capstone_rewind', label: 'Empowered Rewind' },
];

/**
 * Affix pools keyed by BaseTypeDef.affixPoolId. Same base name -> same
 * pool -> same possible rolls, but each ItemInstance rolls its own subset
 * and its own values within each affix's [min, max] range. Split by weapon
 * role so a melee item can't roll ranged-only affixes (projectile count on
 * a hammer would just do nothing) and vice versa. Every pool also carries
 * the full PROC_AFFIXES list — any slot can roll an out-there proc.
 */
export const AFFIX_POOLS: Record<string, AffixDef[]> = {
    weaponMelee: [
        { kind: 'stat', id: 'wm_damage', stat: 'damage', label: 'Damage', min: 1, max: 6 },
        { kind: 'stat', id: 'wm_firerate', stat: 'fireRate', label: 'Attack Speed', min: 0.05, max: 0.3 },
        { kind: 'stat', id: 'wm_crit', stat: 'critChance', label: 'Crit Chance', min: 0.02, max: 0.08 },
        { kind: 'stat', id: 'wm_critdamage', stat: 'critDamage', label: 'Crit Damage', min: 0.15, max: 0.4 },
        { kind: 'stat', id: 'wm_aoe', stat: 'aoeRadius', label: 'Swing Radius', min: 5, max: 25 },
        { kind: 'stat', id: 'wm_thorns', stat: 'thorns', label: 'Thorns', min: 1, max: 4 },
        { kind: 'stat', id: 'wm_lifesteal', stat: 'lifesteal', label: 'Lifesteal', min: 0.01, max: 0.05 },
        { kind: 'stat', id: 'wm_fire', stat: 'fireDamage', label: 'Fire Damage', min: 2, max: 6 },
        { kind: 'stat', id: 'wm_ice', stat: 'iceDamage', label: 'Ice Damage', min: 2, max: 6 },
        { kind: 'stat', id: 'wm_lightning', stat: 'lightningDamage', label: 'Lightning Damage', min: 2, max: 6 },
        { kind: 'stat', id: 'wm_poison', stat: 'poisonDamage', label: 'Poison Damage', min: 2, max: 6 },
        { kind: 'stat', id: 'wm_arcane', stat: 'arcaneDamage', label: 'Arcane Damage', min: 2, max: 6 },
        { kind: 'stat', id: 'wm_healonkill', stat: 'healOnKill', label: 'Heal on Kill', min: 1, max: 4 },
        { kind: 'stat', id: 'wm_knockback', stat: 'knockback', label: 'Knockback', min: 20, max: 60 },
        ...PROC_AFFIXES,
    ],
    weaponRanged: [
        { kind: 'stat', id: 'wr_damage', stat: 'damage', label: 'Damage', min: 1, max: 5 },
        { kind: 'stat', id: 'wr_firerate', stat: 'fireRate', label: 'Attack Speed', min: 0.05, max: 0.3 },
        { kind: 'stat', id: 'wr_crit', stat: 'critChance', label: 'Crit Chance', min: 0.02, max: 0.08 },
        { kind: 'stat', id: 'wr_critdamage', stat: 'critDamage', label: 'Crit Damage', min: 0.15, max: 0.4 },
        { kind: 'stat', id: 'wr_projspeed', stat: 'projectileSpeed', label: 'Projectile Speed', min: 30, max: 100 },
        { kind: 'stat', id: 'wr_projcount', stat: 'projectileCount', label: 'Extra Projectiles', min: 0.15, max: 0.35 },
        { kind: 'stat', id: 'wr_pierce', stat: 'pierce', label: 'Pierce', min: 0.3, max: 0.7 },
        { kind: 'stat', id: 'wr_lifesteal', stat: 'lifesteal', label: 'Lifesteal', min: 0.01, max: 0.05 },
        { kind: 'stat', id: 'wr_splash', stat: 'splashRadius', label: 'Splash Radius', min: 15, max: 40 },
        { kind: 'stat', id: 'wr_fire', stat: 'fireDamage', label: 'Fire Damage', min: 2, max: 6 },
        { kind: 'stat', id: 'wr_ice', stat: 'iceDamage', label: 'Ice Damage', min: 2, max: 6 },
        { kind: 'stat', id: 'wr_lightning', stat: 'lightningDamage', label: 'Lightning Damage', min: 2, max: 6 },
        { kind: 'stat', id: 'wr_poison', stat: 'poisonDamage', label: 'Poison Damage', min: 2, max: 6 },
        { kind: 'stat', id: 'wr_arcane', stat: 'arcaneDamage', label: 'Arcane Damage', min: 2, max: 6 },
        ...PROC_AFFIXES,
    ],
    weaponShield: [
        { kind: 'stat', id: 'ws_armor', stat: 'armor', label: 'Armor', min: 2, max: 6 },
        { kind: 'stat', id: 'ws_hp', stat: 'maxHp', label: 'Max HP', min: 5, max: 15 },
        { kind: 'stat', id: 'ws_damagereduction', stat: 'damageReduction', label: 'Damage Reduction', min: 0.03, max: 0.08 },
        { kind: 'stat', id: 'ws_thorns', stat: 'thorns', label: 'Thorns', min: 2, max: 6 },
        { kind: 'stat', id: 'ws_dodge', stat: 'dodgeChance', label: 'Dodge Chance', min: 0.02, max: 0.05 },
        { kind: 'stat', id: 'ws_invuln', stat: 'invulnDuration', label: 'Invulnerability', min: 0.1, max: 0.3 },
        { kind: 'stat', id: 'ws_regen', stat: 'regen', label: 'HP Regen', min: 0.5, max: 2 },
        { kind: 'stat', id: 'ws_floorheal', stat: 'floorHealPct', label: 'Floor-Clear Heal', min: 0.03, max: 0.08 },
        ...PROC_AFFIXES,
    ],
    armor: [
        { kind: 'stat', id: 'a_hp', stat: 'maxHp', label: 'Max HP', min: 3, max: 12 },
        { kind: 'stat', id: 'a_armor', stat: 'armor', label: 'Armor', min: 1, max: 4 },
        { kind: 'stat', id: 'a_speed', stat: 'moveSpeed', label: 'Move Speed', min: 3, max: 10 },
        { kind: 'stat', id: 'a_magnet', stat: 'magnetRadius', label: 'Loot Radius', min: 10, max: 40 },
        { kind: 'stat', id: 'a_damagereduction', stat: 'damageReduction', label: 'Damage Reduction', min: 0.02, max: 0.06 },
        { kind: 'stat', id: 'a_dodge', stat: 'dodgeChance', label: 'Dodge Chance', min: 0.02, max: 0.06 },
        { kind: 'stat', id: 'a_thorns', stat: 'thorns', label: 'Thorns', min: 1, max: 3 },
        { kind: 'stat', id: 'a_regen', stat: 'regen', label: 'HP Regen', min: 0.5, max: 2 },
        { kind: 'stat', id: 'a_invuln', stat: 'invulnDuration', label: 'Invulnerability', min: 0.1, max: 0.3 },
        { kind: 'stat', id: 'a_floorheal', stat: 'floorHealPct', label: 'Floor-Clear Heal', min: 0.03, max: 0.08 },
        { kind: 'stat', id: 'a_revive', stat: 'reviveChance', label: 'Revive Chance', min: 0.03, max: 0.08 },
        ...PROC_AFFIXES,
    ],
    jewelry: [
        { kind: 'stat', id: 'j_damage', stat: 'damage', label: 'Damage', min: 1, max: 4 },
        { kind: 'stat', id: 'j_crit', stat: 'critChance', label: 'Crit Chance', min: 0.02, max: 0.06 },
        { kind: 'stat', id: 'j_critdamage', stat: 'critDamage', label: 'Crit Damage', min: 0.1, max: 0.3 },
        { kind: 'stat', id: 'j_hp', stat: 'maxHp', label: 'Max HP', min: 4, max: 10 },
        { kind: 'stat', id: 'j_firerate', stat: 'fireRate', label: 'Attack Speed', min: 0.03, max: 0.15 },
        { kind: 'stat', id: 'j_lifesteal', stat: 'lifesteal', label: 'Lifesteal', min: 0.01, max: 0.04 },
        { kind: 'stat', id: 'j_dodge', stat: 'dodgeChance', label: 'Dodge Chance', min: 0.02, max: 0.05 },
        { kind: 'stat', id: 'j_fire', stat: 'fireDamage', label: 'Fire Damage', min: 2, max: 5 },
        { kind: 'stat', id: 'j_ice', stat: 'iceDamage', label: 'Ice Damage', min: 2, max: 5 },
        { kind: 'stat', id: 'j_lightning', stat: 'lightningDamage', label: 'Lightning Damage', min: 2, max: 5 },
        { kind: 'stat', id: 'j_poison', stat: 'poisonDamage', label: 'Poison Damage', min: 2, max: 5 },
        { kind: 'stat', id: 'j_arcane', stat: 'arcaneDamage', label: 'Arcane Damage', min: 2, max: 5 },
        { kind: 'stat', id: 'j_healonkill', stat: 'healOnKill', label: 'Heal on Kill', min: 1, max: 4 },
        { kind: 'stat', id: 'j_luck', stat: 'luck', label: 'Luck', min: 0.1, max: 0.3 },
        { kind: 'stat', id: 'j_salvage', stat: 'salvageBonus', label: 'Salvage Bonus', min: 0.05, max: 0.15 },
        { kind: 'stat', id: 'j_revive', stat: 'reviveChance', label: 'Revive Chance', min: 0.03, max: 0.08 },
        ...PROC_AFFIXES,
        ...NODE_LEVEL_AFFIXES,
    ],
};

export function findAffixDef(affixId: string): AffixDef | undefined {
    for (const pool of Object.values(AFFIX_POOLS)) {
        const found = pool.find((a) => a.id === affixId);
        if (found) return found;
    }
    return undefined;
}
