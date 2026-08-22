import { prisma } from '@/lib/prisma';

export type StudioAuditEventType =
  | 'CREATE'
  | 'CREATE_VERSION'
  | 'ARCHIVE'
  | 'RESTORE'
  | 'EXPORT_REPORT'
  | 'SHARE_CREATE'
  | 'SHARE_REVOKE';

export type StudioAuditEvent = {
  timestamp: string;
  userId: string;
  eventType: StudioAuditEventType;
  scenarioId: string;
  versionNumber?: number;
  metadata?: Record<string, string | number | boolean>;
};

/**
 * Faz 4A gap fix (2026-08-22) — eski implementasyon bellek ici (in-memory)
 * bir diziydi: sunucu yeniden baslayinca/deploy edilince kayboluyordu,
 * serverless ortamda istekler arasinda bile kalici degildi. Simdi
 * `StudioScenarioAuditLog` (Prisma) uzerinden KALICI yazilir.
 *
 * Audit ikincil bir islemdir — yazma basarisiz olursa asil islemi (senaryo
 * kaydetme/versiyonlama/arsivleme) FIRLATIP BOZMAZ, yalnizca konsola loglar.
 * Kisisel veri/ham not TASINMAZ: `StudioAuditEvent`de boyle bir alan hic
 * YOK (yalnizca sinirli `eventType` + kucuk, acikca gecirilen `metadata`).
 */
export async function logStudioScenarioEvent(
  userId: string,
  eventType: StudioAuditEventType,
  scenarioId: string,
  versionNumber?: number,
  metadata?: Record<string, string | number | boolean>
): Promise<void> {
  try {
    await prisma.studioScenarioAuditLog.create({
      data: {
        userId,
        eventType,
        scenarioId,
        versionNumber: versionNumber ?? null,
        metadataJson: metadata ? JSON.stringify(metadata) : null,
      },
    });
  } catch (err) {
    console.error('[StudioAudit] Kalici yazma basarisiz, ana islem etkilenmedi:', err);
  }
}

/**
 * Belirli bir senaryonun audit olaylarini (eskiden yeniye) getirir. Okuma
 * hatasinda bos dizi doner — audit gorunumu, esas akisi BLOKLAMAZ.
 */
export async function getStudioAuditEventsForScenario(scenarioId: string): Promise<StudioAuditEvent[]> {
  try {
    const rows = await prisma.studioScenarioAuditLog.findMany({
      where: { scenarioId },
      orderBy: { createdAt: 'asc' },
    });

    return rows.map((row) => ({
      timestamp: row.createdAt.toISOString(),
      userId: row.userId,
      eventType: row.eventType as StudioAuditEventType,
      scenarioId: row.scenarioId,
      versionNumber: row.versionNumber ?? undefined,
      metadata: row.metadataJson ? JSON.parse(row.metadataJson) : undefined,
    }));
  } catch (err) {
    console.error('[StudioAudit] Kayitlar okunamadi:', err);
    return [];
  }
}
