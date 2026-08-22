import { useState } from 'react';
import Modal from './Modal.tsx';
import { ActionButton, ItemCard, RhuneCard } from './ItemCard.tsx';
import { store, useStore } from '../../state/store.ts';
import { GEAR_SLOTS, type GearSlot } from '../../game/data/types.ts';
import { saveGame } from '../../game/systems/save.ts';
import {
    autoEquipRhuneSocket,
    autoEquipSlot,
    equipItem,
    equipRhune,
    isItemEquipped,
    isRhuneEquipped,
    salvageItem,
    salvageRhune,
    unequipRhune,
    unequipSlot,
} from '../../game/systems/inventory.ts';
import { advanceBounties } from '../../game/systems/quests.ts';

const SLOT_LABEL: Record<GearSlot, string> = {
    head: 'Head',
    torso: 'Torso',
    legs: 'Legs',
    feet: 'Feet',
    hand1: 'Hand 1',
    hand2: 'Hand 2',
    jewelry1: 'Jewelry 1',
    jewelry2: 'Jewelry 2',
};

type Tab = 'equipment' | 'inventory';

export default function InventoryPanel({ initialTab }: { initialTab: Tab }) {
    const [tab, setTab] = useState<Tab>(initialTab);
    const save = useStore((s) => s.save);

    return (
        <Modal title="Loadout" subtitle={`${save.currency} Scrap`}>
            <div className="mb-3 flex gap-2">
                <button
                    type="button"
                    className={`flex-1 rounded-lg py-2 text-sm font-bold ${tab === 'equipment' ? 'bg-primary text-black' : 'bg-white/10 text-white'}`}
                    onClick={() => setTab('equipment')}
                >
                    Equipment
                </button>
                <button
                    type="button"
                    className={`flex-1 rounded-lg py-2 text-sm font-bold ${tab === 'inventory' ? 'bg-primary text-black' : 'bg-white/10 text-white'}`}
                    onClick={() => setTab('inventory')}
                >
                    Inventory ({save.items.filter((i) => !isItemEquipped(save, i.instanceId)).length + save.rhunes.filter((r) => isRhuneEquipped(save, r.instanceId) === -1).length})
                </button>
            </div>

            {tab === 'equipment' ? (
                <div className="space-y-2">
                    {GEAR_SLOTS.map((slot) => {
                        const itemId = save.equipped[slot];
                        const item = itemId ? save.items.find((i) => i.instanceId === itemId) : null;
                        return (
                            <div key={slot}>
                                <div className="mb-1 text-[11px] font-bold uppercase tracking-wide text-white/40">{SLOT_LABEL[slot]}</div>
                                {item ? (
                                    <ItemCard item={item}>
                                        <ActionButton
                                            label="Unequip"
                                            onClick={() => {
                                                const next = unequipSlot(save, slot);
                                                store.patch({ save: next });
                                                void saveGame(next);
                                            }}
                                        />
                                    </ItemCard>
                                ) : (
                                    <div className="rounded-xl border border-dashed border-white/15 p-3 text-center text-xs text-white/30">Empty</div>
                                )}
                            </div>
                        );
                    })}
                    <div className="mb-1 mt-4 text-[11px] font-bold uppercase tracking-wide text-white/40">Rhune Sockets</div>
                    {[0, 1, 2].map((socket) => {
                        const rhuneId = save.equippedRhunes[socket];
                        const rhune = rhuneId ? save.rhunes.find((r) => r.instanceId === rhuneId) : null;
                        return (
                            <div key={socket}>
                                {rhune ? (
                                    <RhuneCard rhune={rhune}>
                                        <ActionButton
                                            label="Unclip"
                                            onClick={() => {
                                                const next = unequipRhune(save, socket as 0 | 1 | 2);
                                                store.patch({ save: next });
                                                void saveGame(next);
                                            }}
                                        />
                                    </RhuneCard>
                                ) : (
                                    <div className="rounded-xl border border-dashed border-white/15 p-3 text-center text-xs text-white/30">Empty socket</div>
                                )}
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="space-y-2">
                    {save.items
                        .filter((i) => !isItemEquipped(save, i.instanceId))
                        .map((item) => (
                            <ItemCard key={item.instanceId} item={item}>
                                <ActionButton
                                    label="Equip"
                                    tone="primary"
                                    onClick={() => {
                                        const slot = autoEquipSlot(save, item);
                                        const next = equipItem(save, item.instanceId, slot);
                                        store.patch({ save: next });
                                        void saveGame(next);
                                    }}
                                />
                                <ActionButton
                                    label="Salvage"
                                    tone="danger"
                                    onClick={() => {
                                        const next = advanceBounties(salvageItem(save, item.instanceId), 'salvage', 1);
                                        store.patch({ save: next });
                                        void saveGame(next);
                                    }}
                                />
                            </ItemCard>
                        ))}
                    {save.rhunes
                        .filter((r) => isRhuneEquipped(save, r.instanceId) === -1)
                        .map((rhune) => (
                            <RhuneCard key={rhune.instanceId} rhune={rhune}>
                                <ActionButton
                                    label="Socket"
                                    tone="primary"
                                    onClick={() => {
                                        const socket = autoEquipRhuneSocket(save);
                                        const next = equipRhune(save, rhune.instanceId, socket);
                                        store.patch({ save: next });
                                        void saveGame(next);
                                    }}
                                />
                                <ActionButton
                                    label="Salvage"
                                    tone="danger"
                                    onClick={() => {
                                        const next = advanceBounties(salvageRhune(save, rhune.instanceId), 'salvage', 1);
                                        store.patch({ save: next });
                                        void saveGame(next);
                                    }}
                                />
                            </RhuneCard>
                        ))}
                    {save.items.filter((i) => !isItemEquipped(save, i.instanceId)).length === 0 &&
                        save.rhunes.filter((r) => isRhuneEquipped(save, r.instanceId) === -1).length === 0 && (
                            <p className="py-8 text-center text-sm text-white/40">Nothing in the chest. Go get chaotic.</p>
                        )}
                </div>
            )}
        </Modal>
    );
}
