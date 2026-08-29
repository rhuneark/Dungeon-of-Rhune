/**
 * The Blacksmith's material-based recipes — separate from the plain-Scrap
 * reroll (see blacksmith.ts). All three consume Parts (see data/types.ts's
 * PartKind), dropped from floor loot:
 *
 *  - Craft: a common item + Parts (+ Scrap) -> a fresh item of the SAME
 *    base type at a chosen higher rarity (freshly rolled affixes).
 *  - Transmute: an item of any non-legendary rarity + one Rhune + Parts ->
 *    the SAME item instance, bumped one rarity, with one new affix rolled
 *    on top of its existing ones.
 *  - Fuse: three Rhunes of the same non-legendary rarity -> one new random
 *    Rhune at the next rarity up.
 *
 * Every recipe is a plain `can___`/`___` pair (mirrors canAllocateRank/
 * allocateRank in systems/skillTree.ts) so the UI can show why a recipe is
 * blocked without duplicating the validation logic.
 */
import type { ItemInstance, PartKind, Rarity, RhuneInstance, RolledAffix, SaveData } from '../data/types.ts';
import { RARITY_ORDER } from '../data/types.ts';
import { getBaseType } from '../data/baseTypes.ts';
import { AFFIX_POOLS } from '../data/affixes.ts';
import { RARITIES } from '../data/rarity.ts';
import { RHUNES } from '../data/rhunes.ts';
import { randRange, rollSpecificItem } from './itemGen.ts';
import { isItemEquipped } from './inventory.ts';

function nextRarity(rarity: Rarity): Rarity | null {
    const idx = RARITY_ORDER.indexOf(rarity);
    return idx >= 0 && idx < RARITY_ORDER.length - 1 ? RARITY_ORDER[idx + 1] : null;
}

// --- Craft: common item + Parts + Scrap -> a fresh item at a chosen higher rarity ---

export interface PartCost {
    bolt: number;
    cog: number;
    shard: number;
    scrap: number;
}

export const CRAFT_COST: Partial<Record<Rarity, PartCost>> = {
    uncommon: { bolt: 3, cog: 1, shard: 0, scrap: 20 },
    rare: { bolt: 6, cog: 3, shard: 1, scrap: 60 },
    epic: { bolt: 10, cog: 6, shard: 3, scrap: 150 },
    legendary: { bolt: 16, cog: 10, shard: 6, scrap: 400 },
};
export const CRAFT_TARGETS: Rarity[] = ['uncommon', 'rare', 'epic', 'legendary'];

function canAfford(save: SaveData, cost: PartCost): boolean {
    return save.parts.bolt >= cost.bolt && save.parts.cog >= cost.cog && save.parts.shard >= cost.shard && save.currency >= cost.scrap;
}

export function canCraftUpgrade(save: SaveData, itemId: string, target: Rarity): { ok: boolean; reason: string } {
    const item = save.items.find((i) => i.instanceId === itemId);
    if (!item) return { ok: false, reason: 'Item not in Chest' };
    if (item.rarity !== 'common') return { ok: false, reason: 'Only a Common item can be the base' };
    if (isItemEquipped(save, itemId) !== null) return { ok: false, reason: 'Unequip it first' };
    const cost = CRAFT_COST[target];
    if (!cost) return { ok: false, reason: 'Unknown target rarity' };
    if (!canAfford(save, cost)) return { ok: false, reason: `Need ${cost.bolt} Bolts, ${cost.cog} Cogs, ${cost.shard} Runeshards, ${cost.scrap}◆` };
    return { ok: true, reason: '' };
}

/** Consumes the common item + materials; the base item is destroyed and replaced by a freshly rolled one at `target` rarity. */
export function craftUpgrade(save: SaveData, itemId: string, target: Rarity, tier: number): SaveData {
    const check = canCraftUpgrade(save, itemId, target);
    if (!check.ok) return save;
    const item = save.items.find((i) => i.instanceId === itemId)!;
    const cost = CRAFT_COST[target]!;
    const crafted = rollSpecificItem(item.baseTypeId, tier, target);
    return {
        ...save,
        items: [...save.items.filter((i) => i.instanceId !== itemId), crafted],
        parts: { bolt: save.parts.bolt - cost.bolt, cog: save.parts.cog - cost.cog, shard: save.parts.shard - cost.shard },
        currency: save.currency - cost.scrap,
    };
}

// --- Transmute: item (non-legendary) + 1 Rhune + Parts -> same item, +1 rarity, +1 new affix ---

export const TRANSMUTE_COST: PartCost = { bolt: 4, cog: 2, shard: 2, scrap: 0 };

function findRhune(save: SaveData, rhuneId: string): { rhune: RhuneInstance; inBag: boolean } | null {
    const inChest = save.rhunes.find((r) => r.instanceId === rhuneId);
    if (inChest) return { rhune: inChest, inBag: false };
    const inBag = save.bagRhunes.find((r) => r.instanceId === rhuneId);
    if (inBag) return { rhune: inBag, inBag: true };
    return null;
}

export function canTransmuteItem(save: SaveData, itemId: string, rhuneId: string): { ok: boolean; reason: string } {
    const item = save.items.find((i) => i.instanceId === itemId);
    if (!item) return { ok: false, reason: 'Item not in Chest' };
    if (!nextRarity(item.rarity)) return { ok: false, reason: 'Already Legendary' };
    if (!findRhune(save, rhuneId)) return { ok: false, reason: 'Rhune not found' };
    if (!canAfford(save, TRANSMUTE_COST)) return { ok: false, reason: `Need ${TRANSMUTE_COST.bolt} Bolts, ${TRANSMUTE_COST.cog} Cogs, ${TRANSMUTE_COST.shard} Runeshards` };
    return { ok: true, reason: '' };
}

/** Rolls one affix from the item's pool that it doesn't already have, scaled to the NEW rarity. */
function rollExtraAffix(item: ItemInstance, rarity: Rarity): RolledAffix | null {
    const base = getBaseType(item.baseTypeId);
    if (!base) return null;
    const pool = AFFIX_POOLS[base.affixPoolId] ?? [];
    const existing = new Set(item.affixes.map((a) => a.affixId));
    const candidates = pool.filter((def) => !existing.has(def.id));
    if (candidates.length === 0) return null;
    const def = candidates[Math.floor(Math.random() * candidates.length)];
    const mult = RARITIES[rarity].valueMult;
    if (def.kind === 'proc') {
        return { affixId: def.id, value: Number(Math.min(0.9, randRange(def.chanceMin, def.chanceMax) * mult).toFixed(3)) };
    }
    return { affixId: def.id, value: Number((randRange(def.min, def.max) * mult).toFixed(def.isPercent || def.max < 1 ? 3 : 1)) };
}

export function transmuteItem(save: SaveData, itemId: string, rhuneId: string): SaveData {
    const check = canTransmuteItem(save, itemId, rhuneId);
    if (!check.ok) return save;
    const item = save.items.find((i) => i.instanceId === itemId)!;
    const target = nextRarity(item.rarity)!;
    const found = findRhune(save, rhuneId)!;
    const extra = rollExtraAffix(item, target);

    const upgraded: ItemInstance = { ...item, rarity: target, affixes: extra ? [...item.affixes, extra] : item.affixes };
    return {
        ...save,
        items: save.items.map((i) => (i.instanceId === itemId ? upgraded : i)),
        rhunes: found.inBag ? save.rhunes : save.rhunes.filter((r) => r.instanceId !== rhuneId),
        bagRhunes: found.inBag ? save.bagRhunes.filter((r) => r.instanceId !== rhuneId) : save.bagRhunes,
        parts: { bolt: save.parts.bolt - TRANSMUTE_COST.bolt, cog: save.parts.cog - TRANSMUTE_COST.cog, shard: save.parts.shard - TRANSMUTE_COST.shard },
    };
}

// --- Fuse: 3 Rhunes of the same non-legendary rarity -> 1 random Rhune at the next rarity up ---

export const FUSE_COUNT = 3;

export function canFuseRhunes(save: SaveData, rhuneIds: string[]): { ok: boolean; reason: string } {
    if (rhuneIds.length !== FUSE_COUNT) return { ok: false, reason: `Pick exactly ${FUSE_COUNT}` };
    if (new Set(rhuneIds).size !== FUSE_COUNT) return { ok: false, reason: 'Pick 3 different Rhunes' };
    const found = rhuneIds.map((id) => findRhune(save, id));
    if (found.some((f) => !f)) return { ok: false, reason: 'A selected Rhune is missing' };
    const rarities = new Set(found.map((f) => f!.rhune.rarity));
    if (rarities.size !== 1) return { ok: false, reason: 'All 3 must be the same rarity' };
    const [rarity] = rarities;
    if (!nextRarity(rarity)) return { ok: false, reason: 'Already Legendary' };
    return { ok: true, reason: '' };
}

function makeRhuneInstanceId(): string {
    return `rhune_fused_${Date.now().toString(36)}_${Math.floor(Math.random() * 1e6).toString(36)}`;
}

export function fuseRhunes(save: SaveData, rhuneIds: string[]): SaveData {
    const check = canFuseRhunes(save, rhuneIds);
    if (!check.ok) return save;
    const found = rhuneIds.map((id) => findRhune(save, id)!);
    const target = nextRarity(found[0].rhune.rarity)!;
    const def = RHUNES[Math.floor(Math.random() * RHUNES.length)];
    const fused: RhuneInstance = { instanceId: makeRhuneInstanceId(), rhuneDefId: def.id, rarity: target };
    const idSet = new Set(rhuneIds);
    return {
        ...save,
        rhunes: [...save.rhunes.filter((r) => !idSet.has(r.instanceId)), fused],
        bagRhunes: save.bagRhunes.filter((r) => !idSet.has(r.instanceId)),
    };
}
