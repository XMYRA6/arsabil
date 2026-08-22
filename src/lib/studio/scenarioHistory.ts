import { applyScenarioCommand } from './scenarioDraft';
import type {
  ScenarioCommand,
  ScenarioHistoryEntry,
  ScenarioHistoryState,
  StudioScenarioDraft,
} from './types';

const DEFAULT_MAX_HISTORY_DEPTH = 30;

/**
 * Senaryo gecmis durumunu baslatir (Faz 3B Task 1).
 */
export function createScenarioHistory(
  initialDraft: StudioScenarioDraft,
  maxDepth: number = DEFAULT_MAX_HISTORY_DEPTH,
): ScenarioHistoryState {
  return {
    past: [],
    present: JSON.parse(JSON.stringify(initialDraft)),
    future: [],
    initialDraft: JSON.parse(JSON.stringify(initialDraft)),
    maxDepth: Math.max(1, maxDepth),
  };
}

/**
 * Geri alinabilirlik durumunu dondurur.
 */
export function canUndo(state: ScenarioHistoryState): boolean {
  return state.past.length > 0;
}

/**
 * Ileri alinabilirlik durumunu dondurur.
 */
export function canRedo(state: ScenarioHistoryState): boolean {
  return state.future.length > 0;
}

/**
 * Taslagin baslangic durumuna gore degisip degismedigini (dirty) kontrol eder.
 */
export function isScenarioDirty(state: ScenarioHistoryState): boolean {
  // Hizli JSON karsilastirmasi
  const sanitize = (draft: StudioScenarioDraft) => ({
    name: draft.name,
    notes: draft.notes,
    layout: draft.layout,
    programMix: draft.programMix,
    valuationAssumptions: draft.valuationAssumptions,
    customOffer: draft.customOffer,
  });

  return JSON.stringify(sanitize(state.present)) !== JSON.stringify(sanitize(state.initialDraft));
}

/**
 * Yeni bir komut calistirir.
 * - Mevcut 'present' degeri 'past'e snapshot olarak eklenir.
 * - Yeni 'present' hesaplanir.
 * - 'future' (redo) yigini deterministic sekilde TEMIZLENIR.
 * - 'maxDepth' asildiysa en eski kayitlar atilir.
 */
export function executeScenarioCommand(
  state: ScenarioHistoryState,
  command: ScenarioCommand,
  label: string = 'Değişiklik yapıldı',
  nowIso: string = new Date().toISOString(),
): ScenarioHistoryState {
  const nextPresent = applyScenarioCommand(state.present, command, nowIso);

  const entry: ScenarioHistoryEntry = {
    id: `hist-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    command,
    label,
    timestamp: nowIso,
    snapshot: JSON.parse(JSON.stringify(state.present)),
  };

  const newPast = [...state.past, entry];
  const trimmedPast = newPast.length > state.maxDepth
    ? newPast.slice(newPast.length - state.maxDepth)
    : newPast;

  return {
    ...state,
    past: trimmedPast,
    present: nextPresent,
    future: [], // New action wipes redo stack
  };
}

/**
 * Bir adim geri alir (Undo).
 */
export function undoScenario(state: ScenarioHistoryState): ScenarioHistoryState {
  if (state.past.length === 0) return state;

  const previousEntry = state.past[state.past.length - 1];
  const newPast = state.past.slice(0, -1);

  const futureEntry: ScenarioHistoryEntry = {
    id: `redo-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    command: previousEntry.command,
    label: previousEntry.label,
    timestamp: previousEntry.timestamp,
    snapshot: JSON.parse(JSON.stringify(state.present)),
  };

  return {
    ...state,
    past: newPast,
    present: JSON.parse(JSON.stringify(previousEntry.snapshot)),
    future: [futureEntry, ...state.future],
  };
}

/**
 * Bir adim ileri alir (Redo).
 */
export function redoScenario(state: ScenarioHistoryState): ScenarioHistoryState {
  if (state.future.length === 0) return state;

  const nextEntry = state.future[0];
  const newFuture = state.future.slice(1);

  const pastEntry: ScenarioHistoryEntry = {
    id: `hist-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    command: nextEntry.command,
    label: nextEntry.label,
    timestamp: nextEntry.timestamp,
    snapshot: JSON.parse(JSON.stringify(state.present)),
  };

  const newPast = [...state.past, pastEntry];
  const trimmedPast = newPast.length > state.maxDepth
    ? newPast.slice(newPast.length - state.maxDepth)
    : newPast;

  return {
    ...state,
    past: trimmedPast,
    present: JSON.parse(JSON.stringify(nextEntry.snapshot)),
    future: newFuture,
  };
}

/**
 * Son degisiklik kayitlarini (en yeniden en eskiye) dondurur.
 */
export function getRecentHistoryEntries(
  state: ScenarioHistoryState,
  limit: number = 10,
): ScenarioHistoryEntry[] {
  return [...state.past].reverse().slice(0, limit);
}
