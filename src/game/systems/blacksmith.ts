/**
 * The Blacksmith bench: spend salvage currency to reroll an item's affix
 * values in place. The rarity-changing recipes (Craft/Transmute/Fuse) live
 * in systems/crafting.ts; bulk salvage lives in systems/inventory.ts — this
 * file stays focused on the one thing that's pure Scrap, no materials.
 */
import type { ItemInstance, SaveData } from '../data/types.ts';
import { RARITIES } from '../data/rarity.ts';
import { randRange } from './itemGen.ts';
import { findAffixDef } from '../data/affixes.ts';

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
            const value =
                def.kind === 'proc'
                    ? Number(Math.min(0.9, randRange(def.chanceMin, def.chanceMax) * mult).toFixed(3))
                    : Number((randRange(def.min, def.max) * mult).toFixed(def.isPercent || def.max < 1 ? 3 : 1));
            return { affixId: rolled.affixId, value };
        }),
    };

    return {
        ...save,
        currency: save.currency - cost,
        items: save.items.map((i) => (i.instanceId === itemId ? rerolled : i)),
    };
}
