"use client";

import type { Scenario } from '@/components/ScenarioCompare';
import styles from './sonucArazi.module.css';

export type SenaryolarKartiProps = {
    senaryolar: Scenario[];
    onEkle: () => void;
    onKaldir: (id: string) => void;
    onKarsilastirAc: () => void;
    /** Hesap sonucu yoksa "Ekle" devre dışı (kaydedilecek senaryo yok). */
    hasResult: boolean;
};

const MAKS_SENARYO = 3;

/**
 * Senaryolar — Figma 05 · Hesapla Mobil 390 (2045:150). Eski sabit CTA
 * çubuğundaki "+ Karşılaştır" düğmesinin yeni yeri: "Ekle" mevcut sonucu
 * senaryo olarak kaydeder; iki veya daha fazla senaryo varsa "Karşılaştır"
 * görünür.
 */
export function SenaryolarKarti({ senaryolar, onEkle, onKaldir, onKarsilastirAc, hasResult }: SenaryolarKartiProps) {
    return (
        <section className={styles.kart} aria-label="Senaryolar">
            <h2 className={styles.kartBaslik}>Senaryolar</h2>
            <div className={styles.cipSatir}>
                {senaryolar.map(s => (
                    <span key={s.id} className={styles.senaryoCip}>
                        {s.name}
                        <button
                            type="button"
                            className={styles.senaryoCipKaldir}
                            aria-label={`${s.name}'i kaldır`}
                            onClick={() => onKaldir(s.id)}
                        >
                            ×
                        </button>
                    </span>
                ))}
                <button
                    type="button"
                    className={styles.ikincilBtn}
                    onClick={onEkle}
                    disabled={!hasResult || senaryolar.length >= MAKS_SENARYO}
                    title={senaryolar.length >= MAKS_SENARYO ? 'Maksimum 3 senaryo' : undefined}
                >
                    + Ekle
                </button>
                {senaryolar.length >= 2 && (
                    <button type="button" className={styles.mavidBtn} onClick={onKarsilastirAc}>
                        Karşılaştır ({senaryolar.length}) ›
                    </button>
                )}
            </div>
        </section>
    );
}
