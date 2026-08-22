import { createHash } from 'crypto';
import type {
  ParcelGeometrySourceKind,
  ParcelIdentity,
  StudioSnapshotDraft,
} from './types';

export const CURRENT_STUDIO_SCHEMA_VERSION = 1;

/**
 * Nesneyi deterministik sekilde (anahtarlari alfabetik siralanmis) JSON stringe donusturur.
 */
export function canonicalizeJson(value: any): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return '[' + value.map(item => canonicalizeJson(item)).join(',') + ']';
  }

  const keys = Object.keys(value).sort();
  const pairs = keys.map(key => {
    return JSON.stringify(key) + ':' + canonicalizeJson(value[key]);
  });

  return '{' + pairs.join(',') + '}';
}

/**
 * Snapshot'in icerik ozetinden SHA-256 hash uretir.
 * Snapshot'in icerik karsilastirmasinda deterministik canonical JSON kullanilir.
 */
export function computeSnapshotHash(snapshot: StudioSnapshotDraft): string {
  // Hash olustururken createdAt ve local metadata haric asil veri tabanini hashleriz
  const dataToHash = {
    schemaVersion: snapshot.schemaVersion,
    massingInput: snapshot.massingInput,
    programMix: snapshot.programMix,
    programSummary: snapshot.programSummary,
    layoutDraft: snapshot.layoutDraft,
    landownerOffer: snapshot.landownerOffer,
    valuationAssumptions: snapshot.valuationAssumptions,
    warnings: snapshot.warnings,
  };

  const canonical = canonicalizeJson(dataToHash);
  return createHash('sha256').update(canonical).digest('hex');
}

/**
 * Ayni icerige sahipse gereksiz yeni versiyon olusturulmasini engeller.
 */
export function shouldCreateNewVersion(existingSnapshotHash: string, newSnapshot: StudioSnapshotDraft): boolean {
  const newHash = computeSnapshotHash(newSnapshot);
  return newHash !== existingSnapshotHash;
}

export type SnapshotExtractedSummary = {
  parcelSourceStatus: ParcelGeometrySourceKind;
  parcelIdentity: ParcelIdentity | null;
  needsRebalance: boolean;
  warningCount: number;
  totalAllocatedAreaM2: number;
  grossConstructionAreaM2: number;
};

/**
 * Snapshot'tan liste ve dialoglar icin ozet verileri cikarir.
 */
export function extractSnapshotSummary(snapshot: StudioSnapshotDraft): SnapshotExtractedSummary {
  const parcelSource = snapshot.massingInput?.parcelPolygon?.source || 'unavailable';
  const parcelIdentity = snapshot.massingInput?.parcelPolygon?.parcelIdentity ?? null;
  const warnings = snapshot.warnings || [];
  const warningCount = warnings.length;
  const needsRebalance = warnings.some(w => w.code === 'OFFER_NEEDS_REBALANCE');

  let totalAllocatedAreaM2 = 0;
  if (snapshot.programMix && Array.isArray(snapshot.programMix)) {
    totalAllocatedAreaM2 = snapshot.programMix.reduce(
      (sum, item) => sum + item.unitCount * item.unitAreaM2,
      0,
    );
  }

  const grossConstructionAreaM2 = snapshot.massingInput?.grossConstructionAreaM2 || 0;

  return {
    parcelSourceStatus: parcelSource,
    parcelIdentity,
    needsRebalance,
    warningCount,
    totalAllocatedAreaM2,
    grossConstructionAreaM2,
  };
}

/**
 * Ham snapshot verisini dogrular ve gerekirse ileri versiyona yukseltme (upcast) adimlarini isletir.
 */
export function upcastSnapshot(raw: any, fromSchemaVersion = 1): StudioSnapshotDraft {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Geçersiz snapshot: veri bir nesne olmalıdır.');
  }

  const version = raw.schemaVersion ?? fromSchemaVersion;

  if (version > CURRENT_STUDIO_SCHEMA_VERSION) {
    throw new Error(`Desteklenmeyen şema versiyonu: v${version} (Desteklenen en yüksek: v${CURRENT_STUDIO_SCHEMA_VERSION})`);
  }

  if (version === 1) {
    if (!raw.massingInput || typeof raw.massingInput !== 'object') {
      throw new Error('Geçersiz v1 snapshot: massingInput alanı eksik.');
    }

    return {
      schemaVersion: 1,
      createdAt: raw.createdAt || new Date().toISOString(),
      massingInput: raw.massingInput,
      buildingMass: raw.buildingMass || null,
      programMix: raw.programMix || undefined,
      programSummary: raw.programSummary || undefined,
      layoutDraft: raw.layoutDraft || undefined,
      landownerOffer: raw.landownerOffer || undefined,
      valuationAssumptions: raw.valuationAssumptions || undefined,
      warnings: Array.isArray(raw.warnings) ? raw.warnings : [],
    };
  }

  throw new Error(`Bilinmeyen şema versiyonu: ${version}`);
}
