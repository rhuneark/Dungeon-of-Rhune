/**
 * Tier-unlock gate + best-floor tracking + fire-and-forget platform
 * reporting (leaderboard, stats). All RundotGameAPI calls are best-effort:
 * they never block the local save/UI update, and never throw into callers.
 */
import RundotGameAPI from '@series-inc/rundot-game-sdk/api';
import { TIERS, getTier } from '../data/tiers.ts';
import type { SaveData } from '../data/types.ts';
import { advanceBounties } from './quests.ts';

/** floorReached = the floor the player was ON when the run ended (died or exited). */
export function recordRunEnd(save: SaveData, tier: number, floorReached: number, elapsedSeconds = 0, totalKills = 0, bossKills = 0): SaveData {
    const clearedFloors = Math.max(0, floorReached - 1);
    const prevBest = save.bestFloorByTier[tier] ?? 0;
    const bestFloorByTier = { ...save.bestFloorByTier, [tier]: Math.max(prevBest, clearedFloors) };

    let unlockedTiers = save.unlockedTiers;
    const tierDef = getTier(tier);
    const nextTier = TIERS.find((t) => t.id === tier + 1);
    if (nextTier && clearedFloors >= tierDef.unlockAtFloor && !unlockedTiers.includes(nextTier.id)) {
        unlockedTiers = [...unlockedTiers, nextTier.id];
    }

    void reportRunEnd(tier, bestFloorByTier[tier], clearedFloors, elapsedSeconds);
    let next: SaveData = {
        ...save,
        bestFloorByTier,
        unlockedTiers,
        stats: { ...save.stats, lifetimeKills: save.stats.lifetimeKills + totalKills, lifetimeBossKills: save.stats.lifetimeBossKills + bossKills },
    };
    next = advanceBounties(next, 'kills', totalKills);
    next = advanceBounties(next, 'floors', clearedFloors);
    next = advanceBounties(next, 'bossKills', bossKills);
    return next;
}

// The leaderboard API rejects durations outside [10, 3600] seconds.
const MIN_SUBMIT_DURATION = 10;
const MAX_SUBMIT_DURATION = 3600;

async function reportRunEnd(tier: number, bestFloor: number, floorsThisRun: number, elapsedSeconds: number): Promise<void> {
    try {
        const duration = Math.min(MAX_SUBMIT_DURATION, Math.max(MIN_SUBMIT_DURATION, Math.round(elapsedSeconds)));
        await RundotGameAPI.leaderboard.submitScore({
            score: bestFloor,
            duration,
            mode: `tier-${tier}`,
        });
    } catch (err) {
        console.warn('[progress] leaderboard submit failed (likely unconfigured) — continuing', err);
    }
    try {
        await RundotGameAPI.stats.submit(`best_floor_tier_${tier}`, bestFloor);
        await RundotGameAPI.stats.submit(`floor_depth_tier_${tier}`, floorsThisRun);
    } catch (err) {
        console.warn('[progress] stats submit failed — continuing', err);
    }
}
