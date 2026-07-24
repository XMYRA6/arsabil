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
