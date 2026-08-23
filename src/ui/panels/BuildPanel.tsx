/**
 * The Build panel: your permanent, account-wide playstyle. Three simple
 * styles, one point per level, no tree to puzzle over — reads at a glance.
 * Opened with the "C" key.
 */
import Modal from './Modal.tsx';
import { store, useStore } from '../../state/store.ts';
import { saveGame } from '../../game/systems/save.ts';
import {
    availablePoints,
    BUILD_STYLES,
    buildLevelInfo,
    MAX_POINTS_PER_STYLE,
    respecBuild,
    spendBuildPoint,
    STYLE_DESCRIPTIONS,
    STYLE_LABELS,
} from '../../game/systems/build.ts';

const STYLE_COLOR: Record<string, string> = {
    berserker: '#ef4444',
    ranger: '#4ade80',
    warden: '#818cf8',
};

export default function BuildPanel() {
    const save = useStore((s) => s.save);
    const { level, into, need } = buildLevelInfo(save.build.xp);
    const points = availablePoints(save);
    const pct = Math.min(100, Math.round((into / need) * 100));

    return (
        <Modal title="Build" subtitle="Your playstyle — earned from runs, respec anytime, free.">
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

            <div className="space-y-3">
                {BUILD_STYLES.map((style) => {
                    const spent = save.build[style];
                    const maxed = spent >= MAX_POINTS_PER_STYLE;
                    const color = STYLE_COLOR[style];
                    return (
                        <div key={style} className="rounded-xl border p-3" style={{ borderColor: color + '55', backgroundColor: color + '14' }}>
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-bold" style={{ color }}>
                                    {STYLE_LABELS[style]}
                                </span>
                                <span className="text-xs font-bold text-white/60">
                                    {spent}/{MAX_POINTS_PER_STYLE}
                                </span>
                            </div>
                            <p className="mt-1 text-xs text-white/50">{STYLE_DESCRIPTIONS[style]}</p>
                            <div className="mt-2">
                                <button
                                    type="button"
                                    disabled={points <= 0 || maxed}
                                    className={`w-full rounded-lg py-2 text-xs font-bold active:scale-95 ${
                                        points > 0 && !maxed ? 'bg-primary text-black' : 'cursor-not-allowed bg-white/10 text-white/30'
                                    }`}
                                    onClick={() => {
                                        const next = spendBuildPoint(save, style);
                                        store.patch({ save: next });
                                        void saveGame(next);
                                    }}
                                >
                                    {maxed ? 'Maxed' : '+1 Point'}
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            <button
                type="button"
                className="mt-4 w-full rounded-lg bg-white/10 py-2 text-xs font-bold text-white active:scale-95"
                onClick={() => {
                    const next = respecBuild(save);
                    store.patch({ save: next });
                    void saveGame(next);
                    store.pushToast('Build reset — all points refunded.');
                }}
            >
                Respec (free)
            </button>
        </Modal>
    );
}
