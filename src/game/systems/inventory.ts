import type { GearSlot, ItemInstance, SaveData, StatBlock } from '../data/types.ts';
import { slotAcceptsKind } from '../data/types.ts';
import { getBaseType } from '../data/baseTypes.ts';
import { findAffixDef } from '../data/affixes.ts';
import { RARITIES } from '../data/rarity.ts';
import { resolveEquippedRhunes, statModContribution, type ResolvedRhune } from './rhuneRuntime.ts';
import { resolveItemProcAffixes, type ResolvedProcAffix } from './procAffixRuntime.ts';

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
    critDamage: 0,
    lifesteal: 0,
    magnetRadius: 50,
    projectileCount: 0,
    pierce: 0,
    thorns: 0,
    dodgeChance: 0,
    damageReduction: 0,
    fireDamage: 0,
    iceDamage: 0,
    lightningDamage: 0,
    poisonDamage: 0,
    arcaneDamage: 0,
    healOnKill: 0,
    reviveChance: 0,
    luck: 0,
    salvageBonus: 0,
    floorHealPct: 0,
    invulnDuration: 0,
    knockback: 0,
    regen: 0,
    splashRadius: 0,
};

/** Flat stat contribution of one item instance: base stats + rolled STAT affixes (proc affixes are behavioral, not summed here). */
export function itemStats(item: ItemInstance): Partial<StatBlock> {
    const base = getBaseType(item.baseTypeId);
    const out: Partial<StatBlock> = { ...base.baseStats };
    for (const rolled of item.affixes) {
        const def = findAffixDef(rolled.affixId);
        if (!def || def.kind !== 'stat') continue;
        out[def.stat] = (out[def.stat] ?? 0) + rolled.value;
    }
    return out;
}

/** A hand-slot weapon ready to drive an attack loop in the dungeon scene. */
export interface EquippedWeapon {
    slot: 'hand1' | 'hand2';
    item: ItemInstance;
    role: NonNullable<ReturnType<typeof getBaseType>['role']>;
    element: NonNullable<ReturnType<typeof getBaseType>['element']>;
    stats: Partial<StatBlock>;
}

export interface AggregateResult {
    stats: Required<StatBlock>;
    weapons: EquippedWeapon[];
    /** Non-statMod rhunes (procs/trails/amps/auras) for dungeonScene's rhune runtime. */
    rhunes: ResolvedRhune[];
    /** Every "X% chance on ___ to ___" proc affix across all equipped gear. */
    procAffixes: ResolvedProcAffix[];
}

/** Sum base stats + every equipped item + every socketed rhune into final player stats. */
export function aggregateStats(save: SaveData): AggregateResult {
    const stats: Required<StatBlock> = { ...BASE_PLAYER_STATS };
    const weapons: EquippedWeapon[] = [];
    const equippedItems: ItemInstance[] = [];

    for (const slot of Object.keys(save.equipped) as GearSlot[]) {
        const itemId = save.equipped[slot];
        if (!itemId) continue;
        const item = save.items.find((i) => i.instanceId === itemId);
        if (!item) continue;
        equippedItems.push(item);
        const s = itemStats(item);
        for (const [k, v] of Object.entries(s)) {
            (stats as any)[k] = ((stats as any)[k] ?? 0) + (v as number);
        }
        if (slot === 'hand1' || slot === 'hand2') {
            const base = getBaseType(item.baseTypeId);
            if (base.role && base.role !== 'shield') {
                weapons.push({ slot, item, role: base.role, element: base.element ?? 'physical', stats: s });
            }
        }
    }

    const resolvedRhunes = resolveEquippedRhunes(save);
    for (const resolved of resolvedRhunes) {
        const s = statModContribution(resolved);
        for (const [k, v] of Object.entries(s)) {
            (stats as any)[k] = ((stats as any)[k] ?? 0) + (v as number);
        }
    }

    stats.critChance = Math.min(stats.critChance, 0.75);
    stats.lifesteal = Math.min(stats.lifesteal, 0.5);
    stats.dodgeChance = Math.min(stats.dodgeChance, 0.6);
    stats.damageReduction = Math.min(stats.damageReduction, 0.75);
    stats.reviveChance = Math.min(stats.reviveChance, 0.75);
    return { stats, weapons, rhunes: resolvedRhunes, procAffixes: resolveItemProcAffixes(equippedItems) };
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

export function salvageValue(item: ItemInstance, salvageBonus = 0): number {
    return Math.round(RARITIES[item.rarity].salvageValue * (1 + salvageBonus));
}

export function salvageItem(save: SaveData, itemId: string): SaveData {
    const item = save.items.find((i) => i.instanceId === itemId);
    if (!item) return save;
    const equipped = { ...save.equipped };
    for (const slot of Object.keys(equipped) as GearSlot[]) {
        if (equipped[slot] === itemId) equipped[slot] = null;
    }
    const bonus = aggregateStats(save).stats.salvageBonus;
    return {
        ...save,
        currency: save.currency + salvageValue(item, bonus),
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
    const bonus = aggregateStats(save).stats.salvageBonus;
    return {
        ...save,
        currency: save.currency + Math.round(RARITIES[rhune.rarity].salvageValue * (1 + bonus)),
        rhunes: save.rhunes.filter((r) => r.instanceId !== rhuneId),
        equippedRhunes,
    };
}
