import fs from 'fs'
import path from 'path'

const pagePath = path.join(process.cwd(), 'src/app/dashboard/reports/page.tsx')
const cssPath = path.join(process.cwd(), 'src/app/dashboard/reports/page.module.css')
const page = fs.readFileSync(pagePath, 'utf8')
const css = fs.readFileSync(cssPath, 'utf8')
const mobile = css.match(/@media \(max-width: 768px\) \{[\s\S]*$/)?.[0] ?? ''

describe('dashboard reports mobile liquid glass scope', () => {
    it('sayfa kendi CSS module dosyasini kullanir ve dashboard.module.css bagini koparir', () => {
        expect(page).toMatch(/import styles from '\.\/page\.module\.css'/)
        expect(page).not.toMatch(/dashboard\.module\.css/)
    })

    it('raporlar icin segmented filtreleri ve ilan/taslak ayrimini sunar', () => {
        expect(page).toMatch(/const FILTERS/)
        expect(page).toMatch(/role="tablist"/)
        expect(page).toMatch(/role="tab"/)
        expect(page).toMatch(/filter === 'listed'/)
        expect(page).toMatch(/filter === 'draft'/)
        expect(page).toMatch(/fetch\("\/api\/reports"\)/)
    })

    it('mobil kabuk --m-* mesh ve cam yuzey tokenlarini kullanir', () => {
        expect(mobile).toMatch(/\.reportsShell\s*\{[^}]*background:\s*var\(--m-mesh\),\s*var\(--m-bg\)/)
        expect(mobile).toMatch(/\.heroCard,\s*\.reportCard,\s*\.emptyCard,\s*\.stateCard\s*\{[^}]*background:\s*var\(--m-glass-bg\)/)
        expect(mobile).toMatch(/backdrop-filter:\s*var\(--m-glass-blur\)/)
    })

    it('mobil metrikler mono font ve tabular sayi gorunumune sahip olur', () => {
        expect(mobile).toMatch(/\.metricValue,\s*\.metricGrid strong,\s*\.valueRows strong\s*\{[^}]*font-family:\s*var\(--m-mono\)/)
        expect(css).toMatch(/font-variant-numeric:\s*tabular-nums/)
    })

    it('mobil segmentler ve PDF aksiyonu touch-safe premium butonlara donusur', () => {
        expect(mobile).toMatch(/\.segmentedTabs\s*\{[^}]*background:\s*var\(--m-fill\)/)
        expect(mobile).toMatch(/\.segment,\s*\.segmentActive\s*\{[^}]*min-height:\s*var\(--touch-target\)/)
        expect(mobile).toMatch(/\.segmentActive\s*\{[^}]*background:\s*var\(--m-grad-btn\)/)
        expect(mobile).toMatch(/\.reportPdfAction button\s*\{[^}]*min-height:\s*var\(--touch-target\)/)
    })
})