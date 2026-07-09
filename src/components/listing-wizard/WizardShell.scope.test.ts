import fs from 'fs'
import path from 'path'

const css = fs.readFileSync(path.join(__dirname, 'WizardShell.module.css'), 'utf8')

describe('WizardShell mobil CSS kapsam guard', () => {
  const mediaIndex = css.indexOf('@media (max-width: 768px)')

  it('mobil media query en az bir kez tanımlı olmalı', () => {
    expect(mediaIndex).toBeGreaterThan(-1)
  })

  it('.pageTitle masaüstünde görünür, mobilde gizli olmalı (AppBar zaten başlığı gösteriyor)', () => {
    const baseIndex = css.indexOf('.pageTitle {')
    expect(baseIndex).toBeGreaterThan(-1)
    expect(baseIndex).toBeLessThan(mediaIndex)
    const baseBlock = css.slice(baseIndex, css.indexOf('}', baseIndex))
    expect(baseBlock).not.toMatch(/display:\s*none/)
    const mobileBlock = css.slice(mediaIndex)
    expect(mobileBlock).toMatch(/\.pageTitle\s*\{[^}]*display:\s*none/)
  })

  it('.stepTitle masaüstünde görünür, mobilde gizli olmalı (AppBar aynı metni gösteriyor, çift başlık önlenir)', () => {
    const baseIndex = css.indexOf('.stepTitle {')
    expect(baseIndex).toBeGreaterThan(-1)
    expect(baseIndex).toBeLessThan(mediaIndex)
    const baseBlock = css.slice(baseIndex, css.indexOf('}', baseIndex))
    expect(baseBlock).not.toMatch(/display:\s*none/)
    const mobileBlock = css.slice(mediaIndex)
    expect(mobileBlock).toMatch(/\.stepTitle\s*\{[^}]*display:\s*none/)
  })

  it('.nav masaüstünde görünür, mobilde gizli olmalı (StickyActionBar yerini alıyor)', () => {
    const baseIndex = css.indexOf('.nav {')
    expect(baseIndex).toBeGreaterThan(-1)
    expect(baseIndex).toBeLessThan(mediaIndex)
    const baseBlock = css.slice(baseIndex, css.indexOf('}', baseIndex))
    expect(baseBlock).not.toMatch(/display:\s*none/)
    const mobileBlock = css.slice(mediaIndex)
    expect(mobileBlock).toMatch(/\.nav\s*\{[^}]*display:\s*none/)
  })

  it('.container mobilde StickyActionBar+BottomNavbar için alt boşluk bırakmalı', () => {
    const mobileBlock = css.slice(mediaIndex)
    expect(mobileBlock).toMatch(/\.container\s*\{[^}]*calc\(var\(--bottomnav-height\)\s*\+\s*76px\)/)
  })
})
