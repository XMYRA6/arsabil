import { calculatePolygonAreaM2 } from './parcelGeometry';
import type { FootprintDraft, StudioPoint, StudioWarning } from './types';

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

export function computeCentroid(points: StudioPoint[]): StudioPoint {
  if (points.length === 0) return { x: 0, y: 0 };
  const sum = points.reduce((acc, point) => ({ x: acc.x + point.x, y: acc.y + point.y }), { x: 0, y: 0 });
  return { x: sum.x / points.length, y: sum.y / points.length };
}

export type PolygonBounds = { minX: number; minY: number; maxX: number; maxY: number; width: number; height: number };

export function computePolygonBounds(points: StudioPoint[]): PolygonBounds {
  if (points.length === 0) return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 };
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
}

export type ViewBox = { x: number; y: number; width: number; height: number };

/** SVG `viewBox` icin sinir kutusunu `paddingRatio` kadar genisletir —
 * footprint tam kenara yapismasin diye (Task 3'un okunabilir gorunumu). */
export function computeViewBox(points: StudioPoint[], paddingRatio = 0.1): ViewBox {
  const bounds = computePolygonBounds(points);
  const padX = bounds.width * paddingRatio;
  const padY = bounds.height * paddingRatio;
  return {
    x: bounds.minX - padX,
    y: bounds.minY - padY,
    width: bounds.width + padX * 2,
    height: bounds.height + padY * 2,
  };
}

function distanceToSegment(point: StudioPoint, a: StudioPoint, b: StudioPoint): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSq = dx * dx + dy * dy;
  if (lengthSq === 0) return Math.hypot(point.x - a.x, point.y - a.y);
  const t = Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / lengthSq));
  return Math.hypot(point.x - (a.x + t * dx), point.y - (a.y + t * dy));
}

const BOUNDARY_EPSILON_M = 1e-6;

/**
 * BUG (bu oturumda Playwright ile yakalandi): kimlik taslak (scale=1) ile
 * `deriveFootprintPolygon`, TABAN POLIGONUN KENDI kopelerini uretir —
 * footprint noktalari parselin KENDI koseleriyle TAM AYNI. Standart
 * ray-casting'in kesisim testi (`a.y > point.y !== b.y > point.y`)
 * test edilen nokta TAM BIR KOSE oldugunda dejenere olur (o kosenin
 * kendisiyle karsilastirmasi her zaman `false` doner) — sonuc: bir
 * poligonun kendi koseleri, kendi poligonuna karsi test edilince "disarida"
 * cikabiliyordu, yani DEGISTIRILMEMIS varsayilan durumda bile sahte
 * "parsel disina tasiyor" uyarisi goruluyordu. Fix: sinira (kenara) COK
 * yakin (`BOUNDARY_EPSILON_M`) noktalar ONCE kontrol edilir ve ICERIDE
 * sayilir — kapali bir poligonun sinirinin kendisi de "icinde" kabul
 * edilir, bu hem matematiksel olarak dogru hem de kose-dejenerasyonunu
 * kokten cozer.
 */
function isPointOnPolygonBoundary(point: StudioPoint, polygon: StudioPoint[]): boolean {
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    if (distanceToSegment(point, polygon[j], polygon[i]) <= BOUNDARY_EPSILON_M) return true;
  }
  return false;
}

/** Ray-casting ile nokta-icinde-poligon testi (sinir DAHIL — bkz. `isPointOnPolygonBoundary`). */
export function isPointInPolygon(point: StudioPoint, polygon: StudioPoint[]): boolean {
  if (isPointOnPolygonBoundary(point, polygon)) return true;

  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const a = polygon[i];
    const b = polygon[j];
    const intersects = a.y > point.y !== b.y > point.y &&
      point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x;
    if (intersects) inside = !inside;
  }
  return inside;
}

/**
 * BASIT containment (Task 2 bullet 1) — inner'in TUM koselerinin outer
 * icinde olup olmadigini kontrol eder, kenar-kenar kesisimi ARAMAZ. Studio
 * bir CAD araci degildir (Exit Criteria); bu kaba ama deterministik kontrol
 * onizleme amaci icin yeterlidir.
 */
export function isPolygonWithin(inner: StudioPoint[], outer: StudioPoint[]): boolean {
  return inner.every((point) => isPointInPolygon(point, outer));
}

const MIN_INSET_SCALE = 0.05;

/**
 * `basePolygon`i (Faz 3A Task 1 karari: `scale=1` -> ayni boyut) taslagin
 * merkez/donus/olcek/inset parametreleriyle DETERMINISTIK donusturur. Sira:
 * tabanin KENDI merkezine gore olcekle -> dondur -> merkez ofsetiyle otele
 * -> (varsa) sonucun kendi merkezine dogru inset ile ikinci bir kucultme.
 */
export function deriveFootprintPolygon(basePolygon: StudioPoint[], draft: FootprintDraft): StudioPoint[] {
  if (basePolygon.length === 0) return [];

  const centroid = computeCentroid(basePolygon);
  const angle = toRadians(draft.rotationDeg);
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);

  const transformed = basePolygon.map((point) => {
    const localX = (point.x - centroid.x) * draft.scale;
    const localY = (point.y - centroid.y) * draft.scale;
    return {
      x: localX * cos - localY * sin + centroid.x + draft.centerX,
      y: localX * sin + localY * cos + centroid.y + draft.centerY,
    };
  });

  if (!draft.insetM) return transformed;

  const transformedCentroid = computeCentroid(transformed);
  const bounds = computePolygonBounds(transformed);
  const effectiveRadius = Math.max((bounds.width + bounds.height) / 4, 0.01);
  const insetScale = Math.max(MIN_INSET_SCALE, 1 - draft.insetM / effectiveRadius);

  return transformed.map((point) => ({
    x: transformedCentroid.x + (point.x - transformedCentroid.x) * insetScale,
    y: transformedCentroid.y + (point.y - transformedCentroid.y) * insetScale,
  }));
}

/**
 * Faz 3A Task 2 bullet 3 — "parsel icinde kalmayan VEYA alan butcesini asan"
 * durumlarini AYRI, siniflandirilmis uyarilarla doner (tek koda karistirmaz).
 */
export function classifyFootprintAgainstParcel(
  footprint: StudioPoint[],
  parcel: StudioPoint[],
  budgetAreaM2?: number | null,
): StudioWarning[] {
  const warnings: StudioWarning[] = [];
  if (footprint.length < 3 || parcel.length < 3) return warnings;

  if (!isPolygonWithin(footprint, parcel)) {
    warnings.push({
      code: 'LAYOUT_FOOTPRINT_OUTSIDE_PARCEL',
      message: 'Footprint parsel sınırının dışına taşıyor.',
    });
  }

  if (typeof budgetAreaM2 === 'number' && budgetAreaM2 > 0) {
    const footprintAreaM2 = calculatePolygonAreaM2(footprint);
    if (footprintAreaM2 > budgetAreaM2) {
      warnings.push({
        code: 'LAYOUT_FOOTPRINT_EXCEEDS_AREA_BUDGET',
        message: 'Footprint alanı bütçelenen alanı aşıyor.',
      });
    }
  }

  return warnings;
}
