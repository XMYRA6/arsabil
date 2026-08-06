/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react'
import { QuickActionGrid } from './QuickActionGrid'

const STATS = { reportCount: 7, activeListingCount: 2, offerCount: 3, unreadMessageCount: 1 }

describe('QuickActionGrid', () => {
    it('istatistik sayilarini gosterir', () => {
        render(<QuickActionGrid stats={STATS} />)
        expect(screen.getByText('7')).toBeInTheDocument()
        expect(screen.getByText('2')).toBeInTheDocument()
        expect(screen.getByText('3')).toBeInTheDocument()
        expect(screen.getByText('1')).toBeInTheDocument()
    })

    it('sifir da anlamli bir sayidir, gizlenmez', () => {
        render(<QuickActionGrid stats={{ reportCount: 0, activeListingCount: 0, offerCount: 0, unreadMessageCount: 0 }} />)
        expect(screen.getAllByText('0')).toHaveLength(4)
    })

    it('4 eylem dogru rotalara gider', () => {
        render(<QuickActionGrid stats={STATS} />)
        expect(screen.getByRole('link', { name: /Hesapla/ })).toHaveAttribute('href', '/hesapla')
        expect(screen.getByRole('link', { name: /İlan Ver/ })).toHaveAttribute('href', '/listings/new')
        expect(screen.getByRole('link', { name: /Mesajlar/ })).toHaveAttribute('href', '/inbox')
        expect(screen.getByRole('link', { name: /Pazar/ })).toHaveAttribute('href', '/marketplace')
    })
})
