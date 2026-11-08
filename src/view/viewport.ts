/**
 * Pixel-perfect viewport math. "Crispy" means every art pixel covers a whole
 * number of DEVICE pixels — so both the world and the UI scale by integers,
 * computed from the real device-pixel size of the frame.
 *
 *   zoom — device px per world px  (world view ~480 world px tall)
 *   ui   — device px per UI px     (UI canvas ~450-600 UI px tall)
 *
 * The frame fills the window (no letterbox) but clamps its aspect to
 * 4:3 .. 21:9 so ultrawide/portrait windows stay playable. Its edges are
 * snapped to device pixels so nothing lands on a half pixel.
 */
export interface ViewMetrics {
    /** Frame size/offset in CSS px (device-aligned). */
    cssW: number;
    cssH: number;
    left: number;
    top: number;
    dpr: number;
    /** Frame size in device px. */
    devW: number;
    devH: number;
    zoom: number;
    ui: number;
    /** UI canvas size in UI px. */
    uiW: number;
    uiH: number;
}

const MIN_ASPECT = 4 / 3;
const MAX_ASPECT = 21 / 9;
export const WORLD_TARGET_H = 480;
export const UI_TARGET_H = 540;

export function computeViewMetrics(): ViewMetrics {
    const dpr = window.devicePixelRatio || 1;
    const vw = Math.max(1, window.innerWidth);
    const vh = Math.max(1, window.innerHeight);
    let w = vw;
    let h = vh;
    if (w / h > MAX_ASPECT) w = h * MAX_ASPECT;
    if (w / h < MIN_ASPECT) h = w / MIN_ASPECT;
    const devW = Math.max(1, Math.floor(w * dpr));
    const devH = Math.max(1, Math.floor(h * dpr));
    const cssW = devW / dpr;
    const cssH = devH / dpr;
    const left = Math.round(((vw - cssW) / 2) * dpr) / dpr;
    const top = Math.round(((vh - cssH) / 2) * dpr) / dpr;
    const zoom = Math.max(1, Math.round(devH / WORLD_TARGET_H));
    const ui = Math.max(1, Math.round(devH / UI_TARGET_H));
    return { cssW, cssH, left, top, dpr, devW, devH, zoom, ui, uiW: Math.floor(devW / ui), uiH: Math.floor(devH / ui) };
}

export function sameMetrics(a: ViewMetrics, b: ViewMetrics): boolean {
    return a.devW === b.devW && a.devH === b.devH && a.dpr === b.dpr && a.left === b.left && a.top === b.top;
}
