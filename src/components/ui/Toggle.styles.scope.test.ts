import fs from 'fs'
import path from 'path'

const css = fs.readFileSync(path.join(__dirname, 'Toggle.module.css'), 'utf8')
const mediaIndex = css.indexOf('@media (max-width: 768px)')

describe('Toggle.module.css — mobil Liquid Glass kapsamı', () => {
  it('dosyada mobil override bloğu var', () => {
    expect(mediaIndex).toBeGreaterThan(-1)
  })

  it('mobilde açık durum var(--m-grad-btn) kullanmalı, boyut GirdiKarti .anahtar ile birebir (46x27/21x21/19px)', () => {
    const mobileBlock = css.slice(mediaIndex)

    const switchMatch = mobileBlock.match(/\.switch\s*\{([^}]*)\}/)
    expect(switchMatch).not.toBeNull()
    expect(switchMatch![1]).toMatch(/width:\s*46px/)
    expect(switchMatch![1]).toMatch(/height:\s*27px/)

    const checkedMatch = mobileBlock.match(/input:checked \+ \.slider\s*\{([^}]*)\}/)
    expect(checkedMatch).not.toBeNull()
    expect(checkedMatch![1]).toMatch(/var\(--m-grad-btn\)/)

    const beforeMatch = mobileBlock.match(/input:checked \+ \.slider:before\s*\{([^}]*)\}/)
    expect(beforeMatch).not.toBeNull()
    expect(beforeMatch![1]).toMatch(/translateX\(19px\)/)
  })

  it('mobilde kapalı durum var(--m-fill) kullanmalı', () => {
    const mobileBlock = css.slice(mediaIndex)
    // Duz `.slider { ... }` kurali (kapali durum) mobil blokta `input:checked
    // + .slider { ... }`den ONCE tanimli — non-global match() ilk (dogru)
    // eslesmeyi doner.
    const match = mobileBlock.match(/\.slider\s*\{([^}]*)\}/)
    expect(match).not.toBeNull()
    expect(match![1]).toMatch(/var\(--m-fill\)/)
  })

  it('masaüstü (media query dışı) .switch/input:checked + .slider tanımları DEĞİŞMEDEN kalmalı', () => {
    const desktopBlock = css.slice(0, mediaIndex)
    expect(desktopBlock).toMatch(/\.switch\s*\{[^}]*width:\s*50px/)
    expect(desktopBlock).toMatch(/input:checked \+ \.slider\s*\{[^}]*var\(--brand-gradient\)/)
  })
})
