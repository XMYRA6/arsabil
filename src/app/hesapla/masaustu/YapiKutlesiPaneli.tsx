"use client";

import { DioramaStage } from '@/components/home/DioramaStage';
import { useThemeZaman } from '@/components/home/useThemeZaman';
import styles from './masaustu.module.css';

export type YapiKutlesiPaneliProps = {
    hasResult: boolean;
    katSayisi: number | null;
    daireSayisi: number | null;
    /** Parsel sınırı resmi (doğrulanmış) mı, demo mu. */
    parselDogrulandi: boolean;
};

/**
 * Yapı kütlesi önizleme — Figma 05 (Hesapla Masaüstü 1440). 3D kütle önizleme
 * kaldırıldı (görsel kalite yetersizdi): yerine "Kat karşılığı" dioraması
 * gelir; gündüz/gece uygulama temasından seçilir. Kat/daire yalnızca etiket.
 */
export function YapiKutlesiPaneli({ hasResult, katSayisi, daireSayisi, parselDogrulandi }: YapiKutlesiPaneliProps) {
    const zaman = useThemeZaman();

    const etiket = [
        katSayisi !== null ? `${katSayisi} kat` : null,
        daireSayisi !== null ? `${daireSayisi} daire` : null,
    ].filter(Boolean).join(' · ');

    return (
        <section className={styles.kart} aria-label="Yapı kütlesi önizleme">
            <h3 className={styles.kartBaslik}>Yapı kütlesi önizleme</h3>
            {hasResult ? (
                <>
                    <div className={styles.sahne}>
                        <DioramaStage
                            scene={{ tur: 'kat', varyant: 'bitmis', egim: 'duz', zaman }}
                            weather="gunesli"
                        />
                    </div>
                    <div className={styles.cipSatir}>
                        <span className={`${styles.rozet} ${parselDogrulandi ? styles.rozetYesil : styles.rozetAmber}`}>
                            {parselDogrulandi ? 'Resmi parsel sınırı' : 'Demo parsel sınırı'}
                        </span>
                        {etiket && <span className={`${styles.rozet} ${styles.rozetNotr}`}>{etiket}</span>}
                    </div>
                </>
            ) : (
                <p className={styles.bosMetin}>Parsel ve girdiler tamamlanınca yapı kütlesi burada görünür.</p>
            )}
        </section>
    );
}
