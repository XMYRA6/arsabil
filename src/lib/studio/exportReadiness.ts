import type { StudioProposalViewModel } from './proposalViewModel';
import { CURRENT_STUDIO_SCHEMA_VERSION } from './snapshotVersioning';

export type ExportReadinessStatus = 'ready' | 'attention' | 'blocked';

export interface ExportReadinessResult {
  status: ExportReadinessStatus;
  canExport: boolean;
  blockReasons: string[];
  attentionReasons: string[];
}

/**
 * Senaryo teklifinin PDF export veya public paylasim icin hazir olup olmadigini denetler.
 *
 * Kurallar (Faz 4B):
 * 1. needsRebalance === true ise 'blocked' (dengesiz teklif disariya aktarilamaz veya paylasilamaz).
 * 2. schemaVersion destegi yoksa 'blocked'.
 * 3. demo geometri, eksik ticari varsayim vb. durumlarda 'attention' (uyari kutusu ile izin verilir).
 * 4. Sorunsuz senaryolarda 'ready'.
 */
export function checkExportReadiness(viewModel: StudioProposalViewModel): ExportReadinessResult {
  const blockReasons: string[] = [];
  const attentionReasons: string[] = [];

  // 1. Dengeleme kontrolu
  if (viewModel.warningsAndBadges.needsRebalance) {
    blockReasons.push('Teklif dengelenmemiştir; arsa sahibine dengesiz teklif paylaşılamaz veya dışa aktarılamaz.');
  }

  // 2. Schema versiyon kontrolu
  if (viewModel.schemaVersion > CURRENT_STUDIO_SCHEMA_VERSION) {
    blockReasons.push('Senaryo şeması güncel sistemle uyumlu değildir.');
  }

  // 3. Demo geometri kontrolu
  if (viewModel.warningsAndBadges.isDemoGeometry) {
    attentionReasons.push('Parsel geometrisi TKGM ile doğrulanmamıştır (Demo/Serbest geometri).');
  }

  // 4. Diger uyarilar
  if (viewModel.warningsAndBadges.warningCount > 0) {
    for (const w of viewModel.warningsAndBadges.warnings) {
      if (w.code !== 'OFFER_NEEDS_REBALANCE') {
        attentionReasons.push(w.message);
      }
    }
  }

  const isBlocked = blockReasons.length > 0;
  const isAttention = attentionReasons.length > 0;

  const status: ExportReadinessStatus = isBlocked
    ? 'blocked'
    : isAttention
    ? 'attention'
    : 'ready';

  return {
    status,
    canExport: !isBlocked,
    blockReasons,
    attentionReasons,
  };
}
