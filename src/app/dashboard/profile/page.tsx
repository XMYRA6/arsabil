"use client";

import { useEffect, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import dashStyles from '../dashboard.module.css';
import appStyles from '@/app/page.module.css';

type Mode = 'dark' | 'light' | 'sky' | 'mint' | 'sand';

const PALETTES: { id: Mode; label: string; color: string; isLight: boolean; icon: string }[] = [
    { id: 'dark', label: 'Gece', color: '#1f6feb', isLight: false, icon: '🌙' },
    { id: 'light', label: 'Gündüz', color: '#e0e8f4', isLight: true, icon: '☀️' },
    { id: 'sky', label: 'Gökyüzü', color: '#2b7cff', isLight: true, icon: '☁️' },
    { id: 'mint', label: 'Nane', color: '#1fbf9a', isLight: true, icon: '🍃' },
    { id: 'sand', label: 'Kum', color: '#f2a23a', isLight: true, icon: '🏜️' },
];

export default function ProfilePage() {
    const { data: session } = useSession();
    
    // Theme State
    const [theme, setTheme] = useState<Mode>('dark');
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        const saved = (localStorage.getItem('arsabil-theme') as Mode) || 'dark';
        setTheme(saved);
    }, []);

    const applyTheme = (mode: Mode) => {
        setTheme(mode);
        document.documentElement.setAttribute('data-theme', mode);
        localStorage.setItem('arsabil-theme', mode);
    };

    if (!session || !mounted) return null;

    const getInitials = () => {
        if (!session.user?.name) return "US";
        const parts = session.user.name.trim().split(" ");
        if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
        return parts[0].substring(0, 2).toUpperCase();
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '600px', margin: '0 auto' }}>
            
            <div className={dashStyles.pageHeader} style={{ marginBottom: '10px' }}>
                <h1>Profilim</h1>
                <p>Uygulama ayarlarınız ve kimliğiniz</p>
            </div>

            {/* Profile Block directly using dashboard classes */}
            <div className={dashStyles.profileCard} style={{ background: 'var(--panel)', borderRadius: '16px', boxShadow: 'var(--shadow2)' }}>
                <div className={dashStyles.avatar} style={{ width: '64px', height: '64px', fontSize: '1.5rem' }}>
                    {getInitials()}
                </div>
                <div className={dashStyles.profileInfo}>
                    <h3 style={{ fontSize: '1.25rem' }}>{session.user.name || "Kullanıcı"}</h3>
                    <span style={{ fontSize: '0.9rem' }}>{session.user.email}</span>
                </div>
            </div>

            {/* Theme Control Center using appStyles for 100% Glass UI compliance */}
            <div className={appStyles.settingsGroup} style={{ padding: '0', background: 'transparent', border: 'none' }}>
                <h4 style={{ fontSize: '1.1rem', marginBottom: '8px' }}>Genel Görünüm</h4>
                
                <div className={appStyles.luxGrid} style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
                    {PALETTES.slice(0, 2).map((opt) => (
                        <div 
                            key={opt.id} 
                            className={`${appStyles.luxBox} ${theme === opt.id ? appStyles.luxBoxActive : ''}`} 
                            onClick={() => applyTheme(opt.id)}
                            style={{ cursor: 'pointer' }}
                        >
                            <span style={{ fontSize: '1.5rem', marginBottom: '4px' }}>{opt.icon}</span>
                            <span style={{ fontWeight: 800 }}>{opt.label}</span>
                        </div>
                    ))}
                </div>
            </div>

            <div className={appStyles.settingsGroup} style={{ padding: '0', background: 'transparent', border: 'none' }}>
                <h4 style={{ fontSize: '1.1rem', marginBottom: '8px' }}>Vurgu Paleti</h4>
                
                <div className={appStyles.luxGrid}>
                    {PALETTES.slice(2).map((opt) => (
                        <div 
                            key={opt.id} 
                            className={`${appStyles.luxBox} ${theme === opt.id ? appStyles.luxBoxActive : ''}`} 
                            onClick={() => applyTheme(opt.id)}
                            style={{ cursor: 'pointer' }}
                        >
                            <span style={{ fontSize: '1.5rem', marginBottom: '4px', textShadow: `0 0 10px ${opt.color}` }}>{opt.icon}</span>
                            <span style={{ fontWeight: 800 }}>{opt.label}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Logical Action Area */}
            <div style={{ marginTop: '20px' }}>
                <button 
                    className={dashStyles.logoutBtn} 
                    onClick={() => signOut({ callbackUrl: '/' })}
                    style={{ width: '100%', padding: '16px', background: 'rgba(255, 90, 95, 0.1)', borderRadius: '16px', border: '1px solid rgba(255, 90, 95, 0.2)', textAlign: 'center' }}
                >
                    Hesaptan Çıkış Yap
                </button>
            </div>
            
        </div>
    );
}
