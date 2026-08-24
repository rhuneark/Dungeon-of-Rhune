import type { GearSlot, ItemInstance, RhuneInstance, SaveData, StatBlock, WeaponRole, Element } from '../data/types.ts';
import { slotAcceptsKind } from '../data/types.ts';
import { getBaseType } from '../data/baseTypes.ts';
import { findAffixDef } from '../data/affixes.ts';
import { RARITIES } from '../data/rarity.ts';
import { resolveEquippedRhunes, statModContribution, type ResolvedRhune } from './rhuneRuntime.ts';
import { resolveItemProcAffixes, type ResolvedProcAffix } from './procAffixRuntime.ts';
import { isNodeOwned, resolveSkillTree, type SkillTreeRuntime } from './skillTree.ts';

/** Base combat stats before any gear/rhunes are applied. */
export const BASE_PLAYER_STATS: Required<StatBlock> = {
    damage: 0,
    fireRate: 0,
    aoeRadius: 0,
    projectileSpeed: 0,
    maxHp: 40,
    moveSpeed: 220,
    armor: 0,
    critChance: 0.05,
    critDamage: 0,
    lifesteal: 0,
    magnetRadius: 50,
    projectileCount: 0,
    pierce: 0,
    thorns: 0,
    dodgeChance: 0,
    damageReduction: 0,
    fireDamage: 0,
    iceDamage: 0,
    lightningDamage: 0,
    poisonDamage: 0,
    arcaneDamage: 0,
    healOnKill: 0,
    reviveChance: 0,
    luck: 0,
    salvageBonus: 0,
    floorHealPct: 0,
    invulnDuration: 0,
    knockback: 0,
    regen: 0,
    splashRadius: 0,
    blockChance: 0,
    thornsPercent: 0,
};

/** +N effective level per skill node id, summed from every equipped item's "nodeLevel" affixes (see systems/skillTree.ts's resolveSkillTree). */
function computeNodeLevelBonuses(items: ItemInstance[]): Record<string, number> {
    const bonuses: Record<string, number> = {};
    for (const item of items) {
        for (const rolled of item.affixes) {
            const def = findAffixDef(rolled.affixId);
            if (!def || def.kind !== 'nodeLevel') continue;
            bonuses[def.nodeId] = (bonuses[def.nodeId] ?? 0) + rolled.value;
        }
    }
    return bonuses;
}

/** Flat stat contribution of one item instance: base stats + rolled STAT affixes (proc affixes are behavioral, not summed here). */
export function itemStats(item: ItemInstance): Partial<StatBlock> {
    const base = getBaseType(item.baseTypeId);
    if (!base) return {}; // stale/removed base type — item contributes nothing rather than crashing
    const out: Partial<StatBlock> = { ...base.baseStats };
    for (const rolled of item.affixes) {
        const def = findAffixDef(rolled.affixId);
        if (!def || def.kind !== 'stat') continue;
        out[def.stat] = (out[def.stat] ?? 0) + rolled.value;
    }
    return out;
}

/** A hand-slot weapon ready to drive an attack loop in the dungeon scene. */
export interface EquippedWeapon {
    slot: 'hand1' | 'hand2';
    item: ItemInstance;
    role: WeaponRole;
    element: Element;
    stats: Partial<StatBlock>;
}

export interface AggregateResult {
    stats: Required<StatBlock>;
    weapons: EquippedWeapon[];
    /** Non-statMod rhunes (procs/trails/amps/auras) for dungeonScene's rhune runtime. */
    rhunes: ResolvedRhune[];
    /** Every "X% chance on ___ to ___" proc affix across all equipped gear. */
    procAffixes: ResolvedProcAffix[];
    /** Resolved passive skill tree — stat contribution already folded into `stats`, special hooks for dungeonScene.ts. */
    skillTree: SkillTreeRuntime;
}

/** Sum base stats + every equipped item + every socketed rhune into final player stats. */
export function aggregateStats(save: SaveData): AggregateResult {
    const stats: Required<StatBlock> = { ...BASE_PLAYER_STATS };
    const weapons: EquippedWeapon[] = [];
    const equippedItems: ItemInstance[] = [];

    for (const slot of Object.keys(save.equipped) as GearSlot[]) {
        const itemId = save.equipped[slot];
        if (!itemId) continue;
        const item = save.items.find((i) => i.instanceId === itemId);
        if (!item) continue;
        equippedItems.push(item);
        const s = itemStats(item);
        for (const [k, v] of Object.entries(s)) {
            (stats as any)[k] = ((stats as any)[k] ?? 0) + (v as number);
        }
        if (slot === 'hand1' || slot === 'hand2') {
            const base = getBaseType(item.baseTypeId);
            if (base?.role && base.role !== 'shield') {
                weapons.push({ slot, item, role: base.role, element: base.element ?? 'physical', stats: s });
            }
        }
    }

    const resolvedRhunes = resolveEquippedRhunes(save);
    for (const resolved of resolvedRhunes) {
        const s = statModContribution(resolved);
        for (const [k, v] of Object.entries(s)) {
            (stats as any)[k] = ((stats as any)[k] ?? 0) + (v as number);
        }
    }

    const nodeLevelBonuses = computeNodeLevelBonuses(equippedItems);
    const skillTree = resolveSkillTree(save, nodeLevelBonuses);
    for (const [k, v] of Object.entries(skillTree.stats)) {
        (stats as any)[k] = ((stats as any)[k] ?? 0) + (v as number);
    }

    stats.critChance = Math.min(stats.critChance, 0.75);
    stats.lifesteal = Math.min(stats.lifesteal, 0.5);
    stats.dodgeChance = Math.min(stats.dodgeChance, 0.6);
    stats.damageReduction = Math.min(stats.damageReduction, 0.75);
    stats.reviveChance = Math.min(stats.reviveChance, 0.75);
    stats.blockChance = Math.min(stats.blockChance, 0.6);
    stats.thornsPercent = Math.min(stats.thornsPercent, 0.75);
    return { stats, weapons, rhunes: resolvedRhunes, procAffixes: resolveItemProcAffixes(equippedItems), skillTree };
}

export function canEquip(item: ItemInstance, slot: GearSlot): boolean {
    const base = getBaseType(item.baseTypeId);
    if (!base) return false; // stale/removed base type — item can't be equipped anywhere
    return slotAcceptsKind(slot, base.kind);
}

/**
 * Equipping always works from the Chest OR the bag — an item sitting in the
 * bag transfers into the Chest the moment you commit to wearing it, since
 * worn gear isn't "in storage" (chestCount excludes equipped items, so this
 * never trips the Chest cap).
 */
export function equipItem(save: SaveData, itemId: string, slot: GearSlot): SaveData {
    const fromBag = save.bag.find((i) => i.instanceId === itemId);
    const item = fromBag ?? save.items.find((i) => i.instanceId === itemId);
    if (!item || !canEquip(item, slot)) return save;
    const base = fromBag
        ? { ...save, bag: save.bag.filter((i) => i.instanceId !== itemId), items: [...save.items, item] }
        : save;
    return { ...base, equipped: { ...base.equipped, [slot]: itemId } };
}

export function unequipSlot(save: SaveData, slot: GearSlot): SaveData {
    return { ...save, equipped: { ...save.equipped, [slot]: null } };
}

/** Socket 3 is the bonus Rhynekra-capstone socket — see hasFourthRhuneSocket(). */
export function equipRhune(save: SaveData, rhuneId: string, socket: 0 | 1 | 2 | 3): SaveData {
    const fromBag = save.bagRhunes.find((r) => r.instanceId === rhuneId);
    const base = fromBag
        ? { ...save, bagRhunes: save.bagRhunes.filter((r) => r.instanceId !== rhuneId), rhunes: [...save.rhunes, fromBag] }
        : save;
    if (socket === 3) return { ...base, bonusRhuneSocket: rhuneId };
    const next = [...base.equippedRhunes] as SaveData['equippedRhunes'];
    next[socket] = rhuneId;
    return { ...base, equippedRhunes: next };
}

export function unequipRhune(save: SaveData, socket: 0 | 1 | 2 | 3): SaveData {
    if (socket === 3) return { ...save, bonusRhuneSocket: null };
    const next = [...save.equippedRhunes] as SaveData['equippedRhunes'];
    next[socket] = null;
    return { ...save, equippedRhunes: next };
}

/** Rhunekra's Final Convergence, "The Fourth Rhune" — hidden in the UI until it unlocks. */
export function hasFourthRhuneSocket(save: SaveData): boolean {
    return isNodeOwned(save, 'rhunekra_capstone_fourth_rhune');
}

export function salvageValue(item: ItemInstance, salvageBonus = 0): number {
    return Math.round(RARITIES[item.rarity].salvageValue * (1 + salvageBonus));
}

export function salvageItem(save: SaveData, itemId: string): SaveData {
    const inChest = save.items.find((i) => i.instanceId === itemId);
    const inBag = save.bag.find((i) => i.instanceId === itemId);
    const item = inChest ?? inBag;
    if (!item) return save;
    const equipped = { ...save.equipped };
    for (const slot of Object.keys(equipped) as GearSlot[]) {
        if (equipped[slot] === itemId) equipped[slot] = null;
    }
    const bonus = aggregateStats(save).stats.salvageBonus;
    return {
        ...save,
        currency: save.currency + salvageValue(item, bonus),
        items: inChest ? save.items.filter((i) => i.instanceId !== itemId) : save.items,
        bag: inBag ? save.bag.filter((i) => i.instanceId !== itemId) : save.bag,
        equipped,
    };
}

export function isItemEquipped(save: SaveData, itemId: string): GearSlot | null {
    for (const slot of Object.keys(save.equipped) as GearSlot[]) {
        if (save.equipped[slot] === itemId) return slot;
    }
    return null;
}

export function isRhuneEquipped(save: SaveData, rhuneId: string): number {
    const idx = save.equippedRhunes.findIndex((id) => id === rhuneId);
    if (idx !== -1) return idx;
    return save.bonusRhuneSocket === rhuneId ? 3 : -1;
}

/** v1 UX default: pick a sensible open slot rather than prompting the player to choose. */
export function autoEquipSlot(save: SaveData, item: ItemInstance): GearSlot {
    const base = getBaseType(item.baseTypeId);
    if (!base) return 'head'; // stale/removed base type — canEquip() will reject the actual equip anyway
    if (base.kind === 'hand') return save.equipped.hand1 ? 'hand2' : 'hand1';
    if (base.kind === 'jewelry') return save.equipped.jewelry1 ? 'jewelry2' : 'jewelry1';
    return base.kind as GearSlot;
}

export function autoEquipRhuneSocket(save: SaveData): 0 | 1 | 2 | 3 {
    const idx = save.equippedRhunes.findIndex((r) => r === null);
    if (idx !== -1) return idx as 0 | 1 | 2;
    if (hasFourthRhuneSocket(save) && !save.bonusRhuneSocket) return 3;
    return 0; // every socket full — falls back to overwriting socket 0
}

export function salvageRhune(save: SaveData, rhuneId: string): SaveData {
    const inChest = save.rhunes.find((r) => r.instanceId === rhuneId);
    const inBag = save.bagRhunes.find((r) => r.instanceId === rhuneId);
    const rhune = inChest ?? inBag;
    if (!rhune) return save;
    const equippedRhunes = save.equippedRhunes.map((id) => (id === rhuneId ? null : id)) as SaveData['equippedRhunes'];
    const bonusRhuneSocket = save.bonusRhuneSocket === rhuneId ? null : save.bonusRhuneSocket;
    const bonus = aggregateStats(save).stats.salvageBonus;
    return {
        ...save,
        currency: save.currency + Math.round(RARITIES[rhune.rarity].salvageValue * (1 + bonus)),
        rhunes: inChest ? save.rhunes.filter((r) => r.instanceId !== rhuneId) : save.rhunes,
        bagRhunes: inBag ? save.bagRhunes.filter((r) => r.instanceId !== rhuneId) : save.bagRhunes,
        equippedRhunes,
        bonusRhuneSocket,
    };
}

// --- Bag (Inventory) <-> Chest capacity, upgrades, and transfers ---

const BAG_BASE_CAPACITY = 14;
const BAG_CAPACITY_PER_UPGRADE = 4;
const BAG_UPGRADE_BASE_COST = 40;
const BAG_UPGRADE_COST_STEP = 30;

const CHEST_BASE_CAPACITY = 60;
const CHEST_CAPACITY_PER_UPGRADE = 20;
const CHEST_UPGRADE_BASE_COST = 80;
const CHEST_UPGRADE_COST_STEP = 60;

export function bagCapacity(save: SaveData): number {
    return BAG_BASE_CAPACITY + save.bagUpgradeLevel * BAG_CAPACITY_PER_UPGRADE;
}

export function bagCount(save: SaveData): number {
    return save.bag.length + save.bagRhunes.length;
}

export function bagUpgradeCost(save: SaveData): number {
    return BAG_UPGRADE_BASE_COST + save.bagUpgradeLevel * BAG_UPGRADE_COST_STEP;
}

export function upgradeBag(save: SaveData): SaveData {
    const cost = bagUpgradeCost(save);
    if (save.currency < cost) return save;
    return { ...save, currency: save.currency - cost, bagUpgradeLevel: save.bagUpgradeLevel + 1 };
}

export function chestCapacity(save: SaveData): number {
    return CHEST_BASE_CAPACITY + save.chestUpgradeLevel * CHEST_CAPACITY_PER_UPGRADE;
}

/** Worn gear doesn't take up storage — only what's actually sitting in the Chest counts. */
export function chestCount(save: SaveData): number {
    return (
        save.items.filter((i) => isItemEquipped(save, i.instanceId) === null).length +
        save.rhunes.filter((r) => isRhuneEquipped(save, r.instanceId) === -1).length
    );
}

export function chestUpgradeCost(save: SaveData): number {
    return CHEST_UPGRADE_BASE_COST + save.chestUpgradeLevel * CHEST_UPGRADE_COST_STEP;
}

export function upgradeChest(save: SaveData): SaveData {
    const cost = chestUpgradeCost(save);
    if (save.currency < cost) return save;
    return { ...save, currency: save.currency - cost, chestUpgradeLevel: save.chestUpgradeLevel + 1 };
}

export function moveItemToChest(save: SaveData, itemId: string): SaveData {
    if (chestCount(save) >= chestCapacity(save)) return save;
    const item = save.bag.find((i) => i.instanceId === itemId);
    if (!item) return save;
    return { ...save, bag: save.bag.filter((i) => i.instanceId !== itemId), items: [...save.items, item] };
}

export function moveItemToBag(save: SaveData, itemId: string): SaveData {
    if (isItemEquipped(save, itemId)) return save; // unequip first
    if (bagCount(save) >= bagCapacity(save)) return save;
    const item = save.items.find((i) => i.instanceId === itemId);
    if (!item) return save;
    return { ...save, items: save.items.filter((i) => i.instanceId !== itemId), bag: [...save.bag, item] };
}

export function moveRhuneToChest(save: SaveData, rhuneId: string): SaveData {
    if (chestCount(save) >= chestCapacity(save)) return save;
    const rhune = save.bagRhunes.find((r) => r.instanceId === rhuneId);
    if (!rhune) return save;
    return { ...save, bagRhunes: save.bagRhunes.filter((r) => r.instanceId !== rhuneId), rhunes: [...save.rhunes, rhune] };
}

export function moveRhuneToBag(save: SaveData, rhuneId: string): SaveData {
    if (isRhuneEquipped(save, rhuneId) !== -1) return save; // unsocket first
    if (bagCount(save) >= bagCapacity(save)) return save;
    const rhune = save.rhunes.find((r) => r.instanceId === rhuneId);
    if (!rhune) return save;
    return { ...save, rhunes: save.rhunes.filter((r) => r.instanceId !== rhuneId), bagRhunes: [...save.bagRhunes, rhune] };
}

export interface BagLootResult {
    save: SaveData;
    storedCount: number;
    /** Scrap from loot that couldn't fit — nothing is ever silently lost, a full bag auto-salvages the overflow. */
    overflowScrap: number;
}

/** Dungeon floor loot lands in the bag, not the Chest — capacity-checked, overflow auto-salvaged. */
export function addLootToBag(save: SaveData, loot: { items: ItemInstance[]; rhunes: RhuneInstance[] }): BagLootResult {
    const bonus = aggregateStats(save).stats.salvageBonus;
    const bag = [...save.bag];
    const bagRhunes = [...save.bagRhunes];
    const cap = bagCapacity(save);
    let storedCount = 0;
    let overflowScrap = 0;

    for (const item of loot.items) {
        if (bag.length + bagRhunes.length < cap) {
            bag.push(item);
            storedCount += 1;
        } else {
            overflowScrap += salvageValue(item, bonus);
        }
    }
    for (const rhune of loot.rhunes) {
        if (bag.length + bagRhunes.length < cap) {
            bagRhunes.push(rhune);
            storedCount += 1;
        } else {
            overflowScrap += Math.round(RARITIES[rhune.rarity].salvageValue * (1 + bonus));
        }
    }

    return { save: { ...save, bag, bagRhunes, currency: save.currency + overflowScrap }, storedCount, overflowScrap };
}
