/**
 * What happens when the player uses something in the world. The scene only
 * reports WHAT was clicked; this module decides which panel or dialog opens
 * and which quest events fire.
 */
import { getNpc, type Service } from '../content/npcs.ts';
import { getQuest } from '../content/lore/quests.ts';
import { session } from '../state/session.ts';
import { store, type LeftPanel } from '../state/store.ts';
import { identifyAll } from '../systems/actions.ts';
import { availableFrom, emit, startQuest } from '../systems/quests.ts';
import { worldRng } from '../systems/rng.ts';
import type { InteractTarget } from './scenes/townScene.ts';
import { worldBridge } from './worldBridge.ts';

const say = (title: string, line: string, sub?: string) => store.patch({ dialog: { npcId: null, title, sub, line, notes: [] }, left: null });

export function talkTo(npcId: string): void {
    const def = getNpc(npcId);
    if (!def) return;
    const hero = session.hero;
    const metKey = `met:${npcId}`;
    const first = !hero.flags[metKey];
    hero.flags[metKey] = 1;
    emit('talk', npcId);
    const notes: string[] = [];
    for (const q of availableFrom(hero, npcId)) {
        startQuest(hero, q);
        notes.push(`New lore quest: ${q.title} — ${q.summary}`);
    }
    // Remind about active quests this NPC gave.
    for (const [qid, st] of Object.entries(hero.quests)) {
        const q = getQuest(qid);
        if (q && q.giver === npcId && st.state === 'active' && !notes.some((n) => n.includes(q.title))) notes.push(`${q.title}: ${q.summary}`);
    }
    const line = first ? def.greeting[0] : worldRng.chance(0.3) ? worldRng.pick(def.greeting) : worldRng.pick(def.chatter);
    store.patch({ dialog: { npcId, title: def.name, sub: def.title, line, notes }, left: null, right: null });
    session.commit();
}

/** Dialog service buttons. */
export function npcService(npcId: string, service: Service): void {
    const open = (left: LeftPanel) => store.patch({ dialog: null, left, right: 'inventory', serviceNpc: npcId });
    switch (service) {
        case 'trade':
            return open('vendor');
        case 'herbs':
            return open('herbs');
        case 'gamble':
            return open('gamble');
        case 'smith':
            return open('smith');
        case 'codex':
            return store.patch({ dialog: null, left: 'codex', right: null });
        case 'identify': {
            const n = identifyAll();
            store.patch({
                dialog: {
                    npcId,
                    title: 'Old Varn',
                    sub: 'Lorekeeper',
                    line: n ? `Ah. Let me see... (${n} item${n > 1 ? 's' : ''} identified.)` : 'You have nothing I haven’t already read.',
                    notes: [],
                },
            });
            return;
        }
        case 'gate':
            store.patch({
                dialog: {
                    npcId,
                    title: 'Captain Maren',
                    sub: 'Gate Captain',
                    line: 'The Wilds open when the scouts return. Spend the time well: gear up, read up, and stay away from the goose.',
                    notes: ['(The Wilds, monsters and the first descent into the Pit arrive in the next build.)'],
                },
            });
    }
}

export function onWorldInteract(t: InteractTarget): void {
    const hero = session.hero;
    if (t.kind === 'npc') return talkTo(t.id);
    if (t.kind === 'critter') {
        hero.flags.honks = (hero.flags.honks ?? 0) + 1;
        const lines = ['HONK!', 'HONK.', 'HONK?!', 'hiss', 'HONK!!', '...honk', 'HONK HONK'];
        worldBridge.floatText(lines[(hero.flags.honks - 1) % lines.length], '#ffffff');
        emit('honk');
        session.commit();
        return;
    }
    switch (t.action) {
        case 'stash':
            store.patch({ left: 'stash', right: 'inventory', dialog: null });
            return;
        case 'well':
            store.patch({ left: 'well', right: 'inventory', dialog: null });
            return;
        case 'quests':
            store.patch({ left: 'quests', dialog: null });
            return;
        case 'inspect':
            emit('inspect', 'pit_entrance');
            say(
                'The Sealed Stair',
                'Stone steps vanish into a dark that seems to breathe. The runes on the broken pillars pulse, faintly, in time with something far below. The chains are cold. Someone has scratched a tally into the top step: 41.'
            );
            return;
        case 'waypoint':
            say('Rhunestone Circle', 'The standing stones hum when you step between them. Varn says they once linked every Rhunewright outpost. Only this one still answers. (Waypoints arrive with the Wilds.)');
            return;
        case 'statue':
            if (t.name.startsWith('Statue')) {
                say('Aldra Thornwick', '"She held the gate for nine days with a lantern and a bad temper. The town took her name. The goose took her hat." — inscription');
                return;
            }
            store.toast(t.name);
            return;
        case 'gate':
            say('South Gate', 'Barred, chained and guarded. Beyond it the Rhunewild waits. Captain Maren has the key and no intention of using it yet.');
            return;
    }
}
