import fs from 'fs'
import path from 'path'

const css = fs.readFileSync(path.join(__dirname, '../Navbar.module.css'), 'utf8')
const tsx = fs.readFileSync(path.join(__dirname, '../Navbar.tsx'), 'utf8')

describe('Navbar ana keşif linkleri', () => {
  it('masaüstü + mobil menü /deger ve /akif linklerini içerir', () => {
    for (const href of ['/hesapla', '/deger', '/akif', '/marketplace']) {
      expect(tsx.includes(`href="${href}"`)).toBe(true)
    }
    // hem masaüstü (Değer) hem mobil menü (Değer Kartı) etiketi
    expect(tsx).toMatch(/>\s*Değer\s*</)
    expect(tsx).toMatch(/>\s*Akif\s*</)
  })
})

describe('Navbar profesyonel token hizalamasi', () => {
  it('topbar yuksekligi global topbar tokenini kullanir', () => {
    const match = css.match(/\.navbar\s*\{([^}]*)\}/)
    expect(match).not.toBeNull()
    expect(match![1]).toMatch(/height:\s*var\(--topbar-height,\s*64px\)/)
  })

  it('logo primary token rengini kullanir', () => {
    const match = css.match(/\.logoText\s*\{([^}]*)\}/)
    expect(match).not.toBeNull()
    expect(match![1]).toMatch(/color:\s*var\(--primary\)/)
  })

  it('aktif desktop nav link primary renk ve bottom border kullanir', () => {
    const base = css.match(/\.desktopLinks a\s*\{([^}]*)\}/)
    const active = css.match(/\.desktopLinks \.activeLink\s*\{([^}]*)\}/)
    expect(base).not.toBeNull()
    expect(active).not.toBeNull()
    expect(base![1]).toMatch(/border-bottom:\s*2px solid transparent/)
    expect(active![1]).toMatch(/color:\s*var\(--primary\)/)
    expect(active![1]).toMatch(/border-bottom-color:\s*var\(--primary\)/)
  })

  it('navbar CTA accent token ailesini kullanir', () => {
    const match = css.match(/\.primaryBtn\s*\{([^}]*)\}/)
    expect(match).not.toBeNull()
    expect(match![1]).toMatch(/var\(--accent\)/)
    expect(match![1]).toMatch(/var\(--accent-2\)/)
    expect(match![1]).toMatch(/var\(--accent-rgb\)/)
  })
})
