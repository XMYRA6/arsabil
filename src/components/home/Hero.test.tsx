/** @jest-environment jsdom */
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { Hero } from './Hero'

jest.mock('./LocationField', () => ({ LocationField: () => <div data-testid="location-field" /> }))
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
  it('hava düğmesi yok; hava kendiliğinden değişir', () => {
    jest.useFakeTimers()
    jest.spyOn(Math, 'random').mockReturnValue(0.99)
    render(<Hero />)
    expect(screen.queryByRole('radio', { name: 'Yağmurlu' })).toBeNull()
    const stage = screen.getByTestId('diorama-stage')
    expect(stage).toHaveAttribute('data-weather', 'gunesli')
    act(() => { jest.advanceTimersByTime(9100) })
    expect(stage.getAttribute('data-weather')).not.toBe('gunesli')
    jest.restoreAllMocks()
    jest.useRealTimers()
  })
  it('seçilmediyse türler 5 sn’de bir döner; seçince durur', () => {
    jest.useFakeTimers()
    render(<Hero />)
    const stage = screen.getByTestId('diorama-stage')
    expect(stage.getAttribute('data-scene-id')).toMatch(/^arsa_/)
    act(() => { jest.advanceTimersByTime(5100) })
    expect(stage.getAttribute('data-scene-id')).toMatch(/^tarla_/)
    fireEvent.click(within(screen.getByRole('group', { name: 'Arazi türü' })).getByRole('button', { name: 'Villa' }))
    act(() => { jest.advanceTimersByTime(20000) })
    expect(stage.getAttribute('data-scene-id')).toMatch(/^villa_/)
    jest.useRealTimers()
  })
  it('tür kartı tekrarı yok: arazi türü çipleri yalnız sahnenin altında', () => {
    render(<Hero />)
    expect(screen.queryByRole('group', { name: 'Hızlı hesap arazi türü' })).toBeNull()
    expect(screen.getAllByRole('button', { name: 'Tarla' })).toHaveLength(1)
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
  it('hızlı hesap alanı bağlantıya taşır (yalnız rakam)', () => {
    render(<Hero />)
    fireEvent.change(screen.getByLabelText(/Alan/), { target: { value: '1.250 abc' } })
    const href = screen.getByRole('link', { name: /Değerini hesapla/ }).getAttribute('href')!
    expect(new URLSearchParams(href.split('?')[1]).get('alan')).toBe('1250')
  })
  it('örnek notu var; TKGM ifadesi yok', () => {
    const { container } = render(<Hero />)
    expect(screen.getByText(/örnektir/)).toBeInTheDocument()
    expect(container.textContent).not.toMatch(/TKGM/i)
  })
})
