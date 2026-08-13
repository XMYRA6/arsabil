/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'

let mockPathname = '/'
jest.mock('next/navigation', () => ({ usePathname: () => mockPathname }))
jest.mock('../Navbar', () => ({ Navbar: () => <div data-testid="navbar" /> }))
jest.mock('../Footer', () => ({ Footer: () => <div data-testid="footer" /> }))
jest.mock('../BottomNavbar', () => ({ BottomNavbar: () => <div data-testid="bottom-navbar" /> }))

import { SiteChrome } from '../SiteChrome'

describe('SiteChrome', () => {
    beforeEach(() => {
        mockPathname = '/'
    })

    it('müşteri sayfalarında Navbar/Footer/BottomNavbar render eder', () => {
        mockPathname = '/marketplace'
        render(<SiteChrome><div>içerik</div></SiteChrome>)
        expect(screen.getByTestId('navbar')).toBeInTheDocument()
        expect(screen.getByTestId('footer')).toBeInTheDocument()
        expect(screen.getByTestId('bottom-navbar')).toBeInTheDocument()
        expect(screen.getByText('içerik')).toBeInTheDocument()
    })

    it('/admin altında Navbar/Footer/BottomNavbar render etmez, yalnızca children döner', () => {
        mockPathname = '/admin'
        render(<SiteChrome><div>admin içerik</div></SiteChrome>)
        expect(screen.queryByTestId('navbar')).not.toBeInTheDocument()
        expect(screen.queryByTestId('footer')).not.toBeInTheDocument()
        expect(screen.queryByTestId('bottom-navbar')).not.toBeInTheDocument()
        expect(screen.getByText('admin içerik')).toBeInTheDocument()
    })

    it('/admin/listings gibi alt route\'larda da kabuğu gizler', () => {
        mockPathname = '/admin/listings'
        render(<SiteChrome><div>x</div></SiteChrome>)
        expect(screen.queryByTestId('navbar')).not.toBeInTheDocument()
    })

    // Regresyon: `minHeight` sabit `100vh` kullanırsa iOS Safari'de arac
    // cubugu (URL bar) kaydirmayla gizlenip acildikca deger gecerliligini
    // yitiriyor — `position:fixed;bottom:0` olan BottomNavbar'in altinda
    // sayfa arka planinin gorundugu bir bosluk kaliyor, home indicator o
    // boslukta "cok yukarda" duruyormus gibi goruniyor. `dvh` gercek
    // (dinamik) viewport yuksekligini takip eder.
    it('main minHeight 100dvh kullanir, 100vh DEGIL (iOS Safari fixed-bottom bosluk regresyonu)', () => {
        mockPathname = '/marketplace'
        render(<SiteChrome><div>içerik</div></SiteChrome>)
        const main = screen.getByText('içerik').closest('main')!
        expect(main.style.minHeight).toMatch(/dvh/)
        expect(main.style.minHeight).not.toMatch(/(?<!d)vh/)
    })
})
