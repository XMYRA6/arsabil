import { getFloorBandHeights } from './floorBands';
import type { BuildingMass } from '@/lib/studio/types';

function mass(overrides: Partial<BuildingMass> = {}): BuildingMass {
  return {
    footprint: { source: 'demo', points: [{ x: 0, y: 0 }, { x: 20, y: 0 }, { x: 20, y: 10 }, { x: 0, y: 10 }] },
    heightM: 12.8,
    floorCount: 4,
    floorHeightM: 3.2,
    grossConstructionAreaM2: 2800,
    warnings: [],
    ...overrides,
  };
}

describe('getFloorBandHeights', () => {
  // Faz 1B Task 2 bullet 2: sahnedeki kat bandi sayisi, ozet karttaki
  // "Kat tahmini" (mass.floorCount) ile AYNI kaynaktan (mass) turemeli —
  // ayri bir sabit/varsayim ile ayrisamaz.
  it('bant sayisi mass.floorCount - 1 e esittir (ayni kaynaktan turer)', () => {
    const m = mass({ floorCount: 6, floorHeightM: 3 });
    expect(getFloorBandHeights(m)).toHaveLength(5);
  });

  it('bant yukseklikleri floorHeightM in katlaridir', () => {
    const m = mass({ floorCount: 3, floorHeightM: 3.2 });
    expect(getFloorBandHeights(m)).toEqual([3.2, 6.4]);
  });

  it('tek katli veya katsiz kutlede bant uretmez', () => {
    expect(getFloorBandHeights(mass({ floorCount: 1 }))).toEqual([]);
    expect(getFloorBandHeights(mass({ floorCount: 0 }))).toEqual([]);
  });
});
