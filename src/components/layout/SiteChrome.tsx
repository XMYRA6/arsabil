"use client";

import React from 'react';
import { usePathname } from 'next/navigation';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
import { BottomNavbar } from './BottomNavbar';
import { MobileLegalLine } from './MobileLegalLine';

const KIMLIK_YOLLARI = ['/login', '/register', '/reset-password', '/verify-email'];

export function SiteChrome({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const isAdmin = pathname.startsWith('/admin');
    // Kimlik ekranları (Figma 09) kendi kabuğunu çizer: sol marka paneli + form kartı.
    const isAuth = KIMLIK_YOLLARI.some(y => pathname === y || pathname.startsWith(`${y}/`));

    if (isAdmin || isAuth) {
        return <>{children}</>;
    }

    return (
        <>
            <Navbar />
            <main style={{ minHeight: "calc(100dvh - 70px)", paddingBottom: "var(--mobile-nav-pb, 0px)" }}>
                {children}
                <MobileLegalLine />
            </main>
            <div className="desktop-footer">
                <Footer />
            </div>
            <BottomNavbar />
        </>
    );
}
