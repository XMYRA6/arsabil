import type { NormalizedListing, GeoResult, PortalSource, ListingType } from '../adapters/types'

export interface UpsertableRecord {
  normalized: NormalizedListing
  geo: GeoResult
}

/** dedupe + delist + taze-atlama sorgularının ihtiyaç duyduğu satır şekli. */
export interface MarketListingRow {
  id: string
  source: PortalSource
  sourceListingId: string
  ilce: string | null
  mahalle: string | null
  areaSqm: number | null
  price: number | null
  listingType: ListingType
  firstSeenAt: Date | string
  lastSeenAt: Date | string
  dupeOfId?: string | null
}

export interface UpsertClient {
  marketListing: {
    findUnique(args: { where: { source_sourceListingId: { source: string; sourceListingId: string } } }): Promise<any | null>
    create(args: { data: any }): Promise<{ id: string; firstSeenAt?: Date | string }>
    update(args: { where: { id: string }; data: any }): Promise<any>
    findMany(args: { where: any }): Promise<MarketListingRow[]>
    updateMany(args: { where: any; data: any }): Promise<{ count: number }>
  }
  marketListingPricePoint: {
    create(args: { data: { listingId: string; price: number } }): Promise<any>
  }
}

function toData(rec: UpsertableRecord) {
  const n = rec.normalized
  return {
    source: n.source,
    sourceListingId: n.sourceListingId,
    sourceUrl: n.sourceUrl,
    title: n.title,
    description: n.description,
    price: n.price,
    currency: n.currency,
    areaSqm: n.areaSqm,
    pricePerSqm: n.pricePerSqm,
    listingType: n.listingType,
    imarStatus: n.imarStatus,
    il: n.il,
    ilce: n.ilce,
    mahalle: n.mahalle,
    adaNo: n.adaNo,
    parselNo: n.parselNo,
    lat: rec.geo.lat,
    lng: rec.geo.lng,
    geoPrecision: rec.geo.geoPrecision,
    photoUrls: n.photoUrls,
    listedAt: n.listedAt,
    // M5: normalize uyarıları (fiyat/alan parse edilemedi vb.) rawJson'da saklansın.
    rawJson: { ...(n.rawJson as Record<string, unknown>), _normalizeNotes: n.notes } as any,
  }
}

export async function upsertListing(
  client: UpsertClient,
  rec: UpsertableRecord,
): Promise<{ id: string; created: boolean; priceChanged: boolean; firstSeenAt: Date }> {
  const n = rec.normalized
  const existing = await client.marketListing.findUnique({
    where: { source_sourceListingId: { source: n.source, sourceListingId: n.sourceListingId } },
  })
  const data = toData(rec)

  if (!existing) {
    const created = await client.marketListing.create({ data })
    // I4: ilk görülen fiyatı taban fiyat noktası olarak kaydet.
    if (n.price !== null) {
      await client.marketListingPricePoint.create({ data: { listingId: created.id, price: n.price } })
    }
    // G3 — satırın gerçek firstSeenAt'i (dedupe yön kararı için)
    const firstSeenAt = created.firstSeenAt ? new Date(created.firstSeenAt) : new Date()
    return { id: created.id, created: true, priceChanged: false, firstSeenAt }
  }

  const priceChanged = n.price !== null && existing.price !== n.price
  // I3: kısmi/eksik re-parse'ta null'lar iyi veriyi EZMESİN — UPDATE dalında
  // null alanları at; lastSeenAt + status her zaman yazılır.
  const updateData: Record<string, unknown> = { lastSeenAt: new Date(), status: 'active' }
  for (const [k, v] of Object.entries(data)) {
    if (v !== null) updateData[k] = v
  }
  await client.marketListing.update({
    where: { id: existing.id },
    data: updateData,
  })
  if (priceChanged) {
    await client.marketListingPricePoint.create({ data: { listingId: existing.id, price: n.price! } })
  }
  const firstSeenAt = existing.firstSeenAt ? new Date(existing.firstSeenAt) : new Date()
  return { id: existing.id, created: false, priceChanged, firstSeenAt }
}

export async function markDelistedExcept(
  client: UpsertClient,
  scope: { source: PortalSource; il: string; listingTypes: ListingType[] },
  seenIds: string[],
): Promise<number> {
  // G2 — asla boş seenIds ile çağırma: Prisma `notIn: []` TÜM scope'u eşler →
  // kitlesel yanlış delisting. Çağıran tarafın kontrolü var ama burada da kilitle.
  if (seenIds.length === 0) return 0
  const stale = await client.marketListing.findMany({
    where: {
      source: scope.source,
      il: scope.il,
      status: 'active',
      listingType: { in: scope.listingTypes },
      id: { notIn: seenIds }, // gerçek Prisma semantiği: "turda görülmeyen scope içi active ilanlar"
    },
  })
  if (stale.length === 0) return 0
  const res = await client.marketListing.updateMany({
    where: { id: { in: stale.map((r) => r.id) } },
    data: { status: 'delisted' },
  })
  return res.count
}

export async function writeDupeLinks(client: UpsertClient, links: Map<string, string>): Promise<void> {
  if (links.size === 0) return
  // G3 — mevcut dupeOfId durumunu oku: kendine link, döngü (Y.dupeOfId===X iken
  // X.dupeOfId=Y) ve zaten linklenmiş satırın üzerine yazma engellensin.
  const ids = new Set<string>()
  for (const [d, c] of links) {
    ids.add(d)
    ids.add(c)
  }
  const rows = await client.marketListing.findMany({ where: { id: { in: [...ids] } } })
  const dupeOfById = new Map<string, string | null | undefined>()
  for (const r of rows) dupeOfById.set(r.id, r.dupeOfId ?? null)

  for (const [dupId, canonicalId] of links) {
    if (dupId === canonicalId) continue
    if (dupeOfById.get(dupId)) continue // zaten linklenmiş — dokunma
    if (dupeOfById.get(canonicalId) === dupId) continue // döngü olurdu
    await client.marketListing.update({ where: { id: dupId }, data: { dupeOfId: canonicalId } })
    dupeOfById.set(dupId, canonicalId)
  }
}
