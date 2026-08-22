import type { StudioWarning } from './types';

/** Toplam alanin yuzdesi kadar ortak alan/otopark rezervi (Faz 2A Task 2). */
export function calculateCommonAreaReserve(totalAreaM2: number, reservePercent: number): number {
  return totalAreaM2 * (reservePercent / 100);
}

/**
 * Bir alan butcesinden onerilen daire adedini turetir — ASAGI yuvarlanir
 * (kalinti alan gizli/kesirli bir daire uretmez, `remainingAreaM2` olarak
 * program ozetinde acikca kalir).
 */
export function deriveSuggestedUnitCount(budgetAreaM2: number, avgUnitAreaM2: number): number {
  if (avgUnitAreaM2 <= 0) return 0;
  return Math.floor(budgetAreaM2 / avgUnitAreaM2);
}

/**
 * Kullanicinin elle girdigi daire adedini, alan tahmininden turetilen
 * oneriyle karsilastirir. Fark varsa uyari doner ama kullanicinin degerini
 * DEGISTIRMEZ/kirpmez (Faz 2A Task 2: "kullanicinin manuel adet girmesine
 * izin ver; farki uyari olarak goster").
 */
export function compareManualUnitCount(manualCount: number, suggestedCount: number): StudioWarning | null {
  if (manualCount === suggestedCount) return null;
  return {
    code: 'MANUAL_UNIT_COUNT_DIFFERS_FROM_AREA_ESTIMATE',
    message: `Kullanıcının girdiği daire sayısı (${manualCount}), alan tahminine göre önerilen sayıdan (${suggestedCount}) farklı.`,
  };
}
