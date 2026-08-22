import { buildFootprintShape, getFootprintCenter, resolveEffectiveMass } from './buildMassGeometry';
import type { BuildingMass, StudioPoint } from '@/lib/studio/types';

const points: StudioPoint[] = [
  { x: 0, y: 0 },
  { x: 20, y: 0 },
  { x: 20, y: 10 },
  { x: 0, y: 10 },
];

describe('Studio mass geometry helpers', () => {
  it('builds a closed footprint shape from polygon points', () => {
    const shape = buildFootprintShape(points);
    const shapePoints = shape.getPoints();

    expect(shapePoints[0]).toMatchObject({ x: 0, y: 0 });
    expect(shapePoints.at(-1)).toMatchObject({ x: 0, y: 0 });
  });

  it('computes the footprint center from bounds', () => {
    expect(getFootprintCenter(points)).toEqual([10, 5]);
  });
});

describe('resolveEffectiveMass (Faz 3A Task 5 bullet 1)', () => {
  const mass: BuildingMass = {
    footprint: { source: 'demo', points, areaM2: 200 },
    heightM: 12,
    floorCount: 4,
    floorHeightM: 3,
    grossConstructionAreaM2: 800,
    warnings: [],
  };
  const overridePoints: StudioPoint[] = [
    { x: 2, y: 2 }, { x: 18, y: 2 }, { x: 18, y: 8 }, { x: 2, y: 8 },
  ];

  it('footprintOverride verilmezse mass i degistirmeden aynen doner', () => {
    expect(resolveEffectiveMass(mass, undefined)).toBe(mass);
  });

  it('footprintOverride verilirse SADECE footprint.points i degistirir, heightM/floorCount DEGISMEZ', () => {
    const result = resolveEffectiveMass(mass, overridePoints);
    expect(result.footprint.points).toEqual(overridePoints);
    expect(result.heightM).toBe(mass.heightM);
    expect(result.floorCount).toBe(mass.floorCount);
    expect(result.grossConstructionAreaM2).toBe(mass.grossConstructionAreaM2);
  });

  it('3 noktadan az bir override gecersiz sayilir, mass degismeden doner', () => {
    expect(resolveEffectiveMass(mass, [{ x: 0, y: 0 }, { x: 1, y: 1 }])).toBe(mass);
  });
});

