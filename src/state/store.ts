/**
 * Tiny external store bridging game code (Pixi ticker, SDK callbacks, plain
 * modules) and React — no state-library dependency. Game code calls
 * store.patch(); React components subscribe with useStore(selector).
 *
 * Keep this store for UI-FACING state only (phase, HUD numbers, popups).
 * Per-frame simulation state stays inside the Pixi scene — patching the
 * store every frame re-renders React every frame.
 */
import { useSyncExternalStore } from 'react';
import { defaultSaveData, type ItemInstance, type RhuneInstance, type SaveData } from '../game/data/types.ts';

export type Phase = 'loading' | 'menu' | 'playing';
export type Location = 'hub' | 'dungeon';
/**
 * 'inventory' is the unified paperdoll + Bag/Chest storage screen (I key defaults it to
 * the 'bag' sub-tab via invTab, the Chest station defaults it to 'chest');
 * 'menu' is the Character/Stats/Gear menu (HUD button, replaces the old Armor Rack station);
 * 'tierSelect' is the dungeon-entry popup (walk to the Dungeon Entrance, replaces the old Tier Statue station);
 * 'build' is the skill tree (C key or walk to the Pillars station).
 */
export type PanelId = 'inventory' | 'menu' | 'tierSelect' | 'portal' | 'blacksmith' | 'merchant' | 'quests' | 'build' | 'death' | null;
export type InventoryTab = 'bag' | 'chest';

export interface RunHud {
    floor: number;
    hp: number;
    maxHp: number;
    kills: number;
    killsNeeded: number;
    isBossFloor: boolean;
    bossHp: number;
    bossMaxHp: number;
    pillarCount: number;
}

export interface Toast {
    id: number;
    text: string;
}

/** The UI-facing app state. */
export interface AppState {
    /** 'loading' → 'menu' → 'playing' */
    phase: Phase;
    /** 0..1 progress of the critical-asset warm during 'loading' */
    loadProgress: number;
    /** Set by the host's onPause/onResume lifecycle hooks */
    paused: boolean;
    /** Which sub-scene GameCanvas mounts while phase === 'playing' */
    location: Location;
    /** Which React overlay panel is open, if any */
    panel: PanelId;
    /** Which sub-tab the Inventory panel opens on — set this right before patching panel:'inventory' */
    invTab: InventoryTab;
    /** The whole persisted save blob: inventory, equipped gear, tier progress, currency */
    save: SaveData;
    /** Live HUD numbers for the current dungeon run, null while in the hub */
    run: RunHud | null;
    /** Summary shown on the death panel */
    deathSummary: { floor: number } | null;
    toasts: Toast[];
}

const listeners = new Set<() => void>();

let toastSeq = 0;

let state: AppState = {
    phase: 'loading',
    loadProgress: 0,
    paused: false,
    location: 'hub',
    panel: null,
    invTab: 'bag',
    save: defaultSaveData(),
    run: null,
    deathSummary: null,
    toasts: [],
};

export const store = {
    /** Read the current state (from game code; in React use useStore). */
    get: (): AppState => state,
    /** Shallow-merge a partial update and notify React subscribers. */
    patch(partial: Partial<AppState>): void {
        state = { ...state, ...partial };
        for (const l of listeners) l();
    },
    subscribe(l: () => void): () => void {
        listeners.add(l);
        return () => listeners.delete(l);
    },
    pushToast(text: string): void {
        toastSeq += 1;
        const toast = { id: toastSeq, text };
        state = { ...state, toasts: [...state.toasts, toast] };
        for (const l of listeners) l();
        setTimeout(() => store.dismissToast(toast.id), 3200);
    },
    dismissToast(id: number): void {
        state = { ...state, toasts: state.toasts.filter((t) => t.id !== id) };
        for (const l of listeners) l();
    },
};

/**
 * React hook. IMPORTANT: the selector must return a primitive or a stable
 * reference (e.g. s => s.phase). Returning a fresh object/array each call
 * makes React re-render forever.
 */
export function useStore<T = AppState>(
    selector: (s: AppState) => T = (s) => s as unknown as T
): T {
    return useSyncExternalStore(store.subscribe, () => selector(state));
}

export type { SaveData, ItemInstance, RhuneInstance };
