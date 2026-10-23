/** @jest-environment jsdom */
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { LandTypesSection } from './HomeSections'

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children, ...r }: { href: string; children: React.ReactNode }) => <a href={href} {...r}>{children}</a>,
}))

beforeEach(() => {
  document.documentElement.setAttribute('data-theme', 'light')
})

describe('LandTypesSection', () => {
  it('varsayılan arsa paneli; kart seçince panel o türe geçer', () => {
    render(<LandTypesSection />)
    expect(screen.getByRole('heading', { level: 3, name: 'Arsa' })).toBeInTheDocument()
    fireEvent.click(within(screen.getByRole('group', { name: 'Arazi türleri' })).getByRole('button', { name: /Tarla/ }))
    expect(screen.getByRole('heading', { level: 3, name: 'Tarla' })).toBeInTheDocument()
    expect(screen.getByText('Toprak sınıfı ve verim')).toBeInTheDocument()
  })
  it('kat karşılığı paneli fizibilite sayfasına bağlanır', () => {
    render(<LandTypesSection />)
    fireEvent.click(screen.getByRole('button', { name: /Kat karşılığı/ }))
    expect(screen.getByRole('link', { name: /Fizibilite hesapla/ })).toHaveAttribute('href', '/hesapla')
  })
  it('seçilmediyse 5 sn’de bir döner; seçince durur', () => {
    jest.useFakeTimers()
    render(<LandTypesSection />)
    act(() => { jest.advanceTimersByTime(5100) })
    expect(screen.getByRole('heading', { level: 3, name: 'Tarla' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Villa/ }))
    act(() => { jest.advanceTimersByTime(20000) })
    expect(screen.getByRole('heading', { level: 3, name: 'Villa' })).toBeInTheDocument()
    jest.useRealTimers()
  })
  it('örnek rapor özeti etiketli; TKGM ifadesi yok', () => {
    const { container } = render(<LandTypesSection />)
    expect(screen.getByText('Örnek rapor özeti')).toBeInTheDocument()
    expect(container.textContent).not.toMatch(/TKGM/i)
  })
})
