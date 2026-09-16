/** @jest-environment jsdom */
jest.mock('@/lib/areaSeo/seoAreaDeps', () => ({ getSeoAreas: jest.fn() }))

import { render, screen } from '@testing-library/react'
import { getSeoAreas } from '@/lib/areaSeo/seoAreaDeps'
import ArsaFiyatlariPage, { metadata } from './page'

beforeEach(() => {
  ;(getSeoAreas as jest.Mock).mockReset()
})

describe('ArsaFiyatlariPage', () => {
  it('veri olan illeri listeler', async () => {
    ;(getSeoAreas as jest.Mock).mockResolvedValue([
      { ilSlug: 'trabzon', ilDisplay: 'Trabzon', sampleCount: 100, scope: 'il', ilNorm: 'TRABZON', ilceNorm: null, mahalleNorm: null, ilceSlug: null, mahalleSlug: null, ilceDisplay: null, mahalleDisplay: null },
    ])
    const ui = await ArsaFiyatlariPage()
    render(ui)
    expect(screen.getByRole('link', { name: /Trabzon/ })).toHaveAttribute('href', '/arsa-fiyatlari/trabzon')
  })
})

describe('metadata', () => {
  it('sabit başlık/açıklama taşır', () => {
    expect(metadata.title).toBe('Arsa Fiyatları | ArsaBil')
  })
})
