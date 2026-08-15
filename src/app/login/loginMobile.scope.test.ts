import fs from 'fs'
import path from 'path'

const css = fs.readFileSync(path.join(__dirname, 'login.module.css'), 'utf8')

describe('login mobil Liquid Glass Faz 3', () => {
  const mediaIndex = css.indexOf('@media (max-width: 768px)')
  const mobile = css.slice(mediaIndex)

  it('mobil auth sayfasi --m-* mesh ve cam panel tokenlarini kullanir', () => {
    expect(mediaIndex).toBeGreaterThan(-1)
    expect(mobile).toMatch(/\.page\s*\{[^}]*background:\s*var\(--m-mesh\)/)
    expect(mobile).toMatch(/\.panel,\s*\.authShell\s*\{[^}]*background:\s*var\(--m-glass-bg\)/)
    expect(mobile).toMatch(/\.formSide,\s*\.formPanel\s*\{[^}]*background:\s*transparent/)
  })

  it('mobil input ve submit 44px hedef, m token focus ve gradient kullanir', () => {
    expect(mobile).toMatch(/\.input\s*\{[^}]*height:\s*var\(--input-height-mobile\)/)
    expect(mobile).toMatch(/\.input:focus\s*\{[^}]*border-color:\s*var\(--m-link\)/)
    expect(mobile).toMatch(/\.submitBtn\s*\{[^}]*min-height:\s*var\(--touch-target\)/)
    expect(mobile).toMatch(/\.submitBtn\s*\{[^}]*background:\s*var\(--m-grad-btn\)/)
  })

  it('mobil auth CSS artik --seal-* token sozlesmesine bagli degil', () => {
    expect(mobile).not.toMatch(/--seal-/)
  })
})
