import fs from 'fs'
import path from 'path'

const tsx = fs.readFileSync(path.join(process.cwd(), 'src/components/ScenarioCompare.tsx'), 'utf8')
const css = fs.readFileSync(path.join(process.cwd(), 'src/components/ScenarioCompare.module.css'), 'utf8')
const mobile = css.match(/@media \(max-width: 768px\) \{[\s\S]*$/)?.[0] ?? ''

describe('ScenarioCompare Faz 5 mobil yuzeyi', () => {
    it('mobil senaryo secimi tablist mantiginda segment butonlari sunar', () => {
        expect(tsx).toMatch(/className=\{styles\.scenarioTabs\} role="tablist"/)
        expect(tsx).toMatch(/role="tab"/)
        expect(tsx).toMatch(/aria-selected=\{i === activeCard\}/)
        expect(tsx).toMatch(/selectCard\(i\)/)
    })

    it('mobil aksiyonlar --m-* liquid glass tokenlarini kullanir, --seal-* kullanmaz', () => {
        expect(mobile).toMatch(/backdrop-filter:\s*var\(--m-glass-blur\)/)
        expect(mobile).not.toMatch(/--seal-/)
    })

    it('.scenarioCard paylasilan .mStatSurface yuzeyine baglanir', () => {
        expect(css).toMatch(/\.scenarioCard\s*\{[^}]*composes:\s*mStatSurface from global/)
        expect(mobile).not.toMatch(/\.scenarioCard\s*\{[^}]*background:\s*var\(--m-glass-bg\)/)
    })

    it('mobil aksiyonlar icon button ve touch-safe olmalidir', () => {
        expect(tsx).toMatch(/aria-label="PDF indir"/)
        expect(tsx).toMatch(/aria-label=\{sharing \? 'Link oluşturuluyor' : 'Paylaş'\}/)
        expect(tsx).toMatch(/aria-label=\{copied \? 'Kopyalandı' : 'Kopyala'\}/)
        expect(mobile).toMatch(/\.actionBtn,\s*\.copyBtn\s*\{[^}]*min-width:\s*var\(--touch-target\)/)
    })

    it('mobil kart degerleri mono tabular sayi ile akar', () => {
        expect(mobile).toMatch(/\.cardValue\s*\{[^}]*font-family:\s*var\(--m-mono\)/)
        expect(mobile).toMatch(/\.cardValue\s*\{[^}]*font-variant-numeric:\s*tabular-nums/)
    })
})