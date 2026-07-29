"use client";

import React, { useEffect, useState, useRef } from 'react';

type Mode = 'dark' | 'light';

const PALETTES: { id: Mode; label: string; color: string; isLight: boolean }[] = [
    { id: 'dark', label: 'Gece', color: '#1f6feb', isLight: false },
    { id: 'light', label: 'Gündüz', color: '#e0e8f4', isLight: true },
];

const VARSAYILAN_TEMA: Mode = 'light';

/**
 * localStorage'daki degeri DOGRULAR.
 *
 * Uygulama eskiden `sky` / `mint` / `sand` temalarini da sunuyordu. Paletler
 * kaldirildi ama o temayi secmis kullanicilarin tarayicisinda deger KALDI.
 * Once burada dogrulama yoktu: string dogrudan `Mode`a cast ediliyor,
 * `PALETTES.find(...)` `undefined` donuyor ve `current.isLight` TypeError
 * firlatiyordu. Bilesen RootLayout > SiteChrome > Navbar zincirinde oldugu
 * icin bu, o kullanicilar icin TUM sayfalari coken bir hataydi.
 */
function gecerliTema(ham: string | null): Mode {
    return PALETTES.some(p => p.id === ham) ? (ham as Mode) : VARSAYILAN_TEMA;
}

interface ThemeToggleProps {
    /** AdminTopBar gibi sabit-koyu bir yüzeye oturduğunda butonun KENDİ
     * çerçeve stilini (border/background/icon rengi) zorla koyu-yüzey
     * moduna alır — gerçek tema durumunu (hangi ikon gösterilir, dropdown
     * içeriği) DEĞİŞTİRMEZ, yalnızca görsel kapsayıcının host yüzeyle
     * kontrastını düzeltir. */
    forceDarkSurface?: boolean;
}

/**
 * ThemeToggle — Moon/Sun button expands to a dropdown with
 * Dark/Light theme toggle. Persists in localStorage under "arsabil-theme".
 */
export const ThemeToggle: React.FC<ThemeToggleProps> = ({ forceDarkSurface = false }) => {
    const [theme, setTheme] = useState<Mode>('light');
    const [open, setOpen] = useState(false);
    const [mounted, setMounted] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- SSR hidrasyon + localStorage başlangıç teması
        setMounted(true);
        const ham = localStorage.getItem('arsabil-theme');
        const saved = gecerliTema(ham);
        setTheme(saved);
        document.documentElement.setAttribute('data-theme', saved);
        // Bozuk degeri TEMIZLE: aksi halde bu degeri yazan baska bir kod yolu
        // olmadigi icin kullanici her acilista ayni bozuk degeri okumaya
        // devam eder ve duzeltme yalnizca oturum boyunca gizler.
        if (ham !== null && ham !== saved) {
            localStorage.setItem('arsabil-theme', saved);
        }
    }, []);

    // Close on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const apply = (mode: Mode) => {
        setTheme(mode);
        document.documentElement.setAttribute('data-theme', mode);
        localStorage.setItem('arsabil-theme', mode);
        setOpen(false);
    };

    if (!mounted) return <div style={{ width: 44, height: 44 }} />;

    const isDark = theme === 'dark';
    const surfaceDark = forceDarkSurface || isDark;
    // `!` KULLANILMAZ: state her zaman gecerli olsa bile, non-null iddiasi
    // tam da bu hatayi gizleyen seydi. Bulunamazsa varsayilana dusulur.
    const current = PALETTES.find(p => p.id === theme)
        ?? PALETTES.find(p => p.id === VARSAYILAN_TEMA)!;

    return (
        <div ref={ref} style={{ position: 'relative' }}>
            {/* Toggle Button */}
            <button
                onClick={() => setOpen(!open)}
                aria-label="Tema değiştir"
                title="Tema değiştir"
                style={{
                    width: 42, height: 42, borderRadius: 14,
                    border: surfaceDark ? '1px solid rgba(255,255,255,.18)' : '1px solid rgba(0,0,0,.12)',
                    background: surfaceDark ? 'rgba(255,255,255,.10)' : 'rgba(0,0,0,.06)',
                    color: surfaceDark ? 'white' : '#0b1b2b',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', transition: 'all 0.3s ease',
                    position: 'relative',
                }}
            >
                {/* Small palette dot */}
                {current.isLight && (
                    <span style={{
                        position: 'absolute', top: 5, right: 5,
                        width: 7, height: 7, borderRadius: '50%',
                        background: current.color,
                        border: '1.5px solid rgba(0,0,0,.12)',
                    }} />
                )}
                {isDark ? (
                    /* Moon */
                    <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
                    </svg>
                ) : (
                    /* Sun */
                    <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <circle cx="12" cy="12" r="5" />
                        <path strokeLinecap="round" d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72l1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
                    </svg>
                )}
            </button>

            {/* Dropdown */}
            {open && (
                <div style={{
                    position: 'absolute', top: 'calc(100% + 10px)', right: 0,
                    width: 220,
                    background: 'var(--panel, #0f2a4a)',
                    border: '1px solid var(--border)',
                    borderRadius: 16,
                    boxShadow: '0 20px 60px rgba(0,0,0,.30)',
                    zIndex: 300,
                    overflow: 'hidden',
                    animation: 'fadeSlideIn 0.18s ease',
                    padding: '12px',
                }}>
                    {/* Header */}
                    <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.08em', marginBottom: 8 }}>
                        TEMA
                    </div>

                    {/* Dark / Light Row */}
                    <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                        {[PALETTES[0], PALETTES[1]].map(p => (
                            <button
                                key={p.id}
                                onClick={() => apply(p.id)}
                                style={{
                                    flex: 1, padding: '7px 4px', borderRadius: 10,
                                    border: theme === p.id ? '2px solid var(--primary)' : '1.5px solid var(--border)',
                                    background: theme === p.id ? 'rgba(var(--primary-rgb),.12)' : 'var(--bg, #0b2443)',
                                    color: 'var(--text)', cursor: 'pointer', fontFamily: 'inherit',
                                    fontSize: '0.75rem', fontWeight: theme === p.id ? 800 : 600,
                                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                                    transition: 'all 0.15s',
                                }}
                            >
                                <span style={{ fontSize: '1rem' }}>{p.id === 'dark' ? '🌙' : '☀️'}</span>
                                {p.label}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
