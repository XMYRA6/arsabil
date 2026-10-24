import React from 'react';
import { notFound, redirect } from 'next/navigation';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getStudioScenarioById, getStudioScenarioVersionDetail } from '@/lib/studio/studioScenarioRepository';
import { buildStudioProposalViewModel } from '@/lib/studio/proposalViewModel';
import { VitrinProje } from './VitrinProje';

/**
 * Proje vitrini — kaydedilmiş bir senaryo versiyonunun diorama merkezli özeti
 * (Figma 11 · Vitrin). Senaryo Kütüphanesindeki "Vitrin" bağlantısından açılır.
 * Yalnızca senaryo sahibine görünür.
 */
export default async function StudioVitrinPage({
  params,
}: {
  params: Promise<{ scenarioId: string; versionNumber: string }>;
}) {
  const { scenarioId, versionNumber } = await params;
  const versionNum = parseInt(versionNumber, 10);

  if (isNaN(versionNum) || versionNum <= 0) {
    notFound();
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    // Giriş sayfası /login; döndükten sonra aynı vitrine dönülür.
    redirect(`/login?callbackUrl=${encodeURIComponent(`/studio/scenarios/${scenarioId}/versions/${versionNumber}/vitrin`)}`);
  }

  const userId = session.user.id as string;
  const [versionRecord, scenarioData] = await Promise.all([
    getStudioScenarioVersionDetail(scenarioId, versionNum, userId),
    getStudioScenarioById(scenarioId, userId),
  ]);

  if (!versionRecord || !scenarioData) {
    notFound();
  }

  const viewModel = buildStudioProposalViewModel(scenarioData.scenario, versionRecord);
  return <VitrinProje viewModel={viewModel} snapshot={versionRecord.snapshot} />;
}
