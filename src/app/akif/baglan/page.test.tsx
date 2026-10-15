/** @jest-environment jsdom */
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'

jest.mock('next-auth/react', () => ({ useSession: jest.fn() }))
import { useSession } from 'next-auth/react'

let tokenParam: string | null = 'TOK'
jest.mock('next/navigation', () => ({
  useSearchParams: () => ({ get: (k: string) => (k === 't' ? tokenParam : null) }),
}))

import BaglanPage from './page'

const fetchMock = jest.fn()
beforeEach(() => {
  jest.clearAllMocks()
  tokenParam = 'TOK'
  ;(global as unknown as { fetch: unknown }).fetch = fetchMock
})

describe('/akif/baglan', () => {
  it('token yoksa hata gösterir', () => {
    tokenParam = null
    ;(useSession as jest.Mock).mockReturnValue({ status: 'authenticated' })
    render(<BaglanPage />)
    expect(screen.getByText(/geçersiz/i)).toBeInTheDocument()
  })

  it('oturum yoksa giriş/üye ol bağlantısı next ile birlikte', () => {
    ;(useSession as jest.Mock).mockReturnValue({ status: 'unauthenticated' })
    render(<BaglanPage />)
    const link = screen.getByRole('link', { name: /giriş yap veya üye ol/i })
    expect(link).toHaveAttribute('href', '/login?next=' + encodeURIComponent('/akif/baglan?t=TOK'))
  })

  it('oturum varken butona basınca bağlar ve başarıyı gösterir', async () => {
    ;(useSession as jest.Mock).mockReturnValue({ status: 'authenticated' })
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ ok: true, saved: true, savedProjectName: 'Maçka' }) })
    render(<BaglanPage />)
    fireEvent.click(screen.getByRole('button', { name: /whatsapp'a bağla/i }))
    await waitFor(() => expect(screen.getByText(/Maçka/)).toBeInTheDocument())
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/akif/baglan',
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ token: 'TOK' }) }),
    )
  })

  it('API hatasında mesajı gösterir', async () => {
    ;(useSession as jest.Mock).mockReturnValue({ status: 'authenticated' })
    fetchMock.mockResolvedValue({ ok: false, json: async () => ({ message: 'Bu bağlantı daha önce kullanılmış.' }) })
    render(<BaglanPage />)
    fireEvent.click(screen.getByRole('button', { name: /whatsapp'a bağla/i }))
    await waitFor(() => expect(screen.getByText(/daha önce kullanılmış/i)).toBeInTheDocument())
  })
})
