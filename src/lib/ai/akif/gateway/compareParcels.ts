// Akif — 2–4 arsayı yan yana kıyaslar. Her parsel lookupParcel ile çözülür;
// ücretsiz katmanda üye alanları (estimate/pricePerSqm/confidence/öneri) deps ne
// döndürürse döndürsün HİÇ yazılmaz.

import { lookupParcel, type LookupParcelArgs, type LookupParcelDeps } from './lookupParcel'
import { recommendParcels } from './recommend'
import type { ParcelCard, ParcelCompareCard,ParcelCompareRow } from '../contract'

export interface CompareParcelsArgs {
  parcels: LookupParcelArgs[]
}

export async function compareParcels(
  args: CompareParcelsArgs,
  deps: LookupParcelDeps,
  opts: { memberView: boolean },
): Promise<ParcelCompareCard> {
  const member = opts.memberView
  const cards: ParcelCard[] = await Promise.all(
    args.parcels.map(async (p): Promise<ParcelCard> => {
      try {
        return await lookupParcel(p, deps)
      } catch (err) {
        console.error(
          `compareParcels: lookup failed for "${p.mahalleText} ${p.ada}/${p.parsel}"`,
          err instanceof Error ? err.name : 'error',
        )
        return { kind: 'parcel', status: 'parcel_unavailable' }
      }
    }),
  )

  const rows: ParcelCompareRow[] = cards.map((c, i) => {
    const a = args.parcels[i]
    if (c.status !== 'resolved' || !c.dto) {
      const row: ParcelCompareRow = { label: `${a.mahalleText} ${a.ada}/${a.parsel}`, status: c.status }
      if (c.status === 'ambiguous' && c.candidates) row.candidates = c.candidates
      return row
    }
    const { parcel, value } = c.dto
    const row: ParcelCompareRow = {
      label: `${parcel.mahalle} ${parcel.ada}/${parcel.parsel}`,
      status: 'resolved',
      areaSqm: parcel.areaSqm,
      basis: value.basis,
      thinData: value.thinData,
      siteUrl: c.siteUrl,
    }
    if (member) {
      row.rangeLow = value.memberRangeLow
      row.rangeHigh = value.memberRangeHigh
      row.confidence = value.confidence
      if (typeof value.estimate === 'number') {
        row.estimate = value.estimate
        if (parcel.areaSqm > 0) row.pricePerSqm = value.estimate / parcel.areaSqm
      }
    } else {
      delete row.thinData
      row.rangeLow = value.freeRangeLow
      row.rangeHigh = value.freeRangeHigh
    }
    return row
  })

  const card: ParcelCompareCard = { kind: 'parcel_compare', tier: member ? 'member' : 'free', rows }
  if (!member) {
    card.upgradeHint = true
    return card
  }
  if (rows.filter((r) => r.status === 'resolved').length >= 2) {
    const { recommendation, note } = recommendParcels(rows)
    if (recommendation) card.recommendation = recommendation
    if (note) card.note = note
  }
  return card
}
