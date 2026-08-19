/**
 * Shared movement input for hub + dungeon: WASD/arrow keys, and "hold
 * anywhere, move toward the pointer" for mouse/touch — no drag origin, so
 * clicking down in a different spot each time doesn't change the feel (the
 * old joystick reset its origin per-press, which read as stiff/inconsistent
 * on mouse). Scenes convert the player's world position to screen space via
 * Camera.worldToScreen and point toward pointer.x/y themselves each tick,
 * since only the scene knows where the player currently is.
 */
import type { Application } from 'pixi.js';

const MOVE_KEYS = new Set(['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright']);

export interface PointerState {
    active: boolean;
    x: number;
    y: number;
}

export interface InputTracker {
    pointer: PointerState;
    /** Normalized keyboard direction, {0,0} when no movement key is held. */
    keyboardDir(): { x: number; y: number };
    destroy(): void;
}

export function createInputTracker(app: Application): InputTracker {
    const keys = new Set<string>();
    const pointer: PointerState = { active: false, x: 0, y: 0 };

    const isTypingTarget = (target: EventTarget | null) =>
        target instanceof HTMLElement && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA');

    const onKeyDown = (e: KeyboardEvent) => {
        if (isTypingTarget(e.target)) return;
        const key = e.key.toLowerCase();
        if (MOVE_KEYS.has(key)) e.preventDefault();
        keys.add(key);
    };
    const onKeyUp = (e: KeyboardEvent) => {
        keys.delete(e.key.toLowerCase());
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    app.stage.eventMode = 'static';
    app.stage.hitArea = app.screen;
    const onPointerDown = (e: any) => {
        pointer.active = true;
        pointer.x = e.global.x;
        pointer.y = e.global.y;
    };
    const onPointerMove = (e: any) => {
        pointer.x = e.global.x;
        pointer.y = e.global.y;
    };
    const onPointerUp = () => {
        pointer.active = false;
    };
    app.stage.on('pointerdown', onPointerDown);
    app.stage.on('pointermove', onPointerMove);
    app.stage.on('pointerup', onPointerUp);
    app.stage.on('pointerupoutside', onPointerUp);

    return {
        pointer,
        keyboardDir() {
            let x = 0;
            let y = 0;
            if (keys.has('w') || keys.has('arrowup')) y -= 1;
            if (keys.has('s') || keys.has('arrowdown')) y += 1;
            if (keys.has('a') || keys.has('arrowleft')) x -= 1;
            if (keys.has('d') || keys.has('arrowright')) x += 1;
            const len = Math.hypot(x, y);
            return len > 0 ? { x: x / len, y: y / len } : { x: 0, y: 0 };
        },
        destroy() {
            window.removeEventListener('keydown', onKeyDown);
            window.removeEventListener('keyup', onKeyUp);
            app.stage.off('pointerdown', onPointerDown);
            app.stage.off('pointermove', onPointerMove);
            app.stage.off('pointerup', onPointerUp);
            app.stage.off('pointerupoutside', onPointerUp);
        },
    };
}

/** Shared "hold anywhere, walk toward the pointer" direction math. */
export function pointerMoveDirection(
    pointer: PointerState,
    playerScreen: { x: number; y: number },
    deadzonePx = 6
): { x: number; y: number } | null {
    if (!pointer.active) return null;
    const dx = pointer.x - playerScreen.x;
    const dy = pointer.y - playerScreen.y;
    const dist = Math.hypot(dx, dy);
    if (dist < deadzonePx) return { x: 0, y: 0 };
    return { x: dx / dist, y: dy / dist };
}
