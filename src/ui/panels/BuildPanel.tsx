/**
 * The Build panel: the passive skill tree. Freeform — every branch is just
 * a grid of 8 rankable nodes (3 ranks each, 1 point per rank) plus 2
 * single-point Masteries, no forced order and no prerequisites between
 * regular nodes. Spend a point on whatever you want, whenever you have
 * one; a branch's Masteries unlock once MASTERY_UNLOCK_THRESHOLD points
 * are spent among its 8 regular nodes (any combination). Respec refunds
 * one point at a time for Scrap — there's no full-tree reset. Full-screen
 * (it's a real menu) with a left sidebar for level/points/branch-picking
 * and the active branch's grid centered on the right. Opened with the "C"
 * key or by walking to the Pillars station in the hub.
 */
import { useState } from 'react';
import Modal from './Modal.tsx';
import { store, useStore, type SaveData } from '../../state/store.ts';
import { saveGame } from '../../game/systems/save.ts';
import { MASTERY_UNLOCK_THRESHOLD, masteryNodesForBranch, regularNodesForBranch, SKILL_BRANCHES, type SkillBranchId, type SkillNodeDef } from '../../game/data/skillTree.ts';
import {
    allocateRank,
    availablePoints,
    buildLevelInfo,
    canAllocateRank,
    canRefundRank,
    isNodeOwned,
    MAX_LEVEL,
    pointsSpentInBranchRegular,
    rankOf,
    refundRank,
    refundRankCost,
} from '../../game/systems/skillTree.ts';

function NodeCard({ save, node, hex }: { save: SaveData; node: SkillNodeDef; hex: string }) {
    const rank = rankOf(save, node.id);
    const maxed = rank >= node.maxRank;
    const owned = rank > 0;
    const allocCheck = canAllocateRank(save, node.id);
    const refundCheck = canRefundRank(save, node.id);
    const refundCost = refundRankCost(save);
    const isMastery = node.kind === 'mastery';

    return (
        <div
            className={`flex flex-col rounded-xl border p-3 ${owned ? 'border-2 bg-white/10' : 'border-white/10 bg-white/[0.03]'}`}
            style={owned ? { borderColor: hex } : undefined}
        >
            <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-bold text-white">{node.name}</span>
                {isMastery ? (
                    <span
                        className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase"
                        style={owned ? { color: hex, backgroundColor: hex + '22' } : undefined}
                    >
                        {owned ? 'Unlocked' : 'Mastery'}
                    </span>
                ) : (
                    <span className="shrink-0 text-xs font-bold text-white/50">
                        {rank}/{node.maxRank}
                    </span>
                )}
            </div>
            <p className="mt-1 text-xs leading-snug text-white/60">{node.description}</p>
            {isMastery && !owned && (
                <p className="mt-1 text-[10px] font-bold text-amber-300/70">
                    Requires {MASTERY_UNLOCK_THRESHOLD} points spent in this branch's regular nodes
                    {allocCheck.ok ? '' : ` (you have ${pointsSpentInBranchRegular(save, node.branch)})`}
                </p>
            )}
            <div className="mt-2 flex gap-1.5">
                <button
                    type="button"
                    disabled={!refundCheck.ok}
                    title={refundCheck.ok ? `Refund 1 point (${refundCost}◆)` : refundCheck.reason}
                    className={`flex-1 rounded-lg py-1.5 text-[11px] font-bold active:scale-95 ${
                        refundCheck.ok ? 'bg-white/10 text-white' : 'cursor-not-allowed bg-white/5 text-white/25'
                    }`}
                    onClick={() => {
                        if (!refundCheck.ok) return;
                        const next = refundRank(save, node.id);
                        store.patch({ save: next });
                        void saveGame(next);
                    }}
                >
                    −1 ({refundCost}◆)
                </button>
                <button
                    type="button"
                    disabled={maxed || !allocCheck.ok}
                    title={maxed ? 'Already at max rank' : allocCheck.ok ? '' : allocCheck.reason}
                    className={`flex-1 rounded-lg py-1.5 text-[11px] font-bold active:scale-95 ${
                        !maxed && allocCheck.ok ? 'bg-primary text-black' : 'cursor-not-allowed bg-white/5 text-white/25'
                    }`}
                    onClick={() => {
                        if (maxed || !allocCheck.ok) return;
                        const next = allocateRank(save, node.id);
                        store.patch({ save: next });
                        void saveGame(next);
                    }}
                >
                    {maxed ? 'Maxed' : isMastery ? 'Unlock' : '+1'}
                </button>
            </div>
        </div>
    );
}

export default function BuildPanel() {
    const save = useStore((s) => s.save);
    const [active, setActive] = useState<SkillBranchId>('hardpass');
    const { level, into, need } = buildLevelInfo(save.build.xp);
    const points = availablePoints(save);
    const maxed = level >= MAX_LEVEL;
    const pct = maxed ? 100 : Math.min(100, Math.round((into / need) * 100));

    const branch = SKILL_BRANCHES.find((b) => b.id === active)!;
    const hex = `#${branch.color.toString(16).padStart(6, '0')}`;
    const regularNodes = regularNodesForBranch(active);
    const masteryNodes = masteryNodesForBranch(active);
    const spentRegular = pointsSpentInBranchRegular(save, active);
    const REGULAR_MAX = regularNodes.length * 3;

    return (
        <Modal fullScreen title="Build" subtitle="Your passive skill tree — earned from runs, respec one point at a time for Scrap.">
            <div className="flex h-full min-h-0 flex-col md:flex-row">
                {/* --- sidebar: level/points, branch picker — a compact strip on narrow
                     screens (chips scroll horizontally), a vertically centered column
                     once there's room. --- */}
                <div className="flex shrink-0 flex-col justify-center gap-3 border-b border-white/10 p-4 md:w-72 md:border-b-0 md:border-r">
                    <div className="rounded-xl bg-white/5 p-3">
                        <div className="flex items-center justify-between">
                            <span className="text-lg font-bold">Level {level}{maxed ? ' (Max)' : ''}</span>
                        </div>
                        <div className="mt-1 text-xs font-bold text-primary">{points} point{points === 1 ? '' : 's'} available</div>
                        <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                            <div className="h-full rounded-full bg-primary transition-[width] duration-150" style={{ width: `${pct}%` }} />
                        </div>
                        <div className="mt-1 text-[11px] text-white/40">{maxed ? 'Max level reached.' : `${into}/${need} XP to level ${level + 1}`}</div>
                    </div>

                    <div className="flex gap-1.5 overflow-x-auto pb-1 md:flex-col md:overflow-visible md:pb-0">
                        {SKILL_BRANCHES.map((b) => {
                            const bHex = `#${b.color.toString(16).padStart(6, '0')}`;
                            const isActive = active === b.id;
                            const bSpent = pointsSpentInBranchRegular(save, b.id);
                            const bRegularMax = regularNodesForBranch(b.id).length * 3;
                            const bMasteries = masteryNodesForBranch(b.id);
                            const masteriesOwned = bMasteries.filter((n) => isNodeOwned(save, n.id)).length;
                            return (
                                <button
                                    key={b.id}
                                    type="button"
                                    onClick={() => setActive(b.id)}
                                    className="shrink-0 rounded-xl px-3 py-2.5 text-left"
                                    style={{
                                        backgroundColor: isActive ? bHex + '26' : 'transparent',
                                        border: `1px solid ${bHex}${isActive ? 'aa' : '2a'}`,
                                    }}
                                >
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="whitespace-nowrap text-sm font-bold" style={{ color: isActive ? bHex : '#ffffffcc' }}>
                                            {b.name}
                                        </span>
                                        {masteriesOwned > 0 && <span className="text-xs text-amber-300">{'★'.repeat(masteriesOwned)}</span>}
                                    </div>
                                    <div className="whitespace-nowrap text-[10px] uppercase tracking-wide text-white/40">{b.pillar}</div>
                                    <div className="mt-1 whitespace-nowrap text-[11px] font-bold text-white/40">{bSpent}/{bRegularMax} in regular nodes</div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* --- main canvas: the active branch's freeform node grid --- */}
                <div className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-auto p-4 md:p-6">
                    <div className="w-full max-w-4xl">
                        <div className="mb-4">
                            <div className="text-xl font-bold" style={{ color: hex }}>
                                {branch.name} <span className="text-xs font-normal uppercase tracking-wide text-white/40">· {branch.pillar}</span>
                            </div>
                            <p className="text-sm text-white/50">{branch.tagline}</p>
                            <p className="mt-1 text-xs font-bold text-white/40">
                                {spentRegular}/{REGULAR_MAX} points in regular nodes
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                            {regularNodes.map((node) => (
                                <NodeCard key={node.id} save={save} node={node} hex={hex} />
                            ))}
                        </div>

                        <div className="mb-2 mt-6 text-xs font-bold uppercase tracking-wide text-white/40">Masteries</div>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            {masteryNodes.map((node) => (
                                <NodeCard key={node.id} save={save} node={node} hex={hex} />
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </Modal>
    );
}
