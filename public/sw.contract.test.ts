import { readFileSync } from 'fs'
import { join } from 'path'

const sw = readFileSync(join(process.cwd(), 'public/sw.js'), 'utf8')

describe('public/sw.js — güncelleme sözleşmesi', () => {
    it('install olayı artik self.skipWaiting() cagirmiyor (kullanici onayli guncelleme icin)', () => {
        const installMatch = sw.match(/self\.addEventListener\('install',\s*\(event\)\s*=>\s*\{([\s\S]*?)\n\}\);/)
        expect(installMatch).not.toBeNull()
        expect(installMatch![1]).not.toMatch(/self\.skipWaiting\(\)/)
    })

    it('bir message dinleyicisi SKIP_WAITING gelince self.skipWaiting() cagiriyor', () => {
        const messageMatch = sw.match(/self\.addEventListener\('message',\s*\(event\)\s*=>\s*\{([\s\S]*?)\n\}\);/)
        expect(messageMatch).not.toBeNull()
        expect(messageMatch![1]).toMatch(/event\.data\?\.type === 'SKIP_WAITING'/)
        expect(messageMatch![1]).toMatch(/self\.skipWaiting\(\)/)
    })

    it('activate olayindaki eski cache temizleme mantigi degismedi', () => {
        const activateMatch = sw.match(/self\.addEventListener\('activate',\s*\(event\)\s*=>\s*\{([\s\S]*?)\n\}\);/)
        expect(activateMatch).not.toBeNull()
        expect(activateMatch![1]).toMatch(/caches\.delete\(name\)/)
    })
})
