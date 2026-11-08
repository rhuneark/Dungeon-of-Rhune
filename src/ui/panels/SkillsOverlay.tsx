/**
 * Disciplines & skill trees.
 *  Left:   the four Disciplines — choose two, raise their rank with Path Points.
 *  Middle: skills from your Disciplines — specialize up to 5.
 *  Right:  the selected skill's own tree — spend its points (one per skill level).
 */
import { useState } from 'react';
import { comboTitle, DISCIPLINES, getDiscipline, MAX_SPECIALIZED, SKILLS } from '../../content/skills/disciplines.ts';
import type { DisciplineId } from '../../content/skills/disciplineNames.ts';
import type { SkillDef, SkillNode } from '../../content/skills/types.ts';
import { describeMod } from '../../content/stats.ts';
import { session, useSession } from '../../state/session.ts';
import { store, useStore } from '../../state/store.ts';
import { skillXpToNext } from '../../systems/hero.ts';
import {
    allocate,
    canAllocate,
    chooseDiscipline,
    deallocate,
    effectiveLevel,
    forgetDiscipline,
    isChosen,
    isUnlocked,
    nodeRank,
    pointsAvailable,
    raiseRank,
    rankOf,
    specialize,
    specializedCount,
    unspecialize,
} from '../../systems/skills.ts';
import { Panel } from '../kit/Panel.tsx';
import { tooltip } from '../kit/tooltip.ts';
import { uiPoint } from '../kit/uiPoint.ts';

const KIND_LABEL: Record<SkillDef['kind'], string> = { attack: 'Attack', spell: 'Spell', passive: 'Passive', buff: 'Buff', summon: 'Summon', movement: 'Movement' };

export function SkillGlyph({ skill, size = 28, dim = false }: { skill: SkillDef; size?: number; dim?: boolean }) {
    const color = getDiscipline(skill.discipline)?.color ?? '#aaa';
    return (
        <div
            className="t20 flex shrink-0 items-center justify-center"
            style={{
                width: size,
                height: size,
                color: dim ? '#5e5444' : color,
                background: '#0e0b08',
                boxShadow: `inset 0 0 0 1px ${dim ? '#3a2c1e' : color}`,
                fontSize: size >= 28 ? 20 : 10,
                lineHeight: `${size}px`,
            }}
        >
            {skill.name[0]}
        </div>
    );
}

function err(msg: string | null) {
    if (msg) store.toast(msg, '#d9534f');
    else session.commit();
}

function tip(e: React.PointerEvent, title: string, lines: string[], color?: string) {
    const p = uiPoint(e.clientX, e.clientY);
    tooltip.show({ kind: 'text', title, lines, color }, p.x, p.y);
}

function nodeText(node: SkillNode, rank: number): string {
    const v = (node.effects[0]?.perRank ?? 0) * Math.max(1, rank);
    return node.text.replace('{v}', String(Math.abs(v) % 1 ? Math.abs(v).toFixed(1) : Math.abs(v)));
}

function DisciplineColumn() {
    const s = useSession();
    const hero = s.hero;
    return (
        <div className="flex w-[196px] shrink-0 flex-col gap-[4px]">
            {DISCIPLINES.map((d) => {
                const chosen = isChosen(hero, d.id);
                const rank = rankOf(hero, d.id);
                const slotFree = hero.disciplines.includes(null);
                return (
                    <div
                        key={d.id}
                        className="frame-inset pe p-[4px]"
                        style={{ opacity: chosen || slotFree ? 1 : 0.45 }}
                        onPointerMove={(e) => tip(e, d.name, [d.tagline, `Per rank: ${d.perRank.map(describeMod).join(', ')}`, d.lore], d.color)}
                        onPointerLeave={() => tooltip.hide()}
                    >
                        <div className="flex items-baseline justify-between">
                            <span className="title18" style={{ color: d.color }}>
                                {d.name}
                            </span>
                            <span className="t10 text-dim">
                                {rank}/{d.maxRank}
                            </span>
                        </div>
                        <div className="frame-inset my-[2px] h-[5px]">
                            <div className="h-full" style={{ width: `${(rank / d.maxRank) * 100}%`, background: d.color }} />
                        </div>
                        <div className="t10 flex items-center gap-[3px]">
                            {!chosen ? (
                                <button className="pbtn" disabled={!slotFree || hero.pathPoints < 1} onClick={() => err(chooseDiscipline(hero, d.id))}>
                                    Choose (1 pt)
                                </button>
                            ) : (
                                <>
                                    <button className="pbtn" disabled={hero.pathPoints < 1 || rank >= d.maxRank} onClick={() => err(raiseRank(hero, d.id))}>
                                        + Rank
                                    </button>
                                    <button className="pbtn" onClick={() => (forgetDiscipline(hero, d.id), session.commit())}>
                                        Forget
                                    </button>
                                </>
                            )}
                            <span className="ml-auto flex gap-[1px]">
                                {SKILLS.filter((sk) => sk.discipline === d.id).map((sk) => (
                                    <span key={sk.id} className="s8" style={{ color: rank >= sk.unlockRank && chosen ? d.color : '#5e5444' }} title={`${sk.name} @ rank ${sk.unlockRank}`}>
                                        {sk.unlockRank}
                                    </span>
                                ))}
                            </span>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

function SkillList({ selected, onSelect }: { selected: string | null; onSelect(id: string): void }) {
    const s = useSession();
    const hero = s.hero;
    const sheet = s.sheet();
    const mine = SKILLS.filter((sk) => hero.disciplines.includes(sk.discipline));
    return (
        <div className="frame-inset pe flex w-[176px] shrink-0 flex-col gap-[2px] overflow-y-auto p-[3px]">
            {mine.length === 0 && <div className="t10 p-[4px] text-dim">Choose a Discipline to see its skills.</div>}
            {mine.map((sk) => {
                const unlocked = isUnlocked(hero, sk);
                const st = hero.skills[sk.id];
                return (
                    <button key={sk.id} className={`flex items-center gap-[4px] p-[2px] text-left ${selected === sk.id ? 'bg-panel3' : 'hover:bg-panel2'}`} onClick={() => onSelect(sk.id)}>
                        <SkillGlyph skill={sk} dim={!unlocked} />
                        <span className="flex flex-col">
                            <span className={`t10 ${unlocked ? 'text-parch' : 'text-faint'}`}>{sk.name}</span>
                            <span className="t10 text-dim">
                                {unlocked ? `${KIND_LABEL[sk.kind]} · lvl ${effectiveLevel(hero, sk, sheet.raw)}` : `Rank ${sk.unlockRank}`}
                                {st?.specialized && <span className="text-gold"> ★</span>}
                            </span>
                        </span>
                    </button>
                );
            })}
            <div className="t10 mt-auto p-[2px] text-dim">
                Specialized: {specializedCount(hero)}/{MAX_SPECIALIZED}
            </div>
        </div>
    );
}

function Tree({ skill }: { skill: SkillDef }) {
    const s = useSession();
    const hero = s.hero;
    const sheet = s.sheet();
    const st = hero.skills[skill.id];
    const unlocked = isUnlocked(hero, skill);
    const pts = pointsAvailable(hero, skill, sheet.raw);
    const uiW = useStore((st) => st.view.uiW);
    const NODE = 30;
    // Columns shrink on narrow UI canvases (min layout 690 UI px wide).
    const GX = Math.max(56, Math.min(74, Math.floor((uiW - 472) / 4)));
    const GY = 56;
    const pos = (n: SkillNode) => ({ x: 14 + n.col * GX, y: 8 + n.row * GY });
    const color = getDiscipline(skill.discipline)?.color ?? '#aaa';
    return (
        <div className="flex min-w-0 flex-1 flex-col">
            <div className="flex items-start gap-[6px]">
                <SkillGlyph skill={skill} size={32} dim={!unlocked} />
                <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-[6px]">
                        <span className="title18" style={{ color }}>
                            {skill.name}
                        </span>
                        <span className="t10 text-dim">
                            {KIND_LABEL[skill.kind]} {skill.tags.length > 0 && `· ${skill.tags.join(', ')}`}
                        </span>
                    </div>
                    <div className="t10 text-parch">{skill.description}</div>
                    <div className="t10 text-magic">{skill.baseInfo.join(' · ')}</div>
                    {skill.passivePerLevel && <div className="t10 text-magic">Per level: {skill.passivePerLevel.map(describeMod).join(', ')}</div>}
                </div>
            </div>
            <div className="t10 my-[4px] flex flex-wrap items-center gap-[4px]">
                {!unlocked ? (
                    <span className="text-dim">Unlocks at {getDiscipline(skill.discipline)?.name} rank {skill.unlockRank}.</span>
                ) : st?.specialized ? (
                    <>
                        <span className="text-gold">
                            Level {st.level} · {pts} point{pts === 1 ? '' : 's'} to spend
                        </span>
                        <span className="text-dim">
                            ({st.xp}/{skillXpToNext(st.level)} skill xp)
                        </span>
                        <button className="pbtn ml-auto" onClick={() => (unspecialize(hero, skill.id), session.commit())}>
                            Unspecialize
                        </button>
                    </>
                ) : (
                    <button className="pbtn" onClick={() => err(specialize(hero, skill.id))}>
                        Specialize — open its tree
                    </button>
                )}
                {unlocked && skill.kind !== 'passive' && (
                    <span className="ml-auto flex items-center gap-[2px]">
                        <span className="text-dim">Hotbar</span>
                        {hero.hotbar.map((h, i) => (
                            <button
                                key={i}
                                className={`pbtn !px-[4px] ${h === skill.id ? '!text-gold' : ''}`}
                                onClick={() => {
                                    hero.hotbar = hero.hotbar.map((x, j) => (j === i ? (x === skill.id ? null : skill.id) : x === skill.id ? null : x));
                                    session.commit();
                                }}
                            >
                                {i + 1}
                            </button>
                        ))}
                    </span>
                )}
            </div>
            <div className="frame-inset pe relative flex-1 overflow-hidden" style={{ minHeight: 3 * GY + 14, opacity: st?.specialized ? 1 : 0.5 }}>
                <svg className="pointer-events-none absolute left-0 top-0" width={5 * GX + 30} height={3 * GY + 20}>
                    {skill.tree
                        .filter((n) => n.requires)
                        .map((n) => {
                            const parent = skill.tree.find((p) => p.id === n.requires!.node)!;
                            const a = pos(parent);
                            const b = pos(n);
                            const met = nodeRank(hero, skill.id, parent.id) >= n.requires!.points;
                            return <line key={n.id} x1={a.x + NODE / 2} y1={a.y + NODE / 2} x2={b.x + NODE / 2} y2={b.y + NODE / 2} stroke={met ? color : '#3a2c1e'} strokeWidth={2} shapeRendering="crispEdges" />;
                        })}
                </svg>
                {skill.tree.map((n) => {
                    const p = pos(n);
                    const r = nodeRank(hero, skill.id, n.id);
                    const why = canAllocate(hero, skill, n, sheet.raw);
                    const maxed = r >= n.maxRank;
                    return (
                        <div key={n.id} className="absolute flex flex-col items-center" style={{ left: p.x - 20, top: p.y, width: NODE + 40 }}>
                            <button
                                className="t10 flex items-center justify-center"
                                style={{
                                    width: NODE,
                                    height: NODE,
                                    background: r > 0 ? '#2c2219' : '#0e0b08',
                                    color: r > 0 ? color : '#7d7462',
                                    boxShadow: `inset 0 0 0 1px ${maxed ? '#d9b26a' : r > 0 ? color : why ? '#3a2c1e' : '#8a6a42'}`,
                                }}
                                onClick={() => err(allocate(hero, skill, n, sheet.raw))}
                                onContextMenu={(e) => {
                                    e.preventDefault();
                                    err(deallocate(hero, skill, n));
                                }}
                                onPointerMove={(e) =>
                                    tip(
                                        e,
                                        `${n.name} (${r}/${n.maxRank})`,
                                        [
                                            r > 0 ? `Now: ${nodeText(n, r)}` : nodeText(n, 1),
                                            ...(r > 0 && !maxed ? [`Next: ${nodeText(n, r + 1)}`] : []),
                                            ...(why && !maxed ? [why] : []),
                                            'Click: add point · Right-click: refund',
                                        ],
                                        color
                                    )
                                }
                                onPointerLeave={() => tooltip.hide()}
                            >
                                {r}/{n.maxRank}
                            </button>
                            <span className="t10 text-center" style={{ color: r > 0 ? '#e8dcc0' : '#7d7462' }}>
                                {n.name}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export default function SkillsOverlay() {
    const s = useSession();
    const hero = s.hero;
    const [sel, setSel] = useState<string | null>(null);
    const mine = SKILLS.filter((sk) => hero.disciplines.includes(sk.discipline as DisciplineId));
    const selected = SKILLS.find((sk) => sk.id === (sel ?? mine[0]?.id));
    return (
        <Panel title="Disciplines & Skills" onClose={() => store.patch({ overlay: null })} style={{ left: 6, right: 6, top: 6, bottom: 52 }}>
            <div className="t10 mb-[4px] flex justify-between px-[2px]">
                <span className="text-gold">
                    {hero.pathPoints} Path Point{hero.pathPoints === 1 ? '' : 's'}
                </span>
                <span className="text-parch">{comboTitle(hero.disciplines[0], hero.disciplines[1])}</span>
                <span className="text-dim">Path Points: 1 per level + lore quests. Skills level up as you gain XP.</span>
            </div>
            <div className="flex min-h-0 flex-1 gap-[6px]">
                <DisciplineColumn />
                <SkillList selected={selected?.id ?? null} onSelect={setSel} />
                {selected ? <Tree skill={selected} /> : <div className="t10 flex-1 p-[8px] text-dim">Choose two Disciplines. Any pair works — each pairing has a name, and the trees cross-pollinate.</div>}
            </div>
        </Panel>
    );
}
