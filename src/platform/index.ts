/**
 * Platform layer: everything the game needs from "outside the browser tab",
 * behind one interface. Two backends:
 *
 *   desktop — running inside the Electron shell (desktop/main.cjs). Saves are
 *             real files in the OS user-data folder (Steam Auto-Cloud syncs
 *             them), fullscreen/quit are native, achievements go to Steam.
 *   web     — any browser. Saves in localStorage; fullscreen via the
 *             Fullscreen API; achievements are a no-op.
 *
 * Game code imports `platform` and never checks which one it got.
 */

/** What desktop/preload.cjs exposes on window.rhuneHost. */
interface HostBridge {
    kind: 'desktop';
    version: string;
    devTools: boolean;
    saveRead(key: string): Promise<string | null>;
    saveWrite(key: string, data: string): Promise<void>;
    saveRemove(key: string): Promise<void>;
    getFullscreen(): Promise<boolean>;
    setFullscreen(on: boolean): Promise<void>;
    quit(): void;
    onFlushRequest(cb: () => Promise<void>): void;
    steamStatus(): Promise<{ available: boolean; name?: string }>;
    unlockAchievement(id: string): Promise<boolean>;
}

export interface Platform {
    kind: 'desktop' | 'web';
    storage: {
        get(key: string): Promise<string | null>;
        set(key: string, value: string): Promise<void>;
        remove(key: string): Promise<void>;
    };
    fullscreen: {
        supported: boolean;
        get(): Promise<boolean>;
        set(on: boolean): Promise<void>;
    };
    /** Desktop only: close the game. */
    quit: (() => void) | null;
    /** Register the "about to close" flush (desktop window close, web pagehide). */
    onFlushRequest(cb: () => Promise<void>): void;
    achievements: { unlock(id: string): void };
    steam: { available: boolean; name?: string };
    /** Dev tools (Loot Lab): dev builds, `?dev` on the web, RHUNE_DEVTOOLS=1 on desktop. */
    devTools: boolean;
}

const host = (globalThis as unknown as { rhuneHost?: HostBridge }).rhuneHost;

function webPlatform(): Platform {
    const ls = () => {
        try {
            return window.localStorage;
        } catch {
            return null;
        }
    };
    return {
        kind: 'web',
        storage: {
            async get(key) {
                return ls()?.getItem(key) ?? null;
            },
            async set(key, value) {
                ls()?.setItem(key, value);
            },
            async remove(key) {
                ls()?.removeItem(key);
            },
        },
        fullscreen: {
            supported: !!document.documentElement.requestFullscreen,
            async get() {
                return !!document.fullscreenElement;
            },
            async set(on) {
                try {
                    if (on && !document.fullscreenElement) await document.documentElement.requestFullscreen();
                    if (!on && document.fullscreenElement) await document.exitFullscreen();
                } catch {
                    /* browser refused (needs a user gesture) */
                }
            },
        },
        quit: null,
        onFlushRequest(cb) {
            // Best effort: browsers don't wait for async work on unload.
            window.addEventListener('pagehide', () => void cb());
        },
        achievements: { unlock() {} },
        steam: { available: false },
        devTools: import.meta.env.DEV || new URLSearchParams(location.search).has('dev'),
    };
}

function desktopPlatform(h: HostBridge): Platform {
    const steam: Platform['steam'] = { available: false };
    const unlocked = new Set<string>();
    return {
        kind: 'desktop',
        storage: {
            get: (key) => h.saveRead(key),
            set: (key, value) => h.saveWrite(key, value),
            remove: (key) => h.saveRemove(key),
        },
        fullscreen: { supported: true, get: () => h.getFullscreen(), set: (on) => h.setFullscreen(on) },
        quit: () => h.quit(),
        onFlushRequest: (cb) => h.onFlushRequest(cb),
        achievements: {
            unlock(id) {
                if (unlocked.has(id)) return;
                unlocked.add(id);
                h.unlockAchievement(id).catch(() => unlocked.delete(id));
            },
        },
        steam,
        devTools: import.meta.env.DEV || !!h.devTools,
    };
}

export const platform: Platform = host?.kind === 'desktop' ? desktopPlatform(host) : webPlatform();

/** Ask the host for anything async (Steam status) before the game boots. Never throws. */
export async function initPlatform(): Promise<void> {
    if (!host) return;
    try {
        const s = await host.steamStatus();
        platform.steam.available = s.available;
        platform.steam.name = s.name;
    } catch (err) {
        console.warn('[platform] steam status unavailable', err);
    }
}
