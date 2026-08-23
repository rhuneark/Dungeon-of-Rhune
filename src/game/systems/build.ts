/**
 * The Build system: a persistent, account-wide "how do you like to play"
 * layer on top of gear and Rhunes. Players earn lifetime XP from kills,
 * floor clears, and boss kills; each level grants one point to spend across
 * three simple styles (Berserker/Ranger/Warden), each just a short list of
 * flat stat bonuses per point — no branching tree, no prerequisites, so a
 * new player can read it in one glance. Level (and therefore points
 * available) is always DERIVED from xp rather than stored separately, so
 * there's no way for "points available" to drift out of sync with xp.
 * Respec is free — the point is to encourage experimenting with builds,
 * not to gate it behind another currency sink.
 */
import type { BuildStyle, SaveData, StatBlock } from '../data/types.ts';

export const BUILD_STYLES: BuildStyle[] = ['berserker', 'ranger', 'warden'];

export const STYLE_LABELS: Record<BuildStyle, string> = {
    berserker: 'Berserker',
    ranger: 'Ranger',
    warden: 'Warden',
};

export const STYLE_DESCRIPTIONS: Record<BuildStyle, string> = {
    berserker: '+2 damage, +1.5% crit chance per point.',
    ranger: '+2% attack speed, +8 projectile speed, +0.4 pierce per point.',
    warden: '+6 max HP, +0.4 armor, +0.8% damage reduction per point.',
};

export const MAX_POINTS_PER_STYLE = 25;

/** XP required to advance FROM `level` TO `level + 1`. */
function xpForLevel(level: number): number {
    return 100 + (level - 1) * 40;
}

export function buildLevelInfo(xp: number): { level: number; into: number; need: number } {
    let level = 1;
    let remaining = xp;
    while (remaining >= xpForLevel(level)) {
        remaining -= xpForLevel(level);
        level += 1;
    }
    return { level, into: remaining, need: xpForLevel(level) };
}

export function buildLevel(xp: number): number {
    return buildLevelInfo(xp).level;
}

function spentPoints(build: SaveData['build']): number {
    return build.berserker + build.ranger + build.warden;
}

/** Total points earned so far minus points already committed to a style. */
export function availablePoints(save: SaveData): number {
    return buildLevel(save.build.xp) - 1 - spentPoints(save.build);
}

function styleStatMods(style: BuildStyle, points: number): Partial<StatBlock> {
    const p = Math.min(points, MAX_POINTS_PER_STYLE);
    switch (style) {
        case 'berserker':
            return { damage: p * 2, critChance: p * 0.015 };
        case 'ranger':
            return { fireRate: p * 0.02, projectileSpeed: p * 8, pierce: p * 0.4 };
        case 'warden':
            return { maxHp: p * 6, armor: p * 0.4, damageReduction: p * 0.008 };
    }
}

/** Combined flat stat bonus from every point spent across all three styles — folds into aggregateStats. */
export function buildStatMods(save: SaveData): Partial<StatBlock> {
    const out: Partial<StatBlock> = {};
    for (const style of BUILD_STYLES) {
        const mods = styleStatMods(style, save.build[style]);
        for (const [k, v] of Object.entries(mods)) {
            const stat = k as keyof StatBlock;
            out[stat] = (out[stat] ?? 0) + (v as number);
        }
    }
    return out;
}

export function spendBuildPoint(save: SaveData, style: BuildStyle): SaveData {
    if (availablePoints(save) <= 0) return save;
    if (save.build[style] >= MAX_POINTS_PER_STYLE) return save;
    return { ...save, build: { ...save.build, [style]: save.build[style] + 1 } };
}

export function respecBuild(save: SaveData): SaveData {
    return { ...save, build: { ...save.build, berserker: 0, ranger: 0, warden: 0 } };
}

/** XP for one run: kills matter most in bulk, floors and bosses are the reliable milestones. */
export function xpForRun(totalKills: number, clearedFloors: number, bossKills: number): number {
    return totalKills * 1 + clearedFloors * 15 + bossKills * 100;
}

export function grantXp(save: SaveData, amount: number): SaveData {
    if (amount <= 0) return save;
    return { ...save, build: { ...save.build, xp: save.build.xp + amount } };
}
