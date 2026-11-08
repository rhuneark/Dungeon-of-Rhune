/**
 * Skill system model — a homage blend:
 *  - Grim Dawn: pick up to TWO Disciplines. Path Points (from levels and lore
 *    quests) raise a Discipline's rank; each rank grants passive stats and
 *    rank thresholds unlock its skills. Every pair has a combo title.
 *  - Last Epoch: each skill has its OWN specialization tree. Specialize up to
 *    5 skills; specialized skills gain XP as you do and every skill level is
 *    one tree point. Items with +skills add points too.
 *
 * Tree nodes are data: `effects` are {key, perRank} pairs the combat layer
 * reads later ('damagePct', 'projectiles', 'convert:fire>cold', ...). Keys
 * prefixed with 'stat:' are plain hero stats and apply right now.
 */
import type { DamageTag, DamageType, StatMod } from '../stats.ts';
import type { DisciplineId } from './disciplineNames.ts';

export type SkillKind = 'attack' | 'spell' | 'passive' | 'buff' | 'summon' | 'movement';

export interface SkillEffect {
    key: string;
    perRank: number;
}

export interface SkillNode {
    id: string;
    name: string;
    maxRank: number;
    /** Grid position in the tree view. */
    col: number;
    row: number;
    requires?: { node: string; points: number };
    /** Shown with {v} replaced by perRank * rank of the FIRST effect. */
    text: string;
    effects: SkillEffect[];
}

export interface SkillDef {
    id: string;
    name: string;
    discipline: DisciplineId;
    /** Discipline rank needed to learn it. */
    unlockRank: number;
    kind: SkillKind;
    damageType?: DamageType;
    tags: DamageTag[];
    description: string;
    /** Short base numbers for the tooltip ("Mana: 8", "Weapon Damage: 140%"). */
    baseInfo: string[];
    /** Passive skills: hero stats per skill level. */
    passivePerLevel?: StatMod[];
    tree: SkillNode[];
}

export interface DisciplineDef {
    id: DisciplineId;
    name: string;
    tagline: string;
    color: string;
    /** Stats per rank (the Grim Dawn "mastery bar"). */
    perRank: StatMod[];
    maxRank: number;
    lore: string;
}
