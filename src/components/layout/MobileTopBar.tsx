"use client";

import Link from 'next/link';
import { ArsabilLogo } from '@/components/ui/ArsabilLogo';
import { IconBell, IconMessage } from '@/components/icons';
import styles from './MobileTopBar.module.css';

interface MobileTopBarProps {
    /** Okunmamış mesaj sayısı (0 ise rozet çizilmez). */
    mesaj?: number;
    /** Okunmamış bildirim sayısı (0 ise rozet çizilmez). */
    bildirim?: number;
}

/**
 * Girişli kullanıcının mobil ana sayfa üst çubuğu: logo solda, bildirim ve
 * mesaj ikonları sağda (rozetli). Logo + marka yalnızca ana sayfada görünür;
 * diğer ekranlar kendi başlığını taşır.
 */
export function MobileTopBar({ mesaj = 0, bildirim = 0 }: MobileTopBarProps) {
    return (
        <header className={styles.bar}>
            <Link href="/" aria-label="Ana sayfa" className={styles.logo}>
                <ArsabilLogo size={28} showText />
            </Link>
            <div className={styles.actions}>
                <Link href="/notifications" className={styles.iconBtn} aria-label={bildirim > 0 ? `Bildirimler, ${bildirim} okunmamış` : 'Bildirimler'}>
                    <IconBell size={22} />
                    {bildirim > 0 && <span className={styles.badge} aria-hidden="true">{bildirim > 9 ? '9+' : bildirim}</span>}
                </Link>
                <Link href="/inbox" className={styles.iconBtn} aria-label={mesaj > 0 ? `Mesajlar, ${mesaj} okunmamış` : 'Mesajlar'}>
                    <IconMessage size={22} />
                    {mesaj > 0 && <span className={styles.badge} aria-hidden="true">{mesaj > 9 ? '9+' : mesaj}</span>}
                </Link>
            </div>
        </header>
    );
}
