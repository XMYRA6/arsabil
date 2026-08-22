import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import {
  archiveStudioScenario,
  getStudioScenarioById,
  restoreStudioScenario,
} from '@/lib/studio/studioScenarioRepository';
import { logStudioScenarioEvent } from '@/lib/studio/studioScenarioAudit';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ scenarioId: string }> }
) {
  try {
    const { scenarioId } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Yetkisiz erişim.' }, { status: 403 });
    }

    const userId = session.user.id as string;
    const data = await getStudioScenarioById(scenarioId, userId);

    if (!data) {
      return NextResponse.json({ message: 'Senaryo bulunamadı.' }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (err: any) {
    console.error('[API studio/scenarios/[id] GET]', err);
    return NextResponse.json({ message: 'Senaryo getirilemedi.' }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ scenarioId: string }> }
) {
  try {
    const { scenarioId } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Yetkisiz erişim.' }, { status: 403 });
    }

    const userId = session.user.id as string;
    const body = await req.json().catch(() => null);

    if (!body || typeof body.action !== 'string') {
      return NextResponse.json({ message: 'Geçersiz istek: action ("archive" | "restore") gereklidir.' }, { status: 400 });
    }

    if (body.action === 'archive') {
      const archived = await archiveStudioScenario(scenarioId, userId);
      if (!archived) {
        return NextResponse.json({ message: 'Senaryo bulunamadı.' }, { status: 404 });
      }
      await logStudioScenarioEvent(userId, 'ARCHIVE', scenarioId);
      return NextResponse.json({ success: true, scenario: archived });
    }

    if (body.action === 'restore') {
      const restored = await restoreStudioScenario(scenarioId, userId);
      if (!restored) {
        return NextResponse.json({ message: 'Senaryo bulunamadı.' }, { status: 404 });
      }
      await logStudioScenarioEvent(userId, 'RESTORE', scenarioId);
      return NextResponse.json({ success: true, scenario: restored });
    }

    return NextResponse.json({ message: 'Bilinmeyen eylem.' }, { status: 400 });
  } catch (err: any) {
    console.error('[API studio/scenarios/[id] PATCH]', err);
    return NextResponse.json({ message: 'Senaryo güncellenemedi.' }, { status: 500 });
  }
}
