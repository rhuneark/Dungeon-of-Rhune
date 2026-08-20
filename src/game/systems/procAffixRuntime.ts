/**
 * Resolves an item's rolled proc affixes ("X% chance on hit to throw 5
 * daggers") into runtime rolls, mirroring rhuneRuntime.ts's rarity-scaled
 * approach but sourced from gear instead of Rhunes. The rolled RolledAffix
 * value IS the (rarity- and roll-scaled) proc chance; the effect shape
 * comes from the ProcAffixDef itself.
 */
import type { ItemInstance, ProcAffixDef, ProcCause, ProcEffect, Rarity, StatusType } from '../data/types.ts';
import { RARITIES } from '../data/rarity.ts';
import { findAffixDef } from '../data/affixes.ts';

export interface ResolvedProcAffix {
    itemId: string;
    def: ProcAffixDef;
    /** Already-rolled, already-rarity-scaled proc chance (0..0.9). */
    chance: number;
    rarityMult: number;
}

/** Every proc affix across every equipped item, paired with its rolled chance. */
export function resolveItemProcAffixes(items: ItemInstance[]): ResolvedProcAffix[] {
    const out: ResolvedProcAffix[] = [];
    for (const item of items) {
        for (const rolled of item.affixes) {
            const def = findAffixDef(rolled.affixId);
            if (!def || def.kind !== 'proc') continue;
            out.push({ itemId: item.instanceId, def, chance: rolled.value, rarityMult: RARITIES[item.rarity].valueMult });
        }
    }
    return out;
}

function forCause(resolved: ResolvedProcAffix[], cause: ProcCause): ResolvedProcAffix[] {
    return resolved.filter((r) => r.def.cause === cause);
}

const STATUS_CAPS: Record<StatusType, { magnitude: number; duration: number }> = {
    slow: { magnitude: 0.85, duration: 4 },
    burn: { magnitude: 999, duration: 6 },
    poison: { magnitude: 999, duration: 6 },
    shock: { magnitude: 1, duration: 4 },
    stun: { magnitude: 1, duration: 1.2 },
};

/** Roll every proc affix for a given cause; returns the effects that fired. */
export function rollProcAffixes(resolved: ResolvedProcAffix[], cause: ProcCause): { effect: ProcEffect; rarityMult: number }[] {
    const fired: { effect: ProcEffect; rarityMult: number }[] = [];
    for (const r of forCause(resolved, cause)) {
        if (Math.random() < r.chance) fired.push({ effect: r.def.effect, rarityMult: r.rarityMult });
    }
    return fired;
}

/** Scale one fired effect's numbers by its item's rarity, capping status magnitude/duration same as Rhunes. */
export function scaleProcEffect(effect: ProcEffect, rarityMult: number): ProcEffect {
    switch (effect.kind) {
        case 'statusApply': {
            const caps = STATUS_CAPS[effect.status];
            return {
                ...effect,
                magnitude: Math.min(caps.magnitude, effect.magnitude * rarityMult),
                duration: Math.min(caps.duration, effect.duration * rarityMult),
            };
        }
        case 'projectileBurst':
            return { ...effect, damage: effect.damage * rarityMult };
        case 'heal':
            return { ...effect, amount: effect.amount * rarityMult };
        case 'elementBoost':
            return { ...effect, amount: effect.amount * rarityMult };
        case 'explosion':
            return { ...effect, damage: effect.damage * rarityMult };
        case 'currency':
            return { ...effect, amount: Math.round(effect.amount * rarityMult) };
        default:
            return effect;
    }
}

const CAUSE_LABEL: Record<ProcCause, string> = {
    onHit: 'on hit',
    onCrit: 'on crit',
    onKill: 'on kill',
    onMove: 'while moving',
    onBeingHit: 'when hit',
    onFloorClear: 'on floor clear',
};

/** Human-readable line for the ItemCard UI, scaled to this instance's rarity. */
export function describeProcAffix(def: ProcAffixDef, rarity: Rarity): string {
    const rarityMult = RARITIES[rarity].valueMult;
    const chancePct = (chanceMax: number) => `${Math.round(Math.min(0.9, chanceMax * rarityMult) * 100)}%`;
    const scaled = scaleProcEffect(def.effect, rarityMult);
    let effectText = '';
    switch (scaled.kind) {
        case 'statusApply':
            effectText = `${scaled.status} (${scaled.duration.toFixed(1)}s)`;
            break;
        case 'projectileBurst':
            effectText = `throw ${scaled.count} projectile${scaled.count === 1 ? '' : 's'} (${Math.round(scaled.damage)} dmg each)`;
            break;
        case 'heal':
            effectText = `heal ${Math.round(scaled.amount)} HP`;
            break;
        case 'elementBoost':
            effectText = `+${Math.round(scaled.amount)} ${scaled.element} damage for ${scaled.duration.toFixed(1)}s`;
            break;
        case 'explosion':
            effectText = `deal ${Math.round(scaled.damage)} ${scaled.element} damage in a burst`;
            break;
        case 'currency':
            effectText = `+${scaled.amount} salvage`;
            break;
    }
    return `${chancePct(def.chanceMax)} chance ${CAUSE_LABEL[def.cause]} to ${effectText}`;
}
