import fs from 'fs'
import path from 'path'

const pageTsx = fs.readFileSync(path.join(__dirname, 'page.tsx'), 'utf8')
const homeTsx = fs.readFileSync(path.join(__dirname, 'mobile/HomeMobile.tsx'), 'utf8')
const quickActionsTsx = fs.readFileSync(path.join(__dirname, 'mobile/QuickActionGrid.tsx'), 'utf8')
const css = fs.readFileSync(path.join(__dirname, 'mobile/mobile.module.css'), 'utf8')

describe('HomeMobile Faz 3 ana ekran sozlesmesi', () => {
  const mediaIndex = css.indexOf('@media (max-width: 768px)')
  const mobile = css.slice(mediaIndex)

  it('/ sayfasi authenticated mobil kullaniciyi HomeMobile yuzeyine gecirir', () => {
    expect(pageTsx).toMatch(/isDesktopViewport === false && status === 'authenticated'/)
    expect(pageTsx).toMatch(/return <HomeMobile \/>/)
  })

  it('HomeMobile ilk viewportta ozet hero, stat kartlari ve gercek urun aksiyonlari tasir', () => {
    expect(homeTsx).toMatch(/styles\.mobileHero/)
    expect(homeTsx).toMatch(/styles\.heroPrimaryAction/)
    expect(homeTsx).toMatch(/<QuickActionGrid stats=\{data\.stats\}/)
    expect(homeTsx).toMatch(/href="\/hesapla"/)
    expect(quickActionsTsx).toMatch(/href="\/marketplace"/)
  })

  it('mobil hero ve kartlar Liquid Glass tokenlarini kullanir', () => {
    expect(mediaIndex).toBeGreaterThan(-1)
    expect(mobile).toMatch(/\.homeMobileKok\s*\{[^}]*background:\s*var\(--m-mesh\)/)
    expect(mobile).toMatch(/\.mobileHero\s*\{[^}]*background:\s*var\(--m-grad-accent\)/)
    expect(mobile).toMatch(/\.statGrid\s*\{[^}]*background:\s*var\(--m-glass-bg\)/)
    expect(mobile).toMatch(/\.actionTile\s*\{[^}]*min-height:\s*var\(--touch-target\)/)
  })

  it('BottomNavbar boslugu iki kez uygulanmaz; global main dolgusu korunur', () => {
    expect(homeTsx).toMatch(/<MobileScreen hasBottomNav=\{false\}>/)
    expect(mobile).toMatch(/\.homeRoot\s*\{[^}]*padding:\s*0 14px calc\(16px \+ var\(--safe-bottom\)\)/)
  })
})
