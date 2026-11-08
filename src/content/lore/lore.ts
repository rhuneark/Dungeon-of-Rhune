/**
 * Lore entries — the game has no story mode; the world explains itself
 * through these, unlocked by lore quests, conversations and found pages.
 * Read them in Old Varn's Codex.
 */
export interface LoreEntry {
    id: string;
    title: string;
    text: string;
}

export const LORE: LoreEntry[] = [
    {
        id: 'thornwick',
        title: 'Thornwick',
        text:
            'A frontier town of timber and stubbornness, built over the one thing nobody sane would build over: the Sealed Stair. ' +
            'Treasure hunters come for what lies beneath. Most of them leave poorer. Some of them leave at all.',
    },
    {
        id: 'rhunewrights',
        title: 'The Rhunewrights',
        text:
            'An order of carvers who believed the world was written, and that the right words, cut into the right stone, could edit it. ' +
            'They dug the Pit to find the first word. Three hundred years ago they found something that answered instead.',
    },
    {
        id: 'the_pit',
        title: 'The Sealed Stair',
        text:
            'The Rhunewrights sealed the Stair from the inside. Nobody has ever explained who locked the chains on the outside. ' +
            'The runes on the broken pillars still glow. Lately, they flicker.',
    },
    {
        id: 'rhunes',
        title: 'Rhunes and Rhunewords',
        text:
            'Each Rhune is one word of a dead language. Alone, a word is a nudge. Spoken in the right order, set into a plain, ' +
            'honest item with exactly enough sockets, the words become a sentence, and the item becomes something else entirely. ' +
            'Brannoc keeps a list. He will not say where he got it.',
    },
    {
        id: 'the_goose',
        title: 'The Goose',
        text:
            'The goose was here before the town. The goose was here, according to one water-stained page, before the Pit. ' +
            'It has been fed, chased, cursed, blessed and once, briefly, crowned. It dropped a key at your feet, which it has never done before. ' +
            'The key fits nothing in Thornwick.',
    },
    {
        id: 'the_well',
        title: 'The Wishing Well',
        text:
            'Ysolde says the well was dug by the first settlers and filled by the second, and the third heard it talking. ' +
            'It does not grant wishes. It trades. Coins go in; things come out; nobody has ever checked the bottom.',
    },
    {
        id: 'odo',
        title: '"Lucky" Odo',
        text:
            'Odo claims he has never lost a bet. Odo also claims to be the rightful heir to four kingdoms, a retired dragon, ' +
            'and twenty-six years old. He sells sealed goods: you pay, you open, you live with it.',
    },
    {
        id: 'page_1',
        title: 'Torn Page: "Day 40"',
        text:
            '"Day 40 below. Aldric carved HOLLOW into the north door and the door went soft, like bread. We are not to use that word again. ' +
            'Aldric is not to use any words again."',
    },
    {
        id: 'page_2',
        title: 'Torn Page: "The Zenith"',
        text:
            '"Every rhune is a shard of the Zenith Stone. Put all the shards back together and you hold the first word. ' +
            'Master Ilse says that is the plan. Master Ilse says a lot of things since she started sleeping at the bottom."',
    },
    {
        id: 'page_3',
        title: 'Torn Page: "Last Entry"',
        text:
            '"We seal the Stair tonight, from this side. Someone must stay below and hold the words. ' +
            'If you are reading this in the town above: do not open it. If you are reading this below: welcome home."',
    },
];

export function getLore(id: string): LoreEntry | undefined {
    return LORE.find((l) => l.id === id);
}
