import { useState } from 'react';
import { iconUrl } from '../../assets/manifest.ts';
import { getBase } from '../../content/items/bases.ts';
import { RHUNES, RHUNEWORDS } from '../../content/items/rhunes.ts';
import { UNIQUES } from '../../content/items/uniques.ts';
import { getLore, LORE } from '../../content/lore/lore.ts';
import { getQuest, QUESTS } from '../../content/lore/quests.ts';
import { getNpc } from '../../content/npcs.ts';
import { describeMod } from '../../content/stats.ts';
import { useSession } from '../../state/session.ts';
import { store } from '../../state/store.ts';
import { Panel } from '../kit/Panel.tsx';
import { tooltip } from '../kit/tooltip.ts';
import { uiPoint } from '../kit/uiPoint.ts';

const LEFT = { left: 6, top: 6, width: 360 } as const;
const close = () => store.patch({ left: null });

export function QuestsPanel() {
    const s = useSession();
    const hero = s.hero;
    const active = Object.entries(hero.quests).filter(([, st]) => st.state === 'active');
    const done = Object.entries(hero.quests).filter(([, st]) => st.state === 'done');
    const unseen = QUESTS.filter((q) => !hero.quests[q.id]).length;
    return (
        <Panel title="Lore Quests" onClose={close} style={LEFT}>
            <div className="max-h-[330px] overflow-y-auto pe pr-[2px]">
                {active.length === 0 && <div className="t10 text-dim">No open quests. Talk to people — they always want something.</div>}
                {active.map(([id, st]) => {
                    const q = getQuest(id)!;
                    return (
                        <div key={id} className="mb-[6px] border-b border-[#241b13] pb-[4px]">
                            <div className="t10 text-gold">
                                {q.title} <span className="text-dim">— {getNpc(q.giver)?.name}</span>
                            </div>
                            <div className="t10 text-parch">{q.summary}</div>
                            {q.objectives.map((o) => {
                                const p = st.progress[o.id] ?? 0;
                                return (
                                    <div key={o.id} className={`t10 ${p >= o.count ? 'text-good' : 'text-dim'}`}>
                                        {p >= o.count ? '✓' : '·'} {o.text} {o.count > 1 && `(${p}/${o.count})`}
                                    </div>
                                );
                            })}
                        </div>
                    );
                })}
                {done.length > 0 && <div className="s8 mt-[4px] text-dim">COMPLETED</div>}
                {done.map(([id]) => (
                    <div key={id} className="t10 text-faint">
                        ✓ {getQuest(id)?.title}
                    </div>
                ))}
                {unseen > 0 && <div className="t10 mt-[6px] text-dim">{unseen} more quest{unseen > 1 ? 's' : ''} waiting to be found in Thornwick.</div>}
            </div>
        </Panel>
    );
}

type CodexTab = 'uniques' | 'rhunes' | 'words' | 'lore';

export function CodexPanel() {
    const s = useSession();
    const [tab, setTab] = useState<CodexTab>('uniques');
    const [lore, setLore] = useState<string | null>(null);
    const codex = s.save.codex;
    const found = UNIQUES.filter((u) => codex[`u:${u.id}`]).length;
    const showTip = (e: React.PointerEvent, title: string, lines: string[], color?: string) => {
        const p = uiPoint(e.clientX, e.clientY);
        tooltip.show({ kind: 'text', title, lines, color }, p.x, p.y);
    };
    return (
        <Panel title="Varn's Codex" onClose={close} style={{ ...LEFT, width: 380 }}>
            <div className="mb-[4px] flex justify-center gap-[3px]">
                {(['uniques', 'rhunes', 'words', 'lore'] as CodexTab[]).map((t) => (
                    <button key={t} className={`pbtn ${tab === t ? '!text-gold' : ''}`} onClick={() => setTab(t)}>
                        {t === 'uniques' ? `Uniques ${found}/${UNIQUES.length}` : t === 'rhunes' ? 'Rhunes' : t === 'words' ? 'Rhunewords' : 'Lore'}
                    </button>
                ))}
            </div>
            <div className="pe max-h-[320px] overflow-y-auto">
                {tab === 'uniques' && (
                    <div className="grid grid-cols-6 gap-[3px]">
                        {UNIQUES.map((u) => {
                            const rec = codex[`u:${u.id}`];
                            const b = getBase(u.baseId);
                            return (
                                <div
                                    key={u.id}
                                    className="frame-inset flex h-[56px] items-center justify-center"
                                    onPointerMove={(e) =>
                                        showTip(
                                            e,
                                            rec ? u.name : '???',
                                            rec ? [b.name, `Best roll: ${Math.round(rec.best * 100)}%`, `Found ${new Date(rec.at).toLocaleDateString()}`, u.flavor ?? ''] : [`A unique ${b.name}`, `Item level ${u.qlvl}+`],
                                            '#c9a46b'
                                        )
                                    }
                                    onPointerLeave={() => tooltip.hide()}
                                >
                                    <img src={iconUrl(b.art[0])} width={b.w * 16} height={b.h * 16} draggable={false} alt="" style={{ filter: rec ? 'none' : 'brightness(0) opacity(0.35)' }} />
                                </div>
                            );
                        })}
                    </div>
                )}
                {tab === 'rhunes' && (
                    <div className="grid grid-cols-4 gap-[3px]">
                        {RHUNES.map((r) => {
                            const rec = codex[`r:${r.id}`];
                            return (
                                <div
                                    key={r.id}
                                    className="frame-inset flex flex-col items-center p-[2px]"
                                    onPointerMove={(e) =>
                                        showTip(e, `${r.name} Rhune`, [r.lore, `Weapon: ${r.effects.weapon.map(describeMod).join(', ')}`, `Armor: ${r.effects.armor.map(describeMod).join(', ')}`, `Shield: ${r.effects.shield.map(describeMod).join(', ')}`], '#ff9b3d')
                                    }
                                    onPointerLeave={() => tooltip.hide()}
                                >
                                    <img src={iconUrl(`rhune_${r.id}`)} width={32} height={32} draggable={false} alt="" style={{ filter: rec ? 'none' : 'grayscale(1) opacity(0.4)' }} />
                                    <span className={`t10 ${rec ? 'text-rhune' : 'text-faint'}`}>{r.name}</span>
                                </div>
                            );
                        })}
                    </div>
                )}
                {tab === 'words' && (
                    <div>
                        <div className="t10 mb-[4px] text-dim">Socket these rhunes, in order, into a plain item with exactly that many sockets.</div>
                        {RHUNEWORDS.map((w) => {
                            const made = codex[`w:${w.id}`];
                            return (
                                <div key={w.id} className="mb-[4px] border-b border-[#241b13] pb-[3px]">
                                    <div className="t10">
                                        <span className={made ? 'text-unique' : 'text-parch'}>{w.name}</span>{' '}
                                        <span className="text-rhune">'{w.rhunes.map((r) => r[0].toUpperCase() + r.slice(1)).join(' + ')}'</span>{' '}
                                        <span className="text-dim">
                                            {w.rhunes.length}-socket {w.tags.join(' / ')}
                                        </span>
                                        {made && <span className="text-good"> ✓</span>}
                                    </div>
                                    <div className="t10 text-magic">{w.stats.map(describeMod).join(', ')}</div>
                                </div>
                            );
                        })}
                    </div>
                )}
                {tab === 'lore' && (
                    <div className="flex gap-[6px]">
                        <div className="w-[130px]">
                            {LORE.map((l) => {
                                const has = s.hero.lore.includes(l.id);
                                return (
                                    <button key={l.id} disabled={!has} className={`t10 block w-full text-left ${lore === l.id ? 'text-gold' : has ? 'text-parch' : 'text-faint'}`} onClick={() => setLore(l.id)}>
                                        {has ? l.title : '— undiscovered —'}
                                    </button>
                                );
                            })}
                        </div>
                        <div className="t10 flex-1 text-parch">{lore ? getLore(lore)?.text : 'Lore is found by poking at the world. Pick an entry.'}</div>
                    </div>
                )}
            </div>
        </Panel>
    );
}
