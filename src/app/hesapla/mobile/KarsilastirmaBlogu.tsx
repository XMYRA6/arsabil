"use client";

import { IconCheckCircle } from '@/components/icons';
import styles from './mobile.module.css';

export type KarsilastirmaBloguProps = {
    piyasaFiyati: string;
    onPiyasaFiyati: (v: string) => void;
    farkYuzde: number | null;
};

/**
 * Sonuc kartinin altindaki karsilastirma blogu (spec K3).
 *
 * Soru nerede doguyorsa cevap orada: kullanici min. daire fiyatini gorur,
 * hemen altinda "piyasaya gore nasil" sorusunu cevaplar.
 *
 * DIKKAT: bu deger hesaba GIRMEZ — yalnizca rozet ve kirilma noktasi
 * grafigini besler. Etiket bunu acikca soyluyor.
 */
export function KarsilastirmaBlogu({
    piyasaFiyati,
    onPiyasaFiyati,
    farkYuzde,
}: KarsilastirmaBloguProps) {
    const ucuz = farkYuzde !== null && farkYuzde < 0;

    return (
        <div className={styles.karsBlok}>
            <label className={styles.karsEtiket}>
                <span className={styles.karsEtiketMetin}>Piyasa</span>
                <input
                    type="text"
                    inputMode="numeric"
                    className={`${styles.karsGiris} mNum`}
                    // BILEREK kontrollu (`value`, `defaultValue` DEGIL): bu
                    // blok ekran boyunca mount'lu kalir ve ilce secimi
                    // page.tsx'te setManualMarketPrice(...) ile bu alani
                    // DISARIDAN doldurur. `defaultValue` yalnizca ilk
                    // mount'ta okunur; ilce degisince alan eski metni
                    // gostermeye devam eder ve rozet ile giris gorsel
                    // olarak birbirinden kopar. KonumBlogu'nun
                    // `birimMaliyetGiris`i `defaultValue` kullanabiliyor
                    // cunku o input yalnizca duzenleme sirasinda mount'lu
                    // ve her acilista tekrar mount olup taze prop'u okuyor
                    // — bu alan hic unmount olmadigi icin ayni cozum
                    // burada calismaz.
                    value={piyasaFiyati}
                    placeholder="—"
                    aria-label="Yaklaşık piyasa fiyatı (yalnızca karşılaştırma)"
                    onChange={e => onPiyasaFiyati(e.target.value)}
                />
            </label>

            {farkYuzde !== null ? (
                <span className={`${styles.karsRozet} ${ucuz ? styles.karsRozetUcuz : styles.karsRozetPahali}`}>
                    <IconCheckCircle size={12} strokeWidth={2.8} />
                    %{Math.abs(farkYuzde)} {ucuz ? 'UCUZ' : 'PAHALI'}
                </span>
            ) : (
                <span className={styles.karsTesvik}>Piyasa fiyatı girin, karşılaştıralım</span>
            )}
        </div>
    );
}
