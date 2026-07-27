import { compareArea } from './areaComparison'

const fmt = (n: number) => `${n.toLocaleString('tr-TR')} m²`

export function formatParcelIdentity(l: {
    adaNo?: string | null
    parselNo?: string | null
    neighborhood?: string | null
}): string | null {
    if (!l.parselNo) return null
    const parts = [`Ada ${l.adaNo ?? '—'}`, `Parsel ${l.parselNo}`]
    if (l.neighborhood) parts.push(l.neighborhood)
    return parts.join(' · ')
}

export function formatAreaCells(l: {
    landSizeSqm?: number | null
    parcelAreaSqm?: number | null
}): { declared: string; official: string | null; warning: string | null } {
    const declared = l.landSizeSqm != null ? fmt(l.landSizeSqm) : '—'
    const official = l.parcelAreaSqm != null ? fmt(l.parcelAreaSqm) : null

    const cmp = compareArea(l.landSizeSqm ?? null, l.parcelAreaSqm ?? null)
    const warning = cmp.status === 'mismatch' && cmp.diffPct !== null
        ? `Beyan ile tapu kaydı arasında %${cmp.diffPct.toFixed(1).replace('.', ',')} fark var. Hisseli tapuda bu normal olabilir.`
        : null

    return { declared, official, warning }
}
