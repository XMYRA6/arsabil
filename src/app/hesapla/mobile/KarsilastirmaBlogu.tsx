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
                    // KonumBlogu.tsx'teki birimMaliyetGiris ile ayni sebep:
                    // `value` ile tam kontrollu baglarsak ve ust bilesen
                    // `piyasaFiyati` prop'unu geri beslemezse (test'te
                    // oldugu gibi), React her tus vurusundan sonra DOM'u
                    // degismemis prop'a geri sarar ve yazilan metin
                    // gorunmez kalir. `defaultValue` ile alan gercekten
                    // yazilabilir olur; bildirim yine onChange uzerinden
                    // gider.
                    defaultValue={piyasaFiyati}
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
