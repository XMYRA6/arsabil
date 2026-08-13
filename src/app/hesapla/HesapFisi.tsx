"use client";

import styles from './page.module.css';
import { CalculationOutput } from '@/lib/calculator/engine_v2';
import { formatTRCurrency } from './trNumberFormat';

export interface HesapFisiProps {
  result: CalculationOutput | null;
}

/** Her zaman açık hesap dökümü — izlenebilirlik = güven (bkz. spec 2026-07-24). */
export function HesapFisi({ result }: HesapFisiProps) {
  const fmtRate = (n: number) => Math.round(n).toLocaleString('tr-TR');
  // K (kâr katsayısı) CalculationOutput'ta ayrı bir alan olarak yok (engine_v2 dondurulmuş,
  // kapsam dışı); FD_total = M * K olduğundan izlenebilirlik için orandan türetiliyor.
  const kMultiplier = result && result.M > 0 ? result.FD_total / result.M : null;

  return (
    <div className={styles.hesapFisi}>
      <div className={styles.hesapFisiRow}>
        <span className={styles.hesapFisiRowLabel}>İnşaat Maliyeti (Mi)</span>
        <span>{result ? formatTRCurrency(result.Mi) : '—'}</span>
      </div>
      <div className={styles.hesapFisiRow}>
        <span className={styles.hesapFisiRowLabel}>Arsa Maliyeti (Ma)</span>
        <span>{result ? formatTRCurrency(result.Ma) : '—'}</span>
      </div>
      <div className={`${styles.hesapFisiRow} ${styles.hesapFisiRowTotal}`}>
        <span className={styles.hesapFisiRowLabel}>Toplam Maliyet (M)</span>
        <span>{result ? formatTRCurrency(result.M) : '—'}</span>
      </div>
      <div className={styles.hesapFisiRow}>
        <span className={styles.hesapFisiRowLabel}>× Kâr Katsayısı (K)</span>
        <span>{kMultiplier !== null ? `× ${kMultiplier.toFixed(2)}` : '—'}</span>
      </div>
      <div className={styles.hesapFisiRow}>
        <span className={styles.hesapFisiRowLabel}>Min. Daire Fiyatı (FD)</span>
        <span>{result ? formatTRCurrency(result.FD_total) : '—'}</span>
      </div>
      <div className={styles.hesapFisiRow}>
        <span className={styles.hesapFisiRowLabel}>Daire Birim (FDbirim)</span>
        <span>{result ? `${fmtRate(result.FD_per_m2)} TL/m²` : '—'}</span>
      </div>
      {result?.FA != null && (
        <div className={`${styles.hesapFisiRow} ${styles.hesapFisiRowTotal}`}>
          {/* "Min." — FA piyasa degeri DEGIL, hesaplanan minimum daire
              fiyatina (FD_total) dayali (denetim bulgusu C5). Ayni gerekce
              "Min. Daire Fiyatı (FD)" satırıyla. */}
          <span className={styles.hesapFisiRowLabel}>Min. Arsa Fiyatı (FA)</span>
          <span>{formatTRCurrency(result.FA)}</span>
        </div>
      )}
    </div>
  );
}
