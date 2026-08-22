import { logStudioScenarioEvent, getStudioAuditEventsForScenario } from './studioScenarioAudit';
import { prisma } from '@/lib/prisma';

jest.mock('@/lib/prisma', () => ({
  prisma: {
    studioScenarioAuditLog: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
  },
}));

// Faz 4A gap fix (2026-08-22): eski implementasyon bellek ici (in-memory)
// bir diziydi — sunucu yeniden baslayinca/deploy edilince ya da serverless
// ortamda istekler arasinda kayboluyordu, plan'in "audit kaydi TUT" istegini
// KARSILAMIYORDU. Simdi Prisma uzerinden kalici yaziliyor.
describe('studioScenarioAudit', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('logStudioScenarioEvent olayi Prisma uzerinden KALICI olarak yazar', async () => {
    (prisma.studioScenarioAuditLog.create as jest.Mock).mockResolvedValue({});

    await logStudioScenarioEvent('user-1', 'CREATE', 'sc-1', 1);

    expect(prisma.studioScenarioAuditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'user-1',
        eventType: 'CREATE',
        scenarioId: 'sc-1',
        versionNumber: 1,
      }),
    });
  });

  it('metadata verilirse JSON string olarak yazar', async () => {
    (prisma.studioScenarioAuditLog.create as jest.Mock).mockResolvedValue({});

    await logStudioScenarioEvent('user-1', 'EXPORT_REPORT', 'sc-1', 3, { format: 'pdf' });

    const call = (prisma.studioScenarioAuditLog.create as jest.Mock).mock.calls[0][0];
    expect(JSON.parse(call.data.metadataJson)).toEqual({ format: 'pdf' });
  });

  it('metadata verilmezse metadataJson null olur', async () => {
    (prisma.studioScenarioAuditLog.create as jest.Mock).mockResolvedValue({});

    await logStudioScenarioEvent('user-1', 'ARCHIVE', 'sc-1');

    const call = (prisma.studioScenarioAuditLog.create as jest.Mock).mock.calls[0][0];
    expect(call.data.metadataJson).toBeNull();
  });

  // Global Constraint (Task 5 bullet 2): kisisel veri/ham not audit'e
  // kopyalanmaz — bu, TIP SEVIYESINDE zaten imkansiz (StudioAuditEvent'te
  // "note"/"rawText" gibi bir alan hic YOK, yalnizca sinirli sayida
  // eventType + kucuk bir metadata sozlugu tasinabilir).

  it('DB yazma hatasi olursa SESSIZCE yutar, ana islemi FIRLATMAZ (audit ikincil bir islemdir)', async () => {
    (prisma.studioScenarioAuditLog.create as jest.Mock).mockRejectedValue(new Error('DB down'));

    await expect(logStudioScenarioEvent('user-1', 'CREATE', 'sc-1', 1)).resolves.not.toThrow();
  });

  it('getStudioAuditEventsForScenario belirli bir senaryonun olaylarini zaman sirasina gore doner', async () => {
    const rows = [
      { id: '1', userId: 'user-1', scenarioId: 'sc-1', eventType: 'CREATE', versionNumber: 1, metadataJson: null, createdAt: new Date('2026-08-22T10:00:00Z') },
      { id: '2', userId: 'user-1', scenarioId: 'sc-1', eventType: 'CREATE_VERSION', versionNumber: 2, metadataJson: '{"format":"pdf"}', createdAt: new Date('2026-08-22T11:00:00Z') },
    ];
    (prisma.studioScenarioAuditLog.findMany as jest.Mock).mockResolvedValue(rows);

    const events = await getStudioAuditEventsForScenario('sc-1');

    expect(events).toHaveLength(2);
    expect(events[1].versionNumber).toBe(2);
    expect(events[1].metadata).toEqual({ format: 'pdf' });
  });

  it('getStudioAuditEventsForScenario okuma hatasinda bos dizi doner, firlatmaz', async () => {
    (prisma.studioScenarioAuditLog.findMany as jest.Mock).mockRejectedValue(new Error('DB down'));

    await expect(getStudioAuditEventsForScenario('sc-1')).resolves.toEqual([]);
  });
});
