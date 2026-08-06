import { computeEffectiveLandShareX, clampOwnerApartmentShare, parseMarketPrice, ornekProjeIleDeneDoldur, ORNEK_APARTMENT_SIZE, ORNEK_GLOBAL_UNIT_PRICE } from './calculatorUiHelpers';

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
  it('totalApartments azaltılınca ownerApartmentShare üst sınıra çekilir', () => {
    expect(clampOwnerApartmentShare(15, 10)).toBe(10);
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
