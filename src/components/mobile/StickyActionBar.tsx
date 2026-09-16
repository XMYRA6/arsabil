import React from 'react';
import { useKeyboardInset } from './useKeyboardInset';
import styles from './StickyActionBar.module.css';

interface StickyActionBarProps {
    children: React.ReactNode;
    /** BottomNavbar'ın göründüğü sayfalarda true — çubuk navbar'ın üstüne oturur */
    aboveBottomNav?: boolean;
    /** 'glass': `--m-*` mobil glassmorphism token'larıyla (dashboard/hesapla-mobile/deger ailesi) render eder — varsayılan `--topbar-*` yerine */
    variant?: 'default' | 'glass';
}

/**
 * Ekran altına sabitlenen CTA çubuğu (mobilde `position: fixed; bottom: 0`).
 *
 * ÖNEMLİ: `BottomNavbar` mobilde global olarak görünür (bkz.
 * `BottomNavbar.module.css` — `@media (max-width: 768px)` altında
 * `display: flex !important`). BottomNavbar görünen HER sayfada
 * `aboveBottomNav={true}` GEÇİLMELİDİR, aksi halde bu çubuk BottomNavbar'ın
 * ALTINDA/ARKASINDA kalır ve tıklanamaz olur.
 *
 * @example
 * ```tsx
 * // BottomNavbar görünen bir sayfada — aboveBottomNav ZORUNLU
 * <StickyActionBar aboveBottomNav>
 *   <button onClick={handleTeklifVer}>Teklif Ver</button>
 * </StickyActionBar>
 * ```
 */
export function StickyActionBar({ children, aboveBottomNav = false, variant = 'default' }: StickyActionBarProps) {
    // Klavye acikken bar'i klavyenin ustune kaydirir (bkz. useKeyboardInset.ts,
    // BottomSheet/BottomNavbar'da zaten dogrulanan ayni desen) — kullanici
    // bulgusu: ilan sihirbazi Ileri/Geri cubugu, hesapla mobil CTA ve ilan
    // detayi "Teklif Ver" klavyenin altinda kalip gorunmuyordu.
    const keyboardInset = useKeyboardInset();
    return (
        <div
            className={`${styles.bar} ${aboveBottomNav ? styles.aboveNav : ''} ${variant === 'glass' ? styles.glass : ''}`}
            style={{ '--keyboard-inset': `${keyboardInset}px` } as React.CSSProperties}
        >
            {children}
        </div>
    );
}
