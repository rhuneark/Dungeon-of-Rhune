import { store } from '../../state/store.ts';

/** Client (CSS px) → UI px inside the scaled UI root. */
export function uiPoint(clientX: number, clientY: number): { x: number; y: number } {
    const v = store.get().view;
    const k = v.dpr / v.ui;
    return { x: (clientX - v.left) * k, y: (clientY - v.top) * k };
}
