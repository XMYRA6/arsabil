import { normalizeAreaName } from '@/lib/areaPrices/normalizeAreaName'

export interface RawAreaName {
  il: string
  ilce: string | null
  mahalle: string | null
}

export interface AreaNameKey {
  il: string
  ilce: string | null
  mahalle: string | null
}

export interface ResolveDisplayNamesDeps {
  listDistinctMarketAreas: () => Promise<RawAreaName[]>
}

/** tr-TR locale-aware başlık-case. "DURUBİNAR" -> "Durubinar" (İ/I ayrımı korunur). */
export function toTitleCase(s: string): string {
  return s
    .toLocaleLowerCase('tr-TR')
    .split(' ')
    .map((w) => (w.length === 0 ? w : w[0].toLocaleUpperCase('tr-TR') + w.slice(1)))
    .join(' ')
}

export function areaLookupKey(il: string, ilce: string | null, mahalle: string | null): string {
  return `${il}|${ilce ?? ''}|${mahalle ?? ''}`
}

/**
 * `AreaPriceStat` vb. tablolar `normalizeAreaName` (ASCII-katlanmış) anahtar
 * kullanıyor — gösterime uygun değil. `MarketListing` ise `cleanTrName` ile
 * doğru Türkçe BÜYÜK harf saklıyor (İ/I ayrımı korunur). Bu fonksiyon
 * normalize edilmiş anahtarları, `MarketListing`'in ham (distinct) satırlarından
 * kurduğu üç seviyeli bir indeksle (il / il+ilçe / il+ilçe+mahalle) eşleştirip
 * başlık-case display adı üretir. Eşleşen ham satır yoksa normalize anahtarın
 * kendisinden title-case üretir (fallback — İ/I ayrımı bu durumda kaybolmuş
 * olabilir, kabul edilen kozmetik risk, spec'te not düşüldü).
 */
export async function resolveDisplayNames(
  keys: AreaNameKey[],
  deps: ResolveDisplayNamesDeps,
): Promise<Map<string, RawAreaName>> {
  const raws = await deps.listDistinctMarketAreas()

  const ilIndex = new Map<string, RawAreaName>()
  const ilceIndex = new Map<string, RawAreaName>()
  const mahalleIndex = new Map<string, RawAreaName>()

  for (const r of raws) {
    if (!r.il) continue
    const ilK = normalizeAreaName(r.il)
    if (!ilIndex.has(ilK)) ilIndex.set(ilK, r)
    if (r.ilce) {
      const ilceK = `${ilK}|${normalizeAreaName(r.ilce)}`
      if (!ilceIndex.has(ilceK)) ilceIndex.set(ilceK, r)
      if (r.mahalle) {
        const mahalleK = `${ilceK}|${normalizeAreaName(r.mahalle)}`
        if (!mahalleIndex.has(mahalleK)) mahalleIndex.set(mahalleK, r)
      }
    }
  }

  const out = new Map<string, RawAreaName>()
  for (const key of keys) {
    const ilK = normalizeAreaName(key.il)
    const ilceK = key.ilce != null ? normalizeAreaName(key.ilce) : null
    const mahalleK = key.mahalle != null ? normalizeAreaName(key.mahalle) : null

    const ilRaw = ilIndex.get(ilK)
    const ilceRaw = ilceK != null ? ilceIndex.get(`${ilK}|${ilceK}`) : undefined
    const mahalleRaw =
      mahalleK != null && ilceK != null ? mahalleIndex.get(`${ilK}|${ilceK}|${mahalleK}`) : undefined

    const ilSource = ilRaw?.il ?? key.il
    const ilceSource = key.ilce == null ? null : ilceRaw?.ilce ?? mahalleRaw?.ilce ?? key.ilce
    const mahalleSource = key.mahalle == null ? null : mahalleRaw?.mahalle ?? key.mahalle

    out.set(areaLookupKey(key.il, key.ilce, key.mahalle), {
      il: toTitleCase(ilSource),
      ilce: ilceSource == null ? null : toTitleCase(ilceSource),
      mahalle: mahalleSource == null ? null : toTitleCase(mahalleSource),
    })
  }
  return out
}
