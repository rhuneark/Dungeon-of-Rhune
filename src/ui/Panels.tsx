import { useStore } from '../state/store.ts';
import InventoryPanel from './panels/InventoryPanel.tsx';
import MenuPanel from './panels/MenuPanel.tsx';
import DungeonEntryPanel from './panels/DungeonEntryPanel.tsx';
import PortalPanel from './panels/PortalPanel.tsx';
import BlacksmithPanel from './panels/BlacksmithPanel.tsx';
import MerchantPanel from './panels/MerchantPanel.tsx';
import QuestBoardPanel from './panels/QuestBoardPanel.tsx';
import BuildPanel from './panels/BuildPanel.tsx';
import DeathPanel from './panels/DeathPanel.tsx';

export default function Panels() {
    const panel = useStore((s) => s.panel);
    if (panel === 'inventory') return <InventoryPanel />;
    if (panel === 'menu') return <MenuPanel />;
    if (panel === 'tierSelect') return <DungeonEntryPanel />;
    if (panel === 'portal') return <PortalPanel />;
    if (panel === 'blacksmith') return <BlacksmithPanel />;
    if (panel === 'merchant') return <MerchantPanel />;
    if (panel === 'quests') return <QuestBoardPanel />;
    if (panel === 'build') return <BuildPanel />;
    if (panel === 'death') return <DeathPanel />;
    return null;
}
