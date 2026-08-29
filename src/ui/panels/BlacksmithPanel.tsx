/**
 * The Blacksmith: reroll affixes for Scrap, upgrade items and Rhunes with
 * Parts (Craft/Transmute/Fuse — see systems/crafting.ts), and bulk-salvage
 * clutter by rarity (systems/inventory.ts's salvageAllByRarity).
 */
import { useState } from 'react';
import Modal from './Modal.tsx';
import { ActionButton, ItemCard, RhuneCard } from './ItemCard.tsx';
import { store, useStore } from '../../state/store.ts';
import { PART_LABELS, RARITY_ORDER } from '../../game/data/types.ts';
import { RARITIES } from '../../game/data/rarity.ts';
import { saveGame } from '../../game/systems/save.ts';
import { rerollCost, rerollItem } from '../../game/systems/blacksmith.ts';
import { isItemEquipped, isRhuneEquipped, salvageAllByRarity } from '../../game/systems/inventory.ts';
import {
    CRAFT_COST,
    CRAFT_TARGETS,
    FUSE_COUNT,
    TRANSMUTE_COST,
    canCraftUpgrade,
    canFuseRhunes,
    canTransmuteItem,
    craftUpgrade,
    fuseRhunes,
    transmuteItem,
} from '../../game/systems/crafting.ts';

type Tab = 'reroll' | 'craft' | 'transmute' | 'fuse' | 'salvage';
const TABS: { tab: Tab; label: string }[] = [
    { tab: 'reroll', label: 'Reroll' },
    { tab: 'craft', label: 'Craft' },
    { tab: 'transmute', label: 'Transmute' },
    { tab: 'fuse', label: 'Fuse' },
    { tab: 'salvage', label: 'Salvage' },
];

function PartsCostLine({ bolt, cog, shard, scrap }: { bolt: number; cog: number; shard: number; scrap?: number }) {
    return (
        <span className="text-[11px] font-bold text-white/50">
            {bolt > 0 && `${bolt} ${PART_LABELS.bolt} `}
            {cog > 0 && `${cog} ${PART_LABELS.cog} `}
            {shard > 0 && `${shard} ${PART_LABELS.shard} `}
            {scrap ? `${scrap}◆` : ''}
        </span>
    );
}

export default function BlacksmithPanel() {
    const [tab, setTab] = useState<Tab>('reroll');
    const save = useStore((s) => s.save);
    const [craftItemId, setCraftItemId] = useState<string | null>(null);
    const [transmuteItemId, setTransmuteItemId] = useState<string | null>(null);
    const [transmuteRhuneId, setTransmuteRhuneId] = useState<string | null>(null);
    const [fuseIds, setFuseIds] = useState<string[]>([]);

    const commonItems = save.items.filter((i) => i.rarity === 'common' && isItemEquipped(save, i.instanceId) === null);
    const upgradableItems = save.items.filter((i) => i.rarity !== 'legendary');
    const allRhunes = [...save.rhunes, ...save.bagRhunes];

    return (
        <Modal title="Blacksmith" subtitle={`${save.currency}◆ · ${save.parts.bolt} ${PART_LABELS.bolt} · ${save.parts.cog} ${PART_LABELS.cog} · ${save.parts.shard} ${PART_LABELS.shard}`}>
            <div className="mb-3 flex gap-1.5 overflow-x-auto pb-1">
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

            {tab === 'reroll' && (
                <div className="space-y-2">
                    <p className="text-xs text-white/50">Rerolls keep the same affixes but re-rolls their values. Cost scales with rarity.</p>
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
            )}

            {tab === 'craft' && (
                <div className="space-y-3">
                    <p className="text-xs text-white/50">
                        Pick a Common item from the Chest — it's consumed, and Parts + Scrap forge a fresh item of the same kind at a higher rarity.
                    </p>
                    <div className="space-y-2">
                        {commonItems.length === 0 && <p className="py-4 text-center text-sm text-white/40">No unequipped Common items in the Chest.</p>}
                        {commonItems.map((item) => (
                            <div
                                key={item.instanceId}
                                className={`cursor-pointer rounded-xl ${craftItemId === item.instanceId ? 'ring-2 ring-primary' : ''}`}
                                onClick={() => setCraftItemId(craftItemId === item.instanceId ? null : item.instanceId)}
                            >
                                <ItemCard item={item} />
                            </div>
                        ))}
                    </div>
                    {craftItemId && (
                        <div className="space-y-2 rounded-xl bg-white/5 p-3">
                            <div className="text-xs font-bold uppercase tracking-wide text-white/40">Forge into</div>
                            {CRAFT_TARGETS.map((target) => {
                                const cost = CRAFT_COST[target]!;
                                const check = canCraftUpgrade(save, craftItemId, target);
                                return (
                                    <div key={target} className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 p-2.5">
                                        <div>
                                            <div className="text-sm font-bold" style={{ color: RARITIES[target].hex }}>
                                                {RARITIES[target].label}
                                            </div>
                                            <PartsCostLine bolt={cost.bolt} cog={cost.cog} shard={cost.shard} scrap={cost.scrap} />
                                        </div>
                                        <ActionButton
                                            label={check.ok ? 'Craft' : check.reason}
                                            tone={check.ok ? 'primary' : 'default'}
                                            onClick={() => {
                                                if (!check.ok) return;
                                                const next = craftUpgrade(save, craftItemId, target, save.selectedTier);
                                                store.patch({ save: next });
                                                void saveGame(next);
                                                setCraftItemId(null);
                                                store.pushToast(`Forged a ${RARITIES[target].label.toLowerCase()} item!`);
                                            }}
                                        />
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {tab === 'transmute' && (
                <div className="space-y-3">
                    <p className="text-xs text-white/50">
                        Pick an item and a Rhune to feed into it — the Rhune is consumed, the item keeps its affixes, gains one more, and jumps a rarity.
                    </p>
                    <div className="mb-1 text-xs font-bold uppercase tracking-wide text-white/40">Item</div>
                    <div className="space-y-2">
                        {upgradableItems.length === 0 && <p className="py-2 text-center text-xs text-white/40">No upgradable items.</p>}
                        {upgradableItems.map((item) => (
                            <div
                                key={item.instanceId}
                                className={`cursor-pointer rounded-xl ${transmuteItemId === item.instanceId ? 'ring-2 ring-primary' : ''}`}
                                onClick={() => setTransmuteItemId(transmuteItemId === item.instanceId ? null : item.instanceId)}
                            >
                                <ItemCard item={item} equippedIn={isItemEquipped(save, item.instanceId)} />
                            </div>
                        ))}
                    </div>
                    <div className="mb-1 mt-3 text-xs font-bold uppercase tracking-wide text-white/40">Rhune to consume</div>
                    <div className="space-y-2">
                        {allRhunes.length === 0 && <p className="py-2 text-center text-xs text-white/40">No Rhunes.</p>}
                        {allRhunes.map((rhune) => (
                            <div
                                key={rhune.instanceId}
                                className={`cursor-pointer rounded-xl ${transmuteRhuneId === rhune.instanceId ? 'ring-2 ring-primary' : ''}`}
                                onClick={() => setTransmuteRhuneId(transmuteRhuneId === rhune.instanceId ? null : rhune.instanceId)}
                            >
                                <RhuneCard rhune={rhune} equippedIn={isRhuneEquipped(save, rhune.instanceId)} />
                            </div>
                        ))}
                    </div>
                    {transmuteItemId && transmuteRhuneId && (
                        <div className="rounded-xl bg-white/5 p-3">
                            <PartsCostLine bolt={TRANSMUTE_COST.bolt} cog={TRANSMUTE_COST.cog} shard={TRANSMUTE_COST.shard} />
                            <div className="mt-2">
                                <ActionButton
                                    label={canTransmuteItem(save, transmuteItemId, transmuteRhuneId).ok ? 'Transmute' : canTransmuteItem(save, transmuteItemId, transmuteRhuneId).reason}
                                    tone={canTransmuteItem(save, transmuteItemId, transmuteRhuneId).ok ? 'primary' : 'default'}
                                    onClick={() => {
                                        if (!canTransmuteItem(save, transmuteItemId, transmuteRhuneId).ok) return;
                                        const next = transmuteItem(save, transmuteItemId, transmuteRhuneId);
                                        store.patch({ save: next });
                                        void saveGame(next);
                                        setTransmuteItemId(null);
                                        setTransmuteRhuneId(null);
                                        store.pushToast('Item transmuted to a higher rarity!');
                                    }}
                                />
                            </div>
                        </div>
                    )}
                </div>
            )}

            {tab === 'fuse' && (
                <div className="space-y-3">
                    <p className="text-xs text-white/50">Pick exactly {FUSE_COUNT} Rhunes of the same rarity — they fuse into one random Rhune at the next rarity up.</p>
                    <div className="space-y-2">
                        {allRhunes.length === 0 && <p className="py-4 text-center text-sm text-white/40">No Rhunes to fuse.</p>}
                        {allRhunes.map((rhune) => {
                            const selected = fuseIds.includes(rhune.instanceId);
                            return (
                                <div
                                    key={rhune.instanceId}
                                    className={`cursor-pointer rounded-xl ${selected ? 'ring-2 ring-primary' : ''}`}
                                    onClick={() => {
                                        if (selected) setFuseIds(fuseIds.filter((id) => id !== rhune.instanceId));
                                        else if (fuseIds.length < FUSE_COUNT) setFuseIds([...fuseIds, rhune.instanceId]);
                                    }}
                                >
                                    <RhuneCard rhune={rhune} equippedIn={isRhuneEquipped(save, rhune.instanceId)} />
                                </div>
                            );
                        })}
                    </div>
                    {fuseIds.length > 0 && (
                        <div className="rounded-xl bg-white/5 p-3">
                            <div className="text-xs font-bold text-white/50">
                                {fuseIds.length}/{FUSE_COUNT} selected
                            </div>
                            <div className="mt-2">
                                <ActionButton
                                    label={canFuseRhunes(save, fuseIds).ok ? 'Fuse' : canFuseRhunes(save, fuseIds).reason}
                                    tone={canFuseRhunes(save, fuseIds).ok ? 'primary' : 'default'}
                                    onClick={() => {
                                        if (!canFuseRhunes(save, fuseIds).ok) return;
                                        const next = fuseRhunes(save, fuseIds);
                                        store.patch({ save: next });
                                        void saveGame(next);
                                        setFuseIds([]);
                                        store.pushToast('Fused a higher-rarity Rhune!');
                                    }}
                                />
                            </div>
                        </div>
                    )}
                </div>
            )}

            {tab === 'salvage' && (
                <div className="space-y-2">
                    <p className="text-xs text-white/50">Salvage every item and Rhune of one rarity at once, across the Bag and Chest. Equipped gear is always spared.</p>
                    {RARITY_ORDER.map((rarity) => {
                        const preview = salvageAllByRarity(save, rarity);
                        return (
                            <div key={rarity} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-3">
                                <div>
                                    <span className="text-sm font-bold" style={{ color: RARITIES[rarity].hex }}>
                                        All {RARITIES[rarity].label}
                                    </span>
                                    <div className="text-[11px] text-white/40">
                                        {preview.count} item{preview.count === 1 ? '' : 's'} · +{preview.scrapEarned}◆
                                    </div>
                                </div>
                                <ActionButton
                                    label="Salvage"
                                    tone={preview.count > 0 ? 'danger' : 'default'}
                                    onClick={() => {
                                        if (preview.count === 0) return;
                                        store.patch({ save: preview.save });
                                        void saveGame(preview.save);
                                        store.pushToast(`Salvaged ${preview.count} ${RARITIES[rarity].label.toLowerCase()} item${preview.count === 1 ? '' : 's'} for ${preview.scrapEarned}◆.`);
                                    }}
                                />
                            </div>
                        );
                    })}
                </div>
            )}
        </Modal>
    );
}
