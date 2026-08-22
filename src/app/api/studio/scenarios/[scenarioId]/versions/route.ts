import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import {
  createStudioScenarioVersion,
  getStudioScenarioById,
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

    const data = await getStudioScenarioById(scenarioId, session.user.id as string);
    if (!data) {
      return NextResponse.json({ message: 'Senaryo bulunamadı.' }, { status: 404 });
    }

    return NextResponse.json({ versions: data.versions });
  } catch (err: any) {
    console.error('[API studio/scenarios/[id]/versions GET]', err);
    return NextResponse.json({ message: 'Versiyonlar getirilemedi.' }, { status: 500 });
  }
}

export async function POST(
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

    if (!body) {
      return NextResponse.json({ message: 'Geçersiz JSON gövdesi.' }, { status: 400 });
    }

    const result = await createStudioScenarioVersion(userId, {
      scenarioId,
      expectedVersionNumber: Number(body.expectedVersionNumber),
      snapshot: body.snapshot,
      summaryNotes: body.summaryNotes,
    });

    if (!result.success) {
      if (result.conflict) {
        return NextResponse.json(
          { error: 'VERSION_CONFLICT', message: result.error },
          { status: 409 }
        );
      }
      return NextResponse.json({ message: result.error || 'Versiyon kaydedilemedi.' }, { status: 400 });
    }

    if (!result.isDuplicate && result.version) {
      await logStudioScenarioEvent(userId, 'CREATE_VERSION', scenarioId, result.version.versionNumber);
    }

    return NextResponse.json(result, { status: 201 });
  } catch (err: any) {
    console.error('[API studio/scenarios/[id]/versions POST]', err);
    return NextResponse.json({ message: 'Yeni versiyon oluşturulamadı.' }, { status: 500 });
  }
}
