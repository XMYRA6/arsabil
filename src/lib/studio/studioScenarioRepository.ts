import { prisma } from '@/lib/prisma';
import {
  parseStudioScenarioRecord,
  parseStudioScenarioVersionRecord,
  parseStudioScenarioVersionSummary,
  validateCreateScenarioPayload,
  validateCreateVersionPayload,
  type CreateStudioScenarioPayload,
  type CreateStudioScenarioVersionPayload,
  type StudioScenarioFilter,
  type StudioScenarioRecord,
  type StudioScenarioVersionRecord,
  type StudioScenarioVersionSummary,
} from './persistenceTypes';
import {
  computeSnapshotHash,
  extractSnapshotSummary,
  shouldCreateNewVersion,
} from './snapshotVersioning';

/**
 * Kullanicinin kayitli Studio senaryolarini listeler.
 */
export async function listStudioScenarios(
  userId: string,
  filter?: StudioScenarioFilter
): Promise<StudioScenarioRecord[]> {
  const whereClause: any = {
    userId,
  };

  if (!filter?.includeArchived) {
    whereClause.isArchived = false;
  }

  if (filter?.search && filter.search.trim().length > 0) {
    whereClause.name = {
      contains: filter.search.trim(),
      mode: 'insensitive',
    };
  }

  const scenarios = await prisma.studioScenario.findMany({
    where: whereClause,
    orderBy: { updatedAt: 'desc' },
    include: {
      versions: {
        orderBy: { versionNumber: 'desc' },
        take: 1,
      },
    },
  });

  return scenarios.map(parseStudioScenarioRecord);
}

/**
 * Belirli bir senaryoyu ve tum versiyon ozetlerini getirir.
 */
export async function getStudioScenarioById(
  scenarioId: string,
  userId: string
): Promise<{ scenario: StudioScenarioRecord; versions: StudioScenarioVersionSummary[] } | null> {
  const scenario = await prisma.studioScenario.findFirst({
    where: {
      id: scenarioId,
      userId,
    },
    include: {
      versions: {
        orderBy: { versionNumber: 'desc' },
      },
    },
  });

  if (!scenario) {
    return null;
  }

  return {
    scenario: parseStudioScenarioRecord(scenario),
    versions: scenario.versions.map(parseStudioScenarioVersionSummary),
  };
}

/**
 * Belirli bir senaryo versiyonunun tam snapshot kaydini getirir.
 */
export async function getStudioScenarioVersionDetail(
  scenarioId: string,
  versionNumber: number,
  userId: string
): Promise<StudioScenarioVersionRecord | null> {
  const scenario = await prisma.studioScenario.findFirst({
    where: { id: scenarioId, userId },
    select: { id: true },
  });

  if (!scenario) {
    return null;
  }

  const version = await prisma.studioScenarioVersion.findFirst({
    where: {
      scenarioId,
      versionNumber,
    },
  });

  if (!version) {
    return null;
  }

  return parseStudioScenarioVersionRecord(version);
}

/**
 * Yeni bir Studio senaryosu ve ilk versiyonunu (v1) olusturur.
 */
export async function createStudioScenario(
  userId: string,
  payload: CreateStudioScenarioPayload
): Promise<{ scenario: StudioScenarioRecord; version: StudioScenarioVersionRecord }> {
  const validation = validateCreateScenarioPayload(payload);
  if (!validation.isValid) {
    throw new Error(validation.errors.join(' '));
  }

  const snapshot = payload.snapshot;
  const snapshotSummary = extractSnapshotSummary(snapshot);
  const snapshotHash = computeSnapshotHash(snapshot);
  const parcelIdentityJson = snapshotSummary.parcelIdentity
    ? JSON.stringify(snapshotSummary.parcelIdentity)
    : null;

  return await prisma.$transaction(async (tx) => {
    const createdScenario = await tx.studioScenario.create({
      data: {
        userId,
        name: payload.name.trim(),
        description: payload.description?.trim() || null,
        parcelIdentity: parcelIdentityJson,
        baseInputHash: snapshotHash,
        parcelSourceStatus: snapshotSummary.parcelSourceStatus,
        currentVersionNumber: 1,
        isArchived: false,
      },
    });

    const createdVersion = await tx.studioScenarioVersion.create({
      data: {
        scenarioId: createdScenario.id,
        versionNumber: 1,
        snapshotJson: JSON.stringify(snapshot),
        snapshotHash,
        schemaVersion: snapshot.schemaVersion,
        summaryNotes: payload.summaryNotes?.trim() || null,
        needsRebalance: snapshotSummary.needsRebalance,
        warningCount: snapshotSummary.warningCount,
      },
    });

    return {
      scenario: parseStudioScenarioRecord(createdScenario),
      version: parseStudioScenarioVersionRecord(createdVersion),
    };
  });
}

export type CreateVersionResult = {
  success: boolean;
  conflict?: boolean;
  isDuplicate?: boolean;
  scenario?: StudioScenarioRecord;
  version?: StudioScenarioVersionRecord;
  error?: string;
};

/**
 * Mevcut senaryoya yeni bir versiyon ekler (optimistic concurrency ve duplicate denetimli).
 */
export async function createStudioScenarioVersion(
  userId: string,
  payload: CreateStudioScenarioVersionPayload
): Promise<CreateVersionResult> {
  const validation = validateCreateVersionPayload(payload);
  if (!validation.isValid) {
    return { success: false, error: validation.errors.join(' ') };
  }

  const existingScenario = await prisma.studioScenario.findFirst({
    where: { id: payload.scenarioId, userId },
    include: {
      versions: {
        orderBy: { versionNumber: 'desc' },
        take: 1,
      },
    },
  });

  if (!existingScenario) {
    return { success: false, error: 'Senaryo bulunamadı.' };
  }

  // Optimistic concurrency check (409 Conflict)
  if (existingScenario.currentVersionNumber !== payload.expectedVersionNumber) {
    return {
      success: false,
      conflict: true,
      error: `Senaryo başka bir oturumda güncellenmiş (Mevcut: v${existingScenario.currentVersionNumber}, Gönderilen: v${payload.expectedVersionNumber}).`,
    };
  }

  const snapshot = payload.snapshot;
  const snapshotSummary = extractSnapshotSummary(snapshot);
  const newSnapshotHash = computeSnapshotHash(snapshot);

  const latestVersion = existingScenario.versions[0];
  if (latestVersion && !shouldCreateNewVersion(latestVersion.snapshotHash, snapshot)) {
    // Duplicate snapshot content -> gereksiz versiyon acma, mevcut son versiyonu dondur
    const fullLatestVersion = await prisma.studioScenarioVersion.findFirst({
      where: { id: latestVersion.id },
    });
    return {
      success: true,
      isDuplicate: true,
      scenario: parseStudioScenarioRecord(existingScenario),
      version: fullLatestVersion ? parseStudioScenarioVersionRecord(fullLatestVersion) : undefined,
    };
  }

  const newVersionNumber = existingScenario.currentVersionNumber + 1;
  const parcelIdentityJson = snapshotSummary.parcelIdentity
    ? JSON.stringify(snapshotSummary.parcelIdentity)
    : existingScenario.parcelIdentity;

  return await prisma.$transaction(async (tx) => {
    const updatedScenario = await tx.studioScenario.update({
      where: { id: existingScenario.id },
      data: {
        currentVersionNumber: newVersionNumber,
        parcelIdentity: parcelIdentityJson,
        parcelSourceStatus: snapshotSummary.parcelSourceStatus,
        baseInputHash: newSnapshotHash,
      },
    });

    const createdVersion = await tx.studioScenarioVersion.create({
      data: {
        scenarioId: existingScenario.id,
        versionNumber: newVersionNumber,
        snapshotJson: JSON.stringify(snapshot),
        snapshotHash: newSnapshotHash,
        schemaVersion: snapshot.schemaVersion,
        summaryNotes: payload.summaryNotes?.trim() || null,
        needsRebalance: snapshotSummary.needsRebalance,
        warningCount: snapshotSummary.warningCount,
      },
    });

    return {
      success: true,
      scenario: parseStudioScenarioRecord(updatedScenario),
      version: parseStudioScenarioVersionRecord(createdVersion),
    };
  });
}

/**
 * Senaryoyu arsivler (soft-delete).
 */
export async function archiveStudioScenario(
  scenarioId: string,
  userId: string
): Promise<StudioScenarioRecord | null> {
  const existing = await prisma.studioScenario.findFirst({
    where: { id: scenarioId, userId },
  });

  if (!existing) {
    return null;
  }

  const updated = await prisma.studioScenario.update({
    where: { id: scenarioId },
    data: { isArchived: true },
  });

  return parseStudioScenarioRecord(updated);
}

/**
 * Arsivlenmis senaryoyu geri yukler.
 */
export async function restoreStudioScenario(
  scenarioId: string,
  userId: string
): Promise<StudioScenarioRecord | null> {
  const existing = await prisma.studioScenario.findFirst({
    where: { id: scenarioId, userId },
  });

  if (!existing) {
    return null;
  }

  const updated = await prisma.studioScenario.update({
    where: { id: scenarioId },
    data: { isArchived: false },
  });

  return parseStudioScenarioRecord(updated);
}
