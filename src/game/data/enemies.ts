import type { EnemyDef } from './types.ts';

/** "Nonsense monsters" — simple archetypes drawn with Pixi Graphics, no art assets needed. */
export const ENEMIES: EnemyDef[] = [
    { id: 'gribbling', name: 'Gribbling', hp: 6, damage: 4, speed: 90, radius: 14, color: 0xef4444 },
    { id: 'wobbler', name: 'Wobbler', hp: 14, damage: 6, speed: 55, radius: 20, color: 0xf97316 },
    { id: 'snarlpup', name: 'Snarlpup', hp: 4, damage: 3, speed: 140, radius: 11, color: 0xeab308 },
    { id: 'chomper', name: 'Chomper', hp: 28, damage: 9, speed: 40, radius: 26, color: 0x8b5cf6 },
];

export function pickEnemy(): EnemyDef {
    return ENEMIES[Math.floor(Math.random() * ENEMIES.length)];
}

/** One big, slow, dangerous thing instead of a wave — every 10th floor. */
export const BOSSES: EnemyDef[] = [
    { id: 'boss_maw', name: 'The Maw', hp: 220, damage: 16, speed: 60, radius: 46, color: 0xdc2626 },
    { id: 'boss_colossus', name: 'The Colossus', hp: 320, damage: 20, speed: 40, radius: 54, color: 0x7c3aed },
    { id: 'boss_swarmqueen', name: 'The Swarm Queen', hp: 180, damage: 12, speed: 85, radius: 38, color: 0x16a34a },
];

export function pickBoss(): EnemyDef {
    return BOSSES[Math.floor(Math.random() * BOSSES.length)];
}
