/**
 * Narrow bridge from game systems / React UI into the live Pixi scene,
 * filled in by whichever scene is mounted. Default no-ops keep systems
 * callable while no scene exists (menu, tests).
 */
import type { Drop } from '../systems/loot.ts';

export type DropOrigin = 'player' | 'well' | { x: number; y: number };

export interface WorldBridge {
    /** Spill drops onto the ground with the D2 "pop". */
    spawnDrops(drops: Drop[], origin: DropOrigin): void;
    /** Floating text over the player (or a world point). */
    floatText(text: string, color: string, at?: { x: number; y: number }): void;
}

export const worldBridge: WorldBridge = {
    spawnDrops: () => {},
    floatText: () => {},
};

export function bindWorld(impl: WorldBridge): () => void {
    Object.assign(worldBridge, impl);
    return () => {
        worldBridge.spawnDrops = () => {};
        worldBridge.floatText = () => {};
    };
}
