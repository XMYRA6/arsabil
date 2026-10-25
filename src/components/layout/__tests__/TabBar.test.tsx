/** @jest-environment jsdom */
import fs from 'fs'
import path from 'path'
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
  it('first reveal after a hidden state does not transition transform/width (only opacity)', () => {
    const { container, rerender } = render(<TabBar tabs={tabs} activeHref="/studio" />)
    const g = () => container.querySelector('nav > span[aria-hidden="true"]') as HTMLElement
    expect(g()).not.toHaveAttribute('data-ilk')
    rerender(<TabBar tabs={tabs} activeHref="/hesapla" />)
    expect(g()).toHaveAttribute('data-ilk', 'true')
    expect(g().style.opacity).toBe('1')
  })
  it('after the first reveal the full transition is restored', () => {
    const { container, rerender } = render(<TabBar tabs={tabs} activeHref="/studio" />)
    rerender(<TabBar tabs={tabs} activeHref="/hesapla" />)
    rerender(<TabBar tabs={tabs} activeHref="/" />)
    const g = container.querySelector('nav > span[aria-hidden="true"]') as HTMLElement
    expect(g).not.toHaveAttribute('data-ilk')
    expect(g.style.transform).toBe('translateX(8px)')
  })
  it('first measurement of a fresh mount uses the instant mode (data-ilk="anlik")', () => {
    const { container } = render(<TabBar tabs={tabs} activeHref="/hesapla" />)
    const g = container.querySelector('nav > span[aria-hidden="true"]') as HTMLElement
    expect(g).toHaveAttribute('data-ilk', 'anlik')
    expect(g.style.opacity).toBe('1')
  })
  it('hidden→shown after mount still uses the opacity-only reveal (data-ilk="true")', () => {
    const { container, rerender } = render(<TabBar tabs={tabs} activeHref="/studio" />)
    rerender(<TabBar tabs={tabs} activeHref="/hesapla" />)
    expect(container.querySelector('nav > span[aria-hidden="true"]')).toHaveAttribute('data-ilk', 'true')
  })
  it('tab→tab move has no data-ilk', () => {
    const { container, rerender } = render(<TabBar tabs={tabs} activeHref="/hesapla" />)
    rerender(<TabBar tabs={tabs} activeHref="/" />)
    expect(container.querySelector('nav > span[aria-hidden="true"]')).not.toHaveAttribute('data-ilk')
  })
  it('observes only tab anchors and the nav, not the indicator', () => {
    const observed: Element[] = []
    ;(globalThis as { ResizeObserver?: unknown }).ResizeObserver = class {
      observe(el: Element) { observed.push(el) }
      disconnect() {}
      unobserve() {}
    }
    const { container } = render(<TabBar tabs={tabs} activeHref="/hesapla" />)
    const g = container.querySelector('nav > span[aria-hidden="true"]')
    expect(observed).not.toContain(g)
    expect(observed.filter((e) => e.tagName === 'A')).toHaveLength(3)
    expect(observed).toContain(container.querySelector('nav'))
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

describe('TabBar CSS', () => {
  const css = fs.readFileSync(path.join(__dirname, '..', 'TabBar.module.css'), 'utf8')
  it("[data-ilk='anlik'] has transition: none", () => {
    expect(css).toMatch(/\.gosterge\[data-ilk='anlik'\]\s*\{[^}]*transition:\s*none/)
  })
  it('static background does not fade at handoff', () => {
    const m = css.match(/\.bar\[data-gosterge='hazir'\] \.tab\s*\{([^}]*)\}/)
    expect(m).not.toBeNull()
    expect(m![1]).toMatch(/transition:/)
    expect(m![1]).not.toMatch(/background-color/)
  })
  it('reduced-motion block covers the instant mode and handoff', () => {
    const rm = css.slice(css.indexOf('prefers-reduced-motion'))
    expect(rm).toContain(".gosterge[data-ilk='anlik']")
    expect(rm).toContain(".bar[data-gosterge='hazir'] .tab")
    expect(rm).toMatch(/transition:\s*none/)
  })
})
