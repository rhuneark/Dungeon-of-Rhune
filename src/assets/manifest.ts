/**
 * Asset manifest — built from the generated art metadata (tools/art/pack.py
 * writes src/assets/art.generated.ts). Files live in public/art/; URLs are
 * relative so they work in dev and in the deployed subdirectory.
 *
 *   - 'critical' — awaited during the loading screen (everything the town
 *                  needs: ~1MB of crisp pixel art).
 *   - 'deferred' — background load after boot (nothing yet).
 */
import type { AssetsManifest, UnresolvedAsset } from 'pixi.js';
import { ART } from './art.generated.ts';

export interface Manifest extends AssetsManifest {
    bundles: { name: string; assets: UnresolvedAsset[] }[];
}

const entries = (kind: keyof typeof ART): UnresolvedAsset[] =>
    Object.keys(ART[kind]).map((name) => ({ alias: `${kind}/${name}`, src: `art/${kind}/${name}.png` }));

export const MANIFEST: Manifest = {
    bundles: [
        { name: 'critical', assets: [...entries('tiles'), ...entries('chars'), ...entries('props'), ...entries('icons')] },
        { name: 'deferred', assets: [] },
    ],
};

export const CRITICAL_BUNDLES: string[] = MANIFEST.bundles.filter((b) => b.name !== 'deferred' && b.assets.length > 0).map((b) => b.name);
export const DEFERRED_BUNDLES: string[] = MANIFEST.bundles.filter((b) => b.name === 'deferred' && b.assets.length > 0).map((b) => b.name);

/** URL of an item icon for <img> tags in the React UI. */
export function iconUrl(name: string): string {
    return `art/icons/${name}.png`;
}
