import fs from 'fs'
import path from 'path'

// Yönetim paneli Figma 12 ile "Arazi" diline geçti (2026-10-24). Eski cam kapsam testlerinin yerini alır.
const css = fs.readFileSync(path.join(__dirname, 'admin.module.css'), 'utf8')
const topBarCss = fs.readFileSync(path.join(process.cwd(), 'src/components/layout/AdminTopBar.module.css'), 'utf8')
const layout = fs.readFileSync(path.join(__dirname, 'layout.tsx'), 'utf8')
const districtPage = fs.readFileSync(path.join(__dirname, 'district-prices/page.tsx'), 'utf8')
const settingsPage = fs.readFileSync(path.join(__dirname, 'settings/page.tsx'), 'utf8')
const mobile = css.slice(css.indexOf('@media (max-width: 900px)'))

describe('admin Arazi dili', () => {
  it('eski cam (--m-*, --seal-*) ve sabit hex renkleri kullanmaz', () => {
    for (const c of [css, topBarCss]) {
      expect(c).not.toMatch(/var\(--m-/)
      expect(c).not.toMatch(/--seal-/)
    }
  })

  it('layout menü ve içerik landmark\'larını sunar, aktif öğe amber', () => {
    expect(layout).toMatch(/<aside[^>]*className=\{styles\.sidebar\}/)
    expect(layout).toMatch(/<nav[^>]*className=\{styles\.sidebarNav\}/)
    expect(layout).toMatch(/<main[^>]*className=\{styles\.mainContent\}/)
    expect(css).toMatch(/\.navItemActive\s*\{[^}]*var\(--amber-soft\)/)
  })

  it('mobilde menü yatay çip satırına, tablo kart listesine döner', () => {
    expect(mobile).toMatch(/\.adminShell\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)/)
    expect(mobile).toMatch(/\.sidebarNav\s*\{[^}]*flex-direction:\s*row/)
    expect(mobile).toMatch(/\.tableWrap\s*\{[^}]*display:\s*none/)
    expect(mobile).toMatch(/\.mobileCardList\s*\{[^}]*display:\s*block/)
  })

  it('ilçe fiyatları masaüstü tablo + mobil DataCard listesini korur', () => {
    expect(districtPage).toMatch(/className=\{styles\.tableWrap\}/)
    expect(districtPage).toMatch(/className=\{styles\.mobileCardList\}/)
    expect(districtPage).toMatch(/<DataCard[\s\S]*title=\{`\$\{p\.il\} — \$\{p\.ilce\}`\}/)
  })

  it('motor ayarları katsayı satırları düzenlenebilir kalır (sıra/varsayılan/sil)', () => {
    expect(settingsPage).toMatch(/className=\{styles\.profitLevelRow\}/)
    expect(settingsPage).toMatch(/title="Yukarı"/)
    expect(settingsPage).toMatch(/title="Varsayılan yap"/)
    expect(mobile).toMatch(/\.profitLevelHeader\s*\{[^}]*display:\s*none/)
  })
})
