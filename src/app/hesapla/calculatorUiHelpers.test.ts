import { computeEffectiveLandShareX, clampOwnerApartmentShare, parseMarketPrice, ornekProjeIleDeneDoldur, ORNEK_APARTMENT_SIZE, ORNEK_GLOBAL_UNIT_PRICE, mergeQualityLevels, DEFAULT_QUALITY_LEVELS, buildCalculationInput } from './calculatorUiHelpers';

describe('mergeQualityLevels (denetim bulgusu C3)', () => {
  it('fetched veri yoksa (null/undefined) base degismeden doner', () => {
    expect(mergeQualityLevels(DEFAULT_QUALITY_LEVELS, null)).toEqual(DEFAULT_QUALITY_LEVELS);
    expect(mergeQualityLevels(DEFAULT_QUALITY_LEVELS, undefined)).toEqual(DEFAULT_QUALITY_LEVELS);
  });

  it('sayisal alanlar base uzerine yazilir', () => {
    expect(mergeQualityLevels(DEFAULT_QUALITY_LEVELS, { qualityStandard: 1.05, qualityMedium: 1.25, qualityLux: 1.45 }))
      .toEqual({ standart: 1.05, orta: 1.25, luks: 1.45 });
  });

  it('sayisal olmayan/eksik alanlar base degerini korur (kismi guncelleme)', () => {
    expect(mergeQualityLevels(DEFAULT_QUALITY_LEVELS, { qualityMedium: 1.3 }))
      .toEqual({ standart: 1.0, orta: 1.3, luks: 1.4 });
    expect(mergeQualityLevels(DEFAULT_QUALITY_LEVELS, { qualityStandard: 'nan' as unknown as number }))
      .toEqual(DEFAULT_QUALITY_LEVELS);
  });
});

describe('computeEffectiveLandShareX', () => {
  it('Sd kapalıyken landShareRatio/100 döner', () => {
    expect(computeEffectiveLandShareX({
      isApartmentCountEnabled: false,
      ownerApartmentShare: 999,
      totalApartments: 20,
      landShareRatio: 30,
    })).toBeCloseTo(0.30);
  });

  it('Sd açıkken ownerApartmentShare/totalApartments döner (asıl bug regresyonu)', () => {
    expect(computeEffectiveLandShareX({
      isApartmentCountEnabled: true,
      ownerApartmentShare: 6,
      totalApartments: 20,
      landShareRatio: 999,
    })).toBeCloseTo(0.30);
  });

  it('Sd açık ama totalApartments 0 ise 0 döner (sıfıra bölme değil)', () => {
    expect(computeEffectiveLandShareX({
      isApartmentCountEnabled: true,
      ownerApartmentShare: 6,
      totalApartments: 0,
      landShareRatio: 50,
    })).toBe(0);
  });
});

describe('clampOwnerApartmentShare', () => {
  it('totalApartments azaltılınca ownerApartmentShare üst sınıra (N-1) çekilir', () => {
    expect(clampOwnerApartmentShare(15, 10)).toBe(9);
  });

  it('negatif değer 0a çekilir', () => {
    expect(clampOwnerApartmentShare(-3, 10)).toBe(0);
  });

  it('aralıktaki değer değişmeden döner', () => {
    expect(clampOwnerApartmentShare(6, 20)).toBe(6);
  });

  it('totalApartments 0 ise 0 döner', () => {
    expect(clampOwnerApartmentShare(5, 0)).toBe(0);
  });

  it('BUG REGRESYONU: ownerApartmentShare totalApartments\'a eşit girilirse N-1\'e çekilir (müteahhide en az 1 daire kalmalı, x=1 olmamalı)', () => {
    expect(clampOwnerApartmentShare(10, 10)).toBe(9);
  });

  it('totalApartments=1 iken (tek daire) owner payı 0a çekilir — müteahhit tek daireyi elinde tutar', () => {
    expect(clampOwnerApartmentShare(1, 1)).toBe(0);
    expect(clampOwnerApartmentShare(0, 1)).toBe(0);
  });
});

describe('parseMarketPrice', () => {
  it('boş string 0 döner (piyasa karşılaştırması hiç gösterilmemeli)', () => {
    expect(parseMarketPrice('')).toBe(0);
  });

  it('binlik ayraçlı TL string sayıya çevrilir', () => {
    expect(parseMarketPrice('7.500.000')).toBe(7500000);
  });
});

describe('buildCalculationInput (denetim-2 bulgusu: input/chartBaseInput çift tanımı)', () => {
  const BASE_PARAMS = {
    x: 0.30,
    luxLevel: 1.2,
    apartmentSize: 140,
    globalUnitPrice: 12000,
    builderProfit: 1.30,
    isApartmentCountEnabled: false,
    totalApartments: 24,
    isAaEnabled: false,
    arsaAlani: 360,
    riskLevel: 10,
    iksaMode: 'off' as const,
    iksaPercentage: 5,
    iksaManualTL: 0,
  };

  it('temel alanlar doğru eşleniyor', () => {
    expect(buildCalculationInput(BASE_PARAMS)).toEqual({
      x: 0.30,
      L: 1.2,
      Ad: 140,
      P: 12000,
      K: 1.30,
      Sd: undefined,
      Aa: undefined,
      isRiskEnabled: true,
      R: 1.10,
      isExcavationEnabled: false,
      excavationMode: 'percentage',
      Z: 0,
      MzOriginal: 0,
      Pmarket: undefined,
    });
  });

  it('apartmentSize/globalUnitPrice null iken 0a düşer (henüz veri girilmemiş render için güvenli varsayılan)', () => {
    const res = buildCalculationInput({ ...BASE_PARAMS, apartmentSize: null, globalUnitPrice: null });
    expect(res.Ad).toBe(0);
    expect(res.P).toBe(0);
  });

  it('Sd (daire sayısı modu) açıkken totalApartments Sd olarak geçer', () => {
    const res = buildCalculationInput({ ...BASE_PARAMS, isApartmentCountEnabled: true, totalApartments: 20 });
    expect(res.Sd).toBe(20);
  });

  it('Aa (arsa alanı) açıkken arsaAlani Aa olarak geçer', () => {
    const res = buildCalculationInput({ ...BASE_PARAMS, isAaEnabled: true, arsaAlani: 500 });
    expect(res.Aa).toBe(500);
  });

  it('riskLevel=0 iken risk kapalı, R=1', () => {
    const res = buildCalculationInput({ ...BASE_PARAMS, riskLevel: 0 });
    expect(res.isRiskEnabled).toBe(false);
    expect(res.R).toBe(1);
  });

  it('iksa yüzde modunda Z oran olarak geçer', () => {
    const res = buildCalculationInput({ ...BASE_PARAMS, iksaMode: 'percentage', iksaPercentage: 8 });
    expect(res.isExcavationEnabled).toBe(true);
    expect(res.excavationMode).toBe('percentage');
    expect(res.Z).toBeCloseTo(0.08);
  });

  it('iksa elle modunda MzOriginal geçer, excavationMode manual olur', () => {
    const res = buildCalculationInput({ ...BASE_PARAMS, iksaMode: 'manual', iksaManualTL: 250000 });
    expect(res.isExcavationEnabled).toBe(true);
    expect(res.excavationMode).toBe('manual');
    expect(res.MzOriginal).toBe(250000);
  });

  it('Pmarket verilirse aynen geçer, verilmezse undefined kalır', () => {
    expect(buildCalculationInput({ ...BASE_PARAMS, Pmarket: 6000000 }).Pmarket).toBe(6000000);
    expect(buildCalculationInput(BASE_PARAMS).Pmarket).toBeUndefined();
  });

  it('REGRESYON KİLİDİ: ana hesap (Pmarket ile) ve grafik girdisi (Pmarket olmadan) aynı state için Pmarket dışında BİREBİR aynı nesneyi üretir', () => {
    const mainInput = buildCalculationInput({ ...BASE_PARAMS, Pmarket: 6000000 });
    const chartInput = buildCalculationInput(BASE_PARAMS);
    const { Pmarket: _mainPmarket, ...mainRest } = mainInput;
    const { Pmarket: _chartPmarket, ...chartRest } = chartInput;
    expect(mainRest).toEqual(chartRest);
  });
});

describe('ornekProjeIleDeneDoldur', () => {
  it('her iki alan da null iken ikisini de demo degerleriyle doldurur', () => {
    expect(ornekProjeIleDeneDoldur({ apartmentSize: null, globalUnitPrice: null }))
      .toEqual({ apartmentSize: ORNEK_APARTMENT_SIZE, globalUnitPrice: ORNEK_GLOBAL_UNIT_PRICE });
  });

  it('yalnizca bos olan alani doldurur, dolu olana dokunmaz', () => {
    expect(ornekProjeIleDeneDoldur({ apartmentSize: 180, globalUnitPrice: null }))
      .toEqual({ apartmentSize: 180, globalUnitPrice: ORNEK_GLOBAL_UNIT_PRICE });
    expect(ornekProjeIleDeneDoldur({ apartmentSize: null, globalUnitPrice: 15000 }))
      .toEqual({ apartmentSize: ORNEK_APARTMENT_SIZE, globalUnitPrice: 15000 });
  });

  it('ikisi de doluysa hicbirini degistirmez', () => {
    expect(ornekProjeIleDeneDoldur({ apartmentSize: 200, globalUnitPrice: 20000 }))
      .toEqual({ apartmentSize: 200, globalUnitPrice: 20000 });
  });
});
