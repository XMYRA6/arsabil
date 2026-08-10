/** @jest-environment jsdom */
import { render, screen, act } from '@testing-library/react'
import '@testing-library/jest-dom'

let mockPathname = '/'
jest.mock('next/navigation', () => ({ usePathname: () => mockPathname }))

import { InstallPrompt } from '../InstallPrompt'

function setUserAgent(ua: string) {
    Object.defineProperty(window.navigator, 'userAgent', { value: ua, configurable: true })
}

const IOS_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'

describe('InstallPrompt', () => {
    beforeEach(() => {
        mockPathname = '/'
        localStorage.clear()
        setUserAgent(IOS_UA)
        jest.useFakeTimers()
    })

    afterEach(() => {
        jest.useRealTimers()
    })

    it('/login sayfasında 3sn sonra bile banner render etmez (auth formunu bloke etmemeli)', () => {
        mockPathname = '/login'
        render(<InstallPrompt />)

        act(() => {
            jest.advanceTimersByTime(3000)
        })

        expect(screen.queryByText('ArsaBil Uygulaması')).not.toBeInTheDocument()
    })

    it('/reset-password/[token] gibi alt route\'larda da banner\'ı bastırır (gerçek şifre formu var)', () => {
        mockPathname = '/reset-password/abc123'
        render(<InstallPrompt />)

        act(() => {
            jest.advanceTimersByTime(3000)
        })

        expect(screen.queryByText('ArsaBil Uygulaması')).not.toBeInTheDocument()
    })

    it('auth dışı bir rotada (regresyon) 3sn sonra banner hâlâ render edilir', () => {
        mockPathname = '/hesapla'
        render(<InstallPrompt />)

        act(() => {
            jest.advanceTimersByTime(3000)
        })

        expect(screen.getByText('ArsaBil Uygulaması')).toBeInTheDocument()
    })
})
