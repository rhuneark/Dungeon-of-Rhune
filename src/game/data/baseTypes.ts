import type { BaseTypeDef } from './types.ts';

/**
 * hand1/hand2 are fully generic — any of these "hand" base types fits
 * either slot, so dual-hammer, hammer+wand, dual-shield, etc. are all
 * valid. A few hand types carry a default element for out-of-the-box
 * elemental flavor even before any Rhunes get involved.
 */
export const BASE_TYPES: BaseTypeDef[] = [
    // --- hand: melee ---
    {
        id: 'hammer',
        name: 'Hammer',
        kind: 'hand',
        role: 'melee',
        baseStats: { damage: 9, fireRate: 0.9, aoeRadius: 70 },
        affixPoolId: 'weaponMelee',
        color: 0xd97706,
    },
    {
        id: 'dagger',
        name: 'Dagger',
        kind: 'hand',
        role: 'melee',
        baseStats: { damage: 4, fireRate: 2.2, aoeRadius: 40, critChance: 0.1 },
        affixPoolId: 'weaponMelee',
        color: 0x94a3b8,
    },
    {
        id: 'axe',
        name: 'Axe',
        kind: 'hand',
        role: 'melee',
        baseStats: { damage: 12, fireRate: 0.7, aoeRadius: 55 },
        affixPoolId: 'weaponMelee',
        color: 0xb91c1c,
    },
    {
        id: 'frostbrand',
        name: 'Frostbrand',
        kind: 'hand',
        role: 'melee',
        element: 'ice',
        baseStats: { damage: 5, fireRate: 1.8, aoeRadius: 45 },
        affixPoolId: 'weaponMelee',
        color: 0x67e8f9,
    },

    // --- hand: ranged ---
    {
        id: 'wand',
        name: 'Wand',
        kind: 'hand',
        role: 'ranged',
        element: 'arcane',
        baseStats: { damage: 5, fireRate: 1.4, projectileSpeed: 620 },
        affixPoolId: 'weaponRanged',
        color: 0x818cf8,
    },
    {
        id: 'bow',
        name: 'Bow',
        kind: 'hand',
        role: 'ranged',
        baseStats: { damage: 7, fireRate: 1.1, projectileSpeed: 780 },
        affixPoolId: 'weaponRanged',
        color: 0x92400e,
    },
    {
        id: 'staff',
        name: 'Staff',
        kind: 'hand',
        role: 'ranged',
        element: 'fire',
        baseStats: { damage: 10, fireRate: 0.8, projectileSpeed: 520 },
        affixPoolId: 'weaponRanged',
        color: 0xf97316,
    },
    {
        id: 'orb',
        name: 'Orb',
        kind: 'hand',
        role: 'ranged',
        element: 'lightning',
        baseStats: { damage: 4, fireRate: 1.9, projectileSpeed: 900 },
        affixPoolId: 'weaponRanged',
        color: 0xfacc15,
    },

    // --- hand: shield ---
    {
        id: 'shield',
        name: 'Shield',
        kind: 'hand',
        role: 'shield',
        baseStats: { armor: 4, maxHp: 15 },
        affixPoolId: 'weaponShield',
        color: 0x64748b,
    },

    // --- head ---
    { id: 'helm', name: 'Helm', kind: 'head', baseStats: { armor: 2, maxHp: 8 }, affixPoolId: 'armor', color: 0xb45309 },
    { id: 'cap', name: 'Cap', kind: 'head', baseStats: { moveSpeed: 8, maxHp: 4 }, affixPoolId: 'armor', color: 0x7c3aed },
    { id: 'circlet', name: 'Circlet', kind: 'head', baseStats: { critChance: 0.03, maxHp: 4 }, affixPoolId: 'armor', color: 0xeab308 },
    { id: 'warhood', name: 'Warhood', kind: 'head', baseStats: { armor: 3, thorns: 1 }, affixPoolId: 'armor', color: 0x991b1b },

    // --- torso ---
    { id: 'plate', name: 'Plate', kind: 'torso', baseStats: { armor: 4, maxHp: 12 }, affixPoolId: 'armor', color: 0x71717a },
    { id: 'tunic', name: 'Tunic', kind: 'torso', baseStats: { moveSpeed: 6, maxHp: 8 }, affixPoolId: 'armor', color: 0x059669 },
    { id: 'robe', name: 'Robe', kind: 'torso', baseStats: { fireRate: 0.06, maxHp: 6 }, affixPoolId: 'armor', color: 0x7e22ce },
    { id: 'carapace', name: 'Carapace', kind: 'torso', baseStats: { armor: 3, damageReduction: 0.04 }, affixPoolId: 'armor', color: 0x365314 },

    // --- legs ---
    { id: 'greaves', name: 'Greaves', kind: 'legs', baseStats: { armor: 3, maxHp: 8 }, affixPoolId: 'armor', color: 0x52525b },
    { id: 'trousers', name: 'Trousers', kind: 'legs', baseStats: { moveSpeed: 10, maxHp: 4 }, affixPoolId: 'armor', color: 0x92400e },
    { id: 'legwraps', name: 'Legwraps', kind: 'legs', baseStats: { moveSpeed: 8, dodgeChance: 0.03 }, affixPoolId: 'armor', color: 0x0e7490 },

    // --- feet ---
    { id: 'boots', name: 'Boots', kind: 'feet', baseStats: { moveSpeed: 14 }, affixPoolId: 'armor', color: 0x854d0e },
    { id: 'sandals', name: 'Sandals', kind: 'feet', baseStats: { moveSpeed: 9, critChance: 0.02 }, affixPoolId: 'armor', color: 0xca8a04 },
    { id: 'treads', name: 'Treads', kind: 'feet', baseStats: { armor: 2, moveSpeed: 4 }, affixPoolId: 'armor', color: 0x475569 },
    { id: 'cleats', name: 'Cleats', kind: 'feet', baseStats: { moveSpeed: 12, critChance: 0.02 }, affixPoolId: 'armor', color: 0x15803d },

    // --- jewelry (fits jewelry1 or jewelry2) ---
    { id: 'ring', name: 'Ring', kind: 'jewelry', baseStats: { critChance: 0.04 }, affixPoolId: 'jewelry', color: 0xf59e0b },
    { id: 'amulet', name: 'Amulet', kind: 'jewelry', baseStats: { maxHp: 10 }, affixPoolId: 'jewelry', color: 0x0ea5e9 },
    { id: 'charm', name: 'Charm', kind: 'jewelry', baseStats: { fireDamage: 3, iceDamage: 3 }, affixPoolId: 'jewelry', color: 0xdb2777 },
    { id: 'talisman', name: 'Talisman', kind: 'jewelry', baseStats: { lifesteal: 0.02, maxHp: 6 }, affixPoolId: 'jewelry', color: 0x4338ca },
];

export function getBaseType(id: string): BaseTypeDef {
    const bt = BASE_TYPES.find((b) => b.id === id);
    if (!bt) throw new Error(`Unknown base type: ${id}`);
    return bt;
}

export function baseTypesForSlotKind(kind: BaseTypeDef['kind']): BaseTypeDef[] {
    return BASE_TYPES.filter((b) => b.kind === kind);
}
