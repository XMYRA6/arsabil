import { checkExportReadiness } from './exportReadiness';
import { buildStudioProposalViewModel } from './proposalViewModel';
import type { StudioScenarioRecord, StudioScenarioVersionRecord } from './persistenceTypes';

describe('exportReadiness', () => {
  const baseScenario: StudioScenarioRecord = {
    id: 'sc-1',
    userId: 'u-1',
    name: 'Kadıköy Projesi',
    description: null,
    parcelIdentity: { il: 'İstanbul', ilce: 'Kadıköy' },
    baseInputHash: 'h-1',
    parcelSourceStatus: 'verified_tkgm',
    currentVersionNumber: 1,
    isArchived: false,
    createdAt: '2026-08-22T10:00:00.000Z',
    updatedAt: '2026-08-22T10:00:00.000Z',
  };

  const baseVersion: StudioScenarioVersionRecord = {
    id: 'v-1',
    scenarioId: 'sc-1',
    versionNumber: 1,
    snapshot: {
      schemaVersion: 1,
      createdAt: '2026-08-22T10:00:00.000Z',
      massingInput: {
        parcelAreaM2: 1000,
        grossConstructionAreaM2: 2000,
        grossConstructionAreaSource: 'authoritative',
        parcelPolygon: {
          points: [{ x: 0, y: 0 }, { x: 50, y: 0 }, { x: 50, y: 20 }, { x: 0, y: 20 }],
          source: 'verified_tkgm',
        },
      },
      buildingMass: {
        footprint: {
          points: [{ x: 5, y: 5 }, { x: 45, y: 5 }, { x: 45, y: 15 }, { x: 5, y: 15 }],
          source: 'user_drawn',
          areaM2: 400,
        },
        heightM: 15,
        floorCount: 5,
        floorHeightM: 3,
        grossConstructionAreaM2: 2000,
        warnings: [],
      },
      programMix: [],
      valuationAssumptions: {
        currency: 'TL',
        valuationDate: '2026-08-22',
        unitValueTl: 5000000,
        shopValueTl: 8000000,
      },
      warnings: [],
    },
    snapshotHash: 'snap-hash-1',
    schemaVersion: 1,
    summaryNotes: null,
    needsRebalance: false,
    warningCount: 0,
    createdAt: '2026-08-22T10:00:00.000Z',
  };

  it('dengelenmis ve dogrulanmis senaryo icin ready doner', () => {
    const vm = buildStudioProposalViewModel(baseScenario, baseVersion);
    const result = checkExportReadiness(vm);

    expect(result.status).toBe('ready');
    expect(result.canExport).toBe(true);
    expect(result.blockReasons).toHaveLength(0);
  });

  it('needsRebalance true ise blocked doner ve paylasimi engeller', () => {
    const blockedVersion: StudioScenarioVersionRecord = {
      ...baseVersion,
      needsRebalance: true,
    };
    const vm = buildStudioProposalViewModel(baseScenario, blockedVersion);
    const result = checkExportReadiness(vm);

    expect(result.status).toBe('blocked');
    expect(result.canExport).toBe(false);
    expect(result.blockReasons).toContain(
      'Teklif dengelenmemiştir; arsa sahibine dengesiz teklif paylaşılamaz veya dışa aktarılamaz.'
    );
  });

  it('demo geometri durumunda attention doner fakat exporta izin verir', () => {
    const demoScenario: StudioScenarioRecord = {
      ...baseScenario,
      parcelSourceStatus: 'demo',
    };
    const vm = buildStudioProposalViewModel(demoScenario, baseVersion);
    const result = checkExportReadiness(vm);

    expect(result.status).toBe('attention');
    expect(result.canExport).toBe(true);
    expect(result.attentionReasons).toContain(
      'Parsel geometrisi TKGM ile doğrulanmamıştır (Demo/Serbest geometri).'
    );
  });
});
