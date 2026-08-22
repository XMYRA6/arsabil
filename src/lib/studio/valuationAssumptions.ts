import type { ValuationAssumptions } from './types';

/**
 * `ValuationAssumptions`i (para birimi/tarih/m² deger gibi zengin metadata)
 * Faz 2'nin DEGISMEMIS `createLandownerOfferOptions({ unitValueTl })`
 * parametresine cozer (Faz 2B Re-scope Notu — hak edis/teklif matematigi
 * BU FONKSIYONLA degil, sadece GIRDISI zenginlestirilerek etkilenir).
 *
 * Oncelik: dogrudan `unitValueTl` > m² deger x ortalama alan > `null`.
 * Bolme/carpma hatasi FIRLATMAZ — eksik veri sessizce `null` doner, cagiran
 * taraf (mevcut `createLandownerOfferOptions`) bunu zaten `MISSING_UNIT_VALUE_BASIS`
 * uyarisiyla isliyor.
 */
export function resolveUnitValueTl(
  assumptions: ValuationAssumptions | null,
  averageUnitAreaM2?: number,
): number | null {
  if (!assumptions) return null;
  if (typeof assumptions.unitValueTl === 'number') return assumptions.unitValueTl;

  if (typeof assumptions.unitValuePerM2Tl === 'number' && typeof averageUnitAreaM2 === 'number') {
    return assumptions.unitValuePerM2Tl * averageUnitAreaM2;
  }

  return null;
}
