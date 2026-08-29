import type { PortalAdapter, RawListing } from '../adapters/types'

it('tipler import edilebiliyor', () => {
  const sample: Pick<RawListing, 'source' | 'photoUrls' | 'extra'> = {
    source: 'sahibinden',
    photoUrls: [],
    extra: {},
  }
  expect(sample.source).toBe('sahibinden')
})

it('PortalAdapter searchResultHint ve detailHint alanlarını zorunlu kılıyor', () => {
  const adapter: PortalAdapter = {
    source: 'sahibinden',
    searchResultHint: 'searchResultsItem',
    detailHint: 'classifiedDetail',
    searchUrls: () => [],
    parseSearchPage: () => [],
    parseDetailPage: (_html, url) => ({
      source: 'sahibinden',
      sourceListingId: '1',
      sourceUrl: url,
      photoUrls: [],
      extra: {},
    }),
  }

  expect(typeof adapter.searchResultHint).toBe('string')
  expect(typeof adapter.detailHint).toBe('string')
})
