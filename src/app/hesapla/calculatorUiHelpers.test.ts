import { computeEffectiveLandShareX, clampOwnerApartmentShare, parseMarketPrice, ornekProjeIleDeneDoldur, ORNEK_APARTMENT_SIZE, ORNEK_GLOBAL_UNIT_PRICE, mergeQualityLevels, DEFAULT_QUALITY_LEVELS } from './calculatorUiHelpers';

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
