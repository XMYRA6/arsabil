"use client";

import { useState } from "react";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import toast from "react-hot-toast";
import styles from "./Navbar.module.css";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { AuthModal } from "@/components/auth/AuthModal";

export function Navbar() {
    const { data: session, status } = useSession();
    const pathname = usePathname();
    const router = useRouter();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isInboxOpen, setIsInboxOpen] = useState(false);
    const [isNotifOpen, setIsNotifOpen] = useState(false);
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
    const [readNotifs, setReadNotifs] = useState<number[]>([]);
    const [showAuthModal, setShowAuthModal] = useState(false);

    const NOTIFS = [
        { id: 1, icon: '📄', text: 'Raporunuz başarıyla kaydedildi', sub: 'Hesaplama · ArsaBil', time: '2dk' },
        { id: 2, icon: '💬', text: 'Ahmet Yılmaz size mesaj gönderdi', sub: 'DM Kutusu', time: '15dk' },
        { id: 3, icon: '🏪', text: 'İlanınıza yeni bir teklif geldi', sub: 'Pazar Yeri · %33 Arsa Payı', time: '1s' },
        { id: 4, icon: '📊', text: 'Proje analiziniz tamamlandı', sub: 'Finansal Modelleme', time: '3s' },
        { id: 5, icon: '🔔', text: 'ArsaBil güncellemesi hazır', sub: 'Sistem Bildirimi', time: '1g' },
    ];
    const unreadCount = NOTIFS.filter(n => !readNotifs.includes(n.id)).length;

    // Compute Initials for Avatar (EA etc.)
    const getInitials = () => {
        if (!session?.user?.name) return "US";
        const parts = session.user.name.trim().split(" ");
        if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
        return parts[0].substring(0, 2).toUpperCase();
    };

    const handleLogout = () => {
        signOut();
        setIsMenuOpen(false);
    };

    const isHome = pathname === "/";
    const isInbox = pathname.startsWith("/inbox");
    const isProfile = pathname.startsWith("/dashboard/profile");
    
    // Pages where the top navbar should be HIDDEN on mobile
    const isHiddenOnMobile = isInbox || isProfile;
    // Pages where the top navbar should be COMPACT on mobile
    const isCompactOnMobile = pathname === "/hesapla";

    return (
        <div className={`
            ${styles.navbarContainer} 
            ${isHiddenOnMobile ? styles.mobileHidden : ""} 
            ${isCompactOnMobile ? styles.mobileCompact : ""}
        `}>
            <nav className={styles.navbar}>

                {/* --- HEADER LEFT: Logo & Main Navigation --- */}
                <div className={styles.navLeft}>
                    <Link href="/" className={styles.logoIcon} onClick={() => setIsMenuOpen(false)}>
                        <svg width="32" height="32" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <rect width="40" height="40" rx="12" fill="url(#paint0_linear)" />
                            <circle cx="20" cy="20" r="8" fill="rgba(0,0,0,0.3)" />
                            <defs>
                                <linearGradient id="paint0_linear" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
                                    <stop stopColor="#3b82f6" />
                                    <stop offset="1" stopColor="#f59e0b" />
                                </linearGradient>
                            </defs>
                        </svg>
                        <div className={`${styles.logoText} ${isCompactOnMobile ? styles.hideMobile : ""}`}>ArsaBil</div>
                    </Link>

                    {/* Navigation Links next to Logo for Desktop */}
                    <div className={styles.desktopLinks}>
                        <Link href="/" className={pathname === "/" ? styles.activeLink : ""}>
                            Anasayfa
                        </Link>
                        <Link href="/hesapla" className={pathname === "/hesapla" ? styles.activeLink : ""}>
                            Hesapla
                        </Link>
                        <Link href="/marketplace" className={pathname.startsWith("/marketplace") || pathname.startsWith("/listing") ? styles.activeLink : ""}>
                            Pazar Yeri
                        </Link>
                    </div>

                    <button
                        className={styles.hamburger}
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        aria-label="Toggle menu"
                    >
                        <span style={{ transform: isMenuOpen ? 'rotate(45deg) translate(5px, 5px)' : 'none' }}></span>
                        <span style={{ opacity: isMenuOpen ? 0 : 1 }}></span>
                        <span style={{ transform: isMenuOpen ? 'rotate(-45deg) translate(7px, -6px)' : 'none' }}></span>
                    </button>
                </div>

                {/* --- HEADER CENTER: Slogan --- */}
                <div className={`${styles.centerNav} ${isCompactOnMobile ? styles.hideMobile : ""}`}>
                    Arsa Payı ve Kat Karşılığı Fizibilite Ekosistemi
                </div>

                {/* --- HEADER RIGHT: Uniform Action Buttons --- */}
                <div className={styles.navRight}>
                    <ThemeToggle />
                    {/* Notification Bell */}
                    <div style={{ position: 'relative' }}>
                        <button className={styles.iconBtn} aria-label="Bildirimler" onClick={() => {
                            if (!session) {
                                setShowAuthModal(true);
                                return;
                            }
                            setIsNotifOpen(!isNotifOpen);
                            setIsInboxOpen(false);
                        }} style={{ position: 'relative' }}>
                            <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                            </svg>
                            {(session && unreadCount > 0) && (
                                <span style={{
                                    position: 'absolute', top: 4, right: 4,
                                    minWidth: 16, height: 16, borderRadius: 8, padding: '0 4px',
                                    background: 'var(--red)', border: '2px solid var(--panel)',
                                    color: 'white', fontSize: '0.6rem', fontWeight: 900,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}>{unreadCount}</span>
                            )}
                        </button>

                        {/* Notification Dropdown */}
                        {isNotifOpen && (
                            <>
                                <div style={{ position: 'fixed', inset: 0, zIndex: 99 }} onClick={() => setIsNotifOpen(false)} />
                                <div style={{
                                    position: 'absolute', top: 'calc(100% + 10px)', right: 0,
                                    width: 320, maxHeight: 420,
                                    background: 'var(--panel)', border: '1px solid var(--border)',
                                    borderRadius: 16, boxShadow: '0 20px 60px rgba(0,0,0,.25)',
                                    zIndex: 100, overflow: 'hidden', animation: 'fadeSlideIn 0.2s ease',
                                }}>
                                    {/* Header */}
                                    <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--card-title)' }}>Bildirimler</span>
                                        <button onClick={() => setReadNotifs(NOTIFS.map(n => n.id))} style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Tümünü Okundu İşaretle</button>
                                    </div>
                                    {/* List */}
                                    <div style={{ overflowY: 'auto', maxHeight: 350 }}>
                                        {NOTIFS.map(n => {
                                            const isRead = readNotifs.includes(n.id);
                                            return (
                                                <div key={n.id} onClick={() => setReadNotifs(prev => [...prev, n.id])} style={{
                                                    padding: '12px 16px', display: 'flex', gap: 12, alignItems: 'flex-start',
                                                    cursor: 'pointer', transition: 'background 0.15s',
                                                    background: isRead ? 'transparent' : 'rgba(var(--primary-rgb),.06)',
                                                    borderBottom: '1px solid var(--border)',
                                                }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(var(--primary-rgb),.08)'}
                                                    onMouseLeave={e => e.currentTarget.style.background = isRead ? 'transparent' : 'rgba(var(--primary-rgb),.06)'}>
                                                    {/* Icon */}
                                                    <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'rgba(var(--primary-rgb),.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', flexShrink: 0 }}>{n.icon}</div>
                                                    {/* Content */}
                                                    <div style={{ flex: 1 }}>
                                                        <div style={{ fontSize: '0.8rem', fontWeight: isRead ? 500 : 700, color: 'var(--card-title)', lineHeight: 1.4, marginBottom: 2 }}>{n.text}</div>
                                                        <div style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>{n.sub}</div>
                                                    </div>
                                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                                                        <span style={{ fontSize: '0.62rem', color: 'var(--muted)' }}>{n.time}</span>
                                                        {!isRead && <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--primary)' }} />}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                    {/* DM Inbox */}
                    <div style={{ position: 'relative' }}>
                        <button className={styles.iconBtn} aria-label="Mesajlar" onClick={() => {
                            if (!session) {
                                setShowAuthModal(true);
                                return;
                            }
                            setIsInboxOpen(!isInboxOpen);
                        }}>
                            <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                            {/* Unread badge */}
                            {session && (
                                <span style={{
                                    position: 'absolute', top: 6, right: 6,
                                    width: 8, height: 8, borderRadius: '50%',
                                    background: 'var(--red)', border: '2px solid var(--panel)',
                                }} />
                            )}
                        </button>

                        {/* Inbox Dropdown */}
                        {isInboxOpen && (
                            <>
                                <div style={{ position: 'fixed', inset: 0, zIndex: 99 }} onClick={() => setIsInboxOpen(false)} />
                                <div style={{
                                    position: 'absolute', top: 'calc(100% + 10px)', right: 0,
                                    width: 340, maxHeight: 420,
                                    background: 'var(--panel)', border: '1px solid var(--border)',
                                    borderRadius: 16, boxShadow: '0 20px 60px rgba(0,0,0,.25)',
                                    zIndex: 100, overflow: 'hidden',
                                    animation: 'fadeSlideIn 0.2s ease',
                                }}>
                                    {/* Header */}
                                    <div style={{
                                        padding: '14px 16px', borderBottom: '1px solid var(--border)',
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    }}>
                                        <span style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--card-title)' }}>Mesajlar</span>
                                        <button onClick={() => router.push('/inbox')} style={{
                                            background: 'none', border: 'none', color: 'var(--primary)',
                                            fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                                        }}>Tümünü Gör →</button>
                                    </div>

                                    {/* Conversations */}
                                    <div style={{ overflowY: 'auto', maxHeight: 350 }}>
                                        {[
                                            { name: 'Ahmet Yılmaz', msg: 'Arsa için teklifinizi değerlendir...', time: '2dk', unread: true, initials: 'AY', color: '#3b82f6' },
                                            { name: 'Elif Demir', msg: 'Teşekkürler, raporu inceledim 👍', time: '15dk', unread: true, initials: 'ED', color: '#10b981' },
                                            { name: 'Mehmet Kaya', msg: 'Proje detaylarını gönderebilir mi...', time: '1s', unread: false, initials: 'MK', color: '#f59e0b' },
                                            { name: 'Fatma Çelik', msg: 'İyi akşamlar, fiyat konusunda...', time: '3s', unread: false, initials: 'FÇ', color: '#8b5cf6' },
                                            { name: 'ArsaBil Destek', msg: 'Hoş geldiniz! Yardıma hazırız.', time: '1h', unread: false, initials: 'AB', color: '#6d5bf6' },
                                        ].map((conv, i) => (
                                            <div key={i} onClick={() => { setIsInboxOpen(false); router.push('/inbox'); }} style={{
                                                padding: '12px 16px', display: 'flex', gap: '12px', alignItems: 'center',
                                                cursor: 'pointer', transition: 'background 0.15s',
                                                background: conv.unread ? 'rgba(var(--primary-rgb),.06)' : 'transparent',
                                                borderBottom: '1px solid var(--border)',
                                            }} onMouseEnter={e => (e.currentTarget.style.background = 'rgba(var(--primary-rgb),.08)')}
                                                onMouseLeave={e => (e.currentTarget.style.background = conv.unread ? 'rgba(var(--primary-rgb),.06)' : 'transparent')}>
                                                {/* Avatar */}
                                                <div style={{
                                                    width: 42, height: 42, borderRadius: '50%',
                                                    background: `linear-gradient(135deg, ${conv.color}, ${conv.color}dd)`,
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    color: 'white', fontWeight: 800, fontSize: '0.75rem', flexShrink: 0,
                                                }}>{conv.initials}</div>
                                                {/* Content */}
                                                <div style={{ flex: 1, overflow: 'hidden' }}>
                                                    <div style={{
                                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                                        marginBottom: 2,
                                                    }}>
                                                        <span style={{
                                                            fontSize: '0.82rem', fontWeight: conv.unread ? 800 : 600,
                                                            color: 'var(--card-title)',
                                                        }}>{conv.name}</span>
                                                        <span style={{ fontSize: '0.65rem', color: 'var(--muted)', flexShrink: 0 }}>{conv.time}</span>
                                                    </div>
                                                    <div style={{
                                                        fontSize: '0.75rem', color: conv.unread ? 'var(--text)' : 'var(--muted)',
                                                        fontWeight: conv.unread ? 600 : 400,
                                                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                                    }}>{conv.msg}</div>
                                                </div>
                                                {/* Unread dot */}
                                                {conv.unread && (
                                                    <div style={{
                                                        width: 8, height: 8, borderRadius: '50%',
                                                        background: 'var(--primary)', flexShrink: 0,
                                                    }} />
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>

                    {status === "loading" ? (
                        <span style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.8rem", marginLeft: "1rem" }}>...</span>
                    ) : session ? (
                        <div style={{ position: 'relative' }}>
                            <button className={styles.userBtn} onClick={() => {
                                setIsUserMenuOpen(!isUserMenuOpen);
                                setIsInboxOpen(false);
                                setIsNotifOpen(false);
                            }}>
                                {getInitials()}
                            </button>

                            {/* User Profile Dropdown */}
                            {isUserMenuOpen && (
                                <>
                                    <div style={{ position: 'fixed', inset: 0, zIndex: 99 }} onClick={() => setIsUserMenuOpen(false)} />
                                    <div className={styles.userDropdown}>
                                        <div className={styles.dropdownHeader}>
                                            <div className={styles.userInitialsLarge}>{getInitials()}</div>
                                            <div className={styles.userInfo}>
                                                <div className={styles.userName}>{session.user?.name || 'Kullanıcı'}</div>
                                                <div className={styles.userEmail}>{session.user?.email || ''}</div>
                                            </div>
                                        </div>
                                        <div className={styles.dropdownDivider} />
                                        <div className={styles.dropdownList}>
                                            <Link href="/dashboard" onClick={() => setIsUserMenuOpen(false)} className={styles.dropdownItem}>
                                                <span>📊</span> Kontrol Paneli
                                            </Link>
                                            <Link href="/dashboard?tab=reports" onClick={() => setIsUserMenuOpen(false)} className={styles.dropdownItem}>
                                                <span>📄</span> Raporlarım
                                            </Link>
                                            <Link href="/dashboard?tab=listings" onClick={() => setIsUserMenuOpen(false)} className={styles.dropdownItem}>
                                                <span>🏠</span> İlanlarım
                                            </Link>
                                            <Link href="/inbox" onClick={() => setIsUserMenuOpen(false)} className={styles.dropdownItem}>
                                                <span>💬</span> Mesajlarım
                                            </Link>
                                            {session.user?.role === "ADMIN" && (
                                                <Link href="/admin" onClick={() => setIsUserMenuOpen(false)} className={styles.dropdownItem}>
                                                    <span>⚙️</span> Admin Paneli
                                                </Link>
                                            )}
                                            <div className={styles.dropdownDivider} />
                                            <button onClick={handleLogout} className={`${styles.dropdownItem} ${styles.logoutBtn}`}>
                                                <span>🚪</span> Çıkış Yap
                                            </button>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    ) : (
                        <button className={styles.primaryBtn} onClick={() => router.push('/login')}>
                            Giriş
                        </button>
                    )}
                </div>

                {/* --- MOBILE ACCORDION MENU --- */}
                {isMenuOpen && (
                    <div className={styles.mobileMenu}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 0 10px' }}>
                            <span style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--muted)', opacity: 0.7 }}>🎨 Tema</span>
                            <ThemeToggle />
                        </div>
                        <div style={{ borderTop: '1px solid var(--topbar-border)', marginBottom: 4 }} />
                        <Link href="/" onClick={() => setIsMenuOpen(false)} className={pathname === "/" ? styles.activeLink : ""}>Hesap Makinesi</Link>
                        <Link href="/marketplace" onClick={() => setIsMenuOpen(false)} className={pathname.startsWith("/marketplace") || pathname.startsWith("/listing") ? styles.activeLink : ""}>Pazar Yeri</Link>

                        {session ? (
                            <>
                                <Link href="/dashboard" onClick={() => setIsMenuOpen(false)}>Kontrol Paneli (Dashboard)</Link>
                                {session.user?.role === "ADMIN" && (
                                    <Link href="/admin" onClick={() => setIsMenuOpen(false)} className={styles.dangerText}>⚙️ Admin Paneli</Link>
                                )}
                                <button onClick={handleLogout} className={styles.dangerText}>X Çıkış Yap</button>
                            </>
                        ) : (
                            <>
                                <Link href="/login" onClick={() => setIsMenuOpen(false)}>Giriş Yap</Link>
                                <Link href="/register" onClick={() => setIsMenuOpen(false)} style={{ color: 'var(--primary-color)' }}>Hesap Oluştur</Link>
                            </>
                        )}
                    </div>
                )}

                {/* --- CENTERED AUTH MODAL --- */}
                <AuthModal
                    isOpen={showAuthModal}
                    onClose={() => setShowAuthModal(false)}
                    message="Bildirimlerinizi ve mesajlarınızı görüntüleyebilmek için lütfen ArsaBil hesabınıza giriş yapın."
                />

            </nav>
        </div>
    );
}
