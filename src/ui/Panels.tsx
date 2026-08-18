import { useStore } from '../state/store.ts';
import InventoryPanel from './panels/InventoryPanel.tsx';
import StatuePanel from './panels/StatuePanel.tsx';
import PortalPanel from './panels/PortalPanel.tsx';
import DeathPanel from './panels/DeathPanel.tsx';

export default function Panels() {
    const panel = useStore((s) => s.panel);
    if (panel === 'inventory') return <InventoryPanel initialTab="inventory" />;
    if (panel === 'equipment') return <InventoryPanel initialTab="equipment" />;
    if (panel === 'statue') return <StatuePanel />;
    if (panel === 'portal') return <PortalPanel />;
    if (panel === 'death') return <DeathPanel />;
    return null;
}
