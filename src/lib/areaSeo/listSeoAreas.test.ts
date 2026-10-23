import { listSeoAreas, findBySlug, type SeoAreaEntry } from './listSeoAreas'

describe('listSeoAreas', () => {
  it('mahalle seviyesinde sampleCount<8 olanları eler', async () => {
    const deps = {
      findAreaPriceStats: async () => [
        { il: 'TRABZON', ilce: 'AKCAABAT', mahalle: 'DURUBINAR', sampleCount: 8 },
        { il: 'TRABZON', ilce: 'AKCAABAT', mahalle: 'YILDIZLI', sampleCount: 3 },
      ],
      listDistinctMarketAreas: async () => [
        { il: 'Trabzon', ilce: 'Akçaabat', mahalle: 'Durubinar' },
        { il: 'Trabzon', ilce: 'Akçaabat', mahalle: 'Yıldızlı' },
      ],
    }
    const out = await listSeoAreas('mahalle', deps)
    expect(out.map((e) => e.mahalleNorm)).toEqual(['DURUBINAR'])
  })

  it('ilçe seviyesinde sampleCount<5 olanları eler', async () => {
    const deps = {
      findAreaPriceStats: async () => [
        { il: 'TRABZON', ilce: 'AKCAABAT', mahalle: null, sampleCount: 5 },
        { il: 'TRABZON', ilce: 'ORTAHISAR', mahalle: null, sampleCount: 4 },
      ],
      listDistinctMarketAreas: async () => [
        { il: 'Trabzon', ilce: 'Akçaabat', mahalle: null },
        { il: 'Trabzon', ilce: 'Ortahisar', mahalle: null },
      ],
    }
    const out = await listSeoAreas('ilce', deps)
    expect(out.map((e) => e.ilceNorm)).toEqual(['AKCAABAT'])
  })

  it('il seviyesinde eşik yok, satır varsa dahil edilir', async () => {
    const deps = {
      findAreaPriceStats: async () => [{ il: 'TRABZON', ilce: null, mahalle: null, sampleCount: 3 }],
      listDistinctMarketAreas: async () => [{ il: 'Trabzon', ilce: null, mahalle: null }],
    }
    const out = await listSeoAreas('il', deps)
    expect(out.map((e) => e.ilNorm)).toEqual(['TRABZON'])
  })

  it('slug ve display alanlarını doğru üretir', async () => {
    // Not: normalizeAreaName ç'yi katlamaz — normalizeAreaName('Akçaabat')
    // === 'AKÇAABAT', 'AKCAABAT' değil. AreaPriceStat satırı da bu yüzden
    // 'AKÇAABAT' taşır (gerçek pipeline'da bu satır normalizeAreaName'den
    // geçmiş MarketListing verisinden üretilir).
    const deps = {
      findAreaPriceStats: async () => [
        { il: 'TRABZON', ilce: 'AKÇAABAT', mahalle: 'DURUBINAR', sampleCount: 10 },
      ],
      listDistinctMarketAreas: async () => [{ il: 'Trabzon', ilce: 'Akçaabat', mahalle: 'Durubinar' }],
    }
    const [entry] = await listSeoAreas('mahalle', deps)
    expect(entry).toEqual({
      scope: 'mahalle',
      ilNorm: 'TRABZON',
      ilceNorm: 'AKÇAABAT',
      mahalleNorm: 'DURUBINAR',
      ilSlug: 'trabzon',
      ilceSlug: 'akcaabat',
      mahalleSlug: 'durubinar',
      ilDisplay: 'Trabzon',
      ilceDisplay: 'Akçaabat',
      mahalleDisplay: 'Durubinar',
      sampleCount: 10,
      medianPricePerSqm: null,
    })
  })

  it('iki farklı anahtar aynı slug\'a düşerse ikincisini atlar (uyarı loglar)', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
    const deps = {
      findAreaPriceStats: async () => [
        { il: 'TRABZON', ilce: 'AKCAABAT', mahalle: null, sampleCount: 10 },
        { il: 'TRABZON', ilce: 'AKÇAABAT', mahalle: null, sampleCount: 10 }, // farklı normalize anahtar, aynı slug
      ],
      listDistinctMarketAreas: async () => [
        { il: 'Trabzon', ilce: 'Akcaabat', mahalle: null },
        { il: 'Trabzon', ilce: 'Akçaabat', mahalle: null },
      ],
    }
    const out = await listSeoAreas('ilce', deps)
    expect(out).toHaveLength(1)
    expect(warnSpy).toHaveBeenCalled()
    warnSpy.mockRestore()
  })
})

describe('findBySlug', () => {
  const entries: SeoAreaEntry[] = [
    {
      scope: 'mahalle', ilNorm: 'TRABZON', ilceNorm: 'AKCAABAT', mahalleNorm: 'DURUBINAR',
      ilSlug: 'trabzon', ilceSlug: 'akcaabat', mahalleSlug: 'durubinar',
      ilDisplay: 'Trabzon', ilceDisplay: 'Akçaabat', mahalleDisplay: 'Durubinar', sampleCount: 10, medianPricePerSqm: null,
    },
    {
      scope: 'il', ilNorm: 'TRABZON', ilceNorm: null, mahalleNorm: null,
      ilSlug: 'trabzon', ilceSlug: null, mahalleSlug: null,
      ilDisplay: 'Trabzon', ilceDisplay: null, mahalleDisplay: null, sampleCount: 10, medianPricePerSqm: null,
    },
  ]

  it('tam mahalle slug eşleşmesini bulur', () => {
    const found = findBySlug(entries, { il: 'trabzon', ilce: 'akcaabat', mahalle: 'durubinar' })
    expect(found?.mahalleNorm).toBe('DURUBINAR')
  })

  it('il-only slug eşleşmesini bulur (ilçe/mahalle yok)', () => {
    const found = findBySlug(entries, { il: 'trabzon' })
    expect(found?.scope).toBe('il')
  })

  it('eşleşme yoksa undefined döner', () => {
    expect(findBySlug(entries, { il: 'istanbul' })).toBeUndefined()
  })
})
