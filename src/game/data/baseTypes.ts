import type { BaseTypeDef } from './types.ts';

/**
 * hand1/hand2 are fully generic — any of these 4 "hand" base types fits
 * either slot, so dual-hammer, hammer+wand, dual-shield etc. are all valid.
 * Armor slots get 2-3 base types each per the first-playable scope.
 */
export const BASE_TYPES: BaseTypeDef[] = [
    // --- hand (weapon slots) ---
    {
        id: 'hammer',
        name: 'Hammer',
        kind: 'hand',
        role: 'melee',
        baseStats: { damage: 9, fireRate: 0.9, aoeRadius: 70 },
        affixPoolId: 'weapon',
        color: 0xd97706,
    },
    {
        id: 'dagger',
        name: 'Dagger',
        kind: 'hand',
        role: 'melee',
        baseStats: { damage: 4, fireRate: 2.2, aoeRadius: 40, critChance: 0.1 },
        affixPoolId: 'weapon',
        color: 0x94a3b8,
    },
    {
        id: 'wand',
        name: 'Wand',
        kind: 'hand',
        role: 'ranged',
        baseStats: { damage: 5, fireRate: 1.4, projectileSpeed: 620 },
        affixPoolId: 'weapon',
        color: 0x818cf8,
    },
    {
        id: 'shield',
        name: 'Shield',
        kind: 'hand',
        role: 'shield',
        baseStats: { armor: 4, maxHp: 15 },
        affixPoolId: 'weapon',
        color: 0x64748b,
    },

    // --- head ---
    { id: 'helm', name: 'Helm', kind: 'head', baseStats: { armor: 2, maxHp: 8 }, affixPoolId: 'armor', color: 0xb45309 },
    { id: 'cap', name: 'Cap', kind: 'head', baseStats: { moveSpeed: 8, maxHp: 4 }, affixPoolId: 'armor', color: 0x7c3aed },
    { id: 'circlet', name: 'Circlet', kind: 'head', baseStats: { critChance: 0.03, maxHp: 4 }, affixPoolId: 'armor', color: 0xeab308 },

    // --- torso ---
    { id: 'plate', name: 'Plate', kind: 'torso', baseStats: { armor: 4, maxHp: 12 }, affixPoolId: 'armor', color: 0x71717a },
    { id: 'tunic', name: 'Tunic', kind: 'torso', baseStats: { moveSpeed: 6, maxHp: 8 }, affixPoolId: 'armor', color: 0x059669 },
    { id: 'robe', name: 'Robe', kind: 'torso', baseStats: { fireRate: 0.06, maxHp: 6 }, affixPoolId: 'armor', color: 0x7e22ce },

    // --- legs ---
    { id: 'greaves', name: 'Greaves', kind: 'legs', baseStats: { armor: 3, maxHp: 8 }, affixPoolId: 'armor', color: 0x52525b },
    { id: 'trousers', name: 'Trousers', kind: 'legs', baseStats: { moveSpeed: 10, maxHp: 4 }, affixPoolId: 'armor', color: 0x92400e },

    // --- feet ---
    { id: 'boots', name: 'Boots', kind: 'feet', baseStats: { moveSpeed: 14 }, affixPoolId: 'armor', color: 0x854d0e },
    { id: 'sandals', name: 'Sandals', kind: 'feet', baseStats: { moveSpeed: 9, critChance: 0.02 }, affixPoolId: 'armor', color: 0xca8a04 },
    { id: 'treads', name: 'Treads', kind: 'feet', baseStats: { armor: 2, moveSpeed: 4 }, affixPoolId: 'armor', color: 0x475569 },

    // --- jewelry (fits jewelry1 or jewelry2) ---
    { id: 'ring', name: 'Ring', kind: 'jewelry', baseStats: { critChance: 0.04 }, affixPoolId: 'jewelry', color: 0xf59e0b },
    { id: 'amulet', name: 'Amulet', kind: 'jewelry', baseStats: { maxHp: 10 }, affixPoolId: 'jewelry', color: 0x0ea5e9 },
];

export function getBaseType(id: string): BaseTypeDef {
    const bt = BASE_TYPES.find((b) => b.id === id);
    if (!bt) throw new Error(`Unknown base type: ${id}`);
    return bt;
}

export function baseTypesForSlotKind(kind: BaseTypeDef['kind']): BaseTypeDef[] {
    return BASE_TYPES.filter((b) => b.kind === kind);
}
