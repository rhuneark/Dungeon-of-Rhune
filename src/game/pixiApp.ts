/**
 * Pixi v8 Application factory, configured for crisp pixel art:
 * nearest-neighbour textures, no antialiasing, rounded pixels, and a
 * renderer sized explicitly from the device-pixel-aligned view metrics
 * (resizeTo would round to CSS px and blur on fractional DPRs).
 */
import { Application, TextureStyle } from 'pixi.js';
// The desktop build runs under a strict Content-Security-Policy (no eval);
// this swaps Pixi's generated shader/uniform code for precompiled versions.
import 'pixi.js/unsafe-eval';
import type { ViewMetrics } from '../view/viewport.ts';

TextureStyle.defaultOptions.scaleMode = 'nearest';

export async function createPixiApp(host: HTMLElement, view: ViewMetrics): Promise<Application> {
    const app = new Application();
    await app.init({
        width: view.cssW,
        height: view.cssH,
        resolution: view.dpr,
        autoDensity: true,
        antialias: false,
        roundPixels: true,
        backgroundColor: 0x0d0b09,
    });
    app.canvas.style.imageRendering = 'pixelated';
    host.appendChild(app.canvas);
    return app;
}

export function resizePixiApp(app: Application, view: ViewMetrics): void {
    app.renderer.resolution = view.dpr;
    app.renderer.resize(view.cssW, view.cssH);
}
