"use client";

import { useState } from 'react';
import { FiyatAciklamasi, type FiyatAciklamasiProps } from './FiyatAciklamasi';
import { AnalizSekmesi, type AnalizSekmesiProps } from './AnalizSekmesi';
import styles from './mobile.module.css';

export type SonucDetayiMobileLeafProps = {
    fiyatAciklamasi: FiyatAciklamasiProps;
    analiz: AnalizSekmesiProps;
    onKapat: () => void;
};

type Sekme = 'ozet' | 'grafikler';

/**
 * Mobil "Sonuç Detayı" derinleştirme yaprağı — eski ayrı Hesap
 * Fişi/Analiz menü öğelerinin birleşimi (2026-08-23 IA sadeleştirmesi,
 * bkz. docs/superpowers/specs/2026-08-23-hesapla-mobil-menu-sadelestirme-design.md).
 * `FiyatAciklamasi`/`AnalizSekmesi` KOPYALANMAZ, aynen sarmalanır —
 * yalnızca kendi başlıkları kaldırılmış halleriyle iki sekme içinde
 * gösterilirler.
 */
export function SonucDetayiMobileLeaf({ fiyatAciklamasi, analiz, onKapat }: SonucDetayiMobileLeafProps) {
    const [sekme, setSekme] = useState<Sekme>('ozet');

    return (
        <>
            <header className={styles.analizKapatSatiri}>
                <h2 className={styles.aciklamaBaslikMetin}>Sonuç Detayı</h2>
                <button type="button" className={styles.aciklamaKapat} onClick={onKapat}>
                    Kapat
                </button>
            </header>

            <div className={styles.segmentKap2} role="tablist" aria-label="Sonuç Detayı görünümü">
                <button
                    type="button"
                    role="tab"
                    aria-selected={sekme === 'ozet'}
                    className={`${styles.segment} ${sekme === 'ozet' ? styles.segmentAktif : ''}`}
                    onClick={() => setSekme('ozet')}
                >
                    Özet
                </button>
                <button
                    type="button"
                    role="tab"
                    aria-selected={sekme === 'grafikler'}
                    className={`${styles.segment} ${sekme === 'grafikler' ? styles.segmentAktif : ''}`}
                    onClick={() => setSekme('grafikler')}
                >
                    Grafikler
                </button>
            </div>

            {sekme === 'ozet'
                ? <FiyatAciklamasi {...fiyatAciklamasi} />
                : <AnalizSekmesi {...analiz} />}
        </>
    );
}
