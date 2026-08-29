/**
 * The Character menu: replaces the old walk-to Armor Rack station with a
 * simple always-available menu (HUD button, hub only) covering Character
 * and Stats inline, plus quick jumps into the Inventory (paperdoll + Bag/
 * Chest — see InventoryPanel.tsx, which now owns all gear management) and
 * Quest Board panels rather than duplicating their UI here.
 */
import { useState } from 'react';
import Modal from './Modal.tsx';
import { ItemStatLines } from './ItemCard.tsx';
import { store, useStore } from '../../state/store.ts';
import { GEAR_SLOTS, STAT_LABELS, type GearSlot } from '../../game/data/types.ts';
import { RARITIES } from '../../game/data/rarity.ts';
import { itemDisplayName } from '../../game/data/nameGen.ts';
import { aggregateStats, hasFourthRhuneSocket } from '../../game/systems/inventory.ts';
import { TIERS } from '../../game/data/tiers.ts';
import { buildLevel } from '../../game/systems/skillTree.ts';

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

type Tab = 'character' | 'stats';
const TABS: { tab: Tab; label: string }[] = [
    { tab: 'character', label: 'Character' },
    { tab: 'stats', label: 'Stats' },
];

export default function MenuPanel() {
    const [tab, setTab] = useState<Tab>('character');
    const save = useStore((s) => s.save);
    const { stats } = aggregateStats(save);

    const totalBestFloors = Object.values(save.bestFloorByTier).reduce((sum, f) => sum + f, 0);
    const fourthSocket = hasFourthRhuneSocket(save);
    const rhuneSockets = fourthSocket ? [...save.equippedRhunes, save.bonusRhuneSocket] : save.equippedRhunes;
    const equippedCount = GEAR_SLOTS.filter((slot) => save.equipped[slot]).length + rhuneSockets.filter(Boolean).length;

    return (
        <Modal title="Character" subtitle="Your build and your stats — for gear, see Inventory.">
            <div className="mb-3 grid grid-cols-4 gap-1">
                {TABS.map(({ tab: t, label }) => (
                    <button
                        key={t}
                        type="button"
                        className={`rounded-lg py-2 text-[11px] font-bold ${tab === t ? 'bg-primary text-black' : 'bg-white/10 text-white'}`}
                        onClick={() => setTab(t)}
                    >
                        {label}
                    </button>
                ))}
                <button
                    type="button"
                    className="rounded-lg bg-white/10 py-2 text-[11px] font-bold text-white"
                    onClick={() => store.patch({ invTab: 'bag', panel: 'inventory' })}
                >
                    Inventory
                </button>
                <button type="button" className="rounded-lg bg-white/10 py-2 text-[11px] font-bold text-white" onClick={() => store.patch({ panel: 'quests' })}>
                    Quests
                </button>
            </div>

            {tab === 'character' && (
                <div className="space-y-5">
                    <section>
                        <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-white/40">Equipped ({equippedCount}/{fourthSocket ? 12 : 11})</h3>
                        <div className="grid grid-cols-2 gap-2">
                            {GEAR_SLOTS.map((slot) => {
                                const itemId = save.equipped[slot];
                                const item = itemId ? save.items.find((i) => i.instanceId === itemId) : null;
                                const rarity = item ? RARITIES[item.rarity] : null;
                                return (
                                    <div
                                        key={slot}
                                        className="rounded-lg border p-2"
                                        style={{ borderColor: (rarity?.hex ?? '#ffffff22') + '55', backgroundColor: rarity ? rarity.hex + '14' : 'transparent' }}
                                    >
                                        <div className="text-[10px] uppercase tracking-wide text-white/40">{SLOT_LABEL[slot]}</div>
                                        {item ? (
                                            <div className="truncate text-xs font-bold" style={{ color: rarity!.hex }}>
                                                {itemDisplayName(item)}
                                            </div>
                                        ) : (
                                            <div className="text-xs text-white/25">Empty</div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </section>
                    <section>
                        <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-white/40">Milestones</h3>
                        <div className="grid grid-cols-2 gap-2">
                            <div className="rounded-lg bg-white/5 p-3">
                                <div className="text-2xl font-bold text-primary">{save.stats.lifetimeKills}</div>
                                <div className="text-[11px] text-white/50">Lifetime kills</div>
                            </div>
                            <div className="rounded-lg bg-white/5 p-3">
                                <div className="text-2xl font-bold text-primary">{save.unlockedTiers.length}/{TIERS.length}</div>
                                <div className="text-[11px] text-white/50">Tiers unlocked</div>
                            </div>
                            <div className="rounded-lg bg-white/5 p-3">
                                <div className="text-2xl font-bold text-primary">{totalBestFloors}</div>
                                <div className="text-[11px] text-white/50">Combined best floors</div>
                            </div>
                            <div className="rounded-lg bg-white/5 p-3">
                                <div className="text-2xl font-bold text-primary">{save.currency}◆</div>
                                <div className="text-[11px] text-white/50">Scrap</div>
                            </div>
                            <div className="rounded-lg bg-white/5 p-3">
                                <div className="text-2xl font-bold text-primary">{save.stats.lifetimeBossKills}</div>
                                <div className="text-[11px] text-white/50">Bosses defeated</div>
                            </div>
                            <div className="rounded-lg bg-white/5 p-3">
                                <div className="text-2xl font-bold text-primary">{buildLevel(save.build.xp)}</div>
                                <div className="text-[11px] text-white/50">Build level</div>
                            </div>
                        </div>
                    </section>
                </div>
            )}

            {tab === 'stats' && (
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 rounded-xl bg-white/5 p-3">
                    <ItemStatLines
                        stats={{
                            damage: stats.damage,
                            fireRate: stats.fireRate,
                            critChance: stats.critChance,
                            critDamage: stats.critDamage,
                            lifesteal: stats.lifesteal,
                            thorns: stats.thorns,
                            dodgeChance: stats.dodgeChance,
                            damageReduction: stats.damageReduction,
                            projectileCount: stats.projectileCount,
                            pierce: stats.pierce,
                            fireDamage: stats.fireDamage,
                            iceDamage: stats.iceDamage,
                            lightningDamage: stats.lightningDamage,
                            poisonDamage: stats.poisonDamage,
                            blockChance: stats.blockChance,
                            thornsPercent: stats.thornsPercent,
                        }}
                    />
                    <div className="text-xs text-white/70">{STAT_LABELS.maxHp} {stats.maxHp}</div>
                    <div className="text-xs text-white/70">{STAT_LABELS.moveSpeed} {Math.round(stats.moveSpeed)}</div>
                    <div className="text-xs text-white/70">{STAT_LABELS.armor} {stats.armor}</div>
                    <div className="text-xs text-white/70">{STAT_LABELS.magnetRadius} {Math.round(stats.magnetRadius)}</div>
                </div>
            )}
        </Modal>
    );
}
