import * as THREE from 'three';
import type { BuildingMass, StudioPoint } from '@/lib/studio/types';

/**
 * Faz 3A Task 5 bullet 1 — 2D yerlesim tahtasinin (Faz 3A Task 1-4)
 * urettigi footprint'i (varsa) 3D kutleye AKTARIR: yalnizca
 * `mass.footprint.points`i degistirir, `heightM`/`floorCount`/
 * `grossConstructionAreaM2` DEGISMEZ — 2D duzenleme sadece yatay izi
 * degistirir, dikey kutle/kapasite hesabini DEGIL (o hesap bu fonksiyonun
 * kapsami disinda, ayri bir karar noktasi — bkz. Faz 3A Global Constraint
 * "kontrol degisikligi ... sessizce veri degistirmez").
 */
export function resolveEffectiveMass(mass: BuildingMass, footprintOverride?: StudioPoint[]): BuildingMass {
  if (!footprintOverride || footprintOverride.length < 3) return mass;
  return { ...mass, footprint: { ...mass.footprint, points: footprintOverride } };
}

export function buildFootprintShape(points: StudioPoint[]): THREE.Shape {
  const [first, ...rest] = points;
  const shape = new THREE.Shape();

  shape.moveTo(first.x, first.y);
  rest.forEach((point) => shape.lineTo(point.x, point.y));
  shape.lineTo(first.x, first.y);

  return shape;
}

export function getFootprintCenter(points: StudioPoint[]): [number, number] {
  const bounds = points.reduce(
    (acc, point) => ({
      minX: Math.min(acc.minX, point.x),
      maxX: Math.max(acc.maxX, point.x),
      minY: Math.min(acc.minY, point.y),
      maxY: Math.max(acc.maxY, point.y),
    }),
    { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity },
  );

  return [(bounds.minX + bounds.maxX) / 2, (bounds.minY + bounds.maxY) / 2];
}

export function createMassGeometry(mass: BuildingMass): THREE.ExtrudeGeometry {
  const shape = buildFootprintShape(mass.footprint.points);
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: mass.heightM,
    bevelEnabled: false,
  });

  geometry.rotateX(-Math.PI / 2);
  geometry.center();

  return geometry;
}

