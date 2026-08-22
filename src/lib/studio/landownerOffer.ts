import type { LandownerOfferOption, LandownerOfferOptions, StudioWarning } from './types';

export type LandownerEntitlementResult = {
  entitledUnitCount: number;
  wholeUnitCount: number;
  fractionalUnitBalance: number;
};

/**
 * Arsa payı oranını toplam daire envanterine uygulayıp kesirli hak edişi
 * (örn. `9.2` daire) SESSIZCE yuvarlamadan döner (Faz 2 Task 3, Global
 * Constraint: "Fractional arsa payi handling must be transparent"). Kayan
 * nokta gürültüsünü (`0.4 * 23 = 9.199999999999999`) sızdırmamak için
 * 6 ondalığa yuvarlanır.
 */
export function calculateLandownerEntitlement(shareRatio: number, totalUnitCount: number): LandownerEntitlementResult {
  const entitledUnitCount = Math.round(shareRatio * totalUnitCount * 1e6) / 1e6;
  const wholeUnitCount = Math.floor(entitledUnitCount);
  const fractionalUnitBalance = Math.round((entitledUnitCount - wholeUnitCount) * 1e6) / 1e6;

  return { entitledUnitCount, wholeUnitCount, fractionalUnitBalance };
}

function formatFraction(value: number): string {
  return value.toLocaleString('tr-TR', { maximumFractionDigits: 2 });
}

export type CreateLandownerOfferOptionsInput = LandownerEntitlementResult & {
  unitValueTl: number | null;
  customOverride?: { unitCount: number; cashTl: number };
};

/**
 * Hak edişi, satılabilir/negotiate edilebilir seçeneklere çevirir (spec:
 * "senaryo", "on teklif" dili — kesin sözleşme değil). Nakit dengeleme,
 * açık bir `unitValueTl` varsayımı gerektirir; yoksa daire sayıları yine
 * hesaplanır ama nakit alanları `null` kalır + uyarı döner (bloklamaz).
 */
export function createLandownerOfferOptions({
  entitledUnitCount,
  wholeUnitCount,
  fractionalUnitBalance,
  unitValueTl,
  customOverride,
}: CreateLandownerOfferOptionsInput): LandownerOfferOptions {
  const warnings: StudioWarning[] = [];
  const options: LandownerOfferOption[] = [];

  if (fractionalUnitBalance === 0) {
    options.push({
      id: 'exact',
      label: `${wholeUnitCount} daire — pay tam sayıya denk geliyor, nakit dengeleme gerekmez`,
      wholeUnitCount,
      fractionalUnitBalance: 0,
      cashEqualizationTl: 0,
    });
  } else {
    if (unitValueTl === null) {
      warnings.push({
        code: 'MISSING_UNIT_VALUE_BASIS',
        message: 'Nakit dengeleme için birim değer (daire veya m² bazlı) varsayımı girilmedi; daire sayıları gösterilir ama nakit tutarı hesaplanamaz.',
      });
    }

    options.push({
      id: 'round-down',
      label: `${wholeUnitCount} daire + ${formatFraction(fractionalUnitBalance)} pay için nakit dengeleme`,
      wholeUnitCount,
      fractionalUnitBalance,
      cashEqualizationTl: unitValueTl === null ? null : fractionalUnitBalance * unitValueTl,
    });

    const excess = Math.round((1 - fractionalUnitBalance) * 1e6) / 1e6;
    options.push({
      id: 'round-up',
      label: `${wholeUnitCount + 1} daire verilir, fazla ${formatFraction(excess)} pay nakit/mahsup ile dengelenir`,
      wholeUnitCount: wholeUnitCount + 1,
      fractionalUnitBalance: -excess,
      cashEqualizationTl: unitValueTl === null ? null : -excess * unitValueTl,
    });
  }

  if (customOverride) {
    options.push({
      id: 'custom',
      label: 'Özel teklif — daire sayısı ve nakit tutarı kullanıcı tarafından belirlendi',
      wholeUnitCount: customOverride.unitCount,
      fractionalUnitBalance: 0,
      cashEqualizationTl: customOverride.cashTl,
    });
  }

  return { entitledUnitCount, wholeUnitCount, fractionalUnitBalance, options, warnings };
}
