import fs from 'fs'
import path from 'path'

// İlan sihirbazı Figma 07 ile "Arazi" diline geçti (2026-10-24). Eski cam (--m-*,
// Liquid Glass) kapsam testlerinin yerini alır.
const read = (f: string) => fs.readFileSync(path.join(__dirname, f), 'utf8')
const shell = read('WizardShell.module.css')
const progress = read('WizardProgress.module.css')
const steps = read('wizard.module.css')

describe('ilan sihirbazı Arazi dili', () => {
  it.each([
    ['WizardShell', shell],
    ['WizardProgress', progress],
    ['wizard (adımlar)', steps],
  ])('%s eski cam (--m-*) ve --seal-* tokenlarını kullanmaz', (_ad, css) => {
    expect(css).not.toMatch(/var\(--m-/)
    expect(css).not.toMatch(/--seal-/)
  })

  it('kart yüzeyi Arazi tokenlarına bağlı', () => {
    expect(shell).toMatch(/\.card\s*\{[^}]*background:\s*var\(--surface\)/)
    expect(shell).toMatch(/\.card\s*\{[^}]*box-shadow:\s*var\(--shadow-card\)/)
  })

  it('birincil eylem mavi, geri eylemi mavi-soft, aktif adım amber', () => {
    expect(shell).toMatch(/\.nextBtn,[^{]*\{[^}]*background:\s*var\(--blue\)/)
    expect(shell).toMatch(/\.backBtn,[^{]*\{[^}]*background:\s*var\(--blue-soft\)/)
    expect(progress).toMatch(/\.nodeActive\s*\{[^}]*var\(--amber-soft\)/)
  })

  it('mobilde başlıklar ve masaüstü gezinti gizlenir, sabit çubuk güvenli alanı korur', () => {
    const mobile = shell.slice(shell.indexOf('@media (max-width: 900px)'))
    expect(mobile).toMatch(/\.pageTitle,[^{]*\.nav\s*\{[^}]*display:\s*none/)
    expect(mobile).toMatch(/\.container\s*\{[^}]*calc\(var\(--bottomnav-height\)\s*\+\s*76px\s*\+\s*env\(safe-area-inset-bottom\)\)/)
    expect(mobile).toMatch(/\.aside\s*\{[^}]*display:\s*none/)
  })

  it('mobilde fotoğraf silme düğmesi 44px dokunma hedefini korur ve ızgara taşmaz', () => {
    const mobile = steps.slice(steps.indexOf('@media (max-width: 768px)'))
    expect(mobile).toMatch(/\.photoRemove\s*\{[^}]*width:\s*44px/)
    expect(mobile).toMatch(/\.photoGrid\s*\{[^}]*repeat\(3,\s*minmax\(0,\s*1fr\)\)/)
  })

  it('adım bileşenleri görünen ikonlarda emoji kullanmaz', () => {
    for (const f of ['WizardStep1Location.tsx', 'WizardStep2Detail.tsx', 'WizardStep3Photos.tsx', 'WizardStep4Feasibility.tsx', 'WizardStep5Preview.tsx', 'WizardShell.tsx', 'WizardProgress.tsx']) {
      expect(read(f)).not.toMatch(/[\u{1F300}-\u{1FAFF}]/u)
    }
  })
})
