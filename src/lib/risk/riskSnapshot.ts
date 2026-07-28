import { measureRisk } from './lookup'
import { isWithinTurkey } from '@/lib/geo/turkeyBounds'

export type RiskSnapshot = {
    faultDistanceM: number | null
    floodQ100: boolean | null
    riskSnapshotAt: Date | null
}

const EMPTY: RiskSnapshot = { faultDistanceM: null, floodQ100: null, riskSnapshotAt: null }

/**
 * `measureRisk` en kötü durumda üç ardışık WMS çağrısı yapabilir (ince fay
 * karosu → kaba fay karosu → taşkın karosu), her biri kendi 8 s zaman aşımına
 * sahip — yani teorik üst sınır ~24 s. Risk verisi opsiyonel olduğu için
 * ilan kaydı bunun için bu kadar bekleyemez: ölçüm bu bütçe içinde bitmezse
 * boş snapshot'la devam edilir, kayıt engellenmez.
 */
const SNAPSHOT_DEADLINE_MS = 6000

/**
 * Risk snapshot'ını YALNIZCA sunucu üretir. İstemcinin gövdede gönderdiği risk
 * alanları asla kullanılmaz — aksi halde "faya 12 km" gibi bir değer taklit
 * edilebilir hale gelir. `parcelSnapshot.ts` ile aynı güvenlik gerekçesi.
 */
export async function buildRiskSnapshot(
    lat: number | null,
    lng: number | null,
): Promise<RiskSnapshot> {
    // TR sinirlari disi koordinat TUCBS'e HIC gonderilmez (bkz. parcelSnapshot).
    if (lat == null || lng == null || !isWithinTurkey(lat, lng)) return { ...EMPTY }

    let timer: ReturnType<typeof setTimeout>
    const deadline = new Promise<RiskSnapshot>(resolve => {
        timer = setTimeout(() => resolve({ ...EMPTY }), SNAPSHOT_DEADLINE_MS)
    })

    const measurement = measureRisk(lat, lng).then(risk => {
        if (!risk) return { ...EMPTY }
        return {
            faultDistanceM: risk.faultDistanceM,
            floodQ100: risk.floodQ100,
            riskSnapshotAt: new Date(),
        }
    })

    try {
        return await Promise.race([measurement, deadline])
    } finally {
        clearTimeout(timer!)
    }
}
