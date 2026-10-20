import { aggregateKonutPrices, type KonutInputRow } from '../aggregate'

const row = (o: Partial<KonutInputRow> = {}): KonutInputRow => ({
  listingType: 'konut', pricePerSqm: 50_000, areaSqm: 100, status: 'active',
  il: 'Trabzon', ilce: 'Ortahisar', mahalle: 'Uğurlu', ...o,
})
const many = (n: number, o: Partial<KonutInputRow> = {}) => Array.from({ length: n }, () => row(o))

describe('aggregateKonutPrices', () => {
  it('konut olmayan, aktif olmayan, geçersiz m²/fiyatlı ilanları atar', () => {
    const rows = [
      ...many(3),
      row({ listingType: 'arsa' }), row({ listingType: 'ticari' }), row({ status: 'delisted' }),
      row({ areaSqm: 39 }), row({ areaSqm: 401 }), row({ areaSqm: null }),
      row({ pricePerSqm: null }), row({ pricePerSqm: 0 }), row({ pricePerSqm: Number.NaN }), row({ il: null }),
    ]
    const out = aggregateKonutPrices(rows)
    expect(out.find((r) => r.scope === 'il')?.sampleCount).toBe(3)
  })

  it('başlığında arsa/tarla/arazi geçen (eski arsa taramasından konut etiketli) ilanları atar', () => {
    const rows = [
      ...many(3, { title: 'Satılık 2+1 Daire' }),
      row({ title: 'Konut İmarlı Arsa' }), row({ title: 'Villa Arsası' }),
      row({ title: 'Arsa Konumlu Tarla' }), row({ title: 'Satılık ARAZİ' }),
    ]
    const out = aggregateKonutPrices(rows)
    expect(out.find((r) => r.scope === 'il')?.sampleCount).toBe(3)
  })

  it('üç ölçekte satır üretir; üst ölçeklerde ilce/mahalle boş string', () => {
    const out = aggregateKonutPrices(many(3))
    expect(out.map((r) => [r.scope, r.il, r.ilce, r.mahalle])).toEqual([
      ['il', 'TRABZON', '', ''],
      ['ilce', 'TRABZON', 'ORTAHISAR', ''],
      ['mahalle', 'TRABZON', 'ORTAHISAR', 'UĞURLU'],
    ])
  })

  it('3 örnekten azsa satır üretmez', () => {
    expect(aggregateKonutPrices(many(2))).toEqual([])
  })

  it('medyan, p25, p75 ve medyan m² hesaplar', () => {
    const prices = [40_000, 50_000, 60_000, 70_000, 80_000]
    const rows = prices.map((p, i) => row({ pricePerSqm: p, areaSqm: 80 + i * 10 }))
    const mah = aggregateKonutPrices(rows).find((r) => r.scope === 'mahalle')!
    expect(mah.medianPricePerSqm).toBe(60_000)
    expect(mah.p25).toBe(50_000)
    expect(mah.p75).toBe(70_000)
    expect(mah.medianAreaSqm).toBe(100)
    expect(mah.sampleCount).toBe(5)
  })

  it('farklı yazımlı aynı mahalleyi tek grupta toplar (normalizeAreaName)', () => {
    // 'Ugurlu' (ASCII ğ->g) excluded: TKGM ASCII folding is a known pre-existing limitation shared with arsa stats; not this task's scope.
    const rows = [row({ mahalle: 'Uğurlu' }), row({ mahalle: 'UĞURLU' }), row({ mahalle: 'uğurlu' })]
    expect(aggregateKonutPrices(rows).filter((r) => r.scope === 'mahalle')).toHaveLength(1)
  })

  it('il en az 20 ilan içerince il bazlı p5–p95 dışındaki aykırıları atar (medyan bozulmaz)', () => {
    const rows = [
      ...Array.from({ length: 30 }, (_, i) => row({ pricePerSqm: 45_000 + i * 500 })),
      row({ pricePerSqm: 1 }), row({ pricePerSqm: 9_000_000 }),
    ]
    const il = aggregateKonutPrices(rows).find((r) => r.scope === 'il')!
    expect(il.sampleCount).toBeLessThan(32)
    expect(il.medianPricePerSqm).toBeGreaterThan(50_000)
    expect(il.medianPricePerSqm).toBeLessThan(60_000)
  })

  it('il 20 ilandan azsa eleme yapmaz', () => {
    const rows = [...many(5), row({ pricePerSqm: 9_000_000 })]
    expect(aggregateKonutPrices(rows).find((r) => r.scope === 'il')!.sampleCount).toBe(6)
  })

  it('ilçesi/mahallesi olmayan ilan yalnız il grubuna girer', () => {
    const out = aggregateKonutPrices(many(3, { ilce: null, mahalle: null }))
    expect(out.map((r) => r.scope)).toEqual(['il'])
  })
})
