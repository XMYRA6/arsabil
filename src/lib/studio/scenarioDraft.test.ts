import {
  createDefaultScenarioDraft,
  applyScenarioCommand,
  cloneScenarioDraft,
} from './scenarioDraft';
import type {
  ProgramMixItem,
  StudioLayoutDraft,
  StudioScenarioDraft,
  ValuationAssumptions,
} from './types';

describe('scenarioDraft', () => {
  const mockBaseRef = {
    sourceId: 'calc-123',
    parcelAreaM2: 1000,
    grossConstructionAreaM2: 2000,
    parcelGeometrySource: 'verified_tkgm' as const,
    hash: 'hash-abc',
  };

  const sampleProgram: ProgramMixItem[] = [
    { id: 'prog-1', use: 'residential', residentialType: '2+1', unitCount: 10, unitAreaM2: 100 },
    { id: 'prog-2', use: 'commercial', unitCount: 2, unitAreaM2: 120 },
  ];

  const sampleLayout: StudioLayoutDraft = {
    footprint: { centerX: 10, centerY: 20, rotationDeg: 45, scale: 0.9, insetM: 2 },
    setback: { frontM: 5, sideM: 3, rearM: 3 },
    programBandIds: ['band-1'],
  };

  const sampleValuation: ValuationAssumptions = {
    currency: 'TRY',
    valuationDate: '2026-08-22',
    unitValueTl: 5_000_000,
  };

  it('createDefaultScenarioDraft baslangic taslagini dogru alanlarla olusturur', () => {
    const draft = createDefaultScenarioDraft({
      id: 'sc-1',
      name: 'Varsayılan Senaryo',
      baseSnapshotRef: mockBaseRef,
      layout: sampleLayout,
      programMix: sampleProgram,
      valuationAssumptions: sampleValuation,
      customOffer: { unitCount: 4, cashTl: 250_000 },
    });

    expect(draft.id).toBe('sc-1');
    expect(draft.name).toBe('Varsayılan Senaryo');
    expect(draft.baseSnapshotRef).toEqual(mockBaseRef);
    expect(draft.layout).toEqual(sampleLayout);
    expect(draft.programMix).toHaveLength(2);
    expect(draft.valuationAssumptions?.unitValueTl).toBe(5_000_000);
    expect(draft.customOffer).toEqual({ unitCount: 4, cashTl: 250_000 });
    expect(draft.createdAt).toBeTruthy();
    expect(draft.updatedAt).toBeTruthy();
  });

  describe('applyScenarioCommand — pure deterministic state transitions', () => {
    let initialDraft: StudioScenarioDraft;

    beforeEach(() => {
      initialDraft = createDefaultScenarioDraft({
        id: 'sc-1',
        name: 'Ana Senaryo',
        baseSnapshotRef: mockBaseRef,
        layout: sampleLayout,
        programMix: sampleProgram,
        valuationAssumptions: sampleValuation,
      });
    });

    it('SET_LAYOUT komutunda layout guncellenir ve orijinal nesne mutasyona ugramaz', () => {
      const nextLayout: StudioLayoutDraft = {
        footprint: { centerX: 0, centerY: 0, rotationDeg: 0, scale: 1 },
        setback: { frontM: 0, sideM: 0, rearM: 0 },
        programBandIds: [],
      };

      const updated = applyScenarioCommand(initialDraft, {
        type: 'SET_LAYOUT',
        payload: { layout: nextLayout },
      });

      expect(updated.layout).toEqual(nextLayout);
      expect(initialDraft.layout).toEqual(sampleLayout);
      expect(updated).not.toBe(initialDraft);
    });

    it('UPDATE_LAYOUT_FOOTPRINT yalnizca footprint kismini gunceller', () => {
      const updated = applyScenarioCommand(initialDraft, {
        type: 'UPDATE_LAYOUT_FOOTPRINT',
        payload: { footprint: { centerX: 50, centerY: 60, rotationDeg: 90, scale: 0.8, insetM: 1 } },
      });

      expect(updated.layout?.footprint.centerX).toBe(50);
      expect(updated.layout?.footprint.rotationDeg).toBe(90);
      expect(updated.layout?.setback).toEqual(sampleLayout.setback);
    });

    it('SET_PROGRAM_MIX tum program kalemlerini degistirir', () => {
      const newItems: ProgramMixItem[] = [
        { id: 'prog-3', use: 'residential', residentialType: '3+1', unitCount: 8, unitAreaM2: 140 },
      ];

      const updated = applyScenarioCommand(initialDraft, {
        type: 'SET_PROGRAM_MIX',
        payload: { items: newItems },
      });

      expect(updated.programMix).toHaveLength(1);
      expect(updated.programMix[0].id).toBe('prog-3');
    });

    it('UPDATE_PROGRAM_ITEM eslesen kalemi gunceller', () => {
      const updatedItem: ProgramMixItem = {
        id: 'prog-1',
        use: 'residential',
        residentialType: '2+1',
        unitCount: 12,
        unitAreaM2: 105,
      };

      const updated = applyScenarioCommand(initialDraft, {
        type: 'UPDATE_PROGRAM_ITEM',
        payload: { item: updatedItem },
      });

      const found = updated.programMix.find((i) => i.id === 'prog-1');
      expect(found?.unitCount).toBe(12);
      expect(found?.unitAreaM2).toBe(105);
    });

    it('ADD_PROGRAM_ITEM yeni kalem ekler ve mevcutsa gunceller', () => {
      const newItem: ProgramMixItem = {
        id: 'prog-new',
        use: 'common',
        unitCount: 1,
        unitAreaM2: 200,
      };

      const added = applyScenarioCommand(initialDraft, {
        type: 'ADD_PROGRAM_ITEM',
        payload: { item: newItem },
      });
      expect(added.programMix).toHaveLength(3);

      const overwrite = applyScenarioCommand(added, {
        type: 'ADD_PROGRAM_ITEM',
        payload: { item: { ...newItem, unitAreaM2: 250 } },
      });
      expect(overwrite.programMix).toHaveLength(3);
      expect(overwrite.programMix.find((i) => i.id === 'prog-new')?.unitAreaM2).toBe(250);
    });

    it('REMOVE_PROGRAM_ITEM kalemi id ile cikarir', () => {
      const removed = applyScenarioCommand(initialDraft, {
        type: 'REMOVE_PROGRAM_ITEM',
        payload: { itemId: 'prog-1' },
      });

      expect(removed.programMix).toHaveLength(1);
      expect(removed.programMix[0].id).toBe('prog-2');
    });

    it('SET_VALUATION_ASSUMPTIONS degerleme varsayimini gunceller', () => {
      const nextValuation: ValuationAssumptions = {
        currency: 'USD',
        valuationDate: '2026-09-01',
        unitValueTl: 6_000_000,
      };

      const updated = applyScenarioCommand(initialDraft, {
        type: 'SET_VALUATION_ASSUMPTIONS',
        payload: { assumptions: nextValuation },
      });

      expect(updated.valuationAssumptions?.currency).toBe('USD');
    });

    it('SET_CUSTOM_OFFER ozel teklifi gunceller', () => {
      const updated = applyScenarioCommand(initialDraft, {
        type: 'SET_CUSTOM_OFFER',
        payload: { customOffer: { unitCount: 6, cashTl: 500_000 } },
      });

      expect(updated.customOffer).toEqual({ unitCount: 6, cashTl: 500_000 });
    });

    it('SET_SCENARIO_NAME ve SET_SCENARIO_NOTES metadata alanlarini gunceller', () => {
      let updated = applyScenarioCommand(initialDraft, {
        type: 'SET_SCENARIO_NAME',
        payload: { name: 'Alternatif Ticari Odaklı' },
      });
      expect(updated.name).toBe('Alternatif Ticari Odaklı');

      updated = applyScenarioCommand(updated, {
        type: 'SET_SCENARIO_NOTES',
        payload: { notes: 'Zemin katta dükkan sayısı artırıldı.' },
      });
      expect(updated.notes).toBe('Zemin katta dükkan sayısı artırıldı.');
    });
  });

  describe('cloneScenarioDraft', () => {
    it('senaryoyu yeni kimlik ve baslikla derin kopyalar', () => {
      const original = createDefaultScenarioDraft({
        id: 'orig-1',
        name: 'Orijinal Senaryo',
        baseSnapshotRef: mockBaseRef,
        layout: sampleLayout,
        programMix: sampleProgram,
        valuationAssumptions: sampleValuation,
        customOffer: { unitCount: 3, cashTl: 100_000 },
        notes: 'Orijinal not',
      });

      const clone = cloneScenarioDraft(original, 'alt-1', 'Alternatif A');

      expect(clone.id).toBe('alt-1');
      expect(clone.name).toBe('Alternatif A');
      expect(clone.baseSnapshotRef).toEqual(mockBaseRef);
      expect(clone.layout).toEqual(sampleLayout);
      expect(clone.programMix).toEqual(sampleProgram);
      expect(clone.notes).toBe('Orijinal not');
      expect(clone).not.toBe(original);
      expect(clone.programMix).not.toBe(original.programMix);
    });
  });
});
