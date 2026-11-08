/**
 * The people of Thornwick. Each NPC offers services (which panels open) and
 * a few lines of talk. Homages are in the job descriptions, not the faces.
 */
export type Service = 'trade' | 'herbs' | 'gamble' | 'smith' | 'identify' | 'codex' | 'gate';

export interface NpcDef {
    id: string;
    name: string;
    title: string;
    /** Character sprite folder (public/art/chars/<sprite>). */
    sprite: string;
    services: Service[];
    greeting: string[];
    /** Random lines when talked to again. */
    chatter: string[];
}

export const NPCS: NpcDef[] = [
    {
        id: 'varn', name: 'Old Varn', title: 'Lorekeeper', sprite: 'npc_lore', services: ['identify', 'codex'],
        greeting: ['Sit, sit. Let an old man ramble.', 'You have the look of someone who reads the tooltip. Good. Most don’t.'],
        chatter: [
            'Every rhune is a word. I have spent my life learning to pronounce eleven of them.',
            'Unidentified, it is a mystery. Identified, it is usually a disappointment. That is scholarship.',
            'The Pit goes down further than the maps. The maps were drawn by optimists.',
        ],
    },
    {
        id: 'brannoc', name: 'Brannoc', title: 'Smith', sprite: 'npc_smith', services: ['smith'],
        greeting: ['Hammer’s hot. What do you need?', 'Plain gear with empty holes is worth more than you think. Ask me why.'],
        chatter: [
            'Three of the same rhune in my crucible and you get the next one up. Don’t ask how. I don’t know how.',
            'Magic items can’t take a Rhuneword. Too much talking already.',
            'I am NOT an Emberwright. The forge just likes me.',
        ],
    },
    {
        id: 'ysolde', name: 'Mother Ysolde', title: 'Herbalist', sprite: 'npc_herbalist', services: ['herbs'],
        greeting: ['Drink this. No, don’t smell it first.', 'You’re bleeding on my herbs.'],
        chatter: ['The well talks at night. I talk back. We’re very close.', 'Red for blood, blue for wits, purple for when it’s gone very wrong.'],
    },
    {
        id: 'pell', name: 'Pell Quickcoin', title: 'Trader', sprite: 'npc_trader', services: ['trade'],
        greeting: ['Buying, selling, browsing, loitering? All welcome. Loitering is extra.', 'Everything has a price. Most of it is reasonable.'],
        chatter: ['My stock changes when you’re not looking. Trade secret.', 'Unidentified goods? I’ll take them, but I won’t pay much. Varn reads them for free, you know.'],
    },
    {
        id: 'odo', name: '"Lucky" Odo', title: 'Purveyor of Sealed Goods', sprite: 'npc_gambler', services: ['gamble'],
        greeting: ['Sealed goods! Could be anything! Legally, it’s mostly something!', 'Feeling lucky? I am. I always am.'],
        chatter: ['One in a hundred is legendary. Or one in fifty. I lose count.', 'Never trust a goose. Never trust a man who trusts a goose.'],
    },
    {
        id: 'maren', name: 'Captain Maren', title: 'Gate Captain', sprite: 'npc_captain', services: ['gate'],
        greeting: ['State your business. If it’s the Wilds, the answer is not yet.', 'Gate stays shut until the scouts are back.'],
        chatter: ['The goose outranks me. I checked.', 'Something has been eating the scouts’ rations. Small. Greedy. Jingles.'],
    },
];

export function getNpc(id: string): NpcDef | undefined {
    return NPCS.find((n) => n.id === id);
}
