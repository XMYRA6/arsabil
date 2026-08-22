import { generateSiteContext, selectRoadEdge, MAX_SITE_TREES } from './siteContext';
import type { BuildingMass, StudioPolygon } from './types';

const smallParcel: StudioPolygon = {
  source: 'demo',
  points: [
    { x: 0, y: 0 },
    { x: 8, y: 0 },
    { x: 8, y: 8 },
    { x: 0, y: 8 },
  ],
};

const smallFootprintMass: BuildingMass = {
  footprint: {
    source: 'demo',
    points: [
      { x: 2, y: 2 },
      { x: 6, y: 2 },
      { x: 6, y: 6 },
      { x: 2, y: 6 },
    ],
  },
  heightM: 9,
  floorCount: 3,
  floorHeightM: 3,
  grossConstructionAreaM2: 48,
  warnings: [],
};

describe('generateSiteContext', () => {
  it('8x8 parselde, 4x4 ortadaki footprintin DISINDA, 4m izgara adiminda 9 adaydan 8ini yerlestirir (merkez (4,4) footprint icinde oldugu icin haric)', () => {
    const placements = generateSiteContext(smallParcel, smallFootprintMass);

    expect(placements).toHaveLength(8);
    // (4,4) footprint (2-6,2-6) icinde kaldigi icin ADAY LISTESINDE OLMAMALI.
    expect(placements.some((p) => p.x === 4 && p.y === 4)).toBe(false);
    // Parsel kosesi (0,0) footprint disinda -> olmali.
    expect(placements.some((p) => p.x === 0 && p.y === 0)).toBe(true);
  });

  it('yerlesimler tree-01/tree-02 arasinda siralı dagilir', () => {
    const placements = generateSiteContext(smallParcel, smallFootprintMass);
    expect(placements[0].assetId).toBe('tree-01');
    expect(placements[1].assetId).toBe('tree-02');
  });

  it('MAX_SITE_TREES sinirini asmaz (buyuk bir parselde adaylar coksa bile)', () => {
    const bigParcel: StudioPolygon = {
      source: 'demo',
      points: [
        { x: 0, y: 0 },
        { x: 40, y: 0 },
        { x: 40, y: 40 },
        { x: 0, y: 40 },
      ],
    };
    const farAwayFootprintMass: BuildingMass = {
      ...smallFootprintMass,
      footprint: {
        source: 'demo',
        points: [
          { x: 100, y: 100 },
          { x: 101, y: 100 },
          { x: 101, y: 101 },
          { x: 100, y: 101 },
        ],
      },
    };

    const placements = generateSiteContext(bigParcel, farAwayFootprintMass);
    expect(placements.length).toBe(MAX_SITE_TREES);
  });
});

describe('selectRoadEdge', () => {
  it('dikdortgen bir parselde EN UZUN kenari secer', () => {
    const rectangle: StudioPolygon = {
      source: 'demo',
      points: [
        { x: 0, y: 0 },
        { x: 20, y: 0 },
        { x: 20, y: 8 },
        { x: 0, y: 8 },
      ],
    };

    const road = selectRoadEdge(rectangle);

    expect(road.edgeStart).toEqual({ x: 0, y: 0 });
    expect(road.edgeEnd).toEqual({ x: 20, y: 0 });
    expect(road.widthM).toBeGreaterThan(0);
  });
});
