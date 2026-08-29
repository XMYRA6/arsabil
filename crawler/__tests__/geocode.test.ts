import { geocodeListing, type GeocodeDeps } from '../pipeline/geocode'
import type { NormalizedListing } from '../adapters/types'

const base: NormalizedListing = {
  source: 'sahibinden', sourceListingId: '1', sourceUrl: 'u', title: null, description: null,
  price: null, currency: 'TRY', areaSqm: null, pricePerSqm: null, listingType: 'arsa',
  imarStatus: 'bilinmiyor', il: 'İZMİR', ilce: 'URLA', mahalle: 'DENİZLİ',
  adaNo: null, parselNo: null, lat: null, lng: null, photoUrls: [], listedAt: null,
  rawJson: {}, notes: [],
}

const deps: GeocodeDeps = {
  resolveMahalleCentroid: async (il, ilce, mah) =>
    il === 'İZMİR' && ilce === 'URLA' && mah === 'DENİZLİ' ? { lat: 38.32, lng: 26.76 } : null,
  isWithinTurkey: (lat, lng) => lat > 35 && lat < 43 && lng > 25 && lng < 45,
}

describe('geocodeListing', () => {
  it('sayfadan gelen lat/lng varsa exact', async () => {
    const r = await geocodeListing({ ...base, lat: 38.30, lng: 26.75 }, deps)
    expect(r).toEqual({ lat: 38.30, lng: 26.75, geoPrecision: 'exact' })
  })

  it('lat/lng yok ama Türkiye dışıysa yok sayılır, mahalle centroid denenir', async () => {
    const r = await geocodeListing({ ...base, lat: 0, lng: 0 }, deps)
    expect(r).toEqual({ lat: 38.32, lng: 26.76, geoPrecision: 'neighborhood' })
  })

  it('pin yok → mahalle centroid → neighborhood', async () => {
    const r = await geocodeListing(base, deps)
    expect(r).toEqual({ lat: 38.32, lng: 26.76, geoPrecision: 'neighborhood' })
  })

  it('centroid de bulunamazsa none', async () => {
    const r = await geocodeListing({ ...base, mahalle: 'YOK' }, deps)
    expect(r).toEqual({ lat: null, lng: null, geoPrecision: 'none' })
  })

  it('il/ilçe/mahalle eksikse none', async () => {
    const r = await geocodeListing({ ...base, mahalle: null }, deps)
    expect(r).toEqual({ lat: null, lng: null, geoPrecision: 'none' })
  })
})
