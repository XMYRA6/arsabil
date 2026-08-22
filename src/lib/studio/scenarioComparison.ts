import { summarizeProgramMix } from './programMix';
import { calculateLandownerEntitlement, createLandownerOfferOptions } from './landownerOffer';
import { resolveUnitValueTl } from './valuationAssumptions';
import { validateCustomOffer } from './offerValidation';
import { checkRequiresRebalance } from './scenarioImpact';
import type {
  ResidentialUnitType,
  StudioMassingInput,
  StudioScenarioDraft,
  StudioWarning,
} from './types';

export const MAX_SCENARIO_ALTERNATIVES = 3;

export type CashEqualizationStatus = 'calculated' | 'assumption_required';

export type ScenarioComparisonRow = {
  scenarioId: string;
  scenarioName: string;
  totalAllocatedAreaM2: number;
  grossConstructionAreaM2: number;
  remainingAreaM2: number;
  residentialUnitCountByType: Partial<Record<ResidentialUnitType, number>>;
  totalResidentialUnits: number;
  commercialUnitCount: number;
  commercialAreaM2: number;
  landownerEntitledUnits: number;
  landownerOfferedUnits: number;
  landownerFractionalBalance: number;
  landownerCashEqualizationTl: number | null;
  cashEqualizationStatus: CashEqualizationStatus;
  needsRebalance: boolean;
  warningCount: number;
  warnings: StudioWarning[];
};

export type ScenarioComparisonResult = {
  rows: ScenarioComparisonRow[];
  canAddMore: boolean;
};

/**
 * Maksimum 3 aktif senaryo limitini denetler.
 */
export function canCreateAlternative(scenarios: StudioScenarioDraft[]): boolean {
  return scenarios.length < MAX_SCENARIO_ALTERNATIVES;
}

/**
 * Aktif senaryolari yan yana karsilastirilabilir metrik tablosuna donusturur (Faz 3B Task 4).
 * Fark veya degerleme bilinmiyorsa sifir gostermez; 'assumption_required' durumunu korur.
 */
export function buildScenarioComparison(
  scenarios: StudioScenarioDraft[],
  massingInput: StudioMassingInput,
  landShareRatio: number,
  averageUnitAreaM2?: number,
): ScenarioComparisonResult {
  const grossAreaM2 = massingInput.grossConstructionAreaM2 ?? 0;

  const rows: ScenarioComparisonRow[] = scenarios.map((scenario) => {
    const summary = summarizeProgramMix(scenario.programMix, grossAreaM2);
    const totalResUnits = Object.values(summary.residentialUnitCountByType).reduce(
      (sum: number, count) => sum + (count ?? 0),
      0
    );

    const entitlement = calculateLandownerEntitlement(landShareRatio, totalResUnits);
    const resolvedUnitValue = resolveUnitValueTl(
      scenario.valuationAssumptions,
      averageUnitAreaM2 ?? 100
    );

    const offerOptions = createLandownerOfferOptions({
      ...entitlement,
      unitValueTl: resolvedUnitValue,
      customOverride: scenario.customOffer ?? undefined,
    });

    const isRebalanceNeeded = checkRequiresRebalance(scenario, null);
    const offerWarnings = validateCustomOffer(
      entitlement,
      scenario.customOffer,
      resolvedUnitValue,
      isRebalanceNeeded
    );

    let offeredUnits = entitlement.wholeUnitCount;
    let cashEq: number | null = null;
    let eqStatus: CashEqualizationStatus = resolvedUnitValue === null ? 'assumption_required' : 'calculated';

    if (scenario.customOffer) {
      offeredUnits = scenario.customOffer.unitCount;
      cashEq = scenario.customOffer.cashTl;
    } else {
      const defaultOption = offerOptions.options[0];
      if (defaultOption) {
        offeredUnits = defaultOption.wholeUnitCount;
        cashEq = defaultOption.cashEqualizationTl;
      }
    }

    const allWarnings = [
      ...summary.warnings,
      ...offerOptions.warnings,
      ...offerWarnings,
    ];

    return {
      scenarioId: scenario.id,
      scenarioName: scenario.name,
      totalAllocatedAreaM2: summary.totalAllocatedAreaM2,
      grossConstructionAreaM2: grossAreaM2,
      remainingAreaM2: summary.remainingAreaM2,
      residentialUnitCountByType: summary.residentialUnitCountByType,
      totalResidentialUnits: totalResUnits,
      commercialUnitCount: summary.commercialUnitCount,
      commercialAreaM2: summary.commercialAreaM2,
      landownerEntitledUnits: entitlement.entitledUnitCount,
      landownerOfferedUnits: offeredUnits,
      landownerFractionalBalance: entitlement.fractionalUnitBalance,
      landownerCashEqualizationTl: cashEq,
      cashEqualizationStatus: eqStatus,
      needsRebalance: isRebalanceNeeded,
      warningCount: allWarnings.length,
      warnings: allWarnings,
    };
  });

  return {
    rows,
    canAddMore: canCreateAlternative(scenarios),
  };
}
