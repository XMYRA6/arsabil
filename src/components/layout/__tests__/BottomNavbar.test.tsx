/** @jest-environment jsdom */
import { render, screen, waitFor, act } from '@testing-library/react'
import '@testing-library/jest-dom'
import { BottomNavbar, BOTTOMNAV_HIDDEN_PATHS } from '../BottomNavbar'

let mockPathname = '/marketplace'
jest.mock('next/navigation', () => ({ usePathname: () => mockPathname }))

let mockStatus: 'authenticated' | 'unauthenticated' | 'loading' = 'unauthenticated'
jest.mock('next-auth/react', () => ({ useSession: () => ({ status: mockStatus }) }))

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children, ...r }: { href: string; children: React.ReactNode }) => <a href={href} {...r}>{children}</a>,
}))

const DOT = 'Okunmamış bildirim var'
const unread = (n: number) => ({ ok: true, json: async () => ({ conversations: [{ unreadCount: n }] }) })

describe('BottomNavbar (Arazi: TabBar + Profil noktası)', () => {
  beforeEach(() => {
    mockPathname = '/marketplace'
    mockStatus = 'unauthenticated'
    global.fetch = jest.fn()
  })

  it('normal bir sayfada render edilir', () => {
    render(<BottomNavbar />)
    expect(screen.getByRole('navigation', { name: 'Alt menü' })).toBeInTheDocument()
  })

  it.each(BOTTOMNAV_HIDDEN_PATHS)('%s yolunda hiç render edilmez', (path) => {
    mockPathname = path
    const { container } = render(<BottomNavbar />)
    expect(container).toBeEmptyDOMElement()
  })

  it('sohbet ve wizard alt yollarında da gizlenir', () => {
    for (const p of ['/inbox/abc123', '/listings/new', '/listing/42']) {
      mockPathname = p
      const { container } = render(<BottomNavbar />)
      expect(container).toBeEmptyDOMElement()
    }
  })

  it('beş sekme, tasarımdaki sırayla', () => {
    render(<BottomNavbar />)
    expect(screen.getAllByRole('link').map(a => a.textContent)).toEqual(['Ana sayfa', 'Hesapla', 'Pazar', 'Akif', 'Profil'])
  })

  it('aktif sekme aria-current taşır', () => {
    render(<BottomNavbar />)
    expect(screen.getByRole('link', { name: /Pazar/ })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: /Profil/ })).not.toHaveAttribute('aria-current')
  })

  it('oturumsuz kullanıcıda mesaj API\'sine istek atılmaz, nokta yok', async () => {
    render(<BottomNavbar />)
    await waitFor(() => expect(global.fetch).not.toHaveBeenCalled())
    expect(screen.queryByText(DOT)).not.toBeInTheDocument()
  })

  it('okunmamış yoksa nokta yok', async () => {
    mockStatus = 'authenticated'
    ;(global.fetch as jest.Mock).mockResolvedValue(unread(0))
    render(<BottomNavbar />)
    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith('/api/messages'))
    expect(screen.queryByText(DOT)).not.toBeInTheDocument()
  })

  it('okunmamış mesaj varsa Profil sekmesinde nokta (sayı gösterilmez)', async () => {
    mockStatus = 'authenticated'
    ;(global.fetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => ({ conversations: [{ unreadCount: 2 }, { unreadCount: 3 }] }) })
    render(<BottomNavbar />)
    expect(await screen.findByText(DOT)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Profil/ })).toHaveTextContent(DOT)
    expect(screen.queryByText('5')).not.toBeInTheDocument()
  })

  it('fetch hata verirse nokta sessizce gizli kalır', async () => {
    mockStatus = 'authenticated'
    ;(global.fetch as jest.Mock).mockRejectedValue(new Error('ağ'))
    render(<BottomNavbar />)
    await waitFor(() => expect(global.fetch).toHaveBeenCalled())
    expect(screen.queryByText(DOT)).not.toBeInTheDocument()
  })

  it('oturum kapatılıp yeniden açılınca eski (stale) nokta sızmaz', async () => {
    mockStatus = 'authenticated'
    ;(global.fetch as jest.Mock).mockResolvedValueOnce(unread(5))
    const { rerender } = render(<BottomNavbar />)
    expect(await screen.findByText(DOT)).toBeInTheDocument()

    mockStatus = 'unauthenticated'
    act(() => { rerender(<BottomNavbar />) })
    expect(screen.queryByText(DOT)).not.toBeInTheDocument()

    let resolveFetch: (v: unknown) => void = () => {}
    ;(global.fetch as jest.Mock).mockReturnValueOnce(new Promise((r) => { resolveFetch = r }))
    mockStatus = 'authenticated'
    act(() => { rerender(<BottomNavbar />) })
    expect(screen.queryByText(DOT)).not.toBeInTheDocument()

    await act(async () => { resolveFetch(unread(0)) })
    expect(screen.queryByText(DOT)).not.toBeInTheDocument()
  })
})
