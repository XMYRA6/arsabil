export type PortalSource = 'sahibinden' | 'emlakjet' | 'hepsiemlak'
export type ListingCategory = 'arsa' | 'konut'

export type ListingType =
  | 'arsa' | 'tarla' | 'bag' | 'bahce' | 'zeytinlik'
  | 'konut' | 'ticari' | 'arazi' | 'diger'

export type ImarStatus = 'imarli' | 'imarsiz' | 'bilinmiyor'
export type GeoPrecision = 'exact' | 'neighborhood' | 'none'

/** Arama sonuç sayfasından çıkan minimum bilgi. */
export interface ListingStub {
  sourceListingId: string
  detailUrl: string
  rawPrice?: string
  rawArea?: string
  rawTitle?: string
}

/** Detay sayfasından çıkan ham (normalize edilmemiş) kayıt. */
export interface RawListing {
  source: PortalSource
  sourceListingId: string
  sourceUrl: string
  rawTitle?: string
  rawDescription?: string
  rawPrice?: string
  rawArea?: string
  rawType?: string
  rawImarStatus?: string
  rawIl?: string
  rawIlce?: string
  rawMahalle?: string
  rawAdaNo?: string
  rawParselNo?: string
  rawListedAt?: string
  lat?: number
  lng?: number
  /** Emlakjet: mahalle sınır poligonu (GeoJSON MultiPolygon, [lng,lat]). Hassas ilan koordinatı yok. */
  neighborhoodGeojson?: unknown
  /** Emlakjet: mahalle deprem risk skoru (0..1). */
  neighborhoodRiskScore?: number
  photoUrls: string[]
  extra: Record<string, unknown>
}

/** normalize sonrası, DB'ye yazılmaya hazır (geocode hariç). */
export interface NormalizedListing {
  source: PortalSource
  sourceListingId: string
  sourceUrl: string
  title: string | null
  description: string | null
  price: number | null
  currency: 'TRY'
  areaSqm: number | null
  pricePerSqm: number | null
  listingType: ListingType
  imarStatus: ImarStatus
  il: string | null
  ilce: string | null
  mahalle: string | null
  adaNo: string | null
  parselNo: string | null
  lat: number | null
  lng: number | null
  photoUrls: string[]
  listedAt: Date | null
  rawJson: Record<string, unknown>
  notes: string[]
}

export interface GeoResult {
  lat: number | null
  lng: number | null
  geoPrecision: GeoPrecision
}

export interface PortalAdapter {
  source: PortalSource
  /** blockDetector'a verilecek "arama sonucu var" göstergesi — sayfa HTML'inde bu ham metin/sınıf parçası bulunmalı (örn. 'searchResultsItem'). */
  searchResultHint: string
  /** blockDetector'a verilecek "detay sayfası yüklendi" göstergesi — detay HTML'inde bulunmalı (örn. 'classifiedDetail'). */
  detailHint: string
  searchUrls(il: string, category: ListingCategory, maxPages: number): string[]
  parseSearchPage(html: string): ListingStub[]
  parseDetailPage(html: string, url: string): RawListing
}
