import { comboTitle } from '../../content/skills/disciplines.ts';
import { DAMAGE_TYPE_NAMES, SEEK_KINDS, SEEK_NAMES } from '../../content/stats.ts';
import { session, useSession } from '../../state/session.ts';
import { store } from '../../state/store.ts';
import { RES_CAP } from '../../systems/character.ts';
import { ATTR_INFO, ATTRS, xpToNext } from '../../systems/hero.ts';
import { Panel } from '../kit/Panel.tsx';
import { tooltip } from '../kit/tooltip.ts';
import { uiPoint } from '../kit/uiPoint.ts';

function Row({ label, value, color, tip }: { label: string; value: string | number; color?: string; tip?: string }) {
    return (
        <div
            className="t10 pe flex justify-between border-b border-[#241b13] py-[1px]"
            onPointerMove={(e) => {
                if (!tip) return;
                const p = uiPoint(e.clientX, e.clientY);
                tooltip.show({ kind: 'text', lines: [tip] }, p.x, p.y);
            }}
            onPointerLeave={() => tip && tooltip.hide()}
        >
            <span className="text-dim">{label}</span>
            <span style={{ color: color ?? '#e8dcc0' }}>{value}</span>
        </div>
    );
}

export default function CharacterPanel() {
    const s = useSession();
    const hero = s.hero;
    const sh = s.sheet();
    const resColor = (v: number) => (v >= RES_CAP ? '#6fbf5a' : v < 0 ? '#d9534f' : '#e8dcc0');
    const spend = (a: (typeof ATTRS)[number]) => {
        if (hero.attrPoints <= 0) return;
        hero.attrs[a] += 1;
        hero.attrPoints -= 1;
        session.commit();
    };
    const f = sh.fortune;
    return (
        <Panel title="Character" onClose={() => store.patch({ left: null })} style={{ left: 6, top: 6, width: 340 }}>
            <div className="mb-[4px] text-center">
                <div className="t20 text-parch">{hero.name}</div>
                <div className="t10 text-gold">
                    Level {hero.level} {comboTitle(hero.disciplines[0], hero.disciplines[1])}
                </div>
                <div className="frame-inset mx-auto mt-[2px] h-[6px] w-[220px]">
                    <div className="h-full bg-gold" style={{ width: `${Math.min(100, (hero.xp / xpToNext(hero.level)) * 100)}%` }} />
                </div>
                <div className="s8 text-dim">
                    {hero.xp} / {xpToNext(hero.level)} xp
                </div>
            </div>
            <div className="flex gap-[8px]">
                <div className="w-1/2">
                    <div className="s8 mb-[2px] text-dim">ATTRIBUTES {hero.attrPoints > 0 && <span className="text-good">({hero.attrPoints} to spend)</span>}</div>
                    {ATTRS.map((a) => (
                        <div key={a} className="t10 flex items-center justify-between border-b border-[#241b13] py-[1px]">
                            <span
                                className="pe text-dim"
                                onPointerMove={(e) => {
                                    const p = uiPoint(e.clientX, e.clientY);
                                    tooltip.show({ kind: 'text', title: ATTR_INFO[a].name, lines: [ATTR_INFO[a].desc] }, p.x, p.y);
                                }}
                                onPointerLeave={() => tooltip.hide()}
                            >
                                {ATTR_INFO[a].name}
                            </span>
                            <span className="flex items-center gap-[4px]">
                                <span className={sh.attrs[a] > hero.attrs[a] ? 'text-magic' : ''}>{sh.attrs[a]}</span>
                                {hero.attrPoints > 0 && (
                                    <button className="pbtn !px-[3px] !py-0" onClick={() => spend(a)}>
                                        +
                                    </button>
                                )}
                            </span>
                        </div>
                    ))}
                    <div className="s8 mb-[2px] mt-[5px] text-dim">DEFENSE</div>
                    <Row label="Life" value={sh.life} color="#e06a5a" />
                    <Row label="Mana" value={sh.mana} color="#7896ff" />
                    <Row label="Armor" value={sh.armor} />
                    <Row label="Block" value={`${sh.block}%`} />
                    {(['fire', 'cold', 'lightning', 'poison', 'void'] as const).map((t) => (
                        <Row key={t} label={`${DAMAGE_TYPE_NAMES[t]} Res`} value={`${Math.min(RES_CAP, sh.res[t])}%`} color={resColor(sh.res[t])} tip={`Uncapped: ${sh.res[t]}% (cap ${RES_CAP}%)`} />
                    ))}
                    <Row label="Damage Reduced" value={Math.floor(sh.raw.dmgReduce ?? 0)} />
                    <Row label="Thorns" value={Math.floor(sh.raw.thorns ?? 0)} />
                </div>
                <div className="w-1/2">
                    <div className="s8 mb-[2px] text-dim">OFFENSE</div>
                    <Row label="Weapon Damage" value={`${sh.damage[0]}-${sh.damage[1]}`} />
                    {Object.entries(sh.adds).map(([t, r]) => (
                        <Row key={t} label={`+ ${DAMAGE_TYPE_NAMES[t as keyof typeof DAMAGE_TYPE_NAMES]}`} value={`${r![0]}-${r![1]}`} color="#7896ff" />
                    ))}
                    <Row label="Attacks / sec" value={sh.attacksPerSec.toFixed(2)} />
                    <Row label="Crit Chance" value={`${sh.critChance.toFixed(1)}%`} />
                    <Row label="Crit Damage" value={`+${sh.critDamage}%`} />
                    <Row label="Cast Speed" value={`+${sh.castSpeed}%`} />
                    <Row label="Move Speed" value={`+${sh.moveSpeed}%`} />
                    <Row label="Life Regen" value={sh.lifeRegen} />
                    <div className="s8 mb-[2px] mt-[5px] text-gold">FORTUNE</div>
                    <Row label="Rarity Find" value={`+${f.rarity}%`} color="#d9b26a" tip="Better quality on every item that drops (diminishing returns for rare and unique)." />
                    <Row label="Item Quantity" value={`+${f.quantity}%`} color="#d9b26a" tip="Fewer empty drops." />
                    <Row label="Extra Gold" value={`+${f.gold}%`} color="#d9b26a" />
                    {SEEK_KINDS.map((k) => (
                        <Row
                            key={k}
                            label={`${SEEK_NAMES[k]} Find`}
                            value={`+${f.seek[k] ?? 0}%`}
                            color={(f.seek[k] ?? 0) > 0 ? '#d9b26a' : '#5e5444'}
                            tip={k === 'unique' ? 'Only boosts the unique roll.' : `More ${SEEK_NAMES[k].toLowerCase()} drops: multiplies how often loot of this kind is picked.`}
                        />
                    ))}
                </div>
            </div>
        </Panel>
    );
}
