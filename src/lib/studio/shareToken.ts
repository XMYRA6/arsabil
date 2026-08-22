import { randomBytes } from 'crypto';
import { prisma } from '@/lib/prisma';
import { buildStudioProposalViewModel, type StudioProposalViewModel } from './proposalViewModel';
import {
  parseStudioScenarioRecord,
  parseStudioScenarioVersionRecord,
} from './persistenceTypes';
import { logStudioScenarioEvent } from './studioScenarioAudit';

export interface CreateShareTokenOptions {
  userId: string;
  scenarioId: string;
  versionNumber: number;
  expiresInDays?: number | null; // null = never expires
}

export interface ShareTokenRecord {
  id: string;
  token: string;
  scenarioId: string;
  versionNumber: number;
  expiresAt: string | null;
  revokedAt: string | null;
  createdAt: string;
  isActive: boolean;
}

export interface PublicProposalDetail {
  viewModel: StudioProposalViewModel;
  token: string;
  expiresAt: string | null;
  createdAt: string;
}

/**
 * Benzersiz 32 karakterli URL-safe paylaşım token'ı üretir.
 */
export function generateShareToken(): string {
  return randomBytes(16).toString('hex');
}

/**
 * Belirli bir senaryo versiyonu için public paylaşım token'ı oluşturur.
 * Yalnızca senaryo sahibi oluşturabilir.
 */
export async function createStudioShareToken({
  userId,
  scenarioId,
  versionNumber,
  expiresInDays,
}: CreateShareTokenOptions): Promise<{ success: boolean; tokenRecord?: ShareTokenRecord; error?: string }> {
  const scenario = await prisma.studioScenario.findFirst({
    where: { id: scenarioId, userId, isArchived: false },
    include: {
      versions: {
        where: { versionNumber },
      },
    },
  });

  if (!scenario || scenario.versions.length === 0) {
    return { success: false, error: 'Senaryo veya versiyon bulunamadı.' };
  }

  const version = scenario.versions[0];
  const token = generateShareToken();
  const expiresAt = expiresInDays ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000) : null;

  const record = await prisma.studioShareToken.create({
    data: {
      token,
      scenarioId: scenario.id,
      versionId: version.id,
      userId,
      expiresAt,
    },
  });

  await logStudioScenarioEvent(
    userId,
    'SHARE_CREATE',
    scenarioId,
    versionNumber,
    { token: record.token, expiresInDays: expiresInDays ?? 0 }
  );

  return {
    success: true,
    tokenRecord: {
      id: record.id,
      token: record.token,
      scenarioId: record.scenarioId,
      versionNumber,
      expiresAt: record.expiresAt ? record.expiresAt.toISOString() : null,
      revokedAt: null,
      createdAt: record.createdAt.toISOString(),
      isActive: true,
    },
  };
}

/**
 * Token üzerinden salt okunur Studio Proposal View Model'ini getirir.
 * Token bulunamazsa, süresi dolmuşsa veya revoke edilmişse null döner (404).
 */
export async function getPublicStudioProposal(token: string): Promise<PublicProposalDetail | null> {
  const record = await prisma.studioShareToken.findUnique({
    where: { token },
    include: {
      scenario: true,
      version: true,
    },
  });

  if (!record) return null;

  // 1. Revoke kontrolü
  if (record.revokedAt) return null;

  // 2. Süre dolumu kontrolü
  if (record.expiresAt && record.expiresAt < new Date()) return null;

  // 3. Senaryo arşiv durumu kontrolü
  if (record.scenario.isArchived) return null;

  const scenarioRecord = parseStudioScenarioRecord(record.scenario);
  const versionRecord = parseStudioScenarioVersionRecord(record.version);

  const viewModel = buildStudioProposalViewModel(scenarioRecord, versionRecord);

  return {
    viewModel,
    token: record.token,
    expiresAt: record.expiresAt ? record.expiresAt.toISOString() : null,
    createdAt: record.createdAt.toISOString(),
  };
}

/**
 * Paylaşım token'ını iptal eder (revoke).
 */
export async function revokeStudioShareToken(
  userId: string,
  token: string
): Promise<{ success: boolean; error?: string }> {
  const record = await prisma.studioShareToken.findFirst({
    where: { token, userId },
  });

  if (!record) {
    return { success: false, error: 'Paylaşım bağlantısı bulunamadı veya yetkiniz yok.' };
  }

  await prisma.studioShareToken.update({
    where: { id: record.id },
    data: { revokedAt: new Date() },
  });

  await logStudioScenarioEvent(
    userId,
    'SHARE_REVOKE',
    record.scenarioId,
    undefined,
    { token: record.token }
  );

  return { success: true };
}

/**
 * Bir senaryo versiyonuna ait paylaşım token'larını listeler (kullanıcı paneli için).
 */
export async function listStudioShareTokensForVersion(
  userId: string,
  scenarioId: string,
  versionNumber: number
): Promise<ShareTokenRecord[]> {
  const version = await prisma.studioScenarioVersion.findFirst({
    where: {
      scenarioId,
      versionNumber,
      scenario: { userId },
    },
    include: {
      shareTokens: {
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!version) return [];

  const now = new Date();
  return version.shareTokens.map((t) => ({
    id: t.id,
    token: t.token,
    scenarioId: t.scenarioId,
    versionNumber,
    expiresAt: t.expiresAt ? t.expiresAt.toISOString() : null,
    revokedAt: t.revokedAt ? t.revokedAt.toISOString() : null,
    createdAt: t.createdAt.toISOString(),
    isActive: !t.revokedAt && (!t.expiresAt || t.expiresAt > now),
  }));
}
