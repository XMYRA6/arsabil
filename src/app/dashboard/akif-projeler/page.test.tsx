/** @jest-environment jsdom */
import { render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'

import AkifProjelerPage from './page'

const fetchMock = jest.fn()
beforeEach(() => {
  jest.clearAllMocks()
  ;(global as unknown as { fetch: unknown }).fetch = fetchMock
})

describe('Akif Projelerim', () => {
  it('projeleri, parselleri ve revizyon geçmişini (en yeni önce) gösterir', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        projects: [
          {
            id: 'pk1',
            name: 'Maçka arsası',
            inputs: { arsaSahibiPayiYuzde: 50 },
            createdAt: '2026-10-15T10:00:00.000Z',
            updatedAt: '2026-10-16T10:00:00.000Z',
            parcels: ['TRABZON/ORTAHISAR/UĞURLU ada 123 parsel 45'],
            revisions: [
              { field: 'arsaSahibiPayiYuzde', oldValue: 40, newValue: 50, changedAt: '2026-10-16T10:00:00.000Z', channel: 'whatsapp' },
              { field: 'arsaSahibiPayiYuzde', oldValue: null, newValue: 40, changedAt: '2026-10-15T10:00:00.000Z', channel: 'whatsapp' },
            ],
          },
        ],
      }),
    })
    render(<AkifProjelerPage />)
    await waitFor(() => expect(screen.getByText('Maçka arsası')).toBeInTheDocument())
    expect(screen.getByText(/ada 123 parsel 45/)).toBeInTheDocument()
    const rows = screen.getAllByTestId('revizyon')
    expect(rows).toHaveLength(2)
    expect(rows[0]).toHaveTextContent('40 → 50')
    expect(rows[1]).toHaveTextContent('→ 40')
  })

  it('hesap revizyonunu nesne olarak değil okunur metinle gösterir', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        projects: [
          {
            id: 'pk1',
            name: 'Maçka arsası',
            inputs: {},
            createdAt: '2026-10-15T10:00:00.000Z',
            updatedAt: '2026-10-16T10:00:00.000Z',
            parcels: [],
            revisions: [
              {
                field: 'hesap',
                oldValue: null,
                newValue: { mod: 'imarsiz', xMaxYuzde: 73, yapilamaz: false, arsaSahibiDaire: null },
                changedAt: '2026-10-16T10:00:00.000Z',
                channel: 'whatsapp',
              },
            ],
          },
        ],
      }),
    })
    render(<AkifProjelerPage />)
    await waitFor(() => expect(screen.getByTestId('revizyon')).toBeInTheDocument())
    const row = screen.getByTestId('revizyon')
    expect(row).toHaveTextContent('Hesap')
    expect(row).toHaveTextContent('imarsiz · en fazla %73 arsa payı')
    expect(row.textContent).not.toContain('[object Object]')
  })

  it('asiyor true iken daire/fiyat rakamlarını ulaşılabilir gibi göstermez (review bulgusu — WhatsApp ile çelişmesin)', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        projects: [
          {
            id: 'pk1',
            name: 'Maçka arsası',
            inputs: {},
            createdAt: '2026-10-15T10:00:00.000Z',
            updatedAt: '2026-10-16T10:00:00.000Z',
            parcels: [],
            revisions: [
              {
                field: 'hesap',
                oldValue: null,
                newValue: {
                  mod: 'tam', xMaxYuzde: 70, yapilamaz: false,
                  arsaSahibiDaire: 3, daireFiyatiTL: 4500000, asiyor: true,
                },
                changedAt: '2026-10-16T10:00:00.000Z',
                channel: 'whatsapp',
              },
            ],
          },
        ],
      }),
    })
    render(<AkifProjelerPage />)
    await waitFor(() => expect(screen.getByTestId('revizyon')).toBeInTheDocument())
    const row = screen.getByTestId('revizyon')
    expect(row).toHaveTextContent('uygulanabilir değil')
    expect(row).not.toHaveTextContent('3 daire')
    expect(row).not.toHaveTextContent('4.500.000')
  })

  it('proje yoksa yönlendirici boş durum metni gösterir', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ projects: [] }) })
    render(<AkifProjelerPage />)
    await waitFor(() => expect(screen.getByText(/henüz kayıtlı proje yok/i)).toBeInTheDocument())
  })

  it('hata durumunda mesaj gösterir', async () => {
    fetchMock.mockResolvedValue({ ok: false, json: async () => ({}) })
    render(<AkifProjelerPage />)
    await waitFor(() => expect(screen.getByText(/yüklenemedi/i)).toBeInTheDocument())
  })
})
