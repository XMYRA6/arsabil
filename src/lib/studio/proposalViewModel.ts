import type {
  StudioScenarioRecord,
  StudioScenarioVersionRecord,
} from './persistenceTypes';
import type {
  ProgramUse,
  StudioWarning,
  ParcelGeometrySourceKind,
  ParcelIdentity,
} from './types';

export interface StudioProposalContext {
  scenarioId: string;
  scenarioName: string;
  versionNumber: number;
  createdAtIso: string;
  createdAtFormatted: string;
  parcelIdentity: ParcelIdentity | null;
  parcelSourceStatus: ParcelGeometrySourceKind;
  parcelAreaM2: number;
  grossConstructionAreaM2: number;
  grossConstructionAreaSource: string;
}

export interface StudioProposalMassing {
  footprintAreaM2: number;
  buildingHeightM: number;
  floorCount: number;
  coveragePercentage: number;
  rotationDeg: number;
  setback: {
    frontM: number;
    sideM: number;
    rearM: number;
  } | null;
  commercialFrontage: {
    edgeIndex: number;
    lengthM: number;
  } | null;
}

export interface StudioProposalProgramItem {
  id: string;
  use: ProgramUse;
  useLabel: string;
  unitCount: number;
  averageUnitAreaM2: number;
  allocatedAreaM2: number;
}

export interface StudioProposalProgramSummary {
  items: StudioProposalProgramItem[];
  totalAllocatedAreaM2: number;
  residentialUnitCount: number;
  commercialUnitCount: number;
  unallocatedAreaM2: number;
}

export interface StudioProposalLandownerOffer {
  entitledUnitCount: number;
  offeredWholeUnits: number;
  fractionalUnitBalance: number;
  cashEqualizationTl: number | null;
  isCustom: boolean;
  disclaimerText: string;
}

export interface StudioProposalFinancialAssumptions {
  unitValueTl: number | null;
  unitValuePerM2Tl: number | null;
  shopValueTl: number | null;
  valuationDate: string | null;
  currency: string;
}

export interface StudioProposalWarningsAndBadges {
  warnings: StudioWarning[];
  warningCount: number;
  needsRebalance: boolean;
  isDemoGeometry: boolean;
  isAuthoritativeArea: boolean;
  sourceBadgeLabel: string;
}

export interface StudioProposalViewModel {
  projectContext: StudioProposalContext;
  massingAnd2D: StudioProposalMassing;
  programSummary: StudioProposalProgramSummary;
  landownerOfferSummary: StudioProposalLandownerOffer;
  financialAssumptions: StudioProposalFinancialAssumptions;
  warningsAndBadges: StudioProposalWarningsAndBadges;
  snapshotHash: string;
  schemaVersion: number;
}

const PROGRAM_USE_LABELS: Record<ProgramUse, string> = {
  residential: 'Konut',
  commercial: 'Ticari / Dükkan',
  parking: 'Otopark',
  common: 'Ortak Alan',
};

/**
 * Kalici StudioScenarioRecord ve StudioScenarioVersionRecord verilerinden
 * teklif raporu ve public sayfa tarafindan tuketilen salt okunur View Model uretir.
 *
 * KRITIK KURAL (Faz 4B):
 * Bu fonksiyon ve rapor asla motoru yeniden calistirmaz!
 * Snapshot icerisindeki immutable verileri normalize eder ve bicimlendirir.
 */
export function buildStudioProposalViewModel(
  scenario: StudioScenarioRecord,
  version: StudioScenarioVersionRecord
): StudioProposalViewModel {
  const snapshot = version.snapshot;
  const massingInput = snapshot.massingInput;
  const massing = snapshot.buildingMass;
  const layout = snapshot.layoutDraft;
  const landownerOffer = snapshot.landownerOffer;
  const valuation = snapshot.valuationAssumptions;

  // 1. Proje Bağlamı
  const parcelAreaM2 = massingInput.parcelAreaM2 || 0;
  const grossConstructionAreaM2 =
    massing?.grossConstructionAreaM2 || massingInput.grossConstructionAreaM2 || 0;

  const createdAtDate = new Date(version.createdAt || scenario.createdAt);
  const createdAtFormatted = isNaN(createdAtDate.getTime())
    ? 'Belirtilmedi'
    : createdAtDate.toLocaleDateString('tr-TR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });

  const parcelSourceStatus: ParcelGeometrySourceKind =
    scenario.parcelSourceStatus ||
    snapshot.parcelGeometrySource ||
    massingInput.parcelPolygon?.source ||
    'unavailable';

  const isDemoGeometry = parcelSourceStatus === 'demo' || parcelSourceStatus === 'unavailable';
  const isAuthoritativeArea = massingInput.grossConstructionAreaSource === 'authoritative';

  const sourceBadgeLabel = isDemoGeometry
    ? 'Demo / Serbest Geometri'
    : parcelSourceStatus === 'verified_tkgm'
    ? 'TKGM Doğrulanmış Parsel'
    : 'Kullanıcı Çizimi Geometri';

  const grossConstructionAreaSource = isAuthoritativeArea
    ? 'Otoriter İmar / KAKS Verisi'
    : 'Daire Alanı ve Adedinden Tahmini';

  // 2. Kütle ve 2D Yerleşim
  const footprintAreaM2 = massing?.footprint?.areaM2 || 0;
  const coveragePercentage =
    parcelAreaM2 > 0 ? Math.round((footprintAreaM2 / parcelAreaM2) * 100) : 0;

  const massingAnd2D: StudioProposalMassing = {
    footprintAreaM2,
    buildingHeightM: massing?.heightM || 0,
    floorCount: massing?.floorCount || 0,
    coveragePercentage,
    rotationDeg: layout?.footprint?.rotationDeg || 0,
    setback: layout?.setback
      ? {
          frontM: layout.setback.frontM,
          sideM: layout.setback.sideM,
          rearM: layout.setback.rearM,
        }
      : null,
    commercialFrontage: layout?.commercialFrontage
      ? {
          edgeIndex: layout.commercialFrontage.edgeIndex,
          lengthM: layout.commercialFrontage.lengthM,
        }
      : null,
  };

  // 3. Program Dağılımı
  const programItems: StudioProposalProgramItem[] = (snapshot.programMix || []).map((item) => {
    const allocated = item.unitCount * item.unitAreaM2;
    return {
      id: item.id,
      use: item.use,
      useLabel: PROGRAM_USE_LABELS[item.use] || item.use,
      unitCount: item.unitCount,
      averageUnitAreaM2: item.unitAreaM2,
      allocatedAreaM2: allocated,
    };
  });

  const totalAllocatedAreaM2 = programItems.reduce((sum, it) => sum + it.allocatedAreaM2, 0);
  const residentialUnitCount = programItems
    .filter((it) => it.use === 'residential')
    .reduce((sum, it) => sum + it.unitCount, 0);
  const commercialUnitCount = programItems
    .filter((it) => it.use === 'commercial')
    .reduce((sum, it) => sum + it.unitCount, 0);

  const unallocatedAreaM2 = Math.max(0, grossConstructionAreaM2 - totalAllocatedAreaM2);

  // 4. Arsa Sahibi Teklifi
  const landownerOfferSummary: StudioProposalLandownerOffer = {
    entitledUnitCount: landownerOffer?.entitledUnitCount || 0,
    offeredWholeUnits: landownerOffer?.wholeUnitCount || 0,
    fractionalUnitBalance: landownerOffer?.fractionalUnitBalance || 0,
    cashEqualizationTl: landownerOffer?.options?.[0]?.cashEqualizationTl ?? null,
    isCustom: false,
    disclaimerText:
      'Bu teklif özeti bir ön fizibilite senaryosudur; bağlayıcı hukuki sözleşme, resmi imar durumu veya nihai taahhüt teşkil etmez.',
  };

  // 5. Finansal Varsayımlar
  const financialAssumptions: StudioProposalFinancialAssumptions = {
    unitValueTl: valuation?.unitValueTl ?? null,
    unitValuePerM2Tl:
      valuation?.unitValuePerM2Tl ??
      (valuation?.unitValueTl && massingInput.parcelAreaM2
        ? Math.round(valuation.unitValueTl / (residentialUnitCount > 0 ? (totalAllocatedAreaM2 / residentialUnitCount) : 100))
        : null),
    shopValueTl: valuation?.shopValueTl ?? null,
    valuationDate: valuation?.valuationDate || null,
    currency: valuation?.currency || 'TL',
  };

  // 6. Uyarılar & Rozetler
  const warnings = snapshot.warnings || [];
  const warningsAndBadges: StudioProposalWarningsAndBadges = {
    warnings,
    warningCount: warnings.length,
    needsRebalance: version.needsRebalance || false,
    isDemoGeometry,
    isAuthoritativeArea,
    sourceBadgeLabel,
  };

  return {
    projectContext: {
      scenarioId: scenario.id,
      scenarioName: scenario.name,
      versionNumber: version.versionNumber,
      createdAtIso: version.createdAt || scenario.createdAt,
      createdAtFormatted,
      parcelIdentity: scenario.parcelIdentity,
      parcelSourceStatus,
      parcelAreaM2,
      grossConstructionAreaM2,
      grossConstructionAreaSource,
    },
    massingAnd2D,
    programSummary: {
      items: programItems,
      totalAllocatedAreaM2,
      residentialUnitCount,
      commercialUnitCount,
      unallocatedAreaM2,
    },
    landownerOfferSummary,
    financialAssumptions,
    warningsAndBadges,
    snapshotHash: version.snapshotHash,
    schemaVersion: version.schemaVersion,
  };
}
