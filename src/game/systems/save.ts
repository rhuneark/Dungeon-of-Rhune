/**
 * Persistence via RundotGameAPI.appStorage — cloud-saved inventory, equipped
 * gear, Rhune sockets, currency, and per-tier unlock/floor-record progress.
 * Posture: every SDK call can reject; never let a save/load failure brick
 * the game — fall back to a fresh SaveData and keep playing.
 */
import RundotGameAPI from '@series-inc/rundot-game-sdk/api';
import { defaultSaveData, type SaveData } from '../data/types.ts';

const SAVE_KEY = 'dor_save_v1';

export async function loadGame(): Promise<SaveData> {
    try {
        const raw = await RundotGameAPI.appStorage.getItem(SAVE_KEY);
        if (!raw) return defaultSaveData();
        const parsed = JSON.parse(raw) as Partial<SaveData>;
        // Merge onto defaults so new fields introduced later never crash old saves.
        return { ...defaultSaveData(), ...parsed };
    } catch (err) {
        console.warn('[save] loadGame failed — starting fresh', err);
        return defaultSaveData();
    }
}

export async function saveGame(data: SaveData): Promise<void> {
    try {
        await RundotGameAPI.appStorage.setItem(SAVE_KEY, JSON.stringify(data));
    } catch (err) {
        console.warn('[save] saveGame failed — progress will retry on next save', err);
    }
}
