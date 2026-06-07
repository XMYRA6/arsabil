"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import toast from "react-hot-toast";
import styles from "./Navbar.module.css";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { AuthModal } from "@/components/auth/AuthModal";
import { getNotificationIcon, getNotificationUrl } from '@/lib/notifications'

export function Navbar() {
    const { data: session, status } = useSession();
    const pathname = usePathname();
    const router = useRouter();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isInboxOpen, setIsInboxOpen] = useState(false);
    const [isNotifOpen, setIsNotifOpen] = useState(false);
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [notifFilter, setNotifFilter] = useState<'ALL' | 'MESAJ_VAR' | 'TEKLIF_GELDI' | 'ILAN_ONAYLANDI'>('ALL')
    const [notifications, setNotifications] = useState<Array<{
        id: string
        type: string
        title: string
        body: string
        read: boolean
        entityId: string | null
        createdAt: string
    }>>([])
    const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)

    const fetchNotifications = useCallback(async () => {
        if (!session?.user) return
        try {
            const res = await fetch('/api/notifications')
            if (res.ok) {
                const data = await res.json()
                setNotifications(data.notifications ?? [])
            }
        } catch { /* sessizce geç */ }
    }, [session?.user])

    useEffect(() => {
        if (!session?.user) return
        fetchNotifications()
        pollingRef.current = setInterval(fetchNotifications, 30_000)
        return () => { if (pollingRef.current) clearInterval(pollingRef.current) }
    }, [session?.user, fetchNotifications])

    const unreadCount = notifications.filter(n => !n.read).length

    const markAllRead = async () => {
        await fetch('/api/notifications', { method: 'PATCH' })
        setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    }

    const markOneRead = async (id: string) => {
        await fetch(`/api/notifications/${id}/read`, { method: 'PATCH' })
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
    }

    const filteredNotifs = notifFilter === 'ALL'
        ? notifications
        : notifications.filter(n => n.type === notifFilter)

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
                                    width: 380, maxHeight: 440,
                                    background: 'var(--panel)', border: '1px solid var(--border)',
                                    borderRadius: 16, boxShadow: '0 20px 60px rgba(0,0,0,.25)',
                                    zIndex: 100, overflow: 'hidden', display: 'flex', flexDirection: 'column',
                                }}>
                                    {/* Header */}
                                    <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                                        <span style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--card-title)' }}>Bildirimler</span>
                                        <button onClick={markAllRead} style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Tümünü Okundu İşaretle</button>
                                    </div>
                                    {/* Body: sol filtre + sağ liste */}
                                    <div style={{ display: 'flex', flex: 1, overflow: 'hidden', minHeight: 0 }}>
                                        {/* Sol filtre */}
                                        <div style={{ width: 110, borderRight: '1px solid var(--border)', padding: '8px 0', display: 'flex', flexDirection: 'column', gap: 2, flexShrink: 0 }}>
                                            {([
                                                { key: 'ALL', label: 'Tümü' },
                                                { key: 'MESAJ_VAR', label: '💬 Mesajlar' },
                                                { key: 'TEKLIF_GELDI', label: '🏷️ Teklifler' },
                                                { key: 'ILAN_ONAYLANDI', label: '✅ Sistem' },
                                            ] as const).map(f => (
                                                <button key={f.key} onClick={() => setNotifFilter(f.key)} style={{
                                                    background: notifFilter === f.key ? 'rgba(59,130,246,.1)' : 'none',
                                                    border: 'none', color: notifFilter === f.key ? 'var(--primary)' : 'var(--muted)',
                                                    fontWeight: notifFilter === f.key ? 700 : 500,
                                                    fontSize: '0.7rem', padding: '6px 10px', cursor: 'pointer',
                                                    textAlign: 'left', fontFamily: 'inherit', borderRadius: 6,
                                                    margin: '0 4px',
                                                }}>
                                                    {f.label}
                                                    {f.key !== 'ALL' && notifications.filter(n => n.type === f.key && !n.read).length > 0 && (
                                                        <span style={{ marginLeft: 4, background: 'var(--primary)', color: 'white', borderRadius: 8, padding: '1px 5px', fontSize: '0.55rem' }}>
                                                            {notifications.filter(n => n.type === f.key && !n.read).length}
                                                        </span>
                                                    )}
                                                </button>
                                            ))}
                                        </div>
                                        {/* Sağ liste */}
                                        <div style={{ flex: 1, overflowY: 'auto', maxHeight: 380 }}>
                                            {filteredNotifs.length === 0 && (
                                                <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--muted)', fontSize: '0.8rem' }}>
                                                    Bildirim yok
                                                </div>
                                            )}
                                            {filteredNotifs.map(n => (
                                                <div key={n.id}
                                                    onClick={() => {
                                                        markOneRead(n.id)
                                                        const url = getNotificationUrl(n.type, n.entityId ?? '')
                                                        if (url) { router.push(url); setIsNotifOpen(false) }
                                                    }}
                                                    style={{
                                                        padding: '10px 12px', display: 'flex', gap: 10, alignItems: 'flex-start',
                                                        cursor: 'pointer', background: n.read ? 'transparent' : 'rgba(59,130,246,.06)',
                                                        borderBottom: '1px solid var(--border)', transition: 'background 0.15s',
                                                    }}
                                                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(59,130,246,.1)')}
                                                    onMouseLeave={e => (e.currentTarget.style.background = n.read ? 'transparent' : 'rgba(59,130,246,.06)')}
                                                >
                                                    <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(59,130,246,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', flexShrink: 0 }}>
                                                        {getNotificationIcon(n.type)}
                                                    </div>
                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                        <div style={{ fontSize: '0.77rem', fontWeight: n.read ? 500 : 700, color: 'var(--card-title)', lineHeight: 1.4 }}>{n.title}</div>
                                                        <div style={{ fontSize: '0.7rem', color: 'var(--muted)', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{n.body}</div>
                                                    </div>
                                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                                                        <span style={{ fontSize: '0.6rem', color: 'var(--muted)' }}>
                                                            {new Date(n.createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                        {!n.read && <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--primary)' }} />}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
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
                                            { name: 'ArsaBil Destek', msg: 'Hoş geldiniz! Yardıma hazırız.', time: '1h', unread: false, initials: 'AB', color: '#1f6feb' },
                                        ].map((conv, i) => (
                                            <div key={i} onClick={() => { setIsInboxOpen(false); router.push('/inbox'); }} style={{
                                                padding: '12px 16px', display: 'flex', gap: '12px', alignItems: 'center',
                                                cursor: 'pointer', transition: 'background 0.15s',
                                                background: conv.unread ? 'rgba(31,111,235,.06)' : 'transparent',
                                                borderBottom: '1px solid var(--border)',
                                            }} onMouseEnter={e => (e.currentTarget.style.background = 'rgba(31,111,235,.08)')}
                                                onMouseLeave={e => (e.currentTarget.style.background = conv.unread ? 'rgba(31,111,235,.06)' : 'transparent')}>
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
                                {session?.user?.image
                                    ? <img src={session.user.image} className={styles.navAvatarImg} alt="Profil" />
                                    : getInitials()
                                }
                            </button>

                            {/* User Profile Dropdown */}
                            {isUserMenuOpen && (
                                <>
                                    <div style={{ position: 'fixed', inset: 0, zIndex: 99 }} onClick={() => setIsUserMenuOpen(false)} />
                                    <div className={styles.userDropdown}>
                                        <div className={styles.dropdownHeader}>
                                            <div className={styles.userInitialsLarge}>
                                            {session?.user?.image
                                                ? <img src={session.user.image} className={styles.navAvatarImgLarge} alt="Profil" />
                                                : getInitials()
                                            }
                                        </div>
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
                        <Link href="/" onClick={() => setIsMenuOpen(false)} className={pathname === "/" ? styles.activeLink : ""}>Anasayfa</Link>
                        <Link href="/hesapla" onClick={() => setIsMenuOpen(false)} className={pathname === "/hesapla" ? styles.activeLink : ""}>Hesapla</Link>
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
