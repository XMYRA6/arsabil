import type {
  BaseSnapshotReference,
  CustomOfferOverride,
  ProgramMixItem,
  ScenarioCommand,
  StudioLayoutDraft,
  StudioScenarioDraft,
  ValuationAssumptions,
} from './types';

export type CreateScenarioDraftInput = {
  id: string;
  name: string;
  baseSnapshotRef: BaseSnapshotReference;
  layout?: StudioLayoutDraft | null;
  programMix?: ProgramMixItem[];
  valuationAssumptions?: ValuationAssumptions | null;
  customOffer?: CustomOfferOverride | null;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
};

/**
 * Yeni bir Studio senaryo taslagi olusturur (Faz 3B).
 */
export function createDefaultScenarioDraft({
  id,
  name,
  baseSnapshotRef,
  layout = null,
  programMix = [],
  valuationAssumptions = null,
  customOffer = null,
  notes,
  createdAt = new Date().toISOString(),
  updatedAt = createdAt,
}: CreateScenarioDraftInput): StudioScenarioDraft {
  return {
    id,
    name,
    createdAt,
    updatedAt,
    baseSnapshotRef: { ...baseSnapshotRef },
    layout: layout ? JSON.parse(JSON.stringify(layout)) : null,
    programMix: programMix.map((item) => ({ ...item })),
    valuationAssumptions: valuationAssumptions ? { ...valuationAssumptions } : null,
    customOffer: customOffer ? { ...customOffer } : null,
    notes,
  };
}

/**
 * Deterministic command reducer — verilen komutu taslaga uygular ve
 * MUTASYONSUZ yeni bir StudioScenarioDraft dondurur.
 */
export function applyScenarioCommand(
  draft: StudioScenarioDraft,
  command: ScenarioCommand,
  nowIso: string = new Date().toISOString(),
): StudioScenarioDraft {
  switch (command.type) {
    case 'SET_LAYOUT': {
      return {
        ...draft,
        layout: command.payload.layout ? JSON.parse(JSON.stringify(command.payload.layout)) : null,
        updatedAt: nowIso,
      };
    }
    case 'UPDATE_LAYOUT_FOOTPRINT': {
      const currentLayout = draft.layout ?? {
        footprint: { centerX: 0, centerY: 0, rotationDeg: 0, scale: 1, insetM: 0 },
        setback: { frontM: 0, sideM: 0, rearM: 0 },
        programBandIds: [],
      };
      return {
        ...draft,
        layout: {
          ...currentLayout,
          footprint: { ...command.payload.footprint },
        },
        updatedAt: nowIso,
      };
    }
    case 'SET_PROGRAM_MIX': {
      return {
        ...draft,
        programMix: command.payload.items.map((i) => ({ ...i })),
        updatedAt: nowIso,
      };
    }
    case 'UPDATE_PROGRAM_ITEM': {
      const itemToUpdate = command.payload.item;
      return {
        ...draft,
        programMix: draft.programMix.map((item) =>
          item.id === itemToUpdate.id ? { ...itemToUpdate } : item
        ),
        updatedAt: nowIso,
      };
    }
    case 'ADD_PROGRAM_ITEM': {
      const itemToAdd = command.payload.item;
      const exists = draft.programMix.some((item) => item.id === itemToAdd.id);
      const newItems = exists
        ? draft.programMix.map((item) => (item.id === itemToAdd.id ? { ...itemToAdd } : item))
        : [...draft.programMix, { ...itemToAdd }];
      return {
        ...draft,
        programMix: newItems,
        updatedAt: nowIso,
      };
    }
    case 'REMOVE_PROGRAM_ITEM': {
      return {
        ...draft,
        programMix: draft.programMix.filter((item) => item.id !== command.payload.itemId),
        updatedAt: nowIso,
      };
    }
    case 'SET_VALUATION_ASSUMPTIONS': {
      return {
        ...draft,
        valuationAssumptions: command.payload.assumptions
          ? { ...command.payload.assumptions }
          : null,
        updatedAt: nowIso,
      };
    }
    case 'SET_CUSTOM_OFFER': {
      return {
        ...draft,
        customOffer: command.payload.customOffer ? { ...command.payload.customOffer } : null,
        updatedAt: nowIso,
      };
    }
    case 'SET_SCENARIO_NAME': {
      return {
        ...draft,
        name: command.payload.name,
        updatedAt: nowIso,
      };
    }
    case 'SET_SCENARIO_NOTES': {
      return {
        ...draft,
        notes: command.payload.notes,
        updatedAt: nowIso,
      };
    }
    default: {
      return draft;
    }
  }
}

/**
 * Mevcut senaryoyu yeni kimlik ve isimle klonlar (Faz 3B alternatif kopyalama).
 */
export function cloneScenarioDraft(
  draft: StudioScenarioDraft,
  newId: string,
  newName: string,
  nowIso: string = new Date().toISOString(),
): StudioScenarioDraft {
  return {
    ...JSON.parse(JSON.stringify(draft)),
    id: newId,
    name: newName,
    createdAt: nowIso,
    updatedAt: nowIso,
  };
}
