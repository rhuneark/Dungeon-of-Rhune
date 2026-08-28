/**
 * Follow-camera that pans stage.root within a fixed world, clamped so the
 * viewport never shows past the world edges (or centers the world when the
 * viewport is bigger than it — e.g. a wide desktop window). stage.ts's
 * existing device-fit scale is untouched; this only adds a position offset
 * on top of it, so "bigger screens render bigger" keeps working for free.
 */
import type { Stage } from './stage.ts';

export interface Camera {
    /** Smoothly move the camera toward a world-space target. Call once per tick. */
    update(targetX: number, targetY: number, dt: number): void;
    /** Convert a world-space point to the current screen-space (CSS px) position. */
    worldToScreen(worldX: number, worldY: number): { x: number; y: number };
    destroy(): void;
}

const FOLLOW_RATE = 8; // per-second exponential convergence — snappy but not stiff

export function createCamera(stage: Stage, worldWidth: number, worldHeight: number): Camera {
    let camX = worldWidth / 2;
    let camY = worldHeight / 2;

    const apply = () => {
        const s = stage.scale();
        const viewportW = stage.designWidth();
        const viewportH = stage.height;
        const halfW = viewportW / 2;
        const halfH = viewportH / 2;
        const clampedX = worldWidth <= viewportW ? worldWidth / 2 : Math.min(Math.max(camX, halfW), worldWidth - halfW);
        const clampedY = worldHeight <= viewportH ? worldHeight / 2 : Math.min(Math.max(camY, halfH), worldHeight - halfH);
        stage.root.position.set(-(clampedX - halfW) * s, -(clampedY - halfH) * s);
    };

    apply();
    const offResize = stage.onResize(apply);

    return {
        update(targetX, targetY, dt) {
            const factor = 1 - Math.exp(-FOLLOW_RATE * dt);
            camX += (targetX - camX) * factor;
            camY += (targetY - camY) * factor;
            apply();
        },
        worldToScreen(worldX, worldY) {
            const s = stage.scale();
            return { x: stage.root.position.x + worldX * s, y: stage.root.position.y + worldY * s };
        },
        destroy() {
            offResize();
        },
    };
}
