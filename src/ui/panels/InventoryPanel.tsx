/**
 * The Inventory (bag): a small bounded space for loot fresh out of a run.
 * Full bag doesn't block picking up more loot — the overflow just
 * auto-salvages for Scrap (see addLootToBag) — but this panel is where you
 * decide what's worth carrying back into the Chest before that starts
 * happening. Opened with the "I" key, no hub station.
 */
import Modal from './Modal.tsx';
import { ActionButton, ItemCard, RhuneCard } from './ItemCard.tsx';
import { store, useStore } from '../../state/store.ts';
import { saveGame } from '../../game/systems/save.ts';
import {
    autoEquipRhuneSocket,
    autoEquipSlot,
    bagCapacity,
    bagCount,
    bagUpgradeCost,
    equipItem,
    equipRhune,
    moveItemToChest,
    moveRhuneToChest,
    salvageItem,
    salvageRhune,
    upgradeBag,
} from '../../game/systems/inventory.ts';

export default function InventoryPanel() {
    const save = useStore((s) => s.save);
    const count = bagCount(save);
    const cap = bagCapacity(save);
    const upgradeCost = bagUpgradeCost(save);
    const affordable = save.currency >= upgradeCost;

    return (
        <Modal title="Inventory" subtitle={`${count}/${cap} slots · ${save.currency} Scrap`}>
            <div className="mb-3 flex items-center justify-between rounded-xl bg-white/5 p-3">
                <div className="text-xs text-white/50">Store what you want to keep in the Chest — a full bag auto-salvages new drops.</div>
            </div>
            <div className="mb-3">
                <ActionButton
                    label={affordable ? `Upgrade Bag (+4 slots, ${upgradeCost}◆)` : `Upgrade Bag — need ${upgradeCost}◆`}
                    tone={affordable ? 'primary' : 'default'}
                    onClick={() => {
                        if (!affordable) return;
                        const next = upgradeBag(save);
                        store.patch({ save: next });
                        void saveGame(next);
                    }}
                />
            </div>
            <div className="space-y-2">
                {save.bag.map((item) => (
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
                            label="Store"
                            onClick={() => {
                                const next = moveItemToChest(save, item.instanceId);
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
                {save.bagRhunes.map((rhune) => (
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
                            label="Store"
                            onClick={() => {
                                const next = moveRhuneToChest(save, rhune.instanceId);
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
                {save.bag.length === 0 && save.bagRhunes.length === 0 && (
                    <p className="py-8 text-center text-sm text-white/40">Bag's empty. Go find some chaos.</p>
                )}
            </div>
        </Modal>
    );
}
