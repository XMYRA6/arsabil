"use client";

import { useCallback, useSyncExternalStore } from 'react';

export type Tema = 'light' | 'dark';

const ANAHTAR = 'arsabil-theme';
const OLAY = 'arsabil-theme-change';

function oku(): Tema {
    if (typeof document === 'undefined') return 'light';
    return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
}

function abone(cb: () => void) {
    window.addEventListener(OLAY, cb);
    return () => window.removeEventListener(OLAY, cb);
}

/**
 * Tema tercihi (giriş yapmış kullanıcı için hesap menüsü / profil). Gerçek kaynak
 * `<html data-theme>`; ilk değer `layout.tsx`teki eşzamanlı betikten gelir.
 * Seçim `localStorage` ("arsabil-theme") içinde saklanır ve aynı sekmedeki tüm
 * kullanıcılara bildirilir.
 */
export function useTema(): [Tema, (t: Tema) => void] {
    const tema = useSyncExternalStore(abone, oku, () => 'light' as Tema);
    const ayarla = useCallback((t: Tema) => {
        document.documentElement.setAttribute('data-theme', t);
        try { localStorage.setItem(ANAHTAR, t); } catch { /* gizli sekme vb. */ }
        window.dispatchEvent(new Event(OLAY));
    }, []);
    return [tema, ayarla];
}
