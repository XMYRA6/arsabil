"use client";

import React from 'react';
import { usePathname } from 'next/navigation';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
import { BottomNavbar } from './BottomNavbar';

export function SiteChrome({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const isAdmin = pathname.startsWith('/admin');

    if (isAdmin) {
        return <>{children}</>;
    }

    return (
        <>
            <Navbar />
            <main style={{ minHeight: "calc(100vh - 70px)", paddingBottom: "var(--mobile-nav-pb, 0px)" }}>
                {children}
            </main>
            <div className="desktop-footer">
                <Footer />
            </div>
            <BottomNavbar />
        </>
    );
}
