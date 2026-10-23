import { readFileSync } from 'fs'
import { join } from 'path'

const globalsCss = readFileSync(join(process.cwd(), 'src/app/globals.css'), 'utf8')

// Home indicator altında gereksiz boşluk olmaması (2026-08-15 bulgusu): sayfa alt boşluğu
// Yüzen pill menü: 12px boşluk + 74px pill + 8px nefes payı (94px) + gerçek safe-area.
// TabBar kendi konumunu `env(safe-area-inset-bottom)` ile verir.
describe('alt menü yüksekliği token\'ı', () => {
    it('--bottomnav-height pill menüyü kapatmayacak kadar yüksek ve gerekçesiz 22px eklemiyor', () => {
        expect(globalsCss).toMatch(/--bottomnav-height:\s*calc\(94px\s*\+\s*env\(safe-area-inset-bottom,\s*0px\)\)/)
        expect(globalsCss).not.toMatch(/--bottomnav-height:\s*calc\(94px\s*\+\s*22px/)
    })
})
