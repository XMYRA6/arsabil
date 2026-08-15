import fs from 'fs'
import path from 'path'

const css = fs.readFileSync(path.join(__dirname, 'register.module.css'), 'utf8')

describe('register mobil Liquid Glass Faz 3', () => {
  const mediaIndex = css.indexOf('@media (max-width: 768px)')
  const mobile = css.slice(mediaIndex)

  it('mobil register sayfasi --m-* mesh ve cam shell tokenlarini kullanir', () => {
    expect(mediaIndex).toBeGreaterThan(-1)
    expect(mobile).toMatch(/\.page\s*\{[^}]*background:\s*var\(--m-mesh\)/)
    expect(mobile).toMatch(/\.authShell\s*\{[^}]*background:\s*var\(--m-glass-bg\)/)
    expect(mobile).toMatch(/\.authShell\s*\{[^}]*border:\s*1px solid var\(--m-glass-border\)/)
    expect(mobile).toMatch(/div\.sealCard\s*\{[^}]*background:\s*transparent/)
  })

  it('mobil kayit input ve submit touch/focus sozlesmesini korur', () => {
    expect(mobile).toMatch(/\.sealInput input\s*\{[^}]*height:\s*var\(--input-height-mobile\)/)
    expect(mobile).toMatch(/\.sealInput input:focus\s*\{[^}]*border-color:\s*var\(--m-link\)/)
    expect(mobile).toMatch(/button\.sealSubmit\s*\{[^}]*min-height:\s*var\(--touch-target\)/)
    expect(mobile).toMatch(/button\.sealSubmit\s*\{[^}]*background:\s*var\(--m-grad-btn\)/)
  })

  it('mobil register CSS artik --seal-* token sozlesmesine bagli degil', () => {
    expect(mobile).not.toMatch(/--seal-/)
  })
})
