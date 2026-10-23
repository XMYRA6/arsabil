/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react'
import { QuickActionGrid } from './QuickActionGrid'

const STATS = { reportCount: 7, activeListingCount: 2, offerCount: 3, unreadMessageCount: 1 }

describe('QuickActionGrid', () => {
    it('hesap, ilan ve teklif sayilarini gosterir', () => {
        render(<QuickActionGrid stats={STATS} />)
        expect(screen.getByText('7')).toBeInTheDocument()
        expect(screen.getByText('2')).toBeInTheDocument()
        expect(screen.getByText('3')).toBeInTheDocument()
    })

    it('sifir da anlamli bir sayidir, gizlenmez', () => {
        render(<QuickActionGrid stats={{ reportCount: 0, activeListingCount: 0, offerCount: 0, unreadMessageCount: 0 }} />)
        expect(screen.getAllByText('0')).toHaveLength(3)
    })

    it('alt menude olmayan tek eylem Ilan ver; Hesapla/Pazar/Mesajlar tekrarlanmaz', () => {
        render(<QuickActionGrid stats={STATS} />)
        expect(screen.getByRole('link', { name: 'İlan ver' })).toHaveAttribute('href', '/listings/new')
        expect(screen.queryByRole('link', { name: /Hesapla/ })).not.toBeInTheDocument()
        expect(screen.queryByRole('link', { name: /Mesajlar/ })).not.toBeInTheDocument()
        expect(screen.queryByRole('link', { name: /Pazar/ })).not.toBeInTheDocument()
    })
})
