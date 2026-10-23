import fs from 'fs'
import path from 'path'

const tsx = fs.readFileSync(path.join(process.cwd(), 'src/components/ScenarioCompare.tsx'), 'utf8')
const css = fs.readFileSync(path.join(process.cwd(), 'src/components/ScenarioCompare.module.css'), 'utf8')
const mobile = css.slice(css.indexOf('@media (max-width: 768px)'))

describe('ScenarioCompare Arazi yüzeyi', () => {
    it('eski cam (--m-*) ve --seal-* tokenlarına bağlı değil', () => {
        expect(css).not.toMatch(/var\(--m-/)
        expect(css).not.toMatch(/--seal-/)
    })

    it('mobil senaryo secimi tablist mantiginda segment butonlari sunar', () => {
        expect(tsx).toMatch(/className=\{styles\.scenarioTabs\} role="tablist"/)
        expect(tsx).toMatch(/role="tab"/)
        expect(tsx).toMatch(/aria-selected=\{i === activeCard\}/)
        expect(tsx).toMatch(/selectCard\(i\)/)
    })

    it('masaustunde tablo, mobilde kartlar gorunur', () => {
        const desktop = css.slice(0, css.indexOf('@media (max-width: 768px)'))
        expect(desktop).toMatch(/\.mobileCards\s*\{[^}]*display:\s*none/)
        expect(mobile).toMatch(/\.tableWrap\s*\{[^}]*display:\s*none/)
        expect(mobile).toMatch(/\.mobileCards\s*\{[^}]*display:\s*block/)
    })

    it('en uygun sutun yesil Onerilen rozetiyle isaretlenir, aktif sekme amber', () => {
        expect(css).toMatch(/\.thScenarioBest::after\s*\{[^}]*content:\s*'Önerilen'/)
        expect(mobile).toMatch(/\.scenarioTabActive\s*\{[^}]*background:\s*var\(--amber\)/)
    })

    it('aksiyonlar icon button ve touch-safe', () => {
        expect(tsx).toMatch(/aria-label="PDF indir"/)
        expect(tsx).toMatch(/aria-label=\{sharing \? 'Link oluşturuluyor' : 'Paylaş'\}/)
        expect(tsx).toMatch(/aria-label=\{copied \? 'Kopyalandı' : 'Kopyala'\}/)
        expect(mobile).toMatch(/\.actionBtn,\s*\.copyBtn\s*\{[^}]*min-width:\s*var\(--touch-target\)/)
    })
})
