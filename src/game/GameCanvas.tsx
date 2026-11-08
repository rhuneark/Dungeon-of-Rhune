/**
 * React ↔ Pixi boundary. React owns WHEN the game exists (mount/unmount with
 * the 'playing' phase); Pixi owns the world. View-metric changes resize the
 * renderer in place (no recreate) so the pixel grid stays exact.
 */
import { useEffect, useRef } from 'react';
import type { Application } from 'pixi.js';
import { createPixiApp, resizePixiApp } from './pixiApp.ts';
import { createStage, type Scene, type Stage } from './stage.ts';
import { createTownScene } from './scenes/townScene.ts';
import { THORNWICK } from './world/thornwick.ts';
import { onWorldInteract } from './interact.ts';
import { store, useStore } from '../state/store.ts';
import { dropCursor, pickUp } from '../systems/actions.ts';
import { session } from '../state/session.ts';

export default function GameCanvas() {
    const hostRef = useRef<HTMLDivElement | null>(null);
    const appRef = useRef<Application | null>(null);
    const stageRef = useRef<Stage | null>(null);
    const paused = useStore((s) => s.paused);
    const view = useStore((s) => s.view);

    useEffect(() => {
        let disposed = false;
        let scene: Scene | null = null;
        (async () => {
            const app = await createPixiApp(hostRef.current!, store.get().view);
            if (disposed) {
                app.destroy({ removeView: true }, { children: true });
                return;
            }
            appRef.current = app;
            const stage = createStage(app, store.get().view);
            stageRef.current = stage;
            scene = createTownScene(app, stage, THORNWICK, {
                onInteract: onWorldInteract,
                onPickup: (entry) => {
                    if (entry.drop.kind === 'gold') {
                        session.hero.gold += entry.drop.amount;
                        session.commit();
                        return true;
                    }
                    return pickUp(entry.drop.item);
                },
                onDropCursor: () => {
                    if (!session.hero.cursor) return false;
                    dropCursor();
                    return true;
                },
            });
            if (store.get().paused) app.ticker.stop();
        })();
        return () => {
            disposed = true;
            try {
                scene?.destroy();
            } catch {
                /* already torn down */
            }
            try {
                stageRef.current?.destroy();
            } catch {
                /* already torn down */
            }
            stageRef.current = null;
            if (appRef.current) {
                appRef.current.destroy({ removeView: true }, { children: true });
                appRef.current = null;
            }
        };
    }, []);

    useEffect(() => {
        const app = appRef.current;
        if (!app) return;
        resizePixiApp(app, view);
        stageRef.current?.applyView(view);
    }, [view]);

    useEffect(() => {
        const app = appRef.current;
        if (!app) return;
        if (paused) app.ticker.stop();
        else app.ticker.start();
    }, [paused]);

    return <div ref={hostRef} className="absolute inset-0" />;
}
