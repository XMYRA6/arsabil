import fs from 'fs'
import path from 'path'

const pagePath = path.join(process.cwd(), 'src/app/dashboard/favorites/page.tsx')
const cssPath = path.join(process.cwd(), 'src/app/dashboard/favorites/page.module.css')
const page = fs.readFileSync(pagePath, 'utf8')
const css = fs.readFileSync(cssPath, 'utf8')
const mobile = css.match(/@media \(max-width: 768px\) \{[\s\S]*$/)?.[0] ?? ''

describe('dashboard favorites mobile page', () => {
    it('api/favorites kaynagini tuketir ve favori ilan kartlarina link verir', () => {
        expect(page).toMatch(/fetch\('\/api\/favorites'\)/)
        expect(page).toMatch(/href=\{`\/listing\/\$\{favorite\.listingId\}`\}/)
        expect(page).toMatch(/Pazar yerine git/)
    })

    it('mobilde liquid glass kabuk, kart ve bos durum tokenlarini kullanir', () => {
        expect(mobile).toMatch(/\.portfolioShell\s*\{[^}]*background:\s*var\(--m-mesh\),\s*var\(--m-bg\)/)
        expect(mobile).toMatch(/\.heroCard,\s*\.itemCard,\s*\.emptyCard,\s*\.stateCard\s*\{[^}]*background:\s*var\(--m-glass-bg\)/)
        expect(mobile).toMatch(/backdrop-filter:\s*var\(--m-glass-blur\)/)
    })

    it('mobil aksiyon ve metrikler touch-safe ve mono olmalidir', () => {
        expect(mobile).toMatch(/\.primaryLink\s*\{[^}]*min-height:\s*var\(--touch-target\)/)
        expect(mobile).toMatch(/\.heroMetric span,\s*\.metricRow strong\s*\{[^}]*font-family:\s*var\(--m-mono\)/)
        expect(css).toMatch(/font-variant-numeric:\s*tabular-nums/)
    })
})