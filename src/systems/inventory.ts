/**
 * Grid containers (backpack, stash, vendor) — D2-style "tetris": every item
 * occupies base.w x base.h cells at (x, y).
 */
import { getBase } from '../content/items/bases.ts';
import type { ItemInstance } from '../content/items/types.ts';

export interface Grid {
    w: number;
    h: number;
    items: ItemInstance[];
}

export function sizeOf(item: ItemInstance): { w: number; h: number } {
    const b = getBase(item.baseId);
    return { w: b.w, h: b.h };
}

/** Items overlapping a w x h rectangle at (x, y). */
export function overlapping(grid: Grid, x: number, y: number, w: number, h: number, ignoreUid?: string): ItemInstance[] {
    return grid.items.filter((it) => {
        if (it.uid === ignoreUid) return false;
        const s = sizeOf(it);
        return it.x! < x + w && it.x! + s.w > x && it.y! < y + h && it.y! + s.h > y;
    });
}

export function inBounds(grid: Grid, x: number, y: number, w: number, h: number): boolean {
    return x >= 0 && y >= 0 && x + w <= grid.w && y + h <= grid.h;
}

export function canPlace(grid: Grid, item: ItemInstance, x: number, y: number): boolean {
    const s = sizeOf(item);
    return inBounds(grid, x, y, s.w, s.h) && overlapping(grid, x, y, s.w, s.h, item.uid).length === 0;
}

/** First free spot, scanning column by column from the top-left (like D2). */
export function findSpot(grid: Grid, item: ItemInstance): { x: number; y: number } | null {
    const s = sizeOf(item);
    for (let x = 0; x + s.w <= grid.w; x++) {
        for (let y = 0; y + s.h <= grid.h; y++) {
            if (overlapping(grid, x, y, s.w, s.h, item.uid).length === 0) return { x, y };
        }
    }
    return null;
}

/** Try to auto-place; returns false when there is no room. Mutates grid.items. */
export function autoPlace(grid: Grid, item: ItemInstance): boolean {
    const spot = findSpot(grid, item);
    if (!spot) return false;
    item.x = spot.x;
    item.y = spot.y;
    grid.items.push(item);
    return true;
}

export function removeItem(grid: Grid, uid: string): ItemInstance | null {
    const i = grid.items.findIndex((it) => it.uid === uid);
    if (i < 0) return null;
    return grid.items.splice(i, 1)[0];
}

export function itemAtCell(grid: Grid, cx: number, cy: number): ItemInstance | undefined {
    return overlapping(grid, cx, cy, 1, 1)[0];
}

/**
 * Drop `item` with its top-left at (x, y). If exactly one item is in the way,
 * it is swapped out and returned (it goes onto the cursor). Returns
 * { ok:false } if blocked by 2+ items or out of bounds.
 */
export function placeOrSwap(grid: Grid, item: ItemInstance, x: number, y: number): { ok: boolean; swapped: ItemInstance | null } {
    const s = sizeOf(item);
    if (!inBounds(grid, x, y, s.w, s.h)) return { ok: false, swapped: null };
    const hits = overlapping(grid, x, y, s.w, s.h, item.uid);
    if (hits.length > 1) return { ok: false, swapped: null };
    let swapped: ItemInstance | null = null;
    if (hits.length === 1) swapped = removeItem(grid, hits[0].uid);
    item.x = x;
    item.y = y;
    grid.items.push(item);
    return { ok: true, swapped };
}
