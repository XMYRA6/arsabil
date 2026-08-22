import type { BaseSnapshotReference, StudioScenarioDraft } from './types';

export const SESSION_STORAGE_KEY = 'arsabil_studio_session_drafts_v1';
export const STORAGE_SCHEMA_VERSION = 1;
export const DEFAULT_SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 saat

export type StoredSessionDraftEnvelope = {
  schemaVersion: number;
  savedAt: string;
  baseHash: string;
  activeScenarioId: string;
  scenarios: StudioScenarioDraft[];
};

export type LoadSessionDraftsResult = {
  scenarios: StudioScenarioDraft[];
  activeScenarioId: string;
  needsRevalidation: boolean;
};

/**
 * Fizibilite / parsel girdilerinden basit ve hizli bir kimlik hash'i cikarir.
 */
export function computeBaseSnapshotHash(ref: Partial<BaseSnapshotReference>): string {
  return `${ref.parcelAreaM2 ?? 0}_${ref.grossConstructionAreaM2 ?? 0}_${ref.parcelGeometrySource ?? 'none'}_${ref.sourceId ?? ''}`;
}

/**
 * Senaryo taslaklarini guvenli sekilde sessionStorage'a yazar.
 */
export function saveSessionDrafts({
  scenarios,
  activeScenarioId,
  baseHash,
  nowIso = new Date().toISOString(),
}: {
  scenarios: StudioScenarioDraft[];
  activeScenarioId: string;
  baseHash: string;
  nowIso?: string;
}): boolean {
  if (typeof window === 'undefined' || !window.sessionStorage) {
    return false;
  }

  try {
    const envelope: StoredSessionDraftEnvelope = {
      schemaVersion: STORAGE_SCHEMA_VERSION,
      savedAt: nowIso,
      baseHash,
      activeScenarioId,
      scenarios,
    };

    window.sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(envelope));
    return true;
  } catch {
    // QuotaExceeded veya erisim engeli durumunda sessizce fail-safe
    return false;
  }
}

/**
 * Senaryo taslaklarini sessionStorage'dan guvenle yukler.
 * TTL veya schema uyumsuzlugunda null doner.
 * Base hash degismisse `needsRevalidation: true` dondurur.
 */
export function loadSessionDrafts({
  currentBaseHash,
  ttlMs = DEFAULT_SESSION_TTL_MS,
  nowMs = Date.now(),
}: {
  currentBaseHash: string;
  ttlMs?: number;
  nowMs?: number;
}): LoadSessionDraftsResult | null {
  if (typeof window === 'undefined' || !window.sessionStorage) {
    return null;
  }

  try {
    const raw = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;

    const envelope: StoredSessionDraftEnvelope = JSON.parse(raw);
    if (envelope.schemaVersion !== STORAGE_SCHEMA_VERSION) {
      return null;
    }

    const savedTime = new Date(envelope.savedAt).getTime();
    if (isNaN(savedTime) || nowMs - savedTime > ttlMs) {
      clearSessionDrafts();
      return null;
    }

    if (!Array.isArray(envelope.scenarios) || envelope.scenarios.length === 0) {
      return null;
    }

    const needsRevalidation = envelope.baseHash !== currentBaseHash;

    return {
      scenarios: envelope.scenarios,
      activeScenarioId: envelope.activeScenarioId,
      needsRevalidation,
    };
  } catch {
    return null;
  }
}

/**
 * Oturum taslagini siler.
 */
export function clearSessionDrafts(): void {
  if (typeof window === 'undefined' || !window.sessionStorage) {
    return;
  }
  try {
    window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
  } catch {
    // Ignore error
  }
}
