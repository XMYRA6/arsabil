/** @jest-environment jsdom */
import { act, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { StickyActionBar } from '../StickyActionBar'

describe('StickyActionBar', () => {
    it('çocukları render eder', () => {
        render(<StickyActionBar><button>Hesapla</button></StickyActionBar>)
        expect(screen.getByRole('button', { name: 'Hesapla' })).toBeInTheDocument()
    })

    it('varsayılanda aboveNav sınıfı yok', () => {
        const { container } = render(<StickyActionBar><span>x</span></StickyActionBar>)
        expect((container.firstChild as HTMLElement).className).not.toContain('aboveNav')
    })

    it('aboveBottomNav ile aboveNav sınıfı eklenir', () => {
        const { container } = render(<StickyActionBar aboveBottomNav><span>x</span></StickyActionBar>)
        expect((container.firstChild as HTMLElement).className).toContain('aboveNav')
    })

    it('varsayılanda glass sınıfı yok', () => {
        const { container } = render(<StickyActionBar><span>x</span></StickyActionBar>)
        expect((container.firstChild as HTMLElement).className).not.toContain('glass')
    })

    it('variant="glass" ile glass sınıfı eklenir (--m-* token ailesi)', () => {
        const { container } = render(<StickyActionBar variant="glass"><span>x</span></StickyActionBar>)
        expect((container.firstChild as HTMLElement).className).toContain('glass')
    })

    // Kullanici bulgusu: klavye acilinca (ilan sihirbazi Ileri/Geri cubugu,
    // hesapla mobil CTA, ilan detayi "Teklif Ver") bar klavyenin altinda
    // kalip input gorunmuyordu. Ayni cozum BottomSheet/BottomNavbar'da
    // dogrulandi (bkz. useKeyboardInset.ts, .bar { bottom: var(--keyboard-inset) }).
    it('klavye acilinca (visualViewport kucculunce) bar --keyboard-inset ile yukari kayar', () => {
        class FakeVisualViewport extends EventTarget {
            height = 844
            offsetTop = 0
            resizeTo(height: number) {
                this.height = height
                this.dispatchEvent(new Event('resize'))
            }
        }
        const fakeVv = new FakeVisualViewport()
        Object.defineProperty(window, 'innerHeight', { value: 844, configurable: true })
        Object.defineProperty(window, 'visualViewport', { value: fakeVv, configurable: true })

        const { container } = render(<StickyActionBar><button>Hesapla</button></StickyActionBar>)
        const bar = container.firstChild as HTMLElement
        expect(bar.style.getPropertyValue('--keyboard-inset')).toBe('0px')

        act(() => fakeVv.resizeTo(844 - 320))
        expect(bar.style.getPropertyValue('--keyboard-inset')).toBe('320px')
    })
})
