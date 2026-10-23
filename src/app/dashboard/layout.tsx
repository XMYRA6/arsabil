import React from 'react';
import { PanelShell } from '@/components/panel/PanelShell';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    return <PanelShell>{children}</PanelShell>;
}
