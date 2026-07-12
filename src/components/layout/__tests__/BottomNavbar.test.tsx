/** @jest-environment jsdom */
import { render, screen, waitFor } from '@testing-library/react'
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
})
