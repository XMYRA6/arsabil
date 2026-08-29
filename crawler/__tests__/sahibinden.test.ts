import fs from 'node:fs'
import path from 'node:path'
import { sahibindenAdapter } from '../adapters/sahibinden'

const fx = (n: string) => fs.readFileSync(path.join(__dirname, '..', 'fixtures', n), 'utf8')

describe('sahibindenAdapter', () => {
  it('source ve hint alanları dolu', () => {
    expect(sahibindenAdapter.source).toBe('sahibinden')
    expect(sahibindenAdapter.searchResultHint).toBeTruthy()
    expect(sahibindenAdapter.detailHint).toBeTruthy()
  })
})

describe('sahibindenAdapter.searchUrls', () => {
  it('il + kategori + sayfa numarasıyla URL üretir', () => {
    const urls = sahibindenAdapter.searchUrls('trabzon', 'arsa', 2)
    expect(urls).toHaveLength(2)
    expect(urls[0]).toContain('trabzon')
    expect(urls[1]).toContain('trabzon')
    expect(urls[1]).not.toBe(urls[0])
    expect(urls[0]).toMatch(/satilik-arsa/)
  })

  it('konut kategorisi farklı path üretir', () => {
    const arsa = sahibindenAdapter.searchUrls('trabzon', 'arsa', 1)
    const konut = sahibindenAdapter.searchUrls('trabzon', 'konut', 1)
    expect(arsa[0]).not.toBe(konut[0])
    expect(konut[0]).toMatch(/\/satilik\/trabzon/)
  })
})

describe('sahibindenAdapter.parseSearchPage', () => {
  it('arama sonucundan ilan stub çıkarır', () => {
    const stubs = sahibindenAdapter.parseSearchPage(fx('sahibinden-konut-search.html'))
    expect(stubs.length).toBeGreaterThan(0)
    const s = stubs[0]
    expect(s.sourceListingId).toMatch(/^\d+$/)
    expect(s.detailUrl).toMatch(/^https:\/\/www\.sahibinden\.com\/ilan\//)
    const ids = new Set(stubs.map((x: { sourceListingId: string }) => x.sourceListingId))
    expect(ids.size).toBe(stubs.length)
  })
})

describe('sahibindenAdapter.parseDetailPage', () => {
  it('arsa detayından RawListing çıkarır', () => {
    const r = sahibindenAdapter.parseDetailPage(
      fx('sahibinden-arsa-detail-1.html'),
      'https://www.sahibinden.com/ilan/x-1333721705/detay',
    )
    expect(r.source).toBe('sahibinden')
    expect(r.sourceListingId).toBeTruthy()
    expect(r.rawPrice).toBeTruthy()
    expect(r.rawArea).toBeTruthy()
    expect(r.rawIl).toMatch(/trabzon/i)
    expect(r.rawIlce).toBeTruthy()
    expect(r.rawMahalle).toBeTruthy()
    expect(r.rawImarStatus).toBeTruthy()
    expect(r.rawAdaNo).toBeTruthy()
    expect(r.rawParselNo).toBeTruthy()
    expect(r.rawListedAt).toBeTruthy()
    expect(Array.isArray(r.photoUrls)).toBe(true)
    expect(r.photoUrls.length).toBeGreaterThan(0)
    expect(typeof r.lat === 'number' || r.lat === undefined).toBe(true)
    expect(typeof r.lat).toBe('number')
  })

  it('konut detayından da RawListing çıkarır', () => {
    const r = sahibindenAdapter.parseDetailPage(
      fx('sahibinden-konut-detail-1.html'),
      'https://www.sahibinden.com/ilan/y-1336739283/detay',
    )
    expect(r.rawPrice).toBeTruthy()
    expect(r.rawArea).toBeTruthy()
    expect(r.rawType).toBeTruthy()
    expect(r.rawIlce).toBeTruthy()
    expect(r.rawMahalle).toBeTruthy()
  })
})
