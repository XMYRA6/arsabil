import React from 'react';
import styles from './StickyActionBar.module.css';

interface StickyActionBarProps {
    children: React.ReactNode;
    /** BottomNavbar'ın göründüğü sayfalarda true — çubuk navbar'ın üstüne oturur */
    aboveBottomNav?: boolean;
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
export function StickyActionBar({ children, aboveBottomNav = false }: StickyActionBarProps) {
    return (
        <div className={`${styles.bar} ${aboveBottomNav ? styles.aboveNav : ''}`}>
            {children}
        </div>
    );
}
