/**
 * The live game session: owns the mutable SaveData, bumps store.rev on every
 * change (so React re-reads), unlocks achievements, and autosaves (debounced)
 * through the platform layer.
 */
import { useStore } from './store.ts';
import { store } from './store.ts';
import { defaultSave, type HeroSave, type SaveData } from '../systems/hero.ts';
import { computeSheet, type Sheet } from '../systems/character.ts';
import { saveGame } from '../systems/save.ts';
import { ACHIEVEMENTS } from '../content/achievements.ts';
import { platform } from '../platform/index.ts';

let save: SaveData = defaultSave();
let sheetCache: { rev: number; sheet: Sheet } | null = null;
let saveTimer: ReturnType<typeof setTimeout> | null = null;

export const session = {
    get save(): SaveData {
        return save;
    },
    load(data: SaveData) {
        save = data;
        sheetCache = null;
        store.patch({ rev: store.get().rev + 1 });
    },
    get hasHero(): boolean {
        return !!save.hero;
    },
    get hero(): HeroSave {
        if (!save.hero) throw new Error('no hero');
        return save.hero;
    },
    /** Call after mutating the save. */
    commit() {
        sheetCache = null;
        store.patch({ rev: store.get().rev + 1 });
        for (const a of ACHIEVEMENTS) if (a.check(save)) platform.achievements.unlock(a.id);
        if (saveTimer) clearTimeout(saveTimer);
        saveTimer = setTimeout(() => {
            saveTimer = null;
            void saveGame(save);
        }, 1500);
    },
    /** Immediate flush (lifecycle sleep/quit). */
    async flush() {
        if (saveTimer) clearTimeout(saveTimer);
        saveTimer = null;
        await saveGame(save);
    },
    sheet(): Sheet {
        const rev = store.get().rev;
        if (!sheetCache || sheetCache.rev !== rev) sheetCache = { rev, sheet: computeSheet(session.hero) };
        return sheetCache.sheet;
    },
};

/** Re-render on any save change; returns the session for convenience. */
export function useSession() {
    useStore((s) => s.rev);
    return session;
}
