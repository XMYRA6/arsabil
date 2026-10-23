"use client";

import { useState } from "react";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import styles from "./Navbar.module.css";
import { NavPill } from "./NavPill";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { ArsabilLogo } from "@/components/ui/ArsabilLogo";
import { Button } from "@/components/ui/Button";

const LINKS = [
    { href: "/hesapla", label: "Hesapla" },
    { href: "/deger", label: "Değer" },
    { href: "/akif", label: "Akif" },
    { href: "/marketplace", label: "Pazar Yeri" },
    { href: "/arsa-fiyatlari", label: "Fiyatlar" },
];

/** İlan yolları Pazar Yeri sekmesini aktif sayar. */
function activeHrefFor(pathname: string): string {
    if (pathname.startsWith("/listing")) return "/marketplace";
    return pathname;
}

export function Navbar() {
    const { data: session, status } = useSession();
    const pathname = usePathname() ?? "/";
    const router = useRouter();
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

    const getInitials = () => {
        const name = session?.user?.name?.trim();
        if (!name) return "US";
        const parts = name.split(" ");
        if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
        return parts[0].substring(0, 2).toUpperCase();
    };

    const closeMenu = () => setIsUserMenuOpen(false);
    const handleLogout = () => {
        closeMenu();
        signOut();
    };

    // Mobilde logo çubuğu yalnızca misafirin ana sayfasında görünür (Figma 01:
    // logo + Giriş). Girişli kullanıcıda `/` kendi üst çubuğu olan HomeMobile'i
    // render eder; diğer ekranlar kendi başlığını taşır, her sayfada logo yok.
    const showMobileBar = pathname === "/" && status !== "authenticated";

    const right = (
        <div className={styles.right}>
            {status === "loading" ? null : session ? (
                <>
                    <div className={styles.userWrap}>
                        <button
                            type="button"
                            className={styles.avatar}
                            onClick={() => setIsUserMenuOpen((o) => !o)}
                            aria-haspopup="menu"
                            aria-expanded={isUserMenuOpen}
                            aria-label="Hesap menüsü"
                        >
                            {getInitials()}
                        </button>
                        {isUserMenuOpen && (
                            <>
                                <div className={styles.scrim} onClick={closeMenu} />
                                <div className={styles.dropdown} role="menu">
                                    <div className={styles.dropdownHead}>
                                        <div className={styles.userName}>{session.user?.name || "Kullanıcı"}</div>
                                        <div className={styles.userEmail}>{session.user?.email || ""}</div>
                                    </div>
                                    <Link href="/dashboard" onClick={closeMenu} className={styles.item} role="menuitem">Kontrol paneli</Link>
                                    <Link href="/dashboard/reports" onClick={closeMenu} className={styles.item} role="menuitem">Raporlarım</Link>
                                    <Link href="/dashboard/listings" onClick={closeMenu} className={styles.item} role="menuitem">İlanlarım</Link>
                                    <Link href="/inbox" onClick={closeMenu} className={styles.item} role="menuitem">Mesajlarım</Link>
                                    <Link href="/notifications" onClick={closeMenu} className={styles.item} role="menuitem">Bildirimler</Link>
                                    {session.user?.role === "ADMIN" && (
                                        <Link href="/admin" onClick={closeMenu} className={styles.item} role="menuitem">Yönetim paneli</Link>
                                    )}
                                    <button type="button" onClick={handleLogout} className={`${styles.item} ${styles.logout}`} role="menuitem">
                                        Çıkış yap
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </>
            ) : (
                <>
                    <Link href="/login" className={styles.loginLink}>Giriş</Link>
                    <Button variant="amber" size="s" onClick={() => router.push("/register")}>Ücretsiz dene</Button>
                </>
            )}
        </div>
    );

    return (
        <>
            <header className={styles.desktop}>
                <NavPill
                    links={LINKS}
                    activeHref={activeHrefFor(pathname)}
                    logo={<ArsabilLogo size={28} showText />}
                    right={right}
                />
                <div className={styles.themeSlot}>
                    <ThemeToggle />
                </div>
            </header>
            {showMobileBar && (
                <header className={styles.mobileBar}>
                    <Link href="/" aria-label="Ana sayfa" className={styles.mobileLogo}>
                        <ArsabilLogo size={28} showText />
                    </Link>
                    {status === "unauthenticated" && (
                        <Link href="/login" className={styles.mobileLogin}>Giriş</Link>
                    )}
                </header>
            )}
        </>
    );
}
