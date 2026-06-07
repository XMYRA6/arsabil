'use client'

import { useEffect, useState } from 'react'

type Theme = 'light' | 'dark'

export function ThemeToggle() {
    const [theme, setTheme] = useState<Theme>('light')
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
        const saved = localStorage.getItem('arsabil-theme') as Theme | null
        if (saved === 'dark' || saved === 'light') {
            setTheme(saved)
        }
    }, [])

    const toggle = () => {
        const next: Theme = theme === 'light' ? 'dark' : 'light'
        setTheme(next)
        if (next === 'dark') {
            document.documentElement.setAttribute('data-theme', 'dark')
        } else {
            document.documentElement.removeAttribute('data-theme')
        }
        localStorage.setItem('arsabil-theme', next)
    }

    if (!mounted) return <div style={{ width: 40, height: 40 }} />

    const isDark = theme === 'dark'

    return (
        <button
            onClick={toggle}
            aria-label="Tema değiştir"
            title={isDark ? 'Aydınlık temaya geç' : 'Karanlık temaya geç'}
            style={{
                width: 40, height: 40, borderRadius: 10,
                border: isDark
                    ? '1px solid rgba(255,255,255,.15)'
                    : '1px solid rgba(0,0,0,.1)',
                background: isDark
                    ? 'rgba(255,255,255,.08)'
                    : 'rgba(0,0,0,.05)',
                color: 'var(--topbar-text)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', transition: 'all 0.2s ease',
                flexShrink: 0,
            }}
        >
            {isDark ? (
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <circle cx="12" cy="12" r="5" />
                    <path strokeLinecap="round" d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72l1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
                </svg>
            ) : (
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
                </svg>
            )}
        </button>
    )
}
