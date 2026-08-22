import type { FloorRange, ProgramBand, ProgramMixItem, ProgramUse } from './types';

function floorRangeKey(range: FloorRange): string {
  return `${range.startFloor}:${range.endFloor}`;
}

/**
 * `ProgramMixItem[]`i 3D sahnenin ve legend'in tuketecegi gorsel kat
 * bantlarina indirger (Faz 2A Task 1/4). Kat araligi olmayan kalemler
 * atlanir — henuz bir kata baglanmamis bir kalemi 3D'de gostermenin
 * anlamli bir yolu yoktur (renderer hicbir varsayimda BULUNMAZ). Ayni
 * kat araligi + ayni kullanimi paylasan kalemler tek bantta birlesir.
 *
 * `colorSlotIndex` renk sozlugune (STUDIO_PROGRAM_COLOR_SLOTS, UI katmani)
 * BAGIMLI DEGILDIR — bu saf fonksiyon, kullanimlarin ilk gorulme sirasina
 * gore deterministik bir SOYUT indeks atar; hex'e cevirme UI'da olur
 * (mimari sinir: "3D/2D UI only visualizes the result").
 */
export function deriveProgramBands(items: ProgramMixItem[]): ProgramBand[] {
  const withRange = items.filter((item): item is ProgramMixItem & { floorRange: FloorRange } => Boolean(item.floorRange));

  const grouped = new Map<string, { use: ProgramUse; floorRange: FloorRange; areaM2: number }>();
  for (const item of withRange) {
    const key = `${floorRangeKey(item.floorRange)}|${item.use}`;
    const area = item.unitCount * item.unitAreaM2;
    const existing = grouped.get(key);
    if (existing) {
      existing.areaM2 += area;
    } else {
      grouped.set(key, { use: item.use, floorRange: item.floorRange, areaM2: area });
    }
  }

  const useOrder: ProgramUse[] = [];
  const colorIndexForUse = (use: ProgramUse): number => {
    let index = useOrder.indexOf(use);
    if (index === -1) {
      useOrder.push(use);
      index = useOrder.length - 1;
    }
    return index;
  };

  return Array.from(grouped.entries())
    .map(([key, band]) => ({
      id: key,
      use: band.use,
      floorRange: band.floorRange,
      areaM2: band.areaM2,
      colorSlotIndex: colorIndexForUse(band.use),
    }))
    .sort((a, b) => a.floorRange.startFloor - b.floorRange.startFloor);
}
