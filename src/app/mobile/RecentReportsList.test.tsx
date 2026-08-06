/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react'
import { RecentReportsList } from './RecentReportsList'

const REPORTS = [
    { id: 'r1', title: 'Kadıköy Parseli', createdAt: '2026-08-01T10:00:00.000Z', landShareRatio: 0.42, minApartmentPrice: 8900000 },
    { id: 'r2', title: 'Beşiktaş Projesi', createdAt: '2026-08-02T10:00:00.000Z', landShareRatio: 0.38, minApartmentPrice: 14200000 },
]

describe('RecentReportsList', () => {
    it('rapor listesini gösterir', () => {
        render(<RecentReportsList reports={REPORTS} />)
        expect(screen.getByText('Kadıköy Parseli')).toBeInTheDocument()
        expect(screen.getByText('Beşiktaş Projesi')).toBeInTheDocument()
    })

    it('arsa payi ve fiyati dogru bicimde gosterir', () => {
        render(<RecentReportsList reports={REPORTS} />)
        expect(screen.getByText(/Arsa payı: %42/)).toBeInTheDocument()
        expect(screen.getByText(/8.900.000/)).toBeInTheDocument()
    })

    it('her satir dogru hesapla linkine gider', () => {
        render(<RecentReportsList reports={REPORTS} />)
        expect(screen.getByRole('link', { name: /Kadıköy Parseli/ })).toHaveAttribute('href', '/hesapla?reportId=r1')
    })

    it('bos durumda "Henuz hesaplama yok" mesaji ve Hesapla linki gosterir', () => {
        render(<RecentReportsList reports={[]} />)
        expect(screen.getByText(/Henüz hesaplama yok/)).toBeInTheDocument()
        expect(screen.getByRole('link', { name: /Hesapla/ })).toHaveAttribute('href', '/hesapla')
    })
})
