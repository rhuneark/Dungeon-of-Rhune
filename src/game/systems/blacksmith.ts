/**
 * The Blacksmith bench: spend salvage currency to reroll an item's affix
 * values in place, or craft a brand-new item of a chosen kind at the
 * player's current tier.
 */
import type { ItemInstance, ItemKind, SaveData } from '../data/types.ts';
import { RARITIES } from '../data/rarity.ts';
import { randRange, rollItemOfKind } from './itemGen.ts';
import { findAffixDef } from './inventory.ts';

export function rerollCost(item: ItemInstance): number {
    return Math.max(5, RARITIES[item.rarity].salvageValue * 3);
}

/** Re-rolls the VALUE of each existing affix (same affixes, fresh numbers) — never changes rarity or which affixes are present. */
export function rerollItem(save: SaveData, itemId: string): SaveData {
    const item = save.items.find((i) => i.instanceId === itemId);
    if (!item) return save;
    const cost = rerollCost(item);
    if (save.currency < cost) return save;

    const mult = RARITIES[item.rarity].valueMult;
    const rerolled: ItemInstance = {
        ...item,
        affixes: item.affixes.map((rolled) => {
            const def = findAffixDef(rolled.affixId);
            if (!def) return rolled;
            const value = Number((randRange(def.min, def.max) * mult).toFixed(def.isPercent || def.max < 1 ? 3 : 1));
            return { affixId: rolled.affixId, value };
        }),
    };

    return {
        ...save,
        currency: save.currency - cost,
        items: save.items.map((i) => (i.instanceId === itemId ? rerolled : i)),
    };
}

const CRAFT_BASE_COST = 12;
const CRAFT_COST_PER_TIER = 6;

export function craftCost(tier: number): number {
    return CRAFT_BASE_COST + (tier - 1) * CRAFT_COST_PER_TIER;
}

export function craftItem(save: SaveData, kind: ItemKind): SaveData {
    const cost = craftCost(save.selectedTier);
    if (save.currency < cost) return save;
    const item = rollItemOfKind(kind, save.selectedTier);
    return { ...save, currency: save.currency - cost, items: [...save.items, item] };
}
