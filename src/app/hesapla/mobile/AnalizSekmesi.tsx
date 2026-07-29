"use client";

import { CostBreakdownChart } from '@/components/charts/CostBreakdownChart';
import { SensitivityChart } from '@/components/charts/SensitivityChart';
import { BreakEvenChart } from '@/components/charts/BreakEvenChart';
import type { CalculationInput, CalculationOutput } from '@/lib/calculator/engine_v2';
import styles from './mobile.module.css';

// Hesap/Analiz sekme seridi ve onun tip/bileseni Task 6'da kaldirildi:
// analiz artik `HesaplaMobile`de etiketli bir "Kapat" satiriyla acilip
// kapanan bir derinlestirme yapragi, sekme degil (spec K4/K5 — tek kapi).
// Gecmisi icin bkz. bu commit'ten onceki hal.

export type AnalizSekmesiProps = {
    result: CalculationOutput | null;
    /** Grafiklerin ortak girdisi — `page.tsx`te TEK yerde kuruluyor. */
    baseInput: CalculationInput;
    /** Kirilma noktasi grafiginin karsilastirma cizgisi. */
    marketPrice: number;
};

/**
 * `4n` analiz sekmesi (tasarim kaynagi:
 * docs/tasarim/mobil-2026-07-28/kartlar/4n.html).
 *
 * Mevcut grafik bilesenleri cam kartlar icinde yeniden kullanilir; grafik
 * mantigi KOPYALANMAZ. `baseInput` masaustuyle ayni nesnedir, yani
 * `globalUnitPrice` gibi degerler iki gorunumde ayrisamaz.
 */
export function AnalizSekmesi({ result, baseInput, marketPrice }: AnalizSekmesiProps) {
    if (!result) {
        return (
            <section className={styles.analizBos}>
                <p className={styles.analizBosMetin}>
                    Hesap sonucu oluşunca grafikler burada görünecek. Girdileri
                    tamamlayıp sonucun hesaplanmasını bekleyin.
                </p>
            </section>
        );
    }

    return (
        <div className={styles.analizGovde}>
            <section className={styles.analizKart} role="group" aria-label="Maliyet dağılımı">
                <h3 className={styles.analizBaslik}>Maliyet dağılımı</h3>
                <CostBreakdownChart
                    constructionCost={result.Mi_base + result.Mz}
                    landValue={result.Ma}
                    profit={result.FD_total - result.M}
                    risk={result.Mi - result.Mi_base - result.Mz}
                />
            </section>

            <section className={styles.analizKart} role="group" aria-label="Hassasiyet">
                <h3 className={styles.analizBaslik}>Hassasiyet</h3>
                <SensitivityChart baseInput={baseInput} />
            </section>

            <section className={styles.analizKart} role="group" aria-label="Kırılma noktası">
                <h3 className={styles.analizBaslik}>Kırılma noktası</h3>
                <BreakEvenChart baseInput={baseInput} marketPrice={marketPrice} />
            </section>
        </div>
    );
}
