/**
 * Item flow — the one place items move between ground, backpack, stash,
 * paperdoll and cursor. D2 rules: click picks an item up onto the cursor;
 * click again to place (swapping with exactly one item); drop a rhune onto
 * an item with an open socket to set it.
 */
import { getBase } from '../content/items/bases.ts';
import { findRhuneword, rhuneIdFromBase } from '../content/items/rhunes.ts';
import type { EquipSlot, ItemInstance } from '../content/items/types.ts';
import { getUnique } from '../content/items/uniques.ts';
import { worldBridge } from '../game/worldBridge.ts';
import { session } from '../state/session.ts';
import { store } from '../state/store.ts';
import { CRUCIBLE_H, CRUCIBLE_W, INV_H, INV_W, STASH_H, STASH_W, type HeroSave } from './hero.ts';
import { autoPlace, placeOrSwap, removeItem, sizeOf, type Grid } from './inventory.ts';
import { itemName, QUALITY_COLORS, sellPrice } from './itemText.ts';
import { emit } from './quests.ts';

export type GridKind = 'inv' | 'stash' | 'crucible';

export function gridOf(kind: GridKind): Grid {
    if (kind === 'inv') return { w: INV_W, h: INV_H, items: session.hero.inventory };
    if (kind === 'crucible') return { w: CRUCIBLE_W, h: CRUCIBLE_H, items: session.hero.crucible };
    return { w: STASH_W, h: STASH_H, items: session.save.stash };
}

// ------------------------------------------------------------------ codex
/** Record a first find. Uniques store their best roll quality (0..1). */
export function registerFind(item: ItemInstance): void {
    const save = session.save;
    const base = getBase(item.baseId);
    let key: string | null = null;
    let score = 1;
    if (base.category === 'rhune') {
        key = `r:${rhuneIdFromBase(item.baseId)}`;
    } else if (item.quality === 'unique' && item.uniqueId && item.identified) {
        key = `u:${item.uniqueId}`;
        const u = getUnique(item.uniqueId);
        if (u) {
            const parts = u.rolls.map((r, i) => (r.max === r.min ? 1 : ((item.uniqueValues?.[i]?.[0] ?? r.min) - r.min) / (r.max - r.min)));
            score = parts.length ? parts.reduce((a, b) => a + b, 0) / parts.length : 1;
        }
    } else if (item.quality === 'rhuneword' && item.rhunewordId) {
        key = `w:${item.rhunewordId}`;
    }
    if (!key) return;
    const prev = save.codex[key];
    if (!prev) {
        save.codex[key] = { at: Date.now(), best: score };
        if (key.startsWith('u:')) {
            save.stats.uniquesFound++;
            store.toast(`Codex: new unique — ${itemName(item)}`, QUALITY_COLORS.unique);
        }
        if (key.startsWith('r:')) save.stats.rhunesFound++;
    } else if (score > prev.best) {
        prev.best = score;
        if (key.startsWith('u:')) store.toast(`Codex: better roll on ${itemName(item)} (${Math.round(score * 100)}%)`, QUALITY_COLORS.unique);
    }
}

// ----------------------------------------------------------------- ground
/** Picking up from the ground. Returns false if there's no room. */
export function pickUp(item: ItemInstance): boolean {
    const hero = session.hero;
    if (!autoPlace(gridOf('inv'), item)) {
        worldBridge.floatText('I have no room.', '#e8e4d8');
        return false;
    }
    registerFind(item);
    emit('pickup', item.baseId);
    session.commit();
    return hero.inventory.includes(item);
}

export function dropCursor(): void {
    const hero = session.hero;
    if (!hero.cursor) return;
    const item = hero.cursor;
    hero.cursor = null;
    worldBridge.spawnDrops([{ kind: 'item', item }], 'player');
    session.commit();
}

// ---------------------------------------------------------------- sockets
export function canSocket(rhune: ItemInstance, target: ItemInstance): boolean {
    return getBase(rhune.baseId).category === 'rhune' && target.sockets > target.socketed.length;
}

function socketInto(rhune: ItemInstance, target: ItemInstance): void {
    rhune.x = undefined;
    rhune.y = undefined;
    target.socketed.push(rhune);
    emit('socket');
    const base = getBase(target.baseId);
    if (target.socketed.length === target.sockets && (target.quality === 'normal' || target.quality === 'superior')) {
        const ids = target.socketed.map((s) => rhuneIdFromBase(s.baseId) ?? '');
        const rw = findRhuneword(ids, base.tags);
        if (rw) {
            target.quality = 'rhuneword';
            target.rhunewordId = rw.id;
            target.affixes = target.affixes.filter((a) => a.affixId.startsWith('superior'));
            registerFind(target);
            emit('rhuneword');
            store.toast(`The rhunes speak: ${rw.name}!`, QUALITY_COLORS.unique);
            worldBridge.floatText(rw.name, QUALITY_COLORS.unique);
        }
    }
}

// ------------------------------------------------------------- identify
export function identify(item: ItemInstance): boolean {
    if (item.identified) return false;
    item.identified = true;
    session.save.stats.identified++;
    registerFind(item);
    emit('identify');
    return true;
}

export function identifyAll(): number {
    const hero = session.hero;
    let n = 0;
    for (const it of [...hero.inventory, ...Object.values(hero.equipped), ...(hero.cursor ? [hero.cursor] : [])]) {
        if (it && identify(it)) n++;
    }
    for (const it of session.save.stash) if (identify(it)) n++;
    session.commit();
    return n;
}

// ------------------------------------------------------------- grid clicks
/**
 * Click on a grid at the cell where the cursor item's top-left would land
 * (the UI computes it), or on an item when the cursor is empty.
 */
export function clickGrid(kind: GridKind, cx: number, cy: number, targetUid: string | null): void {
    const hero = session.hero;
    const grid = gridOf(kind);
    const st = store.get();

    if (st.cursorMode === 'identify') {
        const target = targetUid ? grid.items.find((i) => i.uid === targetUid) : undefined;
        if (target && !target.identified) {
            const scroll = hero.inventory.find((i) => i.baseId === 'scroll_identify');
            if (scroll) {
                removeItem(gridOf('inv'), scroll.uid);
                identify(target);
            }
        }
        store.patch({ cursorMode: null });
        session.commit();
        return;
    }

    if (!hero.cursor) {
        if (!targetUid) return;
        const it = removeItem(grid, targetUid);
        if (it) hero.cursor = it;
        session.commit();
        return;
    }

    // Holding something: socket into the item under the mouse, if possible.
    const target = targetUid ? grid.items.find((i) => i.uid === targetUid) : undefined;
    if (target && canSocket(hero.cursor, target)) {
        socketInto(hero.cursor, target);
        hero.cursor = null;
        session.commit();
        return;
    }
    const res = placeOrSwap(grid, hero.cursor, cx, cy);
    if (res.ok) {
        hero.cursor = res.swapped;
        session.commit();
    }
}

/** Right-click: sell / transfer / use / equip. */
export function rightClickItem(kind: GridKind, uid: string): void {
    const hero = session.hero;
    const st = store.get();
    const grid = gridOf(kind);
    const item = grid.items.find((i) => i.uid === uid);
    if (!item || hero.cursor) return;
    const base = getBase(item.baseId);

    if (kind === 'inv' && (st.left === 'vendor' || st.left === 'herbs' || st.left === 'gamble')) {
        sell(item);
        return;
    }
    if (st.left === 'stash' || st.left === 'smith' || kind === 'crucible') {
        const other = gridOf(kind !== 'inv' ? 'inv' : st.left === 'smith' ? 'crucible' : 'stash');
        removeItem(grid, uid);
        if (!autoPlace(other, item)) {
            autoPlace(grid, item);
            store.toast('No room.');
        }
        session.commit();
        return;
    }
    if (kind === 'inv' && base.use) {
        useConsumable(item);
        return;
    }
    if (kind === 'inv' && base.slot) {
        removeItem(grid, uid);
        hero.cursor = item;
        const slot = bestSlotFor(item);
        if (slot) clickEquip(slot);
        // Whatever ended up on the cursor goes back to the bag.
        if (hero.cursor) {
            if (!autoPlace(grid, hero.cursor)) return session.commit();
            hero.cursor = null;
        }
        session.commit();
    }
}

export function useConsumable(item: ItemInstance): void {
    const hero = session.hero;
    const base = getBase(item.baseId);
    const sheet = session.sheet();
    const consume = () => removeItem(gridOf('inv'), item.uid);
    switch (base.use) {
        case 'heal':
            hero.life = sheet.life;
            consume();
            worldBridge.floatText('+life', '#e05050');
            break;
        case 'mana':
            hero.mana = sheet.mana;
            consume();
            worldBridge.floatText('+mana', '#5a7cff');
            break;
        case 'rejuv':
            hero.life = sheet.life;
            hero.mana = sheet.mana;
            consume();
            worldBridge.floatText('Rejuvenated', '#b57cff');
            break;
        case 'identify':
            store.patch({ cursorMode: 'identify' });
            store.toast('Click an unidentified item.');
            return;
    }
    session.commit();
}

// ---------------------------------------------------------------- equipping
export function slotFits(item: ItemInstance, slot: EquipSlot): boolean {
    const base = getBase(item.baseId);
    if (!base.slot) return false;
    if (base.slot === 'ring') return slot === 'ring1' || slot === 'ring2';
    return base.slot === slot;
}

function bestSlotFor(item: ItemInstance): EquipSlot | null {
    const base = getBase(item.baseId);
    if (!base.slot) return null;
    if (base.slot === 'ring') return !session.hero.equipped.ring1 ? 'ring1' : !session.hero.equipped.ring2 ? 'ring2' : 'ring1';
    return base.slot as EquipSlot;
}

export function clickEquip(slot: EquipSlot): void {
    const hero = session.hero;
    const current = hero.equipped[slot];
    const held = hero.cursor;

    if (store.get().cursorMode === 'identify') {
        if (current && !current.identified) {
            const scroll = hero.inventory.find((i) => i.baseId === 'scroll_identify');
            if (scroll) {
                removeItem(gridOf('inv'), scroll.uid);
                identify(current);
            }
        }
        store.patch({ cursorMode: null });
        session.commit();
        return;
    }

    if (!held) {
        if (current) {
            delete hero.equipped[slot];
            hero.cursor = current;
            session.commit();
        }
        return;
    }
    if (current && canSocket(held, current)) {
        socketInto(held, current);
        hero.cursor = null;
        session.commit();
        return;
    }
    if (!slotFits(held, slot)) {
        worldBridge.floatText("I can't use that there.", '#e8e4d8');
        return;
    }
    const base = getBase(held.baseId);
    if (slot === 'offhand' && hero.equipped.weapon && getBase(hero.equipped.weapon.baseId).twoHanded) {
        worldBridge.floatText('Both hands are busy.', '#e8e4d8');
        return;
    }
    if (slot === 'weapon' && base.twoHanded && hero.equipped.offhand) {
        // Move the off-hand to the bag first; refuse if it won't fit.
        if (!autoPlace(gridOf('inv'), hero.equipped.offhand)) {
            worldBridge.floatText('No room for my off-hand.', '#e8e4d8');
            return;
        }
        delete hero.equipped.offhand;
    }
    held.x = undefined;
    held.y = undefined;
    hero.equipped[slot] = held;
    hero.cursor = current ?? null;
    session.commit();
}

// ------------------------------------------------------------------ selling
export function sell(item: ItemInstance): void {
    const hero = session.hero;
    const base = getBase(item.baseId);
    if (base.category === 'quest') {
        store.toast('Varn would never forgive you.');
        return;
    }
    const price = sellPrice(item);
    removeItem(gridOf('inv'), item.uid);
    hero.gold += price;
    worldBridge.floatText(`+${price} gold`, QUALITY_COLORS.gold);
    session.commit();
}

/** Total weight of loot carried, for the HUD bag counter. */
export function freeCells(hero: HeroSave): number {
    let used = 0;
    for (const it of hero.inventory) {
        const s = sizeOf(it);
        used += s.w * s.h;
    }
    return INV_W * INV_H - used;
}
