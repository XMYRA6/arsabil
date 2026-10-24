/** @jest-environment jsdom */
import { render, screen, waitFor } from '@testing-library/react'
import { TurkiyeHaritasi, kademeHesapla } from './TurkiyeHaritasi'

describe('kademeHesapla', () => {
  const f = (slug: string, medyan: number | null, emsal = 10) => ({ slug, medyan, emsal })

  it('veri yoksa 0, varsa 1-5 arası kademe verir', () => {
    const k = kademeHesapla([f('a', 100), f('b', 200), f('c', 300), f('d', 400), f('e', 500), f('x', null)])
    expect(k('x')).toBe(0)
    expect(k('yok')).toBe(0)
    expect(k('a')).toBe(1)
    expect(k('e')).toBe(5)
  })

  it('emsalı yetersiz il boyanmaz', () => {
    const k = kademeHesapla([f('a', 100), f('b', 200), f('az', 9999, 3)])
    expect(k('az')).toBe(0)
  })
})

describe('TurkiyeHaritasi', () => {
  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => [{ slug: 'trabzon', medyan: 2300, emsal: 41 }] }) as unknown as typeof fetch
  })

  it('81 il için il fiyat sayfasına giden bağlantı çizer', async () => {
    render(<TurkiyeHaritasi />)
    expect(screen.getAllByRole('link')).toHaveLength(81)
    expect(screen.getByRole('link', { name: 'Trabzon arsa fiyatları' })).toHaveAttribute('href', '/arsa-fiyatlari/trabzon')
    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith('/api/arsa-fiyatlari/iller'))
  })
})
