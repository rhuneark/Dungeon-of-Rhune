/**
 * Lore quests — small, optional, self-contained. No main story: each quest is
 * a reason to poke at a corner of the world, and pays in Path Points, XP,
 * items and lore.
 *
 * Objective events are fired from gameplay via systems/quests.ts `emit()`.
 */
export type QuestEvent =
    | 'talk' // target = npc id
    | 'inspect' // target = object id
    | 'honk' // the goose
    | 'wish' // wishing well
    | 'gamble'
    | 'socket'
    | 'rhuneword'
    | 'identify'
    | 'pickup'; // target = base id

export interface QuestObjective {
    id: string;
    text: string;
    event: QuestEvent;
    target?: string;
    count: number;
}

export interface QuestReward {
    xp?: number;
    gold?: number;
    pathPoints?: number;
    lore?: string[];
    /** Items handed over on completion: base ids, or 'unique:<id>'. */
    items?: string[];
}

export interface QuestDef {
    id: string;
    title: string;
    giver: string;
    summary: string;
    objectives: QuestObjective[];
    reward: QuestReward;
    /** Items given when the quest starts (so it can be finished). */
    startItems?: string[];
    /** Quest ids that must be completed first. */
    after?: string[];
    /** Starts automatically on a new character. */
    autoStart?: boolean;
}

export const QUESTS: QuestDef[] = [
    {
        id: 'newcomer', title: 'A Stranger in Thornwick', giver: 'varn', autoStart: true,
        summary: 'Old Varn suggests you introduce yourself. "People here trust a face before they trust a sword."',
        objectives: [
            { id: 'brannoc', text: 'Meet Brannoc the smith', event: 'talk', target: 'brannoc', count: 1 },
            { id: 'ysolde', text: 'Meet Mother Ysolde', event: 'talk', target: 'ysolde', count: 1 },
            { id: 'pell', text: 'Meet Pell Quickcoin', event: 'talk', target: 'pell', count: 1 },
            { id: 'odo', text: 'Meet "Lucky" Odo', event: 'talk', target: 'odo', count: 1 },
            { id: 'maren', text: 'Meet Captain Maren', event: 'talk', target: 'maren', count: 1 },
        ],
        reward: { xp: 400, pathPoints: 1, lore: ['thornwick'] },
    },
    {
        id: 'sealed_stair', title: 'The Sealed Stair', giver: 'varn', after: ['newcomer'],
        summary: 'Varn wants a fresh pair of eyes on the Sealed Stair at the north end of town. "Look. Do not touch."',
        objectives: [{ id: 'look', text: 'Inspect the Sealed Stair', event: 'inspect', target: 'pit_entrance', count: 1 }],
        reward: { xp: 250, lore: ['the_pit', 'rhunewrights'] },
    },
    {
        id: 'second_opinion', title: 'A Second Opinion', giver: 'varn', autoStart: true,
        summary: 'Magic things come out of the ground unnamed. Varn can read them. "Bring me anything that hums."',
        objectives: [{ id: 'id', text: 'Have an item identified', event: 'identify', count: 1 }],
        reward: { xp: 150, items: ['scroll_identify', 'scroll_identify'] },
    },
    {
        id: 'literacy', title: 'Rhunic Literacy', giver: 'brannoc', autoStart: true,
        summary: 'Brannoc hands you two rhunes and a sword with two empty sockets. "Ember, then Ash. In that order. Go on."',
        startItems: ['rhune_ember', 'rhune_ash', 'socketed_sword'],
        objectives: [
            { id: 'socket', text: 'Socket a rhune into an item', event: 'socket', count: 1 },
            { id: 'word', text: 'Speak a Rhuneword', event: 'rhuneword', count: 1 },
        ],
        reward: { xp: 300, pathPoints: 1, lore: ['rhunes'] },
    },
    {
        id: 'goose_problem', title: 'The Goose Problem', giver: 'maren', autoStart: true,
        summary: 'Captain Maren would like someone to "have a word" with the goose. "It’s been on watch longer than me. It doesn’t salute."',
        objectives: [{ id: 'honk', text: 'Have a word with the goose', event: 'honk', count: 7 }],
        reward: { xp: 150, items: ['old_key'], lore: ['the_goose'] },
    },
    {
        id: 'coins_for_well', title: 'Coins for the Well', giver: 'ysolde', autoStart: true,
        summary: 'Mother Ysolde says the well is hungry. "Three coins, three wishes. Don’t look down."',
        objectives: [{ id: 'wish', text: 'Make wishes at the Wishing Well', event: 'wish', count: 3 }],
        reward: { xp: 200, items: ['potion_health', 'potion_health', 'potion_mana'], lore: ['the_well'] },
    },
    {
        id: 'odds_and_ends', title: 'Odds and Ends', giver: 'odo', autoStart: true,
        summary: 'Odo swears his sealed goods are blessed. "Two purchases. Trust me. I’ll even give you some coin back."',
        objectives: [{ id: 'gamble', text: 'Buy sealed goods from Odo', event: 'gamble', count: 2 }],
        reward: { xp: 150, gold: 250, lore: ['odo'] },
    },
    {
        id: 'pages', title: 'Pages of the Pit', giver: 'varn', after: ['sealed_stair'],
        summary: 'Pages from a Rhunewright journal have been blowing around town for years. "Find them. Bring them. Do not read them aloud."',
        objectives: [{ id: 'pages', text: 'Find Torn Pages around Thornwick', event: 'pickup', target: 'lore_page', count: 3 }],
        reward: { xp: 400, pathPoints: 1, lore: ['page_1', 'page_2', 'page_3'] },
    },
];

export function getQuest(id: string): QuestDef | undefined {
    return QUESTS.find((q) => q.id === id);
}
