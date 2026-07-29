/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react'
import { ThemeToggle } from '../ThemeToggle'

/**
 * Regresyon: uygulama eskiden `sky` / `mint` / `sand` temalarini sunuyordu.
 * Bu paletler kaldirildi ama o temayi secmis kullanicilarin tarayicisinda
 * `arsabil-theme` degeri KALDI. ThemeToggle degeri dogrulamadan `Mode`a
 * cast edip `PALETTES.find(...)!` ile aradigi icin `undefined` donuyor ve
 * `current.isLight` TypeError firlatiyordu.
 *
 * Bilesen `RootLayout` > `SiteChrome` > `Navbar` zincirinde oldugu icin
 * bu, TUM sayfalari coken bir hataydi.
 */
describe('ThemeToggle — gecersiz kayitli tema', () => {
    beforeEach(() => {
        localStorage.clear()
        document.documentElement.removeAttribute('data-theme')
    })

    it.each(['sky', 'mint', 'sand', 'bozuk-deger', 'SKY'])(
        'kaldirilmis/gecersiz tema "%s" ile COKMEZ',
        (kayitli) => {
            localStorage.setItem('arsabil-theme', kayitli)
            expect(() => render(<ThemeToggle />)).not.toThrow()
            expect(screen.getByRole('button', { name: 'Tema değiştir' })).toBeInTheDocument()
        },
    )

    it('gecersiz deger gunduz temasina duser', () => {
        localStorage.setItem('arsabil-theme', 'sky')
        render(<ThemeToggle />)
        expect(document.documentElement.getAttribute('data-theme')).toBe('light')
    })

    it('gecersiz deger localStorage da TEMIZLENIR (kullanici kilitli kalmaz)', () => {
        // Aksi halde degeri yazan baska bir kod yolu olmadigi icin kullanici
        // her acilista ayni bozuk degeri okumaya devam ederdi.
        localStorage.setItem('arsabil-theme', 'mint')
        render(<ThemeToggle />)
        expect(localStorage.getItem('arsabil-theme')).toBe('light')
    })

    it('gecerli temalar korunur', () => {
        localStorage.setItem('arsabil-theme', 'dark')
        render(<ThemeToggle />)
        expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
        expect(localStorage.getItem('arsabil-theme')).toBe('dark')
    })

    it('hic kayit yoksa gunduz temasi kullanilir', () => {
        render(<ThemeToggle />)
        expect(document.documentElement.getAttribute('data-theme')).toBe('light')
    })
})
