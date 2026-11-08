import { iconUrl } from '../../assets/manifest.ts';
import { getBase } from '../../content/items/bases.ts';
import { getNpc } from '../../content/npcs.ts';
import { session, useSession } from '../../state/session.ts';
import { store, useStore } from '../../state/store.ts';
import { clickGrid, gridOf, rightClickItem } from '../../systems/actions.ts';
import {
    buy,
    canPunch,
    GAMBLE_ODDS,
    gamble,
    gambleOffers,
    makeWish,
    punchSockets,
    RECIPES,
    restock,
    socketCost,
    transmute,
    vendorGrid,
    vendorPrice,
    wishCost,
} from '../../systems/economy.ts';
import { CRUCIBLE_H, CRUCIBLE_W, STASH_H, STASH_W } from '../../systems/hero.ts';
import { autoPlace } from '../../systems/inventory.ts';
import { GridView } from '../kit/GridView.tsx';
import { Panel } from '../kit/Panel.tsx';
import { tooltip } from '../kit/tooltip.ts';
import { uiPoint } from '../kit/uiPoint.ts';

const LEFT = { left: 6, top: 6, width: 340 } as const;
const close = () => store.patch({ left: null, serviceNpc: null });

export function StashPanel() {
    const s = useSession();
    return (
        <Panel title="Strongbox" onClose={close} style={LEFT}>
            <div className="t10 mb-[4px] text-center text-dim">Shared by every hero you make. Right-click to move items.</div>
            <div className="flex justify-center">
                <GridView w={STASH_W} h={STASH_H} items={s.save.stash} onClick={(cx, cy, uid) => clickGrid('stash', cx, cy, uid)} onRightClick={(uid) => rightClickItem('stash', uid)} />
            </div>
        </Panel>
    );
}

export function VendorPanel() {
    useSession();
    const npcId = useStore((s) => s.serviceNpc) ?? 'pell';
    const npc = getNpc(npcId);
    const grid = vendorGrid(npcId);
    const isHerbs = npcId === 'ysolde';
    return (
        <Panel title={npc ? `${npc.name}` : 'Trade'} onClose={close} style={LEFT}>
            <div className="t10 mb-[4px] text-center text-dim">Click to buy. Right-click your own items to sell.</div>
            <div className="flex justify-center">
                <GridView w={grid.w} h={grid.h} items={grid.items} onClick={(_cx, _cy, uid) => uid && buy(npcId, uid)} tipCtx="buy" price={vendorPrice} />
            </div>
            {!isHerbs && (
                <div className="mt-[4px] flex justify-center">
                    <button className="pbtn" onClick={() => restock(npcId)}>
                        Ask Pell for fresh stock
                    </button>
                </div>
            )}
        </Panel>
    );
}

export function GamblePanel() {
    const s = useSession();
    const offers = gambleOffers();
    return (
        <Panel title="Sealed Goods" onClose={close} style={LEFT}>
            <div className="t10 mb-[4px] text-center text-dim">
                "Pick a shape. Pay the man. Open it." Magic at worst, rare {Math.round(GAMBLE_ODDS.rare * 100)}%, unique {GAMBLE_ODDS.unique * 100}%.
            </div>
            <div className="frame-inset pe grid max-h-[300px] grid-cols-4 gap-[2px] overflow-y-auto p-[3px]">
                {offers.map((o) => {
                    const b = getBase(o.baseId);
                    const afford = s.hero.gold >= o.price;
                    return (
                        <button
                            key={o.baseId}
                            className="flex flex-col items-center bg-panel2 p-[2px] hover:bg-panel3"
                            onClick={() => gamble(o.baseId)}
                            onPointerMove={(e) => {
                                const p = uiPoint(e.clientX, e.clientY);
                                tooltip.show({ kind: 'text', title: b.name, lines: [`Cost: ${o.price} gold`, `Base level ${b.qlvl}`] }, p.x, p.y);
                            }}
                            onPointerLeave={() => tooltip.hide()}
                        >
                            <div className="flex h-[64px] items-center">
                                <img src={iconUrl(b.art[0])} width={b.w * 16} height={b.h * 16} draggable={false} alt="" />
                            </div>
                            <span className="t10 text-parch">{b.name}</span>
                            <span className={`t10 ${afford ? 'text-gold' : 'text-bad'}`}>{o.price}</span>
                        </button>
                    );
                })}
            </div>
        </Panel>
    );
}

export function SmithPanel() {
    const s = useSession();
    const hero = s.hero;
    const contents = hero.crucible;
    const recipe = RECIPES.find((r) => r.match(contents));
    const punchable = contents.length === 1 && canPunch(contents[0]) ? contents[0] : null;
    const doTransmute = () => {
        const out = transmute([...contents]);
        if (!out) return;
        hero.crucible = [];
        const grid = gridOf('crucible');
        for (const it of out) autoPlace(grid, it);
        session.commit();
    };
    return (
        <Panel title="Brannoc's Crucible" onClose={close} style={LEFT}>
            <div className="t10 mb-[4px] text-center text-dim">Put items in the crucible (right-click from your pack), then work them.</div>
            <div className="flex gap-[8px]">
                <GridView w={CRUCIBLE_W} h={CRUCIBLE_H} items={contents} onClick={(cx, cy, uid) => clickGrid('crucible', cx, cy, uid)} onRightClick={(uid) => rightClickItem('crucible', uid)} />
                <div className="flex flex-1 flex-col gap-[4px]">
                    <button className="pbtn" disabled={!recipe} onClick={doTransmute}>
                        {recipe ? `Transmute: ${recipe.name}` : 'Transmute'}
                    </button>
                    <button className="pbtn" disabled={!punchable} onClick={() => punchable && punchSockets(punchable)}>
                        {punchable ? `Punch sockets (${socketCost(punchable)}g)` : 'Punch sockets'}
                    </button>
                    <div className="s8 mt-[4px] text-dim">RECIPES</div>
                    {RECIPES.map((r) => (
                        <div key={r.id} className={`t10 ${recipe?.id === r.id ? 'text-good' : 'text-parch'}`}>
                            <span className="text-gold">{r.name}:</span> {r.text}
                        </div>
                    ))}
                    <div className="t10 text-parch">
                        <span className="text-gold">Sockets:</span> one plain (white) item with no sockets.
                    </div>
                </div>
            </div>
        </Panel>
    );
}

export function WellPanel() {
    const s = useSession();
    const cost = wishCost();
    return (
        <Panel title="The Wishing Well" onClose={close} style={LEFT}>
            <div className="t10 mb-[6px] text-center text-parch">
                Toss in a coin and the well coughs something up — gear, rhunes, potions, coin. Your Rarity and Targeted Find apply. Sometimes it is generous. Nobody has checked the bottom.
            </div>
            <div className="flex flex-col items-center gap-[4px]">
                <button className="pbtn !px-[12px] !py-[4px]" disabled={s.hero.gold < cost} onClick={makeWish}>
                    Make a wish ({cost} gold)
                </button>
                <span className="t10 text-dim">Wishes made: {s.save.stats.wishes}</span>
            </div>
        </Panel>
    );
}

