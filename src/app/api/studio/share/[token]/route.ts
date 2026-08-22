import { NextResponse } from 'next/server';
import { getPublicStudioProposal } from '@/lib/studio/shareToken';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: Request,
  context: { params: Promise<{ token: string }> }
) {
  const { token } = await context.params;

  if (!token || typeof token !== 'string' || token.length < 8) {
    return NextResponse.json({ message: 'Geçersiz paylaşım bağlantısı.' }, { status: 404 });
  }

  const proposalDetail = await getPublicStudioProposal(token);
  if (!proposalDetail) {
    return NextResponse.json({ message: 'Paylaşım bağlantısı bulunamadı veya süresi dolmuş.' }, { status: 404 });
  }

  return NextResponse.json({
    viewModel: proposalDetail.viewModel,
    token: proposalDetail.token,
    expiresAt: proposalDetail.expiresAt,
    createdAt: proposalDetail.createdAt,
  });
}
