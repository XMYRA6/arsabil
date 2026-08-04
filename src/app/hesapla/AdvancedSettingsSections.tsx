"use client";

import React, { useState } from 'react';
import styles from './page.module.css';
import { Toggle } from '@/components/ui/Toggle';
import { RangeSlider } from '@/components/ui/RangeSlider';
import { kaynakEtiketi, type BirimMaliyetKaynagi } from './mobile/unitPriceSource';

interface ProfitLevel {
  id: string;
  label: string;
  value: number;
  sortOrder: number;
  isDefault: boolean;
}

export interface DaireSayisiProps {
  isApartmentCountEnabled: boolean;
  setIsApartmentCountEnabled: (v: boolean) => void;
  totalApartments: number;
  setTotalApartments: React.Dispatch<React.SetStateAction<number>>;
  ownerApartmentShare: number;
  setOwnerApartmentShare: React.Dispatch<React.SetStateAction<number>>;
}

/** "Toplam Daire Sayısı" ve "Arsa Sahibine Düşen Daire" kontrolleri — yalnızca girdi kartına ait (A1 I4). */
export function DaireSayisiFields({
  isApartmentCountEnabled, setIsApartmentCountEnabled,
  totalApartments, setTotalApartments,
  ownerApartmentShare, setOwnerApartmentShare,
}: DaireSayisiProps) {
  return (
    <div className={`${styles.drawerRow} ${styles.column}`}>
      <div className={styles.drawerRowHead}>
        <div className={`${styles.drawerRowLabel} ${styles.drawerRowLabelNowrap}`}>Toplam Daire Sayısı</div>
        <div className={styles.drawerToggleWrap}>
          <Toggle checked={isApartmentCountEnabled} onChange={(e) => setIsApartmentCountEnabled(e.target.checked)} />
        </div>
      </div>
      {isApartmentCountEnabled && (
        <>
          <div className={`${styles.stepperInput} ${styles.stepperFull}`}>
            <input type="number" value={totalApartments} onChange={(e) => setTotalApartments(Number(e.target.value))} />
            <div className={styles.stepperRight}>
              <span>daire</span>
              <button onClick={() => setTotalApartments(p => Math.max(1, p - 1))}>−</button>
              <button onClick={() => setTotalApartments(p => p + 1)}>+</button>
            </div>
          </div>
          <RangeSlider
            label="Arsa Sahibine Düşen Daire"
            min={0}
            max={totalApartments}
            step={1}
            value={ownerApartmentShare}
            unit="daire"
            onChange={(e) => setOwnerApartmentShare(Number(e.target.value))}
          />
        </>
      )}
    </div>
  );
}

export interface ArsaAlaniProps {
  isAaEnabled: boolean;
  setIsAaEnabled: (v: boolean) => void;
  arsaAlani: number;
  setArsaAlani: React.Dispatch<React.SetStateAction<number>>;
}

/** "Arsa Alanı (m²)" kontrolü — hem girdi kartı hem drawer/yaprak paylaşır. */
export function ArsaAlaniFields({
  isAaEnabled, setIsAaEnabled,
  arsaAlani, setArsaAlani,
}: ArsaAlaniProps) {
  return (
    <div className={`${styles.drawerRow} ${styles.column}`}>
      <div className={styles.drawerRowHead}>
        <div className={`${styles.drawerRowLabel} ${styles.drawerRowLabelNowrap}`}>Arsa Alanı (m²)</div>
        <div className={styles.drawerToggleWrap}>
          <Toggle checked={isAaEnabled} onChange={(e) => setIsAaEnabled(e.target.checked)} />
        </div>
      </div>
      {isAaEnabled && (
        <div className={`${styles.stepperInput} ${styles.stepperFull}`}>
          <input type="number" value={arsaAlani} onChange={(e) => setArsaAlani(Number(e.target.value))} />
          <div className={styles.stepperRight}>
            <span>m²</span>
            <button onClick={() => setArsaAlani(p => Math.max(10, p - 10))}>−</button>
            <button onClick={() => setArsaAlani(p => p + 10)}>+</button>
          </div>
        </div>
      )}
    </div>
  );
}

export interface FormulParamsProps extends DaireSayisiProps, ArsaAlaniProps {}

/**
 * Drawer "Formül Parametreleri" kartının içeriği (kart sarmalayıcısı hariç).
 *
 * SADELESTIRMEYIN. Bu sarmalayici, mobil yaprak yalnizca arsa alani kismini
 * kullanabilsin diye bilesen ikiye ayrildiginda korundu (A1 I4). Masaustu
 * cekmecesi bunu cagirmaya devam ediyor ve ciktisinin bugunkuyle AYNI kalmasi
 * bir kisittir: `DaireSayisiFields` sonra `ArsaAlaniFields`, bu SIRAYLA.
 * Inline etmek ya da sirayi degistirmek masaustu duzenini sessizce bozar ve
 * bunu yakalayan bir test YOK.
 */
export function FormulParamsFields(props: FormulParamsProps) {
  return (
    <>
      <DaireSayisiFields
        isApartmentCountEnabled={props.isApartmentCountEnabled}
        setIsApartmentCountEnabled={props.setIsApartmentCountEnabled}
        totalApartments={props.totalApartments}
        setTotalApartments={props.setTotalApartments}
        ownerApartmentShare={props.ownerApartmentShare}
        setOwnerApartmentShare={props.setOwnerApartmentShare}
      />
      <ArsaAlaniFields
        isAaEnabled={props.isAaEnabled}
        setIsAaEnabled={props.setIsAaEnabled}
        arsaAlani={props.arsaAlani}
        setArsaAlani={props.setArsaAlani}
      />
    </>
  );
}

export interface RiskCostProps {
  iksaMode: 'off' | 'percentage' | 'manual';
  setIksaMode: (v: 'off' | 'percentage' | 'manual') => void;
  iksaPercentage: number;
  setIksaPercentage: (v: number) => void;
  iksaManualTL: number;
  setIksaManualTL: (v: number) => void;
  builderProfit: number;
  setBuilderProfit: (v: number) => void;
  profitLevels: ProfitLevel[];
}

/** Drawer "Proje Maliyet ve Riskleri" kartının içeriği. */
export function RiskCostFields({
  iksaMode, setIksaMode, iksaPercentage, setIksaPercentage,
  iksaManualTL, setIksaManualTL,
  builderProfit, setBuilderProfit, profitLevels,
}: RiskCostProps) {
  return (
    <>
      <div className={`${styles.drawerRow} ${styles.column}`}>
        <div className={styles.drawerRowLabel}>Müteahhit Kazancı</div>
        <div className={styles.luxGrid}>
          {profitLevels.map(opt => (
            <div key={opt.id} className={`${styles.luxBox} ${builderProfit === opt.value ? styles.luxBoxActive : ''}`} onClick={() => setBuilderProfit(opt.value)}>
              <span>{opt.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className={`${styles.drawerRow} ${styles.column}`}>
        <div className={styles.drawerRowLabel}>İksa Masrafı</div>
        <div className={styles.luxGrid}>
          {[
            { label: 'Yok', value: 'off' as const },
            { label: 'Yüzde', value: 'percentage' as const },
            { label: 'Elle', value: 'manual' as const },
          ].map(opt => (
            <div key={opt.label} className={`${styles.luxBox} ${iksaMode === opt.value ? styles.luxBoxActive : ''}`} onClick={() => setIksaMode(opt.value)}>
              <span>{opt.label}</span>
            </div>
          ))}
        </div>
        {iksaMode === 'percentage' && (
          <div className={`${styles.stepperInput} ${styles.stepperFixed}`}>
            <input type="number" value={iksaPercentage} min={0} max={100} onChange={(e) => setIksaPercentage(Number(e.target.value))} />
            <div className={styles.stepperRight}>
              <span className={styles.stepperUnitCenter}>%</span>
            </div>
          </div>
        )}
        {iksaMode === 'manual' && (
          <div className={`${styles.stepperInput} ${styles.stepperFixed}`}>
            <input type="number" value={iksaManualTL} min={0} onChange={(e) => setIksaManualTL(Number(e.target.value))} />
            <div className={styles.stepperRight}>
              <span className={styles.stepperUnitCenter}>TL</span>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export interface BirimMaliyetFieldProps {
  globalUnitPrice: number;
  birimMaliyetKaynagi: BirimMaliyetKaynagi;
  onBirimMaliyet: (v: number) => void;
}

/**
 * Masaustu "Piyasa Analizi" grubunun birim maliyet satiri (spec K1/K7,
 * 2026-07-30 masaustu gorunurluk gorevi).
 *
 * `globalUnitPrice` her zaman gecerli (>0) bir sayi tutar; ama kullanici
 * alani silip yeniden yazarken GECICI olarak bos/yarim bir metin gormeli.
 * Input dogrudan `globalUnitPrice`e baglansaydi (controlled), `Number('')
 * === 0` guard'ina takilir, deger hic degismez ve alan her silme/tus
 * vurusunda eski haline sessizce geri "sicrardi" (review Finding 2,
 * 2026-07-30 — brief'in orijinal kodu tam bu hatayi icериyordu). Yerel
 * `girdi` state'i bu sicramayi onler: ham metin HER ZAMAN gosterilir,
 * yalnizca gecerli (>0) bir sayi girildiginde ust bilesene commit edilir.
 *
 * Ayri bir bilesen olarak burada (page.tsx yerine) tanimlandi ki: (1) Next.js
 * `page.tsx` yalnizca `default` export'a izin verir (baska bir named export
 * tip hatasi verir), (2) bu arabellek mantigi `Home`in agir
 * bagimliliklarindan (fetch/useSession/matchMedia/Leaflet) BAGIMSIZ, izole
 * olarak test edilebilsin.
 */
export function BirimMaliyetField({ globalUnitPrice, birimMaliyetKaynagi, onBirimMaliyet }: BirimMaliyetFieldProps) {
  const [girdi, setGirdi] = useState<string>(String(globalUnitPrice));
  // Dis kaynakli degisiklikleri (ilce secimi, "elle" commit sonrasi geri
  // akan prop) render SIRASINDA yakalar — `useEffect` icinde setState
  // cagirmak ekstra bir commit dongusune yol acardi (eslint
  // `react-hooks/set-state-in-effect`); bu, React'in kendi onerdigi "prop
  // degisince state'i ayarla" deseni (bkz. react.dev "You Might Not Need
  // an Effect").
  const [oncekiFiyat, setOncekiFiyat] = useState(globalUnitPrice);
  if (globalUnitPrice !== oncekiFiyat) {
    setOncekiFiyat(globalUnitPrice);
    setGirdi(String(globalUnitPrice));
  }

  return (
    <div className={`${styles.drawerRow} ${styles.column}`}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--label-color)' }}>Birim inşaat maliyeti</span>
        <span style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 600 }}>{kaynakEtiketi(birimMaliyetKaynagi, globalUnitPrice)}</span>
      </div>
      <div className={styles.stepperInput}>
        <input
          type="number"
          min={0}
          step={100}
          value={girdi}
          aria-label="Birim inşaat maliyeti (TL/m²)"
          onChange={e => {
            const raw = e.target.value;
            setGirdi(raw);
            const v = Number(raw);
            if (Number.isFinite(v) && v > 0) {
              onBirimMaliyet(v);
            }
          }}
        />
        <div className={styles.stepperRight}>
          <span>TL/m²</span>
        </div>
      </div>
    </div>
  );
}

export interface MarketFieldProps {
  manualMarketPrice: string;
  setManualMarketPrice: (v: string) => void;
}

/** Drawer "Piyasa Analizi" kartının içeriği. */
export function MarketField({ manualMarketPrice, setManualMarketPrice }: MarketFieldProps) {
  return (
    <div className={`${styles.drawerRow} ${styles.column}`}>
      <div className={styles.drawerRowLabel}>Yaklaşık Piyasa Fiyatı</div>
      <div className={styles.stepperInput}>
        <input type="text" value={manualMarketPrice} onChange={(e) => setManualMarketPrice(e.target.value)} />
        <div className={styles.stepperRight}>
          <span className={styles.stepperUnitWide}>TL</span>
        </div>
      </div>
    </div>
  );
}
