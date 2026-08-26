import { readFileSync } from 'fs'
import { join } from 'path'

const css = readFileSync(join(process.cwd(), 'src/components/mobile/MobileState.module.css'), 'utf8')

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

describe('MobileState CSS scope', () => {
    it('cam kart recetesi yalnizca mobil media query icindedir', () => {
        const inside = mobileBlock()
        const outside = css.replace(inside, '')

        expect(inside).toMatch(/\.state\s*\{[^}]*background:\s*var\(--m-glass\)/)
        expect(inside).toMatch(/\.state\s*\{[^}]*backdrop-filter:\s*var\(--m-glass-blur\)/)
        expect(inside).toMatch(/\.state\s*\{[^}]*-webkit-backdrop-filter:\s*var\(--m-glass-blur\)/)
        expect(inside).toMatch(/\.state\s*\{[^}]*border-radius:\s*var\(--m-r-card\)/)
        expect(outside).not.toMatch(/backdrop-filter:\s*var\(--m-glass-blur\)/)
    })

    it('dokunma hedefi ve aksiyon genisligi mobilde korunur', () => {
        const inside = mobileBlock()
        expect(inside).toMatch(/\.action\s*>\s*\*\s*\{[^}]*min-height:\s*var\(--touch-target\)/)
        expect(inside).toMatch(/\.action\s*>\s*\*\s*\{[^}]*min-width:\s*var\(--touch-target\)/)
    })

    it('reduced motion tum animasyon ve transform gecislerini kapatir', () => {
        expect(css).toMatch(/@media\s*\(prefers-reduced-motion:\s*reduce\)/)
        expect(css).toMatch(/\.state,\s*\.iconShell,\s*\.spinner\s*\{[^}]*animation:\s*none/)
        expect(css).toMatch(/\.state,\s*\.iconShell,\s*\.spinner\s*\{[^}]*transition:\s*none/)
    })

    it('metinler cam yuzey kontrast tokenlarini kullanir', () => {
        const inside = mobileBlock()
        expect(inside).toMatch(/\.title\s*\{[^}]*color:\s*var\(--m-ink\)/)
        expect(inside).toMatch(/\.description\s*\{[^}]*color:\s*var\(--m-body\)/)
    })
})
