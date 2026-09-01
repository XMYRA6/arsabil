import { fetchParcelByPoint, fetchParcelByAdaParsel } from '@/lib/tkgm/parcel'
import { buildRiskSnapshot } from '@/lib/risk/riskSnapshot'
import { normalizeAreaName } from '@/lib/areaPrices/normalizeAreaName'
import { ARSA_LISTING_TYPES } from '@/lib/areaPrices/aggregate'
import { prisma } from '@/lib/prisma'
import type { DegerCardDeps, AreaStatRecord } from '@/lib/deger/card'
import type { ComparableListing } from '@/lib/deger/comparables'

/**
 * `/api/deger/kart` (anonim dal) ile WhatsApp webhook'unun paylaştığı
 * `DegerCardDeps` çekirdeği — daha önce iki route'ta bire bir kopyalanmıştı.
 *
 * `findAreaTrend` BİLİNÇLİ OLARAK dışarıda: çağrıya özeldir —
 *  - `/api/deger/kart`: gerçek sorgu, yalnız üyeye açılır (`if (!userId) return []`)
 *  - WhatsApp botu: her zaman `[]` (bot trend göstermez)
 * Her tüketici kendi `findAreaTrend`'ini ekleyerek tam `DegerCardDeps`'i tamamlar.
 */
export function createAnonCardDeps(): Omit<DegerCardDeps, 'findAreaTrend'> {
  return {
    fetchParcelByPoint,
    fetchParcelByAdaParsel,
    buildRiskSnapshot,

    findAreaStats: async (il, ilce, mahalle): Promise<AreaStatRecord[]> => {
      const rows = await prisma.areaPriceStat.findMany({
        where: {
          il,
          OR: [
            { ilce: null, mahalle: null },
            { ilce, mahalle: null },
            { ilce, mahalle },
          ],
        },
        select: { scope: true, medianPricePerSqm: true, p25: true, p75: true, sampleCount: true },
      })
      return rows as AreaStatRecord[]
    },

    findListingsNear: async (il, ilce): Promise<ComparableListing[]> => {
      // il/ilce anahtar-uzayı uyuşmazlığı: card.ts buraya `normalizeAreaName`
      // ile katlanmış anahtar geçirir ('ORTAHISAR', noktasız I) ama crawler
      // `cleanTrName` ile `.toLocaleUpperCase('tr-TR')` yazar ('ORTAHİSAR',
      // noktalı İ). SQL eşitliği i/İ içeren her ilçede sessizce ıskalar →
      // uygulama katmanında katlanmış değere göre filtrele.
      const rows = await prisma.marketListing.findMany({
        where: {
          status: 'active',
          lat: { not: null },
          lng: { not: null },
          listingType: { in: [...ARSA_LISTING_TYPES] },
        },
        select: {
          id: true, pricePerSqm: true, areaSqm: true, price: true,
          lat: true, lng: true, geoPrecision: true, listedAt: true,
          source: true, sourceUrl: true, listingType: true,
          il: true, ilce: true,
        },
        orderBy: [{ listedAt: 'desc' }, { id: 'asc' }],
        take: 2000,
      })
      return rows.filter(
        (r) =>
          r.il != null && r.ilce != null &&
          normalizeAreaName(r.il) === il && normalizeAreaName(r.ilce) === ilce,
      ) as unknown as ComparableListing[]
    },

    findNeighborhood: async (il, ilce, mahalle) => {
      const row = await prisma.neighborhood.findUnique({
        where: { il_ilce_mahalle: { il, ilce, mahalle } },
        select: { geojson: true },
      })
      return row ? { geojson: row.geojson as unknown } : null
    },
  }
}
