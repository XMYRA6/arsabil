import fs from 'fs'
import path from 'path'

const css = fs.readFileSync(path.join(__dirname, 'WizardProgress.module.css'), 'utf8')

describe('WizardProgress mobil kompakt CSS kapsam guard', () => {
  const mediaIndex = css.indexOf('@media (max-width: 768px)')

  it('mobil media query en az bir kez tanımlı olmalı', () => {
    expect(mediaIndex).toBeGreaterThan(-1)
  })

  it('.circle masaüstünde 32px, mobilde kompakt (22px) olmalı', () => {
    const baseIndex = css.indexOf('.circle {')
    expect(baseIndex).toBeGreaterThan(-1)
    expect(baseIndex).toBeLessThan(mediaIndex)
    const baseBlock = css.slice(baseIndex, css.indexOf('}', baseIndex))
    expect(baseBlock).toMatch(/width:\s*32px/)
    const mobileBlock = css.slice(mediaIndex)
    expect(mobileBlock).toMatch(/\.circle\s*\{[^}]*width:\s*22px/)
  })

  it('.label masaüstünde görünür, mobilde gizli olmalı (kompakt nokta/çizgi göstergesi)', () => {
    const baseIndex = css.indexOf('.label {')
    expect(baseIndex).toBeGreaterThan(-1)
    expect(baseIndex).toBeLessThan(mediaIndex)
    const baseBlock = css.slice(baseIndex, css.indexOf('}', baseIndex))
    expect(baseBlock).not.toMatch(/display:\s*none/)
    const mobileBlock = css.slice(mediaIndex)
    expect(mobileBlock).toMatch(/\.label\s*\{[^}]*display:\s*none/)
  })
})
