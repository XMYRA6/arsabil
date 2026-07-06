import fs from 'fs';
import path from 'path';

const pageCss = fs.readFileSync(path.join(__dirname, 'page.module.css'), 'utf8');
const globalsCss = fs.readFileSync(
  path.join(__dirname, '../globals.css'),
  'utf8'
);

describe('hesapla mobil Mühür Lacivert token kapsamı', () => {
  it('yeni seal token\'ları globals.css içine hiç sızmamış olmalı', () => {
    expect(globalsCss).not.toMatch(/--seal-(ink|accent|paper)/);
  });

  it('--seal-accent token\'ı page.module.css içinde tanımlı olmalı', () => {
    expect(pageCss).toMatch(/--seal-accent:\s*#C9A15A/);
  });

  it('--seal-accent tanımı, mobil @media (max-width: 768px) bloğunun içinde olmalı', () => {
    const lastMobileMediaIndex = pageCss.lastIndexOf('@media (max-width: 768px)');
    const sealAccentIndex = pageCss.indexOf('--seal-accent:');
    expect(lastMobileMediaIndex).toBeGreaterThan(-1);
    expect(sealAccentIndex).toBeGreaterThan(lastMobileMediaIndex);
  });

  it('--seal-paper-rgb token\'ı page.module.css içinde tanımlı olmalı', () => {
    expect(pageCss).toMatch(/--seal-paper-rgb:\s*244,\s*240,\s*230/);
  });

  it('--seal-paper-rgb tanımı, mobil @media (max-width: 768px) bloğunun içinde olmalı', () => {
    const lastMobileMediaIndex = pageCss.lastIndexOf('@media (max-width: 768px)');
    const sealPaperRgbIndex = pageCss.indexOf('--seal-paper-rgb:');
    expect(lastMobileMediaIndex).toBeGreaterThan(-1);
    expect(sealPaperRgbIndex).toBeGreaterThan(lastMobileMediaIndex);
  });
});
