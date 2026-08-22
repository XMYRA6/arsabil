import type { LandownerEntitlementResult } from './landownerOffer';

export type OfferValidationWarning =
  | { code: 'NEGATIVE_CASH_AMOUNT'; message: string }
  | { code: 'MISSING_VALUATION_BASIS'; message: string }
  | { code: 'CUSTOM_OFFER_HIDES_FRACTIONAL_BALANCE'; message: string }
  | { code: 'OFFER_NEEDS_REBALANCE'; message: string };

/**
 * Faz 2B Task 4 (re-scoped) & Faz 3B Task 2 — YALNIZCA ozel teklif (`customOverride`)
 * girdisini dogrular. Per-unit atama/stok kontrolu bu fazda YOK (Re-scope
 * Notu). Mevcut `calculateLandownerEntitlement`/`createLandownerOfferOptions`
 * DEGISTIRILMEZ — bu fonksiyon onlarin ciktisini degil, kullanicinin ozel
 * teklif girdisini denetler.
 *
 * `createLandownerOfferOptions`'in 'custom' secenegi `fractionalUnitBalance`i
 * HER ZAMAN 0 gosterir (bkz. landownerOffer.ts) — gercek hak ediste bir
 * kesir varsa ve nakit 0 girildiyse, bu kesir GORUNMEZ SEKILDE kaybolmus
 * gibi durur. `CUSTOM_OFFER_HIDES_FRACTIONAL_BALANCE` bu riski isaretler.
 *
 * Faz 3B: `needsRebalance` true ise (footprint/program degismisse)
 * `OFFER_NEEDS_REBALANCE` ekler.
 */
export function validateCustomOffer(
  entitlement: LandownerEntitlementResult,
  customOverride: { unitCount: number; cashTl: number } | null,
  unitValueTl: number | null,
  needsRebalance: boolean = false,
): OfferValidationWarning[] {
  if (!customOverride) return [];

  const warnings: OfferValidationWarning[] = [];

  if (needsRebalance) {
    warnings.push({
      code: 'OFFER_NEEDS_REBALANCE',
      message: 'Bina yerleşimi veya program değişti; özel teklif dengesinin yeniden gözden geçirilmesi önerilir.',
    });
  }

  if (customOverride.cashTl < 0) {
    warnings.push({
      code: 'NEGATIVE_CASH_AMOUNT',
      message: 'Özel teklifteki nakit tutarı negatif olamaz.',
    });
  }

  if (unitValueTl === null) {
    warnings.push({
      code: 'MISSING_VALUATION_BASIS',
      message: 'Değerleme varsayımı girilmedi; özel tekliften girilen nakit tutarının makul olup olmadığı doğrulanamıyor.',
    });
  }

  if (entitlement.fractionalUnitBalance !== 0 && customOverride.cashTl === 0) {
    warnings.push({
      code: 'CUSTOM_OFFER_HIDES_FRACTIONAL_BALANCE',
      message: 'Hak edişte kesirli bir pay var ama özel teklifte nakit dengeleme girilmedi; kesir gizlenmiş görünebilir.',
    });
  }

  return warnings;
}
