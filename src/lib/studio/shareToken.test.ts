import {
  generateShareToken,
  createStudioShareToken,
  getPublicStudioProposal,
  revokeStudioShareToken,
} from './shareToken';
import { prisma } from '@/lib/prisma';

jest.mock('@/lib/prisma', () => ({
  prisma: {
    studioScenario: {
      findFirst: jest.fn(),
    },
    studioScenarioVersion: {
      findFirst: jest.fn(),
    },
    studioShareToken: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  },
}));

jest.mock('./studioScenarioAudit', () => ({
  logStudioScenarioEvent: jest.fn(),
}));

describe('shareToken', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('generateShareToken 32 karakterlik hex token uretir', () => {
    const token = generateShareToken();
    expect(typeof token).toBe('string');
    expect(token).toHaveLength(32);
  });

  it('createStudioShareToken yetkili kullanici icin token kaydeder', async () => {
    (prisma.studioScenario.findFirst as jest.Mock).mockResolvedValue({
      id: 'sc-1',
      userId: 'u-1',
      versions: [{ id: 'v-1', versionNumber: 1 }],
    });

    (prisma.studioShareToken.create as jest.Mock).mockResolvedValue({
      id: 'tok-1',
      token: 'tok-1234567890123456789012345678',
      scenarioId: 'sc-1',
      versionId: 'v-1',
      userId: 'u-1',
      expiresAt: null,
      revokedAt: null,
      createdAt: new Date('2026-08-22T10:00:00.000Z'),
    });

    const result = await createStudioShareToken({
      userId: 'u-1',
      scenarioId: 'sc-1',
      versionNumber: 1,
    });

    expect(result.success).toBe(true);
    expect(result.tokenRecord?.token).toBe('tok-1234567890123456789012345678');
    expect(result.tokenRecord?.isActive).toBe(true);
  });

  it('getPublicStudioProposal gecerli token ile view model dondurur', async () => {
    const sampleSnapshot = {
      schemaVersion: 1,
      createdAt: '2026-08-22T10:00:00.000Z',
      massingInput: {
        parcelAreaM2: 1000,
        grossConstructionAreaM2: 2000,
        grossConstructionAreaSource: 'authoritative',
      },
      programMix: [],
      warnings: [],
    };

    (prisma.studioShareToken.findUnique as jest.Mock).mockResolvedValue({
      id: 'tok-1',
      token: 'valid-token',
      expiresAt: null,
      revokedAt: null,
      createdAt: new Date('2026-08-22T10:00:00.000Z'),
      scenario: {
        id: 'sc-1',
        userId: 'u-1',
        name: 'Paylaşılan Proje',
        parcelIdentity: 'Kadıköy 200/1',
        parcelSourceStatus: 'verified_tkgm',
        baseInputHash: 'h-1',
        currentVersionNumber: 1,
        isArchived: false,
        createdAt: new Date('2026-08-22T10:00:00.000Z'),
        updatedAt: new Date('2026-08-22T10:00:00.000Z'),
      },
      version: {
        id: 'v-1',
        scenarioId: 'sc-1',
        versionNumber: 1,
        snapshotJson: JSON.stringify(sampleSnapshot),
        snapshotHash: 'snap-hash-1',
        schemaVersion: 1,
        summaryNotes: null,
        needsRebalance: false,
        warningCount: 0,
        createdAt: new Date('2026-08-22T10:00:00.000Z'),
      },
    });

    const result = await getPublicStudioProposal('valid-token');
    expect(result).not.toBeNull();
    expect(result?.viewModel.projectContext.scenarioName).toBe('Paylaşılan Proje');
  });

  it('getPublicStudioProposal suresi gecmis veya revoke edilmis token icin null doner', async () => {
    (prisma.studioShareToken.findUnique as jest.Mock).mockResolvedValue({
      id: 'tok-1',
      token: 'revoked-token',
      expiresAt: null,
      revokedAt: new Date('2026-08-22T11:00:00.000Z'),
      scenario: { isArchived: false },
      version: { snapshotJson: '{}' },
    });

    const result = await getPublicStudioProposal('revoked-token');
    expect(result).toBeNull();
  });

  it('revokeStudioShareToken yetkili kullanici icin tokeni iptal eder', async () => {
    (prisma.studioShareToken.findFirst as jest.Mock).mockResolvedValue({
      id: 'tok-1',
      token: 'active-token',
      scenarioId: 'sc-1',
    });

    (prisma.studioShareToken.update as jest.Mock).mockResolvedValue({
      id: 'tok-1',
      revokedAt: new Date(),
    });

    const result = await revokeStudioShareToken('u-1', 'active-token');
    expect(result.success).toBe(true);
    expect(prisma.studioShareToken.update).toHaveBeenCalled();
  });
});
