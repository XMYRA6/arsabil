import fs from 'fs'
import path from 'path'

const css = fs.readFileSync(path.join(__dirname, 'register.module.css'), 'utf8')

describe('register mobil Liquid Glass Faz 3', () => {
  const mediaIndex = css.indexOf('@media (max-width: 768px)')
  const mobile = css.slice(mediaIndex)

  it('mobil register sayfasi --m-* mesh tokenini kullanir', () => {
    expect(mediaIndex).toBeGreaterThan(-1)
    expect(mobile).toMatch(/\.page\s*\{[^}]*background:\s*var\(--m-mesh\)/)
    expect(mobile).toMatch(/div\.sealCard\s*\{[^}]*background:\s*transparent/)
  })

  it('.authShell paylasilan .mStatSurface yuzeyine baglanir (kart tekduzeligi duzeltmesi)', () => {
    expect(css).toMatch(/\.authShell\s*\{[^}]*composes:\s*mStatSurface from global/)
    expect(mobile).not.toMatch(/\.authShell\s*\{[^}]*background:\s*var\(--m-glass-bg\)/)
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
