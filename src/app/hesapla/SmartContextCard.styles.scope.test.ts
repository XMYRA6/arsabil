import fs from 'fs'
import path from 'path'

const css = fs.readFileSync(path.join(__dirname, 'SmartContextCard.module.css'), 'utf8')
const mediaIndex = css.indexOf('@media (max-width: 768px)')

describe('SmartContextCard.module.css — mobil Liquid Glass kapsamı', () => {
  it('dosyada mobil override bloğu var', () => {
    expect(mediaIndex).toBeGreaterThan(-1)
  })

  it('.riskSection, .areaSection mobilde kutulu panel + kenarlık kontrastı kullanmalı', () => {
    const mobileBlock = css.slice(mediaIndex)
    const match = mobileBlock.match(/\.riskSection,\s*\.areaSection\s*\{([^}]*)\}/)
    expect(match).not.toBeNull()
    expect(match![1]).toMatch(/rgba\(11,\s*32,\s*54,\s*\.055\)/)
    expect(match![1]).toMatch(/1px solid rgba\(11,\s*32,\s*54,\s*\.07\)/)
  })

  it('.riskPillActive mobilde var(--m-grad-btn) kullanmalı', () => {
    const mobileBlock = css.slice(mediaIndex)
    const match = mobileBlock.match(/\.riskPillActive\s*\{([^}]*)\}/)
    expect(match).not.toBeNull()
    expect(match![1]).toMatch(/var\(--m-grad-btn\)/)
  })

  it('.address/.riskHeader/.areaHeader/.riskKaynakEtiket/.riskNote/.areaStatus/.areaStatusOk mobilde var(--m-*) kullanmalı, var(--fg)/var(--label-color)/var(--muted) KULLANMAMALI', () => {
    const mobileBlock = css.slice(mediaIndex)
    const selectors = ['.address', '.riskHeader', '.riskKaynakEtiket', '.riskNote', '.areaHeader', '.areaStatus', '.areaStatusOk']
    for (const sel of selectors) {
      const re = new RegExp('\\' + sel + '\\s*\\{([^}]*)\\}')
      const m = mobileBlock.match(re)
      expect(m).not.toBeNull()
      expect(m![1]).toMatch(/var\(--m-ink\)|var\(--m-body\)|var\(--m-success-text\)|#b45309/)
      expect(m![1]).not.toMatch(/var\(--fg\)|var\(--label-color\)|var\(--muted\)/)
    }
  })

  it('.areaInputRow input mobilde beyaz zemin yerine kenarlık-kontrastlı zemin kullanmalı', () => {
    const mobileBlock = css.slice(mediaIndex)
    const match = mobileBlock.match(/\.areaInputRow input\s*\{([^}]*)\}/)
    expect(match).not.toBeNull()
    expect(match![1]).toMatch(/#f8fafd/)
    expect(match![1]).toMatch(/1px solid rgba\(11,\s*32,\s*54,\s*\.14\)/)
    expect(match![1]).toMatch(/font-size:\s*16px/)
  })

  it('masaüstü (media query dışı) .riskPill/.areaSection/.address tanımları DEĞİŞMEDEN kalmalı', () => {
    const desktopBlock = css.slice(0, mediaIndex)
    expect(desktopBlock).toMatch(/\.riskPill\s*\{[^}]*background:\s*var\(--card-bg\)/)
    expect(desktopBlock).toMatch(/\.areaSection\s*\{[^}]*background:\s*var\(--input-bg\)/)
    expect(desktopBlock).toMatch(/\.address\s*\{[^}]*color:\s*var\(--fg\)/)
  })

  it('.areaHeaderRight artık kullanılmıyor (JSX taşıması sonrası dead CSS temizlendi)', () => {
    expect(css).not.toMatch(/\.areaHeaderRight/)
  })

  it('.areaStatus/.areaStatusOk artık <p> oldukları için margin:0 ile UA varsayılan boşluğu iptal etmeli', () => {
    const desktopBlock = css.slice(0, mediaIndex)
    const statusMatch = desktopBlock.match(/\.areaStatus\s*\{([^}]*)\}/)
    expect(statusMatch).not.toBeNull()
    expect(statusMatch![1]).toMatch(/margin:\s*0/)
  })

  it('.areaStepperInput satırın kontrol kümesine kadar tüm genişliğini kaplamalı ve sola hizalı olmalı (nihai tasarım: sol=değer)', () => {
    // Kullanici onayli mockup: input flex:1 ile satirin tamamini kaplar
    // (tek buyuk tiklanabilir/yazilabilir alan), hizalama sola.
    const mobileBlock = css.slice(mediaIndex)
    const match = mobileBlock.match(/\.areaStepperInput\s*\{([^}]*)\}/)
    expect(match).not.toBeNull()
    expect(match![1]).toMatch(/flex:\s*1/)
    expect(match![1]).toMatch(/text-align:\s*left/)
  })

  it('.areaStepperKontrolGrup ("m²" + -/+ butonları) satırın sağına yaslanmalı (nihai tasarım: sağ=kontrol kümesi)', () => {
    // Kullanici bulgusu: "m2 yazisini -/+ steppera yani sag tarafa
    // yaslayalim" — birim etiketi artik input'a degil, kontrol
    // dugmeleriyle AYNI kumeye ait ve bu kume margin-left:auto ile
    // satirin sagina sabitlenir.
    const mobileBlock = css.slice(mediaIndex)
    const match = mobileBlock.match(/\.areaStepperKontrolGrup\s*\{([^}]*)\}/)
    expect(match).not.toBeNull()
    expect(match![1]).toMatch(/margin-left:\s*auto/)
  })
})
