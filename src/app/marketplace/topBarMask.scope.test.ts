import fs from 'fs';
import path from 'path';

const pageCss = fs.readFileSync(path.join(__dirname, 'page.module.css'), 'utf8');

describe('marketplace topBar scroll fade (mobile-only)', () => {
  it('mobilde .topBar mask-image gradient içermeli (sağdan solmaya)', () => {
    const mediaIndex = pageCss.indexOf('@media (max-width: 768px)');
    const mobileSection = pageCss.slice(mediaIndex);
    expect(mobileSection).toMatch(/\.topBar\s*\{[^}]*mask-image:\s*linear-gradient\(to right,\s*black\s*calc\(100%\s*-\s*28px\),\s*transparent\s*100%\)/);
  });

  it('mobilde .topBar -webkit-mask-image prefixed versiyonu da içermeli', () => {
    const mediaIndex = pageCss.indexOf('@media (max-width: 768px)');
    const mobileSection = pageCss.slice(mediaIndex);
    expect(mobileSection).toMatch(/\.topBar\s*\{[^}]*-webkit-mask-image:\s*linear-gradient\(to right,\s*black\s*calc\(100%\s*-\s*28px\),\s*transparent\s*100%\)/);
  });

  it('masaüstü .topBar mask-image içermemeli (regresyon koruması)', () => {
    const mediaIndex = pageCss.indexOf('@media (max-width: 768px)');
    const desktopSection = pageCss.slice(0, mediaIndex);
    expect(desktopSection).not.toMatch(/\.topBar[^}]*mask-image/);
    expect(desktopSection).not.toMatch(/\.topBar[^}]*-webkit-mask-image/);
  });
});
