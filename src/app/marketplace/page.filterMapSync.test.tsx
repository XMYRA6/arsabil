/** @jest-environment jsdom */
import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import MarketplacePage from './page'

// MapView her zaman ham `listings`i alıyordu (page.tsx'in kendi filterListings/
// sortListings ile hesapladığı `sorted` değil) — split/harita görünümünde filtre
// uygulansa bile haritadaki ilan sayısı hiç değişmiyordu. Varsayılan filtre
// (DEFAULT_FILTERS.type = ['KAT_KARSILIGI', 'ORTAKLIK']) 'SALE' ilanını zaten
// dışarıda bırakıyor; bu test MapView'in ham 2 değil, filtrelenmiş 1 ilan
// aldığını doğruluyor.

jest.mock('next/navigation', () => ({
    useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
    useSearchParams: () => new URLSearchParams(),
}))

let lastMapViewListings: unknown[] = []
jest.mock('@/components/marketplace/MapView', () => ({
    MapView: React.forwardRef((props: { listings: unknown[] }, _ref: unknown) => {
        lastMapViewListings = props.listings
        return <div data-testid="mapview" />
    }),
}))

describe('marketplace/page — filtre/harita senkronu', () => {
    beforeEach(() => {
        lastMapViewListings = []
        global.fetch = jest.fn().mockResolvedValue({
            json: () => Promise.resolve([
                { id: '1', title: 'Kalır', type: 'KAT_KARSILIGI', city: 'İstanbul', district: 'Beşiktaş', landSizeSqm: 500, zoning: 'KONUT', createdAt: '2026-01-01' },
                { id: '2', title: 'Filtrelenir', type: 'SALE', city: 'İstanbul', district: 'Kadıköy', landSizeSqm: 500, zoning: 'KONUT', createdAt: '2026-01-01' },
            ]),
        }) as unknown as typeof fetch
    })

    it('MapView varsayılan filtreyle eşleşmeyen ilanı almaz', async () => {
        render(<MarketplacePage />)

        await waitFor(() => expect(screen.getByTestId('mapview')).toBeInTheDocument())
        await waitFor(() => expect(lastMapViewListings.length).toBe(1))
        expect((lastMapViewListings[0] as { id: string }).id).toBe('1')
    })
})
