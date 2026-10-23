import fs from 'fs'
import path from 'path'

// Kimlik ekranları Figma 09 ile "Arazi" diline geçti (2026-10-24). Eski cam
// (--m-*, --seal-*) kapsam testlerinin yerini alır.
const css = fs.readFileSync(path.join(__dirname, 'AuthShell.module.css'), 'utf8')
const read = (...p: string[]) => fs.readFileSync(path.join(__dirname, '..', '..', ...p), 'utf8')
const sayfalar: [string, string][] = [
  ['login', read('app', 'login', 'page.tsx')],
  ['register', read('app', 'register', 'page.tsx')],
  ['reset-password', read('app', 'reset-password', '[token]', 'page.tsx')],
  ['verify-email', read('app', 'verify-email', '[token]', 'page.tsx')],
]

describe('kimlik ekranları Arazi dili', () => {
  it('eski cam ve seal tokenlarını kullanmaz', () => {
    expect(css).not.toMatch(/var\(--m-/)
    expect(css).not.toMatch(/--seal-/)
  })

  it.each(sayfalar)('%s sayfası ortak AuthShell kullanır, satır içi stil ve dangerouslySetInnerHTML yok', (_ad, tsx) => {
    expect(tsx).toMatch(/<AuthShell>/)
    expect(tsx).not.toMatch(/dangerouslySetInnerHTML/)
    expect(tsx).not.toMatch(/style=\{\{/)
  })

  it('iki kolonlu masaüstü, mobilde tek kolon ve marka paneli gizli', () => {
    expect(css).toMatch(/\.page\s*\{[^}]*grid-template-columns:\s*47% 53%/)
    const mobile = css.slice(css.indexOf('@media (max-width: 900px)'))
    expect(mobile).toMatch(/\.page\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)/)
    expect(mobile).toMatch(/\.brand\s*\{[^}]*display:\s*none/)
  })

  it('girdi 48px yüksekliği ve 16px yazıyı korur (iOS yakınlaştırmasını önler)', () => {
    expect(css).toMatch(/\.input\s*\{[^}]*min-height:\s*48px/)
    expect(css).toMatch(/\.input\s*\{[^}]*font:\s*500 16px/)
  })

  it('birincil eylem mavi, hata/başarı bannerı semantik renkleri korur', () => {
    expect(css).toMatch(/\.submit\s*\{[^}]*background:\s*var\(--blue\)/)
    expect(css).toMatch(/\.bannerError\s*\{[^}]*var\(--bad\)/)
    expect(css).toMatch(/\.bannerSuccess\s*\{[^}]*var\(--ok\)/)
  })
})
