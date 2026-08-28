/**
 * The Build panel: the passive skill tree. Full-screen (it's a real menu,
 * not a quick popup, and 16 nodes per pillar got crowded in the small
 * card) — a left sidebar for level/points/pillar-picking, and a big scrolling
 * canvas on the right for the active pillar's graph (Start -> 3 paths -> a
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
    // Final's prereq list is every other node in the pillar (15 entries) — the
    // "cross-link" callout only makes sense for a regular path node that has
    // exactly one extra prereq alongside its same-path predecessor.
    const crossLinkId = !isFinal && node.prereq.length > 1 ? node.prereq[1] : null;
    const crossLinkName = crossLinkId ? getSkillNode(crossLinkId)?.name : null;

    const stateClass = owned
        ? 'border-2 bg-white/10'
        : isFinal
          ? 'border border-dashed border-amber-400/40 bg-amber-400/5'
          : check?.ok
            ? 'border border-white/20 bg-white/[0.07] hover:bg-white/[0.1] active:scale-[0.98]'
            : 'border border-white/5 bg-white/[0.02] opacity-60';

    return (
        <button
            type="button"
            disabled={isFinal || owned || !check?.ok}
            title={!isFinal && !owned && check ? check.reason : ''}
            className={`flex h-full w-full flex-col rounded-xl p-3 text-left ${stateClass}`}
            style={owned ? { borderColor: hex } : undefined}
            onClick={() => {
                if (isFinal || owned || !check?.ok) return;
                const next = allocateNode(save, node.id);
                store.patch({ save: next });
                void saveGame(next);
            }}
        >
            <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-bold text-white">{node.name}</span>
                {isFinal ? (
                    <span className="shrink-0 rounded-full bg-amber-400/15 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-300">
                        {owned ? 'Converged' : 'Free'}
                    </span>
                ) : owned ? (
                    <span className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase" style={{ color: hex, backgroundColor: hex + '22' }}>
                        Owned
                    </span>
                ) : (
                    <span className="shrink-0 rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold uppercase text-white/50">Lv {node.levelReq}</span>
                )}
            </div>
            <p className="mt-1 text-xs leading-snug text-white/60">{node.description}</p>
            <div className="mt-auto pt-1.5">
                {isFinal && !owned && <p className="text-[10px] font-bold text-amber-300/70">Unlocks once every other node here is learned</p>}
                {crossLinkName && !owned && <p className="text-[10px] font-bold text-sky-300/70">⇢ also requires {crossLinkName}</p>}
                {!isFinal && !owned && check && !check.ok && <p className="text-[10px] font-bold text-red-400/70">{check.reason}</p>}
            </div>
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
        <Modal fullScreen title="Build" subtitle="Your passive skill tree — earned from runs, respec for Scrap.">
            <div className="flex h-full min-h-0 flex-col md:flex-row">
                {/* --- sidebar: level/points, pillar picker, respec — a compact strip on
                     narrow screens (chips scroll horizontally) so it never pushes the
                     actual tree below the fold; a full vertical list once there's room. --- */}
                <div className="flex shrink-0 flex-col gap-3 border-b border-white/10 p-4 md:w-72 md:overflow-y-auto md:border-b-0 md:border-r">
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

                    <div className="flex gap-1.5 overflow-x-auto pb-1 md:flex-1 md:flex-col md:overflow-visible md:pb-0">
                        {SKILL_BRANCHES.map((b) => {
                            const bHex = `#${b.color.toString(16).padStart(6, '0')}`;
                            const isActive = active === b.id;
                            const bSpent = pointsSpentInBranch(save, b.id);
                            const bTotal = purchasableNodeCountForBranch(b.id);
                            const converged = isNodeOwned(save, nodesForBranch(b.id).find((n) => n.position === 'final')!.id);
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
                                        {converged && <span className="text-xs text-amber-300">★</span>}
                                    </div>
                                    <div className="whitespace-nowrap text-[10px] uppercase tracking-wide text-white/40">{b.pillar}</div>
                                    <div className="mt-1 whitespace-nowrap text-[11px] font-bold text-white/40">{bSpent}/{bTotal} learned</div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* --- main canvas: the active pillar's node graph, laid out as a
                     horizontal ARPG-style progression — Start on the left, three
                     lanes (one per path) flowing left-to-right by level, Final
                     Convergence on the right spanning all three lanes. --- */}
                <div className="min-h-0 flex-1 overflow-auto p-4 md:p-6">
                    <div className="mb-4">
                        <div className="text-xl font-bold" style={{ color: hex }}>
                            {branch.name} <span className="text-xs font-normal uppercase tracking-wide text-white/40">· {branch.pillar}</span>
                        </div>
                        <p className="text-sm text-white/50">{branch.tagline}</p>
                        <p className="mt-1 text-xs font-bold text-white/40">
                            {spent}/{totalPurchasable} learned
                        </p>
                    </div>

                    <div
                        className="grid min-w-max gap-3"
                        style={{
                            gridTemplateColumns: `220px repeat(${maxRows}, minmax(200px, 1fr)) 220px`,
                            gridTemplateRows: 'repeat(3, minmax(110px, auto))',
                        }}
                    >
                        <div style={{ gridColumn: 1, gridRow: '1 / span 3' }}>
                            <NodeButton save={save} node={start} hex={hex} />
                        </div>
                        {pathA.map((n) => (
                            <div key={n.id} style={{ gridColumn: n.depth + 1, gridRow: 1 }}>
                                <NodeButton save={save} node={n} hex={hex} />
                            </div>
                        ))}
                        {pathB.map((n) => (
                            <div key={n.id} style={{ gridColumn: n.depth + 1, gridRow: 2 }}>
                                <NodeButton save={save} node={n} hex={hex} />
                            </div>
                        ))}
                        {pathC.map((n) => (
                            <div key={n.id} style={{ gridColumn: n.depth + 1, gridRow: 3 }}>
                                <NodeButton save={save} node={n} hex={hex} />
                            </div>
                        ))}
                        <div style={{ gridColumn: maxRows + 2, gridRow: '1 / span 3' }}>
                            <NodeButton save={save} node={final} hex={hex} />
                        </div>
                    </div>

                    <button
                        type="button"
                        disabled={!canRespec}
                        className={`mt-6 w-full max-w-md rounded-lg py-2 text-xs font-bold active:scale-95 ${
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
                </div>
            </div>
        </Modal>
    );
}
