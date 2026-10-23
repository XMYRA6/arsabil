import fs from 'fs'
import path from 'path'

// Panel (Dashboard, Raporlarım, …) Figma 10 ile "Arazi" diline geçti (2026-10-24).
// Eski cam (--m-*, --seal-*) kapsam testlerinin yerini alır.
const read = (...p: string[]) => fs.readFileSync(path.join(__dirname, ...p), 'utf8')
const dosyalar: [string, string][] = [
  ['panelShell.module.css', read('panelShell.module.css')],
  ['page.module.css', read('page.module.css')],
  ['reports/page.module.css', read('reports', 'page.module.css')],
]

describe('panel Arazi dili', () => {
  it.each(dosyalar)('%s eski cam (--m-*) ve --seal-* tokenlarını kullanmaz', (_ad, css) => {
    expect(css).not.toMatch(/var\(--m-/)
    expect(css).not.toMatch(/--seal-/)
  })

  it('yan menü kartı Arazi yüzeyine, aktif öğe amber-soft\'a bağlı', () => {
    const shell = dosyalar[0][1]
    expect(shell).toMatch(/\.sidebar\s*\{[^}]*background:\s*var\(--surface\)/)
    expect(shell).toMatch(/\.navItemActive\s*\{[^}]*var\(--amber-soft\)/)
    expect(shell).toMatch(/\.rozet\s*\{[^}]*background:\s*var\(--blue\)/)
  })

  it('mobilde yan menü yatay çip satırına döner (alt sayfalara erişim kaybolmaz)', () => {
    const mobile = dosyalar[0][1].slice(dosyalar[0][1].indexOf('@media (max-width: 900px)'))
    expect(mobile).toMatch(/\.shell\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)/)
    expect(mobile).toMatch(/\.nav\s*\{[^}]*flex-direction:\s*row/)
  })

  it('durum rozetleri semantik renkleri korur (bekliyor amber, kabul yeşil, red kırmızı)', () => {
    const css = dosyalar[1][1]
    expect(css).toMatch(/\.statusPending\s*\{[^}]*var\(--amber-soft\)/)
    expect(css).toMatch(/\.statusAccepted\s*\{[^}]*var\(--ok\)/)
    expect(css).toMatch(/\.statusRejected\s*\{[^}]*var\(--bad\)/)
  })
})
