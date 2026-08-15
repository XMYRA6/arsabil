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

describe('ListingCard profesyonel kart dili', () => {
  it('kart hover davranisi shadow-hover tokenina ve yukari kalkisa bagli', () => {
    const match = css.match(/\.cardRoot:hover\s*\{([^}]*)\}/);
    expect(match).not.toBeNull();
    expect(match![1]).toMatch(/transform:\s*translateY\(-4px\)/);
    expect(match![1]).toMatch(/box-shadow:\s*var\(--shadow-hover\)/);
  });

  it('foto alani sabit oran, fiyat metni primary token kullanir', () => {
    const photo = css.match(/\.photoFrame\s*\{([^}]*)\}/);
    const price = css.match(/\.priceText\s*\{([^}]*)\}/);
    expect(photo).not.toBeNull();
    expect(price).not.toBeNull();
    expect(photo![1]).toMatch(/aspect-ratio:\s*16\s*\/\s*10/);
    expect(price![1]).toMatch(/color:\s*var\(--primary\)/);
  });

  it('favori butonu foto uzerinde cam pill yuzey kullanir', () => {
    const match = css.match(/\.favoriteButton\s*\{([^}]*)\}/);
    expect(match).not.toBeNull();
    expect(match![1]).toMatch(/border-radius:\s*999px/);
    expect(match![1]).toMatch(/backdrop-filter:\s*blur\(14px\)/);
  });

  it('aktif durum rozeti yesil nokta pseudo-elementi tanimlar', () => {
    expect(css).toMatch(/\.statusBadge::before\s*\{[^}]*background:\s*var\(--green\)/);
  });
});

