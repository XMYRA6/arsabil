import { readFileSync } from 'fs'
import { join } from 'path'

const globalsCss = readFileSync(join(process.cwd(), 'src/app/globals.css'), 'utf8')

// Home indicator altında gereksiz boşluk olmaması (2026-08-15 bulgusu): sayfa alt boşluğu
// 74px gövde + gerçek safe-area. TabBar kendi konumunu `env(safe-area-inset-bottom)` ile verir.
describe('alt menü yüksekliği token\'ı', () => {
    it('--bottomnav-height gerekçesiz 22px eklemiyor', () => {
        expect(globalsCss).toMatch(/--bottomnav-height:\s*calc\(74px\s*\+\s*env\(safe-area-inset-bottom,\s*0px\)\)/)
        expect(globalsCss).not.toMatch(/--bottomnav-height:\s*calc\(74px\s*\+\s*22px/)
    })
})
