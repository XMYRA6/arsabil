import fs from 'fs';
import path from 'path';

// İlan detay Figma 07 ile "Arazi" diline geçti (2026-10-24). Eski cam (--m-*,
// Liquid Glass) kapsam testlerinin yerini alır.
const css = fs.readFileSync(path.join(__dirname, 'page.module.css'), 'utf8');
const tsx = fs.readFileSync(path.join(__dirname, 'page.tsx'), 'utf8');

describe('listing/[id] Arazi dili', () => {
  it('eski cam tokenlarını (--m-*) kullanmaz', () => {
    expect(css).not.toMatch(/var\(--m-/);
  });

  it('kart yüzeyi Arazi tokenlarına bağlı', () => {
    expect(css).toMatch(/\.card\s*\{[^}]*background:\s*var\(--surface\)/);
    expect(css).toMatch(/\.card\s*\{[^}]*border:\s*1px solid var\(--line\)/);
    expect(css).toMatch(/\.card\s*\{[^}]*box-shadow:\s*var\(--shadow-card\)/);
  });

  it('birincil eylem mavi, seçili sekme amber', () => {
    expect(css).toMatch(/\.offerBtn[^{]*\{[^}]*background:\s*var\(--blue\)/);
    expect(css).toMatch(/\.tabActive\s*\{[^}]*var\(--amber-soft\)/);
  });

  it('mobil teklif CTA bottom nav üzerinde safe-area ile çakışmaz', () => {
    expect(css).toMatch(/\.stickyBtns\s*\{[^}]*max\(var\(--safe-bottom,\s*0px\),\s*8px\)/);
  });

  it('mobilde fiyat kartı gizlenir, başlık altındaki fiyat satırı görünür', () => {
    const mobile = css.slice(css.indexOf('@media (max-width: 900px)'));
    expect(mobile).toMatch(/\.priceCard,\s*\.footnote\s*\{[^}]*display:\s*none/);
    expect(mobile).toMatch(/\.mobilePrice\s*\{[^}]*display:\s*flex/);
  });

  it('görünen detay ikonlarında emoji kullanmaz', () => {
    expect(tsx).not.toMatch(/[\u{1F300}-\u{1FAFF}☀-➿]/u);
  });
});
