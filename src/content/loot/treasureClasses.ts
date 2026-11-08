/**
 * Treasure Classes — D2's drop model, simplified. A source (monster, chest,
 * the wishing well...) names a TC; the TC makes `picks` weighted picks from
 * its entries, where "noDrop" is a competing weight for nothing at all.
 *
 *  - Item Quantity shrinks noDrop  (more stuff)
 *  - <Kind> Find multiplies the weight of matching entries (more of THAT stuff)
 *  - Rarity Find improves the quality roll of each item (better stuff)
 *
 * Equipment entries pick a base by item level at roll time, so one TC works
 * for every monster level.
 */
export type TcPick =
    | { kind: 'equip'; category: 'weapon' | 'armor' | 'jewelry' | 'curio' }
    | { kind: 'rhune' }
    | { kind: 'gold'; mult?: number }
    | { kind: 'potion' }
    | { kind: 'scroll' }
    | { kind: 'tc'; id: string }
    | { kind: 'base'; id: string };

export interface QualityBonus {
    unique?: number;
    rare?: number;
    magic?: number;
}

export interface TreasureClass {
    id: string;
    name: string;
    picks: number;
    noDrop: number;
    entries: { pick: TcPick; weight: number }[];
    quality?: QualityBonus;
}

const STANDARD: TreasureClass['entries'] = [
    { pick: { kind: 'gold' }, weight: 35 },
    { pick: { kind: 'potion' }, weight: 20 },
    { pick: { kind: 'scroll' }, weight: 3 },
    { pick: { kind: 'equip', category: 'weapon' }, weight: 9 },
    { pick: { kind: 'equip', category: 'armor' }, weight: 12 },
    { pick: { kind: 'equip', category: 'jewelry' }, weight: 2 },
    { pick: { kind: 'equip', category: 'curio' }, weight: 1.2 },
    { pick: { kind: 'rhune' }, weight: 1.4 },
];

const GEAR_HEAVY: TreasureClass['entries'] = [
    { pick: { kind: 'gold', mult: 2 }, weight: 20 },
    { pick: { kind: 'potion' }, weight: 8 },
    { pick: { kind: 'equip', category: 'weapon' }, weight: 18 },
    { pick: { kind: 'equip', category: 'armor' }, weight: 24 },
    { pick: { kind: 'equip', category: 'jewelry' }, weight: 6 },
    { pick: { kind: 'equip', category: 'curio' }, weight: 3 },
    { pick: { kind: 'rhune' }, weight: 4 },
];

export const TREASURE_CLASSES: TreasureClass[] = [
    { id: 'mob', name: 'Monster', picks: 1, noDrop: 100, entries: STANDARD },
    { id: 'champion', name: 'Champion', picks: 2, noDrop: 40, entries: STANDARD, quality: { magic: 1.5, rare: 1.3, unique: 1.2 } },
    { id: 'elite', name: 'Unique Monster', picks: 4, noDrop: 20, entries: GEAR_HEAVY, quality: { magic: 2, rare: 1.8, unique: 1.6 } },
    { id: 'boss', name: 'Boss', picks: 6, noDrop: 0, entries: GEAR_HEAVY, quality: { magic: 3, rare: 2.5, unique: 2.5 } },
    {
        // The Coin-Gobbler: a loot goblin homage. Runs. Screams. Explodes into treasure.
        id: 'gobbler', name: 'Coin-Gobbler', picks: 8, noDrop: 0,
        entries: [{ pick: { kind: 'gold', mult: 4 }, weight: 40 }, ...GEAR_HEAVY.filter((e) => e.pick.kind !== 'gold')],
        quality: { magic: 2, rare: 2, unique: 2 },
    },
    {
        id: 'well', name: 'Wishing Well', picks: 1, noDrop: 0,
        entries: [
            { pick: { kind: 'equip', category: 'weapon' }, weight: 24 },
            { pick: { kind: 'equip', category: 'armor' }, weight: 30 },
            { pick: { kind: 'equip', category: 'jewelry' }, weight: 9 },
            { pick: { kind: 'equip', category: 'curio' }, weight: 5 },
            { pick: { kind: 'rhune' }, weight: 5 },
            { pick: { kind: 'potion' }, weight: 10 },
            { pick: { kind: 'gold', mult: 0.5 }, weight: 10 },
        ],
        quality: { magic: 1.6, rare: 1.2, unique: 1.2 },
    },
];

const TC_BY_ID = new Map(TREASURE_CLASSES.map((t) => [t.id, t]));
export function getTc(id: string): TreasureClass {
    const tc = TC_BY_ID.get(id);
    if (!tc) throw new Error(`unknown treasure class ${id}`);
    return tc;
}

// ------------------------------------------------------------- quality tuning
/**
 * Base odds an equipment drop rolls each quality (before Rarity Find), checked
 * best-first like D2: unique → rare → magic → superior → normal → crude.
 * Rarity Find has diminishing returns on unique and rare (the D2 curve):
 *     effective = RF * k / (RF + k)
 */
export const QUALITY_TUNING = {
    unique: { base: 1 / 320, perLevelOver: 0.02, dimK: 250 },
    rare: { base: 1 / 22, perLevelOver: 0.01, dimK: 600 },
    magic: { base: 1 / 4.5, perLevelOver: 0.0, dimK: 0 },
    superior: 1 / 10,
    crude: { chance: 1 / 8, belowIlvl: 12 },
};
