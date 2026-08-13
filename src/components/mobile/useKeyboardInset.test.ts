/** @jest-environment jsdom */
import { renderHook, act } from '@testing-library/react'
import { useKeyboardInset } from './useKeyboardInset'

/**
 * jsdom `window.visualViewport`'u native olarak desteklemiyor — burada
 * gercek VisualViewport API'sinin minimal bir sahte (fake) EventTarget
 * implementasyonu kuruluyor. `dispatchEvent` gercek EventTarget'tan
 * geliyor, yani React'in `addEventListener('resize', ...)` cagrisi
 * gercek bir olay dinleyicisine baglaniyor.
 */
class FakeVisualViewport extends EventTarget {
    height: number
    offsetTop: number
    constructor(height: number, offsetTop = 0) {
        super()
        this.height = height
        this.offsetTop = offsetTop
    }
    resizeTo(height: number, offsetTop = 0) {
        this.height = height
        this.offsetTop = offsetTop
        this.dispatchEvent(new Event('resize'))
    }
}

describe('useKeyboardInset', () => {
    let fakeVv: FakeVisualViewport
    const ORIGINAL_INNER_HEIGHT = window.innerHeight

    beforeEach(() => {
        Object.defineProperty(window, 'innerHeight', { value: 844, configurable: true })
        fakeVv = new FakeVisualViewport(844)
        Object.defineProperty(window, 'visualViewport', { value: fakeVv, configurable: true })
    })

    afterEach(() => {
        Object.defineProperty(window, 'innerHeight', { value: ORIGINAL_INNER_HEIGHT, configurable: true })
    })

    it('klavye kapaliyken 0 doner', () => {
        const { result } = renderHook(() => useKeyboardInset())
        expect(result.current).toBe(0)
    })

    it('klavye acilinca (visualViewport kucculunce) fark px olarak doner', () => {
        const { result } = renderHook(() => useKeyboardInset())
        act(() => {
            fakeVv.resizeTo(844 - 320) // 320px'lik klavye
        })
        expect(result.current).toBe(320)
    })

    it('klavye kapaninca tekrar 0a doner', () => {
        const { result } = renderHook(() => useKeyboardInset())
        act(() => {
            fakeVv.resizeTo(844 - 320)
        })
        expect(result.current).toBe(320)
        act(() => {
            fakeVv.resizeTo(844)
        })
        expect(result.current).toBe(0)
    })

    it('visualViewport hic yoksa (eski tarayici) sessizce 0 doner, hata firlatmaz', () => {
        Object.defineProperty(window, 'visualViewport', { value: undefined, configurable: true })
        const { result } = renderHook(() => useKeyboardInset())
        expect(result.current).toBe(0)
    })

    it('unmount olunca event listener temizlenir (bellek sizintisi olmaz)', () => {
        const removeSpy = jest.spyOn(fakeVv, 'removeEventListener')
        const { unmount } = renderHook(() => useKeyboardInset())
        unmount()
        expect(removeSpy).toHaveBeenCalledWith('resize', expect.any(Function))
    })
})
