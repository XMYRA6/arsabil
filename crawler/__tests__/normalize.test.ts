import { normalizeRaw, parseTrNumber, parseTrArea, mapListingType, cleanTrName, parseTrDate } from '../pipeline/normalize'
import type { RawListing } from '../adapters/types'

describe('parseTrNumber', () => {
  it('binlik ayraçlı fiyatı sayıya çevirir', () => {
    expect(parseTrNumber('1.250.000 TL')).toBe(1250000)
    expect(parseTrNumber('130.000.000 ₺')).toBe(130000000)
    expect(parseTrNumber('7.039')).toBe(7039)
  })
  it('geçersizde null', () => {
    expect(parseTrNumber('Fiyat sorunuz')).toBeNull()
    expect(parseTrNumber('')).toBeNull()
  })
})

describe('parseTrArea', () => {
  it('m² alanını sayıya çevirir', () => {
    expect(parseTrArea('2.430 m²')).toBe(2430)
    expect(parseTrArea('494 m2')).toBe(494)
    expect(parseTrArea('1.396,95 m²')).toBeCloseTo(1396.95)
  })
})

describe('mapListingType', () => {
  it('portal metnini enum + imar durumuna eşler', () => {
    expect(mapListingType('Konut İmarlı Arsa', 'İmarlı')).toEqual({ listingType: 'arsa', imarStatus: 'imarli' })
    expect(mapListingType('Tarla')).toEqual({ listingType: 'tarla', imarStatus: 'imarsiz' })
    expect(mapListingType('Zeytinlik')).toEqual({ listingType: 'zeytinlik', imarStatus: 'imarsiz' })
    // I6: /\bbağ\b/ koşulsuz false idi — artık /bağ/ ile 'bag' erişilebilir
    expect(mapListingType('Bağ')).toEqual({ listingType: 'bag', imarStatus: 'imarsiz' })
    // regresyon: 'bahçe' hâlâ bahce'ye eşlenmeli ('bağ' kuralına takılmamalı)
    expect(mapListingType('Satılık Bahçe')).toEqual({ listingType: 'bahce', imarStatus: 'imarsiz' })
    expect(mapListingType('Satılık Daire')).toEqual({ listingType: 'konut', imarStatus: 'bilinmiyor' })
    expect(mapListingType('Bilinmeyen Şey')).toEqual({ listingType: 'diger', imarStatus: 'bilinmiyor' })
  })
})

describe('cleanTrName', () => {
  it('mahalle/köy soneklerini ve fazla boşluğu temizler, tr-uppercase yapar', () => {
    expect(cleanTrName('  Denizli   Mah. ')).toBe('DENİZLİ')
    expect(cleanTrName('Uzunkuyu Köyü')).toBe('UZUNKUYU')
    expect(cleanTrName('ORTAHISAR')).toBe('ORTAHISAR')
    expect(cleanTrName(undefined)).toBeNull()
    // M2: ALL-CAPS 'MAHALLESİ' — /mahallesi/i eşleşmiyordu ('İ'.toLowerCase() ≠ 'i')
    expect(cleanTrName('PELİTLİ MAHALLESİ')).toBe('PELİTLİ')
  })
})

describe('parseTrDate', () => {
  it('yaygın tr tarih biçimlerini Date yapar', () => {
    expect(parseTrDate('2025-03-23')?.toISOString().slice(0, 10)).toBe('2025-03-23')
    expect(parseTrDate('23.03.2025')?.toISOString().slice(0, 10)).toBe('2025-03-23')
    expect(parseTrDate('bilinmiyor')).toBeNull()
  })
})

describe('normalizeRaw', () => {
  const base: RawListing = {
    source: 'sahibinden',
    sourceListingId: '123',
    sourceUrl: 'https://www.sahibinden.com/ilan/123',
    rawTitle: 'Satılık İmarlı Arsa',
    rawPrice: '25.000.000 TL',
    rawArea: '494 m²',
    rawType: 'Konut İmarlı Arsa',
    rawImarStatus: 'İmarlı',
    rawIl: 'İzmir',
    rawIlce: 'Urla',
    rawMahalle: 'Denizli Mah.',
    rawListedAt: '17.06.2025',
    photoUrls: ['https://img/1.jpg'],
    extra: { foo: 'bar' },
  }

  it('tam kayıt normalize edilir, ₺/m² hesaplanır', () => {
    const n = normalizeRaw(base)
    expect(n.price).toBe(25000000)
    expect(n.areaSqm).toBe(494)
    expect(n.pricePerSqm).toBeCloseTo(25000000 / 494)
    expect(n.listingType).toBe('arsa')
    expect(n.imarStatus).toBe('imarli')
    expect(n.il).toBe('İZMİR')
    expect(n.ilce).toBe('URLA')
    expect(n.mahalle).toBe('DENİZLİ')
    expect(n.listedAt?.toISOString().slice(0, 10)).toBe('2025-06-17')
    expect(n.rawJson).toEqual(expect.objectContaining({ foo: 'bar' }))
    expect(n.notes).toEqual([])
  })

  it('eksik fiyat/alanda null + not, ₺/m² hesaplanmaz', () => {
    const n = normalizeRaw({ ...base, rawPrice: 'Fiyat sorunuz', rawArea: undefined })
    expect(n.price).toBeNull()
    expect(n.areaSqm).toBeNull()
    expect(n.pricePerSqm).toBeNull()
    expect(n.notes.length).toBeGreaterThan(0)
  })

  it('sayfada lat/lng varsa taşınır', () => {
    const n = normalizeRaw({ ...base, lat: 38.32, lng: 26.76 })
    expect(n.lat).toBe(38.32)
    expect(n.lng).toBe(26.76)
  })
})
