/**
 * Leveling, point allocation, and per-point respec for the passive skill
 * tree (see data/skillTree.ts for the branch/node definitions). Level — and
 * therefore points available — is always DERIVED from lifetime xp rather
 * than stored, so it can never drift out of sync with a saved rank map.
 *
 * The tree itself is freeform: any node can be ranked up any time a point
 * is free, in any order. The only gate at all is Masteries, which need
 * MASTERY_UNLOCK_THRESHOLD points already spent among their branch's 8
 * regular nodes (checked once, at allocation time — see canAllocateRank).
 * Max level is 33, one point per level.
 */
import type { SaveData } from '../data/types.ts';
import { getSkillNode, MASTERY_UNLOCK_THRESHOLD, SKILL_NODES, type SkillBranchId, type SkillNodeDef } from '../data/skillTree.ts';
import type { StatBlock } from '../data/types.ts';

export const MAX_LEVEL = 33;

function xpForLevel(level: number): number {
    return 100 + (level - 1) * 40;
}

export function buildLevelInfo(xp: number): { level: number; into: number; need: number } {
    let level = 1;
    let remaining = xp;
    while (level < MAX_LEVEL && remaining >= xpForLevel(level)) {
        remaining -= xpForLevel(level);
        level += 1;
    }
    if (level >= MAX_LEVEL) return { level: MAX_LEVEL, into: 0, need: 0 };
    return { level, into: remaining, need: xpForLevel(level) };
}

export function buildLevel(xp: number): number {
    return buildLevelInfo(xp).level;
}

/** One point per level — level 1 already grants its first point. */
function totalPointsEarned(xp: number): number {
    return buildLevel(xp);
}

export function rankOf(save: SaveData, nodeId: string): number {
    return save.build.ranks[nodeId] ?? 0;
}

export function isNodeOwned(save: SaveData, nodeId: string): boolean {
    return rankOf(save, nodeId) > 0;
}

function spentPoints(save: SaveData): number {
    let total = 0;
    for (const amount of Object.values(save.build.ranks)) total += amount;
    return total;
}

export function availablePoints(save: SaveData): number {
    return totalPointsEarned(save.build.xp) - spentPoints(save);
}

/** Points spent among a branch's 8 REGULAR nodes only — what gates that branch's Masteries. Mastery points themselves don't count. */
export function pointsSpentInBranchRegular(save: SaveData, branch: SkillBranchId): number {
    let total = 0;
    for (const node of SKILL_NODES) {
        if (node.branch !== branch || node.kind !== 'regular') continue;
        total += rankOf(save, node.id);
    }
    return total;
}

export function canAllocateRank(save: SaveData, nodeId: string): { ok: boolean; reason: string } {
    const node = getSkillNode(nodeId);
    if (!node) return { ok: false, reason: 'Unknown node' };
    const current = rankOf(save, nodeId);
    if (current >= node.maxRank) return { ok: false, reason: 'Already at max rank' };
    if (node.kind === 'mastery' && pointsSpentInBranchRegular(save, node.branch) < MASTERY_UNLOCK_THRESHOLD) {
        return { ok: false, reason: `Requires ${MASTERY_UNLOCK_THRESHOLD} points spent in this branch's regular nodes` };
    }
    if (availablePoints(save) < 1) return { ok: false, reason: 'No points available' };
    return { ok: true, reason: '' };
}

export function allocateRank(save: SaveData, nodeId: string): SaveData {
    if (!canAllocateRank(save, nodeId).ok) return save;
    const current = rankOf(save, nodeId);
    return { ...save, build: { ...save.build, ranks: { ...save.build.ranks, [nodeId]: current + 1 } } };
}

/** Refunding one point costs Scrap and scales with level — cheap early, real money once you're deep into a run of levels. */
export function refundRankCost(save: SaveData): number {
    return Math.round(8 + buildLevel(save.build.xp) * 3);
}

export function canRefundRank(save: SaveData, nodeId: string): { ok: boolean; reason: string } {
    if (rankOf(save, nodeId) <= 0) return { ok: false, reason: 'No points here to refund' };
    const cost = refundRankCost(save);
    if (save.currency < cost) return { ok: false, reason: `Need ${cost}◆` };
    return { ok: true, reason: '' };
}

/** Refunds exactly one point off one node — never a full branch/tree reset. A Mastery already unlocked stays unlocked even if a later regular-node refund drops the branch below the threshold; the gate is only checked when spending a new point. */
export function refundRank(save: SaveData, nodeId: string): SaveData {
    if (!canRefundRank(save, nodeId).ok) return save;
    const cost = refundRankCost(save);
    const current = rankOf(save, nodeId);
    const ranks = { ...save.build.ranks };
    if (current <= 1) delete ranks[nodeId];
    else ranks[nodeId] = current - 1;
    return { ...save, currency: save.currency - cost, build: { ...save.build, ranks } };
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
    /** Flat StatBlock contribution from every ranked 'stat' effect, already scaled by each node's current rank. */
    stats: Partial<StatBlock>;
    has(nodeId: string): boolean;
    /** Magnitude(s) for a ranked 'special' node by its effect key (rank-scaled), or null if unranked. */
    special(key: string): SkillSpecial | null;
}

/** Resolves the whole tree into what dungeonScene.ts needs once per run — mirrors resolveEquippedRhunes. */
export function resolveSkillTree(save: SaveData): SkillTreeRuntime {
    const stats: Partial<StatBlock> = {};
    const specials = new Map<string, SkillSpecial>();

    for (const node of SKILL_NODES) {
        const rank = rankOf(save, node.id);
        if (rank <= 0) continue;
        for (const effect of node.effects) {
            if (effect.kind === 'stat') {
                stats[effect.stat] = (stats[effect.stat] ?? 0) + effect.amount * rank;
            } else {
                const prev = specials.get(effect.key);
                const amount = (effect.amount ?? 0) * rank;
                const amount2 = (effect.amount2 ?? 0) * rank;
                // No two nodes currently share a special key, but add rather than overwrite in case that ever changes.
                specials.set(effect.key, prev ? { amount: prev.amount + amount, amount2: prev.amount2 + amount2 } : { amount, amount2 });
            }
        }
    }

    return {
        stats,
        has: (nodeId: string) => rankOf(save, nodeId) > 0,
        special: (key: string) => specials.get(key) ?? null,
    };
}

export type { SkillNodeDef };
