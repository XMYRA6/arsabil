/** @jest-environment jsdom */
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import AdminListings from './page'

const mockListing = {
    id: 'listing-1',
    title: 'Test Arsa İlanı',
    city: 'İstanbul',
    district: 'Kadıköy',
    isActive: false,
    status: 'PENDING',
    createdAt: '2026-01-15T00:00:00.000Z',
    user: { name: 'Mehmet Öz', email: 'mehmet@test.com' },
    report: { title: 'Rapor', minApartmentPrice: 5000000, landShareRatio: 0.33, totalApartments: 8 },
    _count: { offers: 2 },
}

beforeEach(() => {
    global.fetch = jest.fn((_url: string, opts?: RequestInit) => {
        if (!opts) {
            return Promise.resolve({ ok: true, json: () => Promise.resolve({ listings: [mockListing] }) }) as unknown as Promise<Response>
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) }) as unknown as Promise<Response>
    }) as jest.Mock
})

describe('AdminListings — mobil DataCard görünümü', () => {
    it('mobil kart listesinde ilan başlığı ve sahibi görünür (tablo + kart = 2 kopya)', async () => {
        render(<AdminListings />)
        await waitFor(() => expect(screen.getAllByText('Test Arsa İlanı')).toHaveLength(2))
        expect(screen.getAllByText('Mehmet Öz').length).toBeGreaterThan(0)
    })

    it('mobil karttaki Onayla butonu tıklanınca PATCH isteği action:approve ile atılır', async () => {
        render(<AdminListings />)
        await waitFor(() => expect(screen.getAllByText('Test Arsa İlanı')).toHaveLength(2))

        const approveButtons = screen.getAllByText('✅ Onayla')
        fireEvent.click(approveButtons[approveButtons.length - 1])

        await waitFor(() => {
            const calls = (global.fetch as jest.Mock).mock.calls
            const patchCall = calls.find(c => c[1]?.method === 'PATCH' && JSON.parse(c[1].body).action === 'approve')
            expect(patchCall).toBeDefined()
        })
    })
})
