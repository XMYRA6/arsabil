import fs from 'fs'
import path from 'path'

const css = fs.readFileSync(path.join(__dirname, 'WizardShell.module.css'), 'utf8')

describe('WizardShell mobil CSS kapsam guard', () => {
  const mediaIndex = css.indexOf('@media (max-width: 768px)')

  it('mobil media query en az bir kez tanımlı olmalı', () => {
    expect(mediaIndex).toBeGreaterThan(-1)
  })

  it('.pageTitle masaüstünde görünür, mobilde gizli olmalı (AppBar zaten başlığı gösteriyor)', () => {
    const baseIndex = css.indexOf('.pageTitle {')
    expect(baseIndex).toBeGreaterThan(-1)
    expect(baseIndex).toBeLessThan(mediaIndex)
    const baseBlock = css.slice(baseIndex, css.indexOf('}', baseIndex))
    expect(baseBlock).not.toMatch(/display:\s*none/)
    const mobileBlock = css.slice(mediaIndex)
    expect(mobileBlock).toMatch(/\.pageTitle\s*\{[^}]*display:\s*none/)
  })

  it('.stepTitle masaüstünde görünür, mobilde gizli olmalı (AppBar aynı metni gösteriyor, çift başlık önlenir)', () => {
    const baseIndex = css.indexOf('.stepTitle {')
    expect(baseIndex).toBeGreaterThan(-1)
    expect(baseIndex).toBeLessThan(mediaIndex)
    const baseBlock = css.slice(baseIndex, css.indexOf('}', baseIndex))
    expect(baseBlock).not.toMatch(/display:\s*none/)
    const mobileBlock = css.slice(mediaIndex)
    expect(mobileBlock).toMatch(/\.stepTitle\s*\{[^}]*display:\s*none/)
  })

  it('.nav masaüstünde görünür, mobilde gizli olmalı (StickyActionBar yerini alıyor)', () => {
    const baseIndex = css.indexOf('.nav {')
    expect(baseIndex).toBeGreaterThan(-1)
    expect(baseIndex).toBeLessThan(mediaIndex)
    const baseBlock = css.slice(baseIndex, css.indexOf('}', baseIndex))
    expect(baseBlock).not.toMatch(/display:\s*none/)
    const mobileBlock = css.slice(mediaIndex)
    expect(mobileBlock).toMatch(/\.nav\s*\{[^}]*display:\s*none/)
  })

  it('.container mobilde StickyActionBar+BottomNavbar için alt boşluk bırakmalı', () => {
    const mobileBlock = css.slice(mediaIndex)
    expect(mobileBlock).toMatch(/\.container\s*\{[^}]*calc\(var\(--bottomnav-height\)\s*\+\s*76px\)/)
  })
})

describe('wizard mobil mühür kimliği (Faz 2.5)', () => {
  const progressCss = fs.readFileSync(path.join(__dirname, 'WizardProgress.module.css'), 'utf8');
  const wizardCss = fs.readFileSync(path.join(__dirname, 'wizard.module.css'), 'utf8');

  it('token tanımı YALNIZCA WizardShell.module.css\'te olmalı (tek kaynak)', () => {
    expect(css).toMatch(/--seal-surface:/);
    expect(progressCss).not.toMatch(/--seal-[a-z-]*:/);
    expect(wizardCss).not.toMatch(/--seal-[a-z-]*:/);
  });

  it('--seal-accent kanonik Aurora cyan olmalı', () => {
    expect(css).toMatch(/--seal-accent:\s*var\(--aurora-cyan\)/);
    expect(css).not.toMatch(/#4C8DFF/i);
  });

  it('token tanımları mobil media query İÇİNDE olmalı', () => {
    const mediaIndex = css.indexOf('@media (max-width: 768px)');
    expect(css.indexOf('--seal-surface:')).toBeGreaterThan(mediaIndex);
  });

  it('.card mobilde seal cam yüzeyine geçmeli', () => {
    const mobile = css.slice(css.indexOf('@media (max-width: 768px)'));
    expect(mobile).toMatch(/\.card\s*\{[^}]*background:\s*var\(--seal-surface\)/);
  });

  it('.stickyNextBtn seal aksan dolgusu, .stickyBackBtn outline almalı', () => {
    const mobile = css.slice(css.indexOf('@media (max-width: 768px)'));
    expect(mobile).toMatch(/\.stickyNextBtn\s*\{[^}]*background:\s*var\(--seal-accent\)/);
    expect(mobile).toMatch(/\.stickyBackBtn\s*\{[^}]*border:\s*1px solid var\(--seal-border\)/);
  });

  it('WizardProgress aktif/tamamlanmış durumları mobilde seal aksanı tüketmeli', () => {
    const mobile = progressCss.slice(progressCss.indexOf('@media (max-width: 768px)'));
    expect(mobile).toMatch(/\.circleActive\s*\{[^}]*background:\s*var\(--seal-accent\)/);
    expect(mobile).toMatch(/\.circleDone\s*\{[^}]*background:\s*var\(--seal-accent\)/);
    expect(mobile).toMatch(/\.connectorDone\s*\{[^}]*background:\s*var\(--seal-accent\)/);
    expect(mobile).toMatch(/\.connectorActive\s*\{[^}]*background:\s*var\(--seal-accent\)/);
  });

  it('masaüstü dalları korunmalı: .nav/.pageTitle/.stepTitle mobilde hâlâ gizli', () => {
    const mobile = css.slice(css.indexOf('@media (max-width: 768px)'));
    expect(mobile).toMatch(/\.pageTitle\s*\{[^}]*display:\s*none/);
    expect(mobile).toMatch(/\.stepTitle\s*\{[^}]*display:\s*none/);
    expect(mobile).toMatch(/\.nav\s*\{[^}]*display:\s*none/);
  });

  it('masaüstü .nextBtn hâlâ brand-gradient kullanmalı (değişmedi)', () => {
    const desktop = css.slice(0, css.indexOf('@media (max-width: 768px)'));
    expect(desktop).toMatch(/\.nextBtn\s*\{[^}]*background:\s*var\(--brand-gradient\)/);
  });
});
