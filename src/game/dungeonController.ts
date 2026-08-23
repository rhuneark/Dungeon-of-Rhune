/**
 * Bridges the imperative Pixi dungeon scene to the store + persistence.
 * GameCanvas owns creating/destroying the Pixi scene; this module owns what
 * happens to game state when the scene reports an event (floor cleared,
 * death) or when the UI requests a run-ending action (exit to hub).
 */
import { store } from '../state/store.ts';
import type { DungeonScene } from './scenes/dungeonScene.ts';
import type { ItemInstance, RhuneInstance } from './data/types.ts';
import type { PillarDef } from './data/pillars.ts';
import { recordRunEnd } from './systems/progress.ts';
import { saveGame } from './systems/save.ts';
import { addLootToBag } from './systems/inventory.ts';
import { buildLevel } from './systems/build.ts';

export const dungeonSceneRef: { current: DungeonScene | null } = { current: null };

export function enterDungeon(): void {
    store.patch({
        location: 'dungeon',
        panel: null,
        deathSummary: null,
        run: { floor: 1, hp: 0, maxHp: 0, kills: 0, killsNeeded: 0, isBossFloor: false, bossHp: 0, bossMaxHp: 0, pillarCount: 0 },
    });
}

export function onRunHpChange(hp: number, maxHp: number): void {
    const run = store.get().run;
    if (!run) return;
    store.patch({ run: { ...run, hp, maxHp } });
}

export function onRunFloorChange(floor: number, isBossFloor: boolean): void {
    const run = store.get().run;
    if (!run) return;
    store.patch({ run: { ...run, floor, isBossFloor, bossHp: 0, bossMaxHp: 0 } });
}

export function onRunKillsChange(kills: number, killsNeeded: number): void {
    const run = store.get().run;
    if (!run) return;
    store.patch({ run: { ...run, kills, killsNeeded } });
}

export function onRunBossHpChange(hp: number, maxHp: number): void {
    const run = store.get().run;
    if (!run) return;
    store.patch({ run: { ...run, bossHp: hp, bossMaxHp: maxHp } });
}

export function onFloorCleared(floor: number, loot: { items: ItemInstance[]; rhunes: RhuneInstance[] }): void {
    const { save } = store.get();
    const { save: nextSave, overflowScrap } = addLootToBag(save, loot);
    store.patch({ save: nextSave });
    void saveGame(nextSave);
    const dropCount = loot.items.length + loot.rhunes.length;
    if (dropCount > 0) {
        const overflowNote = overflowScrap > 0 ? ` (bag full — ${overflowScrap}◆ auto-salvaged)` : '';
        store.pushToast(`Floor ${floor} cleared — ${dropCount} drop${dropCount === 1 ? '' : 's'}!${overflowNote}`);
    } else {
        store.pushToast(`Floor ${floor} cleared!`);
    }
}

export function onPillarChosen(pillar: PillarDef): void {
    const run = store.get().run;
    if (run) store.patch({ run: { ...run, pillarCount: run.pillarCount + 1 } });
    store.pushToast(`Pillar: ${pillar.name} — ${pillar.description}`);
}

/** Rhune of the Vulture etc — a proc-earned currency drop mid-run. No toast (can fire often); the HUD currency count reflects it once back in the hub. */
export function onCurrencyEarned(amount: number): void {
    const { save } = store.get();
    const nextSave = { ...save, currency: save.currency + amount };
    store.patch({ save: nextSave });
    void saveGame(nextSave);
}

function reportLevelUp(beforeXp: number, afterXp: number): void {
    const before = buildLevel(beforeXp);
    const after = buildLevel(afterXp);
    if (after > before) store.pushToast(`Level up! You're now level ${after} — spend the point${after - before === 1 ? '' : 's'} in your Build (C).`);
}

export function onDeath(floorReached: number, elapsedSeconds: number, totalKills: number, bossKills: number): void {
    const { save } = store.get();
    const nextSave = recordRunEnd(save, save.selectedTier, floorReached, elapsedSeconds, totalKills, bossKills);
    dungeonSceneRef.current = null;
    store.patch({
        save: nextSave,
        run: null,
        location: 'hub',
        panel: 'death',
        deathSummary: { floor: floorReached },
    });
    void saveGame(nextSave);
    reportLevelUp(save.build.xp, nextSave.build.xp);
}

export function requestExitToHub(): void {
    const scene = dungeonSceneRef.current;
    const { save } = store.get();
    if (!scene) {
        store.patch({ location: 'hub', panel: null, run: null });
        return;
    }
    const runState = scene.getState();
    const nextSave = recordRunEnd(save, save.selectedTier, runState.floor, runState.elapsedSeconds, runState.totalKills, runState.bossKills);
    dungeonSceneRef.current = null;
    store.patch({ save: nextSave, run: null, location: 'hub', panel: null });
    void saveGame(nextSave);
    reportLevelUp(save.build.xp, nextSave.build.xp);
}
