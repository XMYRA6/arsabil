jest.mock('@/lib/areaSeo/seoAreaDeps', () => ({ getSeoAreas: jest.fn() }))

import { getSeoAreas } from '@/lib/areaSeo/seoAreaDeps'
import { generateMetadata } from './page'

const entry = {
  scope: 'ilce' as const,
  ilNorm: 'TRABZON', ilceNorm: 'AKCAABAT', mahalleNorm: null,
  ilSlug: 'trabzon', ilceSlug: 'akcaabat', mahalleSlug: null,
  ilDisplay: 'Trabzon', ilceDisplay: 'Akçaabat', mahalleDisplay: null,
  sampleCount: 40,
}

beforeEach(() => {
  ;(getSeoAreas as jest.Mock).mockReset()
})

describe('generateMetadata (ilçe)', () => {
  it('eşleşen ilçe için başlık üretir', async () => {
    ;(getSeoAreas as jest.Mock).mockResolvedValue([entry])
    const meta = await generateMetadata({ params: Promise.resolve({ il: 'trabzon', ilce: 'akcaabat' }) })
    expect(meta.title).toContain('Akçaabat')
    expect(meta.title).toContain('Trabzon')
  })

  it('eşleşme yoksa jenerik başlık döner', async () => {
    ;(getSeoAreas as jest.Mock).mockResolvedValue([])
    const meta = await generateMetadata({ params: Promise.resolve({ il: 'x', ilce: 'y' }) })
    expect(meta.title).toBe('Arsa Fiyatları | ArsaBil')
  })
})
