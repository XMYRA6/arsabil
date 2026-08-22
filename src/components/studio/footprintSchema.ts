import type { StudioPoint } from '@/lib/studio/types';

const VIEWBOX = 100;
const PADDING = 8;

/**
 * Footprint noktalarini 0-100 SVG viewBox'ina normalize eder — WebGL fallback
 * (Faz 1B Task 3) icin canvas'siz, saf HTML/SVG bir footprint semasi ciziminde
 * kullanilir. `createMassGeometry`in Three.js `.center()` cagrisina benzer
 * sekilde, burada da mutlak koordinatlar degil ORAN onemlidir.
 */
export function footprintToSvgPoints(points: StudioPoint[]): string {
  if (points.length === 0) return '';

  const bounds = points.reduce(
    (acc, point) => ({
      minX: Math.min(acc.minX, point.x),
      maxX: Math.max(acc.maxX, point.x),
      minY: Math.min(acc.minY, point.y),
      maxY: Math.max(acc.maxY, point.y),
    }),
    { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity },
  );

  const width = bounds.maxX - bounds.minX || 1;
  const depth = bounds.maxY - bounds.minY || 1;
  const scale = (VIEWBOX - PADDING * 2) / Math.max(width, depth);

  return points
    .map((point) => {
      const x = PADDING + (point.x - bounds.minX) * scale;
      // SVG'de Y asagi dogru artar; footprint'in Y ekseni yukari artiyor
      // (Three.js dunyasi ile ayni yon) — cevirmezsek sema aynalanmis gorunur.
      const y = VIEWBOX - PADDING - (point.y - bounds.minY) * scale;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
}
