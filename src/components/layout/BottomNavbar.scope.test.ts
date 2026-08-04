import { readFileSync } from 'fs'
import { join } from 'path'

const css = readFileSync(join(process.cwd(), 'src/components/layout/BottomNavbar.module.css'), 'utf8')

describe('BottomNavbar — Derin Cam (B) token baglantisi (2026-08-04)', () => {
    it('backdrop-filter artik var(--m-glass-blur) kullaniyor, ham deger yok', () => {
        expect(css).toMatch(/backdrop-filter:\s*var\(--m-glass-blur\)/)
        expect(css).toMatch(/-webkit-backdrop-filter:\s*var\(--m-glass-blur\)/)
        expect(css).not.toMatch(/blur\(30px\)\s*saturate\(190%\)/)
    })

    it('golge hala --m-sh-bottombar kullaniyor (bu token B kapsaminda degismedi)', () => {
        expect(css).toMatch(/box-shadow:\s*var\(--m-sh-bottombar\)/)
    })
})
