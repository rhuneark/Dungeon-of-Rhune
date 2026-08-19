import type { RhuneDef } from './types.ts';

/**
 * Rhunes are the build-scrambling layer on top of gear: a handful are plain
 * stat sticks (statMod), but most hook into combat directly — on-hit status
 * procs, trails you leave while moving, elemental damage amplifiers, on-kill
 * triggers, and passive auras. Mix a couple that clearly combo (an ice trail
 * + an ice damage amplifier turns "walk near things" into a build) and the
 * rest into wildly different directions so three sockets can go anywhere.
 */
export const RHUNES: RhuneDef[] = [
    // --- statMod: plain, reliable stat sticks ---
    {
        id: 'rhune_haste',
        name: 'Rhune of Haste',
        description: 'Your gear fires faster. Your brain does not.',
        effect: { kind: 'statMod', stat: 'fireRate', baseValue: 0.15 },
    },
    {
        id: 'rhune_bulk',
        name: 'Rhune of Bulk',
        description: 'More you to hit. More you to survive it.',
        effect: { kind: 'statMod', stat: 'maxHp', baseValue: 20 },
    },
    {
        id: 'rhune_momentum',
        name: 'Rhune of Momentum',
        description: 'Never stop moving. Never start thinking.',
        effect: { kind: 'statMod', stat: 'moveSpeed', baseValue: 20 },
    },
    {
        id: 'rhune_greed',
        name: 'Rhune of Greed',
        description: 'Loot practically leaps into your pockets.',
        effect: { kind: 'statMod', stat: 'magnetRadius', baseValue: 60 },
    },
    {
        id: 'rhune_precision',
        name: 'Rhune of Precision',
        description: 'Occasionally you hit exactly where you meant to.',
        effect: { kind: 'statMod', stat: 'critChance', baseValue: 0.06 },
    },
    {
        id: 'rhune_brutality',
        name: 'Rhune of Brutality',
        description: 'When you do hit right, it shows.',
        effect: { kind: 'statMod', stat: 'critDamage', baseValue: 0.5 },
    },
    {
        id: 'rhune_wall',
        name: 'Rhune of the Wall',
        description: 'A stubborn refusal to take the full hit.',
        effect: { kind: 'statMod', stat: 'damageReduction', baseValue: 0.08 },
    },

    // --- onHitStatus: chance on weapon hit to inflict a status ---
    {
        id: 'rhune_glacier',
        name: 'Rhune of the Glacier',
        description: 'Your hits have a chance to freeze enemies half solid, slowing them.',
        effect: { kind: 'onHitStatus', chance: 0.3, status: 'slow', magnitude: 0.4, duration: 2 },
    },
    {
        id: 'rhune_ember',
        name: 'Rhune of the Ember',
        description: 'Your hits have a chance to set enemies alight.',
        effect: { kind: 'onHitStatus', chance: 0.3, status: 'burn', magnitude: 6, duration: 3 },
    },
    {
        id: 'rhune_fang',
        name: 'Rhune of the Fang',
        description: 'Your hits have a chance to inject something unpleasant.',
        effect: { kind: 'onHitStatus', chance: 0.25, status: 'poison', magnitude: 4, duration: 4 },
    },
    {
        id: 'rhune_storm',
        name: 'Rhune of the Storm',
        description: 'Your hits have a chance to charge enemies with static — everything else you throw at them hits harder while charged.',
        effect: { kind: 'onHitStatus', chance: 0.2, status: 'shock', magnitude: 0.2, duration: 2.5 },
    },
    {
        id: 'rhune_haymaker',
        name: 'Rhune of the Haymaker',
        description: 'Your critical hits have a chance to stagger enemies senseless.',
        effect: { kind: 'onHitStatus', chance: 0.35, status: 'stun', magnitude: 1, duration: 0.6, critOnly: true },
    },

    // --- moveTrail: leave a hazard behind while moving ---
    {
        id: 'rhune_frostfall',
        name: 'Rhune of Frostfall',
        description: 'Moving leaves a trailing ice path that slows anything standing on it.',
        effect: { kind: 'moveTrail', element: 'ice', status: 'slow', magnitude: 0.35, radius: 55, hazardLifetime: 2.2, tickInterval: 0.18 },
    },
    {
        id: 'rhune_wildfire',
        name: 'Rhune of the Wildfire',
        description: 'Moving leaves a trail of burning ground behind you.',
        effect: { kind: 'moveTrail', element: 'fire', status: 'burn', magnitude: 5, radius: 50, hazardLifetime: 2.5, tickInterval: 0.2 },
    },

    // --- elementAmp: multiplies all damage of one element ---
    {
        id: 'rhune_absolute_zero',
        name: 'Rhune of Absolute Zero',
        description: 'All ice damage you deal is doubled. Pairs well with anything cold.',
        effect: { kind: 'elementAmp', element: 'ice', mult: 2 },
    },
    {
        id: 'rhune_inferno',
        name: 'Rhune of the Inferno',
        description: 'All fire damage you deal is doubled.',
        effect: { kind: 'elementAmp', element: 'fire', mult: 2 },
    },
    {
        id: 'rhune_conduction',
        name: 'Rhune of Conduction',
        description: 'All lightning damage you deal is doubled.',
        effect: { kind: 'elementAmp', element: 'lightning', mult: 2 },
    },
    {
        id: 'rhune_venom',
        name: 'Rhune of Venom',
        description: 'All poison damage you deal is doubled.',
        effect: { kind: 'elementAmp', element: 'poison', mult: 2 },
    },

    // --- onKill: triggers when an enemy dies ---
    {
        id: 'rhune_ruin',
        name: 'Rhune of Ruin',
        description: 'Killing something has a chance to make it Someone Else’s Problem, violently.',
        effect: { kind: 'onKill', chance: 0.2, result: 'explosion', magnitude: 18 },
    },
    {
        id: 'rhune_vulture',
        name: 'Rhune of the Vulture',
        description: 'Kills occasionally shake loose a little extra salvage.',
        effect: { kind: 'onKill', chance: 0.2, result: 'currency', magnitude: 3 },
    },
    {
        id: 'rhune_reap',
        name: 'Rhune of the Reap',
        description: 'Every so often, a kill patches you up a little.',
        effect: { kind: 'onKill', chance: 0.25, result: 'heal', magnitude: 8 },
    },

    // --- aura: continuous radius effect around you ---
    {
        id: 'rhune_winters_court',
        name: "Rhune of Winter's Court",
        description: 'Nearby enemies are constantly slowed just by being near you.',
        effect: { kind: 'aura', radius: 90, status: 'slow', magnitude: 0.2, tickInterval: 0.3, duration: 0.6 },
    },
    {
        id: 'rhune_plague',
        name: 'Rhune of the Plague',
        description: 'Nearby enemies steadily rot.',
        effect: { kind: 'aura', radius: 80, status: 'poison', magnitude: 3, tickInterval: 0.5, duration: 1 },
    },
    {
        id: 'rhune_stormcaller',
        name: 'Rhune of the Stormcaller',
        description: 'Nearby enemies stay charged, taking more damage from everything.',
        effect: { kind: 'aura', radius: 70, status: 'shock', magnitude: 0.15, tickInterval: 0.4, duration: 1 },
    },
];

export function getRhuneDef(id: string): RhuneDef {
    const r = RHUNES.find((x) => x.id === id);
    if (!r) throw new Error(`Unknown rhune: ${id}`);
    return r;
}
