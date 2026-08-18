import Modal from './Modal.tsx';
import { store, useStore } from '../../state/store.ts';
import { getTier } from '../../game/data/tiers.ts';

export default function DeathPanel() {
    const save = useStore((s) => s.save);
    const deathSummary = useStore((s) => s.deathSummary);
    const tier = getTier(save.selectedTier);
    const best = save.bestFloorByTier[save.selectedTier] ?? 0;

    return (
        <Modal title="You Died (Again)" subtitle={tier.name}>
            <p className="text-sm text-white/70">
                Reached floor <span className="font-bold text-white">{deathSummary?.floor ?? '?'}</span> before something
                with too many teeth disagreed with your life choices.
            </p>
            <p className="mt-2 text-xs text-white/40">Best floor cleared in {tier.name}: {best}</p>
            <button
                type="button"
                className="mt-4 w-full rounded-xl bg-primary py-3 text-sm font-bold text-black active:scale-95"
                onClick={() => store.patch({ panel: null })}
            >
                Return to Hub
            </button>
        </Modal>
    );
}
