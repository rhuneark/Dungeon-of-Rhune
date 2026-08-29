/**
 * Persistence via RundotGameAPI.appStorage — cloud-saved inventory, equipped
 * gear, Rhune sockets, currency, and per-tier unlock/floor-record progress.
 * Posture: every SDK call can reject; never let a save/load failure brick
 * the game — fall back to a fresh SaveData and keep playing.
 */
import RundotGameAPI from '@series-inc/rundot-game-sdk/api';
import { defaultSaveData, type GearSlot, type SaveData } from '../data/types.ts';
import { getBaseType } from '../data/baseTypes.ts';
import { getRhuneDef } from '../data/rhunes.ts';
import { getSkillNode } from '../data/skillTree.ts';

const SAVE_KEY = 'dor_save_v1';

/**
 * Content (base types, Rhunes) gets renamed/removed as the game evolves, but
 * old saves can still reference those ids. Drop orphaned items/rhunes and
 * clear any equip slot pointing at them so stale ids never reach a lookup
 * that expects them to exist.
 */
function sanitizeSave(save: SaveData): SaveData {
    const items = save.items.filter((item) => getBaseType(item.baseTypeId) !== undefined);
    const rhunes = save.rhunes.filter((rhune) => getRhuneDef(rhune.rhuneDefId) !== undefined);
    const bag = save.bag.filter((item) => getBaseType(item.baseTypeId) !== undefined);
    const bagRhunes = save.bagRhunes.filter((rhune) => getRhuneDef(rhune.rhuneDefId) !== undefined);
    const itemIds = new Set(items.map((i) => i.instanceId));
    const rhuneIds = new Set(rhunes.map((r) => r.instanceId));

    const equipped = { ...save.equipped };
    for (const slot of Object.keys(equipped) as GearSlot[]) {
        if (equipped[slot] && !itemIds.has(equipped[slot]!)) equipped[slot] = null;
    }
    const equippedRhunes = save.equippedRhunes.map((id) => (id && rhuneIds.has(id) ? id : null)) as SaveData['equippedRhunes'];
    const bonusRhuneSocket = save.bonusRhuneSocket && rhuneIds.has(save.bonusRhuneSocket) ? save.bonusRhuneSocket : null;

    // The skill tree gets rebalanced over time too — drop ranks on node ids that no longer exist.
    const ranks = Object.fromEntries(Object.entries(save.build.ranks).filter(([id]) => getSkillNode(id) !== undefined));

    return { ...save, items, rhunes, bag, bagRhunes, equipped, equippedRhunes, bonusRhuneSocket, build: { ...save.build, ranks } };
}

export async function loadGame(): Promise<SaveData> {
    try {
        const raw = await RundotGameAPI.appStorage.getItem(SAVE_KEY);
        if (!raw) return defaultSaveData();
        const parsed = JSON.parse(raw) as Partial<SaveData>;
        // Merge onto defaults so new fields introduced later never crash old saves.
        return sanitizeSave({ ...defaultSaveData(), ...parsed });
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
