/**
 * TBDY 2018 yakın fay katsayısı γF (DD-1 / DD-2 düzeyleri):
 *   LF ≤ 15 km      → 1,2
 *   15 < LF ≤ 25 km → 1,2 − 0,02·(LF − 15)
 *   LF > 25 km      → 1,0
 * `S_D1 = S1 · γF · F1` ile 1 sn periyot spektral ivmesine uygulanır.
 *
 * DİKKAT: γF deprem TASARIM TALEBİNİ ölçekler, inşaat maliyetini değil.
 * Maliyete çevrimi `suggestedR` yapar ve bu bir VARSAYIMDIR (aşağıya bkz.).
 */
export function gammaF(faultDistanceM: number | null): number {
    if (faultDistanceM === null) return 1.0
    const lfKm = faultDistanceM / 1000
    if (lfKm <= 15) return 1.2
    if (lfKm <= 25) return 1.2 - 0.02 * (lfKm - 15)
    return 1.0
}

/**
 * VARSAYIM, yönetmelik hükmü DEĞİL: tasarım talebindeki artışın maliyete
 * yansımasının yarı oranında olduğu kabul edilir. Ürün bu sayıyı "tahmini"
 * etiketiyle gösterir ve kullanıcı reddedebilir.
 */
export const R_FROM_GAMMA_FACTOR = 0.5

/** VARSAYIM: taşkın bölgesinde drenaj/temel önlemi payı. */
export const FLOOD_R_INCREMENT = 0.03

export function suggestedR(gamma: number, inFloodZone: boolean): number {
    const base = 1 + (gamma - 1) * R_FROM_GAMMA_FACTOR
    const withFlood = base + (inFloodZone ? FLOOD_R_INCREMENT : 0)
    return Math.round(withFlood * 100) / 100
}
