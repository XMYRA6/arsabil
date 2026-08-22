import type { StudioPoint } from '@/lib/studio/types';

/**
 * Bu esigi asan bir footprint, extrude edilince mobil GPU'da gozle gorulur
 * yavaslamaya yol acabilir (Faz 1B Task 4). Sinir DAHIL kabul edilir —
 * tam esitlikte uyari VERILMEZ, yalnizca asildiginda.
 */
export const MAX_FOOTPRINT_POINTS = 64;

export type FootprintComplexity = {
  pointCount: number;
  exceedsLimit: boolean;
  warningMessage: string | null;
};

export function checkFootprintComplexity(points: StudioPoint[]): FootprintComplexity {
  const pointCount = points.length;
  const exceedsLimit = pointCount > MAX_FOOTPRINT_POINTS;

  return {
    pointCount,
    exceedsLimit,
    warningMessage: exceedsLimit
      ? `Parsel sınırı ${pointCount} nokta içeriyor (sınır: ${MAX_FOOTPRINT_POINTS}). 3D önizleme performansı için sadeleştirilmiş bir sınır önerilir.`
      : null,
  };
}
