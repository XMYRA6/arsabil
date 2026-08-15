import fs from 'fs'
import path from 'path'

const css = fs.readFileSync(path.join(__dirname, 'login.module.css'), 'utf8')
const tsx = fs.readFileSync(path.join(__dirname, 'page.tsx'), 'utf8')

describe('login sayfası mobil CSS kapsam guard', () => {
  const mediaIndex = css.indexOf('@media (max-width: 768px)')

  it('mobil media query en az bir kez tanımlı olmalı', () => {
    expect(mediaIndex).toBeGreaterThan(-1)
  })

  it('.panel masaüstünde 2 kolon, mobilde 1 kolon olmalı', () => {
    const baseIndex = css.indexOf('.panel {')
    expect(baseIndex).toBeGreaterThan(-1)
    expect(baseIndex).toBeLessThan(mediaIndex)
    const baseBlock = css.slice(baseIndex, css.indexOf('}', baseIndex))
    expect(baseBlock).toMatch(/grid-template-columns:\s*42% 58%/)
    const mobileBlock = css.slice(mediaIndex)
    expect(mobileBlock).toMatch(/\.panel\s*\{[^}]*grid-template-columns:\s*1fr;/)
  })

  it('.input mobilde --input-height-mobile ve 16px font-size kullanmalı (iOS zoom önleme)', () => {
    const mobileBlock = css.slice(mediaIndex)
    expect(mobileBlock).toMatch(/\.input\s*\{[^}]*height:\s*var\(--input-height-mobile\)/)
    expect(mobileBlock).toMatch(/\.input\s*\{[^}]*font-size:\s*16px/)
  })

  it('page.tsx artık dangerouslySetInnerHTML kullanmamalı (stil enjeksiyon hack\'i kaldırıldı)', () => {
    expect(tsx).not.toMatch(/dangerouslySetInnerHTML/)
  })

  it('page.tsx artık JS ile stil mutasyonu yapmamalı (gerçek :focus/:hover CSS\'e taşındı)', () => {
    expect(tsx).not.toMatch(/\.target\.style/)
    expect(tsx).not.toMatch(/currentTarget\.style/)
  })

  it('page.tsx artık inline style={{}} kullanmamalı', () => {
    expect(tsx).not.toMatch(/style=\{\{/)
  })
})

describe('login mobil Liquid Glass kimligi (Faz 3)', () => {
  const globalsCss = fs.readFileSync(path.join(__dirname, '../globals.css'), 'utf8');

  it('mobil Liquid Glass tokenlari globals.css icinde tanimli olmali', () => {
    expect(globalsCss).toMatch(/--m-glass-bg:/);
    expect(globalsCss).toMatch(/--m-mesh:/);
    expect(globalsCss).toMatch(/--m-grad-btn:/);
  });

  it('mobil CSS artik --seal-* token sozlesmesine bagli degil', () => {
    const mobile = css.slice(css.indexOf('@media (max-width: 768px)'));
    expect(mobile).not.toMatch(/--seal-/);
  });

  it('mobil sayfa mesh tokenini kullanmali', () => {
    const mobile = css.slice(css.indexOf('@media (max-width: 768px)'));
    expect(mobile).toMatch(/\.page\s*\{[^}]*background:\s*var\(--m-mesh\)/);
  });

  it('.panel paylasilan .mStatSurface yuzeyine baglanir', () => {
    expect(css).toMatch(/\.panel\s*\{[^}]*composes:\s*mStatSurface from global/);
    const mobile = css.slice(css.indexOf('@media (max-width: 768px)'));
    expect(mobile).not.toMatch(/\.panel[^}]*\{[^}]*background:\s*var\(--m-glass-bg\)/);
  });

  it('.formSide ve .formPanel mobilde cam panel icinde transparan kalmali', () => {
    const mobile = css.slice(css.indexOf('@media (max-width: 768px)'));
    expect(mobile).toMatch(/\.formSide,\s*\.formPanel\s*\{[^}]*background:\s*transparent/);
  });

  it('.input ve .submitBtn mobilde Liquid Glass tokenlarini kullanmali', () => {
    const mobile = css.slice(css.indexOf('@media (max-width: 768px)'));
    expect(mobile).toMatch(/\.input\s*\{[^}]*border:\s*1px solid var\(--m-glass-border\)/);
    expect(mobile).toMatch(/\.input:focus\s*\{[^}]*border-color:\s*var\(--m-link\)/);
    expect(mobile).toMatch(/\.submitBtn\s*\{[^}]*background:\s*var\(--m-grad-btn\)/);
  });

  it('.input mobilde iOS zoom korumasini KORUMALI (regresyon)', () => {
    const mobile = css.slice(css.indexOf('@media (max-width: 768px)'));
    expect(mobile).toMatch(/\.input\s*\{[^}]*font-size:\s*16px/);
    expect(mobile).toMatch(/\.input\s*\{[^}]*height:\s*var\(--input-height-mobile\)/);
  });

  it('.brandSide mobilde Faz 3 accent gradient yuzeyini kullanmali', () => {
    const mobile = css.slice(css.indexOf('@media (max-width: 768px)'));
    expect(mobile).toMatch(/\.brandSide\s*\{[^}]*background:\s*var\(--m-grad-accent\)/);
  });

  it('masaustu dali degismemeli: .panel masaustunde hala 2 kolon', () => {
    const desktop = css.slice(0, css.indexOf('@media (max-width: 768px)'));
    expect(desktop).toMatch(/\.panel\s*\{[^}]*grid-template-columns:\s*42% 58%/);
  });
});
describe('login profesyonel split layout', () => {
  it('authShell desktop split ve brand/form panel tokenlarini tanimlar', () => {
    expect(css).toMatch(/\.authShell\s*\{[^}]*grid-template-columns:\s*42% 58%/)
    expect(css).toMatch(/\.brandPanel\s*\{[^}]*var\(--primary\)[^}]*var\(--primary-2\)/)
    expect(css).toMatch(/\.formPanel\s*\{[^}]*background:\s*var\(--bg-body\)/)
  })

  it('page.tsx split layout siniflarini kullanir', () => {
    expect(tsx).toMatch(/styles\.authShell/)
    expect(tsx).toMatch(/styles\.brandPanel/)
    expect(tsx).toMatch(/styles\.brandLogo/)
    expect(tsx).toMatch(/styles\.formPanel/)
    expect(tsx).toMatch(/styles\.formCard/)
  })

  it('mobil authShell tek kolona doner ve input 48px korur', () => {
    const mobile = css.slice(css.lastIndexOf('@media (max-width: 768px)'))
    expect(mobile).toMatch(/\.authShell\s*\{[^}]*grid-template-columns:\s*1fr/)
    expect(css).toMatch(/\.input\s*\{[^}]*min-height:\s*48px/)
  })
})
