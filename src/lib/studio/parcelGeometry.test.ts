import type { ParcelInfo } from '@/lib/tkgm/parcel';
import {
  calculatePolygonAreaM2,
  closePolygon,
  createParcelGeometrySource,
  createVerifiedParcelPolygon,
  hasSelfIntersection,
  validateStudioPolygon,
} from './parcelGeometry';

const parcel: ParcelInfo = {
  il: 'Istanbul',
  ilce: 'Kadikoy',
  mahalle: 'Moda',
  adaNo: '12',
  parselNo: '34',
  areaSqm: 360,
  quality: 'Arsa',
  geometry: {
    type: 'Polygon',
    coordinates: [[[29.01, 40.98], [29.02, 40.98], [29.02, 40.99], [29.01, 40.98]]],
  },
};

const square = [
  { x: 0, y: 0 },
  { x: 20, y: 0 },
  { x: 20, y: 10 },
  { x: 0, y: 10 },
];

describe('parcel geometry source contract', () => {
  it('closes polygons without mutating already closed rings', () => {
    expect(closePolygon(square)).toEqual([...square, square[0]]);
    expect(closePolygon([...square, square[0]])).toEqual([...square, square[0]]);
  });

  it('calculates polygon area with the shoelace formula', () => {
    expect(calculatePolygonAreaM2(square)).toBe(200);
  });

  it('detects self-intersecting polygons', () => {
    expect(hasSelfIntersection([
      { x: 0, y: 0 },
      { x: 10, y: 10 },
      { x: 0, y: 10 },
      { x: 10, y: 0 },
    ])).toBe(true);
  });

  it('creates a valid user-drawn source and warns on reported-area mismatch without blocking it', () => {
    const source = createParcelGeometrySource({ source: 'user_drawn', points: square, areaM2: 1000 });

    expect(source.status).toBe('valid');
    expect(source.polygon?.source).toBe('user_drawn');
    expect(validateStudioPolygon(source.polygon, source.areaM2)).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'AREA_MISMATCH' }),
    ]));
  });

  it('marks invalid coordinates and zero-area polygons as invalid geometry', () => {
    const source = createParcelGeometrySource({
      source: 'imported',
      points: [{ x: 0, y: 0 }, { x: Number.NaN, y: 0 }, { x: 0, y: 0 }],
    });

    expect(source.status).toBe('invalid');
    expect(validateStudioPolygon(source.polygon)).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'INVALID_GEOMETRY' }),
      expect.objectContaining({ code: 'INVALID_AREA' }),
    ]));
  });

  it('keeps demo geometry visibly tagged with a warning', () => {
    const source = createParcelGeometrySource({ source: 'demo', points: square });

    expect(source.status).toBe('valid');
    expect(source.polygon?.source).toBe('demo');
    expect(validateStudioPolygon(source.polygon)).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'DEMO_GEOMETRY' }),
    ]));
  });

  it('returns unavailable as a controlled state instead of a failed request', () => {
    const source = createParcelGeometrySource({ source: 'unavailable' });
    expect(source).toMatchObject({ source: 'unavailable', status: 'unavailable' });
    expect(source.polygon).toBeUndefined();
  });
});

describe('createVerifiedParcelPolygon', () => {
  it('converts a closed TKGM GeoJSON ring into an open Studio parcel polygon', () => {
    expect(createVerifiedParcelPolygon(parcel)).toMatchObject({
      source: 'verified_tkgm',
      points: [{ x: 29.01, y: 40.98 }, { x: 29.02, y: 40.98 }, { x: 29.02, y: 40.99 }],
      parcelIdentity: {
        il: 'Istanbul',
        ilce: 'Kadikoy',
        mahalle: 'Moda',
        adaNo: '12',
        parselNo: '34',
      },
    });
  });

  it('rejects an invalid ring', () => {
    expect(createVerifiedParcelPolygon({ ...parcel, geometry: { type: 'Polygon', coordinates: [[]] } })).toBeNull();
  });
});



