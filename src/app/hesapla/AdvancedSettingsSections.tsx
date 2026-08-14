"use client";

import { useBufferedNumberInput } from './useBufferedNumberInput';
import { formatTRThousands } from './trNumberFormat';
import styles from './page.module.css';
import { kaynakEtiketi, type BirimMaliyetKaynagi } from './mobile/unitPriceSource';

interface ProfitLevel {
  id: string;
  label: string;
  value: number;
  sortOrder: number;
  isDefault: boolean;
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

/**
 * Muteahhit kazanci + iksa masrafi kontrolleri. Risk seviyesi burada DEGIL —
 * `SmartContextCard`a tasindi (2026-08-04 TKGM konsolidasyonu); isim
 * (`RiskCostFields`) ve cagiran taraflardaki "Maliyet ve riskler" etiketi
 * tarihsel, testlerin baglandigi degismez bir sozlesme oldugu icin
 * degistirilmedi.
 */
export function RiskCostFields({
  iksaMode, setIksaMode, iksaPercentage, setIksaPercentage,
  iksaManualTL, setIksaManualTL,
  builderProfit, setBuilderProfit, profitLevels,
}: RiskCostProps) {
  const { girdi: iksaManualGirdi, handleChange: handleIksaManualChange } =
    useBufferedNumberInput(iksaManualTL, setIksaManualTL);

  return (
    <>
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
            <input type="text" inputMode="decimal" value={iksaManualGirdi} onChange={(e) => handleIksaManualChange(e.target.value)} />
            <div className={styles.stepperRight}>
              <span className={styles.stepperUnitCenter}>TL</span>
            </div>
          </div>
        )}
      </div>

      <div className={`${styles.drawerRow} ${styles.column}`}>
        <div className={styles.drawerRowLabel}>Müteahhit Kazancı</div>
        {/* .luxGrid varsayilan 3 kolonlu (Iksa Masrafi/Daire Standardi ile
            paylasilan sabit grid) — kar kademesi "Zarar" tier'iyla (denetim
            taslagi §1/§13) 4'e cikinca kolon sayisi inline stille dinamik
            ayarlanir, diger 3-oge'li .luxGrid kullanimlari ETKILENMEZ. */}
        <div className={styles.luxGrid} style={{ gridTemplateColumns: `repeat(${profitLevels.length}, minmax(0, 1fr))` }}>
          {profitLevels.map(opt => (
            <div key={opt.id} className={`${styles.luxBox} ${builderProfit === opt.value ? styles.luxBoxActive : ''}`} onClick={() => setBuilderProfit(opt.value)}>
              <span>{opt.label}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

export interface BirimMaliyetFieldProps {
  globalUnitPrice: number | null;
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
  const { girdi, handleChange } = useBufferedNumberInput(globalUnitPrice, onBirimMaliyet);

  return (
    <div className={`${styles.drawerRow} ${styles.column}`}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--label-color)' }}>Birim inşaat maliyeti</span>
        <span style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 600 }}>{kaynakEtiketi(birimMaliyetKaynagi, globalUnitPrice)}</span>
      </div>
      <div className={styles.stepperInput}>
        <input
          type="text"
          inputMode="decimal"
          value={girdi}
          aria-label="Birim inşaat maliyeti (TL/m²)"
          onChange={e => handleChange(e.target.value)}
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
        <input type="text" inputMode="decimal" value={manualMarketPrice} onChange={(e) => setManualMarketPrice(formatTRThousands(e.target.value))} />
        <div className={styles.stepperRight}>
          <span className={styles.stepperUnitWide}>TL</span>
        </div>
      </div>
    </div>
  );
}
