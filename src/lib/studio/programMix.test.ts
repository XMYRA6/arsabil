import { summarizeProgramMix } from './programMix';
import type { ProgramMixItem } from './types';

function item(overrides: Partial<ProgramMixItem>): ProgramMixItem {
  return {
    id: 'x',
    use: 'residential',
    residentialType: '2+1',
    unitCount: 1,
    unitAreaM2: 85,
    ...overrides,
  };
}

describe('summarizeProgramMix', () => {
  it('konut + ticari + ortak alani ayri ayri toplar, kalan alani hesaplar', () => {
    const items: ProgramMixItem[] = [
      item({ id: 'a', use: 'residential', residentialType: '2+1', unitCount: 6, unitAreaM2: 85 }),
      item({ id: 'b', use: 'residential', residentialType: '3+1', unitCount: 4, unitAreaM2: 110 }),
      item({ id: 'c', use: 'commercial', residentialType: undefined, unitCount: 3, unitAreaM2: 40 }),
      item({ id: 'd', use: 'common', residentialType: undefined, unitCount: 1, unitAreaM2: 150 }),
    ];

    const summary = summarizeProgramMix(items, 2000);

    expect(summary.residentialUnitCountByType).toEqual({ '2+1': 6, '3+1': 4 });
    expect(summary.commercialUnitCount).toBe(3);
    expect(summary.commercialAreaM2).toBe(120);
    expect(summary.totalAllocatedAreaM2).toBe(6 * 85 + 4 * 110 + 3 * 40 + 150);
    expect(summary.remainingAreaM2).toBe(2000 - summary.totalAllocatedAreaM2);
    expect(summary.warnings).toEqual([]);
  });

  it('ayni daire tipindeki birden fazla kalemi (farkli kat bantlari) birlestirir', () => {
    const items: ProgramMixItem[] = [
      item({ id: 'a', floorRange: { startFloor: 2, endFloor: 5 }, unitCount: 4 }),
      item({ id: 'b', floorRange: { startFloor: 6, endFloor: 9 }, unitCount: 3 }),
    ];
    const summary = summarizeProgramMix(items, 5000);
    expect(summary.residentialUnitCountByType['2+1']).toBe(7);
  });

  it('bos kalem listesi icin tum degerler sifir, kalan alan = mevcut alan', () => {
    const summary = summarizeProgramMix([], 1200);
    expect(summary.totalAllocatedAreaM2).toBe(0);
    expect(summary.remainingAreaM2).toBe(1200);
    expect(summary.residentialUnitCountByType).toEqual({});
    expect(summary.commercialUnitCount).toBe(0);
    expect(summary.warnings).toEqual([]);
  });

  // Global Constraint: hicbir zaman sessizce bloklanmaz/kirpilmaz — asim
  // acikca UYARI olarak dondurulur, negatif kalan alan GIZLENMEZ.
  it('mevcut insaat alanini asan tahsis icin uyari doner, bloklamaz', () => {
    const items: ProgramMixItem[] = [item({ unitCount: 20, unitAreaM2: 100 })]; // 2000 m2
    const summary = summarizeProgramMix(items, 1500);

    expect(summary.remainingAreaM2).toBe(-500);
    expect(summary.warnings).toEqual([
      expect.objectContaining({ code: 'PROGRAM_AREA_EXCEEDS_AVAILABLE' }),
    ]);
  });

  it('parking kalemleri konut/ticari sayaclarina karismaz ama alana dahil olur', () => {
    const items: ProgramMixItem[] = [
      item({ id: 'p', use: 'parking', residentialType: undefined, unitCount: 10, unitAreaM2: 25 }),
    ];
    const summary = summarizeProgramMix(items, 500);
    expect(summary.residentialUnitCountByType).toEqual({});
    expect(summary.commercialUnitCount).toBe(0);
    expect(summary.totalAllocatedAreaM2).toBe(250);
  });

  // Faz 2A Task 1: "satilabilir alan" — ortak alan/otopark haric, konut+ticari.
  it('satilabilir alani (sellableAreaM2) ortak alan/otopark haric hesaplar', () => {
    const items: ProgramMixItem[] = [
      item({ id: 'a', use: 'residential', unitCount: 6, unitAreaM2: 85 }), // 510
      item({ id: 'c', use: 'commercial', residentialType: undefined, unitCount: 3, unitAreaM2: 40 }), // 120
      item({ id: 'd', use: 'common', residentialType: undefined, unitCount: 1, unitAreaM2: 150 }),
      item({ id: 'p', use: 'parking', residentialType: undefined, unitCount: 10, unitAreaM2: 25 }),
    ];
    const summary = summarizeProgramMix(items, 5000);
    expect(summary.sellableAreaM2).toBe(510 + 120);
    expect(summary.totalAllocatedAreaM2).toBe(510 + 120 + 150 + 250);
  });

  // Faz 2A Task 1 bullet 4: cakisan band, negatif adet, sifir alan kontrolleri.
  it('ayni kat araliginda cakisan bantlar icin uyari doner', () => {
    const items: ProgramMixItem[] = [
      item({ id: 'a', floorRange: { startFloor: 2, endFloor: 5 } }),
      item({ id: 'b', use: 'commercial', residentialType: undefined, floorRange: { startFloor: 4, endFloor: 6 } }),
    ];
    const summary = summarizeProgramMix(items, 5000);
    expect(summary.warnings).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'OVERLAPPING_PROGRAM_BANDS' })]),
    );
  });

  it('bitisik ama cakismayan kat araliklari (5 ve 6) uyari uretmez', () => {
    const items: ProgramMixItem[] = [
      item({ id: 'a', floorRange: { startFloor: 2, endFloor: 5 } }),
      item({ id: 'b', floorRange: { startFloor: 6, endFloor: 9 } }),
    ];
    const summary = summarizeProgramMix(items, 5000);
    expect(summary.warnings).toEqual([]);
  });

  it('negatif adet veya sifir/negatif birim alan icin uyari doner', () => {
    const items: ProgramMixItem[] = [
      item({ id: 'neg', unitCount: -2 }),
      item({ id: 'zero-area', unitAreaM2: 0 }),
    ];
    const summary = summarizeProgramMix(items, 5000);
    expect(summary.warnings.filter((w) => w.code === 'INVALID_PROGRAM_ITEM')).toHaveLength(2);
  });
});
