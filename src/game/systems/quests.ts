/**
 * Quest Board: daily and weekly Bounties. Each set is generated fresh once
 * its period expires (tracked via a plain "last generated" timestamp rather
 * than wall-clock day/week boundaries, so it works the same regardless of
 * timezone or when the player's day starts) and progress resets with it.
 */
import type { BountyInstance, BountyKind, SaveData } from '../data/types.ts';

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;

let uidCounter = 0;
function makeBountyId(): string {
    uidCounter += 1;
    return `bounty_${Date.now().toString(36)}_${uidCounter}_${Math.floor(Math.random() * 1e6).toString(36)}`;
}

interface BountyTemplate {
    kind: BountyKind;
    label: (target: number) => string;
    targetRange: [number, number];
    /** Scrap reward per unit of target, rounded at generation time. */
    rewardPer: number;
}

const DAILY_TEMPLATES: BountyTemplate[] = [
    { kind: 'kills', label: (n) => `Defeat ${n} enemies`, targetRange: [30, 80], rewardPer: 0.6 },
    { kind: 'floors', label: (n) => `Clear ${n} floors`, targetRange: [3, 8], rewardPer: 6 },
    { kind: 'bossKills', label: (n) => `Defeat ${n} boss${n === 1 ? '' : 'es'}`, targetRange: [1, 2], rewardPer: 25 },
    { kind: 'salvage', label: (n) => `Salvage ${n} items`, targetRange: [3, 10], rewardPer: 4 },
    { kind: 'gamble', label: (n) => `Gamble ${n} times at the Merchant`, targetRange: [2, 6], rewardPer: 5 },
];

const WEEKLY_TEMPLATES: BountyTemplate[] = [
    { kind: 'kills', label: (n) => `Defeat ${n} enemies`, targetRange: [250, 500], rewardPer: 0.5 },
    { kind: 'floors', label: (n) => `Clear ${n} floors`, targetRange: [20, 40], rewardPer: 7 },
    { kind: 'bossKills', label: (n) => `Defeat ${n} bosses`, targetRange: [4, 8], rewardPer: 30 },
    { kind: 'salvage', label: (n) => `Salvage ${n} items`, targetRange: [20, 50], rewardPer: 3 },
    { kind: 'gamble', label: (n) => `Gamble ${n} times at the Merchant`, targetRange: [10, 20], rewardPer: 6 },
];

function pickN<T>(arr: T[], n: number): T[] {
    const pool = [...arr];
    const out: T[] = [];
    for (let i = 0; i < n && pool.length > 0; i++) {
        out.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
    }
    return out;
}

function rollBounty(template: BountyTemplate): BountyInstance {
    const [min, max] = template.targetRange;
    const target = Math.round(min + Math.random() * (max - min));
    return {
        instanceId: makeBountyId(),
        kind: template.kind,
        label: template.label(target),
        target,
        progress: 0,
        reward: Math.max(1, Math.round(target * template.rewardPer)),
        claimed: false,
    };
}

function generateBounties(templates: BountyTemplate[], count: number): BountyInstance[] {
    return pickN(templates, count).map(rollBounty);
}

/** Regenerates any expired bounty set. Idempotent — safe to call on every load and every Quest Board open. */
export function refreshBounties(save: SaveData): SaveData {
    const now = Date.now();
    let next = save;
    if (now - save.dailyBountiesGeneratedAt > DAY_MS) {
        next = { ...next, dailyBounties: generateBounties(DAILY_TEMPLATES, 3), dailyBountiesGeneratedAt: now };
    }
    if (now - save.weeklyBountiesGeneratedAt > WEEK_MS) {
        next = { ...next, weeklyBounties: generateBounties(WEEKLY_TEMPLATES, 3), weeklyBountiesGeneratedAt: now };
    }
    return next;
}

function advanceSet(bounties: BountyInstance[], kind: BountyKind, amount: number): BountyInstance[] {
    return bounties.map((b) => (b.kind === kind && !b.claimed ? { ...b, progress: Math.min(b.target, b.progress + amount) } : b));
}

/** Bumps progress on every matching, unclaimed bounty in both sets at once. */
export function advanceBounties(save: SaveData, kind: BountyKind, amount: number): SaveData {
    if (amount <= 0) return save;
    return {
        ...save,
        dailyBounties: advanceSet(save.dailyBounties, kind, amount),
        weeklyBounties: advanceSet(save.weeklyBounties, kind, amount),
    };
}

export function claimBounty(save: SaveData, instanceId: string): SaveData {
    const inDaily = save.dailyBounties.find((b) => b.instanceId === instanceId);
    const bounty = inDaily ?? save.weeklyBounties.find((b) => b.instanceId === instanceId);
    if (!bounty || bounty.claimed || bounty.progress < bounty.target) return save;

    const mark = (list: BountyInstance[]) => list.map((b) => (b.instanceId === instanceId ? { ...b, claimed: true } : b));
    return {
        ...save,
        currency: save.currency + bounty.reward,
        dailyBounties: inDaily ? mark(save.dailyBounties) : save.dailyBounties,
        weeklyBounties: inDaily ? save.weeklyBounties : mark(save.weeklyBounties),
    };
}
