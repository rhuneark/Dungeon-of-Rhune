/**
 * Drop resolution: treasure class + fortune → concrete drops.
 *
 * Fortune is the player's loot profile:
 *   rarity   — Rarity Find: better quality rolls (diminishing on unique/rare)
 *   quantity — fewer "nothing" picks
 *   gold     — bigger gold piles
 *   seek     — per-kind multipliers on what gets picked (weapon/armor/...),
 *              and seek.unique boosts only the unique roll
 */
import { BASES, EQUIPMENT_BASES, seekKindOf } from '../content/items/bases.ts';
import { RHUNES } from '../content/items/rhunes.ts';
import type { ItemInstance, Quality } from '../content/items/types.ts';
import { getTc, QUALITY_TUNING, type QualityBonus, type TcPick } from '../content/loot/treasureClasses.ts';
import type { SeekKind } from '../content/stats.ts';
import { createItem } from './itemGen.ts';
import { createRng, type Rng } from './rng.ts';

export interface Fortune {
    rarity: number;
    quantity: number;
    gold: number;
    seek: Partial<Record<SeekKind, number>>;
}

export const NO_FORTUNE: Fortune = { rarity: 0, quantity: 0, gold: 0, seek: {} };

export type Drop = { kind: 'item'; item: ItemInstance } | { kind: 'gold'; amount: number };

export interface DropContext {
    /** Item level = monster/area level. */
    ilvl: number;
    fortune: Fortune;
    rng?: Rng;
}

const dim = (rf: number, k: number) => (k > 0 ? (rf * k) / (rf + k) : rf);

/** D2-style best-first quality roll. */
export function rollQuality(ilvl: number, qlvl: number, fortune: Fortune, bonus: QualityBonus, rng: Rng): Quality {
    const over = Math.max(0, ilvl - qlvl);
    const T = QUALITY_TUNING;
    const rf = fortune.rarity;
    const pUnique = T.unique.base * (1 + over * T.unique.perLevelOver) * (1 + dim(rf, T.unique.dimK) / 100) * (1 + (fortune.seek.unique ?? 0) / 100) * (bonus.unique ?? 1);
    if (rng.chance(pUnique)) return 'unique';
    const pRare = T.rare.base * (1 + over * T.rare.perLevelOver) * (1 + dim(rf, T.rare.dimK) / 100) * (bonus.rare ?? 1);
    if (rng.chance(pRare)) return 'rare';
    const pMagic = T.magic.base * (1 + rf / 100) * (bonus.magic ?? 1);
    if (rng.chance(pMagic)) return 'magic';
    if (rng.chance(T.superior)) return 'superior';
    if (ilvl < T.crude.belowIlvl && rng.chance(T.crude.chance)) return 'crude';
    return 'normal';
}

function pickEquipBase(category: 'weapon' | 'armor' | 'jewelry' | 'curio', ilvl: number, rng: Rng) {
    const pool = EQUIPMENT_BASES.filter((b) => b.qlvl <= ilvl && seekKindOf(b) === category);
    // Favour bases near the item level so deep drops aren't all daggers.
    const i = rng.weighted(pool.map((b) => b.weight * (0.5 + b.qlvl / Math.max(1, ilvl))));
    return i >= 0 ? pool[i] : undefined;
}

function pickRhune(ilvl: number, rng: Rng): string | undefined {
    const pool = RHUNES.filter((r) => r.qlvl <= ilvl);
    const i = rng.weighted(pool.map((r) => r.weight));
    return i >= 0 ? `rhune_${pool[i].id}` : undefined;
}

function entrySeekKind(pick: TcPick): SeekKind | null {
    if (pick.kind === 'equip') return pick.category;
    if (pick.kind === 'rhune') return 'rhune';
    return null;
}

function resolvePick(pick: TcPick, ctx: Required<DropContext>, bonus: QualityBonus, out: Drop[], depth: number) {
    const { ilvl, fortune, rng } = ctx;
    switch (pick.kind) {
        case 'gold': {
            const amount = Math.max(1, Math.round(ilvl * rng.int(4, 12) * (pick.mult ?? 1) * (1 + fortune.gold / 100)));
            out.push({ kind: 'gold', amount });
            return;
        }
        case 'potion': {
            const id = ilvl >= 8 && rng.chance(0.06) ? 'potion_rejuv' : rng.chance(0.6) ? 'potion_health' : 'potion_mana';
            out.push({ kind: 'item', item: createItem(id, { ilvl, rng }) });
            return;
        }
        case 'scroll':
            out.push({ kind: 'item', item: createItem('scroll_identify', { ilvl, rng }) });
            return;
        case 'rhune': {
            const id = pickRhune(ilvl, rng);
            if (id) out.push({ kind: 'item', item: createItem(id, { ilvl, rng }) });
            return;
        }
        case 'base': {
            out.push({ kind: 'item', item: createItem(pick.id, { ilvl, rng }) });
            return;
        }
        case 'equip': {
            const base = pickEquipBase(pick.category, ilvl, rng);
            if (!base) return;
            const quality = rollQuality(ilvl, base.qlvl, fortune, bonus, rng);
            out.push({ kind: 'item', item: createItem(base.id, { ilvl, quality, rng }) });
            return;
        }
        case 'tc':
            if (depth < 4) resolveTcInto(pick.id, ctx, out, depth + 1);
            return;
    }
}

function resolveTcInto(tcId: string, ctx: Required<DropContext>, out: Drop[], depth: number) {
    const tc = getTc(tcId);
    const { fortune, rng } = ctx;
    const noDrop = (tc.noDrop * 100) / (100 + Math.max(0, fortune.quantity));
    const weights = tc.entries.map((e) => {
        const kind = entrySeekKind(e.pick);
        const seek = kind ? fortune.seek[kind] ?? 0 : 0;
        return e.weight * (1 + seek / 100);
    });
    for (let p = 0; p < tc.picks; p++) {
        const total = weights.reduce((a, b) => a + b, 0);
        if (rng.next() * (total + noDrop) >= total) continue; // the "nothing" pick
        const i = rng.weighted(weights);
        if (i >= 0) resolvePick(tc.entries[i].pick, ctx, tc.quality ?? {}, out, depth);
    }
}

/** Roll a treasure class. */
export function rollTreasure(tcId: string, ctx: DropContext): Drop[] {
    const full: Required<DropContext> = { ...ctx, rng: ctx.rng ?? createRng() };
    const out: Drop[] = [];
    resolveTcInto(tcId, full, out, 0);
    return out;
}

/** Simulate N rolls and tally quality/kind — powers the Loot Lab panel. */
export function simulateDrops(tcId: string, ctx: DropContext, n: number) {
    const rng = ctx.rng ?? createRng(12345);
    const tally: Record<string, number> = {};
    let gold = 0;
    for (let i = 0; i < n; i++) {
        for (const d of rollTreasure(tcId, { ...ctx, rng })) {
            if (d.kind === 'gold') {
                gold += d.amount;
                tally.gold = (tally.gold ?? 0) + 1;
            } else {
                const base = BASES.find((b) => b.id === d.item.baseId)!;
                const key = base.category === 'rhune' ? 'rhune' : base.category === 'consumable' ? 'consumable' : d.item.quality;
                tally[key] = (tally[key] ?? 0) + 1;
            }
        }
    }
    return { tally, gold, n };
}
