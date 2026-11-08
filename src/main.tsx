import React from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/jersey-10';
import '@fontsource/jacquarda-bastarda-9';
import '@fontsource/silkscreen';
import App from './ui/App.tsx';
import { store } from './state/store.ts';
import { session } from './state/session.ts';
import { initPlatform, platform } from './platform/index.ts';
import { warmAssets } from './assets/preload.ts';
import { loadGame } from './systems/save.ts';
import { simulateDrops } from './systems/loot.ts';
import { registerStatNameResolvers } from './content/stats.ts';
import { getDiscipline, getSkill } from './content/skills/disciplines.ts';
import { QUIRKS } from './content/items/uniques.ts';
import { computeViewMetrics, sameMetrics } from './view/viewport.ts';
import './styles/app.css';

/**
 * Boot sequence. Keep the numbered steps in this order.
 */
async function boot() {
    // 0. Content cross-references (stat text for "+1 to Cinder Bolt" etc.)
    //    and pixel-perfect view metrics that track the window.
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
    if (import.meta.env.DEV) (window as unknown as Record<string, unknown>).__rhune = { session, store, simulateDrops, platform };

    // 1. Platform (desktop shell + Steam, or plain browser). Never throws.
    await initPlatform();

    // 2. Load the save (hero, shared stash, codex) before first render.
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

    // 7. Lifecycle: pause the world while the window is hidden/minimized and
    //    save on the way out; the desktop shell waits for this flush on close.
    document.addEventListener('visibilitychange', () => {
        const hidden = document.visibilityState === 'hidden';
        store.patch({ paused: hidden });
        if (hidden) void session.flush();
    });
    platform.onFlushRequest(() => session.flush());
}

if (document.readyState === 'complete') boot();
else window.addEventListener('load', boot);
