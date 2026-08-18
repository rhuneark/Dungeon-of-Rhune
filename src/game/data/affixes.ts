import type { AffixDef } from './types.ts';

/**
 * Affix pools keyed by BaseTypeDef.affixPoolId. Same base name -> same
 * pool -> same possible rolls, but each ItemInstance rolls its own subset
 * and its own values within each affix's [min, max] range.
 */
export const AFFIX_POOLS: Record<string, AffixDef[]> = {
    weapon: [
        { id: 'w_damage', stat: 'damage', label: 'Damage', min: 1, max: 6 },
        { id: 'w_firerate', stat: 'fireRate', label: 'Attack Speed', min: 0.05, max: 0.3 },
        { id: 'w_crit', stat: 'critChance', label: 'Crit Chance', min: 0.02, max: 0.08 },
        { id: 'w_lifesteal', stat: 'lifesteal', label: 'Lifesteal', min: 0.01, max: 0.05 },
        { id: 'w_aoe', stat: 'aoeRadius', label: 'Blast Radius', min: 5, max: 25 },
    ],
    armor: [
        { id: 'a_hp', stat: 'maxHp', label: 'Max HP', min: 3, max: 12 },
        { id: 'a_armor', stat: 'armor', label: 'Armor', min: 1, max: 4 },
        { id: 'a_speed', stat: 'moveSpeed', label: 'Move Speed', min: 3, max: 10 },
        { id: 'a_magnet', stat: 'magnetRadius', label: 'Loot Radius', min: 10, max: 40 },
    ],
    jewelry: [
        { id: 'j_damage', stat: 'damage', label: 'Damage', min: 1, max: 4 },
        { id: 'j_crit', stat: 'critChance', label: 'Crit Chance', min: 0.02, max: 0.06 },
        { id: 'j_hp', stat: 'maxHp', label: 'Max HP', min: 4, max: 10 },
        { id: 'j_firerate', stat: 'fireRate', label: 'Attack Speed', min: 0.03, max: 0.15 },
        { id: 'j_lifesteal', stat: 'lifesteal', label: 'Lifesteal', min: 0.01, max: 0.04 },
    ],
};
