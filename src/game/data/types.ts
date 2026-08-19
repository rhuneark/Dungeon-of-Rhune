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

/** Damage flavor. A hit's total damage is computed per-element, so elemental
 * amplifiers (Rhunes) can scale each component independently. */
export type Element = 'physical' | 'fire' | 'ice' | 'lightning' | 'poison' | 'arcane';

export const ELEMENTS: Element[] = ['physical', 'fire', 'ice', 'lightning', 'poison', 'arcane'];

export const ELEMENT_COLOR: Record<Element, number> = {
    physical: 0xe5e7eb,
    fire: 0xf97316,
    ice: 0x67e8f9,
    lightning: 0xfacc15,
    poison: 0x4ade80,
    arcane: 0xc084fc,
};

/** A status effect Rhunes can apply to enemies (on-hit procs, trails, auras). */
export type StatusType = 'slow' | 'burn' | 'poison' | 'shock' | 'stun';

export interface StatBlock {
    damage?: number;
    fireRate?: number; // attacks per second
    aoeRadius?: number; // design units, melee swing / projectile splash
    projectileSpeed?: number; // design units/sec, ranged only
    maxHp?: number;
    moveSpeed?: number; // design units/sec
    armor?: number; // flat damage reduction per hit
    critChance?: number; // 0..1
    critDamage?: number; // bonus added to the base 1.8x crit multiplier
    lifesteal?: number; // 0..1 fraction of damage dealt healed
    magnetRadius?: number; // design units, loot pickup radius
    projectileCount?: number; // extra projectiles per ranged shot
    pierce?: number; // extra enemies a projectile can pass through
    thorns?: number; // flat damage reflected to enemies that hit you
    dodgeChance?: number; // 0..1 chance to negate contact damage entirely
    damageReduction?: number; // 0..1 percent mitigation, stacks with armor
    fireDamage?: number; // flat bonus damage, dealt as its own 'fire' component
    iceDamage?: number; // flat bonus damage, dealt as its own 'ice' component
    lightningDamage?: number; // flat bonus damage, dealt as its own 'lightning' component
    poisonDamage?: number; // flat bonus damage, dealt as its own 'poison' component
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
    critDamage: 'Crit Damage',
    lifesteal: 'Lifesteal',
    magnetRadius: 'Loot Radius',
    projectileCount: 'Extra Projectiles',
    pierce: 'Pierce',
    thorns: 'Thorns',
    dodgeChance: 'Dodge Chance',
    damageReduction: 'Damage Reduction',
    fireDamage: 'Fire Damage',
    iceDamage: 'Ice Damage',
    lightningDamage: 'Lightning Damage',
    poisonDamage: 'Poison Damage',
};

export interface BaseTypeDef {
    id: string;
    name: string;
    kind: ItemKind;
    role?: WeaponRole; // set only for kind === 'hand'
    /** Damage element for kind==='hand' base stat damage. Defaults to 'physical'. */
    element?: Element;
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

/**
 * Rhune effects — the "extra 10 layers of chaos" on top of gear stats. Most
 * numeric fields here are BASE magnitudes at common rarity; rhuneRuntime.ts
 * scales them by the instance's rarity (RARITIES[rarity].valueMult) and
 * clamps proc chances, so a legendary Rhune of the same effect hits harder
 * / procs more often than a common one without needing separate defs.
 */
export type RhuneEffect =
    /** Plain flat/percent bonus to a StatBlock field — folded into aggregateStats like an affix. */
    | { kind: 'statMod'; stat: keyof StatBlock; baseValue: number }
    /** Chance on a weapon hit (optionally crit-only) to apply a status effect to the enemy hit. */
    | { kind: 'onHitStatus'; chance: number; status: StatusType; magnitude: number; duration: number; critOnly?: boolean }
    /** Triggers when an enemy dies. */
    | { kind: 'onKill'; chance: number; result: 'explosion' | 'currency' | 'heal'; magnitude: number }
    /** While moving, periodically drops a hazard zone that applies a status to enemies standing in it. */
    | { kind: 'moveTrail'; element: Element; status: StatusType; magnitude: number; radius: number; hazardLifetime: number; tickInterval: number }
    /** Multiplies all damage dealt of one element. */
    | { kind: 'elementAmp'; element: Element; mult: number }
    /** Continuous radius effect around the player: refreshes a short-lived status on any enemy inside every tick (so the status decays naturally once an enemy leaves range). */
    | { kind: 'aura'; radius: number; status: StatusType; magnitude: number; tickInterval: number; duration: number };

export interface RhuneDef {
    id: string;
    name: string;
    description: string;
    effect: RhuneEffect;
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
