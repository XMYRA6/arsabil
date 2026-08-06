"use client";

import Link from 'next/link';
import type { DashboardData } from '../dashboard/page';
import styles from './mobile.module.css';

export type RecentActivityRowsProps = {
    messages: DashboardData['recentMessages'];
    offers: DashboardData['recentOffers'];
};

function offerStatusClass(status: string): string {
    if (status === 'PENDING') return styles.statusPending;
    if (status === 'ACCEPTED') return styles.statusAccepted;
    return styles.statusRejected;
}

function offerStatusLabel(status: string): string {
    if (status === 'PENDING') return 'Bekliyor';
    if (status === 'ACCEPTED') return 'Kabul';
    return 'Reddedildi';
}

/**
 * Son mesaj + son teklif — kompakt önizleme. İkisi de boşsa bölüm HİÇ
 * render edilmez (iki ayrı boş kutu üst üste durmasın — Simplicity ilkesi,
 * bkz. spec). Biri varsa bölüm görünür, diğeri kendi içinde "yok" notu
 * gösterir — `/dashboard/page.tsx`'teki bağımsız desenin aynısı.
 */
export function RecentActivityRows({ messages, offers }: RecentActivityRowsProps) {
    if (messages.length === 0 && offers.length === 0) {
        return null;
    }

    const message = messages[0];
    const offer = offers[0];

    return (
        <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Son Mesaj</h2>
            {message ? (
                <Link href={`/inbox?with=${message.sender.id}`} className={styles.listRow}>
                    <span className={styles.listTitle}>{message.sender.name || 'Kullanıcı'}</span>
                    <span className={styles.listMeta}>
                        {message.content.length > 55 ? message.content.slice(0, 55) + '…' : message.content}
                    </span>
                </Link>
            ) : (
                <p className={styles.activityEmptyRow}>Mesaj yok.</p>
            )}

            <h2 className={styles.sectionTitle}>Son Teklif</h2>
            {offer ? (
                <Link href={`/listing/${offer.listing.id}`} className={styles.listRow}>
                    <span className={styles.listTitle}>{offer.listing.title || offer.listing.city || 'İlan'}</span>
                    <span className={styles.listMeta}>
                        %{offer.offeredShare} pay ·{' '}
                        <span className={offerStatusClass(offer.status)}>{offerStatusLabel(offer.status)}</span>
                    </span>
                </Link>
            ) : (
                <p className={styles.activityEmptyRow}>Teklif yok.</p>
            )}
        </section>
    );
}
