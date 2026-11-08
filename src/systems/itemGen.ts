/**
 * Item generation: base + item level + quality → ItemInstance.
 * Pure functions over content tables; every roll goes through an Rng.
 */
import { AFFIXES, affixAllowedOn, getAffix } from '../content/items/affixes.ts';
import { getBase } from '../content/items/bases.ts';
import { RARE_FIRST, RARE_SECOND } from '../content/items/rareNames.ts';
import type { AffixDef, ItemBase, ItemInstance, Quality, RolledAffix, StatRoll } from '../content/items/types.ts';
import { uniquesForBase } from '../content/items/uniques.ts';
import { createRng, uid, type Rng } from './rng.ts';

export interface CreateItemOpts {
    ilvl: number;
    quality?: Quality;
    rng?: Rng;
    /** Force a specific unique (dev tools, quest rewards). */
    uniqueId?: string;
    identified?: boolean;
}

/** Roll one stat line. */
export function rollStat(roll: StatRoll, rng: Rng): number[] {
    const v = rng.int(Math.min(roll.min, roll.max), Math.max(roll.min, roll.max));
    if (roll.min2 === undefined || roll.max2 === undefined) return [v];
    const v2 = Math.max(v, rng.int(roll.min2, roll.max2));
    return [v, v2];
}

function curioScale(base: ItemBase): number {
    if (base.tags.includes('curio_small')) return 0.35;
    if (base.tags.includes('curio_medium')) return 0.55;
    if (base.tags.includes('curio_large')) return 0.75;
    return 1;
}

function rollAffixValues(affix: AffixDef, tierIdx: number, base: ItemBase, rng: Rng): number[][] {
    const scale = affix.id.startsWith('c_') ? 1 : curioScale(base);
    return affix.tiers[tierIdx].rolls.map((roll) => {
        const vals = rollStat(roll, rng);
        if (scale === 1 || roll.stat.startsWith('skillDisc:')) return vals;
        return vals.map((v) => Math.max(1, Math.round(v * scale)));
    });
}

/** Candidate (affix, tier) pairs for a base at an item level. Top 3 tiers weighted 1 / 0.6 / 0.3. */
function candidates(kind: 'prefix' | 'suffix', base: ItemBase, ilvl: number, usedGroups: Set<string>) {
    const out: { affix: AffixDef; tier: number; weight: number }[] = [];
    for (const affix of AFFIXES) {
        if (affix.kind !== kind || affix.weight <= 0 || usedGroups.has(affix.group)) continue;
        if (!affixAllowedOn(affix, base.tags)) continue;
        const eligible: number[] = [];
        affix.tiers.forEach((tier, i) => {
            if (tier.alvl > ilvl) return;
            if (tier.maxIlvl !== undefined && ilvl > tier.maxIlvl) return;
            if (affix.group === 'sockets' && tier.rolls[0].max > base.maxSockets) return;
            eligible.push(i);
        });
        const top = eligible.slice(-3).reverse();
        const falloff = [1, 0.6, 0.3];
        top.forEach((tierIdx, rank) => out.push({ affix, tier: tierIdx, weight: affix.weight * falloff[rank] }));
    }
    return out;
}

function pickAffix(kind: 'prefix' | 'suffix', base: ItemBase, ilvl: number, used: Set<string>, rng: Rng): RolledAffix | null {
    const c = candidates(kind, base, ilvl, used);
    const i = rng.weighted(c.map((x) => x.weight));
    if (i < 0) return null;
    const { affix, tier } = c[i];
    used.add(affix.group);
    return { affixId: affix.id, tier, values: rollAffixValues(affix, tier, base, rng) };
}

function rollMagic(base: ItemBase, ilvl: number, rng: Rng): RolledAffix[] {
    const used = new Set<string>();
    const roll = rng.next();
    const wantPrefix = roll < 0.75;
    const wantSuffix = roll >= 0.5 || !wantPrefix;
    const out: RolledAffix[] = [];
    if (wantPrefix) {
        const a = pickAffix('prefix', base, ilvl, used, rng);
        if (a) out.push(a);
    }
    if (wantSuffix || out.length === 0) {
        const a = pickAffix('suffix', base, ilvl, used, rng);
        if (a) out.push(a);
    }
    return out;
}

function rollRare(base: ItemBase, ilvl: number, rng: Rng): RolledAffix[] {
    const maxCount = ilvl >= 20 ? 6 : ilvl >= 10 ? 5 : 4;
    const count = rng.int(3, maxCount);
    const used = new Set<string>();
    const out: RolledAffix[] = [];
    let prefixes = 0;
    let suffixes = 0;
    for (let i = 0; i < count; i++) {
        const canPre = prefixes < 3;
        const canSuf = suffixes < 3;
        if (!canPre && !canSuf) break;
        const kind = canPre && (!canSuf || rng.chance(0.5)) ? 'prefix' : 'suffix';
        const a = pickAffix(kind, base, ilvl, used, rng) ?? pickAffix(kind === 'prefix' ? 'suffix' : 'prefix', base, ilvl, used, rng);
        if (!a) break;
        out.push(a);
        if (getAffix(a.affixId)!.kind === 'prefix') prefixes++;
        else suffixes++;
    }
    return out;
}

/** Defense roll for armor; weapons keep base damage (affixes modify it). */
function rollBaseNumbers(base: ItemBase, rng: Rng): number[] {
    if (base.armor) return [rng.int(base.armor[0], base.armor[1])];
    return [];
}

function rollPlainSockets(base: ItemBase, rng: Rng): number {
    if (base.maxSockets <= 0 || !rng.chance(0.25)) return 0;
    // Weighted toward fewer sockets: 1 is common, max is rare.
    const weights = Array.from({ length: base.maxSockets }, (_, i) => 1 / (i + 1));
    return rng.weighted(weights) + 1;
}

const isArmorLike = (b: ItemBase) => !!b.armor;

export function createItem(baseId: string, opts: CreateItemOpts): ItemInstance {
    const rng = opts.rng ?? createRng();
    const base = getBase(baseId);
    const ilvl = Math.max(1, Math.round(opts.ilvl));
    let quality: Quality = opts.quality ?? 'normal';

    const item: ItemInstance = {
        uid: uid(),
        baseId,
        quality,
        ilvl,
        seed: rng.int(0, 2 ** 31 - 1),
        identified: true,
        affixes: [],
        baseRoll: rollBaseNumbers(base, rng),
        sockets: 0,
        socketed: [],
    };

    if (base.category === 'consumable' || base.category === 'quest' || base.category === 'rhune') {
        item.quality = 'normal';
        if (base.category === 'consumable') item.qty = 1;
        return item;
    }

    if (base.alwaysMagic && (quality === 'normal' || quality === 'superior' || quality === 'crude')) quality = 'magic';
    if (base.category === 'curio' && quality === 'rare') quality = 'magic';

    if (quality === 'unique') {
        const pool = opts.uniqueId ? uniquesForBase(baseId, 999).filter((u) => u.id === opts.uniqueId) : uniquesForBase(baseId, ilvl);
        const i = rng.weighted(pool.map((u) => u.weight));
        if (i >= 0) {
            const u = pool[i];
            item.quality = 'unique';
            item.uniqueId = u.id;
            item.uniqueValues = u.rolls.map((roll) => rollStat(roll, rng));
            item.identified = opts.identified ?? false;
            return item;
        }
        // No unique exists for this base at this level: D2 makes it a rare instead.
        quality = base.category === 'curio' ? 'magic' : 'rare';
    }

    item.quality = quality;
    switch (quality) {
        case 'rare':
            item.affixes = rollRare(base, ilvl, rng);
            item.rareName = [rng.int(0, RARE_FIRST.length - 1), rng.int(0, 1000)];
            item.identified = opts.identified ?? false;
            break;
        case 'magic':
            item.affixes = rollMagic(base, ilvl, rng);
            item.identified = opts.identified ?? false;
            break;
        case 'superior': {
            const a = getAffix(isArmorLike(base) ? 'superior_a' : 'superior_w')!;
            if (base.damage || base.armor) item.affixes = [{ affixId: a.id, tier: 0, values: rollAffixValues(a, 0, base, rng) }];
            item.sockets = rollPlainSockets(base, rng);
            break;
        }
        case 'crude': {
            const a = getAffix(isArmorLike(base) ? 'crude_a' : 'crude_w')!;
            if (base.damage || base.armor) item.affixes = [{ affixId: a.id, tier: 0, values: rollAffixValues(a, 0, base, rng) }];
            item.sockets = rollPlainSockets(base, rng);
            break;
        }
        default:
            item.sockets = rollPlainSockets(base, rng);
    }
    // Socket prefixes ("Graven") add sockets on magic/rare items.
    for (const a of item.affixes) {
        if (getAffix(a.affixId)?.group === 'sockets') item.sockets = Math.min(base.maxSockets, item.sockets + a.values[0][0]);
    }
    return item;
}

/** Second word of a rare name, by slot. */
export function rareSecondPool(base: ItemBase): string[] {
    if (base.category === 'curio') return RARE_SECOND.curio;
    if (base.category === 'weapon') {
        if (base.tags.includes('caster')) return RARE_SECOND.caster;
        if (base.tags.includes('ranged')) return RARE_SECOND.ranged;
        return RARE_SECOND.weapon;
    }
    return RARE_SECOND[base.slot ?? 'weapon'] ?? RARE_SECOND.weapon;
}

export function makeConsumable(baseId: string, qty = 1): ItemInstance {
    const item = createItem(baseId, { ilvl: 1 });
    item.qty = qty;
    return item;
}
