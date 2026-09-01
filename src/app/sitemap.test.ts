const findMany = jest.fn()
jest.mock('@/lib/prisma', () => ({ prisma: { listing: { findMany: (...a: unknown[]) => findMany(...a) } } }))

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
