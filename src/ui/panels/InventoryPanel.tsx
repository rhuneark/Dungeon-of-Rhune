/**
 * Inventory: one full-screen ARPG-style screen — an equipment paperdoll
 * (body-diagram arrangement, Rhune sockets below it), and a Bag/Chest
 * storage grid of compact item-icon slots next to it. Hover a slot on
 * desktop (or tap on mobile — the same `active` state drives both) to pin
 * its detail card in the right-hand dock, with Equip/Store/Salvage actions
 * and a Compare toggle that drops the currently-equipped counterpart in
 * right below it. Replaces the old separate Bag/Chest panels — opened with
 * the "I" key (defaults to Bag) or by walking to the Chest station
 * (defaults to Chest).
 */
import { useState } from 'react';
import Modal from './Modal.tsx';
import { ActionButton, ItemCard, RhuneCard } from './ItemCard.tsx';
import { store, useStore, type SaveData } from '../../state/store.ts';
import { saveGame } from '../../game/systems/save.ts';
import type { GearSlot, ItemInstance, RhuneInstance } from '../../game/data/types.ts';
import { RARITIES } from '../../game/data/rarity.ts';
import { getBaseType } from '../../game/data/baseTypes.ts';
import { getRhuneDef } from '../../game/data/rhunes.ts';
import { itemDisplayName } from '../../game/data/nameGen.ts';
import {
    autoEquipRhuneSocket,
    autoEquipSlot,
    bagCapacity,
    bagCount,
    bagUpgradeCost,
    canEquip,
    chestCapacity,
    chestCount,
    chestUpgradeCost,
    equipItem,
    equipRhune,
    hasFourthRhuneSocket,
    isItemEquipped,
    isRhuneEquipped,
    moveItemToBag,
    moveItemToChest,
    moveRhuneToBag,
    moveRhuneToChest,
    salvageItem,
    salvageRhune,
    unequipRhune,
    unequipSlot,
    upgradeBag,
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

type Active = { kind: 'item'; id: string } | { kind: 'rhune'; id: string } | null;
type StorageTab = 'bag' | 'chest';

/** One square icon slot — used for both the paperdoll and the storage grid. Hover shows it in the dock (desktop); click/tap pins it (mobile, and desktop too so the dock survives the mouse leaving the grid). */
function SlotBox({
    label,
    item,
    rhune,
    active,
    onActivate,
}: {
    label: string;
    item?: ItemInstance | null;
    rhune?: RhuneInstance | null;
    active: boolean;
    onActivate: () => void;
}) {
    const rarity = item ? RARITIES[item.rarity] : rhune ? RARITIES[rhune.rarity] : null;
    const glyph = item ? itemDisplayName(item).charAt(0) : rhune ? (getRhuneDef(rhune.rhuneDefId)?.name.charAt(0) ?? '?') : '';
    const empty = !item && !rhune;
    return (
        <button
            type="button"
            onMouseEnter={onActivate}
            onClick={onActivate}
            className={`flex aspect-square w-full flex-col items-center justify-center gap-1 rounded-xl border-2 transition-transform active:scale-95 ${
                active ? 'ring-2 ring-primary' : ''
            } ${empty ? 'border-dashed border-white/15 bg-white/[0.02]' : ''}`}
            style={!empty ? { borderColor: rarity!.hex, backgroundColor: (rhune ? '#c084fc' : rarity!.hex) + '1c' } : undefined}
            title={item ? itemDisplayName(item) : rhune ? getRhuneDef(rhune.rhuneDefId)?.name : label}
        >
            {!empty && (
                <span className="text-lg font-bold" style={{ color: rarity!.hex }}>
                    {glyph}
                </span>
            )}
            <span className="px-1 text-center text-[9px] font-bold uppercase leading-tight text-white/40">{label}</span>
        </button>
    );
}

function StorageGrid({
    items,
    rhunes,
    active,
    setActive,
}: {
    items: ItemInstance[];
    rhunes: RhuneInstance[];
    active: Active;
    setActive: (a: Active) => void;
}) {
    if (items.length === 0 && rhunes.length === 0) {
        return <p className="py-10 text-center text-sm text-white/40">Nothing here.</p>;
    }
    return (
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8">
            {items.map((item) => (
                <SlotBox
                    key={item.instanceId}
                    label={getBaseType(item.baseTypeId)?.kind ?? '?'}
                    item={item}
                    active={active?.kind === 'item' && active.id === item.instanceId}
                    onActivate={() => setActive({ kind: 'item', id: item.instanceId })}
                />
            ))}
            {rhunes.map((rhune) => (
                <SlotBox
                    key={rhune.instanceId}
                    label="Rhune"
                    rhune={rhune}
                    active={active?.kind === 'rhune' && active.id === rhune.instanceId}
                    onActivate={() => setActive({ kind: 'rhune', id: rhune.instanceId })}
                />
            ))}
        </div>
    );
}

export default function InventoryPanel() {
    const save = useStore((s) => s.save);
    const [tab, setTab] = useState<StorageTab>(useStore((s) => s.invTab));
    const [active, setActive] = useState<Active>(null);
    const [compareOn, setCompareOn] = useState(false);

    const fourthSocket = hasFourthRhuneSocket(save);
    const sockets = fourthSocket ? [0, 1, 2, 3] : [0, 1, 2];

    const storedItems = tab === 'bag' ? save.bag : save.items.filter((i) => isItemEquipped(save, i.instanceId) === null);
    const storedRhunes = tab === 'bag' ? save.bagRhunes : save.rhunes.filter((r) => isRhuneEquipped(save, r.instanceId) === -1);
    const cap = tab === 'bag' ? bagCapacity(save) : chestCapacity(save);
    const count = tab === 'bag' ? bagCount(save) : chestCount(save);
    const upgradeCost = tab === 'bag' ? bagUpgradeCost(save) : chestUpgradeCost(save);

    const activeItem = active?.kind === 'item' ? (save.items.find((i) => i.instanceId === active.id) ?? save.bag.find((i) => i.instanceId === active.id)) : null;
    const activeRhune = active?.kind === 'rhune' ? (save.rhunes.find((r) => r.instanceId === active.id) ?? save.bagRhunes.find((r) => r.instanceId === active.id)) : null;
    const activeItemSlot = activeItem ? isItemEquipped(save, activeItem.instanceId) : null;
    const activeItemInBag = activeItem ? save.bag.some((i) => i.instanceId === activeItem.instanceId) : false;
    const activeRhuneSocket = activeRhune ? isRhuneEquipped(save, activeRhune.instanceId) : -1;
    const activeRhuneInBag = activeRhune ? save.bagRhunes.some((r) => r.instanceId === activeRhune.instanceId) : false;
    const compareTarget = activeItem && !activeItemSlot ? autoEquipSlot(save, activeItem) : null;
    const compareItem = compareTarget ? (() => {
        const id = save.equipped[compareTarget];
        return id ? save.items.find((i) => i.instanceId === id) ?? null : null;
    })() : null;

    function update(next: SaveData) {
        store.patch({ save: next });
        void saveGame(next);
    }

    return (
        <Modal fullScreen title="Inventory" subtitle={`${save.currency}◆ Scrap`}>
            <div className="flex h-full min-h-0 flex-col overflow-auto p-4 md:flex-row md:overflow-hidden md:p-6">
                {/* --- paperdoll: equipped gear in a body-diagram layout, Rhune sockets below --- */}
                <div className="shrink-0 md:w-72">
                    <div className="mx-auto grid max-w-xs grid-cols-3 gap-2">
                        <div />
                        <SlotBox
                            label={SLOT_LABEL.head}
                            item={save.equipped.head ? save.items.find((i) => i.instanceId === save.equipped.head) : null}
                            active={active?.kind === 'item' && active.id === save.equipped.head}
                            onActivate={() => save.equipped.head && setActive({ kind: 'item', id: save.equipped.head! })}
                        />
                        <div />
                        <SlotBox
                            label={SLOT_LABEL.hand1}
                            item={save.equipped.hand1 ? save.items.find((i) => i.instanceId === save.equipped.hand1) : null}
                            active={active?.kind === 'item' && active.id === save.equipped.hand1}
                            onActivate={() => save.equipped.hand1 && setActive({ kind: 'item', id: save.equipped.hand1! })}
                        />
                        <SlotBox
                            label={SLOT_LABEL.torso}
                            item={save.equipped.torso ? save.items.find((i) => i.instanceId === save.equipped.torso) : null}
                            active={active?.kind === 'item' && active.id === save.equipped.torso}
                            onActivate={() => save.equipped.torso && setActive({ kind: 'item', id: save.equipped.torso! })}
                        />
                        <SlotBox
                            label={SLOT_LABEL.hand2}
                            item={save.equipped.hand2 ? save.items.find((i) => i.instanceId === save.equipped.hand2) : null}
                            active={active?.kind === 'item' && active.id === save.equipped.hand2}
                            onActivate={() => save.equipped.hand2 && setActive({ kind: 'item', id: save.equipped.hand2! })}
                        />
                        <SlotBox
                            label={SLOT_LABEL.jewelry1}
                            item={save.equipped.jewelry1 ? save.items.find((i) => i.instanceId === save.equipped.jewelry1) : null}
                            active={active?.kind === 'item' && active.id === save.equipped.jewelry1}
                            onActivate={() => save.equipped.jewelry1 && setActive({ kind: 'item', id: save.equipped.jewelry1! })}
                        />
                        <SlotBox
                            label={SLOT_LABEL.legs}
                            item={save.equipped.legs ? save.items.find((i) => i.instanceId === save.equipped.legs) : null}
                            active={active?.kind === 'item' && active.id === save.equipped.legs}
                            onActivate={() => save.equipped.legs && setActive({ kind: 'item', id: save.equipped.legs! })}
                        />
                        <SlotBox
                            label={SLOT_LABEL.jewelry2}
                            item={save.equipped.jewelry2 ? save.items.find((i) => i.instanceId === save.equipped.jewelry2) : null}
                            active={active?.kind === 'item' && active.id === save.equipped.jewelry2}
                            onActivate={() => save.equipped.jewelry2 && setActive({ kind: 'item', id: save.equipped.jewelry2! })}
                        />
                        <div />
                        <SlotBox
                            label={SLOT_LABEL.feet}
                            item={save.equipped.feet ? save.items.find((i) => i.instanceId === save.equipped.feet) : null}
                            active={active?.kind === 'item' && active.id === save.equipped.feet}
                            onActivate={() => save.equipped.feet && setActive({ kind: 'item', id: save.equipped.feet! })}
                        />
                        <div />
                    </div>

                    <div className="mx-auto mt-4 max-w-xs">
                        <div className="mb-1.5 text-center text-[10px] font-bold uppercase tracking-wide text-white/40">Rhune Sockets</div>
                        <div className="grid grid-cols-4 gap-2">
                            {sockets.map((socket) => {
                                const rhuneId = socket === 3 ? save.bonusRhuneSocket : save.equippedRhunes[socket];
                                const rhune = rhuneId ? save.rhunes.find((r) => r.instanceId === rhuneId) : null;
                                return (
                                    <SlotBox
                                        key={socket}
                                        label={socket === 3 ? 'Bonus' : `Socket ${socket + 1}`}
                                        rhune={rhune}
                                        active={active?.kind === 'rhune' && active.id === rhuneId}
                                        onActivate={() => rhuneId && setActive({ kind: 'rhune', id: rhuneId })}
                                    />
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* --- storage: Bag/Chest toggle + a grid of compact icon slots --- */}
                <div className="mt-4 min-h-0 flex-1 overflow-auto md:mt-0 md:px-6">
                    <div className="mb-3 flex items-center justify-between gap-2">
                        <div className="flex gap-1.5">
                            {(['bag', 'chest'] as StorageTab[]).map((t) => (
                                <button
                                    key={t}
                                    type="button"
                                    className={`rounded-lg px-3 py-2 text-xs font-bold capitalize ${tab === t ? 'bg-primary text-black' : 'bg-white/10 text-white'}`}
                                    onClick={() => setTab(t)}
                                >
                                    {t}
                                </button>
                            ))}
                        </div>
                        <div className="text-xs font-bold text-white/40">{count}/{cap} slots</div>
                    </div>
                    <div className="mb-3">
                        <ActionButton
                            label={save.currency >= upgradeCost ? `Upgrade ${tab === 'bag' ? 'Bag' : 'Chest'} (${upgradeCost}◆)` : `Upgrade — need ${upgradeCost}◆`}
                            tone={save.currency >= upgradeCost ? 'primary' : 'default'}
                            onClick={() => {
                                if (save.currency < upgradeCost) return;
                                update(tab === 'bag' ? upgradeBag(save) : upgradeChest(save));
                            }}
                        />
                    </div>
                    <StorageGrid items={storedItems} rhunes={storedRhunes} active={active} setActive={(a) => { setActive(a); setCompareOn(false); }} />
                </div>

                {/* --- detail dock: whatever's hovered/pinned, with contextual actions + Compare --- */}
                <div className="mt-4 shrink-0 md:mt-0 md:w-80">
                    {!activeItem && !activeRhune && (
                        <div className="rounded-xl border border-dashed border-white/15 p-6 text-center text-xs text-white/30">
                            Hover or tap an item to inspect it.
                        </div>
                    )}
                    {activeItem && (
                        <ItemCard item={activeItem} equippedIn={activeItemSlot}>
                            {activeItemSlot ? (
                                <ActionButton
                                    label="Unequip"
                                    onClick={() => update(unequipSlot(save, activeItemSlot))}
                                />
                            ) : (
                                <ActionButton
                                    label="Equip"
                                    tone="primary"
                                    onClick={() => {
                                        const slot = autoEquipSlot(save, activeItem);
                                        if (!canEquip(activeItem, slot)) return;
                                        update(equipItem(save, activeItem.instanceId, slot));
                                    }}
                                />
                            )}
                            {!activeItemSlot && (
                                <ActionButton
                                    label={activeItemInBag ? 'Store' : 'To Bag'}
                                    onClick={() => update(activeItemInBag ? moveItemToChest(save, activeItem.instanceId) : moveItemToBag(save, activeItem.instanceId))}
                                />
                            )}
                            <ActionButton label="Salvage" tone="danger" onClick={() => update(salvageItem(save, activeItem.instanceId))} />
                        </ItemCard>
                    )}
                    {activeItem && !activeItemSlot && compareTarget && (
                        <div className="mt-2">
                            <button type="button" className="w-full rounded-lg bg-white/10 py-1.5 text-[11px] font-bold text-white" onClick={() => setCompareOn(!compareOn)}>
                                {compareOn ? 'Hide comparison' : `Compare to ${SLOT_LABEL[compareTarget]}`}
                            </button>
                            {compareOn && (
                                <div className="mt-2">
                                    {compareItem ? (
                                        <ItemCard item={compareItem} equippedIn={compareTarget} />
                                    ) : (
                                        <p className="rounded-xl border border-dashed border-white/15 p-3 text-center text-xs text-white/30">{SLOT_LABEL[compareTarget]} is empty.</p>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                    {activeRhune && (
                        <RhuneCard rhune={activeRhune} equippedIn={activeRhuneSocket}>
                            {activeRhuneSocket !== -1 ? (
                                <ActionButton label="Unclip" onClick={() => update(unequipRhune(save, activeRhuneSocket as 0 | 1 | 2 | 3))} />
                            ) : (
                                <ActionButton
                                    label="Socket"
                                    tone="primary"
                                    onClick={() => update(equipRhune(save, activeRhune.instanceId, autoEquipRhuneSocket(save)))}
                                />
                            )}
                            {activeRhuneSocket === -1 && (
                                <ActionButton
                                    label={activeRhuneInBag ? 'Store' : 'To Bag'}
                                    onClick={() => update(activeRhuneInBag ? moveRhuneToChest(save, activeRhune.instanceId) : moveRhuneToBag(save, activeRhune.instanceId))}
                                />
                            )}
                            <ActionButton label="Salvage" tone="danger" onClick={() => update(salvageRhune(save, activeRhune.instanceId))} />
                        </RhuneCard>
                    )}
                </div>
            </div>
        </Modal>
    );
}
