"use client";

import { useState } from 'react';
import Link from 'next/link';
import type { DashboardData } from '../dashboard/page';
import styles from './mobile.module.css';

export type BildirimOzeti = { id: string; title: string; body: string; read: boolean };

export type GelenKutusuProps = {
    messages: DashboardData['recentMessages'];
    unreadMessages: number;
    notifications: BildirimOzeti[];
};

type Sekme = 'mesaj' | 'bildirim';

const kisalt = (m: string, n = 60) => (m.length > n ? m.slice(0, n) + '…' : m);

/**
 * Ana sayfa özetinin ilk kartı: Mesajlar ve Bildirimler tek yerde, iki sekmeli.
 * Üst çubukta zil/ikon yok; okunmamış sayısı sekme başlığında görünür. Satıra
 * dokunmak ilgili tam sayfayı (`/inbox`, `/notifications`) açar.
 */
export function GelenKutusu({ messages, unreadMessages, notifications }: GelenKutusuProps) {
    const okunmamisBildirim = notifications.filter(n => !n.read).length;
    const [sekme, setSekme] = useState<Sekme>(unreadMessages === 0 && okunmamisBildirim > 0 ? 'bildirim' : 'mesaj');

    const sekmeBtn = (anahtar: Sekme, etiket: string, sayi: number) => (
        <button
            type="button"
            role="tab"
            aria-selected={sekme === anahtar}
            className={sekme === anahtar ? styles.sekmeAktif : styles.sekme}
            onClick={() => setSekme(anahtar)}
        >
            {etiket}
            {sayi > 0 && <span className={styles.sekmeSayi}>{sayi}</span>}
        </button>
    );

    return (
        <section className={styles.kutu} aria-label="Gelen kutusu">
            <div className={styles.sekmeSerit} role="tablist" aria-label="Gelen kutusu">
                {sekmeBtn('mesaj', 'Mesajlar', unreadMessages)}
                {sekmeBtn('bildirim', 'Bildirimler', okunmamisBildirim)}
            </div>

            {sekme === 'mesaj' ? (
                messages.length === 0 ? (
                    <p className={styles.bosSatir}>Mesaj yok.</p>
                ) : (
                    <div className={styles.liste}>
                        {messages.slice(0, 3).map(m => (
                            <Link key={m.id} href={`/inbox?with=${m.sender.id}`} className={styles.satir}>
                                <span className={styles.satirBaslik}>{m.sender.name || 'Kullanıcı'}</span>
                                <span className={styles.satirAlt}>{kisalt(m.content)}</span>
                            </Link>
                        ))}
                    </div>
                )
            ) : notifications.length === 0 ? (
                <p className={styles.bosSatir}>Bildirim yok.</p>
            ) : (
                <div className={styles.liste}>
                    {notifications.slice(0, 3).map(n => (
                        <Link key={n.id} href="/notifications" className={`${styles.satir} ${n.read ? '' : styles.satirOkunmamis}`}>
                            <span className={styles.satirBaslik}>{n.title}</span>
                            <span className={styles.satirAlt}>{kisalt(n.body)}</span>
                        </Link>
                    ))}
                </div>
            )}

            <Link href={sekme === 'mesaj' ? '/inbox' : '/notifications'} className={styles.tumu}>Tümünü gör →</Link>
        </section>
    );
}
