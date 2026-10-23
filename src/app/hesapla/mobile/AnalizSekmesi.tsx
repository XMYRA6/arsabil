"use client";

import { SensitivityChart } from '@/components/charts/SensitivityChart';
import { BreakEvenChart } from '@/components/charts/BreakEvenChart';
import { FinancialDashboard } from '@/components/FinancialDashboard';
import type { CalculationInput, CalculationOutput } from '@/lib/calculator/engine_v2';
import styles from './sonucDetay.module.css';

// `4n` analiz paneli — Task 2 (2026-08-23): baslik ve Kapat butonu kaldirildı.
// Bu veri artık Task 3'te FiyatAciklamasi'nin "Özet" sekmesi ile
// birleştirilecek (her ikisi de aynı maliyet dağılımı bilgisini gösteriyordu —
// kopyalanma kaldırıldı). Üst bileşen (Task 3) birleştirilmiş yaprakta sekme
// başlıklarını ve kapatma affordance'ını sağlar.

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
            <section className={styles.bos}>
                <p className={styles.bosMetin}>
                    Hesap sonucu oluşunca grafikler burada görünecek. Girdileri
                    tamamlayıp sonucun hesaplanmasını bekleyin.
                </p>
            </section>
        );
    }

    return (
        <div className={styles.grafikGovde}>
            <section className={styles.grafikKart} role="group" aria-label="Hassasiyet">
                <h3 className={styles.gizliBaslik}>Hassasiyet</h3>
                <SensitivityChart baseInput={baseInput} />
            </section>

            <section className={styles.grafikKart} role="group" aria-label="Kırılma noktası">
                <h3 className={styles.gizliBaslik}>Kırılma noktası</h3>
                <BreakEvenChart baseInput={baseInput} marketPrice={marketPrice} />
            </section>

            {/* Maks. sürdürülebilir arsa payı — yalnız piyasa fiyatı girilmişse
                motor `x_max` döndürür (masaüstüyle aynı; denetim bulgusu C6'nın
                mobil karşılığı). */}
            {result.x_max != null && (
                <section className={styles.grafikKart} role="group" aria-label="Maksimum sürdürülebilir arsa payı">
                    <h3 className={styles.grafikBaslik}>Maks. Sürdürülebilir Arsa Payı</h3>
                    {result.x_max >= 0 ? (
                        <>
                            <div className={styles.xmaxDeger}>%{(result.x_max * 100).toFixed(1)}</div>
                            <p className={styles.xmaxAlt}>
                                Kâr hedefini koruyarak verilebilecek en yüksek pay
                            </p>
                        </>
                    ) : (
                        <p className={styles.xmaxAlt}>
                            Bu birim maliyet ve kâr hedefiyle, girilen piyasa fiyatında proje mümkün
                            değil (maliyet piyasa fiyatını aşıyor).
                        </p>
                    )}
                </section>
            )}

            <section className={styles.grafikKart} role="group" aria-label="Finansal özet">
                <h3 className={styles.gizliBaslik}>Finansal özet</h3>
                <FinancialDashboard totalInvestment={result.M} totalRevenue={result.FD_total} />
            </section>
        </div>
    );
}
