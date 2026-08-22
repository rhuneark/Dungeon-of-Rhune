/**
 * The Merchant: gamble Scrap for a random item of a chosen kind, or — the
 * one thing nothing else in the game offers outright — a random Rhune.
 * Purely luck-based (same tier-weighted rarity roll as floor loot), and
 * priced lower than the Blacksmith's guaranteed craft to make that gamble
 * worth taking.
 */
import type { ItemInstance, ItemKind, RhuneInstance, SaveData } from '../data/types.ts';
import { rollItemOfKind, rollRhune } from './itemGen.ts';

export type GambleCategory = ItemKind | 'rhune';

const GAMBLE_BASE_COST = 8;
const GAMBLE_COST_PER_TIER = 4;

export function gambleCost(tier: number): number {
    return GAMBLE_BASE_COST + (tier - 1) * GAMBLE_COST_PER_TIER;
}

export type GambleRoll = { kind: 'item'; item: ItemInstance } | { kind: 'rhune'; rhune: RhuneInstance };

export interface GambleResult {
    save: SaveData;
    /** null when the player couldn't afford it — save is returned unchanged. */
    rolled: GambleRoll | null;
}

export function gamble(save: SaveData, category: GambleCategory): GambleResult {
    const cost = gambleCost(save.selectedTier);
    if (save.currency < cost) return { save, rolled: null };

    if (category === 'rhune') {
        const rhune = rollRhune(save.selectedTier);
        return { save: { ...save, currency: save.currency - cost, rhunes: [...save.rhunes, rhune] }, rolled: { kind: 'rhune', rhune } };
    }
    const item = rollItemOfKind(category, save.selectedTier);
    return { save: { ...save, currency: save.currency - cost, items: [...save.items, item] }, rolled: { kind: 'item', item } };
}
