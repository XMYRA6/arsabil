"use client";

import styles from './page.module.css';
import { CalculationOutput } from '@/lib/calculator/engine_v2';

export interface HesapFisiProps {
  result: CalculationOutput | null;
}

/** Her zaman açık hesap dökümü — izlenebilirlik = güven (bkz. spec 2026-07-24). */
export function HesapFisi({ result }: HesapFisiProps) {
  const fmt = (n: number) => Math.round(n).toLocaleString('tr-TR');

  return (
    <div className={styles.hesapFisi}>
      <div className={styles.hesapFisiRow}>
        <span className={styles.hesapFisiRowLabel}>İnşaat Maliyeti (Mi)</span>
        <span>{result ? `${fmt(result.Mi)} TL` : '—'}</span>
      </div>
      <div className={styles.hesapFisiRow}>
        <span className={styles.hesapFisiRowLabel}>Arsa Maliyeti (Ma)</span>
        <span>{result ? `${fmt(result.Ma)} TL` : '—'}</span>
      </div>
      <div className={`${styles.hesapFisiRow} ${styles.hesapFisiRowTotal}`}>
        <span className={styles.hesapFisiRowLabel}>Toplam Maliyet (M)</span>
        <span>{result ? `${fmt(result.M)} TL` : '—'}</span>
      </div>
      <div className={styles.hesapFisiRow}>
        <span className={styles.hesapFisiRowLabel}>Daire Fiyatı (FD)</span>
        <span>{result ? `${fmt(result.FD_total)} TL` : '—'}</span>
      </div>
      <div className={styles.hesapFisiRow}>
        <span className={styles.hesapFisiRowLabel}>Daire Birim (FDbirim)</span>
        <span>{result ? `${fmt(result.FD_per_m2)} TL/m²` : '—'}</span>
      </div>
      {result?.FA != null && (
        <div className={`${styles.hesapFisiRow} ${styles.hesapFisiRowTotal}`}>
          <span className={styles.hesapFisiRowLabel}>Arsa Fiyatı (FA)</span>
          <span>{`${fmt(result.FA)} TL`}</span>
        </div>
      )}
    </div>
  );
}
