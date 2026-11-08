/**
 * Persistence via RundotGameAPI.appStorage (cloud) with a localStorage
 * fallback for plain-browser dev. Posture: every SDK call can reject; a
 * save/load failure must never brick the game.
 */
import RundotGameAPI from '@series-inc/rundot-game-sdk/api';
import { hasBase } from '../content/items/bases.ts';
import type { ItemInstance } from '../content/items/types.ts';
import { sdkReady } from '../sdk/runSdk.ts';
import { defaultSave, type SaveData } from './hero.ts';

const SAVE_KEY = 'rhune_save_v1';

/** Drop items whose base no longer exists (content gets renamed as the game evolves). */
function cleanItems(items: ItemInstance[]): ItemInstance[] {
    return items.filter((it) => hasBase(it.baseId)).map((it) => ({ ...it, socketed: cleanItems(it.socketed ?? []) }));
}

function sanitize(raw: Partial<SaveData>): SaveData {
    const save: SaveData = { ...defaultSave(), ...raw, stats: { ...defaultSave().stats, ...(raw.stats ?? {}) } };
    save.stash = cleanItems(save.stash ?? []);
    if (save.hero) {
        const h = save.hero;
        h.inventory = cleanItems(h.inventory ?? []);
        for (const k of Object.keys(h.equipped ?? {}) as (keyof typeof h.equipped)[]) {
            const it = h.equipped[k];
            if (!it || !hasBase(it.baseId)) delete h.equipped[k];
        }
        if (h.cursor && !hasBase(h.cursor.baseId)) h.cursor = null;
        h.taken ??= [];
        h.flags ??= {};
        h.lore ??= [];
        h.crucible = cleanItems(h.crucible ?? []);
    }
    return save;
}

export async function loadGame(): Promise<SaveData> {
    let raw: string | null = null;
    if (sdkReady()) {
        try {
            raw = await RundotGameAPI.appStorage.getItem(SAVE_KEY);
        } catch (err) {
            console.warn('[save] appStorage load failed', err);
        }
    }
    if (!raw) {
        try {
            raw = localStorage.getItem(SAVE_KEY);
        } catch {
            /* private mode */
        }
    }
    if (!raw) return defaultSave();
    try {
        return sanitize(JSON.parse(raw) as Partial<SaveData>);
    } catch (err) {
        console.warn('[save] corrupt save — starting fresh', err);
        return defaultSave();
    }
}

export async function saveGame(data: SaveData): Promise<void> {
    const json = JSON.stringify(data);
    try {
        localStorage.setItem(SAVE_KEY, json);
    } catch {
        /* quota / private mode */
    }
    if (!sdkReady()) return;
    try {
        await RundotGameAPI.appStorage.setItem(SAVE_KEY, json);
    } catch (err) {
        console.warn('[save] appStorage save failed — will retry next save', err);
    }
}

export async function wipeSave(): Promise<void> {
    try {
        localStorage.removeItem(SAVE_KEY);
    } catch {
        /* ignore */
    }
    if (!sdkReady()) return;
    try {
        await RundotGameAPI.appStorage.removeItem(SAVE_KEY);
    } catch {
        /* ignore */
    }
}
