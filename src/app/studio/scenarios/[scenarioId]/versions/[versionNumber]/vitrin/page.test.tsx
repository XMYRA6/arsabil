import fs from 'fs';
import path from 'path';

const dir = __dirname;
const page = fs.readFileSync(path.join(dir, 'page.tsx'), 'utf8');
const cssPath = path.join(dir, 'page.module.css');
const css = fs.existsSync(cssPath) ? fs.readFileSync(cssPath, 'utf8') : '';

describe('studio vitrin sayfasi (urun yerlesimi)', () => {
  it('owner-only: oturum yoksa signin sayfasina yonlendirir', () => {
    expect(page).toMatch(/getServerSession\(authOptions\)/);
    expect(page).toMatch(/redirect\('\/auth\/signin'\)/);
  });

  it('gecersiz veya eksik versiyon icin notFound dondurur', () => {
    expect(page).toMatch(/notFound\(\)/);
    expect(page).toMatch(/getStudioScenarioVersionDetail\(/);
  });

  it('StudioVitrinPreview bilesenine scenarioId, versionNumber ve isPro gecirir', () => {
    expect(page).toMatch(/scenarioId=\{scenarioId\}/);
    expect(page).toMatch(/versionNumber=\{versionNum\}/);
    expect(page).toMatch(/isPro=\{user\?\.plan === 'PRO'\}/);
  });

  it('hesaplama aracina donus baglantisi tasir', () => {
    expect(page).toMatch(/href="\/hesapla"/);
  });

  it('gecici dev-kapisi degil, gercek urun sayfasi olarak isaretlenmis', () => {
    expect(page).not.toMatch(/geçici bir kapı|kesin ürün yerleşimi DEĞİL/i);
  });

  it('inline dark hex yerine CSS module + tema tokenlari kullanir', () => {
    expect(page).toMatch(/import styles from '\.\/page\.module\.css'/);
    expect(page).not.toMatch(/background:\s*'#090d16'/);
    expect(css).toMatch(/\.page\s*\{[^}]*background:\s*var\(--bg\)/);
    expect(css).toMatch(/color:\s*var\(--text\)/);
    expect(css).toMatch(/var\(--panel\)/);
  });
});
