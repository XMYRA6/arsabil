import {
  createScenarioHistory,
  executeScenarioCommand,
  undoScenario,
  redoScenario,
  canUndo,
  canRedo,
  isScenarioDirty,
  getRecentHistoryEntries,
} from './scenarioHistory';
import { createDefaultScenarioDraft } from './scenarioDraft';
import type { StudioScenarioDraft } from './types';

describe('scenarioHistory', () => {
  const baseDraft: StudioScenarioDraft = createDefaultScenarioDraft({
    id: 'sc-1',
    name: 'İlk Taslak',
    baseSnapshotRef: {
      sourceId: 'calc-1',
      parcelAreaM2: 500,
      grossConstructionAreaM2: 1000,
    },
    programMix: [],
    layout: null,
  });

  it('createScenarioHistory baslangic durumunu dogru olusturur', () => {
    const history = createScenarioHistory(baseDraft, 10);

    expect(history.present).toEqual(baseDraft);
    expect(history.past).toHaveLength(0);
    expect(history.future).toHaveLength(0);
    expect(canUndo(history)).toBe(false);
    expect(canRedo(history)).toBe(false);
    expect(isScenarioDirty(history)).toBe(false);
  });

  it('executeScenarioCommand komutu calistirir ve past yiginina ekler', () => {
    let history = createScenarioHistory(baseDraft, 10);

    history = executeScenarioCommand(
      history,
      { type: 'SET_SCENARIO_NAME', payload: { name: 'İkinci İsim' } },
      'Senaryo adı değiştirildi'
    );

    expect(history.present.name).toBe('İkinci İsim');
    expect(history.past).toHaveLength(1);
    expect(history.past[0].label).toBe('Senaryo adı değiştirildi');
    expect(canUndo(history)).toBe(true);
    expect(canRedo(history)).toBe(false);
    expect(isScenarioDirty(history)).toBe(true);
  });

  it('undoScenario ve redoScenario deterministic calisir', () => {
    let history = createScenarioHistory(baseDraft, 10);

    history = executeScenarioCommand(
      history,
      { type: 'SET_SCENARIO_NAME', payload: { name: 'İkinci İsim' } },
      'İsim 2'
    );
    history = executeScenarioCommand(
      history,
      { type: 'SET_SCENARIO_NAME', payload: { name: 'Üçüncü İsim' } },
      'İsim 3'
    );

    expect(history.present.name).toBe('Üçüncü İsim');
    expect(history.past).toHaveLength(2);

    // 1. Undo
    history = undoScenario(history);
    expect(history.present.name).toBe('İkinci İsim');
    expect(canUndo(history)).toBe(true);
    expect(canRedo(history)).toBe(true);

    // 2. Undo (baslangic haline donus)
    history = undoScenario(history);
    expect(history.present.name).toBe('İlk Taslak');
    expect(canUndo(history)).toBe(false);
    expect(canRedo(history)).toBe(true);
    expect(isScenarioDirty(history)).toBe(false);

    // 3. Redo
    history = redoScenario(history);
    expect(history.present.name).toBe('İkinci İsim');
    expect(canUndo(history)).toBe(true);
    expect(canRedo(history)).toBe(true);
  });

  it('yeni komut calistirildiginda redo (future) yigini temizlenir', () => {
    let history = createScenarioHistory(baseDraft, 10);

    history = executeScenarioCommand(
      history,
      { type: 'SET_SCENARIO_NAME', payload: { name: 'İsim A' } },
      'A'
    );
    history = executeScenarioCommand(
      history,
      { type: 'SET_SCENARIO_NAME', payload: { name: 'İsim B' } },
      'B'
    );

    // Undo yapildiginda future'da 'B' olur
    history = undoScenario(history);
    expect(history.future).toHaveLength(1);

    // Yeni komut calistir
    history = executeScenarioCommand(
      history,
      { type: 'SET_SCENARIO_NAME', payload: { name: 'İsim C' } },
      'C'
    );

    // Redo yigini artik bos olmali
    expect(history.future).toHaveLength(0);
    expect(canRedo(history)).toBe(false);
    expect(history.present.name).toBe('İsim C');
  });

  it('maxDepth limiti asildiginda en eski gecmis kayitlari atilir', () => {
    const maxDepth = 3;
    let history = createScenarioHistory(baseDraft, maxDepth);

    for (let i = 1; i <= 5; i++) {
      history = executeScenarioCommand(
        history,
        { type: 'SET_SCENARIO_NAME', payload: { name: `İsim ${i}` } },
        `Adım ${i}`
      );
    }

    expect(history.past.length).toBe(maxDepth);
    expect(history.past[0].label).toBe('Adım 3');
    expect(history.past[1].label).toBe('Adım 4');
    expect(history.past[2].label).toBe('Adım 5');
  });

  it('getRecentHistoryEntries son kayitlari dogru sirayla dondurur', () => {
    let history = createScenarioHistory(baseDraft, 10);

    history = executeScenarioCommand(
      history,
      { type: 'SET_SCENARIO_NAME', payload: { name: 'A' } },
      'İşlem 1'
    );
    history = executeScenarioCommand(
      history,
      { type: 'SET_SCENARIO_NAME', payload: { name: 'B' } },
      'İşlem 2'
    );

    const recent = getRecentHistoryEntries(history, 5);
    expect(recent).toHaveLength(2);
    expect(recent[0].label).toBe('İşlem 2');
    expect(recent[1].label).toBe('İşlem 1');
  });
});
