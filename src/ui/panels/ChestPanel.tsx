/**
 * The Chest: permanent tabbed storage, with your current loadout as its own
 * tab. Bag items only become "safe" once moved here — this panel is where
 * that happens, plus where equipping/unequipping actually lives now.
 */
import { useState } from 'react';
import Modal from './Modal.tsx';
import { ActionButton, ItemCard, RhuneCard } from './ItemCard.tsx';
import { store, useStore } from '../../state/store.ts';
import { GEAR_SLOTS, type GearSlot } from '../../game/data/types.ts';
import { getBaseType } from '../../game/data/baseTypes.ts';
import { saveGame } from '../../game/systems/save.ts';
import {
    autoEquipRhuneSocket,
    autoEquipSlot,
    chestCapacity,
    chestCount,
    chestUpgradeCost,
    equipItem,
    equipRhune,
    hasFourthRhuneSocket,
    isItemEquipped,
    isRhuneEquipped,
    moveItemToBag,
    moveRhuneToBag,
    salvageItem,
    salvageRhune,
    unequipRhune,
    unequipSlot,
    upgradeChest,
} from '../../game/systems/inventory.ts';

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

const ARMOR_KINDS = new Set(['head', 'torso', 'legs', 'feet']);

type Tab = 'equipped' | 'weapons' | 'armor' | 'jewelry' | 'rhunes';
const TABS: { tab: Tab; label: string }[] = [
    { tab: 'equipped', label: 'Equipped' },
    { tab: 'weapons', label: 'Weapons' },
    { tab: 'armor', label: 'Armor' },
    { tab: 'jewelry', label: 'Jewelry' },
    { tab: 'rhunes', label: 'Rhunes' },
];

export default function ChestPanel() {
    const [tab, setTab] = useState<Tab>('equipped');
    const save = useStore((s) => s.save);
    const count = chestCount(save);
    const cap = chestCapacity(save);
    const upgradeCost = chestUpgradeCost(save);
    const affordable = save.currency >= upgradeCost;

    const storedItems = save.items.filter((i) => isItemEquipped(save, i.instanceId) === null);
    const storedRhunes = save.rhunes.filter((r) => isRhuneEquipped(save, r.instanceId) === -1);
    const kindItems = (kind: 'hand' | 'armor' | 'jewelry') =>
        storedItems.filter((i) => {
            const base = getBaseType(i.baseTypeId);
            if (!base) return false;
            if (kind === 'armor') return ARMOR_KINDS.has(base.kind);
            return base.kind === kind;
        });

    return (
        <Modal title="Chest" subtitle={`${count}/${cap} stored · ${save.currency} Scrap`}>
            <div className="mb-3">
                <ActionButton
                    label={affordable ? `Upgrade Chest (+20 slots, ${upgradeCost}◆)` : `Upgrade Chest — need ${upgradeCost}◆`}
                    tone={affordable ? 'primary' : 'default'}
                    onClick={() => {
                        if (!affordable) return;
                        const next = upgradeChest(save);
                        store.patch({ save: next });
                        void saveGame(next);
                    }}
                />
            </div>
            <div className="mb-3 flex gap-1.5 overflow-x-auto">
                {TABS.map(({ tab: t, label }) => (
                    <button
                        key={t}
                        type="button"
                        className={`shrink-0 rounded-lg px-3 py-2 text-xs font-bold ${tab === t ? 'bg-primary text-black' : 'bg-white/10 text-white'}`}
                        onClick={() => setTab(t)}
                    >
                        {label}
                    </button>
                ))}
            </div>

            {tab === 'equipped' ? (
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
                    {(hasFourthRhuneSocket(save) ? [0, 1, 2, 3] : [0, 1, 2]).map((socket) => {
                        const rhuneId = socket === 3 ? save.bonusRhuneSocket : save.equippedRhunes[socket];
                        const rhune = rhuneId ? save.rhunes.find((r) => r.instanceId === rhuneId) : null;
                        return (
                            <div key={socket}>
                                {rhune ? (
                                    <RhuneCard rhune={rhune}>
                                        <ActionButton
                                            label="Unclip"
                                            onClick={() => {
                                                const next = unequipRhune(save, socket as 0 | 1 | 2 | 3);
                                                store.patch({ save: next });
                                                void saveGame(next);
                                            }}
                                        />
                                    </RhuneCard>
                                ) : (
                                    <div className="rounded-xl border border-dashed border-white/15 p-3 text-center text-xs text-white/30">
                                        {socket === 3 ? 'Bonus socket (The Fourth Rhune)' : 'Empty socket'}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            ) : tab === 'rhunes' ? (
                <div className="space-y-2">
                    {storedRhunes.map((rhune) => (
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
                                label="To Bag"
                                onClick={() => {
                                    const next = moveRhuneToBag(save, rhune.instanceId);
                                    store.patch({ save: next });
                                    void saveGame(next);
                                }}
                            />
                            <ActionButton
                                label="Salvage"
                                tone="danger"
                                onClick={() => {
                                    const next = salvageRhune(save, rhune.instanceId);
                                    store.patch({ save: next });
                                    void saveGame(next);
                                }}
                            />
                        </RhuneCard>
                    ))}
                    {storedRhunes.length === 0 && <p className="py-8 text-center text-sm text-white/40">No stored Rhunes.</p>}
                </div>
            ) : (
                <div className="space-y-2">
                    {kindItems(tab === 'weapons' ? 'hand' : tab).map((item) => (
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
                                label="To Bag"
                                onClick={() => {
                                    const next = moveItemToBag(save, item.instanceId);
                                    store.patch({ save: next });
                                    void saveGame(next);
                                }}
                            />
                            <ActionButton
                                label="Salvage"
                                tone="danger"
                                onClick={() => {
                                    const next = salvageItem(save, item.instanceId);
                                    store.patch({ save: next });
                                    void saveGame(next);
                                }}
                            />
                        </ItemCard>
                    ))}
                    {kindItems(tab === 'weapons' ? 'hand' : tab).length === 0 && (
                        <p className="py-8 text-center text-sm text-white/40">Nothing stored here.</p>
                    )}
                </div>
            )}
        </Modal>
    );
}
