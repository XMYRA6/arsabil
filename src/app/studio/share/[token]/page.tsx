import type { Metadata } from 'next';
import { GecersizBaglanti } from '@/components/layout/GecersizBaglanti';
import { getPublicStudioProposal } from '@/lib/studio/shareToken';
import { SharedProposalClient } from './SharedProposalClient';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { robots: { index: false } };

export default async function StudioSharePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (!token) return <GecersizBaglanti konu="Paylaşılan teklif" />;

  const proposalDetail = await getPublicStudioProposal(token);
  if (!proposalDetail) return <GecersizBaglanti konu="Paylaşılan teklif" />;

  return (
    <SharedProposalClient
      viewModel={proposalDetail.viewModel}
      token={proposalDetail.token}
      expiresAt={proposalDetail.expiresAt}
      createdAt={proposalDetail.createdAt}
    />
  );
}
