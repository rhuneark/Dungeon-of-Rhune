/**
 * Experience and levels. Specialized skills earn the same XP (Last Epoch).
 */
import { getSkill } from '../content/skills/disciplines.ts';
import { store } from '../state/store.ts';
import { worldBridge } from '../game/worldBridge.ts';
import { ATTR_POINTS_PER_LEVEL, MAX_LEVEL, PATH_POINTS_PER_LEVEL, xpToNext, type HeroSave } from './hero.ts';
import { grantSkillXp } from './skills.ts';

export function gainXp(hero: HeroSave, amount: number, xpGainPct = 0): void {
    const amt = Math.round(amount * (1 + xpGainPct / 100));
    if (amt <= 0) return;
    hero.xp += amt;
    worldBridge.floatText(`+${amt} xp`, '#c9b98a');
    while (hero.level < MAX_LEVEL && hero.xp >= xpToNext(hero.level)) {
        hero.xp -= xpToNext(hero.level);
        hero.level += 1;
        hero.attrPoints += ATTR_POINTS_PER_LEVEL;
        hero.pathPoints += PATH_POINTS_PER_LEVEL;
        store.toast(`Level ${hero.level}! +${ATTR_POINTS_PER_LEVEL} attribute points, +${PATH_POINTS_PER_LEVEL} Path Point`, '#f3d34a');
        worldBridge.floatText('LEVEL UP', '#f3d34a');
    }
    if (hero.level >= MAX_LEVEL) hero.xp = 0;
    for (const id of grantSkillXp(hero, amt)) {
        const s = getSkill(id);
        if (s) store.toast(`${s.name} reached level ${hero.skills[id].level} — new tree point`, '#7ec8e3');
    }
}
