import { closePolygon, openPolygon } from './parcelGeometry';
import type { BuildingMass, StudioPoint } from './types';

export const FACADE_WINDOW_WIDTH_M = 1.2;
export const FACADE_WINDOW_HEIGHT_M = 1.5;
export const FACADE_WINDOW_MARGIN_M = 0.8;
export const FACADE_SILL_HEIGHT_M = 1.0;

export type FacadeWindow = {
  /** Kenar boyunca, baslangic noktasindan (start) itibaren metre. */
  x: number;
  /** Dunya Y (yukseklik), metre. */
  y: number;
  width: number;
  height: number;
};

export type FacadeWall = {
  start: StudioPoint;
  end: StudioPoint;
  lengthM: number;
  windows: FacadeWindow[];
};

function edgeLength(a: StudioPoint, b: StudioPoint): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

/**
 * Bir kenar icin, kat basina esit araliklarla dizilmis pencere satiri
 * uretir. Kenar cok kisaysa (tek pencere bile sigmiyorsa) BOS DIZI doner
 * — hata firlatmaz, o kenar sessizce penceresiz kalir.
 */
function windowsForEdge(lengthM: number, floorCount: number, floorHeightM: number): FacadeWindow[] {
  const slot = FACADE_WINDOW_WIDTH_M + FACADE_WINDOW_MARGIN_M;
  const windowCount = Math.floor((lengthM - FACADE_WINDOW_MARGIN_M) / slot);
  if (windowCount <= 0) return [];

  const segmentWidth = lengthM / windowCount;
  const windows: FacadeWindow[] = [];
  for (let floor = 0; floor < floorCount; floor += 1) {
    const y = floor * floorHeightM + FACADE_SILL_HEIGHT_M;
    for (let i = 0; i < windowCount; i += 1) {
      const x = segmentWidth * i + segmentWidth / 2 - FACADE_WINDOW_WIDTH_M / 2;
      windows.push({ x, y, width: FACADE_WINDOW_WIDTH_M, height: FACADE_WINDOW_HEIGHT_M });
    }
  }
  return windows;
}

/**
 * `BuildingMass`in footprint'inin HER KENARI icin, kat sayisina/kenar
 * uzunluguna otomatik uyarlanan bir pencere duzeni uretir. Three.js
 * nesnesi URETMEZ — yalnizca konum verisi dondurur (Task 4 bunu render
 * eder). `mass.footprint.points` genelde ACIK (kapanmamis) poligon
 * olarak gelir — `closePolygon`/`openPolygon` (parcelGeometry.ts,
 * mevcut) ile guvenli sekilde kapatilir.
 */
export function generateProceduralFacade(mass: BuildingMass): FacadeWall[] {
  const ring = closePolygon(openPolygon(mass.footprint.points));
  const walls: FacadeWall[] = [];

  for (let i = 0; i < ring.length - 1; i += 1) {
    const start = ring[i];
    const end = ring[i + 1];
    const lengthM = edgeLength(start, end);
    const windows = windowsForEdge(lengthM, mass.floorCount, mass.floorHeightM);
    walls.push({ start, end, lengthM, windows });
  }

  return walls;
}
