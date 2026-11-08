/**
 * The persisted save: one hero (multi-slot later), a shared stash, and
 * account-wide records (the Codex). Plain JSON; ItemInstances inside.
 */
import type { EquipSlot, ItemInstance } from '../content/items/types.ts';
import type { DisciplineId } from '../content/skills/disciplineNames.ts';
import { createItem } from './itemGen.ts';
import { createRng } from './rng.ts';

export type Attr = 'might' | 'finesse' | 'vigor' | 'spirit';
export const ATTRS: Attr[] = ['might', 'finesse', 'vigor', 'spirit'];
export const ATTR_INFO: Record<Attr, { name: string; desc: string }> = {
    might: { name: 'Might', desc: '+1% physical damage, gear requirements' },
    finesse: { name: 'Finesse', desc: '+1% attack speed per 5, +0.2% crit per point' },
    vigor: { name: 'Vigor', desc: '+3 life per point' },
    spirit: { name: 'Spirit', desc: '+2 mana per point, +1% spell damage per 2' },
};

export interface SkillState {
    /** Skill XP while specialized. */
    xp: number;
    level: number;
    specialized: boolean;
    nodes: Record<string, number>;
}

export interface QuestState {
    state: 'active' | 'done';
    progress: Record<string, number>;
}

export interface HeroSave {
    name: string;
    createdAt: number;
    level: number;
    xp: number;
    gold: number;
    attrs: Record<Attr, number>;
    attrPoints: number;
    pathPoints: number;
    disciplines: [DisciplineId | null, DisciplineId | null];
    ranks: Partial<Record<DisciplineId, number>>;
    skills: Record<string, SkillState>;
    hotbar: (string | null)[];
    equipped: Partial<Record<EquipSlot, ItemInstance>>;
    inventory: ItemInstance[];
    cursor: ItemInstance | null;
    quests: Record<string, QuestState>;
    lore: string[];
    flags: Record<string, number>;
    life: number;
    mana: number;
    /** Quest-world items already picked up (so placed pages don't respawn). */
    taken: string[];
    /** Brannoc's crucible contents (3x4 grid). */
    crucible: ItemInstance[];
}

export interface CodexEntry {
    at: number;
    /** Best roll seen, as a 0..1 score — perfect-roll hunting. */
    best: number;
}

export interface SaveData {
    version: 1;
    hero: HeroSave | null;
    /** Shared stash grid (10x10). */
    stash: ItemInstance[];
    /** First-find records: unique ids, rhuneword ids, rhune ids. */
    codex: Record<string, CodexEntry>;
    stats: { gambles: number; wishes: number; identified: number; uniquesFound: number; rhunesFound: number };
}

export const INV_W = 10;
export const INV_H = 4;
export const STASH_W = 10;
export const STASH_H = 10;
export const CRUCIBLE_W = 3;
export const CRUCIBLE_H = 4;

export function defaultSave(): SaveData {
    return {
        version: 1,
        hero: null,
        stash: [],
        codex: {},
        stats: { gambles: 0, wishes: 0, identified: 0, uniquesFound: 0, rhunesFound: 0 },
    };
}

/** XP to go from `level` to `level + 1`. */
export function xpToNext(level: number): number {
    return Math.floor(120 * Math.pow(level, 1.75) + 180);
}

/** Skill XP to go from skill level n to n + 1 (specialized skills earn hero XP). */
export function skillXpToNext(level: number): number {
    return Math.floor(90 * Math.pow(level, 1.55) + 110);
}

export const ATTR_POINTS_PER_LEVEL = 5;
export const PATH_POINTS_PER_LEVEL = 1;
export const MAX_LEVEL = 40;

export function newHero(name: string): HeroSave {
    const rng = createRng();
    const hero: HeroSave = {
        name: name.trim() || 'Wanderer',
        createdAt: Date.now(),
        level: 1,
        xp: 0,
        gold: 400,
        attrs: { might: 10, finesse: 10, vigor: 10, spirit: 10 },
        attrPoints: 0,
        // One point so the player can pick a first Discipline right away.
        pathPoints: 1,
        disciplines: [null, null],
        ranks: {},
        skills: {},
        hotbar: [null, null, null, null, null],
        equipped: {},
        inventory: [],
        cursor: null,
        quests: {},
        lore: [],
        flags: {},
        life: 1,
        mana: 1,
        taken: [],
        crucible: [],
    };
    // Starter kit: plain, honest gear.
    hero.equipped.weapon = createItem('short_sword', { ilvl: 1, quality: 'normal', rng });
    hero.equipped.chest = createItem('quilted_armor', { ilvl: 1, quality: 'normal', rng });
    hero.equipped.offhand = createItem('buckler', { ilvl: 1, quality: 'normal', rng });
    hero.equipped.weapon.sockets = 0;
    hero.equipped.chest.sockets = 0;
    hero.equipped.offhand.sockets = 0;
    const start: [string, number, number][] = [
        ['potion_health', 0, 0],
        ['potion_health', 1, 0],
        ['potion_mana', 2, 0],
        ['scroll_identify', 3, 0],
    ];
    for (const [id, x, y] of start) {
        const it = createItem(id, { ilvl: 1, rng });
        it.x = x;
        it.y = y;
        hero.inventory.push(it);
    }
    return hero;
}
