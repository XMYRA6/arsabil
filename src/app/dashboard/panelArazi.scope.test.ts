import fs from 'fs'
import path from 'path'

// Panel (Dashboard, Raporlarım, …) Figma 10 ile "Arazi" diline geçti (2026-10-24).
// Eski cam (--m-*, --seal-*) kapsam testlerinin yerini alır.
const read = (...p: string[]) => fs.readFileSync(path.join(__dirname, ...p), 'utf8')
const dosyalar: [string, string][] = [
  ['panelShell.module.css', fs.readFileSync(path.join(process.cwd(), 'src/components/panel/PanelShell.module.css'), 'utf8')],
  ['page.module.css', read('page.module.css')],
  ['reports/page.module.css', read('reports', 'page.module.css')],
  ['panelListe.module.css', read('panelListe.module.css')],
  ['inbox.module.css', fs.readFileSync(path.join(process.cwd(), 'src/app/inbox/inbox.module.css'), 'utf8')],
  ['profile/profile.module.css', read('profile', 'profile.module.css')],
  ['profile/edit/page.module.css', read('profile', 'edit', 'page.module.css')],
  ['settings/page.module.css', read('settings', 'page.module.css')],
  ['profile/[userId]/page.module.css', fs.readFileSync(path.join(process.cwd(), 'src/app/profile/[userId]/page.module.css'), 'utf8')],
  ['notifications/page.module.css', fs.readFileSync(path.join(process.cwd(), 'src/app/notifications/page.module.css'), 'utf8')],
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

  it('mobilde yan menü yok (ikinci gezinme sırası yaratmaz), geri bağlantısı görünür', () => {
    const mobile = dosyalar[0][1].slice(dosyalar[0][1].indexOf('@media (max-width: 900px)'))
    expect(mobile).toMatch(/\.shell\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)/)
    expect(mobile).toMatch(/\.sidebar\s*\{[^}]*display:\s*none/)
    expect(mobile).toMatch(/\.geri\s*\{[^}]*display:\s*inline-flex/)
  })

  it('durum rozetleri semantik renkleri korur (bekliyor amber, kabul yeşil, red kırmızı)', () => {
    const css = dosyalar[1][1]
    expect(css).toMatch(/\.statusPending\s*\{[^}]*var\(--amber-soft\)/)
    expect(css).toMatch(/\.statusAccepted\s*\{[^}]*var\(--ok\)/)
    expect(css).toMatch(/\.statusRejected\s*\{[^}]*var\(--bad\)/)
  })
})
