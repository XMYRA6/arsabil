"use client";

import { IconChevronRight } from '@/components/icons';
import styles from './mobile.module.css';

export type TasarimStudyosuHubProps = {
    onKapat: () => void;
    onYerlesimAc: () => void;
    onProgramAc: () => void;
    on3DAc: () => void;
    onSenaryolarAc: () => void;
};

/**
 * Mobil "Tasarım Stüdyosu" iç-içe hub menüsü (2026-08-23 IA
 * sadeleştirmesi) — 2D Yerleşim, Program Dağılımı, 3D Önizleme ve
 * Tasarım Senaryoları aynı "aktif tasarım denemesi" üzerinde çalışan
 * bağlı bir iş akışı olduğu için tek bir giriş noktasında toplanır
 * (bkz. spec). Sekme şeridi DEĞİL, projenin "tek kapı" bir seviye daha
 * derinde tekrarlanan iç-içe menü deseni — `AnalizSekmesi.tsx`'te
 * belgelenmiş K4/K5 kararıyla tutarlı.
 *
 * Bu bileşen hiçbir alt-yaprağı kendisi render ETMEZ — yalnızca 4
 * callback'i çağırır, `HesaplaMobile.tsx`'in mevcut ternary zinciri
 * hangi alt-yaprağın göründüğüne (bilinmeyen bir yeni state olmadan)
 * karar vermeye devam eder.
 */
export function TasarimStudyosuHub({
    onKapat,
    onYerlesimAc,
    onProgramAc,
    on3DAc,
    onSenaryolarAc,
}: TasarimStudyosuHubProps) {
    return (
        <>
            <header className={styles.analizKapatSatiri}>
                <h2 className={styles.aciklamaBaslikMetin}>Tasarım Stüdyosu</h2>
                <button type="button" className={styles.aciklamaKapat} onClick={onKapat}>
                    Kapat
                </button>
            </header>

            <div className={styles.hubButonListesi}>
                <button type="button" className={styles.hubButonu} onClick={onYerlesimAc}>
                    Yerleşim · footprint, çekme, cephe
                    <IconChevronRight size={15} strokeWidth={2.4} />
                </button>

                <button type="button" className={styles.hubButonu} onClick={onProgramAc}>
                    Program · daire tipleri, dükkan
                    <IconChevronRight size={15} strokeWidth={2.4} />
                </button>

                <button type="button" className={styles.hubButonu} onClick={on3DAc}>
                    3D Görünüm · bina kütlesi
                    <IconChevronRight size={15} strokeWidth={2.4} />
                </button>

                <button type="button" className={styles.hubButonu} onClick={onSenaryolarAc}>
                    Tasarım Senaryoları · alternatifler, geçmiş
                    <IconChevronRight size={15} strokeWidth={2.4} />
                </button>
            </div>
        </>
    );
}
