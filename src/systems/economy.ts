/**
 * Town services that cost gold: vendors, Odo's sealed goods (gambling), the
 * Wishing Well, Brannoc's socket punch and Crucible recipes.
 */
import { BASES, EQUIPMENT_BASES, getBase } from '../content/items/bases.ts';
import { nextRhune, rhuneIdFromBase } from '../content/items/rhunes.ts';
import type { ItemInstance, Quality } from '../content/items/types.ts';
import { uniquesForBase } from '../content/items/uniques.ts';
import { worldBridge } from '../game/worldBridge.ts';
import { session } from '../state/session.ts';
import { store } from '../state/store.ts';
import { gridOf, registerFind } from './actions.ts';
import { autoPlace, removeItem, type Grid } from './inventory.ts';
import { createItem } from './itemGen.ts';
import { buyPrice } from './itemText.ts';
import { rollTreasure } from './loot.ts';
import { emit } from './quests.ts';
import { createRng, worldRng } from './rng.ts';

const hasQuirk = (id: string) => (session.sheet().raw[`quirk:${id}`] ?? 0) > 0;

// ------------------------------------------------------------------ vendors
interface Stock {
    grid: Grid;
    level: number;
    at: number;
}
const stocks = new Map<string, Stock>();
const RESTOCK_MS = 3 * 60 * 1000;

export const VENDOR_W = 10;
export const VENDOR_H = 10;

function rollVendorStock(level: number): Grid {
    const rng = createRng();
    const grid: Grid = { w: VENDOR_W, h: VENDOR_H, items: [] };
    const pool = EQUIPMENT_BASES.filter((b) => b.qlvl <= level + 3 && b.category !== 'curio');
    for (let i = 0; i < 40 && grid.items.length < 22; i++) {
        const base = pool[rng.weighted(pool.map((b) => b.weight))];
        const quality: Quality = base.alwaysMagic || rng.chance(0.45) ? 'magic' : rng.chance(0.2) ? 'superior' : 'normal';
        const it = createItem(base.id, { ilvl: level + 3, quality, rng, identified: true });
        autoPlace(grid, it);
    }
    return grid;
}

function herbStock(level: number): Grid {
    const grid: Grid = { w: VENDOR_W, h: 4, items: [] };
    const ids = ['potion_health', 'potion_health', 'potion_health', 'potion_mana', 'potion_mana', 'potion_mana', 'scroll_identify', 'scroll_identify'];
    if (level >= 8) ids.push('potion_rejuv');
    for (const id of ids) autoPlace(grid, createItem(id, { ilvl: 1 }));
    return grid;
}

export function vendorGrid(npcId: string): Grid {
    const level = session.hero.level;
    let s = stocks.get(npcId);
    if (!s || s.level !== level || Date.now() - s.at > RESTOCK_MS) {
        s = { grid: npcId === 'ysolde' ? herbStock(level) : rollVendorStock(level), level, at: Date.now() };
        stocks.set(npcId, s);
    }
    return s.grid;
}

export function restock(npcId: string): void {
    stocks.delete(npcId);
    store.patch({ rev: store.get().rev + 1 });
}

export function vendorPrice(item: ItemInstance): number {
    const p = buyPrice(item);
    return Math.ceil(hasQuirk('pickpocket') ? p * 0.9 : p);
}

export function buy(npcId: string, uid: string): void {
    const hero = session.hero;
    const grid = vendorGrid(npcId);
    const item = grid.items.find((i) => i.uid === uid);
    if (!item) return;
    const price = vendorPrice(item);
    if (hero.gold < price) {
        worldBridge.floatText('Not enough gold.', '#e8e4d8');
        return;
    }
    // Ysolde's shelves never run dry: sell a copy.
    const infinite = npcId === 'ysolde';
    const bought = infinite ? createItem(item.baseId, { ilvl: item.ilvl }) : item;
    if (!autoPlace(gridOf('inv'), bought)) {
        worldBridge.floatText('I have no room.', '#e8e4d8');
        return;
    }
    if (!infinite) removeItem(grid, uid);
    hero.gold -= price;
    session.commit();
}

// ----------------------------------------------------------------- gambling
export interface GambleOffer {
    baseId: string;
    price: number;
}

export function gambleOffers(): GambleOffer[] {
    const hero = session.hero;
    const ruin = hasQuirk('ruin') ? 1.1 : 1;
    return EQUIPMENT_BASES.filter((b) => b.qlvl <= hero.level + 5 && b.category !== 'curio').map((b) => ({
        baseId: b.id,
        price: Math.round((b.price * 2.5 + 60 * hero.level) * (1 + b.qlvl / 15) * (b.category === 'jewelry' ? 2 : 1) * ruin),
    }));
}

/** Odo's odds. Uniques are rare; rares less so; everything else is magic. */
export const GAMBLE_ODDS = { unique: 0.015, rare: 0.1 };

export function gamble(baseId: string): void {
    const hero = session.hero;
    const offer = gambleOffers().find((o) => o.baseId === baseId);
    if (!offer) return;
    if (hero.gold < offer.price) {
        worldBridge.floatText('Not enough gold.', '#e8e4d8');
        return;
    }
    const rng = createRng();
    const ilvl = Math.max(1, hero.level + rng.int(-2, 4));
    const base = getBase(baseId);
    let quality: Quality = 'magic';
    const r = rng.next();
    if (r < GAMBLE_ODDS.unique && uniquesForBase(baseId, ilvl).length) quality = 'unique';
    else if (r < GAMBLE_ODDS.unique + GAMBLE_ODDS.rare && base.category !== 'curio') quality = 'rare';
    const item = createItem(baseId, { ilvl, quality, rng, identified: true });
    if (!autoPlace(gridOf('inv'), item)) {
        worldBridge.floatText('I have no room.', '#e8e4d8');
        return;
    }
    hero.gold -= offer.price;
    session.save.stats.gambles++;
    registerFind(item);
    if (item.quality === 'unique') worldBridge.floatText('!!!', '#c9a46b');
    emit('gamble');
    session.commit();
}

// ------------------------------------------------------------- wishing well
export function wishCost(): number {
    return 25 + 15 * session.hero.level;
}

export function makeWish(): void {
    const hero = session.hero;
    const cost = wishCost();
    if (hero.gold < cost) {
        worldBridge.floatText('Not enough gold.', '#e8e4d8');
        return;
    }
    hero.gold -= cost;
    session.save.stats.wishes++;
    const fortune = session.sheet().fortune;
    const r = worldRng.next();
    let drops = rollTreasure('well', { ilvl: hero.level + 1, fortune });
    if (r < 0.03) {
        // Jackpot: the well is in a generous mood.
        drops = [...drops, ...rollTreasure('well', { ilvl: hero.level + 2, fortune }), ...rollTreasure('well', { ilvl: hero.level + 2, fortune })];
        store.toast('The well gurgles happily.', '#7ec8e3');
    } else if (r < 0.05) {
        drops = [{ kind: 'gold', amount: cost * 3 }];
        store.toast('The well burps up your coin. And some of someone else’s.', '#7ec8e3');
    }
    worldBridge.spawnDrops(drops, 'well');
    emit('wish');
    session.commit();
}

// -------------------------------------------------------------- the smith
export function socketCost(item: ItemInstance): number {
    return 150 + item.ilvl * 25;
}

export function canPunch(item: ItemInstance): boolean {
    const base = getBase(item.baseId);
    return (item.quality === 'normal' || item.quality === 'superior') && item.sockets === 0 && base.maxSockets > 0;
}

export function punchSockets(item: ItemInstance): void {
    const hero = session.hero;
    if (!canPunch(item)) return;
    const cost = socketCost(item);
    if (hero.gold < cost) {
        worldBridge.floatText('Not enough gold.', '#e8e4d8');
        return;
    }
    const max = getBase(item.baseId).maxSockets;
    hero.gold -= cost;
    item.sockets = worldRng.int(Math.ceil(max / 2), max);
    store.toast(`Brannoc punches ${item.sockets} socket${item.sockets > 1 ? 's' : ''}.`, '#a3a3a3');
    session.commit();
}

// ------------------------------------------------------------- the crucible
export interface Recipe {
    id: string;
    name: string;
    text: string;
    match(items: ItemInstance[]): boolean;
    make(items: ItemInstance[]): ItemInstance[];
}

const isRhune = (i: ItemInstance) => getBase(i.baseId).category === 'rhune';

export const RECIPES: Recipe[] = [
    {
        id: 'rhune_up',
        name: 'Ascend',
        text: '3 identical Rhunes → the next Rhune',
        match: (it) => it.length === 3 && it.every(isRhune) && it.every((i) => i.baseId === it[0].baseId) && !!nextRhune(rhuneIdFromBase(it[0].baseId)!),
        make: (it) => [createItem(`rhune_${nextRhune(rhuneIdFromBase(it[0].baseId)!)!.id}`, { ilvl: 99 })],
    },
    {
        id: 'reforge',
        name: 'Reforge',
        text: '3 magic items of the same slot → a new magic item of that slot (item level +2)',
        match: (it) =>
            it.length === 3 &&
            it.every((i) => i.quality === 'magic') &&
            it.every((i) => getBase(i.baseId).slot && getBase(i.baseId).slot === getBase(it[0].baseId).slot),
        make: (it) => {
            const slot = getBase(it[0].baseId).slot;
            const ilvl = Math.round(it.reduce((a, i) => a + i.ilvl, 0) / 3) + 2;
            const pool = BASES.filter((b) => b.slot === slot && b.qlvl <= ilvl);
            const b = pool[worldRng.int(0, pool.length - 1)];
            return [createItem(b.id, { ilvl, quality: 'magic', identified: true })];
        },
    },
    {
        id: 'unsocket',
        name: 'Unspeak',
        text: 'A socketed item + an Ash Rhune → the item with empty sockets (its rhunes are lost)',
        match: (it) => it.length === 2 && it.some((i) => i.baseId === 'rhune_ash') && it.some((i) => i.socketed.length > 0),
        make: (it) => {
            const target = it.find((i) => i.socketed.length > 0)!;
            target.socketed = [];
            if (target.quality === 'rhuneword') {
                target.quality = 'normal';
                target.rhunewordId = undefined;
            }
            return [target];
        },
    },
];

/** Run whichever recipe matches the crucible contents. Returns the products or null. */
export function transmute(contents: ItemInstance[]): ItemInstance[] | null {
    const recipe = RECIPES.find((r) => r.match(contents));
    if (!recipe) return null;
    const out = recipe.make(contents);
    for (const o of out) registerFind(o);
    store.toast(`The crucible hisses: ${recipe.name}.`, '#ff9b3d');
    return out;
}
