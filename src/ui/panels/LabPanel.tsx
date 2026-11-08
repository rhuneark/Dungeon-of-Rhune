/**
 * Loot Lab (dev tool, toggle with `): roll any treasure class at any level
 * with any fortune, or simulate thousands of drops to see the odds. This is
 * where loot tuning happens.
 */
import { useState } from 'react';
import { TREASURE_CLASSES } from '../../content/loot/treasureClasses.ts';
import { SEEK_KINDS, SEEK_NAMES, type SeekKind } from '../../content/stats.ts';
import { worldBridge } from '../../game/worldBridge.ts';
import { session, useSession } from '../../state/session.ts';
import { store } from '../../state/store.ts';
import { rollTreasure, simulateDrops, type Fortune } from '../../systems/loot.ts';
import { gainXp } from '../../systems/progression.ts';
import { Panel } from '../kit/Panel.tsx';

const ORDER = ['gold', 'consumable', 'crude', 'normal', 'superior', 'magic', 'rare', 'unique', 'rhune'];

export default function LabPanel() {
    const s = useSession();
    const sheet = s.sheet();
    const [tc, setTc] = useState('elite');
    const [level, setLevel] = useState(12);
    const [useMine, setUseMine] = useState(true);
    const [rf, setRf] = useState(100);
    const [seek, setSeek] = useState<Partial<Record<SeekKind, number>>>({});
    const [sim, setSim] = useState<ReturnType<typeof simulateDrops> | null>(null);
    const fortune: Fortune = useMine ? sheet.fortune : { rarity: rf, quantity: 0, gold: 0, seek };

    const num = (v: number, set: (n: number) => void, min = 0, max = 999) => (
        <input type="number" className="t10 frame-inset w-[44px] px-[2px] text-parch" value={v} min={min} max={max} onChange={(e) => set(Math.max(min, Math.min(max, Number(e.target.value) || 0)))} />
    );

    return (
        <Panel title="Loot Lab" onClose={() => store.patch({ left: null })} style={{ left: 6, top: 6, width: 350 }}>
            <div className="t10 mb-[4px] text-center text-dim">Dev tool: toggle with the ~ key. Rolls real drops at your feet.</div>
            <div className="t10 flex flex-wrap items-center gap-[4px]">
                <span className="text-dim">Source</span>
                <select className="t10 frame-inset text-parch" value={tc} onChange={(e) => setTc(e.target.value)}>
                    {TREASURE_CLASSES.map((t) => (
                        <option key={t.id} value={t.id}>
                            {t.name}
                        </option>
                    ))}
                </select>
                <span className="text-dim">Level</span>
                {num(level, setLevel, 1, 40)}
            </div>
            <label className="t10 mt-[3px] flex items-center gap-[4px] text-parch">
                <input type="checkbox" checked={useMine} onChange={(e) => setUseMine(e.target.checked)} /> Use my gear's Fortune (RF {sheet.fortune.rarity}%)
            </label>
            {!useMine && (
                <div className="t10 mt-[2px] grid grid-cols-2 gap-[2px]">
                    <span className="flex items-center justify-between gap-[2px] text-dim">Rarity {num(rf, setRf)}</span>
                    {SEEK_KINDS.map((k) => (
                        <span key={k} className="flex items-center justify-between gap-[2px] text-dim">
                            {SEEK_NAMES[k]} {num(seek[k] ?? 0, (n) => setSeek({ ...seek, [k]: n }))}
                        </span>
                    ))}
                </div>
            )}
            <div className="mt-[4px] flex flex-wrap gap-[3px]">
                <button className="pbtn" onClick={() => worldBridge.spawnDrops(rollTreasure(tc, { ilvl: level, fortune }), 'player')}>
                    Roll drop
                </button>
                <button className="pbtn" onClick={() => worldBridge.spawnDrops([...Array(10)].flatMap(() => rollTreasure(tc, { ilvl: level, fortune })), 'player')}>
                    Roll x10
                </button>
                <button className="pbtn" onClick={() => setSim(simulateDrops(tc, { ilvl: level, fortune }, 5000))}>
                    Simulate 5,000
                </button>
            </div>
            {sim && (
                <div className="frame-inset t10 mt-[4px] p-[3px]">
                    <div className="text-dim">
                        {sim.n} × {TREASURE_CLASSES.find((t) => t.id === tc)?.name} @ lvl {level}
                    </div>
                    {ORDER.filter((k) => sim.tally[k]).map((k) => (
                        <div key={k} className="flex justify-between">
                            <span className="capitalize text-parch">{k}</span>
                            <span className="text-gold">
                                {sim.tally[k]} <span className="text-dim">(1 in {(sim.n / sim.tally[k]).toFixed(1)} kills)</span>
                            </span>
                        </div>
                    ))}
                </div>
            )}
            <div className="s8 mt-[6px] text-dim">CHEATS</div>
            <div className="flex flex-wrap gap-[3px]">
                <button className="pbtn" onClick={() => ((session.hero.gold += 5000), session.commit())}>
                    +5,000 gold
                </button>
                <button
                    className="pbtn"
                    onClick={() => {
                        gainXp(session.hero, 1000);
                        session.commit();
                    }}
                >
                    +1,000 xp
                </button>
                <button className="pbtn" onClick={() => ((session.hero.pathPoints += 5), session.commit())}>
                    +5 Path Points
                </button>
            </div>
        </Panel>
    );
}
