import { closePolygon, openPolygon } from './parcelGeometry';
import { computePolygonBounds, isPointInPolygon, deriveFootprintPolygon } from './geometry2d';
import type { BuildingMass, StudioLayoutDraft, StudioPoint, StudioPolygon } from './types';

export type SiteContextAssetId = 'tree-01' | 'tree-02';

export type SiteContextPlacement = {
  assetId: SiteContextAssetId;
  x: number;
  y: number;
  rotationDeg: number;
};

export type RoadPlacement = {
  edgeStart: StudioPoint;
  edgeEnd: StudioPoint;
  widthM: number;
};

const TREE_GRID_STEP_M = 4;
export const MAX_SITE_TREES = 12;
const ROAD_WIDTH_M = 4;

/**
 * Parsel sinirlarini kapsayan bir IZGARA taramasi yapar; footprint
 * DISINDA ve parsel SINIRLARI ICINDE kalan noktalari agac adayi olarak
 * secer. `MAX_SITE_TREES`e ulasinca durur (buyuk parsellerde performans
 * icin). Deterministik: ayni girdi HER ZAMAN ayni ciktiyi uretir (test
 * edilebilirlik ve "ayni senaryo ayni gorunum" ilkesi icin onemli).
 */
export function generateSiteContext(
  parcelPolygon: StudioPolygon,
  mass: BuildingMass,
  layoutDraft?: StudioLayoutDraft,
): SiteContextPlacement[] {
  const footprintPoints = layoutDraft
    ? deriveFootprintPolygon(mass.footprint.points, layoutDraft.footprint)
    : mass.footprint.points;

  const bounds = computePolygonBounds(parcelPolygon.points);
  const placements: SiteContextPlacement[] = [];

  for (let x = bounds.minX; x <= bounds.maxX && placements.length < MAX_SITE_TREES; x += TREE_GRID_STEP_M) {
    for (let y = bounds.minY; y <= bounds.maxY && placements.length < MAX_SITE_TREES; y += TREE_GRID_STEP_M) {
      const point = { x, y };
      const insideParcel = isPointInPolygon(point, parcelPolygon.points);
      const outsideFootprint = !isPointInPolygon(point, footprintPoints);
      if (insideParcel && outsideFootprint) {
        const assetId: SiteContextAssetId = placements.length % 2 === 0 ? 'tree-01' : 'tree-02';
        placements.push({ assetId, x, y, rotationDeg: (placements.length * 47) % 360 });
      }
    }
  }

  return placements;
}

/**
 * Parselin EN UZUN kenarini "yol cephesi" olarak secer — birden fazla
 * kenar esit uzunluktaysa ILK bulunani (deterministik). Yaklasik bir
 * gorsel referanstir, resmi imar cephe hatti DEGILDIR.
 */
export function selectRoadEdge(parcelPolygon: StudioPolygon): RoadPlacement {
  const ring = closePolygon(openPolygon(parcelPolygon.points));
  let longest: RoadPlacement = { edgeStart: ring[0], edgeEnd: ring[1], widthM: ROAD_WIDTH_M };
  let longestLength = 0;

  for (let i = 0; i < ring.length - 1; i += 1) {
    const a = ring[i];
    const b = ring[i + 1];
    const length = Math.hypot(b.x - a.x, b.y - a.y);
    if (length > longestLength) {
      longestLength = length;
      longest = { edgeStart: a, edgeEnd: b, widthM: ROAD_WIDTH_M };
    }
  }

  return longest;
}
