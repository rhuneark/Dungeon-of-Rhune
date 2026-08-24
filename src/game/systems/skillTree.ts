/**
 * Leveling, point allocation, and respec for the passive skill tree (see
 * data/skillTree.ts for the branch/node definitions). Level — and therefore
 * points available — is always DERIVED from lifetime xp rather than stored,
 * so it can never drift out of sync with a saved node list. Points are
 * soft-capped: xp (and the level number) can keep climbing forever since
 * floors are endless, but points stop being granted past POINT_CAP — "the
 * tree stops growing," not the character.
 */
import type { SaveData } from '../data/types.ts';
import { getSkillNode, type SkillBranchId, type SkillNodeDef } from '../data/skillTree.ts';
import type { StatBlock } from '../data/types.ts';

/** Roughly level 50-60 worth of points, depending on how XP is earned — the soft cap the brief asked for. */
export const POINT_CAP = 55;

function xpForLevel(level: number): number {
    return 100 + (level - 1) * 40;
}

export function buildLevelInfo(xp: number): { level: number; into: number; need: number } {
    let level = 1;
    let remaining = xp;
    while (remaining >= xpForLevel(level)) {
        remaining -= xpForLevel(level);
        level += 1;
    }
    return { level, into: remaining, need: xpForLevel(level) };
}

export function buildLevel(xp: number): number {
    return buildLevelInfo(xp).level;
}

function totalPointsEarned(xp: number): number {
    return Math.min(buildLevel(xp) - 1, POINT_CAP);
}

function spentPoints(save: SaveData): number {
    let total = 0;
    for (const id of save.build.allocated) {
        const node = getSkillNode(id);
        if (node) total += node.cost;
    }
    return total;
}

export function availablePoints(save: SaveData): number {
    return totalPointsEarned(save.build.xp) - spentPoints(save);
}

export function pointsSpentInBranch(save: SaveData, branch: SkillBranchId): number {
    let total = 0;
    for (const id of save.build.allocated) {
        const node = getSkillNode(id);
        if (node && node.branch === branch) total += node.cost;
    }
    return total;
}

export function allocatedCapstone(save: SaveData): SkillNodeDef | null {
    for (const id of save.build.allocated) {
        const node = getSkillNode(id);
        if (node && node.tier === 'capstone') return node;
    }
    return null;
}

export function canAllocate(save: SaveData, nodeId: string): { ok: boolean; reason: string } {
    const node = getSkillNode(nodeId);
    if (!node) return { ok: false, reason: 'Unknown node' };
    if (save.build.allocated.includes(nodeId)) return { ok: false, reason: 'Already allocated' };
    if (availablePoints(save) < node.cost) return { ok: false, reason: `Need ${node.cost} point${node.cost === 1 ? '' : 's'}` };
    if (pointsSpentInBranch(save, node.branch) < node.requiresBranchPoints) {
        return { ok: false, reason: `Requires ${node.requiresBranchPoints} points spent in this branch` };
    }
    if (node.tier === 'capstone') {
        const existing = allocatedCapstone(save);
        if (existing && existing.id !== node.id) return { ok: false, reason: `Already committed to ${existing.name}` };
    }
    return { ok: true, reason: '' };
}

export function allocateNode(save: SaveData, nodeId: string): SaveData {
    if (!canAllocate(save, nodeId).ok) return save;
    return { ...save, build: { ...save.build, allocated: [...save.build.allocated, nodeId] } };
}

/** Cheap early, scales with level — matches the brief. Nothing to charge for with an empty tree. */
export function respecCost(save: SaveData): number {
    return Math.round(20 + buildLevel(save.build.xp) * 8);
}

export function respecSkillTree(save: SaveData): SaveData {
    if (save.build.allocated.length === 0) return save;
    const cost = respecCost(save);
    if (save.currency < cost) return save;
    return { ...save, currency: save.currency - cost, build: { ...save.build, allocated: [] } };
}

/** XP for one run: kills matter most in bulk, floors and bosses are the reliable milestones. */
export function xpForRun(totalKills: number, clearedFloors: number, bossKills: number): number {
    return totalKills * 1 + clearedFloors * 15 + bossKills * 100;
}

export function grantXp(save: SaveData, amount: number): SaveData {
    if (amount <= 0) return save;
    return { ...save, build: { ...save.build, xp: save.build.xp + amount } };
}

export interface SkillSpecial {
    amount: number;
    amount2: number;
}

export interface SkillTreeRuntime {
    /** Flat StatBlock contribution from every allocated 'stat' effect — folds into aggregateStats. */
    stats: Partial<StatBlock>;
    has(nodeId: string): boolean;
    /** Magnitude(s) for an allocated 'special' node by its effect key, or null if not allocated. */
    special(key: string): SkillSpecial | null;
    capstoneId: string | null;
}

/** Resolves the whole tree into what dungeonScene.ts needs once per run — mirrors resolveEquippedRhunes. */
export function resolveSkillTree(save: SaveData): SkillTreeRuntime {
    const stats: Partial<StatBlock> = {};
    const specials = new Map<string, SkillSpecial>();
    const allocated = new Set(save.build.allocated);
    let capstoneId: string | null = null;

    for (const id of save.build.allocated) {
        const node = getSkillNode(id);
        if (!node) continue; // stale id from a since-rebalanced tree — skip rather than crash
        if (node.tier === 'capstone') capstoneId = node.id;
        for (const effect of node.effects) {
            if (effect.kind === 'stat') {
                stats[effect.stat] = (stats[effect.stat] ?? 0) + effect.amount;
            } else {
                specials.set(effect.key, { amount: effect.amount ?? 0, amount2: effect.amount2 ?? 0 });
            }
        }
    }

    return {
        stats,
        has: (nodeId: string) => allocated.has(nodeId),
        special: (key: string) => specials.get(key) ?? null,
        capstoneId,
    };
}
