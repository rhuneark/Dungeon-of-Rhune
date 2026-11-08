/**
 * HUD: D2-style bottom bar — life orb, XP bar, skill hotbar, menu buttons,
 * mana orb — plus the hover name plate, zone title and toasts.
 */
import { getSkill } from '../content/skills/disciplines.ts';
import { useSession } from '../state/session.ts';
import { store, useStore, type LeftPanel, type Overlay } from '../state/store.ts';
import { xpToNext } from '../systems/hero.ts';
import { tooltip } from './kit/tooltip.ts';
import { uiPoint } from './kit/uiPoint.ts';
import { SkillGlyph } from './panels/SkillsOverlay.tsx';

function Orb({ value, max, color, label }: { value: number; max: number; color: string; label: string }) {
    const pct = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
    return (
        <div
            className="pe relative h-[44px] w-[44px] overflow-hidden rounded-full"
            style={{ background: '#0a0806', boxShadow: '0 0 0 1px #000, 0 0 0 2px #8a6a42, 0 0 0 3px #120d09' }}
            onPointerMove={(e) => {
                const p = uiPoint(e.clientX, e.clientY);
                tooltip.show({ kind: 'text', lines: [`${label}: ${Math.round(value)} / ${max}`] }, p.x, p.y);
            }}
            onPointerLeave={() => tooltip.hide()}
        >
            <div className="absolute bottom-0 left-0 right-0" style={{ height: `${pct * 100}%`, background: color }} />
            <div className="absolute left-[9px] top-[6px] h-[8px] w-[12px] rounded-full bg-white/25" />
        </div>
    );
}

function MenuButton({ label, keyHint, active, onClick }: { label: string; keyHint: string; active: boolean; onClick(): void }) {
    return (
        <button className={`pbtn !px-[4px] ${active ? '!text-gold' : ''}`} onClick={onClick} title={`${label} (${keyHint})`}>
            {label}
            <span className="s8 ml-[2px] text-dim">{keyHint}</span>
        </button>
    );
}

export function toggleLeft(p: LeftPanel) {
    const s = store.get();
    store.patch({ left: s.left === p ? null : p, dialog: null });
}
export function toggleOverlay(o: Overlay) {
    const s = store.get();
    store.patch({ overlay: s.overlay === o ? null : o, dialog: null });
}
export function toggleInventory() {
    const s = store.get();
    store.patch({ right: s.right ? null : 'inventory' });
}

export default function Hud() {
    const s = useSession();
    const hero = s.hero;
    const sheet = s.sheet();
    const left = useStore((st) => st.left);
    const right = useStore((st) => st.right);
    const overlay = useStore((st) => st.overlay);
    const devTools = useStore((st) => st.devTools);
    const xpPct = Math.min(100, (hero.xp / xpToNext(hero.level)) * 100);
    const unspent = hero.attrPoints > 0 || hero.pathPoints > 0;
    return (
        <>
            <div className="absolute bottom-0 left-0 right-0 flex h-[48px] items-end justify-between px-[4px] pb-[2px]">
                <Orb value={sheet.life} max={sheet.life} color="linear-gradient(#e0533f, #7a1d14)" label="Life" />
                <div className="frame pe mx-[4px] mb-[1px] flex flex-1 flex-col gap-[2px] px-[6px] py-[3px]" style={{ maxWidth: 560 }}>
                    <div
                        className="frame-inset h-[4px]"
                        onPointerMove={(e) => {
                            const p = uiPoint(e.clientX, e.clientY);
                            tooltip.show({ kind: 'text', lines: [`Level ${hero.level}`, `${hero.xp} / ${xpToNext(hero.level)} xp`] }, p.x, p.y);
                        }}
                        onPointerLeave={() => tooltip.hide()}
                    >
                        <div className="h-full bg-gold" style={{ width: `${xpPct}%` }} />
                    </div>
                    <div className="flex items-center gap-[3px]">
                        {hero.hotbar.map((id, i) => {
                            const sk = id ? getSkill(id) : null;
                            return (
                                <div
                                    key={i}
                                    className="frame-inset relative flex h-[30px] w-[30px] items-center justify-center"
                                    onPointerMove={(e) => {
                                        const p = uiPoint(e.clientX, e.clientY);
                                        tooltip.show({ kind: 'text', title: sk?.name ?? `Slot ${i + 1}`, lines: sk ? [sk.description, '(Combat arrives with the Wilds.)'] : ['Bind skills in the Skills window (K).'] }, p.x, p.y);
                                    }}
                                    onPointerLeave={() => tooltip.hide()}
                                >
                                    {sk && <SkillGlyph skill={sk} size={28} />}
                                    <span className="s8 absolute bottom-0 right-[1px] text-dim">{i + 1}</span>
                                </div>
                            );
                        })}
                        <span className="t10 ml-[4px] text-gold">{hero.gold.toLocaleString()}g</span>
                        <span className="ml-auto flex gap-[2px]">
                            <MenuButton label="Char" keyHint="C" active={left === 'character'} onClick={() => toggleLeft('character')} />
                            <MenuButton label="Inv" keyHint="I" active={right === 'inventory'} onClick={toggleInventory} />
                            <MenuButton label={unspent ? 'Skills!' : 'Skills'} keyHint="K" active={overlay === 'skills'} onClick={() => toggleOverlay('skills')} />
                            <MenuButton label="Quests" keyHint="Q" active={left === 'quests'} onClick={() => toggleLeft('quests')} />
                            <MenuButton label="Codex" keyHint="L" active={left === 'codex'} onClick={() => toggleLeft('codex')} />
                            <MenuButton label="Opts" keyHint="O" active={left === 'options'} onClick={() => toggleLeft('options')} />
                            {devTools && <MenuButton label="Lab" keyHint="~" active={left === 'lab'} onClick={() => toggleLeft('lab')} />}
                        </span>
                    </div>
                </div>
                <Orb value={sheet.mana} max={sheet.mana} color="linear-gradient(#5b7cff, #1b2a7a)" label="Mana" />
            </div>
            <ZoneTitle />
            <HoverPlate />
            <Toasts />
        </>
    );
}

function ZoneTitle() {
    return (
        <div className="absolute right-[8px] top-[6px] text-right">
            <div className="title18 text-gold" style={{ textShadow: '1px 1px 0 #000' }}>
                Thornwick
            </div>
            <div className="s8 text-dim" style={{ textShadow: '1px 1px 0 #000' }}>
                TOWN · SAFE
            </div>
        </div>
    );
}

function HoverPlate() {
    const h = useStore((s) => s.hoverName);
    const left = useStore((s) => s.left);
    const overlay = useStore((s) => s.overlay);
    if (!h || overlay) return null;
    return (
        <div className="frame pointer-events-none absolute top-[6px] px-[8px] py-[2px] text-center" style={{ left: '50%', transform: 'translateX(-50%)', marginLeft: left ? 90 : 0 }}>
            <div className="t10" style={{ color: h.color }}>
                {h.text}
            </div>
            {h.sub && <div className="s8 text-dim">{h.sub.toUpperCase()}</div>}
        </div>
    );
}

function Toasts() {
    const toasts = useStore((s) => s.toasts);
    return (
        <div className="pointer-events-none absolute left-1/2 top-[40px] flex -translate-x-1/2 flex-col items-center gap-[2px]">
            {toasts.map((t) => (
                <div key={t.id} className="t10 px-[6px] py-[1px]" style={{ color: t.color ?? '#e8dcc0', background: 'rgba(0,0,0,0.6)' }}>
                    {t.text}
                </div>
            ))}
        </div>
    );
}
