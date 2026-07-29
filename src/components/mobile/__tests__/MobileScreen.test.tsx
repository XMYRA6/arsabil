/** @jest-environment jsdom */
import { readFileSync } from 'fs'
import { join } from 'path'
import { render, screen } from '@testing-library/react'
import { MobileScreen } from '../MobileScreen'

/** `@media (max-width: 768px)` bloğunun gövdesini döndürür. */
function mobileBlockBody(): string {
    const css = readFileSync(
        join(process.cwd(), 'src/components/mobile/MobileScreen.module.css'), 'utf8',
    )
    const start = css.indexOf('@media (max-width: 768px)')
    expect(start).toBeGreaterThan(-1)
    const open = css.indexOf('{', start)
    let depth = 0
    for (let i = open; i < css.length; i++) {
        if (css[i] === '{') depth++
        else if (css[i] === '}') {
            depth--
            if (depth === 0) return css.slice(open + 1, i)
        }
    }
    throw new Error('mobil media query blogu kapanmamis')
}

describe('MobileScreen', () => {
    it('cocuklari render eder', () => {
        render(<MobileScreen><p>icerik</p></MobileScreen>)
        expect(screen.getByText('icerik')).toBeInTheDocument()
    })

    it('varsayilan olarak alt navigasyon dolgusu uygular', () => {
        const { container } = render(<MobileScreen>x</MobileScreen>)
        const el = container.firstElementChild as HTMLElement
        expect(el.dataset.bottomnav).toBe('true')
        expect(el.dataset.cta).toBe('false')
    })

    it('sticky CTA varsa ek dolgu isaretlenir', () => {
        const { container } = render(<MobileScreen hasStickyCta>x</MobileScreen>)
        expect((container.firstElementChild as HTMLElement).dataset.cta).toBe('true')
    })

    it('alt navigasyon olmayan ekranlarda dolgu istenmez', () => {
        const { container } = render(<MobileScreen hasBottomNav={false}>x</MobileScreen>)
        expect((container.firstElementChild as HTMLElement).dataset.bottomnav).toBe('false')
    })

    it('alt navigasyon yok ama sabit CTA varsa CTA dolgusunun uygulandigini dogrula', () => {
        const { container } = render(
            <MobileScreen hasBottomNav={false} hasStickyCta>
                x
            </MobileScreen>,
        )
        const el = container.firstElementChild as HTMLElement
        expect(el.dataset.bottomnav).toBe('false')
        expect(el.dataset.cta).toBe('true')
    })

    it('mesh zemin varsayilan acik, kapatilabilir', () => {
        const { container: on } = render(<MobileScreen>x</MobileScreen>)
        expect((on.firstElementChild as HTMLElement).dataset.mesh).toBe('true')
        const { container: off } = render(<MobileScreen mesh={false}>x</MobileScreen>)
        expect((off.firstElementChild as HTMLElement).dataset.mesh).toBe('false')
    })

    it('disaridan gelen className korunur', () => {
        const { container } = render(<MobileScreen className="ekstra">x</MobileScreen>)
        expect((container.firstElementChild as HTMLElement).className).toContain('ekstra')
    })

    it('TUM kurallar mobil media query icinde (masaustu duzeni degismemeli)', () => {
        const css = readFileSync(
            join(process.cwd(), 'src/components/mobile/MobileScreen.module.css'), 'utf8',
        )
        // Brace-depth scan: media query'nin gerçek kapanma braketini bulur.
        // Böylelikle greedy regex tuzağından kaçınılır.
        const start = css.indexOf('@media (max-width: 768px)')
        const open = css.indexOf('{', start)
        let depth = 0
        let closePos = open
        for (let i = open; i < css.length; i++) {
            if (css[i] === '{') depth++
            else if (css[i] === '}') {
                depth--
                if (depth === 0) {
                    closePos = i
                    break
                }
            }
        }
        const before = css.slice(0, start)
        const after = css.slice(closePos + 1)
        const outside = (before + after).replace(/\/\*[\s\S]*?\*\//g, '').trim()
        expect(outside).toBe('')
    })
})
