import fs from 'node:fs'
import path from 'node:path'
import { emlakjetAdapter } from '../adapters/emlakjet'

const fx = (n: string) => fs.readFileSync(path.join(__dirname, '..', 'fixtures', n), 'utf8')

describe('emlakjetAdapter', () => {
  it('source ve hint alanları dolu', () => {
    expect(emlakjetAdapter.source).toBe('emlakjet')
    expect(emlakjetAdapter.searchResultHint).toBeTruthy()
    expect(emlakjetAdapter.detailHint).toBeTruthy()
  })

  it('searchUrls il/kategori/sayfa üretir', () => {
    const urls = emlakjetAdapter.searchUrls('trabzon', 'arsa', 2)
    expect(urls).toHaveLength(2)
    expect(urls[0]).toContain('trabzon')
    expect(urls[1]).toContain('trabzon')
    expect(urls[0]).not.toEqual(urls[1])
    expect(urls[1]).toMatch(/sayfa=2/)
  })

  it('searchUrls konut kategorisi farklı path', () => {
    const urls = emlakjetAdapter.searchUrls('trabzon', 'konut', 1)
    expect(urls[0]).toContain('satilik-konut')
  })

  it('parseSearchPage stub çıkarır', () => {
    const stubs = emlakjetAdapter.parseSearchPage(fx('emlakjet-arsa-search.html'))
    expect(stubs.length).toBeGreaterThan(0)
    expect(stubs[0].sourceListingId).toMatch(/^\d+$/)
    expect(stubs[0].detailUrl).toMatch(/^https:\/\/www\.emlakjet\.com\/ilan\//)
    // benzersiz
    const ids = new Set(stubs.map((s: { sourceListingId: string }) => s.sourceListingId))
    expect(ids.size).toBe(stubs.length)
  })

  it('parseDetailPage RawListing çıkarır (arsa)', () => {
    const r = emlakjetAdapter.parseDetailPage(
      fx('emlakjet-arsa-detail-1.html'),
      'https://www.emlakjet.com/ilan/x-17976077',
    )
    expect(r.source).toBe('emlakjet')
    expect(r.sourceListingId).toBeTruthy()
    expect(r.rawPrice).toBeTruthy()
    expect(r.rawArea).toBeTruthy()
    expect(r.rawIlce).toBeTruthy()
    expect(r.rawMahalle).toBeTruthy()
    expect(r.rawIl).toBeTruthy()
    expect(r.photoUrls.length).toBeGreaterThan(0)
    expect(r.rawAdaNo).toBeTruthy()
    expect(r.rawParselNo).toBeTruthy()
  })

  it('parseDetailPage RawListing çıkarır (konut)', () => {
    const r = emlakjetAdapter.parseDetailPage(
      fx('emlakjet-konut-detail-1.html'),
      'https://www.emlakjet.com/ilan/y-19779117',
    )
    expect(r.rawPrice).toBeTruthy()
    expect(r.rawType).toBeTruthy()
    expect(r.rawArea).toBeTruthy()
    expect(r.rawIlce).toBeTruthy()
    expect(r.rawMahalle).toBeTruthy()
  })
})
