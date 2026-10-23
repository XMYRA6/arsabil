/** @jest-environment jsdom */
import { fireEvent, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { Navbar } from '../Navbar'

let mockPathname = '/'
const push = jest.fn()
jest.mock('next/navigation', () => ({ usePathname: () => mockPathname, useRouter: () => ({ push }) }))

type Sess = { data: { user: { name: string; email: string; role?: string } } | null; status: 'authenticated' | 'unauthenticated' | 'loading' }
let mockSession: Sess = { data: null, status: 'unauthenticated' }
const mockSignOut = jest.fn()
jest.mock('next-auth/react', () => ({ useSession: () => mockSession, signOut: () => mockSignOut() }))

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children, ...r }: { href: string; children: React.ReactNode }) => <a href={href} {...r}>{children}</a>,
}))
jest.mock('@/components/ui/ThemeToggle', () => ({ ThemeToggle: () => <button>tema</button> }))

const login = (role?: string) => {
  mockSession = { data: { user: { name: 'Emre Yılmaz', email: 'e@x.com', role } }, status: 'authenticated' }
}

describe('Navbar (Arazi)', () => {
  beforeEach(() => {
    mockPathname = '/'
    mockSession = { data: null, status: 'unauthenticated' }
    push.mockClear()
    mockSignOut.mockClear()
  })

  it('beş ana bağlantı ve logo', () => {
    render(<Navbar />)
    const nav = screen.getByRole('navigation', { name: 'Ana menü' })
    for (const l of ['Hesapla', 'Değer', 'Akif', 'Pazar Yeri', 'Fiyatlar']) {
      expect(nav).toHaveTextContent(l)
    }
    expect(screen.getAllByRole('link', { name: 'Ana sayfa' })).toHaveLength(2) // masaüstü pill logosu + mobil çubuk logosu (misafir ana sayfası)
  })

  it('ilan yolu Pazar Yeri sekmesini aktif yapar', () => {
    mockPathname = '/listing/42'
    render(<Navbar />)
    expect(screen.getByRole('link', { name: 'Pazar Yeri' })).toHaveAttribute('aria-current', 'page')
  })

  it('misafir: Giriş bağlantısı ve "Ücretsiz dene" → /register; bildirim ve avatar yok', () => {
    render(<Navbar />)
    for (const l of screen.getAllByRole('link', { name: 'Giriş' })) expect(l).toHaveAttribute('href', '/login')
    fireEvent.click(screen.getByRole('button', { name: 'Ücretsiz dene' }))
    expect(push).toHaveBeenCalledWith('/register')
    expect(screen.queryByRole('link', { name: 'Bildirimler' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Hesap menüsü' })).not.toBeInTheDocument()
  })

  it('girişli: bildirim bağlantısı /notifications, avatar baş harfleri', () => {
    login()
    render(<Navbar />)
    expect(screen.getByRole('link', { name: 'Bildirimler' })).toHaveAttribute('href', '/notifications')
    expect(screen.getByRole('button', { name: 'Hesap menüsü' })).toHaveTextContent('EY')
    expect(screen.queryByRole('link', { name: 'Giriş' })).not.toBeInTheDocument()
  })

  it('hesap menüsü açılır; Yönetim yalnız ADMIN rolünde; çıkış signOut çağırır', () => {
    login()
    const { unmount } = render(<Navbar />)
    fireEvent.click(screen.getByRole('button', { name: 'Hesap menüsü' }))
    expect(screen.getByRole('menuitem', { name: 'Kontrol paneli' })).toHaveAttribute('href', '/dashboard')
    expect(screen.queryByRole('menuitem', { name: 'Yönetim paneli' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('menuitem', { name: 'Çıkış yap' }))
    expect(mockSignOut).toHaveBeenCalled()
    unmount()

    login('ADMIN')
    render(<Navbar />)
    fireEvent.click(screen.getByRole('button', { name: 'Hesap menüsü' }))
    expect(screen.getByRole('menuitem', { name: 'Yönetim paneli' })).toHaveAttribute('href', '/admin')
  })

  it('mobil çubuk: yalnız misafirin ana sayfasında; diğer ekranlarda ve girişli kullanıcıda yok', () => {
    const count = () => document.querySelectorAll('header').length
    mockPathname = '/'
    const g = render(<Navbar />)
    expect(count()).toBe(2) // masaüstü + mobil (misafir ana sayfası)
    g.unmount()
    for (const p of ['/hesapla', '/marketplace', '/inbox/abc', '/dashboard/profile', '/listing/1', '/listings/new']) {
      mockPathname = p
      const r = render(<Navbar />)
      expect(count()).toBe(1)
      r.unmount()
    }
    login()
    mockPathname = '/'
    const r2 = render(<Navbar />)
    expect(count()).toBe(1)
    r2.unmount()
  })
})
