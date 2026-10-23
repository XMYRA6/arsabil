"use client";

import { DioramaStage } from '@/components/home/DioramaStage';
import { useThemeZaman } from '@/components/home/useThemeZaman';
import styles from './sonucArazi.module.css';

export type YapiKutlesiKartiProps = {
    /** Hesap sonucu var mı — yoksa kart hiç gösterilmez. */
    hasResult: boolean;
    /** Kat sayısı (kütle türetmesinden); bilinmiyorsa `null`. */
    katSayisi: number | null;
    daireSayisi: number | null;
    /** Parsel sınırı resmi (doğrulanmış) mı, demo mu. */
    parselDogrulandi: boolean;
    on2BPlan: () => void;
    onProgramAc: () => void;
    onTeklifAc: () => void;
    onTasarimSenaryolariAc: () => void;
};

/**
 * Yapı kütlesi — Figma 05 · Hesapla Mobil 390 (2045:139). 3D kütle önizleme
 * kaldırıldı (görsel kalite yetersizdi): yerine "Kat karşılığı" dioraması
 * gelir; gündüz/gece uygulama temasından seçilir. Kütle verisi (kat, daire)
 * yalnızca etiket olarak gösterilir.
 *
 * Kısayollar: "2B plan" yerleşim yaprağını, Program karması ve Arsa sahibi
 * teklifi kendi yapraklarını açar (eski Sonuç kartı menüsünün yeri).
 */
export function YapiKutlesiKarti({
    hasResult,
    katSayisi,
    daireSayisi,
    parselDogrulandi,
    on2BPlan,
    onProgramAc,
    onTeklifAc,
    onTasarimSenaryolariAc,
}: YapiKutlesiKartiProps) {
    const zaman = useThemeZaman();
    if (!hasResult) return null;

    const etiket = [
        katSayisi !== null ? `${katSayisi} kat` : null,
        daireSayisi !== null ? `${daireSayisi} daire` : null,
    ].filter(Boolean).join(' · ');

    return (
        <section className={styles.kart} aria-label="Yapı kütlesi">
            <div className={styles.kartBaslikSatir}>
                <h2 className={styles.kartBaslik}>Yapı kütlesi</h2>
                <button type="button" className={styles.ikincilBtn} onClick={on2BPlan}>
                    2B plan
                </button>
            </div>

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

            <div className={styles.cipSatir}>
                <button type="button" className={styles.mavidBtn} onClick={onProgramAc}>
                    Program karması
                </button>
                <button type="button" className={styles.mavidBtn} onClick={onTeklifAc}>
                    Arsa sahibi teklifi
                </button>
                <button type="button" className={styles.mavidBtn} onClick={onTasarimSenaryolariAc}>
                    Tasarım senaryoları
                </button>
            </div>
        </section>
    );
}
