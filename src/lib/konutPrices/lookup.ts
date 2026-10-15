import { validateRange } from '@/lib/ai/akif/numberSafety'
import { normalizeAreaName } from '@/lib/areaPrices/normalizeAreaName'

export type KonutScale = 'mahalle' | 'ilce' | 'il'

export interface KonutFiyatLookup {
  tl: number
  perSqm: number
  scale: KonutScale
  sampleCount: number
  confidence: 'yuksek' | 'orta' | 'dusuk'
  bolge: string
}

export interface KonutLookupDb {
  konutFiyatStat: {
    findMany(args: unknown): Promise<Array<{ scope: string; medianPricePerSqm: number; sampleCount: number }>>
  }
}

export async function lookupKonutFiyat(
  db: KonutLookupDb,
  a: { il: string; ilce: string; mahalle: string; daireM2: number },
): Promise<KonutFiyatLookup | null> {
  if (!Number.isFinite(a.daireM2) || !validateRange('daire', a.daireM2)) return null
  const il = normalizeAreaName(a.il)
  const ilce = normalizeAreaName(a.ilce)
  const mahalle = normalizeAreaName(a.mahalle)
  const rows = await db.konutFiyatStat.findMany({
    where: { il, OR: [{ ilce: '', mahalle: '' }, { ilce, mahalle: '' }, { ilce, mahalle }] },
  })
  const by = (scope: string) => rows.find((r) => r.scope === scope && Number.isFinite(r.medianPricePerSqm) && r.medianPricePerSqm > 0)
  const m = by('mahalle')
  const i = by('ilce')
  const l = by('il')

  let pick: { row: NonNullable<typeof m>; scale: KonutScale; confidence: KonutFiyatLookup['confidence']; bolge: string } | null = null
  if (m && m.sampleCount >= 8) pick = { row: m, scale: 'mahalle', confidence: 'yuksek', bolge: `${il}/${ilce}/${mahalle}` }
  else if (i && i.sampleCount >= 5) pick = { row: i, scale: 'ilce', confidence: 'orta', bolge: `${il}/${ilce}` }
  else if (l) pick = { row: l, scale: 'il', confidence: 'dusuk', bolge: il }
  if (!pick) return null

  const perSqm = Math.round(pick.row.medianPricePerSqm)
  return {
    tl: Math.round((pick.row.medianPricePerSqm * a.daireM2) / 100) * 100,
    perSqm,
    scale: pick.scale,
    sampleCount: pick.row.sampleCount,
    confidence: pick.confidence,
    bolge: pick.bolge,
  }
}
