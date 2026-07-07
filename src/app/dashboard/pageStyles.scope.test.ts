import fs from 'fs';
import path from 'path';

const pageCss = fs.readFileSync(path.join(__dirname, 'page.module.css'), 'utf8');
const globalsCss = fs.readFileSync(path.join(__dirname, '../globals.css'), 'utf8');

describe('dashboard mobil mühür kimliği token kapsamı', () => {
  it('yeni seal token\'ları globals.css içine hiç sızmamış olmalı', () => {
    expect(globalsCss).not.toMatch(/--seal-(ink|accent|surface|border|recessed)/);
  });

  it('--seal-accent, hesapla ile aynı Aurora cyan\'ı kullanmalı', () => {
    expect(pageCss).toMatch(/--seal-accent:\s*var\(--aurora-cyan\)/);
  });

  it('--seal-surface hem dark hem light tema bloğunda tanımlı olmalı', () => {
    expect(pageCss).toMatch(/\[data-theme="dark"\]\s*\.container\s*\{[^}]*--seal-surface:/);
    expect(pageCss).toMatch(/\[data-theme="light"\]\s*\.container\s*\{[^}]*--seal-surface:/);
  });

  it('.section mobilde --seal-surface kullanmalı, masaüstü tanımı hâlâ var(--panel) olmalı', () => {
    const mediaIndex = pageCss.indexOf('@media (max-width: 768px)');
    const desktopSection = pageCss.slice(0, mediaIndex);
    const mobileSection = pageCss.slice(mediaIndex);
    expect(mobileSection).toMatch(/\.section\s*\{[^}]*background:\s*var\(--seal-surface\)/);
    expect(desktopSection).toMatch(/\.section\s*\{[^}]*background:\s*var\(--panel\)/);
  });

  it('.reportRow/.offerRow mobilde --seal-recessed kullanmalı, .statCard/.offerStatus dokunulmamalı', () => {
    const mediaIndex = pageCss.indexOf('@media (max-width: 768px)');
    const mobileSection = pageCss.slice(mediaIndex);
    expect(mobileSection).toMatch(/\.reportRow,\s*\n?\s*\.offerRow\s*\{[^}]*background:\s*var\(--seal-recessed\)/);
    expect(mobileSection).not.toMatch(/\.statCard\s*\{[^}]*seal-/);
    expect(mobileSection).not.toMatch(/\.offerStatus\s*\{[^}]*seal-/);
  });

  it('.statValue/.reportMeta/.offerAmount mobilde tabular-nums olmalı', () => {
    const mediaIndex = pageCss.indexOf('@media (max-width: 768px)');
    const mobileSection = pageCss.slice(mediaIndex);
    expect(mobileSection).toMatch(/\.statValue,[\s\S]*?font-variant-numeric:\s*tabular-nums/);
  });
});
