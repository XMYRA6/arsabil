/** @jest-environment jsdom */
import { render, screen, waitFor, act } from '@testing-library/react'
import '@testing-library/jest-dom'
import { BottomNavbar } from '../BottomNavbar'

let mockPathname = '/marketplace'
jest.mock('next/navigation', () => ({ usePathname: () => mockPathname }))

let mockStatus: 'authenticated' | 'unauthenticated' | 'loading' = 'unauthenticated'
jest.mock('next-auth/react', () => ({ useSession: () => ({ status: mockStatus }) }))

describe('BottomNavbar', () => {
  beforeEach(() => {
    mockPathname = '/marketplace'
    mockStatus = 'unauthenticated'
    global.fetch = jest.fn()
  })

  it('normal bir sayfada (marketplace) render edilir', () => {
    render(<BottomNavbar />)
    expect(screen.getByRole('navigation')).toBeInTheDocument()
  })

  it('/login sayfasında render edilmez (auth öncesi, oturum gerektiren sekmeler anlamsız)', () => {
    mockPathname = '/login'
    render(<BottomNavbar />)
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument()
  })

  it('/register sayfasında render edilmez', () => {
    mockPathname = '/register'
    render(<BottomNavbar />)
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument()
  })

  it('oturumsuz kullanıcıda mesaj API\'sine hiç istek atılmaz, rozet render edilmez', async () => {
    mockStatus = 'unauthenticated'
    render(<BottomNavbar />)
    await waitFor(() => expect(global.fetch).not.toHaveBeenCalled())
    expect(screen.queryByText(/^\d+\+?$/)).not.toBeInTheDocument()
  })

  it('okunmamış mesaj yoksa rozet render edilmez', async () => {
    mockStatus = 'authenticated'
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ conversations: [{ unreadCount: 0 }, { unreadCount: 0 }] }),
    })
    render(<BottomNavbar />)
    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith('/api/messages'))
    expect(screen.queryByText('0')).not.toBeInTheDocument()
  })

  it('okunmamış mesaj sayısı konuşmalar arasında toplanıp rozette gösterilir', async () => {
    mockStatus = 'authenticated'
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ conversations: [{ unreadCount: 2 }, { unreadCount: 3 }] }),
    })
    render(<BottomNavbar />)
    expect(await screen.findByText('5')).toBeInTheDocument()
  })

  it('okunmamış sayı 9\'dan büyükse "9+" gösterilir', async () => {
    mockStatus = 'authenticated'
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ conversations: [{ unreadCount: 12 }] }),
    })
    render(<BottomNavbar />)
    expect(await screen.findByText('9+')).toBeInTheDocument()
  })

  it('fetch hata verirse rozet sessizce gizli kalır', async () => {
    mockStatus = 'authenticated'
    ;(global.fetch as jest.Mock).mockRejectedValue(new Error('network'))
    render(<BottomNavbar />)
    await waitFor(() => expect(global.fetch).toHaveBeenCalled())
    expect(screen.queryByText(/^\d+\+?$/)).not.toBeInTheDocument()
  })

  it('aynı sekmede oturum kapatılıp yeniden açıldığında eski (stale) rozet sayısı sızmaz', async () => {
    // 1. Aynı sekmede önce authenticated: unreadTotal 5 olsun.
    mockStatus = 'authenticated'
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ conversations: [{ unreadCount: 2 }, { unreadCount: 3 }] }),
    })
    const { rerender } = render(<BottomNavbar />)
    expect(await screen.findByText('5')).toBeInTheDocument()

    // 2. Client-side logout: status 'unauthenticated' olur, component aynı
    //    instance üzerinde yeniden render edilir (unmount/mount yok).
    mockStatus = 'unauthenticated'
    act(() => {
      rerender(<BottomNavbar />)
    })
    expect(screen.queryByText('5')).not.toBeInTheDocument()
    expect(screen.queryByText(/^\d+\+?$/)).not.toBeInTheDocument()

    // 3. Aynı sekmede yeniden login: status tekrar 'authenticated' olur.
    //    Yeni oturumun fetch'i henüz çözülmeden (sıfır okunmamış mesajlı
    //    farklı bir kullanıcı senaryosu), rozet eski "5" değerini ASLA
    //    göstermemeli.
    let resolveFetch: (value: unknown) => void = () => {}
    ;(global.fetch as jest.Mock).mockReturnValueOnce(
      new Promise((resolve) => { resolveFetch = resolve })
    )
    mockStatus = 'authenticated'
    act(() => {
      rerender(<BottomNavbar />)
    })

    // Fetch henüz çözülmedi — stale "5" görünmemeli.
    expect(screen.queryByText('5')).not.toBeInTheDocument()
    expect(screen.queryByText(/^\d+\+?$/)).not.toBeInTheDocument()

    // Yeni oturumun fetch'i çözülür: bu sefer 0 okunmamış mesaj var.
    await act(async () => {
      resolveFetch({
        ok: true,
        json: async () => ({ conversations: [{ unreadCount: 0 }] }),
      })
    })

    expect(screen.queryByText('5')).not.toBeInTheDocument()
    expect(screen.queryByText('0')).not.toBeInTheDocument()
  })
})
