/** @jest-environment jsdom */
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HomeMobile } from './HomeMobile'

const DATA = {
    stats: { reportCount: 7, activeListingCount: 2, offerCount: 3, unreadMessageCount: 1 },
    recentReports: [{ id: 'r1', title: 'Kadıköy Parseli', createdAt: '2026-08-01T10:00:00.000Z', landShareRatio: 0.42, minApartmentPrice: 8900000 }],
    recentMessages: [{ id: 'm1', content: 'Teklifin hakkında görüşebilir miyiz?', createdAt: '2026-08-02T10:00:00.000Z', sender: { id: 's1', name: 'Burak Tan', image: null } }],
    recentOffers: [],
}
const BILDIRIMLER = { notifications: [{ id: 'n1', type: 'MESAJ_VAR', title: 'Yeni mesaj', body: 'Burak size yazdı', read: false, entityId: null, createdAt: '2026-08-02T10:00:00.000Z' }] }
const SENARYOLAR = { scenarios: [{ id: 'sc1', name: 'Akçaabat 7 kat', currentVersionNumber: 2 }] }

function mockFetch(dashboardOk = true) {
    global.fetch = jest.fn((url: string) => {
        if (url === '/api/user/dashboard') return Promise.resolve({ ok: dashboardOk, json: () => Promise.resolve(DATA) })
        if (url === '/api/notifications') return Promise.resolve({ ok: true, json: () => Promise.resolve(BILDIRIMLER) })
        if (url === '/api/studio/scenarios') return Promise.resolve({ ok: true, json: () => Promise.resolve(SENARYOLAR) })
        return Promise.resolve({ ok: false, json: () => Promise.resolve({}) })
    }) as unknown as typeof fetch
}

beforeEach(() => mockFetch())
afterEach(() => jest.clearAllMocks())

describe('HomeMobile (Özet)', () => {
    it('yuklenirken "Yukleniyor..." gosterir', () => {
        render(<HomeMobile />)
        expect(screen.getByText(/Yükleniyor/)).toBeInTheDocument()
    })

    it('gelen kutusu, hesaplamalar ve senaryolari gosterir; logo ve bildirim cani yok', async () => {
        render(<HomeMobile />)
        await waitFor(() => expect(screen.getByText('Kadıköy Parseli')).toBeInTheDocument())
        expect(screen.getByRole('tab', { name: /Mesajlar/ })).toBeInTheDocument()
        expect(screen.getByRole('tab', { name: /Bildirimler/ })).toBeInTheDocument()
        expect(screen.getByText('Burak Tan')).toBeInTheDocument()
        expect(await screen.findByText('Akçaabat 7 kat')).toBeInTheDocument()
        expect(screen.queryByRole('link', { name: /Bildirimler$/ })).not.toBeInTheDocument()
        expect(screen.queryByText('ArsaBil')).not.toBeInTheDocument()
    })

    it('Bildirimler sekmesi bildirimi gosterir ve /notifications a gider', async () => {
        render(<HomeMobile />)
        await waitFor(() => expect(screen.getByText('Burak Tan')).toBeInTheDocument())
        await userEvent.click(screen.getByRole('tab', { name: /Bildirimler/ }))
        expect(screen.getByText('Yeni mesaj')).toBeInTheDocument()
        expect(screen.getByRole('link', { name: 'Tümünü gör →' })).toHaveAttribute('href', '/notifications')
    })

    it('Mesajlar sekmesi satiri sohbet linkine, tumunu gor /inbox a gider', async () => {
        render(<HomeMobile />)
        await waitFor(() => expect(screen.getByText('Burak Tan')).toBeInTheDocument())
        expect(screen.getByRole('link', { name: /Burak Tan/ })).toHaveAttribute('href', '/inbox?with=s1')
        expect(screen.getByRole('link', { name: 'Tümünü gör →' })).toHaveAttribute('href', '/inbox')
    })

    it('/api/user/dashboard basarisiz olursa hata mesaji gosterir', async () => {
        mockFetch(false)
        render(<HomeMobile />)
        await waitFor(() => expect(screen.getByText(/Veriler yüklenemedi/)).toBeInTheDocument())
    })

    it('/api/user/dashboard a fetch atar', () => {
        render(<HomeMobile />)
        expect(global.fetch).toHaveBeenCalledWith('/api/user/dashboard')
    })
})
