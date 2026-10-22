import fs from 'fs'
import path from 'path'

const css = fs.readFileSync(path.join(__dirname, '../Navbar.module.css'), 'utf8')
const tsx = fs.readFileSync(path.join(__dirname, '../Navbar.tsx'), 'utf8')

describe('Navbar ana keşif linkleri', () => {
  it('beş ana bağlantı tanımlı (Hesapla, Değer, Akif, Pazar Yeri, Fiyatlar)', () => {
    for (const href of ['/hesapla', '/deger', '/akif', '/marketplace', '/arsa-fiyatlari']) {
      expect(tsx).toContain(`"${href}"`)
    }
    for (const label of ['Hesapla', 'Değer', 'Akif', 'Pazar Yeri', 'Fiyatlar']) {
      expect(tsx).toContain(`"${label}"`)
    }
  })
  it('sahte (sabit) bildirim/mesaj verisi yok', () => {
    expect(tsx).not.toMatch(/Ahmet Yılmaz|Elif Demir|NOTIFS/)
  })
})

describe('Navbar Arazi token hizalaması', () => {
  it('hardcoded renk yok, yalnız token', () => {
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
    expect(css).not.toMatch(/backdrop-filter|gradient/)
  })
  it('mobilde masaüstü pill gizli, mobil çubuk görünür', () => {
    const media = css.slice(css.indexOf('@media (max-width: 768px)'))
    expect(media).toMatch(/\.desktop\s*\{[^}]*display:\s*none/)
    expect(media).toMatch(/\.mobileBar\s*\{[^}]*display:\s*flex/)
  })
})
