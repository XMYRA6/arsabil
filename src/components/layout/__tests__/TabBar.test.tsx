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
