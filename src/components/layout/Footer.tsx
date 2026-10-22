import React from 'react';
import Link from 'next/link';
import styles from './Footer.module.css';
import { ArsabilLogo } from '@/components/ui/ArsabilLogo';

// Henüz sayfası olmayan Rehber / Blog / Hakkımızda / İl haritası bağlantıları, sayfalar yayınlanana kadar eklenmez.
const COLUMNS = [
    {
        title: 'Ürün',
        links: [
            { href: '/deger', label: 'Arsa Değerleme' },
            { href: '/hesapla', label: 'Kat Karşılığı' },
            { href: '/marketplace', label: 'Pazar Yeri' },
            { href: '/akif', label: 'Akif' },
        ],
    },
    {
        title: 'Keşfet',
        links: [{ href: '/arsa-fiyatlari', label: 'Arsa fiyatları' }],
    },
    {
        title: 'Şirket',
        links: [
            { href: '/contact', label: 'İletişim' },
            { href: '/privacy', label: 'Gizlilik' },
            { href: '/terms', label: 'Koşullar' },
        ],
    },
];

export function Footer() {
    return (
        <footer className={styles.footer}>
            <div className={styles.container}>
                <div className={styles.top}>
                    <div className={styles.brand}>
                        <ArsabilLogo size={32} showText />
                        <p>Arsa değerleme ve kat karşılığı fizibilite platformu.</p>
                    </div>
                    {COLUMNS.map((col) => (
                        <nav key={col.title} aria-label={col.title} className={styles.col}>
                            <h2>{col.title}</h2>
                            {col.links.map((l) => (
                                <Link key={l.href} href={l.href}>{l.label}</Link>
                            ))}
                        </nav>
                    ))}
                </div>
                <div className={styles.bottom}>
                    © 2026 ArsaBil · Veriler bilgilendirme amaçlıdır; resmi değerleme veya yatırım tavsiyesi yerine geçmez.
                </div>
            </div>
        </footer>
    );
}
