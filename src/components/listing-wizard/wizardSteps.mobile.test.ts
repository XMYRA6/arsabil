import fs from 'fs'
import path from 'path'

const css = fs.readFileSync(path.join(__dirname, 'wizard.module.css'), 'utf8')
const mobile = css.slice(css.lastIndexOf('@media (max-width: 768px)'))

describe('listing wizard step mobile Liquid Glass guard', () => {
  it('mobil override blogu --m-* Liquid Glass alan tokenlarini kullanir', () => {
    expect(mobile).toMatch(/\.input,\s*\.select,\s*\.textarea\s*\{[^}]*min-height:\s*44px/)
    expect(mobile).toMatch(/\.input,\s*\.select,\s*\.textarea\s*\{[^}]*background:\s*var\(--m-fill\)/)
    expect(mobile).toMatch(/\.input:focus,\s*\.select:focus,\s*\.textarea:focus\s*\{[^}]*border-color:\s*var\(--m-link\)/)
  })

  it('upload ve foto grid mobilde yatay overflow uretmeyecek sekilde kilitlenir', () => {
    expect(mobile).toMatch(/\.stepContainer\s*\{[^}]*overflow-x:\s*clip/)
    expect(mobile).toMatch(/\.dropZone\s*\{[^}]*min-height:\s*144px/)
    expect(mobile).toMatch(/\.photoGrid\s*\{[^}]*grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\)/)
    expect(mobile).toMatch(/\.photoGrid\s*\{[^}]*overflow-x:\s*clip/)
    expect(mobile).toMatch(/\.photoRemove\s*\{[^}]*width:\s*44px/)
  })

  it('rapor secenekleri ve parsel ozeti dokunma hedefi ve m-fill yuzey kullanir', () => {
    expect(mobile).toMatch(/\.reportOption\s*\{[^}]*min-height:\s*64px/)
    expect(mobile).toMatch(/\.reportOption\s*\{[^}]*background:\s*var\(--m-fill\)/)
    expect(mobile).toMatch(/\.parcelTriggerBtn,\s*\.parcelSummary\s*\{[^}]*min-height:\s*56px/)
    expect(mobile).toMatch(/\.parcelChangeBtn\s*\{[^}]*min-height:\s*44px/)
  })

  it('preview karti ve yayinla butonu mobil Liquid Glass yuzeylerini kullanir', () => {
    expect(mobile).toMatch(/\.previewCard\s*\{[^}]*background:\s*var\(--m-glass-bg\)/)
    expect(mobile).toMatch(/\.previewCard\s*\{[^}]*backdrop-filter:\s*var\(--m-glass-blur\)/)
    expect(mobile).toMatch(/\.previewTitle\s*\{[^}]*overflow-wrap:\s*anywhere/)
    expect(mobile).toMatch(/\.publishBtn\s*\{[^}]*background:\s*var\(--m-grad-btn\)/)
  })
})
