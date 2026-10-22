/** @jest-environment jsdom */
import { fireEvent, render, screen, within } from '@testing-library/react'
import { SceneSelector } from './SceneSelector'

const value = { tur: 'villa', varyant: 'modern', egim: 'duz', zaman: 'gunduz' } as const

describe('SceneSelector', () => {
  it('altı tür düğmesi, seçili olan aria-pressed', () => {
    render(<SceneSelector value={value} onChange={() => {}} />)
    const turler = screen.getByRole('group', { name: 'Arazi türü' })
    expect(within(turler).getAllByRole('button').map((b) => b.textContent)).toEqual(['Arsa', 'Tarla', 'Villa', 'Ticari', 'Bağ-Bahçe', 'Kat karşılığı'])
    expect(within(turler).getByRole('button', { name: 'Villa' })).toHaveAttribute('aria-pressed', 'true')
    expect(within(turler).getByRole('button', { name: 'Arsa' })).toHaveAttribute('aria-pressed', 'false')
  })
  it('tür değişince onChange: varyant türün ilk varyantı, diğerleri korunur', () => {
    const fn = jest.fn()
    render(<SceneSelector value={value} onChange={fn} />)
    fireEvent.click(screen.getByRole('button', { name: 'Tarla' }))
    expect(fn).toHaveBeenCalledWith({ tur: 'tarla', varyant: 'bugday', egim: 'duz', zaman: 'gunduz' })
  })
  it('varyant düğmeleri seçili türe göre', () => {
    render(<SceneSelector value={{ ...value, tur: 'arsa', varyant: 'agacli' }} onChange={() => {}} />)
    const v = screen.getByRole('group', { name: 'Varyant' })
    expect(within(v).getAllByRole('button').map((b) => b.textContent)).toEqual(['Ağaçlı', 'Ağaçsız'])
  })
  it('varyant tıklanınca onChange', () => {
    const fn = jest.fn()
    render(<SceneSelector value={{ ...value, tur: 'arsa', varyant: 'agacli' }} onChange={fn} />)
    fireEvent.click(screen.getByRole('button', { name: 'Ağaçsız' }))
    expect(fn).toHaveBeenCalledWith({ tur: 'arsa', varyant: 'agacsiz', egim: 'duz', zaman: 'gunduz' })
  })
  it('eğim ve zaman segmentleri çalışır', () => {
    const fn = jest.fn()
    render(<SceneSelector value={value} onChange={fn} />)
    fireEvent.click(screen.getByRole('radio', { name: 'Yamaç' }))
    expect(fn).toHaveBeenLastCalledWith({ ...value, egim: 'yamac' })
    fireEvent.click(screen.getByRole('radio', { name: 'Gece' }))
    expect(fn).toHaveBeenLastCalledWith({ ...value, zaman: 'gece' })
  })
  it('ticari/kat: yamaç seçeneği pasif ve açıklama görünür', () => {
    render(<SceneSelector value={{ tur: 'ticari', varyant: 'ofis', egim: 'duz', zaman: 'gunduz' }} onChange={() => {}} />)
    expect(screen.getByText('Şehir içi: düz kullanılır')).toBeInTheDocument()
    expect(screen.queryByRole('radio', { name: 'Yamaç' })).not.toBeInTheDocument()
  })
  it('tür değişince yamaç yoksa egim düze çekilir (villa yamaç → ticari)', () => {
    const fn = jest.fn()
    render(<SceneSelector value={{ ...value, egim: 'yamac' }} onChange={fn} />)
    fireEvent.click(screen.getByRole('button', { name: 'Ticari' }))
    expect(fn).toHaveBeenCalledWith({ tur: 'ticari', varyant: 'ofis', egim: 'duz', zaman: 'gunduz' })
  })
  it('önizleme: çözülen görselin srcSet/src ve dosya adı etiketi', () => {
    render(<SceneSelector value={{ ...value, egim: 'yamac', zaman: 'gece' }} onChange={() => {}} />)
    const img = screen.getByRole('img', { name: /Villa · Modern/ })
    expect(img.getAttribute('src')).toBe('/dioramas/villa_modern_yamac_gece-1600.webp')
    expect(img.getAttribute('srcset')).toContain('/dioramas/villa_modern_yamac_gece-800.webp 800w')
    expect(screen.getByText('villa_modern_yamac_gece')).toBeInTheDocument()
  })
  it('auto true iken "Otomatik" rozeti', () => {
    const { rerender } = render(<SceneSelector value={value} onChange={() => {}} />)
    expect(screen.queryByText('Otomatik')).not.toBeInTheDocument()
    rerender(<SceneSelector value={value} onChange={() => {}} auto />)
    expect(screen.getByText('Otomatik')).toBeInTheDocument()
  })
})
