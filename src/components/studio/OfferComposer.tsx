'use client';

import { useState, useEffect } from 'react';
import styles from './OfferComposer.module.css';

export type OfferComposerValue = {
  unitCount: number;
  cashTl: number;
};

export type OfferComposerProps = {
  value: OfferComposerValue | null;
  onApply: (value: OfferComposerValue) => void;
  onClear: () => void;
};

/**
 * Ozel teklif girdisi — mevcut (Faz 2) `createLandownerOfferOptions`
 * fonksiyonunun `customOverride: { unitCount, cashTl }` parametresine
 * BIREBIR eslenir. Envanterden bagimsiz bolum secimi bu fazda YOK
 * (Faz 2B Re-scope Notu) — bu yuzden burada yalnizca iki sayisal alan var.
 */
export function OfferComposer({ value, onApply, onClear }: OfferComposerProps) {
  const [unitCount, setUnitCount] = useState(value?.unitCount ?? 0);
  const [cashTl, setCashTl] = useState(value?.cashTl ?? 0);

  useEffect(() => {
    setUnitCount(value?.unitCount ?? 0);
    setCashTl(value?.cashTl ?? 0);
  }, [value]);

  return (
    <div className={styles.composer}>
      <label className={styles.alan}>
        <span>Daire sayısı</span>
        <input
          type="number"
          className={styles.girdi}
          value={unitCount}
          onChange={(event) => setUnitCount(Number(event.target.value))}
        />
      </label>
      <label className={styles.alan}>
        <span>Nakit tutarı (TL)</span>
        <input
          type="number"
          className={styles.girdi}
          value={cashTl}
          onChange={(event) => setCashTl(Number(event.target.value))}
        />
      </label>
      <div className={styles.butonlar}>
        <button
          type="button"
          className={styles.uygulaBtn}
          onClick={() => onApply({ unitCount, cashTl })}
        >
          Uygula
        </button>
        {value && (
          <button type="button" className={styles.kaldirBtn} onClick={onClear}>
            Kaldır
          </button>
        )}
      </div>
    </div>
  );
}
