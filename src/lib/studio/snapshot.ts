import { collectMassingWarnings, deriveBuildingMass } from './massing';
import type {
  LandownerOfferOptions,
  ProgramMixItem,
  ProgramMixSummary,
  StudioLayoutDraft,
  StudioMassingInput,
  StudioSnapshotDraft,
  StudioWarning,
  ValuationAssumptions,
} from './types';

export type CreateStudioSnapshotDraftInput = {
  sourceId?: string;
  createdAt: string;
  massingInput: StudioMassingInput;
  programMix?: ProgramMixItem[];
  programSummary?: ProgramMixSummary;
  landownerOffer?: LandownerOfferOptions;
  valuationAssumptions?: ValuationAssumptions;
  layoutDraft?: StudioLayoutDraft;
};

/**
 * Faz 2B Task 5: para birimi/tarih olmadan bir parasal deger anlamsizdir
 * (Global Constraint: "Para birimi, KDV/masraf varsayimi ve degerleme tarihi
 * gizli sabit olmaz"). Eksikse degerler SESSIZCE degil, uyariyla gecersiz
 * (null) sayilir — `ValuationAssumptions`in kendisi (Task 1) degismez.
 */
function sanitizeValuationAssumptions(
  input: ValuationAssumptions | undefined,
): { value: ValuationAssumptions | undefined; warning: StudioWarning | null } {
  if (!input) return { value: undefined, warning: null };

  const hasCurrency = input.currency.trim() !== '';
  const hasDate = input.valuationDate.trim() !== '';
  if (hasCurrency && hasDate) return { value: input, warning: null };

  return {
    value: { ...input, unitValueTl: null, unitValuePerM2Tl: null, shopValueTl: null },
    warning: {
      code: 'INVALID_VALUATION_METADATA',
      message: 'Değerleme varsayımında para birimi veya tarih eksik; parasal değerler snapshot\'ta geçersiz kabul edildi.',
    },
  };
}

function snapshotWarnings(massingInput: StudioMassingInput, warnings: StudioWarning[]): StudioWarning[] {
  if (massingInput.parcelPolygon?.source !== 'demo') return warnings;

  return [
    ...warnings,
    {
      code: 'NON_VERIFIED_VISUAL',
      message: 'Bu Studio snapshot demo geometriyle olusturuldu; dogrulanmis parsel siniri olarak paylasilamaz.',
    },
  ];
}

export function createStudioSnapshotDraft({
  sourceId,
  createdAt,
  massingInput,
  programMix,
  programSummary,
  landownerOffer,
  valuationAssumptions,
  layoutDraft,
}: CreateStudioSnapshotDraftInput): StudioSnapshotDraft {
  const buildingMass = deriveBuildingMass(massingInput);
  const { value: sanitizedValuationAssumptions, warning: valuationWarning } =
    sanitizeValuationAssumptions(valuationAssumptions);
  // Kutle/geometri uyarilari (NON_VERIFIED_VISUAL dahil) `buildingMass.warnings`de
  // kalir — program/teklif uyarilarini ORAYA karistirmayiz, o hala salt
  // geometri/kutle konusunda kalmali. Ust seviye `warnings` ise "hepsi
  // burada" listesidir.
  const massWarnings = snapshotWarnings(massingInput, buildingMass?.warnings ?? collectMassingWarnings(massingInput));
  const warnings = [
    ...massWarnings,
    ...(programSummary?.warnings ?? []),
    ...(landownerOffer?.warnings ?? []),
    ...(valuationWarning ? [valuationWarning] : []),
  ];

  return {
    schemaVersion: 1,
    sourceId,
    createdAt,
    massingInput,
    buildingMass: buildingMass ? { ...buildingMass, warnings: massWarnings } : null,
    warnings,
    parcelGeometrySource: massingInput.parcelPolygon?.source ?? null,
    parcelIdentity: massingInput.parcelPolygon?.parcelIdentity,
    constructionAreaSource: massingInput.grossConstructionAreaSource ?? null,
    programMix,
    programSummary,
    landownerOffer,
    valuationAssumptions: sanitizedValuationAssumptions,
    layoutDraft,
  };
}

/**
 * Faz 3B Task 5 / Faz 4 Devri:
 * Secilen bir `StudioScenarioDraft`i tek bir kalici `StudioSnapshotDraft`
 * yapisina cevirir. Adim-adim gecmis (undo/redo) loglarini IHRAC ETMEZ — yalnizca
 * secilen senaryonun son durumunu DTO olarak export eder.
 */
export function createStudioSnapshotFromScenarioDraft({
  scenarioDraft,
  massingInput,
  landShareRatio = 0.5,
  averageUnitAreaM2,
}: {
  scenarioDraft: import('./types').StudioScenarioDraft;
  massingInput: StudioMassingInput;
  landShareRatio?: number;
  averageUnitAreaM2?: number;
}): StudioSnapshotDraft {
  return createStudioSnapshotDraft({
    sourceId: scenarioDraft.baseSnapshotRef.sourceId,
    createdAt: scenarioDraft.updatedAt || scenarioDraft.createdAt,
    massingInput,
    programMix: scenarioDraft.programMix,
    valuationAssumptions: scenarioDraft.valuationAssumptions ?? undefined,
    layoutDraft: scenarioDraft.layout ?? undefined,
  });
}

