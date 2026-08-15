import fs from 'fs'
import path from 'path'

const pagePath = path.join(process.cwd(), 'src/app/dashboard/listings/page.tsx')
const cssPath = path.join(process.cwd(), 'src/app/dashboard/listings/page.module.css')
const apiPath = path.join(process.cwd(), 'src/app/api/listings/route.ts')
const page = fs.readFileSync(pagePath, 'utf8')
const css = fs.readFileSync(cssPath, 'utf8')
const api = fs.readFileSync(apiPath, 'utf8')
const mobile = css.match(/@media \(max-width: 768px\) \{[\s\S]*$/)?.[0] ?? ''

describe('dashboard listings mobile page', () => {
    it('kullanici ilanlari icin /api/listings?mine=1 kaynagini kullanir', () => {
        expect(page).toMatch(/fetch\('\/api\/listings\?mine=1'\)/)
        expect(api).toMatch(/searchParams\.get\('mine'\) === '1'/)
        expect(api).toMatch(/where = \{ userId: session\.user\.id as string \}/)
    })

    it('ilanlar icin segmentli aktif/taslak filtreleri sunar', () => {
        expect(page).toMatch(/const FILTERS/)
        expect(page).toMatch(/role="tablist"/)
        expect(page).toMatch(/filter === 'active'/)
        expect(page).toMatch(/filter === 'draft'/)
    })

    it('mobil kabuk ve bos durum liquid glass tokenlarini kullanir', () => {
        expect(mobile).toMatch(/\.portfolioShell\s*\{[^}]*background:\s*var\(--m-mesh\),\s*var\(--m-bg\)/)
        expect(mobile).toMatch(/\.heroCard,\s*\.emptyCard,\s*\.stateCard\s*\{[^}]*background:\s*var\(--m-glass-bg\)/)
        expect(mobile).toMatch(/backdrop-filter:\s*var\(--m-glass-blur\)/)
    })

    it('Listing tipi photos alanini tasir, .itemCard fotografli editorialListingCard yuzeyine baglanir', () => {
        expect(page).toMatch(/photos\?:\s*string\[\]\s*\|\s*null/)
        expect(css).toMatch(/\.itemCard\s*\{[^}]*composes:\s*editorialListingCard from global/)
        expect(mobile).not.toMatch(/\.itemCard\s*\{[^}]*background:\s*var\(--m-glass-bg\)/)
    })

    it('.itemCard fotograf alani (foto varsa Image, yoksa gradyan placeholder) ve serif baslik icerir', () => {
        expect(page).toMatch(/styles\.itemPhoto/)
        expect(page).toMatch(/listing\.photos\?\.\[0\]/)
        expect(css).toMatch(/\.itemCard h2\s*\{[^}]*font-family:\s*var\(--m-font-serif\)/)
    })

    it('mobil segment ve yeni ilan aksiyonu touch-safe premium gorunumdedir', () => {
        expect(mobile).toMatch(/\.segmentedTabs\s*\{[^}]*background:\s*var\(--m-fill\)/)
        expect(mobile).toMatch(/\.segment,\s*\.segmentActive\s*\{[^}]*min-height:\s*var\(--touch-target\)/)
        expect(mobile).toMatch(/\.segmentActive\s*\{[^}]*background:\s*var\(--m-grad-btn\)/)
        expect(mobile).toMatch(/\.primaryLink\s*\{[^}]*min-height:\s*var\(--touch-target\)/)
    })
})