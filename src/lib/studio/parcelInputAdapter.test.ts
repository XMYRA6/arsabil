import type { ParcelInfo } from '@/lib/tkgm/parcel';
import {
  adaptImportedGeoJson,
  adaptUserDrawnParcel,
  adaptVerifiedParcel,
  createUnavailableParcelSource,
} from './parcelInputAdapter';

const square = [
  { x: 0, y: 0 },
  { x: 20, y: 0 },
  { x: 20, y: 10 },
  { x: 0, y: 10 },
];

const parcel: ParcelInfo = {
  il: 'Izmir',
  ilce: 'Urla',
  mahalle: 'Iskele',
  adaNo: '101',
  parselNo: '7',
  areaSqm: 200,
  quality: 'Arsa',
  geometry: {
    type: 'Polygon',
    coordinates: [[[0, 0], [20, 0], [20, 10], [0, 10], [0, 0]]],
  },
};

describe('parcel input adapter boundary', () => {
  it('adapts user drawn points into a draft geometry source', () => {
    expect(adaptUserDrawnParcel(square, 200)).toMatchObject({
      source: 'user_drawn',
      status: 'valid',
      areaM2: 200,
      polygon: { source: 'user_drawn', points: square },
    });
  });

  it('adapts imported GeoJSON Polygon and strips the closing coordinate', () => {
    const source = adaptImportedGeoJson({
      type: 'Polygon',
      coordinates: [[[0, 0], [20, 0], [20, 10], [0, 10], [0, 0]]],
    }, 200);

    expect(source).toMatchObject({ source: 'imported', status: 'valid' });
    expect(source.polygon?.points).toEqual(square);
  });

  it('adapts imported GeoJSON Feature geometry', () => {
    expect(adaptImportedGeoJson({
      type: 'Feature',
      geometry: { type: 'Polygon', coordinates: [[[0, 0], [20, 0], [20, 10], [0, 10], [0, 0]]] },
      properties: { name: 'demo' },
    }, 200).polygon?.source).toBe('imported');
  });

  it('adapts verified parcel metadata without hiding identity fields', () => {
    expect(adaptVerifiedParcel(parcel, '2026-08-19T10:00:00.000Z')).toMatchObject({
      source: 'verified_tkgm',
      status: 'valid',
      verifiedAt: '2026-08-19T10:00:00.000Z',
      parcelIdentity: {
        il: 'Izmir',
        ilce: 'Urla',
        mahalle: 'Iskele',
        adaNo: '101',
        parselNo: '7',
      },
    });
  });

  it('represents missing external source as controlled unavailable state', () => {
    const source = createUnavailableParcelSource({ il: 'Ankara', adaNo: '12' });

    expect(source).toMatchObject({
      source: 'unavailable',
      status: 'unavailable',
      parcelIdentity: { il: 'Ankara', adaNo: '12' },
    });
    expect(source.polygon).toBeUndefined();
  });
});
