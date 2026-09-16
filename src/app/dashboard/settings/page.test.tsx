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

    it('mobil kabuk mesh, toggle ve save button --m-* liquid glass tokenlarini kullanir', () => {
        expect(mobile).toMatch(/\.editShell,\s*\.settingsShell\s*\{[^}]*background:\s*var\(--m-mesh\),\s*var\(--m-bg\)/)
        expect(mobile).toMatch(/\.toggleSwitchOn\s*\{[^}]*background:\s*var\(--m-grad-btn\)/)
        expect(mobile).toMatch(/\.saveButton\s*\{[^}]*min-height:\s*var\(--touch-target\)/)
    })

    // REGRESYON: .saveBar eskiden mobilde kendi position:fixed;bottom:0
    // kuralina sahipti — klavye acikken erisilemez oluyordu (--keyboard-inset
    // hic referans edilmiyordu) VE BottomNavbar'in (z-index 999) ALTINDA
    // kaliyordu (kendi z-index'i yoktu). Artik masaustu-akisli .saveBar
    // mobilde gizlenir, sabit konumlandirmayi klavye+navbar-farkinda
    // StickyActionBar (variant="glass" aboveBottomNav) devralir.
    it('.saveBar mobilde gizlenir, sabit CTA StickyActionBar (glass, aboveBottomNav) ile render edilir', () => {
        expect(mobile).toMatch(/\.saveBar\s*\{[^}]*display:\s*none/)
        expect(mobile).not.toMatch(/\.saveBar\s*\{[^}]*position:\s*fixed/)
        expect(page).toMatch(/import \{ StickyActionBar \} from '@\/components\/mobile\/StickyActionBar'/)
        expect(page).toMatch(/<StickyActionBar variant="glass" aboveBottomNav>/)
    })

    it('.heroCard/.formCard/.settingsCard/.alertCard/.successCard paylasilan .mStatSurface yuzeyine baglanir (kart tekduzeligi duzeltmesi)', () => {
        expect(css).toMatch(/\.heroCard,\s*\.formCard,\s*\.settingsCard,\s*\.alertCard,\s*\.successCard\s*\{[^}]*composes:\s*mStatSurface from global/)
        expect(mobile).not.toMatch(/\.heroCard,\s*\.formCard,\s*\.settingsCard,\s*\.alertCard,\s*\.successCard\s*\{[^}]*background:\s*var\(--m-glass-bg\)/)
        expect(css).toMatch(/@media \(min-width:\s*769px\)\s*\{\s*\.heroCard,\s*\.formCard,\s*\.settingsCard,\s*\.alertCard,\s*\.successCard\s*\{[^}]*background:\s*var\(--stat-bg\)/)
    })
})