import Modal from './Modal.tsx';
import { ActionButton } from './ItemCard.tsx';
import { store, useStore } from '../../state/store.ts';
import { saveGame } from '../../game/systems/save.ts';
import { gamble, gambleCost, type GambleCategory } from '../../game/systems/merchant.ts';
import { advanceBounties } from '../../game/systems/quests.ts';
import { itemDisplayName, RARITY_TITLE } from '../../game/data/nameGen.ts';
import { getRhuneDef } from '../../game/data/rhunes.ts';

const CATEGORY_OPTIONS: { category: GambleCategory; label: string }[] = [
    { category: 'hand', label: 'Hand (weapon/shield)' },
    { category: 'head', label: 'Head' },
    { category: 'torso', label: 'Torso' },
    { category: 'legs', label: 'Legs' },
    { category: 'feet', label: 'Feet' },
    { category: 'jewelry', label: 'Jewelry' },
    { category: 'rhune', label: 'Rhune' },
];

export default function MerchantPanel() {
    const save = useStore((s) => s.save);
    const cost = gambleCost(save.selectedTier);

    return (
        <Modal title="Merchant" subtitle={`${save.currency} Scrap`}>
            <p className="mb-3 text-xs text-white/50">
                Spend Scrap on a blind gamble — rarity is pure luck, tier-weighted the same as floor loot. It's the only place in the Hub to gamble
                for a Rhune outright.
            </p>
            <div className="space-y-2">
                {CATEGORY_OPTIONS.map(({ category, label }) => {
                    const affordable = save.currency >= cost;
                    return (
                        <div key={category} className="rounded-xl border border-white/10 bg-white/5 p-3">
                            <span className="text-sm font-bold text-white">{label}</span>
                            <div className="mt-2 flex">
                                <ActionButton
                                    label={affordable ? `Gamble (${cost}◆)` : `Need ${cost}◆`}
                                    tone={affordable ? 'primary' : 'default'}
                                    onClick={() => {
                                        const { save: rolledSave, rolled } = gamble(save, category);
                                        if (!rolled) return;
                                        const next = advanceBounties(rolledSave, 'gamble', 1);
                                        store.patch({ save: next });
                                        void saveGame(next);
                                        if (rolled.kind === 'item') {
                                            store.pushToast(`Gambled: ${RARITY_TITLE[rolled.item.rarity]}${itemDisplayName(rolled.item)}!`);
                                        } else {
                                            const def = getRhuneDef(rolled.rhune.rhuneDefId);
                                            store.pushToast(`Gambled: ${RARITY_TITLE[rolled.rhune.rarity]}${def?.name ?? 'Unknown Rhune'}!`);
                                        }
                                    }}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>
        </Modal>
    );
}
