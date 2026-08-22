import { calculateCommonAreaReserve, compareManualUnitCount, deriveSuggestedUnitCount } from './programCapacity';

describe('calculateCommonAreaReserve', () => {
  it('toplam alanin yuzdesi kadar ortak alan/otopark rezervi hesaplar', () => {
    expect(calculateCommonAreaReserve(1000, 12)).toBe(120);
  });

  it('yuzde sifirsa rezerv sifirdir', () => {
    expect(calculateCommonAreaReserve(1000, 0)).toBe(0);
  });
});

describe('deriveSuggestedUnitCount', () => {
  it('butce alanini ortalama birim alana bolup asagi yuvarlar (tam daire olmayan kalinti gizli birim uretmez)', () => {
    expect(deriveSuggestedUnitCount(500, 85)).toBe(5); // 5.88 -> 5
  });

  it('ortalama birim alan sifir/negatifse 0 doner, bolme hatasi firlatmaz', () => {
    expect(deriveSuggestedUnitCount(500, 0)).toBe(0);
    expect(deriveSuggestedUnitCount(500, -10)).toBe(0);
  });
});

describe('compareManualUnitCount', () => {
  it('kullanici sayisi oneriyle ayniysa uyari uretmez', () => {
    expect(compareManualUnitCount(5, 5)).toBeNull();
  });

  // Faz 2A Task 2: "kullanicinin manuel adet girmesine izin ver; farki
  // uyari olarak goster" — bloklamaz, yalnizca acikca bildirir.
  it('kullanici sayisi oneriden farkliysa uyari doner, degeri DEGISTIRMEZ', () => {
    const warning = compareManualUnitCount(7, 5);
    expect(warning).toEqual(
      expect.objectContaining({ code: 'MANUAL_UNIT_COUNT_DIFFERS_FROM_AREA_ESTIMATE' }),
    );
    expect(warning!.message).toContain('7');
    expect(warning!.message).toContain('5');
  });
});
