import fs from 'fs'
import path from 'path'

const css = fs.readFileSync(path.join(__dirname, 'register.module.css'), 'utf8')
const tsx = fs.readFileSync(path.join(__dirname, 'page.tsx'), 'utf8')

describe('register sayfası mobil CSS kapsam guard', () => {
  it('mobil media query en az bir kez tanımlı olmalı', () => {
    expect(css.indexOf('@media (max-width: 768px)')).toBeGreaterThan(-1)
  })

  it('page.tsx artık inline style={{}} kullanmamalı', () => {
    expect(tsx).not.toMatch(/style=\{\{/)
  })

  it('page.tsx Card/Input/Button bileşenlerini hâlâ import ediyor olmalı (paylaşılan bileşenlere dokunulmadı)', () => {
    expect(tsx).toMatch(/from "@\/components\/ui\/Card"/)
    expect(tsx).toMatch(/from "@\/components\/ui\/Input"/)
    expect(tsx).toMatch(/from "@\/components\/ui\/Button"/)
  })
})

describe('register mobil Liquid Glass kimligi (Faz 3)', () => {
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

  it('Card override bilesik seciciyle cam shell icinde transparan olmali', () => {
    const mobile = css.slice(css.indexOf('@media (max-width: 768px)'));
    expect(mobile).toMatch(/div\.sealCard\s*\{[^}]*background:\s*transparent/);
    expect(mobile).toMatch(/div\.sealCard\s*\{[^}]*border:\s*1px solid var\(--m-glass-border\)/);
  });

  it('Input override bilesik secici + input inisi kullanmali', () => {
    const mobile = css.slice(css.indexOf('@media (max-width: 768px)'));
    expect(mobile).toMatch(/\.sealInput\s+input\s*\{[^}]*border:\s*1px solid var\(--m-glass-border\)/);
    expect(mobile).toMatch(/\.sealInput input:focus\s*\{[^}]*border-color:\s*var\(--m-link\)/);
  });

  it('Button override bilesik secici ve gradient m token kullanmali', () => {
    const mobile = css.slice(css.indexOf('@media (max-width: 768px)'));
    expect(mobile).toMatch(/button\.sealSubmit\s*\{[^}]*min-height:\s*var\(--touch-target\)/);
    expect(mobile).toMatch(/button\.sealSubmit\s*\{[^}]*background:\s*var\(--m-grad-btn\)/);
  });

  it('page.tsx override siniflarini gercekten geciriyor olmali', () => {
    expect(tsx).toMatch(/styles\.sealCard/);
    expect(tsx).toMatch(/styles\.sealInput/);
    expect(tsx).toMatch(/styles\.sealSubmit/);
  });

  it('paylasilan bilesenler hala import ediliyor olmali (dosyalarina dokunulmadi)', () => {
    expect(tsx).toMatch(/from "@\/components\/ui\/Card"/);
    expect(tsx).toMatch(/from "@\/components\/ui\/Input"/);
    expect(tsx).toMatch(/from "@\/components\/ui\/Button"/);
  });

  it('.errorBanner semantik kirmizisi korunmali', () => {
    expect(css).toMatch(/\.errorBanner\s*\{[^}]*color:\s*var\(--red\)/);
  });
});
describe('register profesyonel split layout', () => {
  it('authShell desktop 42/58 split, brand primary ve form bg-body kullanir', () => {
    expect(css).toMatch(/\.authShell\s*\{[^}]*grid-template-columns:\s*42% 58%/)
    expect(css).toMatch(/\.brandPanel\s*\{[^}]*var\(--primary\)[^}]*var\(--primary-2\)/)
    expect(css).toMatch(/\.formPanel\s*\{[^}]*background:\s*var\(--bg-body\)/)
  })

  it('mobile media query tek kolon ve 48px input kurallarini tasir', () => {
    const mobile = css.slice(css.indexOf('@media (max-width: 768px)'))
    expect(mobile).toMatch(/\.authShell\s*\{[^}]*grid-template-columns:\s*1fr/)
    expect(mobile).toMatch(/\.sealInput\s+input\s*\{[^}]*min-height:\s*48px/)
    expect(mobile).toMatch(/\.sealInput\s+input\s*\{[^}]*font-size:\s*16px/)
  })

  it('page.tsx split layout siniflarini ve brandBullets listesini kullanir', () => {
    expect(tsx).toMatch(/styles\.authShell/)
    expect(tsx).toMatch(/styles\.brandPanel/)
    expect(tsx).toMatch(/styles\.brandLogo/)
    expect(tsx).toMatch(/styles\.brandBullets/)
    expect(tsx).toMatch(/styles\.formPanel/)
    expect(tsx).toMatch(/styles\.formCard/)
  })
})
