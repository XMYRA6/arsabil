import {
  MAX_SCENARIO_ALTERNATIVES,
  canCreateAlternative,
  buildScenarioComparison,
} from './scenarioComparison';
import { createDefaultScenarioDraft } from './scenarioDraft';
import type { StudioMassingInput, StudioScenarioDraft } from './types';

describe('scenarioComparison', () => {
  const sampleMassingInput: StudioMassingInput = {
    parcelAreaM2: 1000,
    grossConstructionAreaM2: 2500,
    grossConstructionAreaSource: 'authoritative',
  };

  const scenario1: StudioScenarioDraft = createDefaultScenarioDraft({
    id: 'sc-1',
    name: 'Temel Senaryo',
    baseSnapshotRef: { parcelAreaM2: 1000, grossConstructionAreaM2: 2500 },
    programMix: [
      { id: 'p1', use: 'residential', residentialType: '2+1', unitCount: 10, unitAreaM2: 100 },
      { id: 'p2', use: 'commercial', unitCount: 2, unitAreaM2: 150 },
    ],
    valuationAssumptions: { currency: 'TRY', valuationDate: '2026-08-22', unitValueTl: 5_000_000 },
    customOffer: { unitCount: 5, cashTl: 200_000 },
  });

  const scenario2: StudioScenarioDraft = createDefaultScenarioDraft({
    id: 'sc-2',
    name: 'Geniş Daire Alternatifi',
    baseSnapshotRef: { parcelAreaM2: 1000, grossConstructionAreaM2: 2500 },
    programMix: [
      { id: 'p3', use: 'residential', residentialType: '3+1', unitCount: 8, unitAreaM2: 150 },
      { id: 'p4', use: 'commercial', unitCount: 4, unitAreaM2: 100 },
    ],
    valuationAssumptions: null, // missing valuation -> assumption_required
    customOffer: null,
  });

  describe('canCreateAlternative limit kontrolu', () => {
    it('maksimum 3 aktif senaryo limitini korur', () => {
      expect(MAX_SCENARIO_ALTERNATIVES).toBe(3);
      expect(canCreateAlternative([scenario1])).toBe(true);
      expect(canCreateAlternative([scenario1, scenario2])).toBe(true);
      expect(canCreateAlternative([scenario1, scenario2, { ...scenario1, id: 'sc-3' }])).toBe(false);
    });
  });

  describe('buildScenarioComparison', () => {
    it('senaryolarin fiziksel ve teklif metriklerini dogru cikarir', () => {
      const comparison = buildScenarioComparison(
        [scenario1, scenario2],
        sampleMassingInput,
        0.5, // %50 arsa payi
        100
      );

      expect(comparison.rows).toHaveLength(2);

      // Scenario 1
      const row1 = comparison.rows.find((r) => r.scenarioId === 'sc-1')!;
      expect(row1.scenarioName).toBe('Temel Senaryo');
      expect(row1.totalAllocatedAreaM2).toBe(10 * 100 + 2 * 150); // 1300 m2
      expect(row1.totalResidentialUnits).toBe(10);
      expect(row1.commercialUnitCount).toBe(2);
      expect(row1.commercialAreaM2).toBe(300);
      expect(row1.cashEqualizationStatus).toBe('calculated');
      expect(row1.landownerOfferedUnits).toBe(5);
      expect(row1.landownerCashEqualizationTl).toBe(200_000);

      // Scenario 2 (degerleme varsayimi eksik)
      const row2 = comparison.rows.find((r) => r.scenarioId === 'sc-2')!;
      expect(row2.scenarioName).toBe('Geniş Daire Alternatifi');
      expect(row2.totalAllocatedAreaM2).toBe(8 * 150 + 4 * 100); // 1600 m2
      expect(row2.totalResidentialUnits).toBe(8);
      expect(row2.commercialUnitCount).toBe(4);
      expect(row2.cashEqualizationStatus).toBe('assumption_required');
    });
  });
});
