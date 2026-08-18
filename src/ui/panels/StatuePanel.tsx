import Modal from './Modal.tsx';
import { store, useStore } from '../../state/store.ts';
import { TIERS } from '../../game/data/tiers.ts';
import { saveGame } from '../../game/systems/save.ts';

export default function StatuePanel() {
    const save = useStore((s) => s.save);

    return (
        <Modal title="Tier Statue" subtitle="Difficulty persists until you change it here.">
            <div className="space-y-2">
                {TIERS.map((tier) => {
                    const unlocked = save.unlockedTiers.includes(tier.id);
                    const selected = save.selectedTier === tier.id;
                    const best = save.bestFloorByTier[tier.id] ?? 0;
                    return (
                        <button
                            key={tier.id}
                            type="button"
                            disabled={!unlocked}
                            onClick={() => {
                                if (!unlocked) return;
                                const next = { ...save, selectedTier: tier.id };
                                store.patch({ save: next });
                                void saveGame(next);
                            }}
                            className={`w-full rounded-xl border p-3 text-left transition ${
                                selected ? 'border-primary bg-primary/10' : 'border-white/10 bg-white/5'
                            } ${!unlocked ? 'cursor-not-allowed opacity-40' : 'active:scale-[0.99]'}`}
                        >
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-bold" style={{ color: `#${tier.color.toString(16).padStart(6, '0')}` }}>
                                    {tier.name}
                                </span>
                                {!unlocked && <span className="text-[11px] font-bold uppercase text-white/40">Locked</span>}
                                {selected && unlocked && <span className="text-[11px] font-bold uppercase text-primary">Selected</span>}
                            </div>
                            <p className="mt-0.5 text-xs text-white/50">{tier.tagline}</p>
                            <p className="mt-1 text-[11px] text-white/40">
                                Best floor: {best}
                                {!unlocked && tier.id > 1 ? ` · unlock at floor ${TIERS.find((t) => t.id === tier.id - 1)?.unlockAtFloor} of ${TIERS.find((t) => t.id === tier.id - 1)?.name}` : ''}
                            </p>
                        </button>
                    );
                })}
            </div>
        </Modal>
    );
}
