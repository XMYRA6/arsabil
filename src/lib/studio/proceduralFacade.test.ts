import { generateProceduralFacade, FACADE_WINDOW_WIDTH_M } from './proceduralFacade';
import type { BuildingMass } from './types';

function squareMass(sideM: number, floorCount: number, floorHeightM: number): BuildingMass {
  return {
    footprint: {
      source: 'demo',
      points: [
        { x: 0, y: 0 },
        { x: sideM, y: 0 },
        { x: sideM, y: sideM },
        { x: 0, y: sideM },
      ],
    },
    heightM: floorCount * floorHeightM,
    floorCount,
    floorHeightM,
    grossConstructionAreaM2: sideM * sideM * floorCount,
    warnings: [],
  };
}

describe('generateProceduralFacade', () => {
  it('10x10 kare footprint, 3 kat icin her kenarda 4 pencere x 3 kat = 12 pencere uretir', () => {
    const mass = squareMass(10, 3, 3);
    const walls = generateProceduralFacade(mass);

    expect(walls).toHaveLength(4);
    walls.forEach((wall) => {
      expect(wall.windows).toHaveLength(12);
    });
  });

  it('cok kisa bir kenarda (1m) hic pencere uretmez — sessizce atlar, crash etmez', () => {
    const mass: BuildingMass = {
      footprint: {
        source: 'demo',
        points: [
          { x: 0, y: 0 },
          { x: 1, y: 0 },
          { x: 1, y: 10 },
          { x: 0, y: 10 },
        ],
      },
      heightM: 3,
      floorCount: 1,
      floorHeightM: 3,
      grossConstructionAreaM2: 10,
      warnings: [],
    };
    const walls = generateProceduralFacade(mass);

    // Kenar 0: (0,0)-(1,0), uzunluk 1m -> pencere yok.
    expect(walls[0].lengthM).toBeCloseTo(1);
    expect(walls[0].windows).toHaveLength(0);
  });

  it('pencere Y pozisyonlari kat sayisina gore dogru artar (floorHeightM=3, sillM=1 -> 1,4,7)', () => {
    const mass = squareMass(10, 3, 3);
    const walls = generateProceduralFacade(mass);

    const floor0Windows = walls[0].windows.filter((w) => w.y === 1);
    const floor1Windows = walls[0].windows.filter((w) => w.y === 4);
    const floor2Windows = walls[0].windows.filter((w) => w.y === 7);

    expect(floor0Windows).toHaveLength(4);
    expect(floor1Windows).toHaveLength(4);
    expect(floor2Windows).toHaveLength(4);
  });

  it('her pencere sabit genislik/yukseklik tasir', () => {
    const mass = squareMass(10, 1, 3);
    const walls = generateProceduralFacade(mass);

    walls[0].windows.forEach((w) => {
      expect(w.width).toBe(FACADE_WINDOW_WIDTH_M);
      expect(w.height).toBeGreaterThan(0);
    });
  });
});
