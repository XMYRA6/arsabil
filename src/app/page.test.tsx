/** @jest-environment jsdom */
import React from 'react'
import { render, screen } from '@testing-library/react'
import HomePage from './page'

// `useSession` her testte farkli deger dondurebilsin diye jest.fn() olarak
// mock'lanir — `/hesapla/page.test.tsx`'teki sabit mock burada yetmez,
// cunku bu dosya 3 farkli auth durumunu test ediyor.
jest.mock('next-auth/react', () => ({
    useSession: jest.fn(),
}))
import { useSession } from 'next-auth/react'

// Bu sayfanin agaci framer-motion `whileInView` kullaniyor, o da jsdom'da
// olmayan IntersectionObserver'a ihtiyac duyuyor. Bu, bu sayfayi render eden
// ILK test dosyasi oldugu icin projede daha once hic karsilasilmamis bir
// ihtiyac — global jest.setup.ts'e degil, sadece burada scope'lu.
class MockIntersectionObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(global as any).IntersectionObserver = MockIntersectionObserver

// HomeMobile kendi fetch/loading/error mantigina sahip agir bir bilesen —
// bu dosyanin konusu SADECE platform/auth dallanmasi, HesaplaMobile
// deseniyle ayni gerekce: heavy children mock'lanir, kendi test dosyalari var.
jest.mock('./mobile/HomeMobile', () => ({
    HomeMobile: () => <div data-testid="home-mobile" />,
}))

function viewportKur(masaustu: boolean) {
    Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: (query: string) => ({
            matches: query.includes('max-width: 768px') ? masaustu : false,
            media: query,
            onchange: null,
            addEventListener: jest.fn(),
            removeEventListener: jest.fn(),
            addListener: jest.fn(),
            removeListener: jest.fn(),
            dispatchEvent: jest.fn(),
        }),
    })
}

describe('/ — auth x viewport dallanmasi', () => {
    it('anonim kullanici, viewport fark etmeksizin, pazarlama sayfasini gorur', async () => {
        (useSession as jest.Mock).mockReturnValue({ data: null, status: 'unauthenticated' })
        viewportKur(false)
        render(<HomePage />)
        expect(await screen.findByText(/Arsanızın Gerçek Değerini/)).toBeInTheDocument()
        expect(screen.queryByTestId('home-mobile')).toBeNull()
    })

    it('giris yapmis + masaustu: pazarlama sayfasi degismedi', async () => {
        (useSession as jest.Mock).mockReturnValue({ data: { user: { name: 'Test' } }, status: 'authenticated' })
        viewportKur(true)
        render(<HomePage />)
        expect(await screen.findByText(/Arsanızın Gerçek Değerini/)).toBeInTheDocument()
        expect(screen.queryByTestId('home-mobile')).toBeNull()
    })

    it('giris yapmis + mobil: HomeMobile render edilir, pazarlama sayfasi degil', async () => {
        (useSession as jest.Mock).mockReturnValue({ data: { user: { name: 'Test' } }, status: 'authenticated' })
        viewportKur(false)
        render(<HomePage />)
        expect(await screen.findByTestId('home-mobile')).toBeInTheDocument()
        expect(screen.queryByText(/Arsanızın Gerçek Değerini/)).toBeNull()
    })

    it('giris durumu hala "loading" iken (viewport zaten belli), pazarlama sayfasi hemen gorunur', async () => {
        (useSession as jest.Mock).mockReturnValue({ data: null, status: 'loading' })
        viewportKur(false)
        render(<HomePage />)
        expect(await screen.findByText(/Arsanızın Gerçek Değerini/)).toBeInTheDocument()
        expect(screen.queryByTestId('home-mobile')).toBeNull()
    })
})
