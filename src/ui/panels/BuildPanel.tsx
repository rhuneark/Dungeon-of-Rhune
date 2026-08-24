/**
 * The Build panel: the passive skill tree. One pillar at a time — pick a
 * pillar chip up top, see its 16-node graph below (Start -> 3 paths -> a
 * free Final Convergence once everything else in the pillar is learned).
 * Nodes are level-gated on top of their prereq chain, so there's no
 * banking points to skip ahead — see systems/skillTree.ts. Opened with the
 * "C" key or by walking to the Pillars station in the hub.
 */
import { useState } from 'react';
import Modal from './Modal.tsx';
import { store, useStore, type SaveData } from '../../state/store.ts';
import { saveGame } from '../../game/systems/save.ts';
import { getSkillNode, SKILL_BRANCHES, nodesForBranch, type SkillBranchId, type SkillNodeDef } from '../../game/data/skillTree.ts';
import {
    allocateNode,
    availablePoints,
    buildLevelInfo,
    canAllocate,
    isNodeOwned,
    MAX_LEVEL,
    pointsSpentInBranch,
    purchasableNodeCountForBranch,
    respecCost,
    respecSkillTree,
} from '../../game/systems/skillTree.ts';

function NodeButton({ save, node, hex }: { save: SaveData; node: SkillNodeDef; hex: string }) {
    const owned = isNodeOwned(save, node.id);
    const isFinal = node.position === 'final';
    const check = isFinal ? null : canAllocate(save, node.id);
    const crossLinkId = node.prereq.length > 1 ? node.prereq[1] : null;
    const crossLinkName = crossLinkId ? getSkillNode(crossLinkId)?.name : null;

    const stateClass = owned
        ? 'border-2 bg-white/10'
        : isFinal
          ? 'border border-dashed border-amber-400/40 bg-amber-400/5'
          : check?.ok
            ? 'border border-white/20 bg-white/[0.07] active:scale-[0.98]'
            : 'border border-white/5 bg-white/[0.02] opacity-60';

    return (
        <button
            type="button"
            disabled={isFinal || owned || !check?.ok}
            title={!isFinal && !owned && check ? check.reason : ''}
            className={`w-full rounded-lg p-2 text-left ${stateClass}`}
            style={owned ? { borderColor: hex } : undefined}
            onClick={() => {
                if (isFinal || owned || !check?.ok) return;
                const next = allocateNode(save, node.id);
                store.patch({ save: next });
                void saveGame(next);
            }}
        >
            <div className="flex items-center justify-between gap-1">
                <span className="truncate text-[11px] font-bold text-white">{node.name}</span>
                {isFinal ? (
                    <span className="shrink-0 text-[9px] font-bold uppercase text-amber-300">{owned ? 'Converged' : 'Free'}</span>
                ) : owned ? (
                    <span className="shrink-0 text-[9px] font-bold uppercase" style={{ color: hex }}>
                        Owned
                    </span>
                ) : (
                    <span className="shrink-0 text-[9px] font-bold uppercase text-white/40">Lv {node.levelReq}</span>
                )}
            </div>
            <p className="mt-0.5 text-[10px] leading-tight text-white/50">{node.description}</p>
            {crossLinkName && !owned && <p className="mt-0.5 text-[9px] font-bold text-white/30">+ requires {crossLinkName}</p>}
            {!isFinal && !owned && check && !check.ok && <p className="mt-0.5 text-[9px] font-bold text-red-400/70">{check.reason}</p>}
        </button>
    );
}

export default function BuildPanel() {
    const save = useStore((s) => s.save);
    const [active, setActive] = useState<SkillBranchId>('axiora');
    const { level, into, need } = buildLevelInfo(save.build.xp);
    const points = availablePoints(save);
    const maxed = level >= MAX_LEVEL;
    const pct = maxed ? 100 : Math.min(100, Math.round((into / need) * 100));
    const cost = respecCost(save);
    const canRespec = save.build.allocated.length > 0 && save.currency >= cost;

    const branch = SKILL_BRANCHES.find((b) => b.id === active)!;
    const hex = `#${branch.color.toString(16).padStart(6, '0')}`;
    const nodes = nodesForBranch(active);
    const start = nodes.find((n) => n.position === 'start')!;
    const pathA = nodes.filter((n) => n.path === 'A').sort((a, b) => a.depth - b.depth);
    const pathB = nodes.filter((n) => n.path === 'B').sort((a, b) => a.depth - b.depth);
    const pathC = nodes.filter((n) => n.path === 'C').sort((a, b) => a.depth - b.depth);
    const final = nodes.find((n) => n.position === 'final')!;
    const spent = pointsSpentInBranch(save, active);
    const totalPurchasable = purchasableNodeCountForBranch(active);
    const maxRows = Math.max(pathA.length, pathB.length, pathC.length);

    return (
        <Modal title="Build" subtitle="Your passive skill tree — earned from runs, respec for Scrap.">
            <div className="mb-3 rounded-xl bg-white/5 p-3">
                <div className="flex items-center justify-between">
                    <span className="text-lg font-bold">Level {level}{maxed ? ' (Max)' : ''}</span>
                    <span className="text-xs font-bold text-primary">{points} point{points === 1 ? '' : 's'} available</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                    <div className="h-full rounded-full bg-primary transition-[width] duration-150" style={{ width: `${pct}%` }} />
                </div>
                <div className="mt-1 text-[11px] text-white/40">{maxed ? 'Max level reached.' : `${into}/${need} XP to level ${level + 1}`}</div>
            </div>

            <div className="mb-3 flex flex-wrap gap-1.5">
                {SKILL_BRANCHES.map((b) => {
                    const bHex = `#${b.color.toString(16).padStart(6, '0')}`;
                    const isActive = active === b.id;
                    const converged = isNodeOwned(save, nodesForBranch(b.id).find((n) => n.position === 'final')!.id);
                    return (
                        <button
                            key={b.id}
                            type="button"
                            onClick={() => setActive(b.id)}
                            className="rounded-lg px-2.5 py-1.5 text-xs font-bold"
                            style={{
                                backgroundColor: isActive ? bHex + '33' : 'transparent',
                                border: `1px solid ${bHex}${isActive ? 'aa' : '33'}`,
                                color: isActive ? bHex : '#ffffff99',
                            }}
                        >
                            {b.name}
                            {converged && ' ★'}
                        </button>
                    );
                })}
            </div>

            <div className="mb-3">
                <div className="text-sm font-bold" style={{ color: hex }}>
                    {branch.name} <span className="text-[10px] font-normal uppercase tracking-wide text-white/40">· {branch.pillar}</span>
                </div>
                <p className="text-[11px] text-white/50">{branch.tagline}</p>
                <p className="mt-0.5 text-[11px] font-bold text-white/40">
                    {spent}/{totalPurchasable} learned
                </p>
            </div>

            <div className="space-y-1.5">
                <NodeButton save={save} node={start} hex={hex} />
                {Array.from({ length: maxRows }).map((_, i) => {
                    const depth = i + 1;
                    const a = pathA.find((n) => n.depth === depth);
                    const b = pathB.find((n) => n.depth === depth);
                    const c = pathC.find((n) => n.depth === depth);
                    return (
                        <div key={depth} className="grid grid-cols-3 gap-1.5">
                            <div>{a && <NodeButton save={save} node={a} hex={hex} />}</div>
                            <div>{b && <NodeButton save={save} node={b} hex={hex} />}</div>
                            <div>{c && <NodeButton save={save} node={c} hex={hex} />}</div>
                        </div>
                    );
                })}
                <NodeButton save={save} node={final} hex={hex} />
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
                {save.build.allocated.length === 0 ? 'Nothing to respec' : `Respec all pillars (${cost}◆)`}
            </button>
        </Modal>
    );
}
