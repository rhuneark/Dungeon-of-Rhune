import { useStore } from '../state/store.ts';
import InventoryPanel from './panels/InventoryPanel.tsx';
import RackPanel from './panels/RackPanel.tsx';
import StatuePanel from './panels/StatuePanel.tsx';
import PortalPanel from './panels/PortalPanel.tsx';
import BlacksmithPanel from './panels/BlacksmithPanel.tsx';
import MerchantPanel from './panels/MerchantPanel.tsx';
import QuestBoardPanel from './panels/QuestBoardPanel.tsx';
import DeathPanel from './panels/DeathPanel.tsx';

export default function Panels() {
    const panel = useStore((s) => s.panel);
    if (panel === 'inventory') return <InventoryPanel initialTab="inventory" />;
    if (panel === 'rack') return <RackPanel />;
    if (panel === 'statue') return <StatuePanel />;
    if (panel === 'portal') return <PortalPanel />;
    if (panel === 'blacksmith') return <BlacksmithPanel />;
    if (panel === 'merchant') return <MerchantPanel />;
    if (panel === 'quests') return <QuestBoardPanel />;
    if (panel === 'death') return <DeathPanel />;
    return null;
}
