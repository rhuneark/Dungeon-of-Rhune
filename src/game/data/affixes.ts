import type { AffixDef } from './types.ts';

/**
 * Affix pools keyed by BaseTypeDef.affixPoolId. Same base name -> same
 * pool -> same possible rolls, but each ItemInstance rolls its own subset
 * and its own values within each affix's [min, max] range. Split by weapon
 * role so a melee item can't roll ranged-only affixes (projectile count on
 * a hammer would just do nothing) and vice versa.
 */
export const AFFIX_POOLS: Record<string, AffixDef[]> = {
    weaponMelee: [
        { id: 'wm_damage', stat: 'damage', label: 'Damage', min: 1, max: 6 },
        { id: 'wm_firerate', stat: 'fireRate', label: 'Attack Speed', min: 0.05, max: 0.3 },
        { id: 'wm_crit', stat: 'critChance', label: 'Crit Chance', min: 0.02, max: 0.08 },
        { id: 'wm_critdamage', stat: 'critDamage', label: 'Crit Damage', min: 0.15, max: 0.4 },
        { id: 'wm_aoe', stat: 'aoeRadius', label: 'Swing Radius', min: 5, max: 25 },
        { id: 'wm_thorns', stat: 'thorns', label: 'Thorns', min: 1, max: 4 },
        { id: 'wm_lifesteal', stat: 'lifesteal', label: 'Lifesteal', min: 0.01, max: 0.05 },
        { id: 'wm_fire', stat: 'fireDamage', label: 'Fire Damage', min: 2, max: 6 },
        { id: 'wm_ice', stat: 'iceDamage', label: 'Ice Damage', min: 2, max: 6 },
        { id: 'wm_lightning', stat: 'lightningDamage', label: 'Lightning Damage', min: 2, max: 6 },
        { id: 'wm_poison', stat: 'poisonDamage', label: 'Poison Damage', min: 2, max: 6 },
    ],
    weaponRanged: [
        { id: 'wr_damage', stat: 'damage', label: 'Damage', min: 1, max: 5 },
        { id: 'wr_firerate', stat: 'fireRate', label: 'Attack Speed', min: 0.05, max: 0.3 },
        { id: 'wr_crit', stat: 'critChance', label: 'Crit Chance', min: 0.02, max: 0.08 },
        { id: 'wr_critdamage', stat: 'critDamage', label: 'Crit Damage', min: 0.15, max: 0.4 },
        { id: 'wr_projspeed', stat: 'projectileSpeed', label: 'Projectile Speed', min: 30, max: 100 },
        { id: 'wr_projcount', stat: 'projectileCount', label: 'Extra Projectiles', min: 0.15, max: 0.35 },
        { id: 'wr_pierce', stat: 'pierce', label: 'Pierce', min: 0.3, max: 0.7 },
        { id: 'wr_lifesteal', stat: 'lifesteal', label: 'Lifesteal', min: 0.01, max: 0.05 },
        { id: 'wr_fire', stat: 'fireDamage', label: 'Fire Damage', min: 2, max: 6 },
        { id: 'wr_ice', stat: 'iceDamage', label: 'Ice Damage', min: 2, max: 6 },
        { id: 'wr_lightning', stat: 'lightningDamage', label: 'Lightning Damage', min: 2, max: 6 },
        { id: 'wr_poison', stat: 'poisonDamage', label: 'Poison Damage', min: 2, max: 6 },
    ],
    weaponShield: [
        { id: 'ws_armor', stat: 'armor', label: 'Armor', min: 2, max: 6 },
        { id: 'ws_hp', stat: 'maxHp', label: 'Max HP', min: 5, max: 15 },
        { id: 'ws_damagereduction', stat: 'damageReduction', label: 'Damage Reduction', min: 0.03, max: 0.08 },
        { id: 'ws_thorns', stat: 'thorns', label: 'Thorns', min: 2, max: 6 },
        { id: 'ws_dodge', stat: 'dodgeChance', label: 'Dodge Chance', min: 0.02, max: 0.05 },
    ],
    armor: [
        { id: 'a_hp', stat: 'maxHp', label: 'Max HP', min: 3, max: 12 },
        { id: 'a_armor', stat: 'armor', label: 'Armor', min: 1, max: 4 },
        { id: 'a_speed', stat: 'moveSpeed', label: 'Move Speed', min: 3, max: 10 },
        { id: 'a_magnet', stat: 'magnetRadius', label: 'Loot Radius', min: 10, max: 40 },
        { id: 'a_damagereduction', stat: 'damageReduction', label: 'Damage Reduction', min: 0.02, max: 0.06 },
        { id: 'a_dodge', stat: 'dodgeChance', label: 'Dodge Chance', min: 0.02, max: 0.06 },
        { id: 'a_thorns', stat: 'thorns', label: 'Thorns', min: 1, max: 3 },
    ],
    jewelry: [
        { id: 'j_damage', stat: 'damage', label: 'Damage', min: 1, max: 4 },
        { id: 'j_crit', stat: 'critChance', label: 'Crit Chance', min: 0.02, max: 0.06 },
        { id: 'j_critdamage', stat: 'critDamage', label: 'Crit Damage', min: 0.1, max: 0.3 },
        { id: 'j_hp', stat: 'maxHp', label: 'Max HP', min: 4, max: 10 },
        { id: 'j_firerate', stat: 'fireRate', label: 'Attack Speed', min: 0.03, max: 0.15 },
        { id: 'j_lifesteal', stat: 'lifesteal', label: 'Lifesteal', min: 0.01, max: 0.04 },
        { id: 'j_dodge', stat: 'dodgeChance', label: 'Dodge Chance', min: 0.02, max: 0.05 },
        { id: 'j_fire', stat: 'fireDamage', label: 'Fire Damage', min: 2, max: 5 },
        { id: 'j_ice', stat: 'iceDamage', label: 'Ice Damage', min: 2, max: 5 },
        { id: 'j_lightning', stat: 'lightningDamage', label: 'Lightning Damage', min: 2, max: 5 },
        { id: 'j_poison', stat: 'poisonDamage', label: 'Poison Damage', min: 2, max: 5 },
    ],
};
