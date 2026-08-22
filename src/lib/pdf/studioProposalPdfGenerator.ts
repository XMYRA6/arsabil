import React from 'react';
import { StudioProposalDocument } from './StudioProposalDocument';
import { downloadPdfBlob } from './downloadPdf';
import type { StudioProposalViewModel } from '@/lib/studio/proposalViewModel';

/**
 * Verilen StudioProposalViewModel ve opsiyonel SVG görsel data URI'sini
 * kullanarak PDF belgesini derler ve tarayicida dosya indirmesini tetikler.
 */
export async function downloadStudioProposalPdf(
  viewModel: StudioProposalViewModel,
  svgDataUri?: string
): Promise<void> {
  const element = React.createElement(StudioProposalDocument, {
    viewModel,
    svgDataUri,
  });

  const slug = (viewModel.projectContext.scenarioName || 'Studio_Teklif')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

  await downloadPdfBlob(element as any, `ArsaBil_${slug}_v${viewModel.projectContext.versionNumber}`);
}
