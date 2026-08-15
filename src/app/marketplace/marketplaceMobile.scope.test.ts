import fs from 'fs';
import path from 'path';

const pageCss = fs.readFileSync(path.join(__dirname, 'page.module.css'), 'utf8');
const listingCardCss = fs.readFileSync(path.join(__dirname, '../../components/marketplace/ListingCard.module.css'), 'utf8');
const listingCardTsx = fs.readFileSync(path.join(__dirname, '../../components/marketplace/ListingCard.tsx'), 'utf8');

describe('marketplace mobil Liquid Glass faz 2', () => {
  const mediaIndex = pageCss.indexOf('@media (max-width: 768px)');
  const mobileSection = pageCss.slice(mediaIndex);

  it('mobil marketplace yuzeyi Faz 0 --m-* tokenlarini kullanir', () => {
    expect(mediaIndex).toBeGreaterThan(-1);
    expect(mobileSection).toMatch(/\.container\s*\{[^}]*background:\s*var\(--m-mesh\)/);
    expect(mobileSection).toMatch(/\.mobileControls\s*\{[^}]*background:\s*var\(--m-glass-bg\)/);
    expect(mobileSection).toMatch(/\.filterBtn\s*\{[^}]*background:\s*var\(--m-grad-btn\)/);
    expect(mobileSection).toMatch(/\.listPanel\s*\{[^}]*background:\s*transparent/);
  });

  it('mobil ListingCard cam kart, mono sayi ve mavi gradient aksan kullanir', () => {
    const cardMobile = listingCardCss.slice(listingCardCss.indexOf('@media (max-width: 768px)'));
    expect(cardMobile).toMatch(/\.cardRoot\s*\{[^}]*background:\s*var\(--m-glass-bg\)/);
    expect(cardMobile).toMatch(/\.cardRoot\s*\{[^}]*backdrop-filter:\s*var\(--m-glass-blur\)/);
    expect(cardMobile).toMatch(/\.priceText\s*\{[^}]*font-family:\s*var\(--m-mono\)/);
    expect(cardMobile).toMatch(/\.typeBadge\s*\{[^}]*background:\s*var\(--m-grad-accent\)/);
  });

  it('ListingCard gorunen ikonlarda emoji kullanmaz', () => {
    expect(listingCardTsx).not.toMatch(/[📍🏗️🔥📈🧮📋📤❤️🤍]/u);
  });
});

