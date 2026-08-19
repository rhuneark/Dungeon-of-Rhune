import type { ReactNode } from 'react';
import type { ItemInstance, RhuneInstance } from '../../game/data/types.ts';
import { STAT_LABELS } from '../../game/data/types.ts';
import { RARITIES } from '../../game/data/rarity.ts';
import { getBaseType } from '../../game/data/baseTypes.ts';
import { getRhuneDef } from '../../game/data/rhunes.ts';
import { itemDisplayName } from '../../game/data/nameGen.ts';
import { itemStats } from '../../game/systems/inventory.ts';
import { describeRhuneEffect } from '../../game/systems/rhuneRuntime.ts';

const PERCENT_STATS = new Set(['critChance', 'critDamage', 'lifesteal', 'dodgeChance', 'damageReduction']);

function formatStatLine(stat: string, value: number): string {
    const label = STAT_LABELS[stat as keyof typeof STAT_LABELS] ?? stat;
    const formatted = PERCENT_STATS.has(stat) ? `${Math.round(value * 100)}%` : Number(value.toFixed(1)).toString();
    return `${label} +${formatted}`;
}

export function ItemStatLines({ stats }: { stats: Record<string, number | undefined> }) {
    return (
        <>
            {Object.entries(stats)
                .filter(([, v]) => typeof v === 'number' && v !== 0)
                .map(([k, v]) => (
                    <div key={k} className="text-xs text-white/70">
                        {formatStatLine(k, v as number)}
                    </div>
                ))}
        </>
    );
}

export function ItemCard({
    item,
    equippedIn,
    children,
}: {
    item: ItemInstance;
    equippedIn?: string | null;
    children?: ReactNode;
}) {
    const rarity = RARITIES[item.rarity];
    const base = getBaseType(item.baseTypeId);
    const stats = itemStats(item);
    return (
        <div className="rounded-xl border p-3" style={{ borderColor: rarity.hex + '55', backgroundColor: rarity.hex + '14' }}>
            <div className="flex items-center justify-between gap-2">
                <div>
                    <div className="text-sm font-bold" style={{ color: rarity.hex }}>
                        {itemDisplayName(item)}
                    </div>
                    <div className="text-[11px] uppercase tracking-wide text-white/40">
                        {rarity.label} · {base.kind}
                        {equippedIn ? ` · equipped (${equippedIn})` : ''}
                    </div>
                </div>
            </div>
            <div className="mt-1.5 space-y-0.5">
                <ItemStatLines stats={stats} />
            </div>
            {children && <div className="mt-3 flex gap-2">{children}</div>}
        </div>
    );
}

export function RhuneCard({ rhune, equippedIn, children }: { rhune: RhuneInstance; equippedIn?: number | null; children?: ReactNode }) {
    const rarity = RARITIES[rhune.rarity];
    const def = getRhuneDef(rhune.rhuneDefId);
    return (
        <div className="rounded-xl border p-3" style={{ borderColor: rarity.hex + '55', backgroundColor: rarity.hex + '14' }}>
            <div className="text-sm font-bold" style={{ color: rarity.hex }}>
                {def.name}
            </div>
            <div className="text-[11px] uppercase tracking-wide text-white/40">
                {rarity.label} · Rhune
                {equippedIn != null && equippedIn >= 0 ? ` · socketed (${equippedIn + 1})` : ''}
            </div>
            <p className="mt-1 text-xs italic text-white/50">{def.description}</p>
            <div className="mt-1.5 text-xs font-bold text-white/80">{describeRhuneEffect(def, rhune.rarity)}</div>
            {children && <div className="mt-3 flex gap-2">{children}</div>}
        </div>
    );
}

export function ActionButton({ label, tone = 'default', onClick }: { label: string; tone?: 'default' | 'danger' | 'primary'; onClick: () => void }) {
    const toneClass =
        tone === 'danger'
            ? 'bg-red-500/20 text-red-300'
            : tone === 'primary'
              ? 'bg-primary text-black'
              : 'bg-white/10 text-white';
    return (
        <button type="button" className={`flex-1 rounded-lg px-3 py-2 text-xs font-bold active:scale-95 ${toneClass}`} onClick={onClick}>
            {label}
        </button>
    );
}
