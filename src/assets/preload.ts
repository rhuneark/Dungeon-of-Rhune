/**
 * Asset warming via Pixi Assets. Awaited during the loading screen (critical
 * bundle, with progress), then background-loads the deferred bundle. Also
 * forces the pixel fonts to load so Pixi Text never renders a fallback font.
 *
 * Failure posture: a missing asset must never brick boot.
 */
import { Assets } from 'pixi.js';
import { MANIFEST, CRITICAL_BUNDLES, DEFERRED_BUNDLES } from './manifest.ts';

export const FONT_BODY = 'Jersey 10';
export const FONT_TITLE = 'Jacquarda Bastarda 9';
export const FONT_SMALL = 'Silkscreen';

export async function warmAssets(onProgress: (progress: number) => void = () => {}): Promise<void> {
    try {
        await Assets.init({ manifest: MANIFEST });
        if (CRITICAL_BUNDLES.length > 0) await Assets.loadBundle(CRITICAL_BUNDLES, (p) => onProgress(p * 0.95));
        if (DEFERRED_BUNDLES.length > 0) Assets.backgroundLoadBundle(DEFERRED_BUNDLES);
    } catch (err) {
        console.warn('[preload] asset warm failed — continuing without', err);
    }
    try {
        await Promise.all([
            document.fonts.load(`10px "${FONT_BODY}"`),
            document.fonts.load(`20px "${FONT_BODY}"`),
            document.fonts.load(`18px "${FONT_TITLE}"`),
            document.fonts.load(`8px "${FONT_SMALL}"`),
        ]);
        await document.fonts.ready;
    } catch {
        /* older engines */
    }
    onProgress(1);
}
