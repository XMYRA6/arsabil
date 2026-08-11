import { compareArea } from './areaComparison'

const fmt = (n: number) => `${n.toLocaleString('tr-TR')} m²`

export function formatParcelIdentity(l: {
    adaNo?: string | null
    parselNo?: string | null
    neighborhood?: string | null
}): string | null {
    if (!l.parselNo) return null
    // TKGM ada numarası olmayan parseller için boş string döndürüyor
    // (canlı örnek: Kalaba/Tarla, parsel 1689). Boşsa "Ada" parçası hiç
    // yazılmaz — aksi halde sallanan bir "Ada ·" kalıyor.
    const parts: string[] = []
    if (l.adaNo) parts.push(`Ada ${l.adaNo}`)
    parts.push(`Parsel ${l.parselNo}`)
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

const ZONING_LABEL: Record<string, string> = {
    KONUT: 'Konut',
    TICARI: 'Ticari',
    KARMA: 'Karma',
    TARIM: 'Tarım',
}

export function formatZoningLabel(zoning?: string | null): string {
    if (!zoning) return '—'
    return ZONING_LABEL[zoning] ?? zoning
}
