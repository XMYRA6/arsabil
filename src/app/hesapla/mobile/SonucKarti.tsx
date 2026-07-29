"use client";

import { IconCheckCircle, IconChevronRight } from '@/components/icons';
import styles from './mobile.module.css';

export type SonucKartiProps = {
    minDaireFiyati: number | null;
    arsaPayiYuzde: number;
    birimFiyat: number | null;
    skor: number | null;
    piyasaFarkiYuzde: number | null; // null -> rozet RENDER EDILMEZ
    onFisAc: () => void;
};

const trFormat = new Intl.NumberFormat('tr-TR');

/** null -> em-dash. Sonuc yoksa "0" DEGIL "—" gosterilir (0, bos ile ayni sey degil). */
function fmt(n: number | null): string {
    return n === null ? '—' : trFormat.format(n);
}

/**
 * `2a` degrade sonuc karti (tasarim kaynagi:
 * docs/tasarim/mobil-2026-07-28/kartlar/2a.html).
 *
 * Rozet rengi icin tasarimin ham HTML'i tek ornegi (UCUZ, #0e9f74) icerir;
 * PAHALI varyanti tasarimda yok. Task 1'in `--m-success-text` (#0a8a63) ve
 * `--m-danger` (#ff2d55) token'lari kullanilarak sistemli hale getirildi —
 * skor kutusunun rengiyle (asagida) ayni token, tek kaynaktan.
 */
export function SonucKarti({
    minDaireFiyati,
    arsaPayiYuzde,
    birimFiyat,
    skor,
    piyasaFarkiYuzde,
    onFisAc,
}: SonucKartiProps) {
    const ucuz = piyasaFarkiYuzde !== null && piyasaFarkiYuzde < 0;

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
                {piyasaFarkiYuzde !== null && (
                    <span
                        className={`${styles.sonucRozet} ${ucuz ? styles.sonucRozetUcuz : styles.sonucRozetPahali}`}
                    >
                        <IconCheckCircle size={12} strokeWidth={2.8} />
                        %{trFormat.format(Math.abs(piyasaFarkiYuzde))} {ucuz ? 'UCUZ' : 'PAHALI'}
                    </span>
                )}
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
                <div className={styles.metrikKutuSkor}>
                    <span className={styles.metrikEtiket}>Skor</span>
                    <span className={`${styles.metrikDegerSkor} mNum`}>{fmt(skor)}</span>
                </div>
            </div>

            <button type="button" className={styles.fisButonu} onClick={onFisAc}>
                Hesap fişi · Mi → Ma → M → ×K → FD
                <IconChevronRight size={15} strokeWidth={2.4} />
            </button>
        </div>
    );
}
