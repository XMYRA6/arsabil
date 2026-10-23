import fs from 'fs'
import path from 'path'

const page = fs.readFileSync(path.join(process.cwd(), 'src/app/dashboard/settings/page.tsx'), 'utf8')

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
})
