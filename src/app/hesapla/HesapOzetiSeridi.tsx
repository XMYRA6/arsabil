"use client";

import styles from './page.module.css';
import { SealBadge } from './SealBadge';

export interface HesapOzetiSeridiProps {
  fdTotal: number | undefined;
  isApartmentCountEnabled: boolean;
  effectiveLandSharePercent: number;
  ownerApartmentShare: number;
  totalApartments: number;
  manualMarketPrice: string;
  onMarketPriceChange: (value: string) => void;
  marketPriceNum: number;
}

/** Her zaman görünür özet şerit — masaüstünde sticky, mobilde normal blok (bkz. spec 2026-07-24). */
export function HesapOzetiSeridi({
  fdTotal,
  isApartmentCountEnabled,
  effectiveLandSharePercent,
  ownerApartmentShare,
  totalApartments,
  manualMarketPrice,
  onMarketPriceChange,
  marketPriceNum,
}: HesapOzetiSeridiProps) {
  const showCheaper = marketPriceNum > 0 && !!fdTotal && marketPriceNum > fdTotal;
  const showPricier = marketPriceNum > 0 && !!fdTotal && marketPriceNum < fdTotal;

  return (
    <div className={styles.hesapOzetiSeridi}>
      <div className={styles.hesapOzetiFiyat}>
        {fdTotal ? `${Math.round(fdTotal).toLocaleString('tr-TR')} TL` : '---'}
      </div>
      <div className={styles.hesapOzetiArsaPayi}>
        Arsa Payı: <strong>%{Math.round(effectiveLandSharePercent)}</strong>
        {isApartmentCountEnabled && (
          <span className={styles.hesapOzetiArsaPayiDetay}> ({ownerApartmentShare}/{totalApartments} daire)</span>
        )}
      </div>
      <div className={styles.hesapOzetiPiyasa}>
        <label htmlFor="hesapOzetiPiyasaInput">Piyasa Fiyatı:</label>
        <input
          id="hesapOzetiPiyasaInput"
          type="text"
          value={manualMarketPrice}
          onChange={(e) => onMarketPriceChange(e.target.value)}
          placeholder="gir (opsiyonel)"
          className={styles.hesapOzetiPiyasaInput}
        />
      </div>
      <SealBadge
        show={showCheaper}
        percentage={fdTotal ? Math.round(((marketPriceNum - fdTotal) / marketPriceNum) * 100) : 0}
        variant="cheaper"
      />
      <SealBadge
        show={showPricier}
        percentage={fdTotal ? Math.round(((fdTotal - marketPriceNum) / marketPriceNum) * 100) : 0}
        variant="pricier"
      />
    </div>
  );
}
