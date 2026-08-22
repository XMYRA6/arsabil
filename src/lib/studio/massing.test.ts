import { collectMassingWarnings, deriveBuildingMass } from './massing';
import type { StudioPolygon } from './types';

const POLYGON: StudioPolygon = {
  source: 'verified_tkgm',
  points: [
    { x: 0, y: 0 },
    { x: 20, y: 0 },
    { x: 20, y: 10 },
    { x: 0, y: 10 },
  ],
};

describe('deriveBuildingMass', () => {
  it('valid parcel geometry and construction area produce a mass with explicit height', () => {
    const mass = deriveBuildingMass({
      parcelAreaM2: 200,
      grossConstructionAreaM2: 600,
      grossConstructionAreaSource: 'authoritative',
      assumedFloorCount: 4,
      floorHeightM: 3,
      parcelPolygon: POLYGON,
    });

    expect(mass).toMatchObject({
      floorCount: 4,
      floorHeightM: 3,
      heightM: 12,
      grossConstructionAreaM2: 600,
      footprint: POLYGON,
    });
  });

  it('estimates floor count from gross construction area when an explicit floor count is missing', () => {
    const mass = deriveBuildingMass({
      parcelAreaM2: 200,
      grossConstructionAreaM2: 650,
      grossConstructionAreaSource: 'estimated_apartment_area',
      parcelPolygon: POLYGON,
    });

    expect(mass?.floorCount).toBe(4);
    expect(mass?.heightM).toBeCloseTo(12.8);
  });

  it('returns null and warnings when construction area is missing', () => {
    const input = { parcelAreaM2: 200, grossConstructionAreaM2: null, grossConstructionAreaSource: null, parcelPolygon: POLYGON };

    expect(deriveBuildingMass(input)).toBeNull();
    expect(collectMassingWarnings(input)).toContainEqual({
      code: 'MISSING_GROSS_CONSTRUCTION_AREA',
      message: '3D kutle icin insaat alani verisi gerekiyor; kaynak etiketi authoritative veya estimated olmalidir.',
    });
  });

  it('returns null and warnings when parcel geometry is missing', () => {
    const input = { parcelAreaM2: 200, grossConstructionAreaM2: 600, grossConstructionAreaSource: 'authoritative' as const };

    expect(deriveBuildingMass(input)).toBeNull();
    expect(collectMassingWarnings(input).map((warning) => warning.code)).toContain('MISSING_GEOMETRY');
  });

  it('carries demo geometry as a nonblocking source warning', () => {
    const mass = deriveBuildingMass({
      parcelAreaM2: 200,
      grossConstructionAreaM2: 600,
      grossConstructionAreaSource: 'estimated_apartment_area',
      assumedFloorCount: 3,
      parcelPolygon: { ...POLYGON, source: 'demo' },
    });

    expect(mass).not.toBeNull();
    expect(mass?.warnings).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'DEMO_GEOMETRY' }),
    ]));
  });

  it('returns null and warnings when parcel area or floor count is invalid', () => {
    const input = {
      parcelAreaM2: 0,
      grossConstructionAreaM2: 600,
      grossConstructionAreaSource: 'authoritative' as const,
      assumedFloorCount: -2,
      parcelPolygon: POLYGON,
    };

    expect(deriveBuildingMass(input)).toBeNull();
    expect(collectMassingWarnings(input).map((warning) => warning.code)).toEqual([
      'INVALID_AREA',
      'INVALID_FLOOR_COUNT',
    ]);
  });
});



