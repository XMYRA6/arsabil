import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getStudioScenarioVersionDetail } from '@/lib/studio/studioScenarioRepository';
import { readStudioRenderEnv } from '@/lib/studio/render/env';
import { generatePhotorealisticRender, buildRenderPrompt } from '@/lib/studio/render/falClient';
import {
  computeRenderCacheKey,
  getCachedRender,
  saveCachedRender,
  monthSpendUsd,
  type RenderCacheDb,
} from '@/lib/studio/render/renderCacheRepository';
import { checkMonthlyBudget } from '@/lib/ai/akif/costGuard';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit';

export const runtime = 'nodejs';

interface RawBody {
  colorImageDataUrl?: unknown;
  depthImageDataUrl?: unknown;
  cameraPosition?: unknown;
}

interface ValidBody {
  colorImageDataUrl: string;
  depthImageDataUrl: string;
  cameraPosition: [number, number, number];
}

function isValidBody(body: RawBody): body is ValidBody {
  return (
    typeof body.colorImageDataUrl === 'string' &&
    body.colorImageDataUrl.startsWith('data:image/') &&
    typeof body.depthImageDataUrl === 'string' &&
    body.depthImageDataUrl.startsWith('data:image/') &&
    Array.isArray(body.cameraPosition) &&
    body.cameraPosition.length === 3 &&
    body.cameraPosition.every((n) => typeof n === 'number' && Number.isFinite(n))
  );
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ scenarioId: string; versionNumber: string }> }
) {
  try {
    const { scenarioId, versionNumber } = await params;
    const versionNum = Number(versionNumber);
    if (!Number.isInteger(versionNum) || versionNum <= 0) {
      return NextResponse.json({ message: 'Geçersiz versiyon numarası.' }, { status: 400 });
    }

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Yetkisiz erişim.' }, { status: 403 });
    }
    const userId = session.user.id as string;

    const rl = checkRateLimit(`studio-render:user:${userId}`, RATE_LIMITS.STUDIO_RENDER);
    if (!rl.ok) {
      return NextResponse.json(
        { message: 'Çok fazla istek, lütfen biraz bekleyin.' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec ?? 60) } }
      );
    }

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { plan: true } });
    if (user?.plan !== 'PRO') {
      return NextResponse.json({ message: 'Bu özellik yalnızca premium kullanıcılara açık.' }, { status: 403 });
    }

    // Sahiplik doğrulaması — mevcut owner-only repository fonksiyonu
    // yeniden kullanılıyor (aynı desen: vitrin sayfası, share route).
    const versionRecord = await getStudioScenarioVersionDetail(scenarioId, versionNum, userId);
    if (!versionRecord) {
      return NextResponse.json({ message: 'Senaryo veya versiyon bulunamadı.' }, { status: 404 });
    }

    const rawBody = (await req.json().catch(() => null)) as RawBody | null;
    if (!rawBody || !isValidBody(rawBody)) {
      return NextResponse.json({ message: 'Geçersiz istek gövdesi.' }, { status: 400 });
    }

    let env;
    try {
      env = readStudioRenderEnv();
    } catch {
      return NextResponse.json({ message: 'Fotogerçekçi render şu an kullanılamıyor.' }, { status: 503 });
    }

    const db = prisma as unknown as RenderCacheDb;
    const cacheKey = computeRenderCacheKey(scenarioId, versionNum, { position: rawBody.cameraPosition });

    const cachedImageUrl = await getCachedRender(db, userId, cacheKey);
    if (cachedImageUrl) {
      return NextResponse.json({ imageUrl: cachedImageUrl, cached: true });
    }

    const mb = await checkMonthlyBudget({
      monthSpendUsd: (now) => monthSpendUsd(db, now),
      budgetUsd: env.monthlyBudgetUsd,
      now: () => new Date(),
    });
    if (!mb.ok) {
      return NextResponse.json(
        { message: 'Aylık render bütçesine ulaşıldı, lütfen daha sonra tekrar deneyin.' },
        { status: 503 }
      );
    }

    let result;
    try {
      result = await generatePhotorealisticRender(
        {
          colorImageDataUrl: rawBody.colorImageDataUrl,
          depthImageDataUrl: rawBody.depthImageDataUrl,
          prompt: buildRenderPrompt(),
        },
        { apiKey: env.falApiKey, modelId: env.modelId }
      );
    } catch (err) {
      console.error('[API studio render POST] sağlayıcı hatası', err);
      // Kullanım hakkı düşülmez, cache yazılmaz (spec §Hata Yönetimi).
      return NextResponse.json({ message: 'Render üretilemedi, lütfen tekrar deneyin.' }, { status: 502 });
    }

    await saveCachedRender(db, {
      userId,
      cacheKey,
      imageUrl: result.imageUrl,
      estCostUsd: env.estCostPerRenderUsd,
    });

    return NextResponse.json({ imageUrl: result.imageUrl, cached: false });
  } catch (err) {
    console.error('[API studio render POST]', err);
    return NextResponse.json({ message: 'Render işlenemedi.' }, { status: 500 });
  }
}
