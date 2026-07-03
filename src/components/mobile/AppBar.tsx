"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import styles from './AppBar.module.css';

interface AppBarProps {
    title: string;
    /** Geri butonunu göster; tıklanınca router.back() (backHref verilirse oraya push) */
    showBack?: boolean;
    backHref?: string;
    /** Sağ tarafta gösterilecek opsiyonel aksiyon (ikon butonu vb.) */
    action?: React.ReactNode;
}

/**
 * Mobil sayfa başlığı çubuğu (`sticky top-0`, `z-index: 50`). Desktop'ta
 * `display: none` — sadece `@media (max-width: 768px)` altında görünür.
 *
 * ÖNEMLİ — KOMPOZİSYON KURALI: AppBar global `Navbar` (sticky top-0,
 * z-index: 1050) ile AYNI ANDA görünürse Navbar her zaman üstte kalır ve
 * AppBar'ı kaplar. AppBar kullanan sayfalar, global Navbar'ı mobilde
 * MUTLAKA gizlemelidir (bkz. `Navbar.module.css` `.mobileHidden` /
 * `.mobileCompact` sınıfları). AppBar'ın kendi z-index: 50 değeri doğrudur
 * ve DEĞİŞTİRİLMEMELİDİR — sadece Navbar o sayfada gizliyken doğru çalışır.
 *
 * @example
 * ```tsx
 * // page.tsx — global Navbar'ı mobilde gizleyen sayfa
 * <Navbar className="mobileHidden" />
 * <AppBar title="İlan Detayı" showBack action={<FavoriteButton />} />
 * ```
 */
export function AppBar({ title, showBack = false, backHref, action }: AppBarProps) {
    const router = useRouter();

    const handleBack = () => {
        if (backHref) router.push(backHref);
        else router.back();
    };

    return (
        <header className={styles.appBar}>
            {showBack && (
                <button type="button" className={styles.backBtn} onClick={handleBack} aria-label="Geri">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
                </button>
            )}
            <h1 className={styles.title}>{title}</h1>
            {action && <div className={styles.action}>{action}</div>}
        </header>
    );
}
