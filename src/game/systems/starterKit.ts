import type { SaveData } from '../data/types.ts';
import { rollSpecificItem } from './itemGen.ts';

/** A brand-new save has no gear — without it hand1/hand2 are empty and nothing auto-fires. */
export function ensureStarterKit(save: SaveData): SaveData {
    if (save.items.length > 0) return save;

    const hammer = rollSpecificItem('hammer', 1, 'common');
    const boots = rollSpecificItem('boots', 1, 'common');

    return {
        ...save,
        items: [hammer, boots],
        equipped: { ...save.equipped, hand1: hammer.instanceId, feet: boots.instanceId },
    };
}
