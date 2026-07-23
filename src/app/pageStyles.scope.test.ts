import fs from 'fs';
import path from 'path';

const pageCss = fs.readFileSync(path.join(__dirname, 'page.module.css'), 'utf8');
const pageTsx = fs.readFileSync(path.join(__dirname, 'page.tsx'), 'utf8');

describe('anasayfa Apple Liquid Glass — hero kicker', () => {
  it('heroBadge (pill/emoji rozet) class tanımı artık yok', () => {
    expect(pageCss).not.toMatch(/\.heroBadge\s*\{/);
  });

  it('heroKicker sade metin olmalı: arka plan/border yok, sadece renk+tipografi', () => {
    const match = pageCss.match(/\.heroKicker\s*\{([^}]*)\}/);
    expect(match).not.toBeNull();
    const body = match![1];
    expect(body).not.toMatch(/background/);
    expect(body).not.toMatch(/border(?!-)/);
    expect(body).toMatch(/color:\s*rgba\(31,\s*111,\s*235/);
    expect(body).toMatch(/font-weight:\s*600/);
  });

  it('page.tsx artık heroBadge class\'ını kullanmıyor, heroKicker kullanıyor', () => {
    expect(pageTsx).not.toMatch(/styles\.heroBadge/);
    expect(pageTsx).toMatch(/styles\.heroKicker/);
  });

  it('page.tsx hero kicker metninde emoji/pill ikonu yok (sade metin)', () => {
    const kickerLineMatch = pageTsx.match(/styles\.heroKicker[^>]*>([^<]*)</);
    expect(kickerLineMatch).not.toBeNull();
    expect(kickerLineMatch![1]).not.toMatch(/✨/);
  });
});

describe('anasayfa Apple Liquid Glass — stats strip', () => {
  it('.statsStrip blueprint grid dokusu içermeli (repeating-linear-gradient, mavi çok düşük alfa)', () => {
    const match = pageCss.match(/\.statsStrip\s*\{([^}]*)\}/);
    expect(match).not.toBeNull();
    expect(match![1]).toMatch(/repeating-linear-gradient/);
    expect(match![1]).toMatch(/rgba\(31,\s*111,\s*235,\s*0\.0[3-8]\)/);
  });

  it('.statVal tabular-nums + mono font kullanmalı', () => {
    const match = pageCss.match(/\.statVal\s*\{([^}]*)\}/);
    expect(match).not.toBeNull();
    expect(match![1]).toMatch(/font-variant-numeric:\s*tabular-nums/);
    expect(match![1]).toMatch(/JetBrains Mono/);
  });
});

describe('anasayfa Apple Liquid Glass — bento tag/num tipografisi', () => {
  it('.bentoNum mono font + tabular-nums kullanmalı (kadastro numaralandırma hissi)', () => {
    const match = pageCss.match(/\.bentoNum\s*\{([^}]*)\}/);
    expect(match).not.toBeNull();
    expect(match![1]).toMatch(/JetBrains Mono/);
    expect(match![1]).toMatch(/font-variant-numeric:\s*tabular-nums/);
  });

  it('.cardBgImage dokunulmamış olmalı (fotoğraf overlay korunuyor)', () => {
    expect(pageCss).toMatch(/\.cardBgImage\s*\{[^}]*opacity:\s*0\.22/);
  });
});
