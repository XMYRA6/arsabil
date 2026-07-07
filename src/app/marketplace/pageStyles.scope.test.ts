import fs from 'fs';
import path from 'path';

const pageCss = fs.readFileSync(path.join(__dirname, 'page.module.css'), 'utf8');
const globalsCss = fs.readFileSync(path.join(__dirname, '../globals.css'), 'utf8');

describe('marketplace mobil mühür kimliği token kapsamı', () => {
  it('yeni seal token\'ları globals.css içine hiç sızmamış olmalı', () => {
    expect(globalsCss).not.toMatch(/--seal-(ink|accent|surface|border|text)/);
  });

  it('--seal-accent, hesapla ile aynı Aurora cyan\'ı kullanmalı', () => {
    expect(pageCss).toMatch(/--seal-accent:\s*var\(--aurora-cyan\)/);
    expect(pageCss).toMatch(/--seal-accent-rgb:\s*43,\s*124,\s*255/);
  });

  it('--seal-surface hem dark hem light tema bloğunda tanımlı olmalı', () => {
    expect(pageCss).toMatch(/\[data-theme="dark"\]\s*\.container\s*\{[^}]*--seal-surface:/);
    expect(pageCss).toMatch(/\[data-theme="light"\]\s*\.container\s*\{[^}]*--seal-surface:/);
  });

  it('.container/.topBar/.listPanel mobilde --seal-surface kullanmalı, masaüstü tanımları var(--panel) olarak kalmalı', () => {
    const mediaIndex = pageCss.indexOf('@media (max-width: 768px)');
    const desktopSection = pageCss.slice(0, mediaIndex);
    const mobileSection = pageCss.slice(mediaIndex);
    expect(mobileSection).toMatch(/\.container\s*\{[^}]*background:\s*var\(--seal-surface\)/);
    expect(desktopSection).toMatch(/\.container\s*\{[^}]*background:\s*var\(--panel\)/);
  });

  it('.quickChipActive ve .pageBtnActive mobilde düz --seal-accent kullanmalı (gradient DEĞİL), masaüstü hâlâ --primary olmalı', () => {
    const mediaIndex = pageCss.indexOf('@media (max-width: 768px)');
    const desktopSection = pageCss.slice(0, mediaIndex);
    const mobileSection = pageCss.slice(mediaIndex);
    expect(mobileSection).toMatch(/\.quickChipActive,\s*\n?\s*\.pageBtnActive\s*\{[^}]*background:\s*var\(--seal-accent\)/);
    expect(mobileSection).not.toMatch(/\.quickChipActive[^}]*brand-gradient/);
    expect(desktopSection).toMatch(/\.quickChipActive\s*\{[^}]*background:\s*var\(--primary\)/);
  });
});
