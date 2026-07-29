import { readFileSync } from 'fs'
import { join } from 'path'

const css = readFileSync(join(process.cwd(), 'src/app/globals.css'), 'utf8')

/** `@media (max-width: 768px)` bloğunun gövdesini döndürür. */
function mobileBlock(): string {
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

describe('mobil token katmani', () => {
    it('JetBrains Mono import edilmis', () => {
        expect(css).toMatch(/fonts\.googleapis\.com[^'"]*JetBrains\+Mono/)
    })

    it('--m-* token tanimlarinin TAMAMI mobil media query icinde', () => {
        // Masaüstü düzeni değişmemeli: bir --m-* tanımı bloğun dışına
        // kaçarsa >=769px'te de uygulanır.
        const inside = mobileBlock()
        const allDefs = css.match(/--m-[a-z0-9-]+\s*:/g) ?? []
        const insideDefs = inside.match(/--m-[a-z0-9-]+\s*:/g) ?? []
        expect(allDefs.length).toBeGreaterThan(10)
        expect(insideDefs.length).toBe(allDefs.length)
    })

    it('cam yardimci sinifi mobil blok icinde ve dogru recete', () => {
        const inside = mobileBlock()
        expect(inside).toMatch(/\.mGlass\s*\{/)
        expect(inside).toMatch(/backdrop-filter:\s*blur\(30px\)\s+saturate\(190%\)/)
        expect(inside).toMatch(/-webkit-backdrop-filter/)
    })

    it("mevcut --seal-* token'lari SILINMEMIS", () => {
        // --seal-* token'lari component-scoped: globals.css'te DEGIL,
        // hesapla/page.module.css icinde yasiyorlar (5 mevcut scope testi
        // globals.css'e sizmalarini yasakliyor). Bu tur onlari silmiyor.
        const pageCss = readFileSync(
            join(process.cwd(), 'src/app/hesapla/page.module.css'), 'utf8',
        )
        expect(pageCss).toMatch(/--seal-accent\s*:/)
    })

    it('mono token JetBrains Mono ve tabular-nums iceriyor', () => {
        const inside = mobileBlock()
        expect(inside).toMatch(/--m-mono:[^;]*JetBrains Mono/)
        expect(inside).toMatch(/font-variant-numeric:\s*tabular-nums/)
    })
})
