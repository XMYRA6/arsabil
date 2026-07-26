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

describe('register mobil mühür kimliği (Faz 2.5)', () => {
  it('--seal-accent kanonik Aurora cyan olmalı', () => {
    expect(css).toMatch(/--seal-accent:\s*var\(--aurora-cyan\)/);
    expect(css).not.toMatch(/#4C8DFF/i);
  });

  it('token tanımları mobil media query İÇİNDE olmalı', () => {
    const mediaIndex = css.indexOf('@media (max-width: 768px)');
    expect(css.indexOf('--seal-surface:')).toBeGreaterThan(mediaIndex);
  });

  it('Card override\'ı bileşik seçici olmalı (sıra bağımlılığı tuzağı)', () => {
    expect(css).toMatch(/div\.sealCard\s*\{/);
  });

  it('Input override\'ı bileşik seçici + input inişi kullanmalı', () => {
    expect(css).toMatch(/\.sealInput\s+input\s*\{/);
  });

  it('Button override\'ı bileşik seçici olmalı', () => {
    expect(css).toMatch(/button\.sealSubmit\s*\{/);
  });

  it('page.tsx override sınıflarını gerçekten geçiriyor olmalı', () => {
    expect(tsx).toMatch(/styles\.sealCard/);
    expect(tsx).toMatch(/styles\.sealInput/);
    expect(tsx).toMatch(/styles\.sealSubmit/);
  });

  it('paylaşılan bileşenler hâlâ import ediliyor olmalı (dosyalarına dokunulmadı)', () => {
    expect(tsx).toMatch(/from "@\/components\/ui\/Card"/);
    expect(tsx).toMatch(/from "@\/components\/ui\/Input"/);
    expect(tsx).toMatch(/from "@\/components\/ui\/Button"/);
  });

  it('.errorBanner semantik kırmızısı korunmalı', () => {
    expect(css).toMatch(/\.errorBanner\s*\{[^}]*color:\s*var\(--red\)/);
  });
});
