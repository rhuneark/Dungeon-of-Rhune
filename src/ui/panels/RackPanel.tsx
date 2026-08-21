/**
 * The Armor Rack: a pure "check me out" showcase — equipped gear, computed
 * stats, and milestones. No equip/unequip/salvage here; that's the Chest's
 * job. This panel only reads state, never mutates it.
 */
import Modal from './Modal.tsx';
import { ItemStatLines } from './ItemCard.tsx';
import { useStore } from '../../state/store.ts';
import { GEAR_SLOTS, STAT_LABELS, type GearSlot } from '../../game/data/types.ts';
import { RARITIES } from '../../game/data/rarity.ts';
import { getBaseType } from '../../game/data/baseTypes.ts';
import { getRhuneDef } from '../../game/data/rhunes.ts';
import { itemDisplayName } from '../../game/data/nameGen.ts';
import { aggregateStats } from '../../game/systems/inventory.ts';
import { TIERS } from '../../game/data/tiers.ts';

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

export default function RackPanel() {
    const save = useStore((s) => s.save);
    const { stats } = aggregateStats(save);

    const totalBestFloors = Object.values(save.bestFloorByTier).reduce((sum, f) => sum + f, 0);
    const equippedCount = GEAR_SLOTS.filter((slot) => save.equipped[slot]).length + save.equippedRhunes.filter(Boolean).length;

    return (
        <Modal title="Armor Rack" subtitle="Your gear, your stats, your bragging rights.">
            <div className="space-y-5">
                <section>
                    <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-white/40">Equipped ({equippedCount}/11)</h3>
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
                    <div className="mt-2 grid grid-cols-3 gap-2">
                        {save.equippedRhunes.map((rhuneId, i) => {
                            const rhune = rhuneId ? save.rhunes.find((r) => r.instanceId === rhuneId) : null;
                            const rarity = rhune ? RARITIES[rhune.rarity] : null;
                            return (
                                <div
                                    key={i}
                                    className="rounded-lg border p-2"
                                    style={{ borderColor: (rarity?.hex ?? '#ffffff22') + '55', backgroundColor: rarity ? rarity.hex + '14' : 'transparent' }}
                                >
                                    <div className="text-[10px] uppercase tracking-wide text-white/40">Rhune {i + 1}</div>
                                    {rhune ? (
                                        <div className="truncate text-xs font-bold" style={{ color: rarity!.hex }}>
                                            {getRhuneDef(rhune.rhuneDefId)?.name ?? 'Unknown Rhune'}
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
                    <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-white/40">Combat Stats</h3>
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
                            }}
                        />
                        <div className="text-xs text-white/70">{STAT_LABELS.maxHp} {stats.maxHp}</div>
                        <div className="text-xs text-white/70">{STAT_LABELS.moveSpeed} {Math.round(stats.moveSpeed)}</div>
                        <div className="text-xs text-white/70">{STAT_LABELS.armor} {stats.armor}</div>
                        <div className="text-xs text-white/70">{STAT_LABELS.magnetRadius} {Math.round(stats.magnetRadius)}</div>
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
                            <div className="text-[11px] text-white/50">Salvage currency</div>
                        </div>
                    </div>
                </section>
            </div>
        </Modal>
    );
}
