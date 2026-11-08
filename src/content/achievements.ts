/**
 * Steam achievements. Ids must match the API names configured in the
 * Steamworks partner site (App Admin → Stats & Achievements). Each one is a
 * pure check over the save, so they unlock retroactively for old saves.
 */
import { QUESTS } from './lore/quests.ts';
import type { SaveData } from '../systems/hero.ts';

export interface AchievementDef {
    id: string;
    name: string;
    description: string;
    check(save: SaveData): boolean;
}

const done = (save: SaveData, q: string) => save.hero?.quests[q]?.state === 'done';
const codexCount = (save: SaveData, prefix: string) => Object.keys(save.codex).filter((k) => k.startsWith(prefix)).length;

export const ACHIEVEMENTS: AchievementDef[] = [
    { id: 'FIRST_UNIQUE', name: 'Grail-Hunter', description: 'Identify your first unique item.', check: (s) => codexCount(s, 'u:') >= 1 },
    { id: 'CODEX_10', name: 'Collector', description: 'Record 10 different uniques in the Codex.', check: (s) => codexCount(s, 'u:') >= 10 },
    { id: 'FIRST_RHUNEWORD', name: 'It Speaks', description: 'Speak your first Rhuneword.', check: (s) => codexCount(s, 'w:') >= 1 },
    { id: 'TWO_PATHS', name: 'Two Paths', description: 'Walk two Disciplines at once.', check: (s) => !!s.hero && s.hero.disciplines.every(Boolean) },
    { id: 'GOOSE', name: 'Have a Word', description: 'Resolve the Goose Problem.', check: (s) => done(s, 'goose_problem') },
    { id: 'LOCAL_KNOWLEDGE', name: 'Local Knowledge', description: 'Finish every lore quest in Thornwick.', check: (s) => QUESTS.every((q) => done(s, q.id)) },
    { id: 'BOTTOMLESS', name: 'Bottomless', description: 'Make 25 wishes at the Wishing Well.', check: (s) => s.stats.wishes >= 25 },
    { id: 'ODDS_ARE', name: 'Odds Are', description: "Buy 25 of Odo's sealed goods.", check: (s) => s.stats.gambles >= 25 },
];
