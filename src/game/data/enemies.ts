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
