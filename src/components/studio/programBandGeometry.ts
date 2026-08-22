import * as THREE from 'three';
import { buildFootprintShape } from './buildMassGeometry';
import type { BuildingMass, ProgramBand } from '@/lib/studio/types';

export type ProgramBandSegment = {
  band: ProgramBand;
  /** Zeminden (Y=0) itibaren dunya Y konumu — mass ile AYNI koordinat
   * sistemi (bkz. StudioScene.scope.test.ts kat bandi kok neden notu). */
  bottomWorldY: number;
  topWorldY: number;
  heightM: number;
};

/**
 * `ProgramBand.floorRange` (kat INDEKSLERI, 0=zemin) ile `mass.floorHeightM`i
 * carparak gercek metre cinsinden dunya Y araligina cevirir (Faz 2A Task 4).
 * Kat `i`, Y ekseninde `[i*floorHeightM, (i+1)*floorHeightM)` araligini
 * kaplar — kat 0 (zemin) [0, floorHeightM), kat 1 [floorHeightM, 2*floorHeightM)
 * vb. Veri tutarsizligi (bant kutle yuksekligini asiyor) SESSIZCE
 * KIRPILMAZ — renderer/legend farki gorunur birakir (Global Constraint).
 */
export function mapProgramBandsToWorldY(bands: ProgramBand[], mass: BuildingMass): ProgramBandSegment[] {
  return bands.map((b) => {
    const bottomWorldY = b.floorRange.startFloor * mass.floorHeightM;
    const topWorldY = (b.floorRange.endFloor + 1) * mass.floorHeightM;
    return { band: b, bottomWorldY, topWorldY, heightM: topWorldY - bottomWorldY };
  });
}

/**
 * Bir program bandi icin, ANA kutleyle AYNI footprint'i kullanan ama
 * yalnizca o bandin yuksekligi kadar extrude edilen bir geometri uretir.
 * Cagiran taraf meshi `position.y = (segment.bottomWorldY + segment.topWorldY) / 2`
 * konumuna yerlestirmelidir (geometri kendi merkezine gore `.center()`
 * edilir — `createMassGeometry` ile AYNI kural).
 */
export function createProgramBandGeometry(mass: BuildingMass, segment: ProgramBandSegment): THREE.ExtrudeGeometry {
  const shape = buildFootprintShape(mass.footprint.points);
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: Math.max(segment.heightM, 0.01),
    bevelEnabled: false,
  });

  geometry.rotateX(-Math.PI / 2);
  geometry.center();

  return geometry;
}
