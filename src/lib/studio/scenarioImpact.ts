import type {
  ScenarioCommand,
  StudioScenarioDraft,
} from './types';

export type ScenarioImpactScope =
  | 'visual'
  | 'program'
  | 'valuation'
  | 'offer'
  | 'source'
  | 'annotation';

/**
 * Verilen komutun etki alanini dondurur (Faz 3B Task 2).
 */
export function getCommandImpactScope(command: ScenarioCommand): ScenarioImpactScope {
  switch (command.type) {
    case 'SET_LAYOUT':
    case 'UPDATE_LAYOUT_FOOTPRINT':
      return 'visual';

    case 'SET_PROGRAM_MIX':
    case 'UPDATE_PROGRAM_ITEM':
    case 'ADD_PROGRAM_ITEM':
    case 'REMOVE_PROGRAM_ITEM':
      return 'program';

    case 'SET_VALUATION_ASSUMPTIONS':
      return 'valuation';

    case 'SET_CUSTOM_OFFER':
      return 'offer';

    case 'SET_SCENARIO_NAME':
    case 'SET_SCENARIO_NOTES':
      return 'annotation';

    default:
      return 'visual';
  }
}

/**
 * Footprint veya program degisikliginin ozel teklif dengesini bozup
 * bozmadigini (needsRebalance) kontrol eder.
 *
 * Kural:
 * - Ozel teklif (`customOffer`) yoksa: rebalance gerekmez (`false`).
 * - Sadece metin/not/ad degisikligi varsa: rebalance gerekmez (`false`).
 * - Program kalemleri veya footprint olcegi/inset'i degismisse ve ozel teklif varsa: `true`.
 */
export function checkRequiresRebalance(
  currentDraft: StudioScenarioDraft,
  baselineDraft?: StudioScenarioDraft | null,
): boolean {
  if (!currentDraft.customOffer) {
    return false;
  }

  if (!baselineDraft) {
    // Eger baseline verilmemisse, mevcut layout kimlikten farkliysa veya program varsa
    const hasScaledFootprint = !!currentDraft.layout && (
      currentDraft.layout.footprint.scale !== 1 || (currentDraft.layout.footprint.insetM ?? 0) !== 0
    );
    return hasScaledFootprint;
  }

  // 1. Program degisikligi kontrolu
  const currentProgJson = JSON.stringify(currentDraft.programMix.map((p) => ({
    id: p.id,
    use: p.use,
    residentialType: p.residentialType,
    unitCount: p.unitCount,
    unitAreaM2: p.unitAreaM2,
  })));
  const baseProgJson = JSON.stringify(baselineDraft.programMix.map((p) => ({
    id: p.id,
    use: p.use,
    residentialType: p.residentialType,
    unitCount: p.unitCount,
    unitAreaM2: p.unitAreaM2,
  })));

  if (currentProgJson !== baseProgJson) {
    return true;
  }

  // 2. Footprint olcek veya inset degisikligi
  const currentFp = currentDraft.layout?.footprint;
  const baseFp = baselineDraft.layout?.footprint;

  if (currentFp && baseFp) {
    if (currentFp.scale !== baseFp.scale || (currentFp.insetM ?? 0) !== (baseFp.insetM ?? 0)) {
      return true;
    }
  } else if ((currentFp && currentFp.scale !== 1) || (baseFp && baseFp.scale !== 1)) {
    return true;
  }

  return false;
}
