import type { ParcelInfo } from '@/lib/tkgm/parcel';
import type { ParcelGeometrySource, StudioPoint } from './types';
import { createParcelGeometrySource } from './parcelGeometry';

type GeoJsonPolygon = {
  type: 'Polygon';
  coordinates: number[][][];
};

type GeoJsonFeature = {
  type: 'Feature';
  geometry?: GeoJsonPolygon | null;
  properties?: Record<string, unknown> | null;
};

type GeoJsonInput = GeoJsonPolygon | GeoJsonFeature;

export type ParcelInputAdapterResult = ParcelGeometrySource;

function pointsFromGeoJson(input: GeoJsonInput): StudioPoint[] | null {
  const geometry = input.type === 'Feature' ? input.geometry : input;
  const ring = geometry?.coordinates?.[0];
  if (!Array.isArray(ring)) return null;

  const points = ring
    .filter((coordinate): coordinate is number[] => Array.isArray(coordinate) && coordinate.length >= 2)
    .map(([x, y]) => ({ x, y }));

  return points.length > 0 ? points : null;
}

export function adaptUserDrawnParcel(points: StudioPoint[], areaM2?: number | null): ParcelInputAdapterResult {
  return createParcelGeometrySource({ source: 'user_drawn', points, areaM2, notes: 'Kullanici tarafindan cizilen taslak geometri.' });
}

export function adaptImportedGeoJson(input: GeoJsonInput, areaM2?: number | null): ParcelInputAdapterResult {
  return createParcelGeometrySource({
    source: 'imported',
    points: pointsFromGeoJson(input),
    areaM2,
    notes: 'Kullanici tarafindan ice aktarilan GeoJSON geometri.',
  });
}

export function adaptVerifiedParcel(parcel: ParcelInfo, verifiedAt?: string): ParcelInputAdapterResult {
  const ring = parcel.geometry.coordinates?.[0];
  const points = Array.isArray(ring)
    ? ring
      .filter((coordinate): coordinate is [number, number] =>
        Array.isArray(coordinate) && coordinate.length >= 2 && Number.isFinite(coordinate[0]) && Number.isFinite(coordinate[1]),
      )
      .map(([lng, lat]) => ({ x: lng, y: lat }))
    : null;

  return createParcelGeometrySource({
    source: 'verified_tkgm',
    points,
    areaM2: parcel.areaSqm,
    verifiedAt,
    parcelIdentity: {
      il: parcel.il,
      ilce: parcel.ilce,
      mahalle: parcel.mahalle,
      adaNo: parcel.adaNo,
      parselNo: parcel.parselNo,
    },
    notes: 'Kullanici tarafindan dogrulanan parsel yaniti.',
  });
}

export function createUnavailableParcelSource(parcelIdentity?: ParcelGeometrySource['parcelIdentity']): ParcelInputAdapterResult {
  return createParcelGeometrySource({
    source: 'unavailable',
    parcelIdentity,
    notes: 'Harici parsel geometrisi bagli degil veya kullanici henuz geometri saglamadi.',
  });
}
