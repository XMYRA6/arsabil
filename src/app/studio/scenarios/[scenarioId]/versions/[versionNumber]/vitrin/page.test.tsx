import fs from 'fs';
import path from 'path';

const dir = __dirname;
const page = fs.readFileSync(path.join(dir, 'page.tsx'), 'utf8');
const view = fs.readFileSync(path.join(dir, 'VitrinProje.tsx'), 'utf8');
const css = fs.readFileSync(path.join(dir, 'page.module.css'), 'utf8');

describe('studio proje vitrini (Figma 11)', () => {
  it('owner-only: oturum yoksa signin sayfasina yonlendirir', () => {
    expect(page).toMatch(/getServerSession\(authOptions\)/);
    expect(page).toMatch(/redirect\('\/auth\/signin'\)/);
  });

  it('gecersiz veya eksik versiyon icin notFound dondurur', () => {
    expect(page).toMatch(/notFound\(\)/);
    expect(page).toMatch(/getStudioScenarioVersionDetail\(/);
    expect(page).toMatch(/getStudioScenarioById\(/);
  });

  it('kayitli snapshotu motoru calistirmadan view modelden gosterir', () => {
    expect(page).toMatch(/buildStudioProposalViewModel\(/);
  });

  it('diorama, istatistik kartlari, program karmasi ve 2B yerlesimi sunar', () => {
    expect(view).toMatch(/resolveScene\(/);
    expect(view).toContain('Program karması');
    expect(view).toContain('2B yerleşim');
    expect(view).toContain('Teklif ver');
    expect(view).toContain('Senaryoları gör');
  });

  it('eski cam/hex degerleri yerine Arazi tokenlarini kullanir', () => {
    expect(css).toMatch(/\.page\s*\{[^}]*background:\s*var\(--bg\)/);
    expect(css).toMatch(/var\(--amber-soft\)/);
    expect(css).not.toMatch(/var\(--m-|--seal-|#[0-9a-fA-F]{3,6}\b/);
  });
});
