/** @jest-environment jsdom */
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { AppBar } from '../AppBar'

const back = jest.fn()
const push = jest.fn()
jest.mock('next/navigation', () => ({ useRouter: () => ({ back, push }) }))

describe('AppBar', () => {
    beforeEach(() => { back.mockClear(); push.mockClear() })

    it('başlığı heading olarak gösterir', () => {
        render(<AppBar title="İlan Detayı" />)
        expect(screen.getByRole('heading', { name: 'İlan Detayı' })).toBeInTheDocument()
    })

    it('showBack verilmeden geri butonu render etmez', () => {
        render(<AppBar title="Başlık" />)
        expect(screen.queryByRole('button', { name: 'Geri' })).not.toBeInTheDocument()
    })

    it('geri butonu router.back() çağırır', () => {
        render(<AppBar title="Başlık" showBack />)
        fireEvent.click(screen.getByRole('button', { name: 'Geri' }))
        expect(back).toHaveBeenCalledTimes(1)
    })

    it('backHref verilirse router.push(backHref) çağırır', () => {
        render(<AppBar title="Başlık" showBack backHref="/inbox" />)
        fireEvent.click(screen.getByRole('button', { name: 'Geri' }))
        expect(push).toHaveBeenCalledWith('/inbox')
        expect(back).not.toHaveBeenCalled()
    })

    it('action slot içeriğini render eder', () => {
        render(<AppBar title="Başlık" action={<button>Paylaş</button>} />)
        expect(screen.getByRole('button', { name: 'Paylaş' })).toBeInTheDocument()
    })
})
