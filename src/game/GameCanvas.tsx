/**
 * React ↔ Pixi boundary. React owns WHEN the game exists (mount/unmount with
 * the 'playing' phase) and WHICH sub-scene is active (hub vs dungeon, via
 * store.location). No React state flows in per-frame — game → UI
 * communication goes through the store.
 *
 * Re-keying the effect on `location` recreates the whole Pixi Application on
 * every hub<->dungeon transition — the same StrictMode-safe teardown pattern
 * the template already uses for menu<->playing, just applied one level
 * deeper. Transitions happen a few times per session, not per frame, so the
 * WebGL context churn is cheap relative to the simplicity it buys.
 */
import { useEffect, useRef } from 'react';
import type { Application } from 'pixi.js';
import { createPixiApp } from './pixiApp.ts';
import { createStage, type Stage } from './stage.ts';
import { createHubScene } from './scenes/hubScene.ts';
import { createDungeonScene } from './scenes/dungeonScene.ts';
import type { Scene } from './stage.ts';
import { store, useStore } from '../state/store.ts';
import { aggregateStats } from './systems/inventory.ts';
import {
    dungeonSceneRef,
    enterDungeon,
    onCurrencyEarned,
    onDeath,
    onFloorCleared,
    onRunFloorChange,
    onRunHpChange,
    onRunKillsChange,
} from './dungeonController.ts';

function mountSceneFor(location: 'hub' | 'dungeon', app: Application, stage: Stage): Scene {
    if (location === 'hub') {
        return createHubScene(app, stage, {
            onOpenChest: () => store.patch({ panel: 'inventory' }),
            onOpenRack: () => store.patch({ panel: 'rack' }),
            onOpenStatue: () => store.patch({ panel: 'statue' }),
            onOpenPortal: () => store.patch({ panel: 'portal' }),
            onOpenBlacksmith: () => store.patch({ panel: 'blacksmith' }),
            onEnterDungeon: enterDungeon,
        });
    }

    const { save } = store.get();
    const { stats, weapons, rhunes } = aggregateStats(save);
    const dungeon = createDungeonScene(app, stage, {
        tier: save.selectedTier,
        stats,
        weapons,
        rhunes,
        onHpChange: onRunHpChange,
        onFloorChange: onRunFloorChange,
        onKillsChange: onRunKillsChange,
        onFloorCleared,
        onDeath,
        onCurrencyEarned,
    });
    dungeonSceneRef.current = dungeon;
    return dungeon;
}

export default function GameCanvas() {
    const hostRef = useRef<HTMLDivElement | null>(null);
    const appRef = useRef<Application | null>(null);
    const paused = useStore((s) => s.paused);
    const location = useStore((s) => s.location);

    useEffect(() => {
        let disposed = false;
        let scene: Scene | null = null;
        let stage: Stage | null = null;
        (async () => {
            const app = await createPixiApp(hostRef.current!);
            if (disposed) {
                app.destroy({ removeView: true }, { children: true });
                return;
            }
            appRef.current = app;
            stage = createStage(app);
            scene = mountSceneFor(location, app, stage);
            if (store.get().paused) app.ticker.stop();
        })();
        return () => {
            disposed = true;
            dungeonSceneRef.current = null;
            try { scene?.destroy(); } catch { /* scene already torn down */ }
            try { stage?.destroy(); } catch { /* stage already torn down */ }
            if (appRef.current) {
                appRef.current.destroy({ removeView: true }, { children: true });
                appRef.current = null;
            }
        };
    }, [location]);

    // Host lifecycle pause/resume → freeze/unfreeze the whole ticker.
    useEffect(() => {
        const app = appRef.current;
        if (!app) return;
        if (paused) app.ticker.stop();
        else app.ticker.start();
    }, [paused, location]);

    return <div ref={hostRef} className="absolute inset-0" />;
}
