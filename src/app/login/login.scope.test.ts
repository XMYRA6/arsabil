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
    expect(baseBlock).toMatch(/grid-template-columns:\s*1fr 1fr/)
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

describe('login mobil mühür kimliği (Faz 2.5)', () => {
  const globalsCss = fs.readFileSync(path.join(__dirname, '../globals.css'), 'utf8');

  it('seal token\'ları globals.css içine sızmamış olmalı', () => {
    expect(globalsCss).not.toMatch(/--seal-(accent|surface|border|text)/);
  });

  it('--seal-accent kanonik Aurora cyan olmalı (literal hex değil)', () => {
    expect(css).toMatch(/--seal-accent:\s*var\(--aurora-cyan\)/);
    expect(css).toMatch(/--seal-accent-rgb:\s*43,\s*124,\s*255/);
    expect(css).not.toMatch(/#4C8DFF/i);
  });

  it('token tanımları mobil media query İÇİNDE olmalı', () => {
    const mediaIndex = css.indexOf('@media (max-width: 768px)');
    expect(mediaIndex).toBeGreaterThan(-1);
    expect(css.indexOf('--seal-surface:')).toBeGreaterThan(mediaIndex);
  });

  it('--seal-surface hem dark hem light tema dalında tanımlı olmalı', () => {
    expect(css).toMatch(/\[data-theme="dark"\]\s*\.panel\s*\{[^}]*--seal-surface:/);
    expect(css).toMatch(/\[data-theme="light"\]\s*\.panel\s*\{[^}]*--seal-surface:/);
  });

  it('light dalı mevcut global cam token\'larını yeniden kullanmalı', () => {
    expect(css).toMatch(/\[data-theme="light"\]\s*\.panel\s*\{[^}]*--seal-surface:\s*var\(--shell-bg\)/);
  });

  it('.formSide ve .input mobilde seal yüzeyine geçmeli', () => {
    const mobile = css.slice(css.indexOf('@media (max-width: 768px)'));
    expect(mobile).toMatch(/\.formSide\s*\{[^}]*background:\s*var\(--seal-surface\)/);
    expect(mobile).toMatch(/\.input\s*\{[^}]*border:\s*1px solid var\(--seal-border\)/);
  });

  it('.submitBtn mobilde seal aksanına geçmeli', () => {
    const mobile = css.slice(css.indexOf('@media (max-width: 768px)'));
    expect(mobile).toMatch(/\.submitBtn\s*\{[^}]*background:\s*var\(--seal-accent\)/);
  });

  it('.input mobilde iOS zoom korumasını KORUMALI (regresyon)', () => {
    const mobile = css.slice(css.indexOf('@media (max-width: 768px)'));
    expect(mobile).toMatch(/\.input\s*\{[^}]*font-size:\s*16px/);
    expect(mobile).toMatch(/\.input\s*\{[^}]*height:\s*var\(--input-height-mobile\)/);
  });

  it('.brandSide kimliğe girmemeli (kendi marka yüzeyi korunuyor)', () => {
    const mobile = css.slice(css.indexOf('@media (max-width: 768px)'));
    expect(mobile).not.toMatch(/\.brandSide\s*\{[^}]*--seal|\.brandSide\s*\{[^}]*seal-surface/);
  });

  it('masaüstü dalı değişmemeli: .panel masaüstünde hâlâ 2 kolon', () => {
    const desktop = css.slice(0, css.indexOf('@media (max-width: 768px)'));
    expect(desktop).toMatch(/\.panel\s*\{[^}]*grid-template-columns:\s*[^;]*1fr[^;]*1fr/);
  });
});
