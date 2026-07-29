/** @jest-environment jsdom */
import { readFileSync } from 'fs'
import { join } from 'path'
import { render, screen } from '@testing-library/react'
import { MobileScreen } from '../MobileScreen'

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
        const outside = css.replace(/@media \(max-width: 768px\)\s*\{[\s\S]*\n\}/, '')
        expect(outside.replace(/\/\*[\s\S]*?\*\//g, '').trim()).toBe('')
    })
})
