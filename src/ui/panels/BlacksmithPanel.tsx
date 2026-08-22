import { useState } from 'react';
import Modal from './Modal.tsx';
import { ActionButton, ItemCard } from './ItemCard.tsx';
import { store, useStore } from '../../state/store.ts';
import type { ItemKind } from '../../game/data/types.ts';
import { saveGame } from '../../game/systems/save.ts';
import { craftCost, craftItem, rerollCost, rerollItem } from '../../game/systems/blacksmith.ts';
import { isItemEquipped } from '../../game/systems/inventory.ts';

type Tab = 'reroll' | 'craft';

const KIND_OPTIONS: { kind: ItemKind; label: string }[] = [
    { kind: 'hand', label: 'Hand (weapon/shield)' },
    { kind: 'head', label: 'Head' },
    { kind: 'torso', label: 'Torso' },
    { kind: 'legs', label: 'Legs' },
    { kind: 'feet', label: 'Feet' },
    { kind: 'jewelry', label: 'Jewelry' },
];

export default function BlacksmithPanel() {
    const [tab, setTab] = useState<Tab>('reroll');
    const save = useStore((s) => s.save);
    const cost = craftCost(save.selectedTier);

    return (
        <Modal title="Blacksmith" subtitle={`${save.currency} Scrap`}>
            <div className="mb-3 flex gap-2">
                <button
                    type="button"
                    className={`flex-1 rounded-lg py-2 text-sm font-bold ${tab === 'reroll' ? 'bg-primary text-black' : 'bg-white/10 text-white'}`}
                    onClick={() => setTab('reroll')}
                >
                    Reroll Affixes
                </button>
                <button
                    type="button"
                    className={`flex-1 rounded-lg py-2 text-sm font-bold ${tab === 'craft' ? 'bg-primary text-black' : 'bg-white/10 text-white'}`}
                    onClick={() => setTab('craft')}
                >
                    Craft New
                </button>
            </div>

            {tab === 'reroll' ? (
                <div className="space-y-2">
                    <p className="text-xs text-white/50">
                        Rerolls keep the same affixes but re-rolls their values. Cost scales with rarity.
                    </p>
                    {save.items.length === 0 && <p className="py-8 text-center text-sm text-white/40">No gear to reroll yet.</p>}
                    {save.items.map((item) => {
                        const price = rerollCost(item);
                        const equippedSlot = isItemEquipped(save, item.instanceId);
                        const affordable = save.currency >= price;
                        return (
                            <ItemCard key={item.instanceId} item={item} equippedIn={equippedSlot}>
                                <ActionButton
                                    label={affordable ? `Reroll (${price}◆)` : `Need ${price}◆`}
                                    tone={affordable ? 'primary' : 'default'}
                                    onClick={() => {
                                        if (!affordable) return;
                                        const next = rerollItem(save, item.instanceId);
                                        store.patch({ save: next });
                                        void saveGame(next);
                                    }}
                                />
                            </ItemCard>
                        );
                    })}
                </div>
            ) : (
                <div className="space-y-2">
                    <p className="text-xs text-white/50">
                        Craft a fresh item of the chosen kind, rolled at your current tier ({cost}◆ each).
                    </p>
                    {KIND_OPTIONS.map(({ kind, label }) => {
                        const affordable = save.currency >= cost;
                        return (
                            <div key={kind} className="rounded-xl border border-white/10 bg-white/5 p-3">
                                <span className="text-sm font-bold text-white">{label}</span>
                                <div className="mt-2 flex">
                                    <ActionButton
                                        label={affordable ? `Craft (${cost}◆)` : `Need ${cost}◆`}
                                        tone={affordable ? 'primary' : 'default'}
                                        onClick={() => {
                                            if (!affordable) return;
                                            const next = craftItem(save, kind);
                                            store.patch({ save: next });
                                            void saveGame(next);
                                            store.pushToast(`Forged a new ${label.split(' ')[0].toLowerCase()} item!`);
                                        }}
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </Modal>
    );
}
