/**
 * Pixel-perfect viewport math. "Crispy" means every art pixel covers a whole
 * number of DEVICE pixels — so the world and the UI scale by whole numbers
 * computed from the real device-pixel size of the frame.
 *
 *   zoom — device px per world px  (integer; world view ~480 world px tall)
 *   ui   — device px per UI px     (UI canvas at least ~430 UI px tall)
 *
 * The UI uses integers too, with one exception: windows 645–860 device px
 * tall (a 1366x768 laptop browser) would otherwise drop to 1x and tiny text,
 * so they get 1.5x — nearly crisp and readable. Players can override both
 * scales in Options (persisted per device).
 *
 * The frame fills the window but clamps its aspect to 4:3 .. 21:9, with
 * edges snapped to device pixels so nothing lands on a half pixel.
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

export type ScalePref = 'auto' | number;
export interface ViewPrefs {
    ui: ScalePref;
    zoom: ScalePref;
}

const MIN_ASPECT = 4 / 3;
const MAX_ASPECT = 21 / 9;
export const WORLD_TARGET_H = 480;
export const UI_TARGET_H = 540;
/** Smallest UI canvas the layouts are designed for. */
export const UI_MIN_H = 430;
export const UI_MIN_W = 690;
export const UI_SCALE_CHOICES = [1, 1.5, 2, 3, 4, 5, 6];
export const ZOOM_CHOICES = [1, 2, 3, 4, 5, 6];

const PREFS_KEY = 'rhune_view_prefs';
let prefs: ViewPrefs = { ui: 'auto', zoom: 'auto' };
try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (raw) prefs = { ...prefs, ...(JSON.parse(raw) as Partial<ViewPrefs>) };
} catch {
    /* storage blocked: defaults */
}

export function getViewPrefs(): ViewPrefs {
    return prefs;
}
export function setViewPrefs(next: Partial<ViewPrefs>): void {
    prefs = { ...prefs, ...next };
    try {
        localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
    } catch {
        /* ignore */
    }
}

/** Auto UI scale: integers near UI_TARGET_H, never below UI_MIN; 1.5x for mid-size windows. */
export function autoUiScale(devW: number, devH: number): number {
    const fits = (s: number) => devH / s >= UI_MIN_H && devW / s >= UI_MIN_W;
    let s = Math.max(1, Math.round(devH / UI_TARGET_H));
    while (s > 1 && !fits(s)) s -= 1;
    if (s === 1 && fits(1.5)) s = 1.5;
    return s;
}

export function autoZoom(devH: number): number {
    return Math.max(1, Math.round(devH / WORLD_TARGET_H));
}

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
    const zoom = prefs.zoom === 'auto' ? autoZoom(devH) : prefs.zoom;
    const ui = prefs.ui === 'auto' ? autoUiScale(devW, devH) : prefs.ui;
    return { cssW, cssH, left, top, dpr, devW, devH, zoom, ui, uiW: Math.floor(devW / ui), uiH: Math.floor(devH / ui) };
}

export function sameMetrics(a: ViewMetrics, b: ViewMetrics): boolean {
    return a.devW === b.devW && a.devH === b.devH && a.dpr === b.dpr && a.left === b.left && a.top === b.top && a.zoom === b.zoom && a.ui === b.ui;
}
