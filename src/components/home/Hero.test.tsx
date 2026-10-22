/** @jest-environment jsdom */
import { act, fireEvent, render, screen, within } from '@testing-library/react'
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
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Arsanı bil. Değerini gör.')
    expect(screen.getByRole('link', { name: /Değerini hesapla/ }).getAttribute('href')).toMatch(/^\/deger\?/)
  })
  it('varsayılan sahne arsa gündüz; tür çipi sahneyi değiştirir', () => {
    render(<Hero />)
    const stage = screen.getByTestId('diorama-stage')
    expect(stage.getAttribute('data-scene-id')).toMatch(/^arsa_.*_duz_gunduz$/)
    fireEvent.click(within(screen.getByRole('group', { name: 'Arazi türü' })).getByRole('button', { name: 'Tarla' }))
    expect(stage).toHaveAttribute('data-scene-id', 'tarla_bugday_duz_gunduz')
  })
  it('hava segmenti sahnenin havasını değiştirir', () => {
    render(<Hero />)
    fireEvent.click(screen.getByRole('radio', { name: 'Yağmurlu' }))
    expect(screen.getByTestId('diorama-stage')).toHaveAttribute('data-weather', 'yagmurlu')
  })
  it('zaman temaya bağlı: koyu tema → gece, tema değişince güncellenir', async () => {
    render(<Hero />)
    expect(screen.getByTestId('diorama-stage').getAttribute('data-scene-id')).toMatch(/_gunduz$/)
    await act(async () => { document.documentElement.setAttribute('data-theme', 'dark') })
    expect(screen.getByTestId('diorama-stage')).toHaveAttribute('data-scene-id', expect.stringMatching(/_gece$/))
  })
  it('Kat Karşılığı ürünü sahneyi ve bağlantıyı değiştirir', () => {
    render(<Hero />)
    fireEvent.click(screen.getByRole('button', { name: 'Kat Karşılığı Fizibilite' }))
    expect(screen.getByTestId('diorama-stage').getAttribute('data-scene-id')).toMatch(/^kat_/)
    expect(screen.getByRole('link', { name: /Fizibiliteyi hesapla/ }).getAttribute('href')).toMatch(/^\/hesapla\?/)
  })
  it('hızlı hesap konum ve alanı bağlantıya taşır', () => {
    render(<Hero />)
    fireEvent.change(screen.getByLabelText(/İl · İlçe/), { target: { value: 'Trabzon · Akçaabat' } })
    fireEvent.change(screen.getByLabelText(/Alan/), { target: { value: '1.250 abc' } })
    const href = screen.getByRole('link', { name: /Değerini hesapla/ }).getAttribute('href')!
    const q = new URLSearchParams(href.split('?')[1])
    expect(q.get('alan')).toBe('1250')
    expect(q.get('konum')).toBe('Trabzon · Akçaabat')
  })
  it('örnek notu var; TKGM ifadesi yok', () => {
    const { container } = render(<Hero />)
    expect(screen.getByText(/örnektir/)).toBeInTheDocument()
    expect(container.textContent).not.toMatch(/TKGM/i)
  })
})
