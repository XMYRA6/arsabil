/** @jest-environment jsdom */
import { readFileSync } from 'fs'
import { join } from 'path'
import { render, screen } from '@testing-library/react'
import { MobileScreen } from '../MobileScreen'

/** Brace-depth scan ile CSS içinde @media (max-width: 768px) bloğunun dışındaki içeriği döndürür. */
function getOutsideMobileQuery(css: string): string {
    const start = css.indexOf('@media (max-width: 768px)')
    expect(start).toBeGreaterThan(-1)
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
    return (before + after).replace(/\/\*[\s\S]*?\*\//g, '').trim()
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
        const outside = getOutsideMobileQuery(css)
        expect(outside).toBe('')
    })

    it('kapsam guard eski greedy-regex tuzagina karsi direncli (regressions karsi)', () => {
        // Eski /@media...{[\s\S]*\n\}/ regexin greedy karakteri ortaklar;
        // medya sorgusu kapandiktan SONRA cikan kurallar hala yassinabilirdi.
        // Bu test sonradan yapilmis kurallari yakalamak icin sabit (fixture)
        // csslerle brace-depth taramasi dogrular.

        // Fikstür 1: Temiz - medya sorgusu sonrasinda hicbir sey yok.
        const cleanFixture = `/* Baslik */
@media (max-width: 768px) {
    .rule { color: red; }
}
`
        const cleanOutside = getOutsideMobileQuery(cleanFixture)
        expect(cleanOutside).toBe('')

        // Fikstür 2: Sizbilir - medya sorgusundan sonra bir kural kaçti.
        // Sonu kendi braketinde yapılır (greedy regexin tuzağını tetiklemek için).
        const leakedFixture = `/* Baslik */
@media (max-width: 768px) {
    .rule { color: red; }
}
.leaked-rule { color: blue; }
`
        const leakedOutside = getOutsideMobileQuery(leakedFixture)
        expect(leakedOutside).toContain('.leaked-rule')
    })
})
