import fs from 'fs'
import path from 'path'

const pagePath = path.join(__dirname, 'page.tsx')
const cssPath = path.join(__dirname, 'page.module.css')
const offersRoute = fs.readFileSync(path.join(process.cwd(), 'src/app/api/offers/route.ts'), 'utf8')

describe('listing offers mobil Faz 4', () => {
  const page = fs.existsSync(pagePath) ? fs.readFileSync(pagePath, 'utf8') : ''
  const css = fs.existsSync(cssPath) ? fs.readFileSync(cssPath, 'utf8') : ''
  const mobile = css.slice(css.indexOf('@media (max-width: 768px)'))

  it('offers API listingId query ile GET listeleme destekler', () => {
    expect(offersRoute).toMatch(/export async function GET/)
    expect(offersRoute).toMatch(/searchParams\.get\('listingId'\)/)
    expect(offersRoute).toMatch(/prisma\.offer\.findMany/)
  })

  it('sayfa ilan, teklif listesi ve teklif olusturma APIlerini kullanir', () => {
    expect(page).toMatch(/fetch\(`\/api\/listings\/\$\{listingId\}`\)/)
    expect(page).toMatch(/fetch\(`\/api\/offers\?listingId=\$\{listingId\}`\)/)
    expect(page).toMatch(/fetch\('\/api\/offers'/)
    expect(page).toMatch(/offeredShare/)
  })

  it('mobil teklif sayfasi Liquid Glass kartlari ve status badge tasir', () => {
    expect(mobile).toMatch(/\.offersShell\s*\{[^}]*background:\s*var\(--m-mesh\)/)
    expect(mobile).toMatch(/\.summaryCard\s*\{[^}]*background:\s*var\(--m-grad-accent\)/)
    expect(mobile).toMatch(/\.offerCard\s*\{[^}]*background:\s*var\(--m-glass-bg\)/)
    expect(mobile).toMatch(/\.statusBadge\s*\{[^}]*border-radius:\s*var\(--m-r-chip\)/)
  })

  it('mobil create action touch target ve safe-area ile korunur', () => {
    expect(mobile).toMatch(/\.createPanel\s*\{[^}]*padding-bottom:\s*calc\(16px \+ var\(--safe-bottom\)\)/)
    expect(mobile).toMatch(/\.submitButton\s*\{[^}]*min-height:\s*var\(--touch-target\)/)
    expect(mobile).toMatch(/\.submitButton\s*\{[^}]*background:\s*var\(--m-grad-btn\)/)
  })
})
