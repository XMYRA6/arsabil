import { validateCustomOffer } from './offerValidation';
import type { LandownerEntitlementResult } from './landownerOffer';

function entitlement(overrides: Partial<LandownerEntitlementResult> = {}): LandownerEntitlementResult {
  return {
    entitledUnitCount: 9.2,
    wholeUnitCount: 9,
    fractionalUnitBalance: 0.2,
    ...overrides,
  };
}

describe('validateCustomOffer', () => {
  // Faz 2B Re-scope: bu dogrulama per-unit atama/stok kontrolu YAPMAZ (o
  // ozellik bu fazdan CIKARILDI) — yalnizca negatif nakit, eksik degerleme
  // ve kesirli hak edisin sessizce gizlenmesi (custom secenegin
  // fractionalUnitBalance'i her zaman 0 GOSTERMESI) riskini dogrular.

  it('ozel teklif yoksa uyari uretmez', () => {
    expect(validateCustomOffer(entitlement(), null, 2_000_000)).toEqual([]);
  });

  it('nakit tutari negatifse NEGATIVE_CASH_AMOUNT uyarisi doner', () => {
    const warnings = validateCustomOffer(entitlement(), { unitCount: 9, cashTl: -1000 }, 2_000_000);
    expect(warnings.some((w) => w.code === 'NEGATIVE_CASH_AMOUNT')).toBe(true);
  });

  it('degerleme yoksa MISSING_VALUATION_BASIS uyarisi doner', () => {
    const warnings = validateCustomOffer(entitlement(), { unitCount: 9, cashTl: 500_000 }, null);
    expect(warnings.some((w) => w.code === 'MISSING_VALUATION_BASIS')).toBe(true);
  });

  it('kesirli hak edis varken nakit sifirsa CUSTOM_OFFER_HIDES_FRACTIONAL_BALANCE uyarisi doner', () => {
    const warnings = validateCustomOffer(entitlement(), { unitCount: 9, cashTl: 0 }, 2_000_000);
    expect(warnings.some((w) => w.code === 'CUSTOM_OFFER_HIDES_FRACTIONAL_BALANCE')).toBe(true);
  });

  it('kesirli hak edis nakitle dengelenmisse CUSTOM_OFFER_HIDES_FRACTIONAL_BALANCE uretmez', () => {
    const warnings = validateCustomOffer(entitlement(), { unitCount: 9, cashTl: 400_000 }, 2_000_000);
    expect(warnings.some((w) => w.code === 'CUSTOM_OFFER_HIDES_FRACTIONAL_BALANCE')).toBe(false);
  });

  it('hak edis tam sayiysa (kesir yok) sifir nakit uyari uretmez', () => {
    const warnings = validateCustomOffer(
      entitlement({ entitledUnitCount: 9, wholeUnitCount: 9, fractionalUnitBalance: 0 }),
      { unitCount: 9, cashTl: 0 },
      2_000_000,
    );
    expect(warnings.some((w) => w.code === 'CUSTOM_OFFER_HIDES_FRACTIONAL_BALANCE')).toBe(false);
  });

  it('gecerli ozel teklifte (negatif olmayan nakit, degerleme var, kesir dengelenmis) hic uyari uretmez', () => {
    expect(validateCustomOffer(entitlement(), { unitCount: 9, cashTl: 400_000 }, 2_000_000)).toEqual([]);
  });

  it('needsRebalance true oldugunda OFFER_NEEDS_REBALANCE uyarisi ekler', () => {
    const warnings = validateCustomOffer(entitlement(), { unitCount: 9, cashTl: 400_000 }, 2_000_000, true);
    expect(warnings.some((w) => w.code === 'OFFER_NEEDS_REBALANCE')).toBe(true);
  });
});

