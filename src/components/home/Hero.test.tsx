/** @jest-environment jsdom */
import { act, fireEvent, render, screen } from '@testing-library/react'
import { Hero } from './Hero'

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children, ...r }: { href: string; children: React.ReactNode }) => <a href={href} {...r}>{children}</a>,
}))

beforeEach(() => {
  document.documentElement.setAttribute('data-theme', 'light')
  window.matchMedia = ((q: string) => ({
    matches: false, media: q, addEventListener: () => {}, removeEventListener: () => {},
    addListener: () => {}, removeListener: () => {}, onchange: null, dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia
})

describe('Hero', () => {
  it('başlık ve iki çağrı bağlantısı', () => {
    render(<Hero />)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Arsanın gerçek değerini')
    expect(screen.getByRole('link', { name: 'Hemen hesapla' })).toHaveAttribute('href', '/hesapla')
    expect(screen.getByRole('link', { name: 'Arsamın değerini öğren' })).toHaveAttribute('href', '/deger')
  })
  it('varsayılan sahne villa gündüz; tür çipi sahneyi değiştirir', () => {
    render(<Hero />)
    const stage = screen.getByTestId('diorama-stage')
    expect(stage).toHaveAttribute('data-scene-id', 'villa_modern_duz_gunduz')
    fireEvent.click(screen.getByRole('button', { name: 'Tarla' }))
    expect(stage).toHaveAttribute('data-scene-id', 'tarla_bugday_duz_gunduz')
  })
  it('hava segmenti sahnenin havasını değiştirir', () => {
    render(<Hero />)
    fireEvent.click(screen.getByRole('radio', { name: 'Yağmurlu' }))
    expect(screen.getByTestId('diorama-stage')).toHaveAttribute('data-weather', 'yagmurlu')
  })
  it('zaman temaya bağlı: koyu tema → gece, tema değişince güncellenir', async () => {
    render(<Hero />)
    expect(screen.getByTestId('diorama-stage')).toHaveAttribute('data-scene-id', 'villa_modern_duz_gunduz')
    await act(async () => { document.documentElement.setAttribute('data-theme', 'dark') })
    expect(screen.getByTestId('diorama-stage')).toHaveAttribute('data-scene-id', 'villa_modern_duz_gece')
  })
  it('fiyat etiketi örnek olarak işaretli; TKGM ifadesi yok', () => {
    const { container } = render(<Hero />)
    expect(screen.getByLabelText('Örnek fiyat etiketi')).toHaveTextContent('örnek')
    expect(container.textContent).not.toMatch(/TKGM/i)
  })
})
