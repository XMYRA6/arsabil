import type { BuildingMass, StudioMassingInput, StudioPolygon, StudioWarning } from './types';
import { validateStudioPolygon } from './parcelGeometry';

const DEFAULT_FLOOR_HEIGHT_M = 3.2;

function isValidPolygon(polygon: StudioPolygon | null | undefined): polygon is StudioPolygon {
  return !!polygon && polygon.points.length >= 3;
}

export function collectMassingWarnings(input: StudioMassingInput): StudioWarning[] {
  const warnings: StudioWarning[] = [];

  if (typeof input.parcelAreaM2 !== 'number' || input.parcelAreaM2 <= 0) {
    warnings.push({ code: 'INVALID_AREA', message: '3D kutle icin pozitif arsa alani gerekiyor.' });
  }

  if (typeof input.grossConstructionAreaM2 !== 'number' || input.grossConstructionAreaM2 <= 0) {
    warnings.push({
      code: 'MISSING_GROSS_CONSTRUCTION_AREA',
      message: '3D kutle icin insaat alani verisi gerekiyor; kaynak etiketi authoritative veya estimated olmalidir.',
    });
  }

  if (!isValidPolygon(input.parcelPolygon)) {
    warnings.push({ code: 'MISSING_GEOMETRY', message: '3D kutle icin kaynak etiketli parsel geometrisi gerekiyor.' });
  } else {
    warnings.push(...validateStudioPolygon(input.parcelPolygon, input.parcelAreaM2));
  }

  if (
    input.assumedFloorCount != null &&
    (!Number.isFinite(input.assumedFloorCount) || input.assumedFloorCount <= 0)
  ) {
    warnings.push({ code: 'INVALID_FLOOR_COUNT', message: 'Kat sayisi pozitif bir sayi olmalidir.' });
  }

  return warnings;
}

export function deriveBuildingMass(input: StudioMassingInput): BuildingMass | null {
  const warnings = collectMassingWarnings(input);

  if (
    warnings.some((warning) =>
      ['INVALID_AREA', 'MISSING_GROSS_CONSTRUCTION_AREA', 'MISSING_GEOMETRY', 'INVALID_GEOMETRY', 'INVALID_FLOOR_COUNT'].includes(
        warning.code,
      ),
    )
  ) {
    return null;
  }

  const parcelAreaM2 = input.parcelAreaM2 as number;
  const grossConstructionAreaM2 = input.grossConstructionAreaM2 as number;
  const floorHeightM = input.floorHeightM && input.floorHeightM > 0 ? input.floorHeightM : DEFAULT_FLOOR_HEIGHT_M;
  const floorCount = input.assumedFloorCount ?? Math.max(1, Math.ceil(grossConstructionAreaM2 / parcelAreaM2));

  return {
    footprint: input.parcelPolygon as StudioPolygon,
    heightM: floorCount * floorHeightM,
    floorCount,
    floorHeightM,
    grossConstructionAreaM2,
    warnings,
  };
}
