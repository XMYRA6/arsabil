"use client";

import { useState } from 'react';
import { SensitivityChart } from '@/components/charts/SensitivityChart';
import { BreakEvenChart } from '@/components/charts/BreakEvenChart';
import { FinancialDashboard } from '@/components/FinancialDashboard';
import type { CalculationInput, CalculationOutput } from '@/lib/calculator/engine_v2';
import styles from './masaustu.module.css';

export type HesapOzetiPaneliProps = {
    result: CalculationOutput | null;
    hasEnoughDataForResult: boolean;
    chartBaseInput: CalculationInput;
    marketPriceNum: number;
};

type Sekme = 'dagilim' | 'analiz' | 'finans';

const SEKMELER: { id: Sekme; etiket: string }[] = [
    { id: 'dagilim', etiket: 'Dağılım' },
    { id: 'analiz', etiket: 'Analiz' },
    { id: 'finans', etiket: 'Finans' },
];

const tl0 = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 });
const tl = (n: number) => `${tl0.format(Math.round(n))} ₺`;

const BEKLENIYOR = 'Hesap sonucu oluşunca grafikler burada görünecek. Girdileri tamamlayıp sonucun hesaplanmasını bekleyin.';

/**
 * Masaüstü "Hesap özeti" + "Hassasiyet ve kırılma noktası" — Figma 05 ·
 * Hesapla Masaüstü 1440. Dağılım, satış gelirini (FD_total) dört kalemde
 * böler; Analiz/Finans sekmeleri mobil kartla aynı veriyi gösterir.
 */
export function HesapOzetiPaneli({ result, hasEnoughDataForResult, chartBaseInput, marketPriceNum }: HesapOzetiPaneliProps) {
    const [sekme, setSekme] = useState<Sekme>('dagilim');
    const hazir = hasEnoughDataForResult && result !== null;

    const gelir = result?.FD_total ?? 0;
    const risk = result ? Math.max(result.Mi - result.Mi_base - result.Mz, 0) : 0;
    const kalemler = result ? [
        { ad: 'İnşaat', tutar: Math.max(result.Mi - risk, 0), renk: 'var(--blue)' },
        { ad: 'Arsa', tutar: Math.max(result.Ma, 0), renk: 'var(--sage)' },
        { ad: 'Kâr', tutar: Math.max(result.FD_total - result.M, 0), renk: 'var(--amber)' },
        { ad: 'Risk', tutar: risk, renk: 'var(--bad)' },
    ] : [];
    const pay = (t: number) => (gelir > 0 ? Math.round((t / gelir) * 100) : 0);
    const katsayi = result && result.M > 0 ? result.FD_total / result.M : 0;

    return (
        <>
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

                {!hazir ? (
                    <p className={styles.bosMetin}>{result ? BEKLENIYOR : 'Hesaplama bekleniyor...'}</p>
                ) : sekme === 'dagilim' ? (
                    <>
                        <div className={styles.dagilimBar} role="img" aria-label="Maliyet dağılımı">
                            {kalemler.filter(k => k.tutar > 0).map(k => (
                                <span key={k.ad} className={styles.dagilimDilim} style={{ flex: k.tutar, background: k.renk }} />
                            ))}
                        </div>
                        <div className={styles.lejant}>
                            {kalemler.map(k => (
                                <div key={k.ad} className={styles.lejantKalem}>
                                    <span className={styles.lejantBaslik}>
                                        <span className={styles.lejantNokta} style={{ background: k.renk }} />
                                        {k.ad} %{pay(k.tutar)}
                                    </span>
                                    <span>{tl(k.tutar)}</span>
                                </div>
                            ))}
                        </div>
                    </>
                ) : sekme === 'analiz' ? (
                    <dl className={styles.fisSatirlar}>
                        <div className={styles.fisSatir}><dt>Toplam maliyet</dt><dd>{tl(result.M)}</dd></div>
                        <div className={styles.fisSatir}><dt>Kâr katsayısı</dt><dd>× {katsayi.toFixed(2).replace('.', ',')}</dd></div>
                        <div className={styles.fisSatir}><dt>Min. daire fiyatı</dt><dd>{tl(result.FD_total)}</dd></div>
                    </dl>
                ) : (
                    <FinancialDashboard totalInvestment={result.M} totalRevenue={result.FD_total} />
                )}
            </section>

            <section className={styles.kart} aria-label="Hassasiyet ve kırılma noktası">
                <div className={styles.kartBaslikSatir}>
                    <h2 className={styles.kartBaslik}>Hassasiyet ve kırılma noktası</h2>
                    <span className={styles.grafikAciklama}>Arsa payı × müteahhit kârı</span>
                </div>
                {hazir ? (
                    <>
                        <div className={styles.grafikBlok}>
                            <SensitivityChart baseInput={chartBaseInput} />
                        </div>
                        <div className={`${styles.grafikBlok} ${styles.grafikAyrac}`}>
                            <BreakEvenChart baseInput={chartBaseInput} marketPrice={marketPriceNum} />
                        </div>
                    </>
                ) : (
                    <p className={styles.bosMetin}>{BEKLENIYOR}</p>
                )}
            </section>
        </>
    );
}
