import { useStore } from '../state/store.ts';
import InventoryPanel from './panels/InventoryPanel.tsx';
import ChestPanel from './panels/ChestPanel.tsx';
import RackPanel from './panels/RackPanel.tsx';
import StatuePanel from './panels/StatuePanel.tsx';
import PortalPanel from './panels/PortalPanel.tsx';
import BlacksmithPanel from './panels/BlacksmithPanel.tsx';
import MerchantPanel from './panels/MerchantPanel.tsx';
import QuestBoardPanel from './panels/QuestBoardPanel.tsx';
import BuildPanel from './panels/BuildPanel.tsx';
import DeathPanel from './panels/DeathPanel.tsx';

export default function Panels() {
    const panel = useStore((s) => s.panel);
    if (panel === 'inventory') return <InventoryPanel />;
    if (panel === 'chest') return <ChestPanel />;
    if (panel === 'rack') return <RackPanel />;
    if (panel === 'statue') return <StatuePanel />;
    if (panel === 'portal') return <PortalPanel />;
    if (panel === 'blacksmith') return <BlacksmithPanel />;
    if (panel === 'merchant') return <MerchantPanel />;
    if (panel === 'quests') return <QuestBoardPanel />;
    if (panel === 'build') return <BuildPanel />;
    if (panel === 'death') return <DeathPanel />;
    return null;
}
