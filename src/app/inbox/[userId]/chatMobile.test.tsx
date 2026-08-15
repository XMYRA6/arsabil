import fs from 'fs'
import path from 'path'

const pagePath = path.join(__dirname, 'page.tsx')
const cssPath = path.join(__dirname, 'page.module.css')
const bottomNavCss = fs.readFileSync(path.join(process.cwd(), 'src/components/layout/BottomNavbar.tsx'), 'utf8')

describe('mobil sohbet detay Faz 4', () => {
  const page = fs.existsSync(pagePath) ? fs.readFileSync(pagePath, 'utf8') : ''
  const css = fs.existsSync(cssPath) ? fs.readFileSync(cssPath, 'utf8') : ''
  const mobile = css.slice(css.indexOf('@media (max-width: 768px)'))

  it('/inbox/[userId] BottomNavbar prefix gizleme sozlesmesine girer', () => {
    expect(bottomNavCss).toMatch(/HIDDEN_PREFIXES = \['\/inbox\//)
  })

  it('sayfa mevcut messages API sozlesmesini kullanir ve mesaj gonderir', () => {
    expect(page).toMatch(/fetch\(`\/api\/messages\/\$\{userId\}`\)/)
    expect(page).toMatch(/fetch\('\/api\/messages'/)
    expect(page).toMatch(/receiverId:\s*userId/)
  })

  it('mobil chat kabugu ve appbar Liquid Glass tokenlarini kullanir', () => {
    expect(mobile).toMatch(/\.chatShell\s*\{[^}]*background:\s*var\(--m-mesh\)/)
    expect(mobile).toMatch(/\.chatTopbar\s*\{[^}]*background:\s*var\(--m-glass-bg\)/)
    expect(mobile).toMatch(/\.messagePane\s*\{[^}]*padding-bottom:\s*calc\(92px \+ var\(--safe-bottom\)\)/)
  })

  it('composer sticky ve klavye-safe alanda kalir', () => {
    expect(mobile).toMatch(/\.composer\s*\{[^}]*position:\s*fixed/)
    expect(mobile).toMatch(/\.composer\s*\{[^}]*bottom:\s*var\(--safe-bottom\)/)
    expect(mobile).toMatch(/\.composerInner\s*\{[^}]*background:\s*var\(--m-glass-bg\)/)
    expect(mobile).toMatch(/\.textarea\s*\{[^}]*font-size:\s*16px/)
  })

  it('mesaj balonlari m gradient ve cam yuzey kullanir', () => {
    expect(mobile).toMatch(/\.bubbleMine\s*\{[^}]*background:\s*var\(--m-grad-btn\)/)
    expect(mobile).toMatch(/\.bubbleTheirs\s*\{[^}]*background:\s*var\(--m-glass-bg\)/)
  })
})

describe('inbox sohbet detay — durum notu paylasilan yuzeye baglanir (2026-08-15)', () => {
  const css = fs.existsSync(cssPath) ? fs.readFileSync(cssPath, 'utf8') : ''
  const mobile = css.slice(css.indexOf('@media (max-width: 768px)'))

  it('.stateCard paylasilan .mStatSurface yuzeyine baglanir', () => {
    expect(mobile).toMatch(/\.stateCard\s*\{[^}]*composes:\s*mStatSurface from global/)
    expect(mobile).not.toMatch(/\.stateCard\s*\{[^}]*background:\s*var\(--m-glass-bg\)/)
  })
})
