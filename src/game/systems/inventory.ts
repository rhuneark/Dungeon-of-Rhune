import type { GearSlot, ItemInstance, RhuneInstance, SaveData, StatBlock } from '../data/types.ts';
import { slotAcceptsKind } from '../data/types.ts';
import { getBaseType } from '../data/baseTypes.ts';
import { AFFIX_POOLS } from '../data/affixes.ts';
import { RARITIES } from '../data/rarity.ts';
import { getRhuneDef } from '../data/rhunes.ts';

/** Base combat stats before any gear/rhunes are applied. */
export const BASE_PLAYER_STATS: Required<StatBlock> = {
    damage: 0,
    fireRate: 0,
    aoeRadius: 0,
    projectileSpeed: 0,
    maxHp: 40,
    moveSpeed: 220,
    armor: 0,
    critChance: 0.05,
    lifesteal: 0,
    magnetRadius: 50,
};

export function findAffixDef(affixId: string) {
    for (const pool of Object.values(AFFIX_POOLS)) {
        const found = pool.find((a) => a.id === affixId);
        if (found) return found;
    }
    return undefined;
}

/** Flat stat contribution of one item instance: base stats + rolled affixes. */
export function itemStats(item: ItemInstance): Partial<StatBlock> {
    const base = getBaseType(item.baseTypeId);
    const out: Partial<StatBlock> = { ...base.baseStats };
    for (const rolled of item.affixes) {
        const def = findAffixDef(rolled.affixId);
        if (!def) continue;
        out[def.stat] = (out[def.stat] ?? 0) + rolled.value;
    }
    return out;
}

export function rhuneStats(rhune: RhuneInstance): Partial<StatBlock> {
    const def = getRhuneDef(rhune.rhuneDefId);
    const mult = RARITIES[rhune.rarity].valueMult;
    return { [def.stat]: def.baseValue * mult } as Partial<StatBlock>;
}

/** A hand-slot weapon ready to drive an attack loop in the dungeon scene. */
export interface EquippedWeapon {
    slot: 'hand1' | 'hand2';
    item: ItemInstance;
    role: NonNullable<ReturnType<typeof getBaseType>['role']>;
    stats: Partial<StatBlock>;
}

export interface AggregateResult {
    stats: Required<StatBlock>;
    weapons: EquippedWeapon[];
}

/** Sum base stats + every equipped item + every socketed rhune into final player stats. */
export function aggregateStats(save: SaveData): AggregateResult {
    const stats: Required<StatBlock> = { ...BASE_PLAYER_STATS };
    const weapons: EquippedWeapon[] = [];

    for (const slot of Object.keys(save.equipped) as GearSlot[]) {
        const itemId = save.equipped[slot];
        if (!itemId) continue;
        const item = save.items.find((i) => i.instanceId === itemId);
        if (!item) continue;
        const s = itemStats(item);
        for (const [k, v] of Object.entries(s)) {
            (stats as any)[k] = ((stats as any)[k] ?? 0) + (v as number);
        }
        if (slot === 'hand1' || slot === 'hand2') {
            const base = getBaseType(item.baseTypeId);
            if (base.role && base.role !== 'shield') {
                weapons.push({ slot, item, role: base.role, stats: s });
            }
        }
    }

    for (const rhuneId of save.equippedRhunes) {
        if (!rhuneId) continue;
        const rhune = save.rhunes.find((r) => r.instanceId === rhuneId);
        if (!rhune) continue;
        const s = rhuneStats(rhune);
        for (const [k, v] of Object.entries(s)) {
            (stats as any)[k] = ((stats as any)[k] ?? 0) + (v as number);
        }
    }

    stats.critChance = Math.min(stats.critChance, 0.75);
    stats.lifesteal = Math.min(stats.lifesteal, 0.5);
    return { stats, weapons };
}

export function canEquip(item: ItemInstance, slot: GearSlot): boolean {
    const base = getBaseType(item.baseTypeId);
    return slotAcceptsKind(slot, base.kind);
}

export function equipItem(save: SaveData, itemId: string, slot: GearSlot): SaveData {
    const item = save.items.find((i) => i.instanceId === itemId);
    if (!item || !canEquip(item, slot)) return save;
    return { ...save, equipped: { ...save.equipped, [slot]: itemId } };
}

export function unequipSlot(save: SaveData, slot: GearSlot): SaveData {
    return { ...save, equipped: { ...save.equipped, [slot]: null } };
}

export function equipRhune(save: SaveData, rhuneId: string, socket: 0 | 1 | 2): SaveData {
    const next = [...save.equippedRhunes] as SaveData['equippedRhunes'];
    next[socket] = rhuneId;
    return { ...save, equippedRhunes: next };
}

export function unequipRhune(save: SaveData, socket: 0 | 1 | 2): SaveData {
    const next = [...save.equippedRhunes] as SaveData['equippedRhunes'];
    next[socket] = null;
    return { ...save, equippedRhunes: next };
}

export function salvageValue(item: ItemInstance): number {
    return RARITIES[item.rarity].salvageValue;
}

export function salvageItem(save: SaveData, itemId: string): SaveData {
    const item = save.items.find((i) => i.instanceId === itemId);
    if (!item) return save;
    const equipped = { ...save.equipped };
    for (const slot of Object.keys(equipped) as GearSlot[]) {
        if (equipped[slot] === itemId) equipped[slot] = null;
    }
    return {
        ...save,
        currency: save.currency + salvageValue(item),
        items: save.items.filter((i) => i.instanceId !== itemId),
        equipped,
    };
}

export function isItemEquipped(save: SaveData, itemId: string): GearSlot | null {
    for (const slot of Object.keys(save.equipped) as GearSlot[]) {
        if (save.equipped[slot] === itemId) return slot;
    }
    return null;
}

export function isRhuneEquipped(save: SaveData, rhuneId: string): number {
    return save.equippedRhunes.findIndex((id) => id === rhuneId);
}

/** v1 UX default: pick a sensible open slot rather than prompting the player to choose. */
export function autoEquipSlot(save: SaveData, item: ItemInstance): GearSlot {
    const base = getBaseType(item.baseTypeId);
    if (base.kind === 'hand') return save.equipped.hand1 ? 'hand2' : 'hand1';
    if (base.kind === 'jewelry') return save.equipped.jewelry1 ? 'jewelry2' : 'jewelry1';
    return base.kind as GearSlot;
}

export function autoEquipRhuneSocket(save: SaveData): 0 | 1 | 2 {
    const idx = save.equippedRhunes.findIndex((r) => r === null);
    return (idx === -1 ? 0 : idx) as 0 | 1 | 2;
}

export function salvageRhune(save: SaveData, rhuneId: string): SaveData {
    const rhune = save.rhunes.find((r) => r.instanceId === rhuneId);
    if (!rhune) return save;
    const equippedRhunes = save.equippedRhunes.map((id) => (id === rhuneId ? null : id)) as SaveData['equippedRhunes'];
    return {
        ...save,
        currency: save.currency + RARITIES[rhune.rarity].salvageValue,
        rhunes: save.rhunes.filter((r) => r.instanceId !== rhuneId),
        equippedRhunes,
    };
}
