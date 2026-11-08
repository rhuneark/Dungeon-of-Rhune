/**
 * Base item catalog — the first "tier" (levels 1-30, the first-release
 * quarter-size world). Exceptional/elite tiers later reuse the same shapes
 * with new names, damage and qlvl.
 *
 * Tags drive affix eligibility (affixes.ts) and Targeted Find matching.
 */
import type { ItemBase } from './types.ts';
import { RHUNES } from './rhunes.ts';

const w = (b: Omit<ItemBase, 'category'> & { category?: ItemBase['category'] }): ItemBase => ({ category: 'weapon', ...b }) as ItemBase;

export const BASES: ItemBase[] = [
    // ---------------------------------------------------------------- weapons
    w({ id: 'dagger', name: 'Dagger', slot: 'weapon', w: 1, h: 2, art: ['dagger'], qlvl: 1, damage: [2, 6], speed: 1.6, maxSockets: 1, tags: ['weapon', 'melee', '1h', 'dagger'], weight: 10, price: 30, reqFinesse: 8 }),
    w({ id: 'short_sword', name: 'Short Sword', slot: 'weapon', w: 1, h: 3, art: ['short_sword'], qlvl: 1, damage: [3, 8], speed: 1.3, maxSockets: 2, tags: ['weapon', 'melee', '1h', 'sword'], weight: 10, price: 40 }),
    w({ id: 'club', name: 'Spiked Club', slot: 'weapon', w: 1, h: 3, art: ['club'], qlvl: 1, damage: [2, 9], speed: 1.25, maxSockets: 2, tags: ['weapon', 'melee', '1h', 'mace'], weight: 10, price: 30 }),
    w({ id: 'hand_axe', name: 'Hand Axe', slot: 'weapon', w: 1, h: 3, art: ['hand_axe'], qlvl: 2, damage: [3, 7], speed: 1.35, maxSockets: 2, tags: ['weapon', 'melee', '1h', 'axe'], weight: 10, price: 35 }),
    w({ id: 'short_bow', name: 'Short Bow', slot: 'weapon', twoHanded: true, w: 2, h: 3, art: ['short_bow'], qlvl: 1, damage: [2, 7], speed: 1.4, maxSockets: 3, tags: ['weapon', 'ranged', '2h', 'bow'], weight: 10, price: 50, reqFinesse: 10 }),
    w({ id: 'wand', name: 'Bone Wand', slot: 'weapon', w: 1, h: 2, art: ['wand'], qlvl: 1, damage: [2, 4], speed: 1.3, maxSockets: 1, implicit: [{ stat: 'tagPct:spell', value: 10 }], tags: ['weapon', 'caster', '1h', 'wand'], weight: 8, price: 45, reqSpirit: 10 }),
    w({ id: 'staff', name: 'Gnarled Staff', slot: 'weapon', twoHanded: true, w: 1, h: 4, art: ['staff'], qlvl: 3, damage: [3, 9], speed: 1.1, maxSockets: 3, implicit: [{ stat: 'castSpeed', value: 10 }, { stat: 'mana', value: 10 }], tags: ['weapon', 'caster', '2h', 'staff'], weight: 8, price: 60, reqSpirit: 12 }),
    w({ id: 'spear', name: 'Spear', slot: 'weapon', twoHanded: true, w: 1, h: 4, art: ['spear'], qlvl: 5, damage: [6, 18], speed: 1.1, maxSockets: 3, tags: ['weapon', 'melee', '2h', 'spear'], weight: 8, price: 70, reqMight: 15, reqFinesse: 15 }),
    w({ id: 'mace', name: 'Flanged Mace', slot: 'weapon', w: 1, h: 3, art: ['mace'], qlvl: 6, damage: [4, 10], speed: 1.2, maxSockets: 2, tags: ['weapon', 'melee', '1h', 'mace'], weight: 8, price: 70, reqMight: 20 }),
    w({ id: 'greatsword', name: 'Greatsword', slot: 'weapon', twoHanded: true, w: 1, h: 4, art: ['greatsword'], qlvl: 8, damage: [10, 22], speed: 1.0, maxSockets: 3, tags: ['weapon', 'melee', '2h', 'sword'], weight: 7, price: 110, reqMight: 30 }),
    w({ id: 'scepter', name: 'Scepter', slot: 'weapon', w: 1, h: 3, art: ['scepter'], qlvl: 8, damage: [5, 10], speed: 1.2, maxSockets: 2, implicit: [{ stat: 'lifeRegen', value: 2 }], tags: ['weapon', 'caster', 'melee', '1h', 'mace', 'scepter'], weight: 7, price: 100, reqMight: 15, reqSpirit: 15 }),
    w({ id: 'war_axe', name: 'War Axe', slot: 'weapon', twoHanded: true, w: 2, h: 3, art: ['war_axe'], qlvl: 10, damage: [10, 24], speed: 0.95, maxSockets: 4, tags: ['weapon', 'melee', '2h', 'axe'], weight: 7, price: 130, reqMight: 35 }),
    w({ id: 'maul', name: 'Maul', slot: 'weapon', twoHanded: true, w: 2, h: 3, art: ['maul'], qlvl: 14, damage: [12, 28], speed: 0.85, maxSockets: 4, tags: ['weapon', 'melee', '2h', 'mace'], weight: 6, price: 160, reqMight: 45 }),

    // --------------------------------------------------------------- off-hands
    { id: 'buckler', name: 'Buckler', category: 'offhand', slot: 'offhand', w: 2, h: 2, art: ['buckler'], qlvl: 1, armor: [4, 8], block: 15, maxSockets: 1, tags: ['offhand', 'shield'], weight: 10, price: 30 },
    { id: 'tome', name: 'Tattered Tome', category: 'offhand', slot: 'offhand', w: 2, h: 2, art: ['tome'], qlvl: 3, maxSockets: 1, implicit: [{ stat: 'mana', value: 10 }, { stat: 'tagPct:spell', value: 5 }], tags: ['offhand', 'caster', 'tome'], weight: 8, price: 50, reqSpirit: 10 },
    { id: 'kite_shield', name: 'Kite Shield', category: 'offhand', slot: 'offhand', w: 2, h: 3, art: ['kite_shield'], qlvl: 9, armor: [14, 22], block: 25, maxSockets: 3, tags: ['offhand', 'shield'], weight: 8, price: 90, reqMight: 25 },

    // ------------------------------------------------------------------ armor
    { id: 'cap', name: 'Cap', category: 'armor', slot: 'head', w: 2, h: 2, art: ['cap'], qlvl: 1, armor: [3, 5], maxSockets: 2, tags: ['armor', 'helm'], weight: 10, price: 20 },
    { id: 'hood', name: 'Hood', category: 'armor', slot: 'head', w: 2, h: 2, art: ['hood'], qlvl: 3, armor: [2, 4], maxSockets: 1, implicit: [{ stat: 'mana', value: 5 }], tags: ['armor', 'helm', 'caster'], weight: 9, price: 25 },
    { id: 'helm', name: 'Great Helm', category: 'armor', slot: 'head', w: 2, h: 2, art: ['helm'], qlvl: 12, armor: [10, 16], maxSockets: 2, tags: ['armor', 'helm'], weight: 8, price: 80, reqMight: 30 },
    { id: 'quilted_armor', name: 'Quilted Armor', category: 'armor', slot: 'chest', w: 2, h: 3, art: ['quilted_armor'], qlvl: 1, armor: [8, 12], maxSockets: 2, tags: ['armor', 'chest'], weight: 10, price: 30 },
    { id: 'robe', name: 'Runed Robe', category: 'armor', slot: 'chest', w: 2, h: 3, art: ['robe'], qlvl: 4, armor: [6, 10], maxSockets: 2, implicit: [{ stat: 'castSpeed', value: 5 }], tags: ['armor', 'chest', 'caster'], weight: 8, price: 45 },
    { id: 'leather_armor', name: 'Studded Leather', category: 'armor', slot: 'chest', w: 2, h: 3, art: ['leather_armor'], qlvl: 6, armor: [14, 20], maxSockets: 2, tags: ['armor', 'chest'], weight: 9, price: 60, reqMight: 15 },
    { id: 'chain_mail', name: 'Chain Mail', category: 'armor', slot: 'chest', w: 2, h: 3, art: ['chain_mail'], qlvl: 12, armor: [24, 32], maxSockets: 3, tags: ['armor', 'chest'], weight: 8, price: 110, reqMight: 35 },
    { id: 'breastplate', name: 'Breastplate', category: 'armor', slot: 'chest', w: 2, h: 3, art: ['breastplate'], qlvl: 18, armor: [34, 45], maxSockets: 3, tags: ['armor', 'chest'], weight: 7, price: 160, reqMight: 45 },
    { id: 'gloves', name: 'Leather Gloves', category: 'armor', slot: 'hands', w: 2, h: 2, art: ['gloves'], qlvl: 1, armor: [2, 4], maxSockets: 0, tags: ['armor', 'gloves'], weight: 10, price: 20 },
    { id: 'gauntlets', name: 'Gauntlets', category: 'armor', slot: 'hands', w: 2, h: 2, art: ['gauntlets'], qlvl: 12, armor: [8, 12], maxSockets: 0, tags: ['armor', 'gloves'], weight: 8, price: 70, reqMight: 30 },
    { id: 'boots', name: 'Boots', category: 'armor', slot: 'feet', w: 2, h: 2, art: ['boots'], qlvl: 1, armor: [2, 4], maxSockets: 0, tags: ['armor', 'boots'], weight: 10, price: 20 },
    { id: 'greaves', name: 'Greaves', category: 'armor', slot: 'feet', w: 2, h: 2, art: ['greaves'], qlvl: 12, armor: [8, 12], maxSockets: 0, tags: ['armor', 'boots'], weight: 8, price: 70, reqMight: 30 },
    { id: 'sash', name: 'Sash', category: 'armor', slot: 'waist', w: 2, h: 1, art: ['sash'], qlvl: 1, armor: [2, 3], maxSockets: 0, tags: ['armor', 'belt'], weight: 10, price: 20 },
    { id: 'belt', name: 'Belt', category: 'armor', slot: 'waist', w: 2, h: 1, art: ['belt'], qlvl: 9, armor: [4, 6], maxSockets: 0, tags: ['armor', 'belt'], weight: 8, price: 50 },

    // ---------------------------------------------------------------- jewelry
    { id: 'ring', name: 'Ring', category: 'jewelry', slot: 'ring', w: 1, h: 1, art: ['ring_a', 'ring_b', 'ring_c'], qlvl: 1, maxSockets: 0, tags: ['jewelry', 'ring'], weight: 10, price: 100, alwaysMagic: true },
    { id: 'amulet', name: 'Amulet', category: 'jewelry', slot: 'neck', w: 1, h: 1, art: ['amulet_a', 'amulet_b', 'amulet_c'], qlvl: 1, maxSockets: 0, tags: ['jewelry', 'amulet'], weight: 8, price: 150, alwaysMagic: true },

    // ------------------------------------------------------------------ curios
    // Curios work while carried in the backpack (D2-charm homage): every cell
    // they take is a cell you can't fill with loot. That tension is the point.
    { id: 'curio_small', name: 'Small Curio', category: 'curio', w: 1, h: 1, art: ['curio_s_a', 'curio_s_b', 'curio_s_c'], qlvl: 1, maxSockets: 0, tags: ['curio', 'curio_small'], weight: 10, price: 80, alwaysMagic: true, flavor: 'Keep it in your pack.' },
    { id: 'curio_medium', name: 'Curio', category: 'curio', w: 1, h: 2, art: ['curio_m_a', 'curio_m_b'], qlvl: 10, maxSockets: 0, tags: ['curio', 'curio_medium'], weight: 7, price: 120, alwaysMagic: true, flavor: 'Keep it in your pack.' },
    { id: 'curio_large', name: 'Grand Curio', category: 'curio', w: 1, h: 3, art: ['curio_l_a', 'curio_l_b'], qlvl: 18, maxSockets: 0, tags: ['curio', 'curio_large'], weight: 5, price: 200, alwaysMagic: true, flavor: 'Keep it in your pack.' },

    // ------------------------------------------------------------- consumables
    { id: 'potion_health', name: 'Healing Draught', category: 'consumable', w: 1, h: 1, art: ['potion_red'], qlvl: 1, maxSockets: 0, tags: ['potion'], weight: 10, price: 25, use: 'heal' },
    { id: 'potion_mana', name: 'Mana Draught', category: 'consumable', w: 1, h: 1, art: ['potion_blue'], qlvl: 1, maxSockets: 0, tags: ['potion'], weight: 8, price: 25, use: 'mana' },
    { id: 'potion_rejuv', name: 'Rejuvenation Tonic', category: 'consumable', w: 1, h: 1, art: ['potion_purple'], qlvl: 8, maxSockets: 0, tags: ['potion'], weight: 2, price: 150, use: 'rejuv' },
    { id: 'scroll_identify', name: 'Scroll of Insight', category: 'consumable', w: 1, h: 1, art: ['scroll'], qlvl: 1, maxSockets: 0, tags: ['scroll'], weight: 3, price: 40, use: 'identify', flavor: 'Right-click, then click an unidentified item.' },
    { id: 'lore_page', name: 'Torn Page', category: 'quest', w: 1, h: 1, art: ['page'], qlvl: 1, maxSockets: 0, tags: ['quest'], weight: 0, price: 1, flavor: 'Old Varn would want to see this.' },
    { id: 'old_key', name: 'Rusted Key', category: 'quest', w: 1, h: 1, art: ['key'], qlvl: 1, maxSockets: 0, tags: ['quest'], weight: 0, price: 1, flavor: 'It smells faintly of goose.' },

    // ------------------------------------------------------------------ rhunes
    ...RHUNES.map(
        (r, i): ItemBase => ({
            id: `rhune_${r.id}`,
            name: `${r.name} Rhune`,
            category: 'rhune',
            w: 1,
            h: 1,
            art: [`rhune_${r.id}`],
            qlvl: r.qlvl,
            reqLevel: r.qlvl,
            maxSockets: 0,
            tags: ['rhune'],
            weight: r.weight,
            price: Math.round(40 * Math.pow(1.6, i)),
            flavor: r.lore,
        })
    ),
];

const BY_ID = new Map(BASES.map((b) => [b.id, b]));
export function getBase(id: string): ItemBase {
    const b = BY_ID.get(id);
    if (!b) throw new Error(`unknown base ${id}`);
    return b;
}
export function hasBase(id: string): boolean {
    return BY_ID.has(id);
}

/** Bases that can come out of an "equipment" pick. */
export const EQUIPMENT_BASES = BASES.filter((b) => ['weapon', 'offhand', 'armor', 'jewelry', 'curio'].includes(b.category));

/** Targeted-Find kind a base counts as. */
export function seekKindOf(base: ItemBase): 'weapon' | 'armor' | 'jewelry' | 'curio' | 'rhune' | null {
    switch (base.category) {
        case 'weapon':
            return 'weapon';
        case 'offhand':
        case 'armor':
            return 'armor';
        case 'jewelry':
            return 'jewelry';
        case 'curio':
            return 'curio';
        case 'rhune':
            return 'rhune';
        default:
            return null;
    }
}
