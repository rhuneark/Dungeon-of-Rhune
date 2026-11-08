/**
 * Hover tooltip state, kept outside the main store so moving the mouse over
 * the inventory never re-renders the whole UI.
 */
import { useSyncExternalStore } from 'react';
import type { ItemInstance } from '../../content/items/types.ts';

export type TipContext = 'sell' | 'buy' | 'none';

export type Tip =
    | { kind: 'item'; item: ItemInstance; ctx: TipContext; price?: number; extra?: string[] }
    | { kind: 'text'; title?: string; color?: string; lines: string[] };

let tip: Tip | null = null;
let pos = { x: 0, y: 0 };
const subs = new Set<() => void>();
const emit = () => subs.forEach((s) => s());

export const tooltip = {
    show(t: Tip, x: number, y: number) {
        tip = t;
        pos = { x, y };
        emit();
    },
    move(x: number, y: number) {
        if (!tip) return;
        pos = { x, y };
        emit();
    },
    hide() {
        if (!tip) return;
        tip = null;
        emit();
    },
};

let snap: { tip: Tip | null; pos: { x: number; y: number } } = { tip, pos };
export function useTooltip() {
    return useSyncExternalStore(
        (cb) => {
            subs.add(cb);
            return () => subs.delete(cb);
        },
        () => {
            if (snap.tip !== tip || snap.pos !== pos) snap = { tip, pos };
            return snap;
        }
    );
}
