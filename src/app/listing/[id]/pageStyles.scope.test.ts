import fs from 'fs';
import path from 'path';

const pageCss = fs.readFileSync(path.join(__dirname, 'page.module.css'), 'utf8');
const globalsCss = fs.readFileSync(path.join(__dirname, '../../globals.css'), 'utf8');

describe('listing/[id] mobil Liquid Glass token kapsamı', () => {
  it('mobil tasarim tokenlari globals.css icinde --m-* olarak tanimli olmali', () => {
    expect(globalsCss).toMatch(/--m-glass-bg:/);
    expect(globalsCss).toMatch(/--m-mesh:/);
    expect(globalsCss).toMatch(/--m-grad-btn:/);
  });

  it('.page mobilde --m-mesh kullanmali, masaustu padding duzeni korunmali', () => {
    const mediaIndex = pageCss.indexOf('MOBİL');
    const desktopSection = pageCss.slice(0, mediaIndex);
    const mobileSection = pageCss.slice(mediaIndex);
    expect(mobileSection).toMatch(/\.page\s*\{[^}]*background:\s*var\(--m-mesh\)/);
    expect(desktopSection).toMatch(/\.page\s*\{[^}]*padding:\s*2rem 1rem/);
  });

  it('.primaryBtn ve .actionPrimary mobilde --m-grad-btn kullanmali, masaustu tanimlari hala duz --primary olmali', () => {
    const mediaIndex = pageCss.indexOf('MOBİL');
    const desktopSection = pageCss.slice(0, mediaIndex);
    const mobileSection = pageCss.slice(mediaIndex);
    expect(mobileSection).toMatch(/\.primaryBtn,\s*\.actionPrimary,\s*\.offerSubmit\s*\{[^}]*background:\s*var\(--m-grad-btn\)/);
    expect(desktopSection).toMatch(/\.primaryBtn\s*\{[^}]*background:\s*var\(--primary\)/);
    expect(desktopSection).toMatch(/\.actionPrimary\s*\{[^}]*background:\s*var\(--primary\)/);
  });

  it('.detailCell/.fizCell mobilde --m-fill kullanmali', () => {
    expect(pageCss).toMatch(/\.detailCell,\s*\.fizCell,\s*\.miniStat,\s*\.noLocationNote\s*\{[^}]*background:\s*var\(--m-fill\)/);
  });

  it('.sidebar ve .tabContent mobilde --m-glass-bg cam yuzeyine gecmeli', () => {
    expect(pageCss).toMatch(/\.sidebar\s*\{[^}]*background:\s*var\(--m-glass-bg\)/);
    expect(pageCss).toMatch(/\.tabContent\s*\{[^}]*background:\s*var\(--m-glass-bg\)/);
  });
});
