import type {
  ParcelGeometrySourceKind,
  ParcelIdentity,
  StudioSnapshotDraft,
} from './types';

export type StudioScenarioVersionSummary = {
  id: string;
  scenarioId: string;
  versionNumber: number;
  snapshotHash: string;
  schemaVersion: number;
  summaryNotes: string | null;
  needsRebalance: boolean;
  warningCount: number;
  createdAt: string;
};

export type StudioScenarioRecord = {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  parcelIdentity: ParcelIdentity | null;
  baseInputHash: string;
  parcelSourceStatus: ParcelGeometrySourceKind;
  currentVersionNumber: number;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
  latestVersion?: StudioScenarioVersionSummary | null;
};

export type StudioScenarioVersionRecord = StudioScenarioVersionSummary & {
  snapshot: StudioSnapshotDraft;
};

export type CreateStudioScenarioPayload = {
  name: string;
  description?: string;
  snapshot: StudioSnapshotDraft;
  summaryNotes?: string;
};

export type CreateStudioScenarioVersionPayload = {
  scenarioId: string;
  expectedVersionNumber: number;
  snapshot: StudioSnapshotDraft;
  summaryNotes?: string;
};

export type StudioScenarioFilter = {
  includeArchived?: boolean;
  search?: string;
};

export type ValidationResult = {
  isValid: boolean;
  errors: string[];
};

/**
 * Senaryo olusturma payload'ini dogrular.
 */
export function validateCreateScenarioPayload(payload: Partial<CreateStudioScenarioPayload>): ValidationResult {
  const errors: string[] = [];

  if (!payload || typeof payload !== 'object') {
    return { isValid: false, errors: ['Geçersiz istek gövdesi.'] };
  }

  if (!payload.name || typeof payload.name !== 'string' || payload.name.trim().length === 0) {
    errors.push('Senaryo adı boş olamaz.');
  } else if (payload.name.trim().length > 120) {
    errors.push('Senaryo adı en fazla 120 karakter olabilir.');
  }

  if (!payload.snapshot || typeof payload.snapshot !== 'object' || payload.snapshot.schemaVersion !== 1) {
    errors.push('Geçerli bir Studio snapshot gereklidir.');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Yeni versiyon olusturma payload'ini dogrular.
 */
export function validateCreateVersionPayload(payload: Partial<CreateStudioScenarioVersionPayload>): ValidationResult {
  const errors: string[] = [];

  if (!payload || typeof payload !== 'object') {
    return { isValid: false, errors: ['Geçersiz istek gövdesi.'] };
  }

  if (!payload.scenarioId || typeof payload.scenarioId !== 'string') {
    errors.push('Senaryo kimliği (scenarioId) zorunludur.');
  }

  if (typeof payload.expectedVersionNumber !== 'number' || payload.expectedVersionNumber < 1) {
    errors.push('Geçerli bir beklenen versiyon numarası (>= 1) gereklidir.');
  }

  if (!payload.snapshot || typeof payload.snapshot !== 'object' || payload.snapshot.schemaVersion !== 1) {
    errors.push('Geçerli bir Studio snapshot gereklidir.');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Veritabanindan donen raw StudioScenario nesnesini DTO'ya cevirir.
 */
export function parseStudioScenarioRecord(raw: any): StudioScenarioRecord {
  let parcelIdentity: ParcelIdentity | null = null;
  if (raw.parcelIdentity) {
    try {
      parcelIdentity = typeof raw.parcelIdentity === 'string'
        ? JSON.parse(raw.parcelIdentity)
        : raw.parcelIdentity;
    } catch {
      parcelIdentity = null;
    }
  }

  return {
    id: raw.id,
    userId: raw.userId,
    name: raw.name,
    description: raw.description ?? null,
    parcelIdentity,
    baseInputHash: raw.baseInputHash,
    parcelSourceStatus: (raw.parcelSourceStatus as ParcelGeometrySourceKind) || 'demo',
    currentVersionNumber: raw.currentVersionNumber,
    isArchived: Boolean(raw.isArchived),
    createdAt: raw.createdAt instanceof Date ? raw.createdAt.toISOString() : String(raw.createdAt),
    updatedAt: raw.updatedAt instanceof Date ? raw.updatedAt.toISOString() : String(raw.updatedAt),
    latestVersion: raw.versions?.[0] ? parseStudioScenarioVersionSummary(raw.versions[0]) : null,
  };
}

export function parseStudioScenarioVersionSummary(raw: any): StudioScenarioVersionSummary {
  return {
    id: raw.id,
    scenarioId: raw.scenarioId,
    versionNumber: raw.versionNumber,
    snapshotHash: raw.snapshotHash,
    schemaVersion: raw.schemaVersion,
    summaryNotes: raw.summaryNotes ?? null,
    needsRebalance: Boolean(raw.needsRebalance),
    warningCount: typeof raw.warningCount === 'number' ? raw.warningCount : 0,
    createdAt: raw.createdAt instanceof Date ? raw.createdAt.toISOString() : String(raw.createdAt),
  };
}

/**
 * Veritabanindan donen raw StudioScenarioVersion nesnesini DTO'ya cevirir.
 */
export function parseStudioScenarioVersionRecord(raw: any): StudioScenarioVersionRecord {
  const summary = parseStudioScenarioVersionSummary(raw);
  let snapshot: StudioSnapshotDraft;

  try {
    snapshot = typeof raw.snapshotJson === 'string'
      ? JSON.parse(raw.snapshotJson)
      : raw.snapshotJson;
  } catch {
    throw new Error(`Snapshot JSON parse edilemedi (id: ${raw.id})`);
  }

  return {
    ...summary,
    snapshot,
  };
}
