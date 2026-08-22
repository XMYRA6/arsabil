import type { BuildingMass, StudioPoint } from '@/lib/studio/types';

export type StudioCameraView = {
  position: [number, number, number];
  target: [number, number, number];
};

function footprintSpan(points: StudioPoint[]): number {
  if (points.length === 0) return 1;
  const bounds = points.reduce(
    (acc, point) => ({
      minX: Math.min(acc.minX, point.x),
      maxX: Math.max(acc.maxX, point.x),
      minY: Math.min(acc.minY, point.y),
      maxY: Math.max(acc.maxY, point.y),
    }),
    { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity },
  );
  const width = bounds.maxX - bounds.minX;
  const depth = bounds.maxY - bounds.minY;
  return Math.max(width, depth, 1);
}

/**
 * Kutlenin taban genisligine ve yuksekligine gore deterministik bir baslangic
 * kamera konumu/hedefi uretir (Faz 1B Task 1) — sabit `[42, 34, 42]` her
 * bina boyutu icin ayni cerceveyi kullaniyordu: kucuk bir kutle mikroskobik
 * kalirken buyuk bir kutle kadraj disina tasabiliyordu. `createMassGeometry`
 * geometriyi kendi merkezine gore ortaliyor (`.center()`), bu yuzden footprint
 * her zaman dunya orijininde (0,0) kabul edilebilir — yalnizca ACIKLIK
 * (taban genisligi/derinligi) ve yukseklik onemli.
 */
export function computeInitialCameraView(mass: BuildingMass): StudioCameraView {
  const span = footprintSpan(mass.footprint.points);
  const heightM = Math.max(mass.heightM, 1);

  // Hem taban acikligini hem yuksekligi kadraja sigdiracak yaricap; sonra
  // izometrik-benzeri bir mesafeye olceklenir. Katsayilar demo senaryoda
  // (span~34, height~13 -> eski sabit [42,34,42]) benzer buyuklukte bir
  // kadraj uretecek sekilde secildi.
  const radius = Math.max(span * 1.15, heightM * 1.6);
  const distance = radius * 1.5;

  return {
    position: [distance, distance * 0.8, distance],
    target: [0, heightM / 2, 0],
  };
}
