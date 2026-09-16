jest.mock('@/lib/areaSeo/seoAreaDeps', () => ({ getSeoAreas: jest.fn() }))
jest.mock('@/lib/areaSeo/areaSeoCardDeps', () => ({ createAreaSeoCardDeps: jest.fn(() => ({})) }))
jest.mock('@/lib/areaSeo/areaSeoCard', () => ({ buildAreaSeoCard: jest.fn() }))

import { getSeoAreas } from '@/lib/areaSeo/seoAreaDeps'
import { generateMetadata } from './page'

const entry = {
  scope: 'mahalle' as const,
  ilNorm: 'TRABZON', ilceNorm: 'AKCAABAT', mahalleNorm: 'DURUBINAR',
  ilSlug: 'trabzon', ilceSlug: 'akcaabat', mahalleSlug: 'durubinar-mahallesi',
  ilDisplay: 'Trabzon', ilceDisplay: 'Akçaabat', mahalleDisplay: 'Durubinar',
  sampleCount: 12,
}

beforeEach(() => {
  ;(getSeoAreas as jest.Mock).mockReset()
})

describe('generateMetadata', () => {
  it('eşleşen mahalle için başlık/açıklama üretir', async () => {
    ;(getSeoAreas as jest.Mock).mockResolvedValue([entry])
    const meta = await generateMetadata({
      params: Promise.resolve({ il: 'trabzon', ilce: 'akcaabat', mahalle: 'durubinar-mahallesi' }),
    })
    expect(meta.title).toContain('Durubinar')
    expect(meta.title).toContain('Akçaabat')
    expect(meta.description).toContain('Durubinar')
  })

  it('eşleşme yoksa jenerik başlık döner (404 sayfa bileşeninde tetiklenir)', async () => {
    ;(getSeoAreas as jest.Mock).mockResolvedValue([])
    const meta = await generateMetadata({
      params: Promise.resolve({ il: 'x', ilce: 'y', mahalle: 'z' }),
    })
    expect(meta.title).toBe('Arsa Fiyatları | ArsaBil')
  })
})
