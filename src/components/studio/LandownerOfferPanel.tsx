'use client';

import styles from './LandownerOfferPanel.module.css';
import { OfferComposer, type OfferComposerValue } from './OfferComposer';
import { calculateLandownerEntitlement, createLandownerOfferOptions } from '@/lib/studio/landownerOffer';
import { resolveUnitValueTl } from '@/lib/studio/valuationAssumptions';
import { validateCustomOffer } from '@/lib/studio/offerValidation';
import type { ProgramMixItem, ValuationAssumptions } from '@/lib/studio/types';

export type LandownerOfferPanelProps = {
  /** Arsa payi orani (0-1 arasi, ornek 0.4). */
  shareRatio: number;
  /** Toplam daire/birim sayisi (Sd). */
  totalUnitCount: number;
  valuationAssumptions: ValuationAssumptions | null;
  onValuationAssumptionsChange: (next: ValuationAssumptions) => void;
  /** m² bazli deger cozumlemesi icin ortalama daire alani (opsiyonel). */
  averageUnitAreaM2?: number;
  customOverride: OfferComposerValue | null;
  onCustomOverrideChange: (next: OfferComposerValue | null) => void;
  /** Faz 2 Task 2 bullet 4: dukkan/ticari alan varsa gelir varsayimi
   * yukaridaki nakit tutarlarina DAHIL DEGILDIR — ayri kalem oldugu
   * acikca belirtilir (`commercialScenario.ts`in kendisi burada
   * CAGRILMAZ; ayri girdi formu gerektirir, bu fazin kapsami disinda). */
  programMixItems?: ProgramMixItem[];
};

function formatTl(value: number): string {
  return value.toLocaleString('tr-TR', { maximumFractionDigits: 0 });
}

function formatFraction(value: number): string {
  return value.toLocaleString('tr-TR', { maximumFractionDigits: 2 });
}

/**
 * Faz 2B Task 3 — mevcut (Faz 2), DEGISMEMIS
 * `calculateLandownerEntitlement`/`createLandownerOfferOptions`
 * fonksiyonlarinin UZERINE kurulu goruntuleme katmani. Bu bilesen HICBIR
 * hak edis/nakit hesabi yapmaz — yalnizca cagirir ve gosterir (Re-scope
 * Notu: "calculator dogru hesap yapiyor, mantiksiz degisiklikle
 * etkilenmesin").
 */
export function LandownerOfferPanel({
  shareRatio,
  totalUnitCount,
  valuationAssumptions,
  onValuationAssumptionsChange,
  averageUnitAreaM2,
  customOverride,
  onCustomOverrideChange,
  programMixItems,
}: LandownerOfferPanelProps) {
  const hasCommercialProgram = (programMixItems ?? []).some((item) => item.use === 'commercial');
  const entitlement = calculateLandownerEntitlement(shareRatio, totalUnitCount);
  const unitValueTl = resolveUnitValueTl(valuationAssumptions, averageUnitAreaM2);
  const offer = createLandownerOfferOptions({
    ...entitlement,
    unitValueTl,
    customOverride: customOverride ?? undefined,
  });

  const missingValuation = offer.warnings.some((warning) => warning.code === 'MISSING_UNIT_VALUE_BASIS');
  const customOfferWarnings = validateCustomOffer(entitlement, customOverride, unitValueTl);

  const updateAssumptions = (patch: Partial<ValuationAssumptions>) => {
    const base: ValuationAssumptions = valuationAssumptions ?? {
      currency: 'TRY',
      valuationDate: new Date().toISOString().slice(0, 10),
      unitValueTl: null,
    };
    onValuationAssumptionsChange({ ...base, ...patch });
  };

  return (
    <section className={styles.panel}>
      <h3 className={styles.bolumBaslik}>Arsa Sahibi Teklif Senaryoları</h3>

      <div className={styles.hakEdis}>
        <span className={styles.hakEdisEtiket}>Hesaplanan hak ediş</span>
        <strong className={styles.hakEdisDeger}>
          {formatFraction(entitlement.entitledUnitCount)} birim eşdeğeri
        </strong>
        <span className={styles.hakEdisDagilim}>
          tam: {entitlement.wholeUnitCount} · kesir: {formatFraction(entitlement.fractionalUnitBalance)}
        </span>
      </div>

      <ul className={styles.secenekListesi}>
        {offer.options.map((option) => (
          <li key={option.id} className={styles.secenekKarti} data-testid={`offer-option-${option.id}`}>
            <p className={styles.secenekEtiket}>{option.label}</p>
            <div className={styles.secenekDetay}>
              <span>{option.wholeUnitCount} daire</span>
              <span>
                {option.cashEqualizationTl === null
                  ? 'nakit tutarı hesaplanamadı'
                  : `${formatTl(option.cashEqualizationTl)} TL`}
              </span>
              <span className={styles.kaynakRozet}>{option.id === 'custom' ? 'elle girilen' : 'hesaplanan'}</span>
              <span className={styles.tahminiRozet}>tahmini</span>
            </div>
          </li>
        ))}
      </ul>

      {customOfferWarnings.length > 0 && (
        <ul className={styles.dogrulamaUyarilari}>
          {customOfferWarnings.map((warning) => (
            <li key={warning.code}>{warning.message}</li>
          ))}
        </ul>
      )}

      {hasCommercialProgram && (
        <p className={styles.ticariNotu}>
          Program dağılımında ticari/dükkan alanı var; bu alanın satış veya kira geliri yukarıdaki nakit
          tutarlarına dahil değildir, ayrı bir gelir varsayımı olarak değerlendirilmelidir.
        </p>
      )}

      <p className={styles.uygunlukNotu}>
        Bu senaryolar bir ön teklif niteliğindedir; bağlayıcı bir teklif değildir. Nihai anlaşma öncesi
        hukuki danışmanlık alınması önerilir.
      </p>

      <div className={missingValuation ? `${styles.degerleme} ${styles.degerlemeUyari}` : styles.degerleme}>
        <span className={styles.degerlemeBaslik}>Değerleme varsayımı</span>
        {missingValuation && (
          <p className={styles.degerlemeNot}>
            Nakit dengeleme için değerleme varsayımı girilmedi; aşağıdan daire değerini gir.
          </p>
        )}
        <div className={styles.degerlemeGirdiler}>
          <label className={styles.alan}>
            <span>Para birimi</span>
            <input
              type="text"
              className={styles.girdi}
              value={valuationAssumptions?.currency ?? ''}
              onChange={(event) => updateAssumptions({ currency: event.target.value })}
            />
          </label>
          <label className={styles.alan}>
            <span>Değerleme tarihi</span>
            <input
              type="date"
              className={styles.girdi}
              value={valuationAssumptions?.valuationDate ?? ''}
              onChange={(event) => updateAssumptions({ valuationDate: event.target.value })}
            />
          </label>
          <label className={styles.alan}>
            <span>Daire değeri (TL)</span>
            <input
              type="number"
              className={styles.girdi}
              value={valuationAssumptions?.unitValueTl ?? ''}
              onChange={(event) =>
                updateAssumptions({ unitValueTl: event.target.value === '' ? null : Number(event.target.value) })
              }
            />
          </label>
        </div>
      </div>

      <div className={styles.ozelTeklif}>
        <span className={styles.degerlemeBaslik}>Özel teklif</span>
        <OfferComposer value={customOverride} onApply={onCustomOverrideChange} onClear={() => onCustomOverrideChange(null)} />
      </div>
    </section>
  );
}
