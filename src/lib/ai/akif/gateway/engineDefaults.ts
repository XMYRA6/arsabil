import { mergeQualityLevels, DEFAULT_QUALITY_LEVELS } from '@/app/hesapla/calculatorUiHelpers';
import type { QualityTier } from '@/app/hesapla/calculatorUiHelpers';

export interface EngineDefaults {
  P: number;
  K: number;
  qualityLevels: { standart: number; orta: number; luks: number };
}

export interface EngineDefaultsDb {
  globalSettings: {
    findUnique(a: {
      where: { id: string };
    }): Promise<{
      defaultUnitPrice: number;
      qualityStandard: number;
      qualityMedium: number;
      qualityLux: number;
    } | null>;
  };
  profitLevel: {
    findFirst(a: { where: { isDefault: boolean } }): Promise<{ value: number } | null>;
  };
}

export async function resolveEngineDefaults(db: EngineDefaultsDb): Promise<EngineDefaults> {
  // Fetch globalSettings singleton (id = 'settings')
  const globalSettingsRow = await db.globalSettings.findUnique({
    where: { id: 'settings' },
  });

  // Resolve P (unit price)
  const P = globalSettingsRow?.defaultUnitPrice ?? 12000;

  // Resolve quality levels by merging defaults with db values
  const qualityLevels = mergeQualityLevels(DEFAULT_QUALITY_LEVELS, globalSettingsRow ?? {});

  // Fetch default profit level
  const profitLevelRow = await db.profitLevel.findFirst({
    where: { isDefault: true },
  });

  // Resolve K (profit coefficient)
  const K = profitLevelRow?.value ?? 1.30;

  return {
    P,
    K,
    qualityLevels,
  };
}

export function lValue(tier: QualityTier, levels: EngineDefaults['qualityLevels']): number {
  return levels[tier];
}
