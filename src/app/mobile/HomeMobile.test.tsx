/** @jest-environment jsdom */
import { render, screen, waitFor } from '@testing-library/react'
import { HomeMobile } from './HomeMobile'

// `AppBar` app router istiyor; jsdom'da mount edilmis bir router yok
// (bkz. `AppBar.test.tsx`, `hesapla/page.test.tsx` ayni desen).
jest.mock('next/navigation', () => ({
    useRouter: () => ({ back: jest.fn(), push: jest.fn() }),
}))

const DATA = {
    stats: { reportCount: 7, activeListingCount: 2, offerCount: 3, unreadMessageCount: 1 },
    recentReports: [{ id: 'r1', title: 'Kadıköy Parseli', createdAt: '2026-08-01T10:00:00.000Z', landShareRatio: 0.42, minApartmentPrice: 8900000 }],
    recentMessages: [],
    recentOffers: [],
}

beforeEach(() => {
    global.fetch = jest.fn(() =>
        Promise.resolve({ ok: true, json: () => Promise.resolve(DATA) }),
    ) as unknown as typeof fetch
})

afterEach(() => {
    jest.clearAllMocks()
})

describe('HomeMobile', () => {
    it('yuklenirken "Yukleniyor..." gosterir', () => {
        render(<HomeMobile />)
        expect(screen.getByText(/Yükleniyor/)).toBeInTheDocument()
    })

    it('veri gelince istatistik ve rapor listesini gosterir', async () => {
        render(<HomeMobile />)
        await waitFor(() => expect(screen.getByText('Kadıköy Parseli')).toBeInTheDocument())
        expect(screen.getByText('7')).toBeInTheDocument()
    })

    it('/api/user/dashboard basarisiz olursa hata mesaji gosterir', async () => {
        global.fetch = jest.fn(() => Promise.resolve({ ok: false, json: () => Promise.resolve({}) })) as unknown as typeof fetch
        render(<HomeMobile />)
        await waitFor(() => expect(screen.getByText(/Veriler yüklenemedi/)).toBeInTheDocument())
    })

    it('/api/user/dashboard a fetch atar', () => {
        render(<HomeMobile />)
        expect(global.fetch).toHaveBeenCalledWith('/api/user/dashboard')
    })
})
