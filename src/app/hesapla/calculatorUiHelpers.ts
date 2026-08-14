import type { CalculationInput } from '@/lib/calculator/engine_v2';

/** Yapı standardı katsayı kimliği — SEÇİMİN kendisi (kullanıcının tıkladığı
 * sekme) bu anahtarla tutulur, HAM SAYIYLA değil. Admin panelinde bir
 * katsayı değişse bile ("Orta" 1.2'den 1.25'e), kullanıcının seçimi
 * (tier) aynı kalır — sayı eşleşmesine dayalı bir seçim, katsayı
 * güncellenince sessizce "hiçbiri seçili değil" durumuna düşerdi
 * (denetim bulgusu C3). */
export type QualityTier = 'standart' | 'orta' | 'luks';

export interface QualityLevels {
  standart: number;
  orta: number;
  luks: number;
}

export const DEFAULT_QUALITY_LEVELS: QualityLevels = { standart: 1.0, orta: 1.2, luks: 1.4 };

/** `/api/settings`den gelen kısmi veriyle varsayılanları birleştirir —
 * yalnızca gerçekten sayısal olan alanlar üzerine yazılır. */
export function mergeQualityLevels(
  base: QualityLevels,
  fetched: { qualityStandard?: unknown; qualityMedium?: unknown; qualityLux?: unknown } | null | undefined,
): QualityLevels {
  if (!fetched) return base;
  return {
    standart: typeof fetched.qualityStandard === 'number' ? fetched.qualityStandard : base.standart,
    orta: typeof fetched.qualityMedium === 'number' ? fetched.qualityMedium : base.orta,
    luks: typeof fetched.qualityLux === 'number' ? fetched.qualityLux : base.luks,
  };
}

export interface EffectiveLandShareInput {
  isApartmentCountEnabled: boolean;
  ownerApartmentShare: number;
  totalApartments: number;
  landShareRatio: number;
}

/** Sd açıkken tek gerçek kaynak ownerApartmentShare/totalApartments'tır; landShareRatio sadece Sd kapalıyken kullanılır. */
export function computeEffectiveLandShareX({
  isApartmentCountEnabled,
  ownerApartmentShare,
  totalApartments,
  landShareRatio,
}: EffectiveLandShareInput): number {
  if (isApartmentCountEnabled) {
    return totalApartments > 0 ? ownerApartmentShare / totalApartments : 0;
  }
  return landShareRatio / 100;
}

/** Ust sinir N-1'dir, N DEGIL: muteahhide en az 1 daire kalmali. N=totalApartments'a
 * esit bir pay x=1'e (arsa sahibi TUM daireleri alir) yol acar, engine_v2.ts bunu
 * sessizce 0.999'a kelepceleyip maliyeti ~1000 kat siskin gosterir (denetim bulgusu C1). */
export function clampOwnerApartmentShare(ownerApartmentShare: number, totalApartments: number): number {
  if (totalApartments <= 0) return 0;
  const maxOwnerShare = Math.max(totalApartments - 1, 0);
  return Math.min(Math.max(ownerApartmentShare, 0), maxOwnerShare);
}

export function parseMarketPrice(raw: string): number {
  return parseInt(raw.replace(/\D/g, '') || '0', 10);
}

export interface BuildCalculationInputParams {
  x: number;
  luxLevel: number;
  apartmentSize: number | null;
  globalUnitPrice: number | null;
  builderProfit: number;
  isApartmentCountEnabled: boolean;
  totalApartments: number;
  isAaEnabled: boolean;
  arsaAlani: number;
  riskLevel: number;
  iksaMode: 'off' | 'percentage' | 'manual';
  iksaPercentage: number;
  iksaManualTL: number;
  Pmarket?: number;
}

/** Hesap motoruna (`CalculatorEngineV2.calculate`) verilecek `CalculationInput`
 * nesnesini TEK yerden üretir. Önceden `page.tsx`te iki ayrı yerde (asıl
 * hesap + grafik girdisi) elle senkron tutulan, satır satır kopya iki nesne
 * vardı — 2026-07-24'te tam bu yüzden grafikler sabit bir değer kullanmıştı
 * (biri güncellenip diğeri unutulmuştu). Her iki çağrı sitesi artık bunu
 * kullanır (denetim-2 bulgusu). */
export function buildCalculationInput(params: BuildCalculationInputParams): CalculationInput {
  const {
    x, luxLevel, apartmentSize, globalUnitPrice, builderProfit,
    isApartmentCountEnabled, totalApartments, isAaEnabled, arsaAlani,
    riskLevel, iksaMode, iksaPercentage, iksaManualTL, Pmarket,
  } = params;

  return {
    x,
    L: luxLevel,
    Ad: apartmentSize ?? 0,
    P: globalUnitPrice ?? 0,
    K: builderProfit,

    Sd: isApartmentCountEnabled ? totalApartments : undefined,
    Aa: isAaEnabled ? arsaAlani : undefined,

    isRiskEnabled: riskLevel > 0,
    R: riskLevel > 0 ? 1 + (riskLevel / 100) : 1,

    isExcavationEnabled: iksaMode !== 'off',
    excavationMode: iksaMode === 'manual' ? 'manual' : 'percentage',
    Z: iksaMode === 'percentage' ? (iksaPercentage / 100) : 0,
    MzOriginal: iksaMode === 'manual' ? iksaManualTL : 0,

    Pmarket,
  };
}

/** "Örnek Proje ile Dene" demo sabitleri — eski AYAR_VARSAYILANLARI'nin apartmentSize/globalUnitPrice degerleriyle AYNI (140/12000), artik demo amacli. TEK kaynak. */
export const ORNEK_APARTMENT_SIZE = 140;
export const ORNEK_GLOBAL_UNIT_PRICE = 12000;

export interface OrnekProjeDoldurInput {
  apartmentSize: number | null;
  globalUnitPrice: number | null;
}

export interface OrnekProjeDoldurSonuc {
  apartmentSize: number;
  globalUnitPrice: number;
}

/** Yalnizca BOS (null) olan alanlari demo sabitleriyle doldurur; dolu birakir. */
export function ornekProjeIleDeneDoldur({
  apartmentSize,
  globalUnitPrice,
}: OrnekProjeDoldurInput): OrnekProjeDoldurSonuc {
  return {
    apartmentSize: apartmentSize ?? ORNEK_APARTMENT_SIZE,
    globalUnitPrice: globalUnitPrice ?? ORNEK_GLOBAL_UNIT_PRICE,
  };
}
