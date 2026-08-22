import { useEffect, useState } from 'react';
import Modal from './Modal.tsx';
import { store, useStore } from '../../state/store.ts';
import { saveGame } from '../../game/systems/save.ts';
import { claimBounty, refreshBounties } from '../../game/systems/quests.ts';
import type { BountyInstance } from '../../game/data/types.ts';

type Tab = 'daily' | 'weekly';

function BountyRow({ bounty }: { bounty: BountyInstance }) {
    const ready = bounty.progress >= bounty.target && !bounty.claimed;
    const pct = Math.min(100, Math.round((bounty.progress / Math.max(1, bounty.target)) * 100));
    return (
        <div className={`rounded-xl border p-3 ${bounty.claimed ? 'border-white/5 bg-white/[0.02] opacity-50' : 'border-white/10 bg-white/5'}`}>
            <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-bold text-white">{bounty.label}</span>
                <span className="whitespace-nowrap text-xs font-bold text-primary">{bounty.reward}◆</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                <div className={`h-full rounded-full ${ready ? 'bg-primary' : 'bg-white/30'}`} style={{ width: `${pct}%` }} />
            </div>
            <div className="mt-1 flex items-center justify-between">
                <span className="text-[11px] text-white/40">
                    {Math.min(bounty.progress, bounty.target)}/{bounty.target}
                </span>
                {bounty.claimed ? (
                    <span className="text-[11px] font-bold uppercase text-white/30">Claimed</span>
                ) : (
                    <button
                        type="button"
                        disabled={!ready}
                        className={`rounded-lg px-3 py-1 text-xs font-bold active:scale-95 ${ready ? 'bg-primary text-black' : 'cursor-not-allowed bg-white/10 text-white/30'}`}
                        onClick={() => {
                            const save = store.get().save;
                            const next = claimBounty(save, bounty.instanceId);
                            store.patch({ save: next });
                            void saveGame(next);
                            store.pushToast(`Claimed ${bounty.reward}◆ Scrap!`);
                        }}
                    >
                        Claim
                    </button>
                )}
            </div>
        </div>
    );
}

export default function QuestBoardPanel() {
    const [tab, setTab] = useState<Tab>('daily');
    const save = useStore((s) => s.save);

    // Catch a day/week rollover mid-session — idempotent, so this is safe to run every open.
    useEffect(() => {
        const refreshed = refreshBounties(store.get().save);
        if (refreshed !== store.get().save) {
            store.patch({ save: refreshed });
            void saveGame(refreshed);
        }
    }, []);

    const bounties = tab === 'daily' ? save.dailyBounties : save.weeklyBounties;

    return (
        <Modal title="Quest Board" subtitle="Daily and weekly Bounties, paid in Scrap.">
            <div className="mb-3 flex gap-2">
                <button
                    type="button"
                    className={`flex-1 rounded-lg py-2 text-sm font-bold ${tab === 'daily' ? 'bg-primary text-black' : 'bg-white/10 text-white'}`}
                    onClick={() => setTab('daily')}
                >
                    Daily
                </button>
                <button
                    type="button"
                    className={`flex-1 rounded-lg py-2 text-sm font-bold ${tab === 'weekly' ? 'bg-primary text-black' : 'bg-white/10 text-white'}`}
                    onClick={() => setTab('weekly')}
                >
                    Weekly
                </button>
            </div>
            <div className="space-y-2">
                {bounties.length === 0 && <p className="py-8 text-center text-sm text-white/40">No bounties posted right now.</p>}
                {bounties.map((bounty) => (
                    <BountyRow key={bounty.instanceId} bounty={bounty} />
                ))}
            </div>
        </Modal>
    );
}
