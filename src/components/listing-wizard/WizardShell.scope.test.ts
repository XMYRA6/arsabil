import fs from 'fs'
import path from 'path'

const css = fs.readFileSync(path.join(__dirname, 'WizardShell.module.css'), 'utf8')

describe('WizardShell mobil CSS kapsam guard', () => {
  const mediaIndex = css.indexOf('@media (max-width: 768px)')

  it('mobil media query en az bir kez tanimli olmali', () => {
    expect(mediaIndex).toBeGreaterThan(-1)
  })

  it('.pageTitle masaustunde gorunur, mobilde gizli olmali (AppBar zaten basligi gosteriyor)', () => {
    const baseIndex = css.indexOf('.pageTitle {')
    expect(baseIndex).toBeGreaterThan(-1)
    expect(baseIndex).toBeLessThan(mediaIndex)
    const baseBlock = css.slice(baseIndex, css.indexOf('}', baseIndex))
    expect(baseBlock).not.toMatch(/display:\s*none/)
    const mobileBlock = css.slice(mediaIndex)
    expect(mobileBlock).toMatch(/\.pageTitle\s*\{[^}]*display:\s*none/)
  })

  it('.stepTitle masaustunde gorunur, mobilde gizli olmali (AppBar ayni metni gosteriyor, cift baslik onlenir)', () => {
    const baseIndex = css.indexOf('.stepTitle {')
    expect(baseIndex).toBeGreaterThan(-1)
    expect(baseIndex).toBeLessThan(mediaIndex)
    const baseBlock = css.slice(baseIndex, css.indexOf('}', baseIndex))
    expect(baseBlock).not.toMatch(/display:\s*none/)
    const mobileBlock = css.slice(mediaIndex)
    expect(mobileBlock).toMatch(/\.stepTitle\s*\{[^}]*display:\s*none/)
  })

  it('.nav masaustunde gorunur, mobilde gizli olmali (StickyActionBar yerini aliyor)', () => {
    const baseIndex = css.indexOf('.nav {')
    expect(baseIndex).toBeGreaterThan(-1)
    expect(baseIndex).toBeLessThan(mediaIndex)
    const baseBlock = css.slice(baseIndex, css.indexOf('}', baseIndex))
    expect(baseBlock).not.toMatch(/display:\s*none/)
    const mobileBlock = css.slice(mediaIndex)
    expect(mobileBlock).toMatch(/\.nav\s*\{[^}]*display:\s*none/)
  })

  it('.container mobilde StickyActionBar+safe-area icin alt bosluk birakmali', () => {
    const mobileBlock = css.slice(mediaIndex)
    expect(mobileBlock).toMatch(/\.container\s*\{[^}]*calc\(var\(--bottomnav-height\)\s*\+\s*76px\s*\+\s*env\(safe-area-inset-bottom\)\)/)
  })
})

describe('wizard mobil Liquid Glass kimligi (Faz 7)', () => {
  const progressCss = fs.readFileSync(path.join(__dirname, 'WizardProgress.module.css'), 'utf8')
  const wizardCss = fs.readFileSync(path.join(__dirname, 'wizard.module.css'), 'utf8')

  it('mobil shell --m-* mesh ve cam yuzey tokenlarini kullanmali', () => {
    const mobile = css.slice(css.indexOf('@media (max-width: 768px)'))
    expect(mobile).toMatch(/\.container\s*\{[^}]*background:\s*var\(--m-mesh\),\s*var\(--m-bg\)/)
    expect(mobile).toMatch(/\.card\s*\{[^}]*background:\s*var\(--m-glass-bg\)/)
    expect(mobile).toMatch(/\.card\s*\{[^}]*border:\s*1px solid var\(--m-glass-border\)/)
    expect(mobile).toMatch(/\.card\s*\{[^}]*backdrop-filter:\s*var\(--m-glass-blur\)/)
  })

  it('eski --seal-* tokenlari wizard kabugundan temizlenmis olmali', () => {
    expect(css).not.toMatch(/--seal-[a-z-]*:/)
    expect(css).not.toMatch(/var\(--seal-/)
    expect(progressCss).not.toMatch(/--seal-[a-z-]*:/)
    expect(progressCss).not.toMatch(/var\(--seal-/)
    expect(wizardCss).not.toMatch(/--seal-[a-z-]*:/)
    expect(wizardCss).not.toMatch(/var\(--seal-/)
  })

  it('.stickyNextBtn mobilde --m-grad-btn, .stickyBackBtn ise --m-fill outline kullanmali', () => {
    const mobile = css.slice(css.indexOf('@media (max-width: 768px)'))
    expect(mobile).toMatch(/\.stickyNextBtn\s*\{[^}]*background:\s*var\(--m-grad-btn\)/)
    expect(mobile).toMatch(/\.stickyNextBtn\s*\{[^}]*box-shadow:\s*var\(--m-sh-grad-btn\)/)
    expect(mobile).toMatch(/\.stickyBackBtn\s*\{[^}]*background:\s*var\(--m-fill\)/)
    expect(mobile).toMatch(/\.stickyBackBtn\s*\{[^}]*border:\s*1px solid var\(--m-glass-border\)/)
  })

  it('WizardProgress aktif/tamamlanmis durumlari mobilde --m-* aksanlarini kullanmali', () => {
    const mobile = progressCss.slice(progressCss.indexOf('@media (max-width: 768px)'))
    expect(mobile).toMatch(/\.circle\s*\{[^}]*background:\s*var\(--m-fill\)/)
    expect(mobile).toMatch(/\.circleActive\s*\{[^}]*background:\s*var\(--m-grad-btn\)/)
    expect(mobile).toMatch(/\.circleDone\s*\{[^}]*background:\s*var\(--m-grad-btn\)/)
    expect(mobile).toMatch(/\.connectorDone\s*\{[^}]*background:\s*var\(--m-link\)/)
    expect(mobile).toMatch(/\.connectorActive\s*\{[^}]*background:\s*var\(--m-grad-accent\)/)
  })

  it('masaustu dallari korunmali: .nav/.pageTitle/.stepTitle mobilde hala gizli', () => {
    const mobile = css.slice(css.indexOf('@media (max-width: 768px)'))
    expect(mobile).toMatch(/\.pageTitle\s*\{[^}]*display:\s*none/)
    expect(mobile).toMatch(/\.stepTitle\s*\{[^}]*display:\s*none/)
    expect(mobile).toMatch(/\.nav\s*\{[^}]*display:\s*none/)
  })

  it('masaustu .nextBtn hala brand-gradient kullanmali (degismedi)', () => {
    const desktop = css.slice(0, css.indexOf('@media (max-width: 768px)'))
    expect(desktop).toMatch(/\.nextBtn\s*\{[^}]*background:\s*var\(--brand-gradient\)/)
  })
})
