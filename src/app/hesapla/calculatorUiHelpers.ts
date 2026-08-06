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

export function clampOwnerApartmentShare(ownerApartmentShare: number, totalApartments: number): number {
  if (totalApartments <= 0) return 0;
  return Math.min(Math.max(ownerApartmentShare, 0), totalApartments);
}

export function parseMarketPrice(raw: string): number {
  return parseInt(raw.replace(/\D/g, '') || '0', 10);
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
