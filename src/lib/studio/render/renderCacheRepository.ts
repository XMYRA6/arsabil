import { createHash } from 'crypto';
import { canonicalizeJson } from '@/lib/studio/snapshotVersioning';

export interface RenderCameraView {
  position: [number, number, number];
}

// 0.5 birim hassasiyet: OrbitControls sürüklemesinin ürettiği küçük kamera
// titremesi gereksiz cache miss/tekrar ücretli render üretmesin, ama gerçekten
// farklı bir açı (kullanıcının bilerek döndürdüğü) yeni anahtar üretsin.
function roundCoord(n: number): number {
  return Math.floor(n * 2) / 2;
}

export function computeRenderCacheKey(
  scenarioId: string,
  versionNumber: number,
  camera: RenderCameraView
): string {
  const roundedPosition = camera.position.map(roundCoord) as [number, number, number];
  const canonical = canonicalizeJson({ scenarioId, versionNumber, cameraPosition: roundedPosition });
  return createHash('sha256').update(canonical).digest('hex');
}

export interface RenderCacheDb {
  studioRenderCache: {
    findUnique(args: unknown): Promise<{ imageUrl: string } | null>;
    create(args: unknown): Promise<unknown>;
    aggregate(args: unknown): Promise<{ _sum: { estCostUsd: number | null } }>;
  };
}

export async function getCachedRender(
  db: RenderCacheDb,
  userId: string,
  cacheKey: string
): Promise<string | null> {
  const row = await db.studioRenderCache.findUnique({
    where: { userId_cacheKey: { userId, cacheKey } },
  });
  return row?.imageUrl ?? null;
}

export async function saveCachedRender(
  db: RenderCacheDb,
  params: { userId: string; cacheKey: string; imageUrl: string; estCostUsd: number }
): Promise<void> {
  await db.studioRenderCache.create({ data: params });
}

export async function monthSpendUsd(db: RenderCacheDb, now: Date): Promise<number> {
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const result = await db.studioRenderCache.aggregate({
    _sum: { estCostUsd: true },
    where: { createdAt: { gte: monthStart } },
  });
  return result._sum.estCostUsd ?? 0;
}
