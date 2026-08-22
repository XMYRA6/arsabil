import { mapProgramBandsToWorldY, createProgramBandGeometry } from './programBandGeometry';
import type { BuildingMass, ProgramBand } from '@/lib/studio/types';

const mass: BuildingMass = {
  footprint: {
    source: 'demo',
    points: [
      { x: 0, y: 0 },
      { x: 20, y: 0 },
      { x: 20, y: 10 },
      { x: 0, y: 10 },
    ],
  },
  heightM: 12.8,
  floorCount: 4,
  floorHeightM: 3.2,
  grossConstructionAreaM2: 2800,
  warnings: [],
};

function band(overrides: Partial<ProgramBand> = {}): ProgramBand {
  return {
    id: 'b',
    use: 'residential',
    floorRange: { startFloor: 1, endFloor: 3 },
    areaM2: 500,
    colorSlotIndex: 0,
    ...overrides,
  };
}

describe('mapProgramBandsToWorldY', () => {
  // Kok neden: zemin kat (index 0) DUNYA Y=0'dan baslar (mass'in kendisiyle
  // AYNI koordinat sistemi — StudioScene.scope.test.ts'teki kat bandi halka
  // duzeltmesiyle ayni mantik).
  it('zemin kat (0-0) dunya Y [0, floorHeightM] araligina eslenir', () => {
    const [segment] = mapProgramBandsToWorldY([band({ floorRange: { startFloor: 0, endFloor: 0 } })], mass);
    expect(segment.bottomWorldY).toBe(0);
    expect(segment.topWorldY).toBe(3.2);
    expect(segment.heightM).toBe(3.2);
  });

  it('1-3 kat araligi dunya Y [floorHeightM, 4*floorHeightM] araligina eslenir', () => {
    const [segment] = mapProgramBandsToWorldY([band({ floorRange: { startFloor: 1, endFloor: 3 } })], mass);
    expect(segment.bottomWorldY).toBe(3.2);
    expect(segment.topWorldY).toBe(12.8);
    expect(segment.heightM).toBeCloseTo(9.6, 5);
  });

  it('bant kutlenin yuksekligini asarsa (veri tutarsizligi) sessizce kirpmaz, oldugu gibi doner', () => {
    const [segment] = mapProgramBandsToWorldY([band({ floorRange: { startFloor: 5, endFloor: 6 } })], mass);
    expect(segment.topWorldY).toBeGreaterThan(mass.heightM);
  });
});

describe('createProgramBandGeometry', () => {
  it('segment yuksekligi kadar bir geometri uretir (bounding box Y araligi heightM ile eslesir)', () => {
    const [segment] = mapProgramBandsToWorldY([band({ floorRange: { startFloor: 0, endFloor: 0 } })], mass);
    const geometry = createProgramBandGeometry(mass, segment);
    geometry.computeBoundingBox();
    const box = geometry.boundingBox!;
    expect(box.max.y - box.min.y).toBeCloseTo(segment.heightM, 5);
  });

  it('footprint XZ acikligi ana kutle geometrisiyle AYNI kalir (bantlar arasi yatay kayma olmaz)', () => {
    const segmentA = mapProgramBandsToWorldY([band({ floorRange: { startFloor: 0, endFloor: 0 } })], mass)[0];
    const segmentB = mapProgramBandsToWorldY([band({ floorRange: { startFloor: 1, endFloor: 3 } })], mass)[0];
    const geoA = createProgramBandGeometry(mass, segmentA);
    const geoB = createProgramBandGeometry(mass, segmentB);
    geoA.computeBoundingBox();
    geoB.computeBoundingBox();
    expect(geoA.boundingBox!.min.x).toBeCloseTo(geoB.boundingBox!.min.x, 5);
    expect(geoA.boundingBox!.max.x).toBeCloseTo(geoB.boundingBox!.max.x, 5);
  });
});
