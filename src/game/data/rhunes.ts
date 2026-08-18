import type { RhuneDef } from './types.ts';

/** Separate drop pool from gear. 6 effects, freely socketable into any of 3 slots. */
export const RHUNES: RhuneDef[] = [
    {
        id: 'rhune_haste',
        name: 'Rhune of Haste',
        description: 'Your gear fires faster. Your brain does not.',
        stat: 'fireRate',
        baseValue: 0.15,
    },
    {
        id: 'rhune_bulk',
        name: 'Rhune of Bulk',
        description: 'More you to hit. More you to survive it.',
        stat: 'maxHp',
        baseValue: 20,
    },
    {
        id: 'rhune_momentum',
        name: 'Rhune of Momentum',
        description: 'Never stop moving. Never start thinking.',
        stat: 'moveSpeed',
        baseValue: 20,
    },
    {
        id: 'rhune_greed',
        name: 'Rhune of Greed',
        description: 'Loot practically leaps into your pockets.',
        stat: 'magnetRadius',
        baseValue: 60,
    },
    {
        id: 'rhune_bloodletting',
        name: 'Rhune of Bloodletting',
        description: 'Every hit you land patches you up a little.',
        stat: 'lifesteal',
        baseValue: 0.04,
    },
    {
        id: 'rhune_warding',
        name: 'Rhune of Warding',
        description: 'A smug little forcefield of denial.',
        stat: 'armor',
        baseValue: 3,
    },
    {
        id: 'rhune_fury',
        name: 'Rhune of Fury',
        description: 'Pure, uncomplicated rage. Very effective.',
        stat: 'damage',
        baseValue: 3,
    },
    {
        id: 'rhune_precision',
        name: 'Rhune of Precision',
        description: 'Occasionally you hit exactly where you meant to.',
        stat: 'critChance',
        baseValue: 0.06,
    },
];

export function getRhuneDef(id: string): RhuneDef {
    const r = RHUNES.find((x) => x.id === id);
    if (!r) throw new Error(`Unknown rhune: ${id}`);
    return r;
}
