import React from 'react';
import styles from './Footer.module.css';
import Link from 'next/link';

export function Footer() {
    return (
        <footer className={styles.footer}>
            <div className={styles.container}>

                <div className={styles.bottom}>
                    <div className={styles.copyright}>
                        © 2026 ArsaBil — Türkiye&apos;nin Arsa Payı ve Kat Karşılığı Fizibilite Motoru
                    </div>
                    <div className={styles.links}>
                        <Link href="/terms">Kullanım Koşulları</Link>
                        <Link href="/privacy">Gizlilik Politikası</Link>
                        <Link href="/contact">İletişim</Link>
                    </div>
                </div>
            </div>
        </footer>
    );
}
