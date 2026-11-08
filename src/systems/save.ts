/**
 * Persistence through the platform layer: a file in the OS user-data folder
 * on desktop (Steam Auto-Cloud syncs it), localStorage on the web. A
 * save/load failure must never brick the game.
 */
import { hasBase } from '../content/items/bases.ts';
import type { ItemInstance } from '../content/items/types.ts';
import { platform } from '../platform/index.ts';
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
    try {
        raw = await platform.storage.get(SAVE_KEY);
    } catch (err) {
        console.warn('[save] load failed — starting fresh', err);
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
    try {
        await platform.storage.set(SAVE_KEY, JSON.stringify(data));
    } catch (err) {
        console.warn('[save] save failed — will retry on the next save', err);
    }
}

export async function wipeSave(): Promise<void> {
    try {
        await platform.storage.remove(SAVE_KEY);
    } catch {
        /* ignore */
    }
}
