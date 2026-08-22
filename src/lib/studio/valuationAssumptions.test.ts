import { resolveUnitValueTl } from './valuationAssumptions';
import type { ValuationAssumptions } from './types';

function assumptions(overrides: Partial<ValuationAssumptions> = {}): ValuationAssumptions {
  return {
    currency: 'TRY',
    valuationDate: '2026-08-22',
    unitValueTl: 2_000_000,
    unitValuePerM2Tl: null,
    shopValueTl: null,
    shopRentMultiplierMonthly: null,
    ...overrides,
  };
}

describe('resolveUnitValueTl', () => {
  // Faz 2B Re-scope: bu fonksiyon SADECE ValuationAssumptions'i mevcut
  // (Faz 2) createLandownerOfferOptions'in `unitValueTl` parametresine
  // COZER — hesap mantigini DEGISTIRMEZ.
  it('varsayim yoksa (null) null doner', () => {
    expect(resolveUnitValueTl(null)).toBeNull();
  });

  it('unitValueTl dogrudan verilmisse onceliklidir, aynen doner', () => {
    expect(resolveUnitValueTl(assumptions({ unitValueTl: 2_500_000 }))).toBe(2_500_000);
  });

  it('unitValueTl yoksa ama m² deger + ortalama alan verilmisse carpip doner', () => {
    const result = resolveUnitValueTl(
      assumptions({ unitValueTl: null, unitValuePerM2Tl: 25_000 }),
      140,
    );
    expect(result).toBe(25_000 * 140);
  });

  it('m² deger var ama ortalama alan verilmemisse null doner (bolme hatasi firlatmaz)', () => {
    const result = resolveUnitValueTl(assumptions({ unitValueTl: null, unitValuePerM2Tl: 25_000 }));
    expect(result).toBeNull();
  });

  it('ne unitValueTl ne m² deger varsa null doner', () => {
    const result = resolveUnitValueTl(assumptions({ unitValueTl: null, unitValuePerM2Tl: null }), 140);
    expect(result).toBeNull();
  });
});
