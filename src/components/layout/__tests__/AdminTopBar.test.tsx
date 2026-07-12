/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'

let mockSession: { user: { name: string; role: string } } | null = null
jest.mock('next-auth/react', () => ({ useSession: () => ({ data: mockSession }) }))

import { AdminTopBar } from '../AdminTopBar'

describe('AdminTopBar', () => {
    beforeEach(() => {
        mockSession = { user: { name: 'Test Yönetici', role: 'ADMIN' } }
    })

    it('wordmark, admin adı, ADMIN rozeti ve geri-dön linkini render eder', () => {
        render(<AdminTopBar />)
        // "ArsaBil" metni JSX'te bir <span> içinde başka bir <span>'le ("— Yönetim")
        // birlikte yer alıyor — tam string eşleşmesi (getByText('ArsaBil')) iç içe
        // node'lar yüzünden tutmayabilir, bu yüzden regex kullanılıyor.
        expect(screen.getByText(/ArsaBil/)).toBeInTheDocument()
        expect(screen.getByText('Test Yönetici')).toBeInTheDocument()
        expect(screen.getByText('ADMIN')).toBeInTheDocument()
        const backLink = screen.getByRole('link', { name: /Müşteri Paneline Dön/i })
        expect(backLink).toHaveAttribute('href', '/dashboard')
    })

    it('oturum yoksa (session.user.name yok) "Yönetici" varsayılanını gösterir', () => {
        mockSession = null
        render(<AdminTopBar />)
        expect(screen.getByText('Yönetici')).toBeInTheDocument()
    })
})
