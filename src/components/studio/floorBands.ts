import type { BuildingMass } from '@/lib/studio/types';

/**
 * Kat bandi yukseklikleri — `mass.floorCount`/`mass.floorHeightM`den turer,
 * `StudioScene` ve ozet kart (`StudioPreview.summaryGrid`) AYNI `mass`
 * kaynagini kullanir; bu fonksiyon o tek kaynaktan sahnedeki bant sayisini
 * ayristirir (Faz 1B Task 2 bullet 2 — kaynaklar ayrisamaz).
 */
export function getFloorBandHeights(mass: BuildingMass): number[] {
  if (mass.floorCount <= 1) return [];
  return Array.from({ length: mass.floorCount - 1 }, (_, index) => (index + 1) * mass.floorHeightM);
}
