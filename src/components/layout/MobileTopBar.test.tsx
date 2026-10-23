/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react'
import { MobileTopBar } from './MobileTopBar'

describe('MobileTopBar', () => {
    it('bildirim ve mesaj ikonlari dogru rotalara gider', () => {
        render(<MobileTopBar />)
        expect(screen.getByRole('link', { name: 'Bildirimler' })).toHaveAttribute('href', '/notifications')
        expect(screen.getByRole('link', { name: 'Mesajlar' })).toHaveAttribute('href', '/inbox')
    })

    it('okunmamis sayi rozetini ve erisilebilir adi gosterir; 9 ustu 9+ olur', () => {
        render(<MobileTopBar mesaj={3} bildirim={12} />)
        expect(screen.getByRole('link', { name: 'Mesajlar, 3 okunmamış' })).toBeInTheDocument()
        expect(screen.getByRole('link', { name: 'Bildirimler, 12 okunmamış' })).toHaveTextContent('9+')
    })
})
