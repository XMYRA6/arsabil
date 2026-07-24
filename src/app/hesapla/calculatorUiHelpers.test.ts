import { computeEffectiveLandShareX, clampOwnerApartmentShare, parseMarketPrice } from './calculatorUiHelpers';

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
