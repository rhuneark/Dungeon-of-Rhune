/**
 * The Build panel: the passive skill tree. Six branches, each an accordion
 * section (tap the header to expand) so 60 nodes don't have to render as one
 * giant scroll. Opened with the "C" key.
 */
import { useState } from 'react';
import Modal from './Modal.tsx';
import { store, useStore } from '../../state/store.ts';
import { saveGame } from '../../game/systems/save.ts';
import { SKILL_BRANCHES, nodesForBranch, type SkillBranchId, type SkillNodeDef } from '../../game/data/skillTree.ts';
import {
    allocateNode,
    allocatedCapstone,
    availablePoints,
    buildLevelInfo,
    canAllocate,
    pointsSpentInBranch,
    respecCost,
    respecSkillTree,
} from '../../game/systems/skillTree.ts';

const TIER_LABEL: Record<SkillNodeDef['tier'], string> = { minor: 'Minor', notable: 'Notable', capstone: 'Capstone' };

export default function BuildPanel() {
    const save = useStore((s) => s.save);
    const [expanded, setExpanded] = useState<SkillBranchId | null>(null);
    const { level, into, need } = buildLevelInfo(save.build.xp);
    const points = availablePoints(save);
    const pct = Math.min(100, Math.round((into / need) * 100));
    const capstone = allocatedCapstone(save);
    const cost = respecCost(save);
    const canRespec = save.build.allocated.length > 0 && save.currency >= cost;

    return (
        <Modal title="Build" subtitle="Your passive skill tree — earned from runs, respec for Scrap.">
            <div className="mb-4 rounded-xl bg-white/5 p-3">
                <div className="flex items-center justify-between">
                    <span className="text-lg font-bold">Level {level}</span>
                    <span className="text-xs font-bold text-primary">{points} point{points === 1 ? '' : 's'} available</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                    <div className="h-full rounded-full bg-primary transition-[width] duration-150" style={{ width: `${pct}%` }} />
                </div>
                <div className="mt-1 text-[11px] text-white/40">
                    {into}/{need} XP to level {level + 1}
                </div>
            </div>

            <div className="space-y-2">
                {SKILL_BRANCHES.map((branch) => {
                    const nodes = nodesForBranch(branch.id);
                    const spent = pointsSpentInBranch(save, branch.id);
                    const totalCost = nodes.reduce((s, n) => s + n.cost, 0);
                    const isExpanded = expanded === branch.id;
                    const hex = `#${branch.color.toString(16).padStart(6, '0')}`;
                    return (
                        <div key={branch.id} className="rounded-xl border" style={{ borderColor: hex + '55', backgroundColor: hex + '0d' }}>
                            <button
                                type="button"
                                className="flex w-full items-center justify-between p-3 text-left"
                                onClick={() => setExpanded(isExpanded ? null : branch.id)}
                            >
                                <div>
                                    <div className="text-sm font-bold" style={{ color: hex }}>
                                        {branch.name} <span className="text-[10px] font-normal uppercase tracking-wide text-white/40">· {branch.pillar}</span>
                                    </div>
                                    <p className="text-[11px] text-white/50">{branch.tagline}</p>
                                </div>
                                <div className="whitespace-nowrap text-xs font-bold text-white/60">
                                    {spent}/{totalCost} {isExpanded ? '▲' : '▼'}
                                </div>
                            </button>

                            {isExpanded && (
                                <div className="space-y-1.5 border-t border-white/10 p-3 pt-2">
                                    {nodes.map((node) => {
                                        const allocated = save.build.allocated.includes(node.id);
                                        const check = canAllocate(save, node.id);
                                        const lockedByOtherCapstone = node.tier === 'capstone' && capstone !== null && capstone.id !== node.id;
                                        return (
                                            <div
                                                key={node.id}
                                                className={`rounded-lg border p-2 ${allocated ? 'border-white/20 bg-white/10' : 'border-white/5 bg-white/[0.03]'}`}
                                            >
                                                <div className="flex items-center justify-between gap-2">
                                                    <div className="min-w-0">
                                                        <span className="text-[10px] font-bold uppercase tracking-wide text-white/40">{TIER_LABEL[node.tier]}</span>
                                                        <div className="truncate text-xs font-bold text-white">{node.name}</div>
                                                    </div>
                                                    {allocated ? (
                                                        <span className="shrink-0 text-[11px] font-bold uppercase text-primary">Owned</span>
                                                    ) : (
                                                        <button
                                                            type="button"
                                                            disabled={!check.ok}
                                                            title={check.ok ? '' : check.reason}
                                                            className={`shrink-0 rounded-lg px-2.5 py-1.5 text-[11px] font-bold active:scale-95 ${
                                                                check.ok ? 'bg-primary text-black' : 'cursor-not-allowed bg-white/10 text-white/30'
                                                            }`}
                                                            onClick={() => {
                                                                const next = allocateNode(save, node.id);
                                                                store.patch({ save: next });
                                                                void saveGame(next);
                                                            }}
                                                        >
                                                            {node.cost}pt
                                                        </button>
                                                    )}
                                                </div>
                                                <p className="mt-1 text-[11px] text-white/50">{node.description}</p>
                                                {!allocated && !check.ok && (
                                                    <p className="mt-0.5 text-[10px] font-bold text-red-400/80">
                                                        {lockedByOtherCapstone ? `Locked — committed to ${capstone!.name}` : check.reason}
                                                    </p>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            <button
                type="button"
                disabled={!canRespec}
                className={`mt-4 w-full rounded-lg py-2 text-xs font-bold active:scale-95 ${
                    canRespec ? 'bg-white/10 text-white' : 'cursor-not-allowed bg-white/5 text-white/30'
                }`}
                onClick={() => {
                    if (!canRespec) return;
                    const next = respecSkillTree(save);
                    store.patch({ save: next });
                    void saveGame(next);
                    store.pushToast('Skill tree reset.');
                }}
            >
                {save.build.allocated.length === 0 ? 'Nothing to respec' : `Respec (${cost}◆)`}
            </button>
        </Modal>
    );
}
