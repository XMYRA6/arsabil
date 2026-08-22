import { summarizeCommercialScenario } from './commercialScenario';
import type { CommercialScenarioInput } from './types';

function baseInput(overrides: Partial<CommercialScenarioInput> = {}): CommercialScenarioInput {
  return {
    shopCount: 3,
    averageShopAreaM2: 40,
    valueBasis: 'rent',
    rentMonthlyPerM2Tl: 500,
    saleValuePerM2Tl: null,
    availableGroundFloorAreaM2: 200,
    ...overrides,
  };
}

describe('summarizeCommercialScenario', () => {
  it('kira varsayimiyla gecerli dukkan bandi icin aylik kira tahmini uretir', () => {
    const summary = summarizeCommercialScenario(baseInput());
    expect(summary.totalShopAreaM2).toBe(120);
    expect(summary.estimatedMonthlyRentTl).toBe(120 * 500);
    expect(summary.estimatedSaleValueTl).toBeNull();
    expect(summary.exceedsAvailableArea).toBe(false);
    expect(summary.warnings).toEqual([]);
  });

  it('satis degeri varsayimiyla gecerli dukkan bandi icin satis tahmini uretir', () => {
    const summary = summarizeCommercialScenario(
      baseInput({ valueBasis: 'sale', rentMonthlyPerM2Tl: null, saleValuePerM2Tl: 45000 }),
    );
    expect(summary.estimatedSaleValueTl).toBe(120 * 45000);
    expect(summary.estimatedMonthlyRentTl).toBeNull();
  });

  // Global Constraint: kira/deger varsayimi eksikse uyari doner ama
  // massing/program gorunumu render edilmeye devam eder (bloklamaz).
  it('deger varsayimi eksikse uyari doner, alan hesabini yine de yapar', () => {
    const summary = summarizeCommercialScenario(
      baseInput({ valueBasis: 'rent', rentMonthlyPerM2Tl: null }),
    );
    expect(summary.totalShopAreaM2).toBe(120);
    expect(summary.estimatedMonthlyRentTl).toBeNull();
    expect(summary.warnings).toEqual([
      expect.objectContaining({ code: 'MISSING_COMMERCIAL_VALUE_ASSUMPTION' }),
    ]);
  });

  it('valueBasis hic secilmemisse de uyari doner', () => {
    const summary = summarizeCommercialScenario(baseInput({ valueBasis: null }));
    expect(summary.warnings).toEqual([
      expect.objectContaining({ code: 'MISSING_COMMERCIAL_VALUE_ASSUMPTION' }),
    ]);
  });

  it('dukkan alani mevcut zemin kat alanini asarsa uyari doner, bloklamaz', () => {
    const summary = summarizeCommercialScenario(
      baseInput({ shopCount: 10, averageShopAreaM2: 40, availableGroundFloorAreaM2: 200 }),
    );
    expect(summary.totalShopAreaM2).toBe(400);
    expect(summary.exceedsAvailableArea).toBe(true);
    expect(summary.warnings).toEqual([
      expect.objectContaining({ code: 'PROGRAM_AREA_EXCEEDS_AVAILABLE' }),
    ]);
  });
});
