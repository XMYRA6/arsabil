/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react'
import { RecentActivityRows } from './RecentActivityRows'

const MESSAGE = { id: 'm1', content: 'Teklifinizi değerlendiriyoruz...', createdAt: '2026-08-01T10:00:00.000Z', sender: { id: 'u1', name: 'Ahmet Y.', image: null } }
const OFFER = { id: 'o1', offeredShare: 33, status: 'PENDING', createdAt: '2026-08-01T10:00:00.000Z', listing: { id: 'l1', title: 'Kadıköy Arsa', city: 'İstanbul' }, bidder: { id: 'u2', name: 'Zeynep K.' } }

describe('RecentActivityRows', () => {
    it('mesaj VE teklif ikisi de bosken hic render edilmez', () => {
        const { container } = render(<RecentActivityRows messages={[]} offers={[]} />)
        expect(container).toBeEmptyDOMElement()
    })

    it('yalnizca mesaj varken mesaji gosterir, teklif alaninda "Teklif yok" yazar', () => {
        render(<RecentActivityRows messages={[MESSAGE]} offers={[]} />)
        expect(screen.getByText('Ahmet Y.')).toBeInTheDocument()
        expect(screen.getByText(/Teklifinizi değerlendiriyoruz/)).toBeInTheDocument()
        expect(screen.getByText('Teklif yok.')).toBeInTheDocument()
    })

    it('yalnizca teklif varken teklifi gosterir, mesaj alaninda "Mesaj yok" yazar', () => {
        render(<RecentActivityRows messages={[]} offers={[OFFER]} />)
        expect(screen.getByText('Mesaj yok.')).toBeInTheDocument()
        expect(screen.getByText(/%33 pay/)).toBeInTheDocument()
        expect(screen.getByText('Kadıköy Arsa')).toBeInTheDocument()
    })

    it('mesaj linki /inbox?with=gonderenId ye gider', () => {
        render(<RecentActivityRows messages={[MESSAGE]} offers={[]} />)
        expect(screen.getByRole('link', { name: /Ahmet Y\./ })).toHaveAttribute('href', '/inbox?with=u1')
    })

    it('teklif linki ilgili ilana gider', () => {
        render(<RecentActivityRows messages={[]} offers={[OFFER]} />)
        expect(screen.getByRole('link', { name: /Kadıköy Arsa/ })).toHaveAttribute('href', '/listing/l1')
    })
})
