/**
 * Discipline + skill-tree rules. Mutating helpers return an error string (or
 * null on success) so the UI can explain refusals.
 */
import { DISCIPLINES, getDiscipline, getSkill, MAX_SPECIALIZED, SKILL_LEVEL_CAP, SKILLS } from '../content/skills/disciplines.ts';
import type { DisciplineId } from '../content/skills/disciplineNames.ts';
import type { SkillDef, SkillNode } from '../content/skills/types.ts';
import type { HeroSave } from './hero.ts';
import { skillXpToNext } from './hero.ts';

export type RawStats = Record<string, number>;

export function rankOf(hero: HeroSave, d: DisciplineId): number {
    return hero.ranks[d] ?? 0;
}

export function isChosen(hero: HeroSave, d: DisciplineId): boolean {
    return hero.disciplines.includes(d);
}

export function chooseDiscipline(hero: HeroSave, d: DisciplineId): string | null {
    if (isChosen(hero, d)) return 'Already walking that path.';
    const slot = hero.disciplines.indexOf(null);
    if (slot < 0) return 'You can only follow two Disciplines.';
    if (hero.pathPoints < 1) return 'You need a Path Point.';
    hero.disciplines[slot] = d;
    hero.ranks[d] = 1;
    hero.pathPoints -= 1;
    return null;
}

export function raiseRank(hero: HeroSave, d: DisciplineId): string | null {
    if (!isChosen(hero, d)) return 'Choose this Discipline first.';
    const def = getDiscipline(d)!;
    if (rankOf(hero, d) >= def.maxRank) return 'Already mastered.';
    if (hero.pathPoints < 1) return 'You need a Path Point.';
    hero.ranks[d] = rankOf(hero, d) + 1;
    hero.pathPoints -= 1;
    return null;
}

/** Full refund of one Discipline (free while the game is young — experiment!). */
export function forgetDiscipline(hero: HeroSave, d: DisciplineId): void {
    const slot = hero.disciplines.indexOf(d);
    if (slot < 0) return;
    hero.pathPoints += rankOf(hero, d);
    hero.ranks[d] = 0;
    hero.disciplines[slot] = null;
    for (const s of SKILLS) {
        if (s.discipline === d) {
            delete hero.skills[s.id];
            hero.hotbar = hero.hotbar.map((h) => (h === s.id ? null : h));
        }
    }
}

export function isUnlocked(hero: HeroSave, skill: SkillDef): boolean {
    return isChosen(hero, skill.discipline) && rankOf(hero, skill.discipline) >= skill.unlockRank;
}

export function unlockedSkills(hero: HeroSave): SkillDef[] {
    return SKILLS.filter((s) => isUnlocked(hero, s));
}

export function specializedCount(hero: HeroSave): number {
    return Object.values(hero.skills).filter((s) => s.specialized).length;
}

export function specialize(hero: HeroSave, skillId: string): string | null {
    const skill = getSkill(skillId);
    if (!skill || !isUnlocked(hero, skill)) return 'That skill is not unlocked yet.';
    if (hero.skills[skillId]?.specialized) return null;
    if (specializedCount(hero) >= MAX_SPECIALIZED) return `You can specialize ${MAX_SPECIALIZED} skills at most.`;
    hero.skills[skillId] = { xp: 0, level: 1, specialized: true, nodes: {} };
    return null;
}

export function unspecialize(hero: HeroSave, skillId: string): void {
    delete hero.skills[skillId];
}

/** +skill bonuses from gear: +all, +discipline, +this skill. */
export function skillBonus(skill: SkillDef, raw: RawStats): number {
    return Math.floor((raw.skillAll ?? 0) + (raw[`skillDisc:${skill.discipline}`] ?? 0) + (raw[`skill:${skill.id}`] ?? 0));
}

/** Skill level: specialization level (or 1) plus gear bonuses. */
export function effectiveLevel(hero: HeroSave, skill: SkillDef, raw: RawStats): number {
    const base = hero.skills[skill.id]?.level ?? (isUnlocked(hero, skill) ? 1 : 0);
    return base + skillBonus(skill, raw);
}

export function pointsSpent(hero: HeroSave, skillId: string): number {
    const st = hero.skills[skillId];
    return st ? Object.values(st.nodes).reduce((a, b) => a + b, 0) : 0;
}

/** Tree points: one per specialization level (capped), plus gear bonuses. */
export function pointsAvailable(hero: HeroSave, skill: SkillDef, raw: RawStats): number {
    const st = hero.skills[skill.id];
    if (!st?.specialized) return 0;
    return Math.min(SKILL_LEVEL_CAP, st.level) + skillBonus(skill, raw) - pointsSpent(hero, skill.id);
}

export function nodeRank(hero: HeroSave, skillId: string, nodeId: string): number {
    return hero.skills[skillId]?.nodes[nodeId] ?? 0;
}

export function canAllocate(hero: HeroSave, skill: SkillDef, node: SkillNode, raw: RawStats): string | null {
    const st = hero.skills[skill.id];
    if (!st?.specialized) return 'Specialize this skill first.';
    if (nodeRank(hero, skill.id, node.id) >= node.maxRank) return 'Maxed.';
    if (node.requires && nodeRank(hero, skill.id, node.requires.node) < node.requires.points) {
        const parent = skill.tree.find((x) => x.id === node.requires!.node);
        return `Requires ${node.requires.points} points in ${parent?.name ?? node.requires.node}.`;
    }
    if (pointsAvailable(hero, skill, raw) < 1) return 'No points left — the skill levels up as you gain experience.';
    return null;
}

export function allocate(hero: HeroSave, skill: SkillDef, node: SkillNode, raw: RawStats): string | null {
    const err = canAllocate(hero, skill, node, raw);
    if (err) return err;
    const st = hero.skills[skill.id];
    st.nodes[node.id] = (st.nodes[node.id] ?? 0) + 1;
    return null;
}

export function deallocate(hero: HeroSave, skill: SkillDef, node: SkillNode): string | null {
    const st = hero.skills[skill.id];
    const cur = st?.nodes[node.id] ?? 0;
    if (cur <= 0) return null;
    const dependent = skill.tree.find((x) => x.requires?.node === node.id && (st.nodes[x.id] ?? 0) > 0 && cur - 1 < x.requires.points);
    if (dependent) return `${dependent.name} depends on this.`;
    st.nodes[node.id] = cur - 1;
    if (st.nodes[node.id] === 0) delete st.nodes[node.id];
    return null;
}

/** Specialized skills earn the hero's XP too (Last Epoch). Returns ids that levelled. */
export function grantSkillXp(hero: HeroSave, amount: number): string[] {
    const levelled: string[] = [];
    for (const [id, st] of Object.entries(hero.skills)) {
        if (!st.specialized || st.level >= SKILL_LEVEL_CAP) continue;
        st.xp += amount;
        while (st.level < SKILL_LEVEL_CAP && st.xp >= skillXpToNext(st.level)) {
            st.xp -= skillXpToNext(st.level);
            st.level += 1;
            levelled.push(id);
        }
    }
    return levelled;
}

/** Summed effect values for a skill's allocated nodes (what combat will read). */
export function skillEffects(hero: HeroSave, skillId: string): Record<string, number> {
    const skill = getSkill(skillId);
    const out: Record<string, number> = {};
    if (!skill) return out;
    for (const node of skill.tree) {
        const r = nodeRank(hero, skillId, node.id);
        if (!r) continue;
        for (const e of node.effects) out[e.key] = (out[e.key] ?? 0) + e.perRank * r;
    }
    return out;
}

export { DISCIPLINES };
