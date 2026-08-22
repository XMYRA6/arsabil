import { calculateLandownerEntitlement, createLandownerOfferOptions } from './landownerOffer';

describe('calculateLandownerEntitlement', () => {
  it('kesirli hak edis icin tam sayi + kesir kismini SESSIZCE yuvarlamadan ayirir', () => {
    // 0.4 * 23 = 9.2 — spec ornegiyle birebir ayni senaryo.
    const result = calculateLandownerEntitlement(0.4, 23);
    expect(result.wholeUnitCount).toBe(9);
    expect(result.fractionalUnitBalance).toBeCloseTo(0.2, 5);
    expect(result.entitledUnitCount).toBeCloseTo(9.2, 5);
  });

  it('tam sayi hak edis icin kesir sifirdir (kayan nokta gurultusu sizdirmaz)', () => {
    const result = calculateLandownerEntitlement(0.3, 30);
    expect(result.wholeUnitCount).toBe(9);
    expect(result.fractionalUnitBalance).toBe(0);
  });
});

describe('createLandownerOfferOptions', () => {
  const fractional = calculateLandownerEntitlement(0.4, 23); // 9.2

  it('kesirli hak edis icin asagi/yukari yuvarlama seceneklerini nakit dengelemeyle uretir', () => {
    const { options, warnings } = createLandownerOfferOptions({
      ...fractional,
      unitValueTl: 2_000_000,
    });

    expect(options).toHaveLength(2);
    const down = options.find((o) => o.wholeUnitCount === 9)!;
    const up = options.find((o) => o.wholeUnitCount === 10)!;

    expect(down.label).toMatch(/9 daire.*0[.,]2 pay/i);
    expect(down.cashEqualizationTl).toBeCloseTo(0.2 * 2_000_000, 2);

    expect(up.label).toMatch(/10 daire.*0[.,]8 pay/i);
    expect(up.cashEqualizationTl).toBeCloseTo(-0.8 * 2_000_000, 2);

    expect(warnings).toEqual([]);
  });

  it('tam sayi hak ediste tek secenek doner, nakit dengeleme gerekmez', () => {
    const exact = calculateLandownerEntitlement(0.3, 30); // 9 tam
    const { options } = createLandownerOfferOptions({ ...exact, unitValueTl: 2_000_000 });

    expect(options).toHaveLength(1);
    expect(options[0].wholeUnitCount).toBe(9);
    expect(options[0].fractionalUnitBalance).toBe(0);
    expect(options[0].cashEqualizationTl).toBe(0);
  });

  // Global Constraint: deger varsayimi yoksa "varsayim gerekli" uyarisi
  // doner ama daire SAYILARI (asagi/yukari) yine de hesaplanip gosterilir.
  it('birim deger varsayimi eksikse uyari doner, nakit alanlari null kalir', () => {
    const { options, warnings } = createLandownerOfferOptions({ ...fractional, unitValueTl: null });

    expect(options.find((o) => o.wholeUnitCount === 9)!.cashEqualizationTl).toBeNull();
    expect(options.find((o) => o.wholeUnitCount === 10)!.cashEqualizationTl).toBeNull();
    expect(warnings).toEqual([expect.objectContaining({ code: 'MISSING_UNIT_VALUE_BASIS' })]);
  });

  it('ozel (custom) teklif verilirse, hesaplanmis secenegin YANINA aynen eklenir', () => {
    const { options } = createLandownerOfferOptions({
      ...fractional,
      unitValueTl: 2_000_000,
      customOverride: { unitCount: 8, cashTl: 3_000_000 },
    });

    expect(options).toHaveLength(3);
    const custom = options.find((o) => o.id === 'custom')!;
    expect(custom.wholeUnitCount).toBe(8);
    expect(custom.cashEqualizationTl).toBe(3_000_000);
    expect(custom.label).toMatch(/özel/i);
  });
});
