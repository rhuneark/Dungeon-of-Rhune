/**
 * Lore-quest runtime: start, progress (via emit), complete, reward.
 */
import { getLore } from '../content/lore/lore.ts';
import { getQuest, QUESTS, type QuestDef, type QuestEvent } from '../content/lore/quests.ts';
import type { ItemInstance } from '../content/items/types.ts';
import { getUnique } from '../content/items/uniques.ts';
import { session } from '../state/session.ts';
import { store } from '../state/store.ts';
import { worldBridge } from '../game/worldBridge.ts';
import { createItem } from './itemGen.ts';
import type { HeroSave } from './hero.ts';
import { autoPlace } from './inventory.ts';
import { INV_H, INV_W } from './hero.ts';
import { gainXp } from './progression.ts';

/** Special start/reward item ids that aren't plain bases. */
function makeQuestItem(id: string, ilvl: number): ItemInstance {
    if (id === 'socketed_sword') {
        const it = createItem('short_sword', { ilvl, quality: 'normal' });
        it.sockets = 2;
        return it;
    }
    if (id.startsWith('unique:')) {
        const u = getUnique(id.slice(7));
        if (u) return createItem(u.baseId, { ilvl: Math.max(ilvl, u.qlvl), quality: 'unique', uniqueId: u.id, identified: true });
    }
    return createItem(id, { ilvl });
}

export function giveItem(hero: HeroSave, item: ItemInstance): void {
    if (!autoPlace({ w: INV_W, h: INV_H, items: hero.inventory }, item)) {
        worldBridge.spawnDrops([{ kind: 'item', item }], 'player');
        store.toast('No room — it’s on the ground.', '#e0b060');
    }
}

export function startQuest(hero: HeroSave, q: QuestDef): void {
    if (hero.quests[q.id]) return;
    hero.quests[q.id] = { state: 'active', progress: {} };
    for (const id of q.startItems ?? []) giveItem(hero, makeQuestItem(id, hero.level));
    store.toast(`New lore quest: ${q.title}`, '#d9b26a');
}

export function startAutoQuests(hero: HeroSave): void {
    for (const q of QUESTS) if (q.autoStart && !hero.quests[q.id]) startQuest(hero, q);
}

/** Quests this NPC can hand out right now (prereqs done, not started). */
export function availableFrom(hero: HeroSave, npcId: string): QuestDef[] {
    return QUESTS.filter(
        (q) => q.giver === npcId && !hero.quests[q.id] && (q.after ?? []).every((a) => hero.quests[a]?.state === 'done')
    );
}

function isComplete(hero: HeroSave, q: QuestDef): boolean {
    const st = hero.quests[q.id];
    return !!st && q.objectives.every((o) => (st.progress[o.id] ?? 0) >= o.count);
}

function complete(hero: HeroSave, q: QuestDef): void {
    const st = hero.quests[q.id];
    st.state = 'done';
    const r = q.reward;
    const parts: string[] = [];
    if (r.gold) {
        hero.gold += r.gold;
        parts.push(`${r.gold} gold`);
    }
    if (r.pathPoints) {
        hero.pathPoints += r.pathPoints;
        parts.push(`${r.pathPoints} Path Point${r.pathPoints > 1 ? 's' : ''}`);
    }
    for (const id of r.items ?? []) giveItem(hero, makeQuestItem(id, hero.level));
    for (const l of r.lore ?? []) {
        if (!hero.lore.includes(l)) {
            hero.lore.push(l);
            parts.push(`lore: ${getLore(l)?.title ?? l}`);
        }
    }
    store.toast(`Quest complete: ${q.title}`, '#f3d34a');
    if (parts.length) store.toast(`Reward: ${parts.join(', ')}`, '#d9b26a');
    if (r.xp) gainXp(hero, r.xp);
}

/** Report a gameplay event; progresses every matching active objective. */
export function emit(event: QuestEvent, target?: string, amount = 1): void {
    if (!session.hasHero) return;
    const hero = session.hero;
    let changed = false;
    for (const [qid, st] of Object.entries(hero.quests)) {
        if (st.state !== 'active') continue;
        const q = getQuest(qid);
        if (!q) continue;
        for (const o of q.objectives) {
            if (o.event !== event) continue;
            if (o.target && o.target !== target) continue;
            const cur = st.progress[o.id] ?? 0;
            if (cur >= o.count) continue;
            st.progress[o.id] = Math.min(o.count, cur + amount);
            changed = true;
        }
        if (isComplete(hero, q)) complete(hero, q);
    }
    if (changed) session.commit();
}
