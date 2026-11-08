import { getBase } from '../../content/items/bases.ts';
import type { EquipSlot } from '../../content/items/types.ts';
import { useSession } from '../../state/session.ts';
import { store, useStore } from '../../state/store.ts';
import { clickEquip, clickGrid, rightClickItem, slotFits } from '../../systems/actions.ts';
import { INV_H, INV_W } from '../../systems/hero.ts';
import { meetsReqs } from '../../systems/character.ts';
import { sellPrice } from '../../systems/itemText.ts';
import { GridView } from '../kit/GridView.tsx';
import { ItemIcon, qualityBg } from '../kit/ItemIcon.tsx';
import { Panel } from '../kit/Panel.tsx';
import { tooltip } from '../kit/tooltip.ts';
import { uiPoint } from '../kit/uiPoint.ts';

/** Paperdoll slot rects (UI px) inside a 320-wide doll. */
const SLOTS: Record<EquipSlot, { x: number; y: number; w: number; h: number; label: string }> = {
    weapon: { x: 8, y: 0, w: 64, h: 128, label: 'Weapon' },
    head: { x: 128, y: 0, w: 64, h: 64, label: 'Head' },
    neck: { x: 204, y: 16, w: 32, h: 32, label: 'Neck' },
    offhand: { x: 248, y: 0, w: 64, h: 128, label: 'Off-hand' },
    chest: { x: 128, y: 66, w: 64, h: 96, label: 'Chest' },
    hands: { x: 8, y: 132, w: 64, h: 64, label: 'Hands' },
    ring1: { x: 84, y: 132, w: 32, h: 32, label: 'Ring' },
    waist: { x: 128, y: 164, w: 64, h: 32, label: 'Waist' },
    ring2: { x: 204, y: 132, w: 32, h: 32, label: 'Ring' },
    feet: { x: 248, y: 132, w: 64, h: 64, label: 'Feet' },
};

function Paperdoll() {
    const s = useSession();
    const hero = s.hero;
    const sheet = s.sheet();
    const held = hero.cursor;
    return (
        <div className="relative mx-auto" style={{ width: 320, height: 196 }}>
            {(Object.keys(SLOTS) as EquipSlot[]).map((slot) => {
                const r = SLOTS[slot];
                const it = hero.equipped[slot];
                const fits = held ? slotFits(held, slot) : false;
                const bad = sheet.unmet.has(slot);
                const twoHandGhost = slot === 'offhand' && !it && hero.equipped.weapon && getBase(hero.equipped.weapon.baseId).twoHanded;
                return (
                    <div
                        key={slot}
                        className="frame-inset pe absolute flex items-center justify-center"
                        style={{
                            left: r.x,
                            top: r.y,
                            width: r.w,
                            height: r.h,
                            background: bad ? 'rgba(200,40,40,0.3)' : it ? qualityBg(it) : fits ? 'rgba(90,200,90,0.15)' : undefined,
                        }}
                        onPointerDown={(e) => {
                            e.stopPropagation();
                            if (e.button !== 0) return;
                            tooltip.hide();
                            clickEquip(slot);
                        }}
                        onPointerMove={(e) => {
                            const p = uiPoint(e.clientX, e.clientY);
                            if (it && !held) tooltip.show({ kind: 'item', item: it, ctx: 'none' }, p.x, p.y);
                            else tooltip.show({ kind: 'text', lines: [r.label] }, p.x, p.y);
                        }}
                        onPointerLeave={() => tooltip.hide()}
                    >
                        {it ? (
                            <div style={{ maxWidth: r.w, maxHeight: r.h }} className="pointer-events-none">
                                <ItemIcon item={it} />
                            </div>
                        ) : twoHandGhost ? (
                            <div className="pointer-events-none opacity-30">
                                <ItemIcon item={hero.equipped.weapon!} showSockets={false} />
                            </div>
                        ) : (
                            <span className="s8 pointer-events-none text-faint">{r.label}</span>
                        )}
                    </div>
                );
            })}
        </div>
    );
}

export default function InventoryPanel() {
    const s = useSession();
    const left = useStore((st) => st.left);
    const hero = s.hero;
    const sheet = s.sheet();
    const selling = left === 'vendor' || left === 'herbs' || left === 'gamble';
    return (
        <Panel title="Inventory" onClose={() => store.patch({ right: null })} style={{ right: 6, top: 6, width: 336 }}>
            <Paperdoll />
            <div className="mt-[6px] flex justify-center">
                <GridView
                    w={INV_W}
                    h={INV_H}
                    items={hero.inventory}
                    onClick={(cx, cy, uid) => clickGrid('inv', cx, cy, uid)}
                    onRightClick={(uid) => rightClickItem('inv', uid)}
                    tipCtx={selling ? 'sell' : 'none'}
                    price={selling ? sellPrice : undefined}
                    unusable={(it) => getBase(it.baseId).category === 'curio' && !meetsReqs(it, hero, sheet.attrs)}
                />
            </div>
            <div className="t10 mt-[3px] flex items-center justify-between px-[2px]">
                <span className="text-gold">{hero.gold.toLocaleString()} gold</span>
                <span className="text-dim">
                    {selling ? 'Right-click to sell' : left === 'stash' ? 'Right-click: move to stash' : 'Right-click: use / equip'}
                </span>
            </div>
        </Panel>
    );
}

