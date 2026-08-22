import type {
  StudioPoint,
  StudioPolygon,
  StudioLayoutDraft,
} from './types';

export interface Generate2dSvgOptions {
  parcelPolygon: StudioPolygon | null;
  footprintPolygon?: StudioPolygon | null;
  layoutDraft?: StudioLayoutDraft | null;
  width?: number;
  height?: number;
  padding?: number;
}

/**
 * Poligon nokta listesini verilen SVG viewBox olceklerine gore normallestirir.
 */
function computeBoundingBox(points: StudioPoint[]) {
  if (points.length === 0) {
    return { minX: 0, minY: 0, maxX: 100, maxY: 100, width: 100, height: 100 };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }

  const width = Math.max(1, maxX - minX);
  const height = Math.max(1, maxY - minY);

  return { minX, minY, maxX, maxY, width, height };
}

/**
 * Parsel ve bina yerlesimini temsil eden deterministik, bagimsiz SVG string'i uretir.
 * Sunucuda ve istemcide harici kutuphane gerektirmeden calisir.
 */
export function generate2dSvgString({
  parcelPolygon,
  footprintPolygon,
  layoutDraft,
  width = 600,
  height = 400,
  padding = 40,
}: Generate2dSvgOptions): string {
  const allPoints: StudioPoint[] = [
    ...(parcelPolygon?.points || []),
    ...(footprintPolygon?.points || []),
  ];

  if (allPoints.length === 0) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
      <rect width="${width}" height="${height}" fill="#f8fafc" rx="8"/>
      <text x="${width / 2}" y="${height / 2}" font-family="sans-serif" font-size="14" fill="#94a3b8" text-anchor="middle" dominant-baseline="middle">
        Geometri Verisi Bulunamadı
      </text>
    </svg>`;
  }

  const bbox = computeBoundingBox(allPoints);
  const innerWidth = width - padding * 2;
  const innerHeight = height - padding * 2;

  const scale = Math.min(innerWidth / bbox.width, innerHeight / bbox.height);
  const offsetX = (width - bbox.width * scale) / 2 - bbox.minX * scale;
  const offsetY = (height - bbox.height * scale) / 2 - bbox.minY * scale;

  const projectPoint = (p: StudioPoint): [number, number] => [
    Math.round((p.x * scale + offsetX) * 10) / 10,
    Math.round((height - (p.y * scale + offsetY)) * 10) / 10, // Y eksenini SVG icin ters cevir
  ];

  const pointsToPath = (points: StudioPoint[]): string => {
    if (points.length === 0) return '';
    const projected = points.map(projectPoint);
    return `M ${projected.map(([x, y]) => `${x},${y}`).join(' L ')} Z`;
  };

  const parcelPath = parcelPolygon?.points ? pointsToPath(parcelPolygon.points) : '';
  const footprintPath = footprintPolygon?.points ? pointsToPath(footprintPolygon.points) : '';

  // Ticaret cephesi vurgusu (varsa)
  let frontageLineSvg = '';
  if (
    footprintPolygon?.points &&
    footprintPolygon.points.length >= 2 &&
    layoutDraft?.commercialFrontage
  ) {
    const edgeIdx = layoutDraft.commercialFrontage.edgeIndex % footprintPolygon.points.length;
    const p1 = footprintPolygon.points[edgeIdx];
    const p2 = footprintPolygon.points[(edgeIdx + 1) % footprintPolygon.points.length];
    if (p1 && p2) {
      const [x1, y1] = projectPoint(p1);
      const [x2, y2] = projectPoint(p2);
      frontageLineSvg = `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#f59e0b" stroke-width="6" stroke-linecap="round"/>`;
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <defs>
    <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
      <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#f1f5f9" stroke-width="1"/>
    </pattern>
  </defs>
  <rect width="${width}" height="${height}" fill="#f8fafc" rx="8"/>
  <rect width="${width}" height="${height}" fill="url(#grid)" rx="8"/>
  ${
    parcelPath
      ? `<path d="${parcelPath}" fill="#e2e8f0" fill-opacity="0.4" stroke="#64748b" stroke-width="2" stroke-linejoin="round"/>`
      : ''
  }
  ${
    footprintPath
      ? `<path d="${footprintPath}" fill="#0284c7" fill-opacity="0.25" stroke="#0284c7" stroke-width="2.5" stroke-linejoin="round"/>`
      : ''
  }
  ${frontageLineSvg}
</svg>`.trim();
}

/**
 * SVG string'ini data URI formatina donusturur.
 */
export function svgToDataUri(svgString: string): string {
  const encoded = Buffer.from(svgString, 'utf-8').toString('base64');
  return `data:image/svg+xml;base64,${encoded}`;
}
