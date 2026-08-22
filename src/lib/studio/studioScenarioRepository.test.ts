import {
  listStudioScenarios,
  getStudioScenarioById,
  createStudioScenario,
  createStudioScenarioVersion,
  archiveStudioScenario,
  restoreStudioScenario,
} from './studioScenarioRepository';
import { prisma } from '@/lib/prisma';
import type { StudioSnapshotDraft } from './types';

// Mock prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    studioScenario: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    studioScenarioVersion: {
      create: jest.fn(),
      findFirst: jest.fn(),
    },
    $transaction: jest.fn((callback) => callback(prisma)),
  },
}));

describe('studioScenarioRepository', () => {
  const mockSnapshot: StudioSnapshotDraft = {
    schemaVersion: 1,
    createdAt: '2026-08-22T20:00:00.000Z',
    massingInput: {
      parcelAreaM2: 1000,
      grossConstructionAreaM2: 2000,
      grossConstructionAreaSource: 'authoritative',
      parcelPolygon: {
        points: [{ x: 0, y: 0 }, { x: 50, y: 0 }, { x: 50, y: 20 }, { x: 0, y: 20 }],
        source: 'verified_tkgm',
        parcelIdentity: { il: 'İstanbul', ilce: 'Beşiktaş', mahalle: 'Levent', adaNo: '50', parselNo: '12' },
      },
    },
    buildingMass: null,
    warnings: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('listStudioScenarios yalnizca ilgili kullanicinin senaryolarini listeler', async () => {
    const mockRows = [
      {
        id: 'sc-1',
        userId: 'user-1',
        name: 'Senaryo 1',
        description: null,
        parcelIdentity: JSON.stringify({ il: 'İstanbul' }),
        baseInputHash: 'h1',
        parcelSourceStatus: 'verified_tkgm',
        currentVersionNumber: 1,
        isArchived: false,
        createdAt: new Date('2026-08-22'),
        updatedAt: new Date('2026-08-22'),
        versions: [{
          id: 'ver-1',
          scenarioId: 'sc-1',
          versionNumber: 1,
          snapshotHash: 'sh1',
          schemaVersion: 1,
          summaryNotes: null,
          needsRebalance: false,
          warningCount: 0,
          createdAt: new Date('2026-08-22'),
        }],
      },
    ];

    (prisma.studioScenario.findMany as jest.Mock).mockResolvedValue(mockRows);

    const result = await listStudioScenarios('user-1');
    expect(prisma.studioScenario.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ userId: 'user-1', isArchived: false }),
    }));
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Senaryo 1');
  });

  it('getStudioScenarioById bulunamazsa veya baska kullaniciya aitse null doner', async () => {
    (prisma.studioScenario.findFirst as jest.Mock).mockResolvedValue(null);

    const result = await getStudioScenarioById('sc-99', 'user-1');
    expect(result).toBeNull();
    expect(prisma.studioScenario.findFirst).toHaveBeenCalledWith({
      where: { id: 'sc-99', userId: 'user-1' },
      include: expect.any(Object),
    });
  });

  it('createStudioScenario transaction icinde senaryo ve ilk versiyonu olusturur', async () => {
    const mockScenarioRow = {
      id: 'sc-new',
      userId: 'user-1',
      name: 'Yeni Proje',
      description: 'Açıklama',
      parcelIdentity: JSON.stringify(mockSnapshot.massingInput.parcelPolygon?.parcelIdentity),
      baseInputHash: expect.any(String),
      parcelSourceStatus: 'verified_tkgm',
      currentVersionNumber: 1,
      isArchived: false,
      createdAt: new Date('2026-08-22'),
      updatedAt: new Date('2026-08-22'),
    };

    const mockVersionRow = {
      id: 'ver-new',
      scenarioId: 'sc-new',
      versionNumber: 1,
      snapshotJson: JSON.stringify(mockSnapshot),
      snapshotHash: 'hash-abc',
      schemaVersion: 1,
      summaryNotes: 'İlk kayıt',
      needsRebalance: false,
      warningCount: 0,
      createdAt: new Date('2026-08-22'),
    };

    (prisma.studioScenario.create as jest.Mock).mockResolvedValue(mockScenarioRow);
    (prisma.studioScenarioVersion.create as jest.Mock).mockResolvedValue(mockVersionRow);

    const result = await createStudioScenario('user-1', {
      name: 'Yeni Proje',
      description: 'Açıklama',
      snapshot: mockSnapshot,
      summaryNotes: 'İlk kayıt',
    });

    expect(prisma.studioScenario.create).toHaveBeenCalled();
    expect(prisma.studioScenarioVersion.create).toHaveBeenCalled();
    expect(result.scenario.id).toBe('sc-new');
    expect(result.version.versionNumber).toBe(1);
  });

  it('createStudioScenarioVersion stale version durumunda conflict: true dondurur (409)', async () => {
    const existingScenario = {
      id: 'sc-1',
      userId: 'user-1',
      currentVersionNumber: 3, // Current is 3
      versions: [{ snapshotHash: 'existing-hash' }],
    };

    (prisma.studioScenario.findFirst as jest.Mock).mockResolvedValue(existingScenario);

    const result = await createStudioScenarioVersion('user-1', {
      scenarioId: 'sc-1',
      expectedVersionNumber: 2, // Client expects 2 (stale write!)
      snapshot: mockSnapshot,
    });

    expect(result.conflict).toBe(true);
    expect(prisma.studioScenarioVersion.create).not.toHaveBeenCalled();
  });

  it('archiveStudioScenario isArchived alanini true yapar', async () => {
    (prisma.studioScenario.findFirst as jest.Mock).mockResolvedValue({ id: 'sc-1', userId: 'user-1' });
    (prisma.studioScenario.update as jest.Mock).mockResolvedValue({
      id: 'sc-1',
      userId: 'user-1',
      name: 'Senaryo',
      isArchived: true,
      currentVersionNumber: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await archiveStudioScenario('sc-1', 'user-1');
    expect(result?.isArchived).toBe(true);
    expect(prisma.studioScenario.update).toHaveBeenCalledWith({
      where: { id: 'sc-1' },
      data: { isArchived: true },
    });
  });
});
