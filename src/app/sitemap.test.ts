jest.mock('@/lib/prisma', () => ({ prisma: { listing: { findMany: jest.fn(async () => []) } } }))
jest.mock('@/lib/areaSeo/seoAreaDeps', () => ({
  getSeoAreas: jest.fn(async (scope: string) => {
    if (scope === 'il') return [{ ilSlug: 'trabzon', ilceSlug: null, mahalleSlug: null }]
    if (scope === 'ilce') return [{ ilSlug: 'trabzon', ilceSlug: 'akcaabat', mahalleSlug: null }]
    return [{ ilSlug: 'trabzon', ilceSlug: 'akcaabat', mahalleSlug: 'durubinar-mahallesi' }]
  }),
}))

import sitemap from './sitemap'

describe('sitemap', () => {
  it('arsa-fiyatlari üç seviyesini de içerir', async () => {
    const urls = (await sitemap()).map((r) => r.url)
    expect(urls).toContain('http://localhost:3000/arsa-fiyatlari/trabzon')
    expect(urls).toContain('http://localhost:3000/arsa-fiyatlari/trabzon/akcaabat')
    expect(urls).toContain('http://localhost:3000/arsa-fiyatlari/trabzon/akcaabat/durubinar-mahallesi')
  })
})
