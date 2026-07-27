/**
 * İlan sahibinin beyan ettiği alan ile TKGM'deki resmi alanı karşılaştırır.
 * Fark hükme değil şeffaflığa çevrilir: hisseli tapuda fark meşrudur.
 */

export type AreaComparisonStatus = 'match' | 'minor' | 'mismatch' | 'unknown'

export type AreaComparison = {
    status: AreaComparisonStatus
    diffPct: number | null
}

const UNKNOWN: AreaComparison = { status: 'unknown', diffPct: null }

export function compareArea(
    declaredSqm: number | null | undefined,
    officialSqm: number | null | undefined,
): AreaComparison {
    if (declaredSqm == null || officialSqm == null) return UNKNOWN
    if (!Number.isFinite(declaredSqm) || !Number.isFinite(officialSqm)) return UNKNOWN
    if (officialSqm === 0) return UNKNOWN

    const diffPct = (Math.abs(declaredSqm - officialSqm) / officialSqm) * 100

    if (diffPct < 1) return { status: 'match', diffPct }
    if (diffPct < 5) return { status: 'minor', diffPct }
    return { status: 'mismatch', diffPct }
}
