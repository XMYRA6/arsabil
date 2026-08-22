import type {
  BuildingMass,
  StudioMassingInput,
  StudioPoint,
  StudioPolygon,
  StudioSnapshotDraft,
  StudioWarning,
} from './types';

describe('studio types', () => {
  it('exports serializable Studio domain shapes', () => {
    const point: StudioPoint = { x: 0, y: 0 };
    const polygon: StudioPolygon = { source: 'verified_tkgm', points: [point, { x: 10, y: 0 }, { x: 10, y: 10 }] };
    const warning: StudioWarning = { code: 'MISSING_GEOMETRY', message: 'Parsel geometrisi eksik.' };
    const input: StudioMassingInput = {
      parcelAreaM2: 100,
      grossConstructionAreaM2: 300,
      grossConstructionAreaSource: 'authoritative',
      assumedFloorCount: 3,
      parcelPolygon: polygon,
    };
    const mass: BuildingMass = {
      footprint: polygon,
      floorCount: 3,
      floorHeightM: 3.2,
      heightM: 9.6,
      grossConstructionAreaM2: 300,
      warnings: [warning],
    };
    const snapshot: StudioSnapshotDraft = {
      schemaVersion: 1,
      createdAt: '2026-08-16T00:00:00.000Z',
      massingInput: input,
      buildingMass: mass,
      warnings: [warning],
    };

    expect(JSON.parse(JSON.stringify(snapshot))).toEqual(snapshot);
  });
});


