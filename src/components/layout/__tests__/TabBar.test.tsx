/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react'
import { TabBar } from '../TabBar'

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children, ...r }: { href: string; children: React.ReactNode }) => <a href={href} {...r}>{children}</a>,
}))

const Icon = () => <svg data-testid="icon" />
const tabs = [
  { href: '/', label: 'Ana sayfa', icon: <Icon /> },
  { href: '/hesapla', label: 'Hesapla', icon: <Icon /> },
  { href: '/dashboard/profile', label: 'Profil', icon: <Icon />, dot: true },
]

describe('TabBar gösterge', () => {
  const origLeft = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetLeft')
  const origWidth = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetWidth')
  const origRO = (globalThis as { ResizeObserver?: unknown }).ResizeObserver

  beforeEach(() => {
    Object.defineProperty(HTMLElement.prototype, 'offsetLeft', {
      configurable: true,
      get() {
        const links = Array.from(this.parentElement?.querySelectorAll('a') ?? [])
        const i = links.indexOf(this)
        return i < 0 ? 0 : 8 + i * 80
      },
    })
    Object.defineProperty(HTMLElement.prototype, 'offsetWidth', { configurable: true, get: () => 72 })
    ;(globalThis as { ResizeObserver?: unknown }).ResizeObserver = class {
      observe() {}
      disconnect() {}
      unobserve() {}
    }
  })
  afterEach(() => {
    if (origLeft) Object.defineProperty(HTMLElement.prototype, 'offsetLeft', origLeft)
    else delete (HTMLElement.prototype as unknown as Record<string, unknown>).offsetLeft
    if (origWidth) Object.defineProperty(HTMLElement.prototype, 'offsetWidth', origWidth)
    else delete (HTMLElement.prototype as unknown as Record<string, unknown>).offsetWidth
    ;(globalThis as { ResizeObserver?: unknown }).ResizeObserver = origRO
  })

  it('marks the active tab with aria-current', () => {
    render(<TabBar tabs={tabs} activeHref="/hesapla" />)
    expect(screen.getByRole('link', { name: /Hesapla/ })).toHaveAttribute('aria-current', 'page')
  })
  it('renders the indicator element', () => {
    const { container } = render(<TabBar tabs={tabs} activeHref="/hesapla" />)
    const g = container.querySelector('nav > span[aria-hidden="true"]')
    expect(g).not.toBeNull()
  })
  it('indicator is hidden (opacity 0) when no tab is active', () => {
    const { container } = render(<TabBar tabs={tabs} activeHref="/studio" />)
    const g = container.querySelector('nav > span[aria-hidden="true"]') as HTMLElement
    expect(g.style.opacity).toBe('0')
  })
  it('static active class is kept before measurement', () => {
    ;(globalThis as { ResizeObserver?: unknown }).ResizeObserver = undefined
    const spy = jest.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(0)
    const { container } = render(<TabBar tabs={tabs} activeHref="/hesapla" />)
    expect(screen.getByRole('link', { name: /Hesapla/ }).className).toContain('active')
    expect(container.querySelector('nav')).not.toHaveAttribute('data-gosterge')
    spy.mockRestore()
  })
  it('sets data-gosterge="hazir" after measuring', () => {
    const { container } = render(<TabBar tabs={tabs} activeHref="/hesapla" />)
    expect(container.querySelector('nav')).toHaveAttribute('data-gosterge', 'hazir')
    const g = container.querySelector('nav > span[aria-hidden="true"]') as HTMLElement
    expect(g.style.transform).toBe('translateX(88px)')
    expect(g.style.width).toBe('72px')
  })
  it('dot and unread label still render', () => {
    render(<TabBar tabs={tabs} activeHref="/" />)
    expect(screen.getByText('Okunmamış bildirim var')).toBeInTheDocument()
  })
})

describe('TabBar', () => {
  it('nav landmark, her sekme link', () => {
    render(<TabBar tabs={tabs} activeHref="/hesapla" />)
    expect(screen.getByRole('navigation', { name: 'Alt menü' })).toBeInTheDocument()
    expect(screen.getAllByRole('link')).toHaveLength(3)
  })
  it('aktif sekme aria-current; "/" yalnız tam eşleşmede aktif', () => {
    render(<TabBar tabs={tabs} activeHref="/hesapla" />)
    expect(screen.getByRole('link', { name: /Hesapla/ })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: /Ana sayfa/ })).not.toHaveAttribute('aria-current')
  })
  it('alt yol: /dashboard/profile/edit → Profil aktif', () => {
    render(<TabBar tabs={tabs} activeHref="/dashboard/profile/edit" />)
    expect(screen.getByRole('link', { name: /Profil/ })).toHaveAttribute('aria-current', 'page')
  })
  it('dot: ekran okuyucu metni', () => {
    render(<TabBar tabs={tabs} activeHref="/" />)
    expect(screen.getByText('Okunmamış bildirim var')).toBeInTheDocument()
  })
  it('ikonlar aria-hidden sarmalayıcıda', () => {
    render(<TabBar tabs={tabs} activeHref="/" />)
    expect(screen.getAllByTestId('icon')[0].parentElement).toHaveAttribute('aria-hidden', 'true')
  })
})
