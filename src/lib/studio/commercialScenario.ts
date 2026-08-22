import type { CommercialScenarioInput, CommercialScenarioSummary, StudioWarning } from './types';

/**
 * Zemin kat dukkan/kiralik ticari bandini ozetler (Faz 2 Task 2). Deger
 * varsayimi (kira/satis) eksikse hesap DURMAZ — alan hesabi yine yapilir,
 * yalnizca ilgili TL tahmini `null` kalir ve acik bir uyari doner (spec:
 * "Missing rent/value assumption should not block massing/program view").
 */
export function summarizeCommercialScenario(input: CommercialScenarioInput): CommercialScenarioSummary {
  const { shopCount, averageShopAreaM2, valueBasis, rentMonthlyPerM2Tl, saleValuePerM2Tl, availableGroundFloorAreaM2 } = input;
  const totalShopAreaM2 = shopCount * averageShopAreaM2;

  const hasRentValue = valueBasis === 'rent' && typeof rentMonthlyPerM2Tl === 'number';
  const hasSaleValue = valueBasis === 'sale' && typeof saleValuePerM2Tl === 'number';

  const warnings: StudioWarning[] = [];
  if (!hasRentValue && !hasSaleValue) {
    warnings.push({
      code: 'MISSING_COMMERCIAL_VALUE_ASSUMPTION',
      message: 'Zemin kat dükkanları için kira veya satış değeri varsayımı girilmedi; alan hesabı gösterilir ama finansal tahmin üretilemez.',
    });
  }

  const exceedsAvailableArea = totalShopAreaM2 > availableGroundFloorAreaM2;
  if (exceedsAvailableArea) {
    warnings.push({
      code: 'PROGRAM_AREA_EXCEEDS_AVAILABLE',
      message: `Dükkan alanı (${totalShopAreaM2.toLocaleString('tr-TR')} m²), mevcut zemin kat alanını (${availableGroundFloorAreaM2.toLocaleString('tr-TR')} m²) aşıyor.`,
    });
  }

  return {
    shopCount,
    totalShopAreaM2,
    valueBasis,
    estimatedMonthlyRentTl: hasRentValue ? totalShopAreaM2 * (rentMonthlyPerM2Tl as number) : null,
    estimatedSaleValueTl: hasSaleValue ? totalShopAreaM2 * (saleValuePerM2Tl as number) : null,
    exceedsAvailableArea,
    warnings,
  };
}
