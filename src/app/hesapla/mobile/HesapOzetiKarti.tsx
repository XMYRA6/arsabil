"use client";

import { useState } from 'react';
import type { CalculationOutput } from '@/lib/calculator/engine_v2';
import styles from './sonucArazi.module.css';

export type HesapOzetiKartiProps = {
    result: CalculationOutput | null;
    /** "Sonuç Detayı" yaprağını açar — Hesap Fişi + grafikler. */
    onSonucDetayiAc: () => void;
};

type Sekme = 'dagilim' | 'analiz' | 'finans';

const SEKMELER: { id: Sekme; etiket: string }[] = [
    { id: 'dagilim', etiket: 'Dağılım' },
    { id: 'analiz', etiket: 'Analiz' },
    { id: 'finans', etiket: 'Finans' },
];

const trFormat = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 });
const tl = (n: number) => `${trFormat.format(Math.round(n))} ₺`;

/**
 * Hesap özeti — Figma 05 · Hesapla Mobil 390 (2045:109): Dağılım / Analiz /
 * Finans sekmeleri. Dağılım satış gelirini (FD_total) dört kalemde böler:
 * inşaat, arsa, kâr, risk. Veri motor çıktısından türetilir, ayrı hesap yok.
 */
export function HesapOzetiKarti({ result, onSonucDetayiAc }: HesapOzetiKartiProps) {
    const [sekme, setSekme] = useState<Sekme>('dagilim');

    if (!result) return null;

    const toplamGelir = result.FD_total;
    const risk = Math.max(result.Mi - result.Mi_base - result.Mz, 0);
    const insaat = Math.max(result.Mi - risk, 0);
    const arsa = Math.max(result.Ma, 0);
    const kar = Math.max(result.FD_total - result.M, 0);

    const kalemler = [
        { ad: 'İnşaat', tutar: insaat, renk: 'var(--blue)' },
        { ad: 'Arsa', tutar: arsa, renk: 'var(--sage)' },
        { ad: 'Kâr', tutar: kar, renk: 'var(--amber)' },
        { ad: 'Risk', tutar: risk, renk: 'var(--bad)' },
    ];
    const pay = (t: number) => (toplamGelir > 0 ? Math.round((t / toplamGelir) * 100) : 0);
    const katsayi = result.M > 0 ? result.FD_total / result.M : 0;

    return (
        <section className={styles.kart} aria-label="Hesap özeti">
            <div className={styles.kartBaslikSatir}>
                <h2 className={styles.kartBaslik}>Hesap özeti</h2>
                <div className={styles.segmentSerit} role="tablist" aria-label="Hesap özeti görünümü">
                    {SEKMELER.map(s => (
                        <button
                            key={s.id}
                            type="button"
                            role="tab"
                            aria-selected={sekme === s.id}
                            className={`${styles.segmentSecenek} ${sekme === s.id ? styles.segmentSecili : ''}`}
                            onClick={() => setSekme(s.id)}
                        >
                            {s.etiket}
                        </button>
                    ))}
                </div>
            </div>

            {sekme === 'dagilim' && (
                <>
                    <div className={styles.dagilimBar} role="img" aria-label="Maliyet dağılımı">
                        {kalemler.filter(k => k.tutar > 0).map(k => (
                            <span
                                key={k.ad}
                                className={styles.dagilimDilim}
                                style={{ flex: k.tutar, background: k.renk }}
                            />
                        ))}
                    </div>
                    <div className={styles.lejant}>
                        {kalemler.map(k => (
                            <span key={k.ad} className={styles.lejantSatir}>
                                <span className={styles.lejantNokta} style={{ background: k.renk }} />
                                {k.ad} %{pay(k.tutar)}
                            </span>
                        ))}
                    </div>
                </>
            )}

            {sekme === 'analiz' && (
                <>
                    <dl className={styles.satirlar}>
                        <div className={styles.satir}><dt>Toplam maliyet</dt><dd>{tl(result.M)}</dd></div>
                        <div className={styles.satir}><dt>Kâr katsayısı</dt><dd>× {katsayi.toFixed(2).replace('.', ',')}</dd></div>
                        <div className={styles.satir}><dt>Min. daire fiyatı</dt><dd>{tl(result.FD_total)}</dd></div>
                    </dl>
                    <button type="button" className={styles.baglantiBtn} onClick={onSonucDetayiAc}>
                        Hesap fişi ve grafikler ›
                    </button>
                </>
            )}

            {sekme === 'finans' && (
                <>
                    <dl className={styles.satirlar}>
                        <div className={styles.satir}><dt>Toplam yatırım</dt><dd>{tl(result.M)}</dd></div>
                        <div className={styles.satir}><dt>Toplam gelir</dt><dd>{tl(result.FD_total)}</dd></div>
                        <div className={styles.satir}><dt>Kâr</dt><dd>{tl(result.FD_total - result.M)}</dd></div>
                    </dl>
                    <button type="button" className={styles.baglantiBtn} onClick={onSonucDetayiAc}>
                        Hesap fişi ve grafikler ›
                    </button>
                </>
            )}
        </section>
    );
}
