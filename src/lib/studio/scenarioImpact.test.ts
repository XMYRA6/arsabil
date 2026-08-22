import {
  getCommandImpactScope,
  checkRequiresRebalance,
  ScenarioImpactScope,
} from './scenarioImpact';
import { createDefaultScenarioDraft } from './scenarioDraft';
import type { ScenarioCommand, StudioScenarioDraft } from './types';

describe('scenarioImpact', () => {
  const baseDraft: StudioScenarioDraft = createDefaultScenarioDraft({
    id: 'sc-1',
    name: 'Ana Senaryo',
    baseSnapshotRef: {
      sourceId: 'calc-1',
      parcelAreaM2: 800,
      grossConstructionAreaM2: 1600,
    },
    layout: {
      footprint: { centerX: 0, centerY: 0, rotationDeg: 0, scale: 1, insetM: 0 },
      setback: { frontM: 0, sideM: 0, rearM: 0 },
      programBandIds: [],
    },
    programMix: [
      { id: 'p1', use: 'residential', residentialType: '2+1', unitCount: 8, unitAreaM2: 100 },
    ],
    valuationAssumptions: { currency: 'TRY', valuationDate: '2026-08-22', unitValueTl: 4_000_000 },
    customOffer: { unitCount: 4, cashTl: 100_000 },
  });

  describe('getCommandImpactScope', () => {
    it('her komut tipini dogru etki alanina esler', () => {
      expect(
        getCommandImpactScope({
          type: 'SET_LAYOUT',
          payload: { layout: null },
        })
      ).toBe('visual');

      expect(
        getCommandImpactScope({
          type: 'UPDATE_LAYOUT_FOOTPRINT',
          payload: { footprint: { centerX: 1, centerY: 1, rotationDeg: 10, scale: 0.9 } },
        })
      ).toBe('visual');

      expect(
        getCommandImpactScope({
          type: 'SET_PROGRAM_MIX',
          payload: { items: [] },
        })
      ).toBe('program');

      expect(
        getCommandImpactScope({
          type: 'UPDATE_PROGRAM_ITEM',
          payload: { item: { id: 'p1', use: 'residential', unitCount: 10, unitAreaM2: 100 } },
        })
      ).toBe('program');

      expect(
        getCommandImpactScope({
          type: 'SET_VALUATION_ASSUMPTIONS',
          payload: { assumptions: null },
        })
      ).toBe('valuation');

      expect(
        getCommandImpactScope({
          type: 'SET_CUSTOM_OFFER',
          payload: { customOffer: null },
        })
      ).toBe('offer');

      expect(
        getCommandImpactScope({
          type: 'SET_SCENARIO_NAME',
          payload: { name: 'Yeni Ad' },
        })
      ).toBe('annotation');

      expect(
        getCommandImpactScope({
          type: 'SET_SCENARIO_NOTES',
          payload: { notes: 'Açıklama' },
        })
      ).toBe('annotation');
    });
  });

  describe('checkRequiresRebalance', () => {
    it('ozel teklif yoksa (customOffer null) rebalance gerekmez', () => {
      const draftWithoutOffer = { ...baseDraft, customOffer: null };
      const modifiedProgram = {
        ...draftWithoutOffer,
        programMix: [{ id: 'p1', use: 'residential' as const, unitCount: 20, unitAreaM2: 100 }],
      };

      expect(checkRequiresRebalance(modifiedProgram, draftWithoutOffer)).toBe(false);
    });

    it('program degistiginde ve ozel teklif varsa rebalance gerekir', () => {
      const modifiedProgram = {
        ...baseDraft,
        programMix: [
          { id: 'p1', use: 'residential' as const, residentialType: '2+1' as const, unitCount: 12, unitAreaM2: 100 },
        ],
      };

      expect(checkRequiresRebalance(modifiedProgram, baseDraft)).toBe(true);
    });

    it('footprint olcegi veya inset degistiginde ve ozel teklif varsa rebalance gerekir', () => {
      const modifiedLayout = {
        ...baseDraft,
        layout: {
          ...baseDraft.layout!,
          footprint: { ...baseDraft.layout!.footprint, scale: 0.85 },
        },
      };

      expect(checkRequiresRebalance(modifiedLayout, baseDraft)).toBe(true);
    });

    it('sadece senaryo adi veya not degistiginde rebalance gerekmez', () => {
      const modifiedAnnotation = {
        ...baseDraft,
        name: 'Yeni Senaryo Adı',
        notes: 'Yeni not eklendi',
      };

      expect(checkRequiresRebalance(modifiedAnnotation, baseDraft)).toBe(false);
    });

    it('hicbir degisiklik olmadiysa rebalance gerekmez', () => {
      expect(checkRequiresRebalance(baseDraft, baseDraft)).toBe(false);
    });
  });
});
