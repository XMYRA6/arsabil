import fs from 'fs';
import path from 'path';

const css = fs.readFileSync(path.join(__dirname, 'ListingCard.module.css'), 'utf8');

describe('ListingCard mobil tipografi kapsamı', () => {
  it('.dataNum tanımı @media (max-width: 768px) bloğunun içinde olmalı', () => {
    const mediaIndex = css.indexOf('@media (max-width: 768px)');
    const classIndex = css.indexOf('.dataNum');
    expect(mediaIndex).toBeGreaterThan(-1);
    expect(classIndex).toBeGreaterThan(mediaIndex);
  });

  it('.dataNum tabular-nums ve mono font kullanmalı', () => {
    expect(css).toMatch(/\.dataNum\s*\{[^}]*font-variant-numeric:\s*tabular-nums/);
    expect(css).toMatch(/\.dataNum\s*\{[^}]*JetBrains Mono/);
  });
});
