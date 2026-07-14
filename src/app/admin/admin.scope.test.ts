import fs from 'fs'
import path from 'path'

const css = fs.readFileSync(path.join(__dirname, 'admin.module.css'), 'utf8')
const globalsCss = fs.readFileSync(path.join(__dirname, '../globals.css'), 'utf8')

describe('admin.module.css — Faz 4 pirinç vurgu (masaüstü + mobil, admin geneli)', () => {
  it('.navItemActive artık --admin-accent kullanmalı, --primary DEĞİL', () => {
    const block = css.slice(css.indexOf('.navItemActive {'), css.indexOf('.navItemActive {') + 300)
    expect(block).toMatch(/background:\s*var\(--admin-accent\)/)
    expect(block).not.toMatch(/background:\s*var\(--primary\)/)
  })

  it('.segmentTabActive artık --admin-accent kullanmalı, --primary DEĞİL', () => {
    // NOT: dosyada `.segmentTab,\n.segmentTabActive { ... }` adlı paylaşılan (inaktif) stil bloğu da
    // ".segmentTabActive {" alt dizisini içeriyor (bu task'tan önce de vardı). indexOf + fromIndex bu
    // paylaşılan bloğu bulur, gerçek override kuralını değil. lastIndexOf ile dosyadaki SON (yani
    // gerçek, bağımsız `.segmentTabActive { background: var(--admin-accent); ... }`) kuralı hedefleriz.
    const idx = css.lastIndexOf('.segmentTabActive {')
    const block = css.slice(idx, idx + 200)
    expect(block).toMatch(/background:\s*var\(--admin-accent\)/)
    expect(block).not.toMatch(/background:\s*var\(--primary\)/)
  })

  it('.adminPrimaryBtn admin-accent tabanlı bir arka plan tanımlamalı', () => {
    expect(css).toMatch(/\.adminPrimaryBtn\s*\{[^}]*#C9A15A/)
  })
})

describe('admin.module.css — Faz 4 mobil cam yüzey token kapsamı', () => {
  it('--seal-surface globals.css içine hiç sızmamış olmalı', () => {
    expect(globalsCss).not.toMatch(/--seal-surface/)
  })

  it('Faz 4 mobil bloğu MEVCUT @media (max-width: 900px) düzen bloğu içinde tanımlı olmalı (yeni bir üçüncü blok DEĞİL)', () => {
    const markerIdx = css.indexOf('/* Faz 4')
    expect(markerIdx).toBeGreaterThan(-1)
    const firstMediaIdx = css.indexOf('@media (max-width: 900px)')
    const secondMediaIdx = css.indexOf('@media (max-width: 900px)', firstMediaIdx + 1)
    expect(markerIdx).toBeGreaterThan(firstMediaIdx)
    // profitLevel grid bloğundan (ikinci 900px bloğu) önce gelmeli — aynı (ilk) blok içinde
    expect(markerIdx).toBeLessThan(secondMediaIdx)
  })

  it('--seal-surface hem dark hem light tema bloğunda .adminShell için tanımlı olmalı', () => {
    expect(css).toMatch(/\[data-theme="dark"\]\s*\.adminShell\s*\{[^}]*--seal-surface:/)
    expect(css).toMatch(/\[data-theme="light"\]\s*\.adminShell\s*\{[^}]*--seal-surface:/)
  })

  it('.statBox/.settingsCard/.toolbar mobilde --seal-surface + blur(24px) kullanmalı', () => {
    const mediaIdx = css.indexOf('@media (max-width: 900px)')
    const mobileBlock = css.slice(mediaIdx, css.indexOf('@media (max-width: 900px)', mediaIdx + 1))
    expect(mobileBlock).toMatch(/\.statBox,\s*\n?\s*\.settingsCard,\s*\n?\s*\.toolbar\s*\{[^}]*background:\s*var\(--seal-surface\)/)
    expect(mobileBlock).toMatch(/backdrop-filter:\s*blur\(24px\)/)
  })

  it('.dataCardGlass mobilde !important ile seal-surface uygulamalı (kaynak sırası bağımsız override garantisi)', () => {
    const mediaIdx = css.indexOf('@media (max-width: 900px)')
    const mobileBlock = css.slice(mediaIdx, css.indexOf('@media (max-width: 900px)', mediaIdx + 1))
    expect(mobileBlock).toMatch(/\.dataCardGlass\s*\{[^}]*background:\s*var\(--seal-surface\)\s*!important/)
  })

  it('.sidebar mobilde sağ kenar scroll-fade mask uygulamalı (marketplace .topBar deseninin aynısı)', () => {
    const mediaIdx = css.indexOf('@media (max-width: 900px)')
    const mobileBlock = css.slice(mediaIdx, css.indexOf('@media (max-width: 900px)', mediaIdx + 1))
    expect(mobileBlock).toMatch(/\.sidebar\s*\{[^}]*mask-image:\s*linear-gradient\(to right/)
  })

  it('.mobileCardList masaüstünde gizli, mobilde görünür olmalı; .tableWrap tersi', () => {
    const desktopIdx = css.indexOf('.mobileCardList {')
    expect(desktopIdx).toBeGreaterThan(-1)
    const desktopBlock = css.slice(desktopIdx, css.indexOf('}', desktopIdx))
    expect(desktopBlock).toMatch(/display:\s*none/)

    const mediaIdx = css.indexOf('@media (max-width: 900px)')
    const mobileBlock = css.slice(mediaIdx, css.indexOf('@media (max-width: 900px)', mediaIdx + 1))
    expect(mobileBlock).toMatch(/\.mobileCardList\s*\{[^}]*display:\s*block/)
    expect(mobileBlock).toMatch(/\.tableWrap\s*\{[^}]*display:\s*none/)
  })
})

describe('admin.module.css — Analitik grid fix (Faz 4 task 7)', () => {
  it('.funnelGrid masaüstünde 3 kolon, mobilde 1 kolon olmalı', () => {
    const desktopIdx = css.indexOf('.funnelGrid {')
    expect(desktopIdx).toBeGreaterThan(-1)
    const desktopBlock = css.slice(desktopIdx, css.indexOf('}', desktopIdx))
    expect(desktopBlock).toMatch(/grid-template-columns:\s*repeat\(3,\s*1fr\)/)

    const mediaIdx = css.indexOf('@media (max-width: 900px)')
    const mobileBlock = css.slice(mediaIdx, css.indexOf('@media (max-width: 900px)', mediaIdx + 1))
    expect(mobileBlock).toMatch(/\.funnelGrid,\s*\n?\s*\.distributionGrid\s*\{[^}]*grid-template-columns:\s*1fr/)
  })

  it('.distributionGrid masaüstünde 2 kolon olmalı', () => {
    const desktopIdx = css.indexOf('.distributionGrid {')
    expect(desktopIdx).toBeGreaterThan(-1)
    const desktopBlock = css.slice(desktopIdx, css.indexOf('}', desktopIdx))
    expect(desktopBlock).toMatch(/grid-template-columns:\s*1fr 1fr/)
  })
})
