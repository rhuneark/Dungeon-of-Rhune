/**
 * In-game HUD: a React overlay above the Pixi canvas. Content adapts to
 * store.location — the hub shows currency/tier chrome, the dungeon shows
 * the live run readout (floor, HP, kill quota) plus the Exit button.
 *
 * Pattern to keep: the overlay itself is pointer-events-none so taps fall
 * through to the canvas; each interactive control opts back in with
 * pointer-events-auto.
 */
import { store, useStore } from '../state/store.ts';
import { getTier } from '../game/data/tiers.ts';
import { requestExitToHub } from '../game/dungeonController.ts';

export default function Hud() {
    const location = useStore((s) => s.location);
    const save = useStore((s) => s.save);
    const run = useStore((s) => s.run);
    const paused = useStore((s) => s.paused);

    const tier = getTier(save.selectedTier);

    return (
        <div className="pointer-events-none absolute inset-0 pt-safe-top">
            <div className="flex items-start justify-between p-4">
                {location === 'hub' ? (
                    <div className="pointer-events-auto rounded-xl bg-black/50 px-4 py-2 text-sm font-bold">
                        <span style={{ color: `#${tier.color.toString(16).padStart(6, '0')}` }}>{tier.name}</span>
                        <span className="ml-3 text-white/70">{save.currency}◆</span>
                    </div>
                ) : (
                    <div className="pointer-events-auto flex flex-col gap-1 rounded-xl bg-black/50 px-4 py-2">
                        <div className="text-lg font-bold tabular-nums">Floor {run?.floor ?? 1}</div>
                        <div className="h-2 w-36 overflow-hidden rounded-full bg-white/10">
                            <div
                                className="h-full rounded-full bg-red-500 transition-[width] duration-150"
                                style={{ width: `${run ? Math.max(0, (run.hp / Math.max(1, run.maxHp)) * 100) : 100}%` }}
                            />
                        </div>
                        <div className="text-[11px] text-white/50">
                            Kills {run?.kills ?? 0}/{run?.killsNeeded ?? 0}
                        </div>
                    </div>
                )}

                <div className="flex gap-2">
                    {location === 'dungeon' && (
                        <button
                            type="button"
                            className="pointer-events-auto rounded-xl bg-black/50 px-4 py-2 text-sm font-bold transition-transform active:scale-95"
                            onClick={requestExitToHub}
                        >
                            Exit
                        </button>
                    )}
                    {location === 'hub' && (
                        <button
                            type="button"
                            className="pointer-events-auto rounded-xl bg-black/50 px-4 py-2 text-sm font-bold transition-transform active:scale-95"
                            onClick={() => store.patch({ phase: 'menu' })}
                        >
                            Menu
                        </button>
                    )}
                </div>
            </div>
            {paused && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                    <p className="text-2xl font-bold">Paused</p>
                </div>
            )}
        </div>
    );
}
