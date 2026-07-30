import '@testing-library/jest-dom'

// jsdom `window.matchMedia` ve `Element.prototype.scrollIntoView`i
// uygulamiyor; reduced-motion algilamasi ve otomatik-kaydirma yapan
// bilesenler (ornegin GelismisAyarlarSheet, BottomSheet) bunlara guvenir.
// Guvenli, hicbir sey yapmayan varsayilanlar burada tanimlanir — belirli
// bir degeri (ornegin `matches: true`) test etmek isteyen dosyalar kendi
// `Object.defineProperty(window, 'matchMedia', ...)` cagrisiyla UZERINE
// yazabilir (bkz. ScoreRevealBadge.test.tsx).
if (typeof window !== 'undefined') {
    if (!window.matchMedia) {
        Object.defineProperty(window, 'matchMedia', {
            writable: true,
            value: jest.fn().mockImplementation((query: string) => ({
                matches: false,
                media: query,
                onchange: null,
                addListener: jest.fn(),
                removeListener: jest.fn(),
                addEventListener: jest.fn(),
                removeEventListener: jest.fn(),
                dispatchEvent: jest.fn(),
            })),
        })
    }
    if (!window.Element.prototype.scrollIntoView) {
        window.Element.prototype.scrollIntoView = jest.fn()
    }
}
