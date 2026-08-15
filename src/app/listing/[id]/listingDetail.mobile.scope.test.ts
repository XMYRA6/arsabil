import fs from 'fs';
import path from 'path';

const css = fs.readFileSync(path.join(__dirname, 'page.module.css'), 'utf8');
const tsx = fs.readFileSync(path.join(__dirname, 'page.tsx'), 'utf8');

describe('listing detay mobil Liquid Glass faz 2', () => {
  const mediaIndex = css.indexOf('MOBİL');
  const mobile = css.slice(mediaIndex);

  it('mobil sayfa mesh, foto alani --m-* tokenlarini kullanir', () => {
    expect(mobile).toMatch(/\.page\s*\{[^}]*background:\s*var\(--m-mesh\)/);
    expect(mobile).toMatch(/\.photoArea\s*\{[^}]*border-radius:\s*var\(--m-r-card\)/);
  });

  it('.sidebar/.tabContent paylasilan .mStatSurface yuzeyine baglanir (kart tekduzeligi duzeltmesi)', () => {
    expect(css).toMatch(/\.sidebar\s*\{[^}]*composes:\s*mStatSurface from global/);
    expect(css).toMatch(/\.tabContent\s*\{[^}]*composes:\s*mStatSurface from global/);
    expect(mobile).not.toMatch(/\.sidebar,\s*\n?\s*\.tabContent\s*\{[^}]*background:\s*var\(--m-glass-bg\)/);
  });

  it('mobil teklif CTA bottom nav uzerinde safe-area ile cakismaz', () => {
    expect(css).toMatch(/\.stickyBtns\s*\{[^}]*padding-bottom:\s*max\(var\(--safe-bottom\),\s*8px\)/);
    expect(css).toMatch(/\.stickyBtn\s*\{[^}]*border-radius:\s*var\(--m-r-btn\)/);
  });

  it('gorunen detay ikonlari emoji kullanmaz', () => {
    expect(tsx).not.toMatch(/[📋📊🧮📩💬🏗️✏️📍⚠️💡📤🔗👤]/u);
  });
});
