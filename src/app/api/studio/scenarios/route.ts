import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import {
  createStudioScenario,
  listStudioScenarios,
} from '@/lib/studio/studioScenarioRepository';
import { logStudioScenarioEvent } from '@/lib/studio/studioScenarioAudit';

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Yetkisiz erişim.' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const includeArchived = searchParams.get('includeArchived') === 'true';
    const search = searchParams.get('search') || undefined;

    const scenarios = await listStudioScenarios(session.user.id as string, {
      includeArchived,
      search,
    });

    return NextResponse.json({ scenarios });
  } catch (err: any) {
    console.error('[API studio/scenarios GET]', err);
    return NextResponse.json({ message: 'Senaryolar listelenirken bir hata oluştu.' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Yetkisiz erişim.' }, { status: 403 });
    }

    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ message: 'Geçersiz JSON gövdesi.' }, { status: 400 });
    }

    const userId = session.user.id as string;
    const result = await createStudioScenario(userId, {
      name: body.name,
      description: body.description,
      snapshot: body.snapshot,
      summaryNotes: body.summaryNotes,
    });

    await logStudioScenarioEvent(userId, 'CREATE', result.scenario.id, result.version.versionNumber);

    return NextResponse.json(result, { status: 201 });
  } catch (err: any) {
    console.error('[API studio/scenarios POST]', err);
    return NextResponse.json({ message: err.message || 'Senaryo kaydedilemedi.' }, { status: 400 });
  }
}
