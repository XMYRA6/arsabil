import { buildStudioProposalViewModel } from './proposalViewModel';
import type { StudioScenarioRecord, StudioScenarioVersionRecord } from './persistenceTypes';

describe('proposalViewModel', () => {
  const mockScenario: StudioScenarioRecord = {
    id: 'sc-123',
    userId: 'u-1',
    name: 'Kadıköy Sahil Projesi',
    description: 'Ön teklif taslağı',
    parcelIdentity: { il: 'İstanbul', ilce: 'Kadıköy', mahalle: 'Caferağa', adaNo: '100', parselNo: '5' },
    baseInputHash: 'base-hash-1',
    parcelSourceStatus: 'verified_tkgm',
    currentVersionNumber: 2,
    isArchived: false,
    createdAt: '2026-08-22T10:00:00.000Z',
    updatedAt: '2026-08-22T12:00:00.000Z',
  };

  const mockVersion: StudioScenarioVersionRecord = {
    id: 'ver-2',
    scenarioId: 'sc-123',
    versionNumber: 2,
    snapshot: {
      schemaVersion: 1,
      createdAt: '2026-08-22T12:00:00.000Z',
      massingInput: {
        parcelAreaM2: 1000,
        grossConstructionAreaM2: 2500,
        grossConstructionAreaSource: 'authoritative',
        parcelPolygon: {
          points: [
            { x: 0, y: 0 },
            { x: 50, y: 0 },
            { x: 50, y: 20 },
            { x: 0, y: 20 },
          ],
          source: 'verified_tkgm',
          parcelIdentity: { il: 'İstanbul', ilce: 'Kadıköy' },
        },
      },
      buildingMass: {
        footprint: {
          points: [
            { x: 5, y: 5 },
            { x: 45, y: 5 },
            { x: 45, y: 15 },
            { x: 5, y: 15 },
          ],
          source: 'user_drawn',
          areaM2: 400,
        },
        heightM: 18,
        floorCount: 6,
        floorHeightM: 3,
        grossConstructionAreaM2: 2500,
        warnings: [],
      },
      programMix: [
        {
          id: 'prog-1',
          use: 'residential',
          residentialType: '2+1',
          unitCount: 16,
          unitAreaM2: 100,
        },
        {
          id: 'prog-2',
          use: 'commercial',
          unitCount: 2,
          unitAreaM2: 200,
        },
      ],
      landownerOffer: {
        entitledUnitCount: 8.5,
        wholeUnitCount: 8,
        fractionalUnitBalance: 0.5,
        options: [
          {
            id: 'opt-1',
            label: 'Nakit Mahsuplu Dengeleme',
            wholeUnitCount: 8,
            fractionalUnitBalance: 0.5,
            cashEqualizationTl: 750000,
          },
        ],
        warnings: [],
      },
      valuationAssumptions: {
        currency: 'TL',
        valuationDate: '2026-08-22',
        unitValueTl: 6000000,
        shopValueTl: 12000000,
      },
      warnings: [],
    },
    snapshotHash: 'snap-hash-2',
    schemaVersion: 1,
    summaryNotes: 'Arsa sahibine sunulacak 2. versiyon',
    needsRebalance: false,
    warningCount: 0,
    createdAt: '2026-08-22T12:00:00.000Z',
  };

  it('senaryo ve versiyon kaydindan eksiksiz StudioProposalViewModel uretir', () => {
    const vm = buildStudioProposalViewModel(mockScenario, mockVersion);

    // Context
    expect(vm.projectContext.scenarioName).toBe('Kadıköy Sahil Projesi');
    expect(vm.projectContext.versionNumber).toBe(2);
    expect(vm.projectContext.parcelAreaM2).toBe(1000);
    expect(vm.projectContext.grossConstructionAreaM2).toBe(2500);

    // Massing & 2D
    expect(vm.massingAnd2D.footprintAreaM2).toBe(400);
    expect(vm.massingAnd2D.coveragePercentage).toBe(40);
    expect(vm.massingAnd2D.floorCount).toBe(6);

    // Program
    expect(vm.programSummary.residentialUnitCount).toBe(16);
    expect(vm.programSummary.commercialUnitCount).toBe(2);
    expect(vm.programSummary.totalAllocatedAreaM2).toBe(2000); // 1600 + 400
    expect(vm.programSummary.unallocatedAreaM2).toBe(500);

    // Landowner offer
    expect(vm.landownerOfferSummary.entitledUnitCount).toBe(8.5);
    expect(vm.landownerOfferSummary.offeredWholeUnits).toBe(8);
    expect(vm.landownerOfferSummary.fractionalUnitBalance).toBe(0.5);
    expect(vm.landownerOfferSummary.cashEqualizationTl).toBe(750000);

    // Financial
    expect(vm.financialAssumptions.unitValueTl).toBe(6000000);
    expect(vm.financialAssumptions.shopValueTl).toBe(12000000);
  });

  it('motoru yeniden calistirmadan salt okunur olarak degerleri aktarir', () => {
    const vm = buildStudioProposalViewModel(mockScenario, mockVersion);
    expect(vm.snapshotHash).toBe('snap-hash-2');
    expect(vm.warningsAndBadges.needsRebalance).toBe(false);
    expect(vm.warningsAndBadges.isDemoGeometry).toBe(false);
  });
});
