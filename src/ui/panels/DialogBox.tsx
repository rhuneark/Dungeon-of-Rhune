import { getNpc, type Service } from '../../content/npcs.ts';
import { npcService, talkTo } from '../../game/interact.ts';
import { store, useStore } from '../../state/store.ts';

const SERVICE_LABEL: Record<Service, string> = {
    trade: 'Trade',
    herbs: 'Trade',
    gamble: 'Sealed Goods',
    smith: 'Crucible & Sockets',
    identify: 'Identify Items',
    codex: 'Codex',
    gate: 'The Wilds?',
};

/** NPC conversation box (D2's talk window): line, quest notes, services. */
export default function DialogBox() {
    const d = useStore((s) => s.dialog);
    if (!d) return null;
    const npc = d.npcId ? getNpc(d.npcId) : null;
    return (
        <div className="frame pe absolute bottom-[56px] left-1/2 w-[420px] -translate-x-1/2 p-[8px]" onPointerDown={(e) => e.stopPropagation()}>
            <div className="mb-[3px] flex items-baseline justify-between">
                <span className="title18 text-gold">{d.title}</span>
                {d.sub && <span className="s8 text-dim">{d.sub.toUpperCase()}</span>}
            </div>
            <div className="t10 text-parch">{d.line}</div>
            {d.notes.map((n, i) => (
                <div key={i} className="t10 mt-[3px] text-gold">
                    {n}
                </div>
            ))}
            <div className="mt-[6px] flex flex-wrap gap-[4px]">
                {npc?.services.map((sv) => (
                    <button key={sv} className="pbtn" onClick={() => npcService(npc.id, sv)}>
                        {SERVICE_LABEL[sv]}
                    </button>
                ))}
                {npc && (
                    <button className="pbtn" onClick={() => talkTo(npc.id)}>
                        Talk
                    </button>
                )}
                <button className="pbtn" onClick={() => store.patch({ dialog: null })}>
                    Leave
                </button>
            </div>
        </div>
    );
}
