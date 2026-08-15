import { readFileSync } from 'fs'
import { join } from 'path'

const css = readFileSync(join(process.cwd(), 'src/components/layout/BottomNavbar.module.css'), 'utf8')
const globalsCss = readFileSync(join(process.cwd(), 'src/app/globals.css'), 'utf8')

// Kullanici bulgusu (gercek iPhone ekran goruntusuyle geldi): etiketlerin
// altinda, home indicator'a kadar buyuk bir bos serit var. Kok neden: 2026-07-29
// redesign'i (7369329) gercek safe-area'nin (env(safe-area-inset-bottom),
// Face ID'li cihazlarda ~34px) USTUNE, gerekcesi belgelenmemis sabit bir 22px
// "home indicator payi" ekledi — toplam 56px'lik bir bos rezerv olusuyordu
// (iOS'un kendi tab bar kuralinin iki katindan fazla). Redesign ONCESI kod
// yalnizca gercek safe-area'yi alt padding olarak kullaniyordu — bu davranisa
// donuluyor.
describe('BottomNavbar — home indicator altindaki fazla bosluk (2026-08-15)', () => {
    it('--bottomnav-height artik gerekcesiz 22px eklemiyor, yalnizca 74px govde + gercek safe-area', () => {
        expect(globalsCss).toMatch(/--bottomnav-height:\s*calc\(74px\s*\+\s*env\(safe-area-inset-bottom,\s*0px\)\)/)
        expect(globalsCss).not.toMatch(/--bottomnav-height:\s*calc\(74px\s*\+\s*22px/)
    })

    it('.bottomNav alt padding\'i artik gerekcesiz 22px eklemiyor, yalnizca gercek --safe-bottom', () => {
        expect(css).toMatch(/padding:\s*9px 0 var\(--safe-bottom\)/)
        expect(css).not.toMatch(/padding:\s*9px 0 calc\(22px/)
    })
})

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
