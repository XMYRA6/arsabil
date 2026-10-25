import fs from 'fs';
import path from 'path';

// Pazar yeri yüzeyi Figma 07 ile "Arazi" diline geçti (2026-10-23). Bu dosya eski
// cam (--m-*, Liquid Glass) kapsam testlerinin yerini alır: sözleşme artık
// "yalnızca Arazi tokenları, emoji yok, hareket azaltma korunur".
const read = (...p: string[]) => fs.readFileSync(path.join(__dirname, ...p), 'utf8');

const pageCss = read('page.module.css');
const cardCss = read('..', '..', 'components', 'marketplace', 'ListingCard.module.css');
const filterCss = read('..', '..', 'components', 'marketplace', 'FilterSidebar.module.css');
const toggleCss = read('..', '..', 'components', 'marketplace', 'ViewToggle.module.css');
const cardTsx = read('..', '..', 'components', 'marketplace', 'ListingCard.tsx');
const filterTsx = read('..', '..', 'components', 'marketplace', 'FilterSidebar.tsx');

describe('ListingCard basma geri bildirimi', () => {
  it('iç butona basılırken kartın kendisi küçülmez', () => {
    expect(cardCss).toMatch(/\.cardRoot\[data-press\]:has\(button:active\)\s*\{[^}]*transform:\s*none/);
  });
});

describe('pazar yeri Arazi dili', () => {
  it.each([
    ['page.module.css', pageCss],
    ['ListingCard.module.css', cardCss],
    ['FilterSidebar.module.css', filterCss],
    ['ViewToggle.module.css', toggleCss],
  ])('%s eski cam tokenlarını (--m-*) kullanmaz', (_ad, css) => {
    expect(css).not.toMatch(/var\(--m-/);
  });

  it('kart yüzeyi Arazi tokenlarına (surface/line/shadow-card/radius-card) bağlı', () => {
    expect(cardCss).toMatch(/\.cardRoot\s*\{[^}]*background:\s*var\(--surface\)/);
    expect(cardCss).toMatch(/\.cardRoot\s*\{[^}]*border:\s*1px solid var\(--line\)/);
    expect(cardCss).toMatch(/\.cardRoot\s*\{[^}]*box-shadow:\s*var\(--shadow-card\)/);
    expect(cardCss).toMatch(/\.cardRoot\s*\{[^}]*border-radius:\s*var\(--radius-card\)/);
  });

  it('kart hover yükselmesi hareket azaltma tercihinde kapanır', () => {
    expect(cardCss).toMatch(/\.cardRoot:hover\s*\{[^}]*translateY\(-3px\)/);
    const rm = cardCss.slice(cardCss.indexOf('prefers-reduced-motion'));
    expect(rm).toMatch(/\.cardRoot:hover\s*\{[^}]*transform:\s*none/);
  });

  it('ListingCard görünen ikonlarda emoji kullanmaz', () => {
    expect(cardTsx).not.toMatch(/[\u{1F300}-\u{1FAFF}☀-➿]/u);
    expect(filterTsx).not.toMatch(/[\u{1F300}-\u{1FAFF}☀-➿]/u);
  });

  it('seçili durumlar amber, birincil eylem mavi (Figma 07)', () => {
    expect(filterCss).toMatch(/\.checkBoxActive\s*\{[^}]*var\(--amber\)/);
    expect(filterCss).toMatch(/\.applyBtn\s*\{[^}]*background:\s*var\(--blue\)/);
    expect(cardCss).toMatch(/\.actionPrimary\s*\{[^}]*background:\s*var\(--blue\)/);
    expect(toggleCss).toMatch(/\.btnActive\s*\{[^}]*background:\s*var\(--amber\)/);
  });

  it('mobilde kenar çubuğu gizlenir, filtreler sheet ile açılır', () => {
    const mobile = pageCss.slice(pageCss.indexOf('@media (max-width: 900px)'));
    expect(mobile).toMatch(/\.sidebarWrapper\s*\{[^}]*display:\s*none/);
    expect(mobile).toMatch(/\.filterBtn\s*\{[^}]*display:\s*inline-flex/);
  });
});
