import { deriveProgramBands } from './programInventory';
import type { ProgramMixItem } from './types';

function item(overrides: Partial<ProgramMixItem>): ProgramMixItem {
  return {
    id: 'x',
    use: 'residential',
    residentialType: '2+1',
    unitCount: 4,
    unitAreaM2: 85,
    floorRange: { startFloor: 1, endFloor: 3 },
    ...overrides,
  };
}

describe('deriveProgramBands', () => {
  // Faz 3A Task 5 bullet 2: "Program bandlari 2D legend, 3D bant ve envanter
  // ozetinde ayni ID ile eslessin." `deriveProgramBands` saf/deterministik
  // oldugu icin (id = kat araligi+kullanim anahtari, tarih/sayac YOK) bu
  // UCU AYRI tuketici (Studio2DPreview legend, StudioScene 3D bant,
  // ProgramMixPanel envanter ozeti) AYNI `programMixItems`i verince HER
  // ZAMAN ayni ID'leri uretir — kod paylasimiyla degil, saf fonksiyon
  // determinizmiyle garanti edilir. Bu test o garantiyi kilitler.
  it('ayni girdiyle iki bagimsiz cagri BIREBIR ayni ID sirasini uretir (determinizm garantisi)', () => {
    const items: ProgramMixItem[] = [
      item({ id: 'a', floorRange: { startFloor: 1, endFloor: 3 } }),
      item({ id: 'b', use: 'commercial', residentialType: undefined, floorRange: { startFloor: 0, endFloor: 0 } }),
    ];
    const firstCall = deriveProgramBands(items);
    const secondCall = deriveProgramBands(items);
    expect(secondCall).toEqual(firstCall);
    expect(secondCall.map((b) => b.id)).toEqual(firstCall.map((b) => b.id));
  });


  it('kat araligi olmayan kalemleri atlar (3D banda cevrilemez)', () => {
    const items: ProgramMixItem[] = [item({ id: 'a', floorRange: undefined })];
    expect(deriveProgramBands(items)).toEqual([]);
  });

  it('her farkli kat araligi icin ayri bir band uretir', () => {
    const items: ProgramMixItem[] = [
      item({ id: 'a', floorRange: { startFloor: 1, endFloor: 3 } }),
      item({ id: 'b', use: 'commercial', residentialType: undefined, floorRange: { startFloor: 0, endFloor: 0 } }),
    ];
    const bands = deriveProgramBands(items);
    expect(bands).toHaveLength(2);
    expect(bands.map((b) => b.floorRange)).toEqual(
      expect.arrayContaining([{ startFloor: 0, endFloor: 0 }, { startFloor: 1, endFloor: 3 }]),
    );
  });

  it('ayni kat araligi + ayni use paylasan kalemleri tek bantta birlestirir', () => {
    const items: ProgramMixItem[] = [
      item({ id: 'a', residentialType: '2+1', unitCount: 4, unitAreaM2: 85, floorRange: { startFloor: 1, endFloor: 3 } }),
      item({ id: 'b', residentialType: '3+1', unitCount: 2, unitAreaM2: 110, floorRange: { startFloor: 1, endFloor: 3 } }),
    ];
    const bands = deriveProgramBands(items);
    expect(bands).toHaveLength(1);
    expect(bands[0].areaM2).toBe(4 * 85 + 2 * 110);
  });

  it('bantlari kat sirasina gore (dusuk-yuksek) siralar', () => {
    const items: ProgramMixItem[] = [
      item({ id: 'high', floorRange: { startFloor: 6, endFloor: 9 } }),
      item({ id: 'low', use: 'commercial', residentialType: undefined, floorRange: { startFloor: 0, endFloor: 0 } }),
    ];
    const bands = deriveProgramBands(items);
    expect(bands[0].floorRange.startFloor).toBe(0);
    expect(bands[1].floorRange.startFloor).toBe(6);
  });

  it('renk slotu indeksini kullanilan sıraya gore DETERMINISTIK atar (ayni use = ayni indeks)', () => {
    const items: ProgramMixItem[] = [
      item({ id: 'a', use: 'commercial', residentialType: undefined, floorRange: { startFloor: 0, endFloor: 0 } }),
      item({ id: 'b', use: 'residential', floorRange: { startFloor: 1, endFloor: 5 } }),
      item({ id: 'c', use: 'common', residentialType: undefined, floorRange: { startFloor: 6, endFloor: 6 } }),
    ];
    const first = deriveProgramBands(items);
    const second = deriveProgramBands(items);
    expect(first.map((b) => b.colorSlotIndex)).toEqual(second.map((b) => b.colorSlotIndex));
    // Farkli use'lar farkli indeks alir.
    expect(new Set(first.map((b) => b.colorSlotIndex)).size).toBe(3);
  });
});
