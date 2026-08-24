/**
 * Leveling, point allocation, and respec for the passive skill tree (see
 * data/skillTree.ts for the pillar/node definitions). Level — and therefore
 * points available — is always DERIVED from lifetime xp rather than stored,
 * so it can never drift out of sync with a saved node list.
 *
 * Max level is 30, one point per level (level 1 already has its first
 * point), and every purchasable node costs exactly 1 — 15 nodes per pillar,
 * so a level-30 character can fully clear two pillars. Allocating a node
 * needs BOTH its `levelReq` and every `prereq` node already owned — no
 * banking points to skip ahead. A pillar's Final Convergence node is never
 * bought: it silently unlocks (for free) the instant every other node in
 * that pillar is owned — see `isNodeOwned`.
 */
import type { SaveData } from '../data/types.ts';
import { getSkillNode, SKILL_NODES, type SkillBranchId, type SkillNodeDef } from '../data/skillTree.ts';
import type { StatBlock } from '../data/types.ts';

export const MAX_LEVEL = 30;

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

/** Purchasable nodes per pillar (everything but the free Final Convergence). */
export function purchasableNodeCountForBranch(branch: SkillBranchId): number {
    return SKILL_NODES.filter((n) => n.branch === branch && n.position !== 'final').length;
}

function isAllocated(save: SaveData, nodeId: string): boolean {
    return save.build.allocated.includes(nodeId);
}

/** A Final Convergence node is "owned" the instant every node it lists as a prereq is allocated — no point ever spent on it. */
export function isNodeOwned(save: SaveData, nodeId: string): boolean {
    const node = getSkillNode(nodeId);
    if (!node) return false;
    if (node.position === 'final') return node.prereq.every((p) => isAllocated(save, p));
    return isAllocated(save, nodeId);
}

export function canAllocate(save: SaveData, nodeId: string): { ok: boolean; reason: string } {
    const node = getSkillNode(nodeId);
    if (!node) return { ok: false, reason: 'Unknown node' };
    if (node.position === 'final') return { ok: false, reason: 'Unlocks automatically once the rest of the pillar is learned' };
    if (isAllocated(save, nodeId)) return { ok: false, reason: 'Already allocated' };
    const level = buildLevel(save.build.xp);
    if (level < node.levelReq) return { ok: false, reason: `Requires level ${node.levelReq}` };
    for (const prereqId of node.prereq) {
        if (!isAllocated(save, prereqId)) {
            return { ok: false, reason: `Requires ${getSkillNode(prereqId)?.name ?? 'a prior node'} first` };
        }
    }
    if (availablePoints(save) < node.cost) return { ok: false, reason: `Need ${node.cost} point${node.cost === 1 ? '' : 's'}` };
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
    /** Flat StatBlock contribution from every owned 'stat' effect, already scaled by each node's effective level. */
    stats: Partial<StatBlock>;
    has(nodeId: string): boolean;
    /** Magnitude(s) for an owned 'special' node by its effect key (level-scaled), or null if not owned. */
    special(key: string): SkillSpecial | null;
}

/**
 * Resolves the whole tree into what dungeonScene.ts needs once per run —
 * mirrors resolveEquippedRhunes. `nodeLevelBonuses` comes from equipped
 * gear's "nodeLevel" affixes (see systems/inventory.ts): a node's effective
 * level is 1 (owned) + its gear bonus, and every effect on that node scales
 * linearly with that level — level 2 doubles it, level 3 triples it, etc.
 */
export function resolveSkillTree(save: SaveData, nodeLevelBonuses: Record<string, number> = {}): SkillTreeRuntime {
    const stats: Partial<StatBlock> = {};
    const specials = new Map<string, SkillSpecial>();
    const owned = new Set<string>();

    for (const node of SKILL_NODES) {
        if (!isNodeOwned(save, node.id)) continue;
        owned.add(node.id);
        const level = 1 + (nodeLevelBonuses[node.id] ?? 0);
        for (const effect of node.effects) {
            if (effect.kind === 'stat') {
                stats[effect.stat] = (stats[effect.stat] ?? 0) + effect.amount * level;
            } else {
                const prev = specials.get(effect.key);
                const amount = (effect.amount ?? 0) * level;
                const amount2 = (effect.amount2 ?? 0) * level;
                // No two nodes currently share a special key, but add rather than overwrite in case that ever changes.
                specials.set(effect.key, prev ? { amount: prev.amount + amount, amount2: prev.amount2 + amount2 } : { amount, amount2 });
            }
        }
    }

    return {
        stats,
        has: (nodeId: string) => owned.has(nodeId),
        special: (key: string) => specials.get(key) ?? null,
    };
}

export type { SkillNodeDef };
