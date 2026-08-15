import fs from 'fs'
import path from 'path'

const page = fs.readFileSync(path.join(process.cwd(), 'src/app/dashboard/profile/edit/page.tsx'), 'utf8')
const css = fs.readFileSync(path.join(process.cwd(), 'src/app/dashboard/profile/edit/page.module.css'), 'utf8')
const mobile = css.match(/@media \(max-width: 768px\) \{[\s\S]*$/)?.[0] ?? ''

describe('dashboard profile edit route', () => {
    it('owner profilini okuyup mevcut profile PATCH endpointine kaydeder', () => {
        expect(page).toMatch(/fetch\(`\/api\/user\/profile\/\$\{session\.user\.id\}`\)/)
        expect(page).toMatch(/fetch\('\/api\/user\/profile'/)
        expect(page).toMatch(/method: 'PATCH'/)
        expect(page).toMatch(/bio: bio \|\| null/)
        expect(page).toMatch(/linkedin: linkedin \|\| null/)
        expect(page).toMatch(/website: website \|\| null/)
    })

    it('mobil kabuk mesh, save bar liquid glass tokenlarini kullanir', () => {
        expect(mobile).toMatch(/\.editShell,\s*\.settingsShell\s*\{[^}]*background:\s*var\(--m-mesh\),\s*var\(--m-bg\)/)
        expect(mobile).toMatch(/\.saveBar\s*\{[^}]*position:\s*fixed/)
        expect(mobile).toMatch(/\.saveButton\s*\{[^}]*background:\s*var\(--m-grad-btn\)/)
    })

    it('.heroCard/.formCard/.settingsCard/.alertCard/.successCard paylasilan .mStatSurface yuzeyine baglanir (kart tekduzeligi duzeltmesi)', () => {
        expect(css).toMatch(/\.heroCard,\s*\.formCard,\s*\.settingsCard,\s*\.alertCard,\s*\.successCard\s*\{[^}]*composes:\s*mStatSurface from global/)
        expect(mobile).not.toMatch(/\.heroCard,\s*\.formCard,\s*\.settingsCard,\s*\.alertCard,\s*\.successCard\s*\{[^}]*background:\s*var\(--m-glass-bg\)/)
        expect(css).toMatch(/@media \(min-width:\s*769px\)\s*\{\s*\.heroCard,\s*\.formCard,\s*\.settingsCard,\s*\.alertCard,\s*\.successCard\s*\{[^}]*background:\s*var\(--stat-bg\)/)
    })

    it('mobil inputlar touch-safe ve 16px font kullanir', () => {
        expect(mobile).toMatch(/\.fieldGroup input,\s*\.fieldGroup textarea\s*\{[^}]*min-height:\s*var\(--touch-target\)/)
        expect(mobile).toMatch(/\.fieldGroup input,\s*\.fieldGroup textarea\s*\{[^}]*font-size:\s*16px/)
    })
})