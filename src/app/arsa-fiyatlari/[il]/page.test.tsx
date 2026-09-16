jest.mock('@/lib/areaSeo/seoAreaDeps', () => ({ getSeoAreas: jest.fn() }))

import { getSeoAreas } from '@/lib/areaSeo/seoAreaDeps'
import { generateMetadata } from './page'

const entry = {
  scope: 'il' as const,
  ilNorm: 'TRABZON', ilceNorm: null, mahalleNorm: null,
  ilSlug: 'trabzon', ilceSlug: null, mahalleSlug: null,
  ilDisplay: 'Trabzon', ilceDisplay: null, mahalleDisplay: null,
  sampleCount: 100,
}

beforeEach(() => {
  ;(getSeoAreas as jest.Mock).mockReset()
})

describe('generateMetadata (il)', () => {
  it('eşleşen il için başlık üretir', async () => {
    ;(getSeoAreas as jest.Mock).mockResolvedValue([entry])
    const meta = await generateMetadata({ params: Promise.resolve({ il: 'trabzon' }) })
    expect(meta.title).toContain('Trabzon')
  })

  it('eşleşme yoksa jenerik başlık döner', async () => {
    ;(getSeoAreas as jest.Mock).mockResolvedValue([])
    const meta = await generateMetadata({ params: Promise.resolve({ il: 'x' }) })
    expect(meta.title).toBe('Arsa Fiyatları | ArsaBil')
  })
})
