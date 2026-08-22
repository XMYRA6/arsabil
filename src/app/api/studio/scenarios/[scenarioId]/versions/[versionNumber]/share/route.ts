import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import {
  createStudioShareToken,
  listStudioShareTokensForVersion,
  revokeStudioShareToken,
} from '@/lib/studio/shareToken';

export async function GET(
  _req: Request,
  context: { params: Promise<{ scenarioId: string; versionNumber: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: 'Yetkisiz erişim. Lütfen giriş yapın.' }, { status: 403 });
  }

  const { scenarioId, versionNumber: rawVersion } = await context.params;
  const versionNumber = parseInt(rawVersion, 10);
  if (isNaN(versionNumber) || versionNumber < 1) {
    return NextResponse.json({ message: 'Geçersiz versiyon numarası.' }, { status: 400 });
  }

  const tokens = await listStudioShareTokensForVersion(session.user.id, scenarioId, versionNumber);
  return NextResponse.json({ tokens });
}

export async function POST(
  req: Request,
  context: { params: Promise<{ scenarioId: string; versionNumber: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: 'Yetkisiz erişim. Lütfen giriş yapın.' }, { status: 403 });
  }

  const { scenarioId, versionNumber: rawVersion } = await context.params;
  const versionNumber = parseInt(rawVersion, 10);
  if (isNaN(versionNumber) || versionNumber < 1) {
    return NextResponse.json({ message: 'Geçersiz versiyon numarası.' }, { status: 400 });
  }

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    // Body optional
  }

  const expiresInDays = typeof body.expiresInDays === 'number' ? body.expiresInDays : null;

  const result = await createStudioShareToken({
    userId: session.user.id,
    scenarioId,
    versionNumber,
    expiresInDays,
  });

  if (!result.success || !result.tokenRecord) {
    return NextResponse.json({ message: result.error || 'Paylaşım bağlantısı oluşturulamadı.' }, { status: 400 });
  }

  return NextResponse.json({ tokenRecord: result.tokenRecord }, { status: 201 });
}

export async function DELETE(
  req: Request,
  _context: { params: Promise<{ scenarioId: string; versionNumber: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: 'Yetkisiz erişim. Lütfen giriş yapın.' }, { status: 403 });
  }

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: 'Geçersiz istek gövdesi.' }, { status: 400 });
  }

  if (!body.token || typeof body.token !== 'string') {
    return NextResponse.json({ message: 'Token zorunludur.' }, { status: 400 });
  }

  const result = await revokeStudioShareToken(session.user.id, body.token);
  if (!result.success) {
    return NextResponse.json({ message: result.error || 'Paylaşım iptal edilemedi.' }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
