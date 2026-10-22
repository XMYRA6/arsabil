/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react'
import { NavPill } from '../NavPill'

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children, ...r }: { href: string; children: React.ReactNode }) => <a href={href} {...r}>{children}</a>,
}))

const links = [{ href: '/hesapla', label: 'Hesapla' }, { href: '/deger', label: 'Değer' }, { href: '/akif', label: 'Akif' }]

describe('NavPill', () => {
  it('nav landmark ve logo bağlantısı (ana sayfa)', () => {
    render(<NavPill links={links} activeHref="/deger" logo={<span>LOGO</span>} />)
    expect(screen.getByRole('navigation', { name: 'Ana menü' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /ana sayfa/i })).toHaveAttribute('href', '/')
    expect(screen.getByText('LOGO')).toBeInTheDocument()
  })
  it('aktif bağlantı aria-current="page", diğerleri değil', () => {
    render(<NavPill links={links} activeHref="/deger" logo={null} />)
    expect(screen.getByRole('link', { name: 'Değer' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'Hesapla' })).not.toHaveAttribute('aria-current')
  })
  it('alt yol aktif sayılır (/akif/baglan → /akif)', () => {
    render(<NavPill links={links} activeHref="/akif/baglan" logo={null} />)
    expect(screen.getByRole('link', { name: 'Akif' })).toHaveAttribute('aria-current', 'page')
  })
  it('right slot render edilir', () => {
    render(<NavPill links={links} activeHref="/" logo={null} right={<button>Giriş</button>} />)
    expect(screen.getByRole('button', { name: 'Giriş' })).toBeInTheDocument()
  })
})
