import fs from 'fs'
import path from 'path'

const pageTsx = fs.readFileSync(path.join(__dirname, 'page.tsx'), 'utf8')
const homeTsx = fs.readFileSync(path.join(__dirname, 'mobile/HomeMobile.tsx'), 'utf8')
const quickActionsTsx = fs.readFileSync(path.join(__dirname, 'mobile/QuickActionGrid.tsx'), 'utf8')
const css = fs.readFileSync(path.join(__dirname, 'mobile/mobile.module.css'), 'utf8')

describe('HomeMobile Arazi ana ekran sozlesmesi', () => {
  it('/ sayfasi authenticated mobil kullaniciyi HomeMobile yuzeyine gecirir', () => {
    expect(pageTsx).toMatch(/isDesktopViewport === false && status === 'authenticated'/)
    expect(pageTsx).toMatch(/return <HomeMobile \/>/)
  })

  it('ust cubukta bildirim ve mesaj ikonlari var, alt menudeki eylemler tekrarlanmaz', () => {
    expect(homeTsx).toMatch(/<MobileTopBar/)
    expect(homeTsx).toMatch(/href="\/hesapla"/)
    expect(quickActionsTsx).toMatch(/href="\/listings\/new"/)
    expect(quickActionsTsx).not.toMatch(/href="\/marketplace"/)
    expect(quickActionsTsx).not.toMatch(/href="\/inbox"/)
  })

  it('eski cam (--m-*) tokenlarina ve emojiye bagli degil, Arazi tokenlarini kullanir', () => {
    expect(css).not.toMatch(/var\(--m-/)
    expect(css).not.toMatch(/composes:/)
    expect(css).toMatch(/\.homeMobileKok\s*\{[^}]*background:\s*var\(--bg\)/)
    expect(css).toMatch(/\.heroPrimaryAction\s*\{[^}]*background:\s*var\(--blue\)/)
    expect(quickActionsTsx).not.toMatch(/[\u{1F300}-\u{1FAFF}]/u)
  })

  it('BottomNavbar boslugu iki kez uygulanmaz; global main dolgusu korunur', () => {
    expect(homeTsx).toMatch(/<MobileScreen hasBottomNav=\{false\}/)
    expect(css).toMatch(/\.homeRoot\s*\{[^}]*padding:\s*4px 16px calc\(16px \+ var\(--safe-bottom, 0px\)\)/)
  })
})
