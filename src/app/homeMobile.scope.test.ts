import fs from 'fs'
import path from 'path'

const pageTsx = fs.readFileSync(path.join(__dirname, 'page.tsx'), 'utf8')
const homeTsx = fs.readFileSync(path.join(__dirname, 'mobile/HomeMobile.tsx'), 'utf8')
const css = fs.readFileSync(path.join(__dirname, 'mobile/mobile.module.css'), 'utf8')

describe('HomeMobile Ozet ekrani sozlesmesi', () => {
  it('/ sayfasi authenticated mobil kullaniciyi HomeMobile yuzeyine gecirir', () => {
    expect(pageTsx).toMatch(/isDesktopViewport === false && status === 'authenticated'/)
    expect(pageTsx).toMatch(/return <HomeMobile \/>/)
  })

  it('logo, ust cubuk ve bildirim cani yok; gelen kutusu, hesaplamalar ve senaryolar var', () => {
    expect(homeTsx).not.toMatch(/ArsabilLogo|MobileTopBar|IconBell/)
    expect(homeTsx).toMatch(/<GelenKutusu/)
    expect(homeTsx).toMatch(/<RecentReportsList/)
    expect(homeTsx).toMatch(/<SenaryolarListesi/)
  })

  it('eski cam (--m-*) tokenlarina bagli degil, Arazi tokenlarini kullanir', () => {
    expect(css).not.toMatch(/var\(--m-/)
    expect(css).not.toMatch(/composes:/)
    expect(css).toMatch(/\.homeMobileKok\s*\{[^}]*background:\s*var\(--bg\)/)
    expect(css).toMatch(/\.sekmeAktif\s*\{[^}]*background:\s*var\(--amber\)/)
  })

  it('BottomNavbar boslugu iki kez uygulanmaz; global main dolgusu korunur', () => {
    expect(homeTsx).toMatch(/<MobileScreen hasBottomNav=\{false\}/)
    expect(css).toMatch(/\.homeRoot\s*\{[^}]*padding:\s*calc\(16px \+ var\(--safe-top, 0px\)\) 16px calc\(16px \+ var\(--safe-bottom, 0px\)\)/)
  })
})
