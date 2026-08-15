import fs from 'fs';
import path from 'path';

const pageCss = fs.readFileSync(path.join(__dirname, 'page.module.css'), 'utf8');
const globalsCss = fs.readFileSync(path.join(__dirname, '../globals.css'), 'utf8');

describe('marketplace mobil Liquid Glass token kapsamı', () => {
  it('yeni seal token\'ları globals.css içine hiç sızmamış olmalı', () => {
    expect(globalsCss).not.toMatch(/--seal-(ink|accent|surface|border|text)/);
  });

    it('.container/.topBar/.listPanel mobilde --m-* tokenlari kullanmali, masaustu var(--panel) kalmali', () => {
    const mediaIndex = pageCss.indexOf('@media (max-width: 768px)');
    const desktopSection = pageCss.slice(0, mediaIndex);
    const mobileSection = pageCss.slice(mediaIndex);
    expect(mobileSection).toMatch(/\.container\s*\{[^}]*background:\s*var\(--m-mesh\)/);
    expect(desktopSection).toMatch(/\.container\s*\{[^}]*background:\s*var\(--panel\)/);
  });

  it('.quickChipActive ve .pageBtnActive mobilde Liquid Glass gradient kullanmali, masaustu hala --primary olmali', () => {
    const mediaIndex = pageCss.indexOf('@media (max-width: 768px)');
    const desktopSection = pageCss.slice(0, mediaIndex);
    const mobileSection = pageCss.slice(mediaIndex);
    expect(mobileSection).toMatch(/\.quickChipActive,\s*\n?\s*\.pageBtnActive\s*\{[^}]*background:\s*var\(--m-grad-accent\)/);
    expect(mobileSection).not.toMatch(/\.quickChipActive[^}]*brand-gradient/);
    expect(desktopSection).toMatch(/\.quickChipActive\s*\{[^}]*background:\s*var\(--primary\)/);
  });
});

describe('marketplace profesyonel tema token kullanimi', () => {
  it('container ve map panel radius/border tokenlari kullanir', () => {
    const container = pageCss.match(/\.container\s*\{([^}]*)\}/);
    const mapPanel = pageCss.match(/\.mapPanel\s*\{([^}]*)\}/);
    expect(container).not.toBeNull();
    expect(mapPanel).not.toBeNull();
    expect(container![1]).toMatch(/border-radius:\s*0 0 var\(--radius-lg\) var\(--radius-lg\)/);
    expect(mapPanel![1]).toMatch(/border-left:\s*1px solid var\(--border\)/);
    expect(mapPanel![1]).toMatch(/border-radius:\s*var\(--radius-lg\)/);
  });

  it('filter CTA kompakt label stilini kullanir', () => {
    const match = pageCss.match(/\.filterBtn\s*\{([^}]*)\}/);
    expect(match).not.toBeNull();
    expect(match![1]).toMatch(/background:\s*var\(--m-grad-btn\)/);
    expect(match![1]).toMatch(/border-radius:\s*var\(--radius-md\)/);
    expect(match![1]).toMatch(/text-transform:\s*uppercase/);
  });

  it('empty state ikonu lacivert primary tokenina bagli', () => {
    const match = pageCss.match(/\.emptyStateIcon\s*\{([^}]*)\}/);
    expect(match).not.toBeNull();
    expect(match![1]).toMatch(/color:\s*var\(--primary\)/);
  });
});

