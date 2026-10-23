import fs from 'fs'
import path from 'path'

const pagePath = path.join(__dirname, 'page.tsx')
const cssPath = path.join(__dirname, 'page.module.css')
const offersRoute = fs.readFileSync(path.join(process.cwd(), 'src/app/api/offers/route.ts'), 'utf8')

describe('listing offers sayfası', () => {
  const page = fs.readFileSync(pagePath, 'utf8')
  const css = fs.readFileSync(cssPath, 'utf8')

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

  // Figma 07 (Teklifler): Arazi diline geçti; eski cam (--m-*) kapsam testinin yerini aldı.
  it('Arazi tokenlarını kullanır, eski cam tokenlarını kullanmaz', () => {
    expect(css).not.toMatch(/var\(--m-/)
    expect(css).toMatch(/\.offerCard\s*\{[^}]*background:\s*var\(--surface\)/)
    expect(css).toMatch(/\.statusPENDING\s*\{[^}]*var\(--amber-soft\)/)
    expect(css).toMatch(/\.submitButton\s*\{[^}]*background:\s*var\(--blue\)/)
  })

  it('mobilde teklif formu listenin üstüne çıkar ve safe-area ile korunur', () => {
    const mobile = css.slice(css.indexOf('@media (max-width: 900px)'))
    expect(mobile).toMatch(/\.createPanel\s*\{[^}]*order:\s*-1/)
    expect(mobile).toMatch(/\.createPanel\s*\{[^}]*var\(--safe-bottom,\s*0px\)/)
  })

  it('teklif kartı yalnızca tanımlı durumları (Bekliyor/Kabul/Red) rozetler', () => {
    expect(page).toMatch(/PENDING: 'Bekliyor'/)
    expect(page).toMatch(/ACCEPTED: 'Kabul edildi'/)
    expect(page).toMatch(/REJECTED: 'Reddedildi'/)
  })
})
