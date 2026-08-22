import type { FloorRange, ProgramMixItem, ProgramMixSummary, ResidentialUnitType, StudioWarning } from './types';

function itemAreaM2(item: ProgramMixItem): number {
  return item.unitCount * item.unitAreaM2;
}

function rangesOverlap(a: FloorRange, b: FloorRange): boolean {
  return a.startFloor <= b.endFloor && b.startFloor <= a.endFloor;
}

function validateItem(item: ProgramMixItem): StudioWarning | null {
  if (item.unitCount < 0) {
    return {
      code: 'INVALID_PROGRAM_ITEM',
      message: `Kalem "${item.id}" için negatif adet (${item.unitCount}) geçersiz.`,
    };
  }
  if (item.unitAreaM2 <= 0) {
    return {
      code: 'INVALID_PROGRAM_ITEM',
      message: `Kalem "${item.id}" için sıfır/negatif birim alan (${item.unitAreaM2} m²) geçersiz.`,
    };
  }
  return null;
}

function findOverlapWarnings(items: ProgramMixItem[]): StudioWarning[] {
  const withRange = items.filter((item): item is ProgramMixItem & { floorRange: FloorRange } => Boolean(item.floorRange));
  const warnings: StudioWarning[] = [];

  for (let i = 0; i < withRange.length; i += 1) {
    for (let j = i + 1; j < withRange.length; j += 1) {
      const a = withRange[i];
      const b = withRange[j];
      if (rangesOverlap(a.floorRange, b.floorRange)) {
        warnings.push({
          code: 'OVERLAPPING_PROGRAM_BANDS',
          message: `"${a.id}" (kat ${a.floorRange.startFloor}-${a.floorRange.endFloor}) ve "${b.id}" (kat ${b.floorRange.startFloor}-${b.floorRange.endFloor}) aynı kat aralığında çakışıyor.`,
        });
      }
    }
  }

  return warnings;
}

/**
 * Program kalemlerini (2+1/3+1 konut bloklari, zemin dukkan bandi, ortak
 * alan/otopark) tek bir ozete indirger. `availableAreaM2` genelde
 * `BuildingMass.grossConstructionAreaM2`'dir — asim SESSIZCE kirpilmaz,
 * `remainingAreaM2` negatif donup acikca uyari uretir (Global Constraint,
 * Faz 2 plani). Cakisan kat araliklari, negatif adet ve sifir/negatif birim
 * alan da bloklamadan uyari olarak dondurulur (Faz 2A Task 1 bullet 4).
 */
export function summarizeProgramMix(items: ProgramMixItem[], availableAreaM2: number): ProgramMixSummary {
  const residentialUnitCountByType: Partial<Record<ResidentialUnitType, number>> = {};
  let commercialUnitCount = 0;
  let commercialAreaM2 = 0;
  let sellableAreaM2 = 0;
  let totalAllocatedAreaM2 = 0;
  const itemWarnings: StudioWarning[] = [];

  for (const item of items) {
    const area = itemAreaM2(item);
    totalAllocatedAreaM2 += area;

    const itemWarning = validateItem(item);
    if (itemWarning) itemWarnings.push(itemWarning);

    if (item.use === 'residential' && item.residentialType) {
      residentialUnitCountByType[item.residentialType] =
        (residentialUnitCountByType[item.residentialType] ?? 0) + item.unitCount;
      sellableAreaM2 += area;
    } else if (item.use === 'commercial') {
      commercialUnitCount += item.unitCount;
      commercialAreaM2 += area;
      sellableAreaM2 += area;
    }
  }

  const remainingAreaM2 = availableAreaM2 - totalAllocatedAreaM2;
  const warnings: StudioWarning[] = [...itemWarnings, ...findOverlapWarnings(items)];
  if (remainingAreaM2 < 0) {
    warnings.push({
      code: 'PROGRAM_AREA_EXCEEDS_AVAILABLE',
      message: `Tahsis edilen program alanı (${totalAllocatedAreaM2.toLocaleString('tr-TR')} m²), mevcut inşaat alanını (${availableAreaM2.toLocaleString('tr-TR')} m²) ${Math.abs(remainingAreaM2).toLocaleString('tr-TR')} m² aşıyor.`,
    });
  }

  return {
    residentialUnitCountByType,
    commercialUnitCount,
    commercialAreaM2,
    totalAllocatedAreaM2,
    remainingAreaM2,
    sellableAreaM2,
    warnings,
  };
}
