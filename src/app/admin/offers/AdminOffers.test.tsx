/** @jest-environment jsdom */
import { render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import AdminOffers from './page'

const mockOffer = {
    id: 'offer-1',
    offeredShare: 0.25,
    message: 'Teklifimi değerlendirin',
    status: 'PENDING',
    createdAt: '2026-01-15T00:00:00.000Z',
    bidder: { name: 'Zeynep Kaya', email: 'zeynep@test.com' },
    listing: { id: 'listing-1', city: 'İstanbul', district: 'Beşiktaş', report: { title: 'Rapor A' } },
}

beforeEach(() => {
    global.fetch = jest.fn(() =>
        Promise.resolve({ ok: true, json: () => Promise.resolve({ offers: [mockOffer] }) })
    ) as unknown as jest.Mock
})

describe('AdminOffers — mobil DataCard görünümü', () => {
    it('mobil kart listesinde teklif veren ve arsa payı görünür (tablo + kart = 2 kopya)', async () => {
        render(<AdminOffers />)
        await waitFor(() => expect(screen.getAllByText('Zeynep Kaya')).toHaveLength(2))
        expect(screen.getAllByText('%25').length).toBeGreaterThan(0)
    })
})
