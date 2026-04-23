import React from 'react';
import styles from './Footer.module.css';
import Link from 'next/link';

export function Footer() {
    return (
        <footer className={styles.footer}>
            <div className={styles.container}>
                <div className={styles.visionMission}>
                    <div className={styles.section}>
                        <h3>🌌 Vizyonumuz</h3>
                        <p>Türkiye'nin her parselinde, inşaat potansiyelini bir tıkla şeffaflaştıran, dijital gayrimenkul geliştirme standartlarını belirleyen bir ekosistem olmak.</p>
                    </div>
                    <div className={styles.section}>
                        <h3>🎯 Misyonumuz</h3>
                        <p>Arsa sahipleri ve müteahhitler arasındaki güven bariyerini, veriye dayalı anlık analizlerle yıkarak; adil ve hızlı inşaat süreçlerine öncülük etmek.</p>
                    </div>
                </div>
                <div className={styles.bottom}>
                    <div className={styles.copyright}>
                        © 2026 ArsaBil — Türkiye'nin Arsa Payı ve Kat Karşılığı Fizibilite Motoru
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
