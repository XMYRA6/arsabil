import fs from 'fs';
import path from 'path';

const css = fs.readFileSync(path.join(__dirname, 'FilterSidebar.module.css'), 'utf8');

describe('FilterSidebar mobil Liquid Glass sheet yuzeyi', () => {
  const mediaIndex = css.indexOf('@media (max-width: 768px)');
  const mobile = css.slice(mediaIndex);

  it('inSheet varyanti mobilde cam yuzey ve m tokenlari kullanir', () => {
    expect(mediaIndex).toBeGreaterThan(-1);
    expect(mobile).toMatch(/\.inSheet\s*\{[^}]*background:\s*var\(--m-glass-bg\)/);
    expect(mobile).toMatch(/\.inSheet\s*\{[^}]*backdrop-filter:\s*var\(--m-glass-blur\)/);
    expect(mobile).toMatch(/\.inSheet\s*\{[^}]*border-radius:\s*var\(--m-r-sheet\)/);
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
