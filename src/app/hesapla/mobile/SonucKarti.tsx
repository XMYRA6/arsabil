"use client";

import { IconChevronRight } from '@/components/icons';
import { KarsilastirmaBlogu, type KarsilastirmaBloguProps } from './KarsilastirmaBlogu';
import styles from './mobile.module.css';

export type SonucKartiProps = {
    minDaireFiyati: number | null;
    arsaPayiYuzde: number;
    birimFiyat: number | null;
    karsilastirma: KarsilastirmaBloguProps; // rozet artik burada (KarsilastirmaBlogu)
    onFisAc: () => void;
    onAnalizAc: () => void;
};

// `maximumFractionDigits: 0` SART: Intl varsayilani 3'tur ve motor ciktisi
// (FD_total = M * K) neredeyse hicbir zaman tam sayi degildir — varsayilanla
// kart "8.964.000,371" yazar. Bicimleme kuralinin cagri yerlerine dagilmamasi
// icin tek kaynak burasi.
const trFormat = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 });

/** null -> em-dash. Sonuc yoksa "0" DEGIL "—" gosterilir (0, bos ile ayni sey degil). */
function fmt(n: number | null): string {
    return n === null ? '—' : trFormat.format(n);
}

/**
 * `2a` degrade sonuc karti (tasarim kaynagi:
 * docs/tasarim/mobil-2026-07-28/kartlar/2a.html).
 *
 * Piyasa karsilastirma rozeti artik bu kartin uzerinde degil; metrikler
 * blogundan sonra render edilen `KarsilastirmaBlogu`nun icinde yasiyor
 * (spec K3). Rozet rengi rasyoneli icin bkz. o bilesenin dosyasi.
 */
export function SonucKarti({
    minDaireFiyati,
    arsaPayiYuzde,
    birimFiyat,
    karsilastirma,
    onFisAc,
    onAnalizAc,
}: SonucKartiProps) {
    return (
        <div className={styles.sonucKarti}>
            <div className={styles.sonucIsik} aria-hidden="true" />

            <div className={styles.sonucUst}>
                <div className={styles.sonucFiyatWrap}>
                    <span className={styles.sonucEtiket}>Min. daire fiyatı</span>
                    <span className={`${styles.sonucFiyat} mNum`}>
                        {fmt(minDaireFiyati)}
                        {minDaireFiyati !== null && <span className={styles.sonucBirim}> TL</span>}
                    </span>
                </div>
            </div>

            <div className={styles.sonucMetrikler}>
                <div className={styles.metrikKutu}>
                    <span className={styles.metrikEtiket}>Arsa payı</span>
                    <span className={`${styles.metrikDeger} mNum`}>%{trFormat.format(arsaPayiYuzde)}</span>
                </div>
                <div className={styles.metrikKutu}>
                    <span className={styles.metrikEtiket}>Birim</span>
                    <span className={`${styles.metrikDeger} mNum`}>
                        {fmt(birimFiyat)}
                        {birimFiyat !== null && <span className={styles.metrikBirimKucuk}>/m²</span>}
                    </span>
                </div>
                {/* Tasarimdaki ucuncu kutu ("Skor") KALDIRILDI (insan karari
                    2026-07-29): engine_v2'nin ciktisinda skor alani yok ve
                    /hesapla hic skor hesaplamiyor — kutu kalici olarak "—"
                    gosterecekti. Kaynak eklenirse geri getirilir (bkz. 5bc784a). */}
            </div>

            <KarsilastirmaBlogu {...karsilastirma} />

            <button type="button" className={styles.fisButonu} onClick={onFisAc}>
                Hesap fişi · Mi → Ma → M → ×K → FD
                <IconChevronRight size={15} strokeWidth={2.4} />
            </button>

            <button type="button" className={styles.fisButonu} onClick={onAnalizAc}>
                Analiz · maliyet dağılımı, hassasiyet, kırılma
                <IconChevronRight size={15} strokeWidth={2.4} />
            </button>
        </div>
    );
}
