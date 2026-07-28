import { measureRisk } from './lookup'

export type RiskSnapshot = {
    faultDistanceM: number | null
    floodQ100: boolean | null
    riskSnapshotAt: Date | null
}

const EMPTY: RiskSnapshot = { faultDistanceM: null, floodQ100: null, riskSnapshotAt: null }

/**
 * Risk snapshot'ını YALNIZCA sunucu üretir. İstemcinin gövdede gönderdiği risk
 * alanları asla kullanılmaz — aksi halde "faya 12 km" gibi bir değer taklit
 * edilebilir hale gelir. `parcelSnapshot.ts` ile aynı güvenlik gerekçesi.
 */
export async function buildRiskSnapshot(
    lat: number | null,
    lng: number | null,
): Promise<RiskSnapshot> {
    if (lat == null || lng == null) return { ...EMPTY }

    const risk = await measureRisk(lat, lng)
    if (!risk) return { ...EMPTY }

    return {
        faultDistanceM: risk.faultDistanceM,
        floodQ100: risk.floodQ100,
        riskSnapshotAt: new Date(),
    }
}
