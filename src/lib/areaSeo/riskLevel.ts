// SEO mahalle sayfalarındaki ham risk sayılarını (fay mesafesi, Q100) yorumlanmış
// bir seviyeye çevirir — Impeccable critique P1 (2026-09-17): "1.2 km" gibi bir
// sayı, inşaat profesyoneli olmayan bir arsa sahibi için "iyi mi kötü mü"
// sorusunu yanıtsız bırakıyordu.
//
// Eşikler UYDURMA DEĞİL: TBDY 2018 yakın fay katsayısı γF'nin kendi sınırları
// (bkz. src/lib/risk/coefficient.ts) — ≤15km deprem tasarım talebini en üst
// düzeyde artırır (γF=1.2), 15-25km kademeli azalır, >25km etkisi yok (γF=1.0).

export type RiskLevel = 'high' | 'medium' | 'low'

export const RISK_LEVEL_LABEL: Record<RiskLevel, string> = {
    high: 'Yüksek',
    medium: 'Orta',
    low: 'Düşük',
}

export function faultRiskLevel(faultDistanceM: number | null): RiskLevel | null {
    if (faultDistanceM == null) return null
    const km = faultDistanceM / 1000
    if (km <= 15) return 'high'
    if (km <= 25) return 'medium'
    return 'low'
}

export function floodRiskLevel(floodQ100: boolean | null): RiskLevel | null {
    if (floodQ100 == null) return null
    return floodQ100 ? 'high' : 'low'
}
