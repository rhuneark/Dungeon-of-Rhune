/**
 * Turns equipped Rhune instances into runtime behavior: which flat stats
 * they contribute (statMod), and the resolved, rarity-scaled configs for
 * everything else (on-hit procs, on-kill triggers, move trails, elemental
 * amplifiers, auras) that dungeonScene.ts executes during a run.
 *
 * Rarity scaling: proc chance scales with rarity (capped so it's never a
 * sure thing) and magnitude/duration scale with rarity (capped per status
 * so a legendary slow doesn't become a full stop). elementAmp scales the
 * BONUS portion of the multiplier, not the whole thing, so a common "double
 * ice damage" rhune is exactly x2 and a legendary one is stronger still.
 */
import type { Element, Rarity, RhuneDef, RhuneInstance, SaveData, StatBlock, StatusType } from '../data/types.ts';
import { RARITIES } from '../data/rarity.ts';
import { getRhuneDef } from '../data/rhunes.ts';
import { isNodeOwned } from './skillTree.ts';

export interface ResolvedRhune {
    instance: RhuneInstance;
    def: RhuneDef;
    rarityMult: number;
}

export function resolveEquippedRhunes(save: SaveData): ResolvedRhune[] {
    const out: ResolvedRhune[] = [];
    // The 4th socket only functions once Rhunekra's Final Convergence has unlocked — see systems/skillTree.ts.
    const sockets = isNodeOwned(save, 'rhunekra_capstone_fourth_rhune')
        ? [...save.equippedRhunes, save.bonusRhuneSocket]
        : save.equippedRhunes;
    for (const rhuneId of sockets) {
        if (!rhuneId) continue;
        const instance = save.rhunes.find((r) => r.instanceId === rhuneId);
        if (!instance) continue;
        const def = getRhuneDef(instance.rhuneDefId);
        if (!def) continue; // stale id from a since-renamed/removed Rhune — treat as not equipped
        out.push({ instance, def, rarityMult: RARITIES[instance.rarity].valueMult });
    }
    return out;
}

/** Only statMod rhunes feed the flat StatBlock aggregate — everything else is behavioral. */
export function statModContribution(resolved: ResolvedRhune): Partial<StatBlock> {
    if (resolved.def.effect.kind !== 'statMod') return {};
    const { stat, baseValue } = resolved.def.effect;
    return { [stat]: baseValue * resolved.rarityMult } as Partial<StatBlock>;
}

/**
 * Optional run-wide multipliers the Rhynekra skill-tree branch applies on
 * top of a Rhune's own rarity scaling — kept separate from `rarityMult` so
 * "effect magnitude", "proc chance", and "duration" can each be tuned
 * independently (Attuned Socket / Resonance / Arcane Reservoir). Every
 * function below defaults all three to 1 when omitted, so existing callers
 * (and existing behavior) are unaffected.
 */
export interface RhuneAmplifiers {
    effectMult?: number;
    chanceMult?: number;
    durationMult?: number;
}

const STATUS_CAPS: Record<StatusType, { magnitude: number; duration: number }> = {
    slow: { magnitude: 0.85, duration: 4 },
    burn: { magnitude: 999, duration: 6 },
    poison: { magnitude: 999, duration: 6 },
    shock: { magnitude: 1, duration: 4 },
    stun: { magnitude: 1, duration: 1.2 },
};

function scaleStatus(status: StatusType, magnitude: number, duration: number, rarityMult: number) {
    const caps = STATUS_CAPS[status];
    return {
        magnitude: Math.min(caps.magnitude, magnitude * rarityMult),
        duration: Math.min(caps.duration, duration * rarityMult),
    };
}

export interface StatusApplication {
    status: StatusType;
    magnitude: number;
    duration: number;
}

/** Roll every onHitStatus rhune for one weapon hit; returns the ones that proc'd this hit. */
export function rollOnHitStatuses(resolved: ResolvedRhune[], isCrit: boolean, amp?: RhuneAmplifiers): StatusApplication[] {
    const out: StatusApplication[] = [];
    for (const r of resolved) {
        if (r.def.effect.kind !== 'onHitStatus') continue;
        const { chance, status, magnitude, duration, critOnly } = r.def.effect;
        if (critOnly && !isCrit) continue;
        const scaledChance = Math.min(0.9, chance * r.rarityMult * (amp?.chanceMult ?? 1));
        if (Math.random() < scaledChance) {
            out.push({ status, ...scaleStatus(status, magnitude * (amp?.effectMult ?? 1), duration * (amp?.durationMult ?? 1), r.rarityMult) });
        }
    }
    return out;
}

export interface KillProc {
    result: 'explosion' | 'currency' | 'heal';
    magnitude: number;
}

export function rollOnKillProcs(resolved: ResolvedRhune[], amp?: RhuneAmplifiers): KillProc[] {
    const out: KillProc[] = [];
    for (const r of resolved) {
        if (r.def.effect.kind !== 'onKill') continue;
        const { chance, result, magnitude } = r.def.effect;
        const scaledChance = Math.min(0.9, chance * r.rarityMult * (amp?.chanceMult ?? 1));
        if (Math.random() < scaledChance) out.push({ result, magnitude: magnitude * r.rarityMult * (amp?.effectMult ?? 1) });
    }
    return out;
}

export interface MoveTrailConfig {
    element: Element;
    status: StatusType;
    magnitude: number;
    duration: number;
    radius: number;
    hazardLifetime: number;
    tickInterval: number;
}

export function getMoveTrailConfigs(resolved: ResolvedRhune[], amp?: RhuneAmplifiers): MoveTrailConfig[] {
    const out: MoveTrailConfig[] = [];
    for (const r of resolved) {
        if (r.def.effect.kind !== 'moveTrail') continue;
        const { element, status, magnitude, radius, hazardLifetime, tickInterval } = r.def.effect;
        const scaled = scaleStatus(status, magnitude * (amp?.effectMult ?? 1), hazardLifetime * (amp?.durationMult ?? 1), r.rarityMult);
        out.push({ element, status, magnitude: scaled.magnitude, duration: STATUS_CAPS[status].duration, radius, hazardLifetime: scaled.duration, tickInterval });
    }
    return out;
}

export interface AuraConfig {
    radius: number;
    status: StatusType;
    magnitude: number;
    duration: number;
    tickInterval: number;
}

export function getAuraConfigs(resolved: ResolvedRhune[], amp?: RhuneAmplifiers): AuraConfig[] {
    const out: AuraConfig[] = [];
    for (const r of resolved) {
        if (r.def.effect.kind !== 'aura') continue;
        const { radius, status, magnitude, duration, tickInterval } = r.def.effect;
        const scaled = scaleStatus(status, magnitude * (amp?.effectMult ?? 1), duration * (amp?.durationMult ?? 1), r.rarityMult);
        out.push({ radius, status, magnitude: scaled.magnitude, duration: scaled.duration, tickInterval });
    }
    return out;
}

/** Combined multiplier for one element from all equipped elementAmp rhunes (compounds if more than one). */
export function makeElementAmplifier(resolved: ResolvedRhune[], amp?: RhuneAmplifiers): (element: Element) => number {
    return (element: Element) => {
        let mult = 1;
        for (const r of resolved) {
            if (r.def.effect.kind !== 'elementAmp' || r.def.effect.element !== element) continue;
            const bonus = r.def.effect.mult - 1;
            mult *= 1 + bonus * r.rarityMult * (amp?.effectMult ?? 1);
        }
        return mult;
    };
}

/** Human-readable effect line for the RhuneCard UI, scaled to this instance's rarity. */
export function describeRhuneEffect(def: RhuneDef, rarity: Rarity): string {
    const rarityMult = RARITIES[rarity].valueMult;
    const pct = (n: number) => `${Math.round(n * 100)}%`;
    const effect = def.effect;
    switch (effect.kind) {
        case 'statMod': {
            const value = effect.baseValue * rarityMult;
            const isPercentStat = ['critChance', 'critDamage', 'lifesteal', 'dodgeChance', 'damageReduction'].includes(effect.stat);
            return `+${isPercentStat ? pct(value) : Number(value.toFixed(1))} ${effect.stat}`;
        }
        case 'onHitStatus': {
            const scaledChance = Math.min(0.9, effect.chance * rarityMult);
            const scaled = scaleStatus(effect.status, effect.magnitude, effect.duration, rarityMult);
            const trigger = effect.critOnly ? 'crit' : 'hit';
            return `${pct(scaledChance)} chance on ${trigger} to ${effect.status} (${scaled.duration.toFixed(1)}s)`;
        }
        case 'onKill': {
            const scaledChance = Math.min(0.9, effect.chance * rarityMult);
            const magnitude = Math.round(effect.magnitude * rarityMult);
            const label = effect.result === 'explosion' ? `deal ${magnitude} explosion damage` : effect.result === 'currency' ? `+${magnitude} salvage` : `heal ${magnitude} HP`;
            return `${pct(scaledChance)} chance on kill to ${label}`;
        }
        case 'moveTrail': {
            const scaled = scaleStatus(effect.status, effect.magnitude, effect.hazardLifetime, rarityMult);
            const article = /^[aeiou]/i.test(effect.element) ? 'an' : 'a';
            return `Moving leaves ${article} ${effect.element} trail: ${effect.status} for ${STATUS_CAPS[effect.status].duration.toFixed(1)}s (${scaled.duration.toFixed(1)}s trail)`;
        }
        case 'elementAmp': {
            const bonus = effect.mult - 1;
            const scaledMult = 1 + bonus * rarityMult;
            return `${effect.element} damage x${scaledMult.toFixed(1)}`;
        }
        case 'aura': {
            const scaled = scaleStatus(effect.status, effect.magnitude, effect.duration, rarityMult);
            return `Enemies within ${effect.radius}: ${effect.status} (refreshed every ${effect.tickInterval}s, ${scaled.duration.toFixed(1)}s)`;
        }
        default:
            return def.description;
    }
}
