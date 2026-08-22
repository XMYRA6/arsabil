import { notFound } from 'next/navigation';
import { getPublicStudioProposal } from '@/lib/studio/shareToken';
import { SharedProposalClient } from './SharedProposalClient';

export const dynamic = 'force-dynamic';

export default async function StudioSharePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (!token) notFound();

  const proposalDetail = await getPublicStudioProposal(token);
  if (!proposalDetail) notFound();

  return (
    <SharedProposalClient
      viewModel={proposalDetail.viewModel}
      token={proposalDetail.token}
      expiresAt={proposalDetail.expiresAt}
      createdAt={proposalDetail.createdAt}
    />
  );
}
