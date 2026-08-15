import fs from 'fs'
import path from 'path'

const page = fs.readFileSync(path.join(process.cwd(), 'src/app/dashboard/settings/page.tsx'), 'utf8')
const css = fs.readFileSync(path.join(process.cwd(), 'src/app/dashboard/settings/page.module.css'), 'utf8')
const mobile = css.match(/@media \(max-width: 768px\) \{[\s\S]*$/)?.[0] ?? ''

describe('dashboard settings route', () => {
    it('owner emailPrefs verisini okuyup profile PATCH endpointine kaydeder', () => {
        expect(page).toMatch(/fetch\(`\/api\/user\/profile\/\$\{session\.user\.id\}`\)/)
        expect(page).toMatch(/JSON\.parse\(data\.emailPrefs\)/)
        expect(page).toMatch(/fetch\('\/api\/user\/profile'/)
        expect(page).toMatch(/body: JSON\.stringify\(\{ emailPrefs: prefs \}\)/)
    })

    it('uc bildirim tercihi toggle olarak sunulur', () => {
        expect(page).toMatch(/key: 'mesaj'/)
        expect(page).toMatch(/key: 'teklif'/)
        expect(page).toMatch(/key: 'ilan'/)
        expect(page).toMatch(/aria-pressed=\{prefs\[item\.key\]\}/)
    })

    it('mobil ayarlar karti, toggle ve save bar --m-* liquid glass tokenlarini kullanir', () => {
        expect(mobile).toMatch(/\.editShell,\s*\.settingsShell\s*\{[^}]*background:\s*var\(--m-mesh\),\s*var\(--m-bg\)/)
        expect(mobile).toMatch(/\.toggleSwitchOn\s*\{[^}]*background:\s*var\(--m-grad-btn\)/)
        expect(mobile).toMatch(/\.saveBar\s*\{[^}]*backdrop-filter:\s*var\(--m-glass-blur\)/)
        expect(mobile).toMatch(/\.saveButton\s*\{[^}]*min-height:\s*var\(--touch-target\)/)
    })
})