const findMany = jest.fn()
jest.mock('@/lib/prisma', () => ({ prisma: { listing: { findMany: (...a: unknown[]) => findMany(...a) } } }))
jest.mock('@/lib/areaSeo/seoAreaDeps', () => ({
  getSeoAreas: jest.fn(async (scope: string) => {
    if (scope === 'il') return [{ ilSlug: 'trabzon', ilceSlug: null, mahalleSlug: null }]
    if (scope === 'ilce') return [{ ilSlug: 'trabzon', ilceSlug: 'akcaabat', mahalleSlug: null }]
    return [{ ilSlug: 'trabzon', ilceSlug: 'akcaabat', mahalleSlug: 'durubinar-mahallesi' }]
  }),
}))

import sitemap from './sitemap'

beforeEach(() => {
  findMany.mockReset()
})

it('statik yollar (deger/akif/legal dahil) sitemap`te', async () => {
  findMany.mockResolvedValue([])
  const entries = await sitemap()
  const paths = entries.map((e) => new URL(e.url).pathname)
  for (const p of ['/', '/hesapla', '/deger', '/marketplace', '/akif', '/contact', '/terms', '/privacy']) {
    expect(paths).toContain(p)
  }
})

it('aktif ilanlar listing yollarına eklenir', async () => {
  findMany.mockResolvedValue([
    { id: 'abc', createdAt: new Date('2026-08-01') },
    { id: 'def', createdAt: new Date('2026-08-02') },
  ])
  const entries = await sitemap()
  const paths = entries.map((e) => new URL(e.url).pathname)
  expect(paths).toContain('/listing/abc')
  expect(paths).toContain('/listing/def')
  expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { isActive: true } }))
})

describe('sitemap — arsa-fiyatlari SEO route\'leri', () => {
  it('arsa-fiyatlari üç seviyesini de içerir', async () => {
    findMany.mockResolvedValue([])
    const urls = (await sitemap()).map((r) => r.url)
    expect(urls).toContain('http://localhost:3000/arsa-fiyatlari/trabzon')
    expect(urls).toContain('http://localhost:3000/arsa-fiyatlari/trabzon/akcaabat')
    expect(urls).toContain('http://localhost:3000/arsa-fiyatlari/trabzon/akcaabat/durubinar-mahallesi')
  })
})
