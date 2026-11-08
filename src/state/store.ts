/**
 * Tiny external store bridging game code (Pixi ticker, SDK callbacks, plain
 * modules) and React — no state-library dependency. Game code calls
 * store.patch(); React components subscribe with useStore(selector).
 *
 * UI-FACING state only. The save itself is a mutable object owned by
 * state/session.ts; mutations bump `rev`, which re-renders subscribers.
 */
import { useSyncExternalStore } from 'react';
import { computeViewMetrics, type ViewMetrics } from '../view/viewport.ts';

export type Phase = 'loading' | 'menu' | 'playing';

/** Left-side panels (D2 layout: character/vendor/stash on the left, inventory on the right). */
export type LeftPanel =
    | 'character'
    | 'stash'
    | 'vendor'
    | 'herbs'
    | 'gamble'
    | 'smith'
    | 'codex'
    | 'quests'
    | 'well'
    | 'lab'
    | null;
export type RightPanel = 'inventory' | null;
/** Full-screen overlays. */
export type Overlay = 'skills' | null;

export interface Dialog {
    /** NPC id when talking to a person (drives services + facing). */
    npcId: string | null;
    title: string;
    sub?: string;
    line: string;
    /** Extra lines (quest offers / completions) shown under the greeting. */
    notes: string[];
}

export interface Toast {
    id: number;
    text: string;
    color?: string;
}

export interface AppState {
    phase: Phase;
    loadProgress: number;
    paused: boolean;
    view: ViewMetrics;
    /** Bumped on every save mutation. */
    rev: number;
    left: LeftPanel;
    right: RightPanel;
    overlay: Overlay;
    dialog: Dialog | null;
    /** Which NPC's shop/service is open (vendor stock key). */
    serviceNpc: string | null;
    /** Cursor mode for scrolls: identify the next clicked item. */
    cursorMode: 'identify' | null;
    toasts: Toast[];
    /** Hovered world thing, for the top-of-screen name plate. */
    hoverName: { text: string; color: string; sub?: string } | null;
    /** Dev tools visible (backtick). */
    devTools: boolean;
}

const listeners = new Set<() => void>();
let toastSeq = 0;

let state: AppState = {
    phase: 'loading',
    loadProgress: 0,
    paused: false,
    view: computeViewMetrics(),
    rev: 0,
    left: null,
    right: null,
    overlay: null,
    dialog: null,
    serviceNpc: null,
    cursorMode: null,
    toasts: [],
    hoverName: null,
    devTools: false,
};

const emit = () => {
    for (const l of listeners) l();
};

export const store = {
    get: (): AppState => state,
    patch(partial: Partial<AppState>): void {
        state = { ...state, ...partial };
        emit();
    },
    subscribe(l: () => void): () => void {
        listeners.add(l);
        return () => listeners.delete(l);
    },
    toast(text: string, color?: string): void {
        toastSeq += 1;
        const toast = { id: toastSeq, text, color };
        state = { ...state, toasts: [...state.toasts.slice(-5), toast] };
        emit();
        setTimeout(() => store.dismissToast(toast.id), 3800);
    },
    dismissToast(id: number): void {
        state = { ...state, toasts: state.toasts.filter((t) => t.id !== id) };
        emit();
    },
    /** Close every panel (Esc). Returns true if anything was open. */
    closeAll(): boolean {
        const s = state;
        const any = !!(s.left || s.right || s.overlay || s.dialog || s.cursorMode);
        if (any) store.patch({ left: null, right: null, overlay: null, dialog: null, serviceNpc: null, cursorMode: null });
        return any;
    },
};

/**
 * React hook. The selector must return a primitive or a stable reference
 * (e.g. s => s.phase). Returning a fresh object each call loops forever.
 */
export function useStore<T = AppState>(selector: (s: AppState) => T = (s) => s as unknown as T): T {
    return useSyncExternalStore(store.subscribe, () => selector(state));
}
