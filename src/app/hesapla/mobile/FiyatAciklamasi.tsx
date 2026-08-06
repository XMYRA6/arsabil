"use client";

import { useState } from 'react';
import { IconChevronRight, IconMoney, IconRuler } from '@/components/icons';
import { HesapFisi } from '../HesapFisi';
import type { CalculationOutput } from '@/lib/calculator/engine_v2';
import styles from './mobile.module.css';

export type FiyatAciklamasiProps = {
    result: CalculationOutput | null;
    apartmentSize: number | null;
    unitPrice: number | null;
    landSharePercent: number;
    /** Kazanc seviyesi etiketi, orn. "Orta". */
    profitLabel: string;
    /** Kar carpani, orn. 1.30. */
    profitMultiplier: number;
    onKapat: () => void;
    /** `4f` yapragini kar bolumunde acar. */
    onKarDegistir: () => void;
};

const MUHENDIS_ANAHTARI = 'arsabil-engineer-view';

const trFormat = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 });

function fmt(n: number | null): string {
    return n === null ? '—' : trFormat.format(n);
}

/**
 * `4a` "Bu fiyat nereden geliyor?" ekrani (tasarim kaynagi:
 * docs/tasarim/mobil-2026-07-28/kartlar/4a.html).
 *
 * Satirlar motorun ciktisindan TURETILIR, motor DEGISMEZ:
 *   insaat = Mi · arsa sahibinin payi = Ma · muteahhidin kazanci = FD_total − M
 *   toplam = FD_total
 *
 * "Muhendis gorunumu" acikken mevcut `HesapFisi` bileseni render edilir —
 * sembolik gosterim KOPYALANMAZ, tek kaynak odur.
 */
export function FiyatAciklamasi({
    result,
    apartmentSize,
    unitPrice,
    landSharePercent,
    profitLabel,
    profitMultiplier,
    onKapat,
    onKarDegistir,
}: FiyatAciklamasiProps) {
    // Tercih localStorage'da yasar ve DOGRUDAN baslangic degerinde okunur.
    // Hydration uyusmazligi riski YOK: bu bilesen sunucuda hic render
    // edilmez — `page.tsx` viewport olculene kadar notr bir iskelet donuyor,
    // yani buraya yalnizca istemcide, mount sonrasi gelinir. Efekt icinde
    // setState etmek ayni sonucu ekstra bir render turuyla uretirdi.
    const [muhendisGorunumu, setMuhendisGorunumu] = useState<boolean>(
        () => typeof window !== 'undefined'
            && localStorage.getItem(MUHENDIS_ANAHTARI) === 'true',
    );

    const degistir = () => {
        setMuhendisGorunumu(onceki => {
            const yeni = !onceki;
            localStorage.setItem(MUHENDIS_ANAHTARI, String(yeni));
            return yeni;
        });
    };

    const muteahhitKazanci = result ? result.FD_total - result.M : null;

    return (
        <section className={styles.fiyatAciklamasi} aria-label="Bu fiyat nereden geliyor?">
            <header className={styles.aciklamaBaslik}>
                <h2 className={styles.aciklamaBaslikMetin}>Bu fiyat nereden geliyor?</h2>
                <button type="button" className={styles.aciklamaKapat} onClick={onKapat}>
                    Kapat
                </button>
            </header>

            <ol className={styles.aciklamaSatirlar}>
                <li className={styles.aciklamaSatir}>
                    <span className={`${styles.aciklamaIkon} ${styles.aciklamaIkonMavi}`} aria-hidden="true">
                        <IconRuler size={18} />
                    </span>
                    <span className={styles.aciklamaMetin}>
                        <span className={styles.aciklamaAd}>Daireyi inşa etmek</span>
                        <span className={styles.aciklamaAlt}>
                            {fmt(apartmentSize)} m² × {fmt(unitPrice)} TL/m²
                        </span>
                    </span>
                    <span className={`${styles.aciklamaTutar}`}>{fmt(result?.Mi ?? null)}</span>
                </li>

                <li className={styles.aciklamaSatir}>
                    <span className={`${styles.aciklamaIkon} ${styles.aciklamaIkonCamgobegi}`} aria-hidden="true">
                        <IconMoney size={18} />
                    </span>
                    <span className={styles.aciklamaMetin}>
                        <span className={styles.aciklamaAd}>Arsa sahibinin payı</span>
                        <span className={styles.aciklamaAlt}>
                            Anlaşılan arsa payı %{landSharePercent}
                        </span>
                    </span>
                    <span className={`${styles.aciklamaTutar}`}>{fmt(result?.Ma ?? null)}</span>
                </li>

                <li className={styles.aciklamaSatir}>
                    <span className={`${styles.aciklamaIkon} ${styles.aciklamaIkonYesil}`} aria-hidden="true">
                        <IconChevronRight size={18} />
                    </span>
                    <span className={styles.aciklamaMetin}>
                        <span className={styles.aciklamaAd}>Müteahhidin kazancı</span>
                        <span className={styles.aciklamaAlt}>
                            ‘{profitLabel}’ kazanç seviyesi · maliyetin{' '}
                            {profitMultiplier.toLocaleString('tr-TR', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                            })} katı
                            <button type="button" className={styles.aciklamaDegistir} onClick={onKarDegistir}>
                                · değiştir
                            </button>
                        </span>
                    </span>
                    <span className={`${styles.aciklamaTutar}`}>{fmt(muteahhitKazanci)}</span>
                </li>
            </ol>

            <div className={styles.aciklamaToplam}>
                <span className={styles.aciklamaToplamAd}>Toplam · satış fiyatı</span>
                <span className={`${styles.aciklamaToplamTutar}`}>{fmt(result?.FD_total ?? null)}</span>
            </div>

            <div className={styles.muhendisSatir}>
                <span className={styles.muhendisEtiket}>Mühendis görünümü</span>
                <button
                    type="button"
                    role="switch"
                    aria-checked={muhendisGorunumu}
                    aria-label="Mühendis görünümü"
                    className={`${styles.anahtar} ${muhendisGorunumu ? styles.anahtarAcik : ''}`}
                    onClick={degistir}
                >
                    <span className={styles.anahtarTopu} />
                </button>
            </div>

            {muhendisGorunumu && <HesapFisi result={result} />}
        </section>
    );
}
