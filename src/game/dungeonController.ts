/**
 * Bridges the imperative Pixi dungeon scene to the store + persistence.
 * GameCanvas owns creating/destroying the Pixi scene; this module owns what
 * happens to game state when the scene reports an event (floor cleared,
 * death) or when the UI requests a run-ending action (exit to hub).
 */
import { store } from '../state/store.ts';
import type { DungeonScene } from './scenes/dungeonScene.ts';
import type { ItemInstance, RhuneInstance } from './data/types.ts';
import { recordRunEnd } from './systems/progress.ts';
import { saveGame } from './systems/save.ts';

export const dungeonSceneRef: { current: DungeonScene | null } = { current: null };

export function enterDungeon(): void {
    store.patch({
        location: 'dungeon',
        panel: null,
        deathSummary: null,
        run: { floor: 1, hp: 0, maxHp: 0, kills: 0, killsNeeded: 0 },
    });
}

export function onRunHpChange(hp: number, maxHp: number): void {
    const run = store.get().run;
    if (!run) return;
    store.patch({ run: { ...run, hp, maxHp } });
}

export function onRunFloorChange(floor: number): void {
    const run = store.get().run;
    if (!run) return;
    store.patch({ run: { ...run, floor } });
}

export function onRunKillsChange(kills: number, killsNeeded: number): void {
    const run = store.get().run;
    if (!run) return;
    store.patch({ run: { ...run, kills, killsNeeded } });
}

export function onFloorCleared(floor: number, loot: { items: ItemInstance[]; rhunes: RhuneInstance[] }): void {
    const { save } = store.get();
    const nextSave = {
        ...save,
        items: [...save.items, ...loot.items],
        rhunes: [...save.rhunes, ...loot.rhunes],
    };
    store.patch({ save: nextSave });
    void saveGame(nextSave);
    const dropCount = loot.items.length + loot.rhunes.length;
    if (dropCount > 0) {
        store.pushToast(`Floor ${floor} cleared — ${dropCount} drop${dropCount === 1 ? '' : 's'}!`);
    } else {
        store.pushToast(`Floor ${floor} cleared!`);
    }
}

/** Rhune of the Vulture etc — a proc-earned currency drop mid-run. No toast (can fire often); the HUD currency count reflects it once back in the hub. */
export function onCurrencyEarned(amount: number): void {
    const { save } = store.get();
    const nextSave = { ...save, currency: save.currency + amount };
    store.patch({ save: nextSave });
    void saveGame(nextSave);
}

export function onDeath(floorReached: number, elapsedSeconds: number, totalKills: number): void {
    const { save } = store.get();
    const nextSave = recordRunEnd(save, save.selectedTier, floorReached, elapsedSeconds, totalKills);
    dungeonSceneRef.current = null;
    store.patch({
        save: nextSave,
        run: null,
        location: 'hub',
        panel: 'death',
        deathSummary: { floor: floorReached },
    });
    void saveGame(nextSave);
}

export function requestExitToHub(): void {
    const scene = dungeonSceneRef.current;
    const { save } = store.get();
    if (!scene) {
        store.patch({ location: 'hub', panel: null, run: null });
        return;
    }
    const runState = scene.getState();
    const nextSave = recordRunEnd(save, save.selectedTier, runState.floor, runState.elapsedSeconds, runState.totalKills);
    dungeonSceneRef.current = null;
    store.patch({ save: nextSave, run: null, location: 'hub', panel: null });
    void saveGame(nextSave);
}
