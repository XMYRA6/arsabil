import React from 'react';
import { PanelShell } from '@/components/panel/PanelShell';

export default function PanelRouteLayout({ children }: { children: React.ReactNode }) {
    return <PanelShell>{children}</PanelShell>;
}
