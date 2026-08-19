/**
 * Core data model for Dungeon of Rhune's item/progression systems.
 * Base-type + affix-pool architecture: an ItemInstance references a
 * BaseTypeDef by id and carries its own rolled affix values, so two
 * instances of the same base type are never identical.
 */

export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export const RARITY_ORDER: Rarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary'];

/** The 8 gear slots + 2 jewelry + 3 Rhune sockets = 13 equip slots total. */
export type GearSlot =
    | 'head'
    | 'torso'
    | 'legs'
    | 'feet'
    | 'hand1'
    | 'hand2'
    | 'jewelry1'
    | 'jewelry2';

export const GEAR_SLOTS: GearSlot[] = [
    'head',
    'torso',
    'legs',
    'feet',
    'hand1',
    'hand2',
    'jewelry1',
    'jewelry2',
];

/** hand1/hand2 are fully generic: any hand-item base type fits either. */
export function slotAcceptsKind(slot: GearSlot, kind: ItemKind): boolean {
    if (slot === 'hand1' || slot === 'hand2') return kind === 'hand';
    if (slot === 'jewelry1' || slot === 'jewelry2') return kind === 'jewelry';
    return kind === slot;
}

export type ItemKind = 'head' | 'torso' | 'legs' | 'feet' | 'hand' | 'jewelry';

/** How a hand item behaves in combat. Armor/jewelry base types have no role. */
export type WeaponRole = 'melee' | 'ranged' | 'shield';

export interface StatBlock {
    damage?: number;
    fireRate?: number; // attacks per second
    aoeRadius?: number; // design units, melee swing / projectile splash
    projectileSpeed?: number; // design units/sec, ranged only
    maxHp?: number;
    moveSpeed?: number; // design units/sec
    armor?: number; // flat damage reduction per hit
    critChance?: number; // 0..1
    lifesteal?: number; // 0..1 fraction of damage dealt healed
    magnetRadius?: number; // design units, loot pickup radius
}

export const STAT_LABELS: Record<keyof StatBlock, string> = {
    damage: 'Damage',
    fireRate: 'Attack Speed',
    aoeRadius: 'Swing/Blast Radius',
    projectileSpeed: 'Projectile Speed',
    maxHp: 'Max HP',
    moveSpeed: 'Move Speed',
    armor: 'Armor',
    critChance: 'Crit Chance',
    lifesteal: 'Lifesteal',
    magnetRadius: 'Loot Radius',
};

export interface BaseTypeDef {
    id: string;
    name: string;
    kind: ItemKind;
    role?: WeaponRole; // set only for kind === 'hand'
    /** Base stat contribution before affixes, at rarity="common". */
    baseStats: StatBlock;
    /** id into AFFIX_POOLS — which affixes this base type can roll. */
    affixPoolId: string;
    /** Pixi Graphics draw color for the placeholder icon/world sprite. */
    color: number;
}

export interface AffixDef {
    id: string;
    stat: keyof StatBlock;
    label: string;
    min: number;
    max: number;
    isPercent?: boolean;
}

export interface RolledAffix {
    affixId: string;
    value: number;
}

export interface ItemInstance {
    instanceId: string;
    baseTypeId: string;
    rarity: Rarity;
    affixes: RolledAffix[];
    /** Tier the item dropped in — flavors salvage value. */
    tierDropped?: number;
}

export interface RhuneDef {
    id: string;
    name: string;
    description: string;
    /** Magnitude at common rarity; scales with RARITY_RHUNE_MULT. */
    stat: keyof StatBlock;
    baseValue: number;
    isPercent?: boolean;
}

export interface RhuneInstance {
    instanceId: string;
    rhuneDefId: string;
    rarity: Rarity;
}

export interface TierDef {
    id: number;
    name: string;
    tagline: string;
    /** Multiplies enemy hp + damage. */
    enemyStatMult: number;
    /** Floors that must be cleared in this tier to unlock the next one. */
    unlockAtFloor: number;
    /** Weighted rarity table for loot drops in this tier. */
    lootWeights: Record<Rarity, number>;
    color: number;
}

export interface EnemyDef {
    id: string;
    name: string;
    hp: number;
    damage: number;
    speed: number;
    radius: number;
    color: number;
}

export interface SaveData {
    version: 1;
    currency: number;
    items: ItemInstance[];
    rhunes: RhuneInstance[];
    equipped: Record<GearSlot, string | null>;
    equippedRhunes: [string | null, string | null, string | null];
    selectedTier: number;
    unlockedTiers: number[];
    bestFloorByTier: Record<number, number>;
    stats: {
        lifetimeKills: number;
    };
}

export function emptyEquipped(): Record<GearSlot, string | null> {
    return {
        head: null,
        torso: null,
        legs: null,
        feet: null,
        hand1: null,
        hand2: null,
        jewelry1: null,
        jewelry2: null,
    };
}

export function defaultSaveData(): SaveData {
    return {
        version: 1,
        currency: 0,
        items: [],
        rhunes: [],
        equipped: emptyEquipped(),
        equippedRhunes: [null, null, null],
        selectedTier: 1,
        unlockedTiers: [1],
        bestFloorByTier: {},
        stats: { lifetimeKills: 0 },
    };
}
