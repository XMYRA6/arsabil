"use client";

import { useState } from 'react';
import { HesapFisi } from '../HesapFisi';
import type { CalculationOutput } from '@/lib/calculator/engine_v2';
import styles from './sonucDetay.module.css';

export type FiyatAciklamasiProps = {
    result: CalculationOutput | null;
    apartmentSize: number | null;
    unitPrice: number | null;
    landSharePercent: number;
    /** Kazanc seviyesi etiketi, orn. "Orta". */
    profitLabel: string;
    /** Kar carpani, orn. 1.30. */
    profitMultiplier: number;
    /** `4f` yapragini kar bolumunde acar. */
    onKarDegistir: () => void;
};

const MUHENDIS_ANAHTARI = 'arsabil-engineer-view';

const trFormat = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 });

function fmt(n: number | null): string {
    return n === null ? '—' : trFormat.format(n);
}

/** Tutarlar tam lira olarak gösterilir (kuruş mobilde gürültü): "2.352.000 ₺". */
function fmtTutar(n: number | null): string {
    return n === null ? '—' : `${trFormat.format(n)} ₺`;
}

/**
 * "Bu fiyat nereden geliyor?" — Sonuç Detayı > Özet sekmesi.
 *
 * Satırlar motorun çıktısından TÜRETİLİR, motor DEĞİŞMEZ:
 *   inşaat = Mi · arsa sahibinin payı = Ma · müteahhidin kazancı = FD_total − M
 *   toplam = FD_total
 * Üstteki oransal çubuk bu üç kalemin toplam içindeki payını gösterir.
 *
 * "Mühendis görünümü" açıkken mevcut `HesapFisi` bileşeni render edilir —
 * sembolik gösterim KOPYALANMAZ, tek kaynak odur.
 */
export function FiyatAciklamasi({
    result,
    apartmentSize,
    unitPrice,
    landSharePercent,
    profitLabel,
    profitMultiplier,
    onKarDegistir,
}: FiyatAciklamasiProps) {
    // Tercih localStorage'da yaşar ve DOĞRUDAN başlangıç değerinde okunur.
    // Hydration uyuşmazlığı riski YOK: bu bileşen sunucuda hiç render edilmez
    // (`page.tsx` viewport ölçülene kadar nötr bir iskelet döner).
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

    const insaat = result?.Mi ?? null;
    const arsa = result?.Ma ?? null;
    const kazanc = result ? result.FD_total - result.M : null;
    const toplam = result?.FD_total ?? null;

    const pay = (n: number | null) =>
        n !== null && toplam ? Math.max(0, Math.round((n / toplam) * 100)) : null;

    const kalemler = [
        {
            anahtar: 'insaat',
            renk: styles.renkInsaat,
            ad: 'Daireyi inşa etmek',
            alt: <>{fmt(apartmentSize)} m² × {fmt(unitPrice)} TL/m²</>,
            tutar: insaat,
        },
        {
            anahtar: 'arsa',
            renk: styles.renkArsa,
            ad: 'Arsa sahibinin payı',
            alt: <>Anlaşılan arsa payı %{landSharePercent}</>,
            tutar: arsa,
        },
        {
            anahtar: 'kazanc',
            renk: styles.renkKazanc,
            ad: 'Müteahhidin kazancı',
            alt: (
                <>
                    ‘{profitLabel}’ kazanç seviyesi · maliyetin{' '}
                    {profitMultiplier.toLocaleString('tr-TR', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                    })} katı
                </>
            ),
            tutar: kazanc,
        },
    ];

    return (
        <section className={styles.kok} aria-label="Bu fiyat nereden geliyor?">
            <div className={styles.ozet}>
                <span className={styles.ozetEtiket}>Toplam · satış fiyatı</span>
                <span className={styles.ozetTutar}>{fmtTutar(toplam)}</span>
                {toplam !== null && (
                    <div className={styles.cubuk} role="img" aria-label="Maliyet dağılımı">
                        {kalemler.map(k => (
                            <span
                                key={k.anahtar}
                                className={`${styles.cubukParca} ${k.renk}`}
                                style={{ width: `${pay(k.tutar) ?? 0}%` }}
                            />
                        ))}
                    </div>
                )}
            </div>

            <ol className={styles.liste}>
                {kalemler.map(k => (
                    <li key={k.anahtar} className={styles.satir}>
                        <span className={`${styles.nokta} ${k.renk}`} aria-hidden="true" />
                        <span className={styles.metin}>
                            <span className={styles.ad}>{k.ad}</span>
                            <span className={styles.alt}>{k.alt}</span>
                            {k.anahtar === 'kazanc' && (
                                <button type="button" className={styles.degistir} onClick={onKarDegistir}>
                                    Kazanç seviyesini değiştir
                                </button>
                            )}
                        </span>
                        <span className={styles.sag}>
                            <span className={styles.tutar}>{fmtTutar(k.tutar)}</span>
                            {pay(k.tutar) !== null && <span className={styles.yuzde}>%{pay(k.tutar)}</span>}
                        </span>
                    </li>
                ))}
            </ol>

            <div className={styles.muhendisSatir}>
                <span className={styles.muhendisMetin}>
                    <span className={styles.ad}>Mühendis görünümü</span>
                    <span className={styles.alt}>Formül ve sembolleri (M, Mi, Ma, FD_total) gösterir.</span>
                </span>
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
