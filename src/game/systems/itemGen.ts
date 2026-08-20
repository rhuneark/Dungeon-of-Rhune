import type { ItemInstance, ItemKind, RhuneInstance, Rarity } from '../data/types.ts';
import { BASE_TYPES, baseTypesForSlotKind } from '../data/baseTypes.ts';
import { AFFIX_POOLS } from '../data/affixes.ts';
import { RARITIES, rollRarity } from '../data/rarity.ts';
import { RHUNES } from '../data/rhunes.ts';
import { getTier } from '../data/tiers.ts';

let uidCounter = 0;
function makeInstanceId(prefix: string): string {
    uidCounter += 1;
    return `${prefix}_${Date.now().toString(36)}_${uidCounter}_${Math.floor(Math.random() * 1e6).toString(36)}`;
}

export function randRange(min: number, max: number): number {
    return min + Math.random() * (max - min);
}

/** Weighted toward hand items being a bit rarer than any single armor slot alone. */
const KIND_WEIGHTS: Record<ItemKind, number> = {
    hand: 20,
    head: 13,
    torso: 13,
    legs: 13,
    feet: 13,
    jewelry: 14,
};

function rollKind(): ItemKind {
    const entries = Object.entries(KIND_WEIGHTS) as [ItemKind, number][];
    const total = entries.reduce((s, [, w]) => s + w, 0);
    let roll = Math.random() * total;
    for (const [kind, weight] of entries) {
        roll -= weight;
        if (roll <= 0) return kind;
    }
    return entries[0][0];
}

export function rollItem(tier: number, forcedRarity?: Rarity, luck = 0): ItemInstance {
    return rollItemOfKind(rollKind(), tier, forcedRarity, luck);
}

/** Roll an item of a specific kind (used by the Blacksmith's craft-new-item option). */
export function rollItemOfKind(kind: ItemKind, tier: number, forcedRarity?: Rarity, luck = 0): ItemInstance {
    const pool = baseTypesForSlotKind(kind);
    const base = pool[Math.floor(Math.random() * pool.length)];
    return rollSpecificItem(base.id, tier, forcedRarity, luck);
}

/** Roll an instance of a known base type (used for starter kits / guaranteed drops). */
export function rollSpecificItem(baseTypeId: string, tier: number, forcedRarity?: Rarity, luck = 0): ItemInstance {
    const tierDef = getTier(tier);
    const rarity = forcedRarity ?? rollRarity(tierDef.lootWeights, luck);
    const base = BASE_TYPES.find((b) => b.id === baseTypeId);
    if (!base) throw new Error(`Unknown base type: ${baseTypeId}`);

    const affixDefs = [...AFFIX_POOLS[base.affixPoolId]];
    const affixCount = Math.min(RARITIES[rarity].affixCount, affixDefs.length);
    const chosen: typeof affixDefs = [];
    for (let i = 0; i < affixCount; i++) {
        const idx = Math.floor(Math.random() * affixDefs.length);
        chosen.push(affixDefs.splice(idx, 1)[0]);
    }

    const mult = RARITIES[rarity].valueMult;
    const affixes = chosen.map((def) => {
        if (def.kind === 'proc') {
            return { affixId: def.id, value: Number(Math.min(0.9, randRange(def.chanceMin, def.chanceMax) * mult).toFixed(3)) };
        }
        return { affixId: def.id, value: Number((randRange(def.min, def.max) * mult).toFixed(def.isPercent || def.max < 1 ? 3 : 1)) };
    });

    return {
        instanceId: makeInstanceId('item'),
        baseTypeId: base.id,
        rarity,
        affixes,
        tierDropped: tier,
    };
}

export function rollRhune(tier: number, forcedRarity?: Rarity, luck = 0): RhuneInstance {
    const tierDef = getTier(tier);
    const rarity = forcedRarity ?? rollRarity(tierDef.lootWeights, luck);
    const def = RHUNES[Math.floor(Math.random() * RHUNES.length)];
    return {
        instanceId: makeInstanceId('rhune'),
        rhuneDefId: def.id,
        rarity,
    };
}

/** Roll a small floor-clear loot batch: 1-3 drops, richer at deeper tiers. */
export function rollFloorLoot(tier: number, floor: number, luck = 0): { items: ItemInstance[]; rhunes: RhuneInstance[] } {
    const dropCount = 1 + Math.floor(Math.random() * 2) + (floor % 5 === 0 ? 1 : 0);
    const items: ItemInstance[] = [];
    const rhunes: RhuneInstance[] = [];
    for (let i = 0; i < dropCount; i++) {
        if (Math.random() < 0.22) rhunes.push(rollRhune(tier, undefined, luck));
        else items.push(rollItem(tier, undefined, luck));
    }
    return { items, rhunes };
}

export { BASE_TYPES };
