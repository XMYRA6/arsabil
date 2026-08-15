import fs from 'fs';
import path from 'path';

const css = fs.readFileSync(path.join(__dirname, 'FilterSidebar.module.css'), 'utf8');

describe('FilterSidebar mobil Liquid Glass sheet yuzeyi', () => {
  const mediaIndex = css.indexOf('@media (max-width: 768px)');
  const mobile = css.slice(mediaIndex);

  it('inSheet varyanti paylasilan .mStatSurface yuzeyine baglanir (kart tekduzeligi duzeltmesi)', () => {
    expect(mediaIndex).toBeGreaterThan(-1);
    expect(css).toMatch(/\.inSheet\s*\{[^}]*composes:\s*mStatSurface from global/);
    expect(mobile).not.toMatch(/\.inSheet\s*\{[^}]*background:\s*var\(--m-glass-bg\)/);
  });

  it('mobil secilebilir kontroller 44px dokunma hedefini korur', () => {
    expect(mobile).toMatch(/\.checkRow,\s*\.chip,\s*\.toggleRow\s*\{[^}]*min-height:\s*var\(--touch-target\)/);
    expect(mobile).toMatch(/\.rangeInput\s*\{[^}]*height:\s*var\(--input-height-mobile\)/);
  });

  it('aktif chip, checkbox, toggle ve uygula butonu mavi Liquid Glass gradient kullanir', () => {
    expect(mobile).toMatch(/\.chipActive\s*\{[^}]*background:\s*var\(--m-grad-accent\)/);
    expect(mobile).toMatch(/\.checkBoxActive,\s*\.toggleTrackActive\s*\{[^}]*background:\s*var\(--m-grad-accent\)/);
    expect(mobile).toMatch(/\.applyBtn\s*\{[^}]*background:\s*var\(--m-grad-btn\)/);
  });
});
