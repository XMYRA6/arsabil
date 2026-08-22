import type { ParcelInfo } from '@/lib/tkgm/parcel';
import type {
  ParcelGeometrySource,
  ParcelGeometrySourceKind,
  StudioPoint,
  StudioPolygon,
  StudioWarning,
} from './types';

const MINIMUM_POINT_COUNT = 3;
const AREA_MISMATCH_RATIO = 0.08;

function samePoint(a: StudioPoint, b: StudioPoint): boolean {
  return a.x === b.x && a.y === b.y;
}

function isFinitePoint(point: StudioPoint): boolean {
  return Number.isFinite(point.x) && Number.isFinite(point.y);
}

function orientation(a: StudioPoint, b: StudioPoint, c: StudioPoint): number {
  return (b.y - a.y) * (c.x - b.x) - (b.x - a.x) * (c.y - b.y);
}

function onSegment(a: StudioPoint, b: StudioPoint, c: StudioPoint): boolean {
  return Math.min(a.x, c.x) <= b.x && b.x <= Math.max(a.x, c.x) &&
    Math.min(a.y, c.y) <= b.y && b.y <= Math.max(a.y, c.y);
}

function segmentsIntersect(a: StudioPoint, b: StudioPoint, c: StudioPoint, d: StudioPoint): boolean {
  const o1 = orientation(a, b, c);
  const o2 = orientation(a, b, d);
  const o3 = orientation(c, d, a);
  const o4 = orientation(c, d, b);

  if (o1 === 0 && onSegment(a, c, b)) return true;
  if (o2 === 0 && onSegment(a, d, b)) return true;
  if (o3 === 0 && onSegment(c, a, d)) return true;
  if (o4 === 0 && onSegment(c, b, d)) return true;

  return (o1 > 0) !== (o2 > 0) && (o3 > 0) !== (o4 > 0);
}

export function closePolygon(points: StudioPoint[]): StudioPoint[] {
  if (points.length === 0) return [];
  return samePoint(points[0], points[points.length - 1]) ? [...points] : [...points, points[0]];
}

export function openPolygon(points: StudioPoint[]): StudioPoint[] {
  if (points.length > 1 && samePoint(points[0], points[points.length - 1])) {
    return points.slice(0, -1);
  }
  return [...points];
}

export function calculatePolygonAreaM2(points: StudioPoint[]): number {
  const ring = closePolygon(openPolygon(points));
  if (ring.length < MINIMUM_POINT_COUNT + 1) return 0;

  let area = 0;
  for (let index = 0; index < ring.length - 1; index += 1) {
    const current = ring[index];
    const next = ring[index + 1];
    area += current.x * next.y - next.x * current.y;
  }
  return Math.abs(area) / 2;
}

export function hasSelfIntersection(points: StudioPoint[]): boolean {
  const ring = closePolygon(openPolygon(points));
  for (let i = 0; i < ring.length - 1; i += 1) {
    for (let j = i + 1; j < ring.length - 1; j += 1) {
      const adjacent = Math.abs(i - j) <= 1 || (i === 0 && j === ring.length - 2);
      if (adjacent) continue;
      if (segmentsIntersect(ring[i], ring[i + 1], ring[j], ring[j + 1])) return true;
    }
  }
  return false;
}

export function validateStudioPolygon(polygon: StudioPolygon | null | undefined, reportedAreaM2?: number | null): StudioWarning[] {
  const warnings: StudioWarning[] = [];

  if (!polygon || polygon.source === 'unavailable') {
    return [{ code: 'MISSING_GEOMETRY', message: 'Studio icin parsel geometrisi kaynagi yok.' }];
  }

  const points = openPolygon(polygon.points);
  if (points.length < MINIMUM_POINT_COUNT || points.some((point) => !isFinitePoint(point))) {
    warnings.push({ code: 'INVALID_GEOMETRY', message: 'Parsel geometrisi en az uc gecerli noktadan olusmalidir.' });
  }

  const polygonArea = calculatePolygonAreaM2(points);
  if (polygonArea <= 0) {
    warnings.push({ code: 'INVALID_AREA', message: 'Parsel polygon alani pozitif olmalidir.' });
  }

  if (hasSelfIntersection(points)) {
    warnings.push({ code: 'INVALID_GEOMETRY', message: 'Parsel polygonu kendi kendini kesmemelidir.' });
  }

  const referenceArea = reportedAreaM2 ?? polygon.areaM2;
  if (referenceArea && referenceArea > 0 && polygonArea > 0) {
    const mismatchRatio = Math.abs(polygonArea - referenceArea) / referenceArea;
    if (mismatchRatio > AREA_MISMATCH_RATIO) {
      warnings.push({
        code: 'AREA_MISMATCH',
        message: 'Parsel polygon alani bildirilen parsel alanindan belirgin sekilde farkli.',
      });
    }
  }

  if (polygon.source === 'demo') {
    warnings.push({ code: 'DEMO_GEOMETRY', message: '3D kutle demo parsel siniriyle gosteriliyor; resmi parsel olarak kaydedilmez.' });
  }

  return warnings;
}

export function createParcelGeometrySource(args: {
  source: ParcelGeometrySourceKind;
  points?: StudioPoint[] | null;
  areaM2?: number | null;
  parcelIdentity?: ParcelGeometrySource['parcelIdentity'];
  verifiedAt?: string;
  notes?: string;
}): ParcelGeometrySource {
  if (!args.points || args.points.length === 0 || args.source === 'unavailable') {
    return {
      source: args.source,
      status: 'unavailable',
      areaM2: args.areaM2 ?? null,
      parcelIdentity: args.parcelIdentity,
      verifiedAt: args.verifiedAt,
      notes: args.notes,
    };
  }

  const polygon: StudioPolygon = {
    source: args.source,
    points: openPolygon(args.points),
    areaM2: args.areaM2 ?? null,
    parcelIdentity: args.parcelIdentity,
    status: 'valid',
  };
  const warnings = validateStudioPolygon(polygon, args.areaM2);
  const hasBlockingWarning = warnings.some((warning) => ['INVALID_GEOMETRY', 'INVALID_AREA'].includes(warning.code));
  polygon.status = hasBlockingWarning ? 'invalid' : 'valid';

  return {
    source: args.source,
    status: polygon.status,
    areaM2: args.areaM2 ?? calculatePolygonAreaM2(polygon.points),
    polygon,
    parcelIdentity: args.parcelIdentity,
    verifiedAt: args.verifiedAt,
    notes: args.notes,
  };
}

/**
 * Converts the first GeoJSON polygon ring from TKGM into the Studio footprint.
 * GeoJSON coordinates are `[lng, lat]`; Studio keeps those axes as `x/y` and
 * the Three.js geometry layer recenters them before rendering.
 */
export function createVerifiedParcelPolygon(parcel: ParcelInfo): StudioPolygon | null {
  const ring = parcel.geometry.coordinates?.[0];
  if (!Array.isArray(ring)) return null;

  const points = ring
    .filter((coordinate): coordinate is [number, number] =>
      Array.isArray(coordinate) &&
      coordinate.length >= 2 &&
      Number.isFinite(coordinate[0]) &&
      Number.isFinite(coordinate[1]),
    )
    .map(([lng, lat]) => ({ x: lng, y: lat }));

  const source = createParcelGeometrySource({
    source: 'verified_tkgm',
    points,
    areaM2: parcel.areaSqm,
    parcelIdentity: {
      il: parcel.il,
      ilce: parcel.ilce,
      mahalle: parcel.mahalle,
      adaNo: parcel.adaNo,
      parselNo: parcel.parselNo,
    },
  });

  return source.status === 'valid' ? source.polygon ?? null : null;
}
