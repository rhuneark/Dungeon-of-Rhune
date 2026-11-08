import { getBase } from '../../content/items/bases.ts';
import { getRhune, rhuneIdFromBase } from '../../content/items/rhunes.ts';
import type { ItemInstance } from '../../content/items/types.ts';
import { describeMod } from '../../content/stats.ts';
import { session } from '../../state/session.ts';
import { quirkText, viewItem } from '../../systems/itemText.ts';
import type { TipContext } from './tooltip.ts';

const BLUE = '#7896ff';
const RED = '#d9534f';

/** D2-style item tooltip: centred lines, blue for magic properties, red for unmet requirements. */
export function ItemTooltip({ item, ctx, price, extra }: { item: ItemInstance; ctx: TipContext; price?: number; extra?: string[] }) {
    const v = viewItem(item);
    const base = v.base;
    const hero = session.hasHero ? session.hero : null;
    const sheet = hero ? session.sheet() : null;
    const lines: { text: string; color?: string; small?: boolean }[] = [];
    const unid = !item.identified;

    if (v.damage) {
        const hand = base.twoHanded ? 'Two-Hand' : 'One-Hand';
        lines.push({ text: `${hand} Damage: ${v.damage[0]} to ${v.damage[1]}`, color: v.damageModified && !unid ? BLUE : undefined });
        if (v.speed) lines.push({ text: `Attacks per Second: ${v.speed.toFixed(2)}`, color: '#cfc6b0' });
    }
    if (v.armor !== undefined) lines.push({ text: `Defense: ${unid && v.armorModified ? item.baseRoll[0] : v.armor}`, color: v.armorModified && !unid ? BLUE : undefined });
    if (v.block) lines.push({ text: `Chance to Block: ${v.block}%` });
    const req = (label: string, need: number, have: number) => need > 0 && lines.push({ text: `Required ${label}: ${need}`, color: have < need ? RED : undefined });
    if (hero && sheet) {
        req('Level', v.reqLevel, hero.level);
        req('Might', v.reqMight, sheet.attrs.might);
        req('Finesse', v.reqFinesse, sheet.attrs.finesse);
        req('Spirit', v.reqSpirit, sheet.attrs.spirit);
    }
    if (base.category !== 'consumable' && base.category !== 'quest') lines.push({ text: `Item Level: ${item.ilvl}`, color: '#7d7462', small: true });

    if (base.category === 'rhune') {
        const r = getRhune(rhuneIdFromBase(item.baseId)!);
        if (r) {
            lines.push({ text: 'Can be inserted into socketed items', color: '#cfc6b0' });
            lines.push({ text: `Weapons: ${r.effects.weapon.map(describeMod).join(', ')}`, color: BLUE });
            lines.push({ text: `Armor: ${r.effects.armor.map(describeMod).join(', ')}`, color: BLUE });
            lines.push({ text: `Shields: ${r.effects.shield.map(describeMod).join(', ')}`, color: BLUE });
        }
    } else if (!unid) {
        for (const m of v.localMods) lines.push({ text: describeMod(m), color: BLUE });
        for (const m of v.heroMods) lines.push({ text: describeMod(m), color: BLUE });
        for (const q of v.quirks) lines.push({ text: quirkText(q), color: '#8fd18f' });
    }
    if (item.sockets > 0) lines.push({ text: `Socketed (${item.sockets})`, color: BLUE });
    if (item.quality === 'rhuneword' && !unid) {
        const ids = item.socketed.map((s) => getBase(s.baseId).name.replace(' Rhune', '')).join(' + ');
        lines.push({ text: `'${ids}'`, color: '#c9a46b' });
    }

    const codexKey = item.quality === 'unique' && item.uniqueId ? `u:${item.uniqueId}` : null;
    const isNew = codexKey && !unid && !session.save.codex[codexKey];

    return (
        <div className="frame max-w-[280px] px-[8px] py-[5px] text-center" style={{ background: 'rgba(10,8,6,0.94)' }}>
            <div className="t10" style={{ color: v.color }}>
                {v.name}
            </div>
            {v.subName && (
                <div className="t10" style={{ color: v.color }}>
                    {v.subName}
                </div>
            )}
            {unid && (
                <div className="t10" style={{ color: RED }}>
                    Unidentified
                </div>
            )}
            {lines.map((l, i) => (
                <div key={i} className={l.small ? 's8 my-[1px]' : 't10'} style={{ color: l.color ?? '#e8dcc0' }}>
                    {l.text}
                </div>
            ))}
            {v.flavor && !unid && <div className="t10 mt-[3px] text-[#a89a7c]">{v.flavor}</div>}
            {isNew && <div className="t10 mt-[2px] text-gold">New to your Codex!</div>}
            {extra?.map((e, i) => (
                <div key={`x${i}`} className="t10 text-dim">
                    {e}
                </div>
            ))}
            {price !== undefined && (
                <div className="t10 mt-[3px] text-gold">
                    {ctx === 'sell' ? `Sell value: ${price} gold` : `Cost: ${price} gold`}
                </div>
            )}
        </div>
    );
}
