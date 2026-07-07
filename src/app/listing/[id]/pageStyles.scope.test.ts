import fs from 'fs';
import path from 'path';

const pageCss = fs.readFileSync(path.join(__dirname, 'page.module.css'), 'utf8');
const globalsCss = fs.readFileSync(path.join(__dirname, '../../globals.css'), 'utf8');

describe('listing/[id] mobil mühür kimliği token kapsamı', () => {
  it('yeni seal token\'ları globals.css içine hiç sızmamış olmalı', () => {
    expect(globalsCss).not.toMatch(/--seal-(ink|accent|surface|border|text|recessed)/);
  });

  it('--seal-accent, hesapla ile aynı Aurora cyan\'ı kullanmalı', () => {
    expect(pageCss).toMatch(/--seal-accent:\s*var\(--aurora-cyan\)/);
    expect(pageCss).toMatch(/--seal-accent-rgb:\s*43,\s*124,\s*255/);
  });

  it('--seal-ink tanımı mobil @media (max-width: 768px) bloğunun içinde olmalı', () => {
    const mediaIndex = pageCss.indexOf('@media (max-width: 768px)');
    const tokenIndex = pageCss.indexOf('--seal-ink:');
    expect(mediaIndex).toBeGreaterThan(-1);
    expect(tokenIndex).toBeGreaterThan(mediaIndex);
  });

  it('--seal-surface hem dark hem light tema bloğunda tanımlı olmalı', () => {
    expect(pageCss).toMatch(/\[data-theme="dark"\]\s*\.page\s*\{[^}]*--seal-surface:/);
    expect(pageCss).toMatch(/\[data-theme="light"\]\s*\.page\s*\{[^}]*--seal-surface:/);
  });

  it('light temada --seal-surface mevcut --shell-bg\'yi yeniden kullanmalı (yeni rgba icat edilmemeli)', () => {
    expect(pageCss).toMatch(/\[data-theme="light"\]\s*\.page\s*\{[^}]*--seal-surface:\s*var\(--shell-bg\)/);
  });

  it('.primaryBtn ve .actionPrimary mobilde brand-gradient kullanmalı, masaüstü tanımları hâlâ düz --primary olmalı', () => {
    const mediaIndex = pageCss.indexOf('@media (max-width: 768px)');
    const desktopSection = pageCss.slice(0, mediaIndex);
    const mobileSection = pageCss.slice(mediaIndex);
    expect(mobileSection).toMatch(/\.primaryBtn,\s*\n?\s*\.actionPrimary\s*\{[^}]*background:\s*var\(--brand-gradient\)/);
    expect(desktopSection).toMatch(/\.primaryBtn\s*\{[^}]*background:\s*var\(--primary\)/);
    expect(desktopSection).toMatch(/\.actionPrimary\s*\{[^}]*background:\s*var\(--primary\)/);
  });

  it('.detailCell/.fizCell mobilde --seal-recessed kullanmalı (panelle aynı seal-surface olup kaybolmamalı)', () => {
    expect(pageCss).toMatch(/\.detailCell,\s*\n?\s*\.fizCell\s*\{[^}]*background:\s*var\(--seal-recessed\)/);
  });

  it('.sidebar ve .tabContent mobilde --seal-surface cam yüzeyine geçmeli', () => {
    expect(pageCss).toMatch(/\.sidebar\s*\{[^}]*background:\s*var\(--seal-surface\)/);
    expect(pageCss).toMatch(/\.tabContent\s*\{[^}]*background:\s*var\(--seal-surface\)/);
  });
});
