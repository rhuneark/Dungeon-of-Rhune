/**
 * Pixel-perfect world stage + camera.
 *
 * `root` holds the world, positioned in WORLD PIXELS (1 art pixel = 1 unit).
 * It is scaled by zoom/dpr so one world pixel is exactly `zoom` device
 * pixels, and the camera offset is snapped to whole device pixels — so any
 * sprite at an integer world position lands exactly on the device grid.
 */
import { Container, type Application } from 'pixi.js';
import type { ViewMetrics } from '../view/viewport.ts';

/** The scene contract: every createXxxScene(app, stage) returns one of these. */
export interface Scene {
    destroy(): void;
}

export interface Stage {
    root: Container;
    zoom(): number;
    /** Visible world size in world px. */
    viewW(): number;
    viewH(): number;
    setBounds(w: number, h: number): void;
    /** Center the camera on a world point (clamped to bounds). */
    lookAt(x: number, y: number): void;
    /** Camera top-left in world px. */
    camLeft(): number;
    camTop(): number;
    /** CSS px inside the canvas → world px. */
    screenToWorld(sx: number, sy: number): { x: number; y: number };
    worldToScreen(wx: number, wy: number): { x: number; y: number };
    applyView(view: ViewMetrics): void;
    onResize(cb: () => void): () => void;
    destroy(): void;
}

export function createStage(app: Application, initial: ViewMetrics): Stage {
    const root = new Container();
    app.stage.addChild(root);
    let view = initial;
    let boundsW = 0;
    let boundsH = 0;
    let cx = 0;
    let cy = 0;
    let offX = 0; // device px
    let offY = 0;
    const resizeCbs = new Set<() => void>();

    const viewW = () => view.devW / view.zoom;
    const viewH = () => view.devH / view.zoom;

    const apply = () => {
        const z = view.zoom;
        root.scale.set(z / view.dpr);
        const clampAxis = (c: number, span: number, bound: number) => (bound <= span ? bound / 2 : Math.min(Math.max(c, span / 2), bound - span / 2));
        const x = clampAxis(cx, viewW(), boundsW);
        const y = clampAxis(cy, viewH(), boundsH);
        offX = Math.round((x - viewW() / 2) * z);
        offY = Math.round((y - viewH() / 2) * z);
        root.position.set(-offX / view.dpr, -offY / view.dpr);
    };

    return {
        root,
        zoom: () => view.zoom,
        viewW,
        viewH,
        setBounds(w, h) {
            boundsW = w;
            boundsH = h;
            apply();
        },
        lookAt(x, y) {
            cx = x;
            cy = y;
            apply();
        },
        camLeft: () => offX / view.zoom,
        camTop: () => offY / view.zoom,
        screenToWorld(sx, sy) {
            return { x: (sx * view.dpr + offX) / view.zoom, y: (sy * view.dpr + offY) / view.zoom };
        },
        worldToScreen(wx, wy) {
            return { x: (wx * view.zoom - offX) / view.dpr, y: (wy * view.zoom - offY) / view.dpr };
        },
        applyView(v) {
            view = v;
            apply();
            for (const cb of resizeCbs) cb();
        },
        onResize(cb) {
            resizeCbs.add(cb);
            return () => resizeCbs.delete(cb);
        },
        destroy() {
            resizeCbs.clear();
            root.destroy({ children: true });
        },
    };
}
