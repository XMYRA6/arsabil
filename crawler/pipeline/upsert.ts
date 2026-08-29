import type { NormalizedListing, GeoResult, PortalSource, ListingType } from '../adapters/types'

export interface UpsertableRecord {
  normalized: NormalizedListing
  geo: GeoResult
}

export interface UpsertClient {
  marketListing: {
    findUnique(args: { where: { source_sourceListingId: { source: string; sourceListingId: string } } }): Promise<any | null>
    create(args: { data: any }): Promise<{ id: string }>
    update(args: { where: { id: string }; data: any }): Promise<any>
    findMany(args: { where: any }): Promise<Array<{ id: string }>>
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
    rawJson: n.rawJson as any,
  }
}

export async function upsertListing(
  client: UpsertClient,
  rec: UpsertableRecord,
): Promise<{ id: string; created: boolean; priceChanged: boolean }> {
  const n = rec.normalized
  const existing = await client.marketListing.findUnique({
    where: { source_sourceListingId: { source: n.source, sourceListingId: n.sourceListingId } },
  })
  const data = toData(rec)

  if (!existing) {
    const created = await client.marketListing.create({ data })
    return { id: created.id, created: true, priceChanged: false }
  }

  const priceChanged = n.price !== null && existing.price !== n.price
  await client.marketListing.update({
    where: { id: existing.id },
    data: { ...data, lastSeenAt: new Date(), status: 'active' },
  })
  if (priceChanged) {
    await client.marketListingPricePoint.create({ data: { listingId: existing.id, price: n.price! } })
  }
  return { id: existing.id, created: false, priceChanged }
}

export async function markDelistedExcept(
  client: UpsertClient,
  scope: { source: PortalSource; il: string; listingTypes: ListingType[] },
  seenIds: string[],
): Promise<number> {
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
  for (const [dupId, canonicalId] of links) {
    await client.marketListing.update({ where: { id: dupId }, data: { dupeOfId: canonicalId } })
  }
}
