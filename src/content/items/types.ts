/**
 * Item model. Bases are static data; ItemInstance is what drops, sits in a
 * grid, gets saved. Everything the tooltip shows is DERIVED from the instance
 * + content tables (systems/itemText.ts), so rebalancing a base or affix
 * updates every existing item.
 */
import type { StatId, StatMod } from '../stats.ts';

/** The quality ladder, worst → best. Rhunes are their own colour, not a quality. */
export type Quality = 'crude' | 'normal' | 'superior' | 'magic' | 'rare' | 'unique' | 'rhuneword';

export type ItemCategory = 'weapon' | 'offhand' | 'armor' | 'jewelry' | 'curio' | 'rhune' | 'consumable' | 'quest';

/** Where an equippable base goes. 'ring' fits either ring slot. */
export type BaseSlot = 'weapon' | 'offhand' | 'head' | 'chest' | 'hands' | 'feet' | 'waist' | 'neck' | 'ring';
export type EquipSlot = 'weapon' | 'offhand' | 'head' | 'chest' | 'hands' | 'feet' | 'waist' | 'neck' | 'ring1' | 'ring2';
export const EQUIP_SLOTS: EquipSlot[] = ['weapon', 'offhand', 'head', 'chest', 'hands', 'feet', 'waist', 'neck', 'ring1', 'ring2'];

export interface ItemBase {
    id: string;
    name: string;
    category: ItemCategory;
    slot?: BaseSlot;
    twoHanded?: boolean;
    /** Inventory footprint in cells (32px each). */
    w: number;
    h: number;
    /** Icon key(s) in the art manifest; an instance picks one by seed. */
    art: string[];
    /** Quality level: the minimum item level this base can drop at. */
    qlvl: number;
    reqLevel?: number;
    reqMight?: number;
    reqFinesse?: number;
    reqSpirit?: number;
    /** Weapons: physical damage range and attacks per second. */
    damage?: [number, number];
    speed?: number;
    /** Armor/shields: defense roll range. */
    armor?: [number, number];
    /** Shields: base block chance %. */
    block?: number;
    /** Always-on stats the base carries (a wand's spell damage, a tome's mana). */
    implicit?: StatMod[];
    maxSockets: number;
    /** Affix eligibility + seek category matching. */
    tags: string[];
    /** Relative drop weight among bases of the same category. */
    weight: number;
    /** Base gold value. */
    price: number;
    /** Normal/white versions never drop (jewelry, curios). */
    alwaysMagic?: boolean;
    /** Stacks / consumable behaviour key (potions, scrolls). */
    use?: 'heal' | 'mana' | 'rejuv' | 'identify' | 'portal';
    flavor?: string;
}

/** One stat line an affix tier / unique / rhune rolls. value in [min,max]; value2 in [min2,max2]. */
export interface StatRoll {
    stat: StatId;
    min: number;
    max: number;
    min2?: number;
    max2?: number;
}

export interface AffixTier {
    /** Display name: "Vicious", "of the Bear". */
    name: string;
    /** Affix level: minimum item level for this tier to roll. */
    alvl: number;
    rolls: StatRoll[];
    /** Optional cap: tier stops rolling above this ilvl (keeps low tiers from flooding late drops). */
    maxIlvl?: number;
}

export interface AffixDef {
    id: string;
    kind: 'prefix' | 'suffix';
    /** Two affixes of the same group can never roll together. */
    group: string;
    /** Base must carry at least one of these tags. */
    tags: string[];
    /** Base carrying any of these tags is excluded. */
    excludeTags?: string[];
    weight: number;
    tiers: AffixTier[];
}

export interface UniqueDef {
    id: string;
    name: string;
    baseId: string;
    /** Item level needed to roll it (>= base qlvl). */
    qlvl: number;
    reqLevel: number;
    rolls: StatRoll[];
    /** Relative weight among uniques sharing a base. */
    weight: number;
    flavor?: string;
}

/** A rolled affix on an instance. */
export interface RolledAffix {
    affixId: string;
    tier: number;
    /** One entry per StatRoll in the tier; [value, value2?]. */
    values: number[][];
}

export interface ItemInstance {
    uid: string;
    baseId: string;
    quality: Quality;
    ilvl: number;
    /** Drives cosmetic picks: icon variant, rare name. */
    seed: number;
    identified: boolean;
    affixes: RolledAffix[];
    /** Unique id when quality === 'unique'. */
    uniqueId?: string;
    /** Rolled values for the unique's StatRolls. */
    uniqueValues?: number[][];
    /** Rhuneword id when quality === 'rhuneword'. */
    rhunewordId?: string;
    /** Rolled base numbers: [min,max] damage or [defense]. */
    baseRoll: number[];
    sockets: number;
    socketed: ItemInstance[];
    /** Stack size for consumables. */
    qty?: number;
    /** Grid position when stored in a grid container. */
    x?: number;
    y?: number;
    /** Rare name pair indices. */
    rareName?: [number, number];
}
