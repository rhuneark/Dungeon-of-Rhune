/**
 * The dungeon-entry popup: replaces the old walk-to Tier Statue station.
 * Tapping the Dungeon Entrance opens this instead of diving straight in —
 * pick (or confirm) your tier, then commit.
 */
import Modal from './Modal.tsx';
import { store, useStore } from '../../state/store.ts';
import { TIERS } from '../../game/data/tiers.ts';
import { saveGame } from '../../game/systems/save.ts';
import { enterDungeon } from '../../game/dungeonController.ts';

export default function DungeonEntryPanel() {
    const save = useStore((s) => s.save);
    const tier = TIERS.find((t) => t.id === save.selectedTier)!;

    return (
        <Modal title="Enter the Dungeon" subtitle="Difficulty persists until you change it here.">
            <div className="space-y-2">
                {TIERS.map((t) => {
                    const unlocked = save.unlockedTiers.includes(t.id);
                    const selected = save.selectedTier === t.id;
                    const best = save.bestFloorByTier[t.id] ?? 0;
                    return (
                        <button
                            key={t.id}
                            type="button"
                            disabled={!unlocked}
                            onClick={() => {
                                if (!unlocked) return;
                                const next = { ...save, selectedTier: t.id };
                                store.patch({ save: next });
                                void saveGame(next);
                            }}
                            className={`w-full rounded-xl border p-3 text-left transition ${
                                selected ? 'border-primary bg-primary/10' : 'border-white/10 bg-white/5'
                            } ${!unlocked ? 'cursor-not-allowed opacity-40' : 'active:scale-[0.99]'}`}
                        >
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-bold" style={{ color: `#${t.color.toString(16).padStart(6, '0')}` }}>
                                    {t.name}
                                </span>
                                {!unlocked && <span className="text-[11px] font-bold uppercase text-white/40">Locked</span>}
                                {selected && unlocked && <span className="text-[11px] font-bold uppercase text-primary">Selected</span>}
                            </div>
                            <p className="mt-0.5 text-xs text-white/50">{t.tagline}</p>
                            <p className="mt-1 text-[11px] text-white/40">
                                Best floor: {best}
                                {!unlocked && t.id > 1 ? ` · unlock at floor ${TIERS.find((prev) => prev.id === t.id - 1)?.unlockAtFloor} of ${TIERS.find((prev) => prev.id === t.id - 1)?.name}` : ''}
                            </p>
                        </button>
                    );
                })}
            </div>
            <button
                type="button"
                className="mt-4 w-full rounded-xl bg-primary py-3 text-sm font-bold text-black active:scale-[0.98]"
                onClick={enterDungeon}
            >
                Enter {tier.name}
            </button>
        </Modal>
    );
}
