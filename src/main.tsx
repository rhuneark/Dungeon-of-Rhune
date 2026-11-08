import React from 'react';
import { createRoot } from 'react-dom/client';
import RundotGameAPI from '@series-inc/rundot-game-sdk/api';
import '@fontsource/jersey-10';
import '@fontsource/jacquarda-bastarda-9';
import '@fontsource/silkscreen';
import App from './ui/App.tsx';
import { store } from './state/store.ts';
import { session } from './state/session.ts';
import { initSdk, registerLifecycles, sdkReady } from './sdk/runSdk.ts';
import { warmAssets } from './assets/preload.ts';
import { loadGame } from './systems/save.ts';
import { simulateDrops } from './systems/loot.ts';
import { registerStatNameResolvers } from './content/stats.ts';
import { getDiscipline, getSkill } from './content/skills/disciplines.ts';
import { QUIRKS } from './content/items/uniques.ts';
import { computeViewMetrics, sameMetrics } from './view/viewport.ts';
import './styles/app.css';

/**
 * Boot sequence. The ORDER here matters — it's the pattern production RUN
 * games use. Keep the numbered steps in this order; add your own work at the
 * marked points.
 */
async function boot() {
    // 0. Wire content cross-references (stat text for "+1 to Cinder Bolt" etc.)
    //    and keep the pixel-perfect view metrics current.
    registerStatNameResolvers({
        skill: (id) => getSkill(id)?.name,
        discipline: (id) => getDiscipline(id)?.name,
        quirk: (id) => QUIRKS[id],
    });
    const onResize = () => {
        const next = computeViewMetrics();
        if (!sameMetrics(next, store.get().view)) store.patch({ view: next });
    };
    window.addEventListener('resize', onResize);
    window.visualViewport?.addEventListener('resize', onResize);
    // DPR changes (moving the window between monitors) don't always fire resize.
    const watchDpr = () => matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`).addEventListener('change', () => (onResize(), watchDpr()), { once: true });
    watchDpr();

    // Dev-only handle for poking at state from the console / automated tests.
    if (import.meta.env.DEV) (window as unknown as Record<string, unknown>).__rhune = { session, store, simulateDrops };

    // 1. SDK first. Nothing may call RundotGameAPI before this resolves.
    await initSdk();

    // 2. Load persisted progress (hero, shared stash, codex) before first render.
    session.load(await loadGame());

    // 3. Mount React. `phase` starts at 'loading'.
    createRoot(document.getElementById('root')!).render(
        <React.StrictMode>
            <App />
        </React.StrictMode>
    );

    // 4. Lift the boot cover once the loading screen has painted.
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            const cover = document.getElementById('boot-cover');
            if (!cover) return;
            cover.classList.add('hidden');
            setTimeout(() => cover.remove(), 400);
        });
    });

    // 5. Warm all art (src/assets/manifest.ts) and the pixel fonts.
    await warmAssets((p) => store.patch({ loadProgress: p }));

    // 6. Loading done — hand over to the menu.
    store.patch({ phase: 'menu' });

    // 7. Host lifecycle hooks. Persist on onSleep; never rely on onQuit; no
    //    fresh SDK RPCs beyond the save from sleep/quit.
    registerLifecycles({
        onPause: () => store.patch({ paused: true }),
        onResume: () => store.patch({ paused: false }),
        onSleep: async () => {
            await session.flush();
        },
        onQuit: async () => {
            await session.flush();
        },
    });
    window.addEventListener('beforeunload', () => void session.flush());

    // 8. Fire-and-forget analytics.
    if (sdkReady()) {
        try {
            RundotGameAPI.analytics.recordCustomEvent('game_loaded');
            RundotGameAPI.analytics.trackFunnelStep(1, 'game_loaded', 'boot', 1);
        } catch (err) {
            console.warn('[Main] boot analytics failed', err);
        }
    }
}

if (document.readyState === 'complete') boot();
else window.addEventListener('load', boot);
