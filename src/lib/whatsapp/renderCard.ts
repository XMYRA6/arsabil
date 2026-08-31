import type { DegerCardDTO } from '@/lib/deger/card'
import { formatTl, formatTlShort } from './formatTl'

function riskLine(risk: DegerCardDTO['risk']): string | null {
  if (risk.status === 'unavailable') return null
  const fault =
    risk.faultDistanceM == null
      ? 'diri fay verisi yok'
      : `diri faya ~${(risk.faultDistanceM / 1000).toFixed(1).replace('.', ',')} km`
  const flood =
    risk.floodQ100 == null ? null : `Taşkın (Q100): ${risk.floodQ100 ? 'risk var' : 'risk yok'}`
  return `⚠️ Deprem: ${fault}${flood ? ' · ' + flood : ''}`
}

export function renderCard(dto: DegerCardDTO, siteUrl: string): string {
  const p = dto.parcel
  const v = dto.value
  const lines: string[] = []
  lines.push(`*${p.mahalle} Mah., ${p.ilce} / ${p.il}*`)
  lines.push(`Ada/Parsel: ${p.ada}/${p.parsel} · ${formatTl(p.areaSqm)} m²`)
  lines.push('')

  const rangeBroken =
    v.freeRangeLow == null ||
    v.freeRangeHigh == null ||
    Number.isNaN(v.freeRangeLow) ||
    Number.isNaN(v.freeRangeHigh)
  if (v.insufficientData || rangeBroken) {
    lines.push('Bu bölgede yeterli ilan verisi yok — risk ve parsel bilgisi yine de aşağıda.')
  } else {
    const suffix = v.thinData ? ' _(sınırlı veri)_' : ''
    lines.push(`💰 Tahmini değer: *${formatTlShort(v.freeRangeLow!)} – ${formatTlShort(v.freeRangeHigh!)} ₺*${suffix}`)
    if (v.pricePerSqmCoarse != null) {
      lines.push(`📍 ~${formatTl(v.pricePerSqmCoarse)} ₺/m² (${v.basis ?? 'bölge'} geneli)`)
    }
  }

  const rl = riskLine(dto.risk)
  if (rl) lines.push(rl)
  lines.push(`📊 Yakın emsal ilan: ${dto.comparables.count}`)
  lines.push('')
  lines.push('Detaylı kart, net değer tahmini ve kat karşılığı fizibilitesi için:')
  lines.push(siteUrl)
  lines.push('')
  return lines.join('\n')
}
