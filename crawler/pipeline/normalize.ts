import type { RawListing, NormalizedListing, ListingType, ImarStatus } from '../adapters/types'

export function parseTrNumber(s?: string | null): number | null {
  if (!s) return null
  const cleaned = s.replace(/[^\d.,]/g, '')
  if (!cleaned) return null
  // tr biçimi: '.' binlik, ',' ondalık
  const normalized = cleaned.replace(/\./g, '').replace(',', '.')
  const n = Number(normalized)
  return Number.isFinite(n) && n > 0 ? n : null
}

export function parseTrArea(s?: string | null): number | null {
  if (!s) return null
  const m = s.match(/([\d.,]+)\s*m/i)
  return m ? parseTrNumber(m[1]) : parseTrNumber(s)
}

const TYPE_RULES: Array<{ re: RegExp; type: ListingType }> = [
  { re: /zeytin/i, type: 'zeytinlik' },
  // `\b` ğ'den sonra sözcük sınırı üretmez → `/\bbağ\b/` KOŞULSUZ false idi (I6).
  // Ama düz `/bağ/` çok geniş: 'bağımsız', 'bağlantı', 'bağlı' de yakalar ve bu
  // kural 'ticari'/'konut'un üstünde → "Bağımsız Bölüm" yanlışlıkla 'bag' olurdu
  // (G4). Sözcük-başı + tanınan sonekler ('bağ', 'bağlık', 'bağı' vb.).
  { re: /(^|\s)bağ($|\s|lık|,|\.)/, type: 'bag' },
  { re: /bahçe/i, type: 'bahce' },
  { re: /tarla/i, type: 'tarla' },
  { re: /ticari|dükkan|işyeri|mağaza|ofis/i, type: 'ticari' },
  { re: /arsa/i, type: 'arsa' },
  { re: /arazi|ham toprak|fundalık|kayalık/i, type: 'arazi' },
  { re: /daire|konut|villa|müstakil|rezidans|yazlık/i, type: 'konut' },
]

export function mapListingType(rawType?: string, rawImar?: string): { listingType: ListingType; imarStatus: ImarStatus } {
  const t = (rawType ?? '').toLocaleLowerCase('tr-TR')
  const listingType = TYPE_RULES.find((r) => r.re.test(t))?.type ?? 'diger'

  let imarStatus: ImarStatus = 'bilinmiyor'
  const imarText = `${(rawImar ?? '').toLocaleLowerCase('tr-TR')} ${t}`
  if (/[ıi]mars[ıi]z|arazi vasf[ıi]/.test(imarText)) imarStatus = 'imarsiz'
  else if (/[ıi]marl[ıi]/.test(imarText)) imarStatus = 'imarli'
  else if (['tarla', 'bag', 'bahce', 'zeytinlik', 'arazi'].includes(listingType)) imarStatus = 'imarsiz'

  return { listingType, imarStatus }
}

const NAME_SUFFIXES = /\s*(mah(\.|allesi)?|köyü|belde(si)?)\s*$/i

export function cleanTrName(s?: string | null): string | null {
  if (!s) return null
  // Önce tr-TR küçük harf: `/mahallesi/i` ALL-CAPS 'MAHALLESİ' ile eşleşmez
  // ('İ'.toLowerCase() = 'i̇' ≠ 'i') — aynı İ defekt sınıfı (M2).
  const lowered = s.toLocaleLowerCase('tr-TR')
  const trimmed = lowered.replace(NAME_SUFFIXES, '').replace(/\s+/g, ' ').trim()
  if (!trimmed) return null
  return trimmed.toLocaleUpperCase('tr-TR')
}

export function parseTrDate(s?: string | null): Date | null {
  if (!s) return null
  let m = s.match(/(\d{4})-(\d{2})-(\d{2})/)
  if (m) return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]))
  m = s.match(/(\d{1,2})[./](\d{1,2})[./](\d{4})/)
  if (m) return new Date(Date.UTC(+m[3], +m[2] - 1, +m[1]))
  return null
}

export function normalizeRaw(raw: RawListing): NormalizedListing {
  const notes: string[] = []
  const price = parseTrNumber(raw.rawPrice)
  if (price === null) notes.push('fiyat parse edilemedi')
  const areaSqm = parseTrArea(raw.rawArea)
  if (areaSqm === null) notes.push('alan parse edilemedi')
  const pricePerSqm = price !== null && areaSqm !== null && areaSqm > 0 ? price / areaSqm : null

  const { listingType, imarStatus } = mapListingType(raw.rawType, raw.rawImarStatus)

  return {
    source: raw.source,
    sourceListingId: raw.sourceListingId,
    sourceUrl: raw.sourceUrl,
    title: raw.rawTitle?.trim() ?? null,
    description: raw.rawDescription?.trim() ?? null,
    price,
    currency: 'TRY',
    areaSqm,
    pricePerSqm,
    listingType,
    imarStatus,
    il: cleanTrName(raw.rawIl),
    ilce: cleanTrName(raw.rawIlce),
    mahalle: cleanTrName(raw.rawMahalle),
    adaNo: raw.rawAdaNo?.trim() || null,
    parselNo: raw.rawParselNo?.trim() || null,
    lat: typeof raw.lat === 'number' ? raw.lat : null,
    lng: typeof raw.lng === 'number' ? raw.lng : null,
    photoUrls: raw.photoUrls ?? [],
    listedAt: parseTrDate(raw.rawListedAt),
    rawJson: { ...raw.extra, _raw: { price: raw.rawPrice, area: raw.rawArea, type: raw.rawType, listedAt: raw.rawListedAt } },
    notes,
  }
}
