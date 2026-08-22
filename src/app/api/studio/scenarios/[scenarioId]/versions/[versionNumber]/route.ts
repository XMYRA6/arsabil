import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getStudioScenarioVersionDetail } from '@/lib/studio/studioScenarioRepository';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ scenarioId: string; versionNumber: string }> }
) {
  try {
    const { scenarioId, versionNumber } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Yetkisiz erişim.' }, { status: 403 });
    }

    const versionNum = parseInt(versionNumber, 10);
    if (isNaN(versionNum) || versionNum < 1) {
      return NextResponse.json({ message: 'Geçersiz versiyon numarası.' }, { status: 400 });
    }

    const data = await getStudioScenarioVersionDetail(
      scenarioId,
      versionNum,
      session.user.id as string
    );

    if (!data) {
      return NextResponse.json({ message: 'Versiyon bulunamadı.' }, { status: 404 });
    }

    return NextResponse.json({ version: data });
  } catch (err: any) {
    console.error('[API studio/scenarios/[id]/versions/[v] GET]', err);
    return NextResponse.json({ message: 'Versiyon detayı getirilemedi.' }, { status: 500 });
  }
}
