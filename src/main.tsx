import React from 'react';
import { createRoot } from 'react-dom/client';
import RundotGameAPI from '@series-inc/rundot-game-sdk/api';
import App from './ui/App.tsx';
import { store } from './state/store.ts';
import { initSdk, registerLifecycles, sdkReady } from './sdk/runSdk.ts';
import { warmAssets } from './assets/preload.ts';
import './styles/app.css';

/**
 * Boot sequence. The ORDER here matters — it's the pattern production RUN
 * games use. Keep the numbered steps in this order; add your own work at the
 * marked points.
 */
async function boot() {
    // 1. SDK first. Nothing may call RundotGameAPI before this resolves.
    //    Resolves even if init fails (local dev outside the RUN host).
    await initSdk();

    // 2. ADAPT: load persisted progress (RundotGameAPI.storage) before first
    //    render, so the first screen can reflect real progress instead of
    //    popping in after a beat. If the game is localized, restore the
    //    language here too — before any UI renders.

    // 3. Mount React. `phase` starts at 'loading', so this paints the
    //    loading screen (progress bar at 0%).
    createRoot(document.getElementById('root')!).render(
        <React.StrictMode>
            <App />
        </React.StrictMode>
    );

    // 4. Lift the boot cover once the loading screen has actually painted
    //    (double-rAF = after the next rendered frame). Asset warming continues
    //    behind it — the player watches the progress bar, not a black screen.
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            const cover = document.getElementById('boot-cover');
            if (!cover) return;
            cover.classList.add('hidden');
            setTimeout(() => cover.remove(), 400); // matches the CSS transition
        });
    });

    // 5. Warm all critical assets (see src/assets/manifest.ts). Deferred
    //    assets keep loading in the background after this resolves.
    await warmAssets((p) => store.patch({ loadProgress: p }));

    // 6. Loading done — hand over to the menu.
    store.patch({ phase: 'menu' });

    // 7. Host lifecycle hooks. Register AFTER boot so handlers never race
    //    half-initialized state.
    //    Rules: persist on onSleep, never rely on onQuit firing, and never
    //    fire fresh SDK RPCs (e.g. scheduling notifications) from
    //    onSleep/onQuit — a hard close kills the runtime before they land.
    registerLifecycles({
        onPause: () => store.patch({ paused: true }),
        onResume: () => store.patch({ paused: false }),
        onSleep: async () => {
            // ADAPT: flush the save here (guarded — never let it throw).
        },
        onQuit: async () => {
            // ADAPT: same flush — but treat onSleep as the reliable one.
        },
    });

    // 8. Post-boot, fire-and-forget work goes here — analytics boot event,
    //    server time refresh, notification re-arming, subscription status
    //    refresh. None of it should block or throw into this function.
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
