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

describe('anasayfa Apple Liquid Glass — süreç kartları veri kutusu', () => {
  it('.dataVal/.dataValBold/.dataValHighlight/.dataValOk tabular-nums + mono olmalı', () => {
    for (const cls of ['dataVal', 'dataValBold', 'dataValHighlight', 'dataValOk']) {
      const re = new RegExp(`\\.${cls}\\s*\\{([^}]*)\\}`);
      const match = pageCss.match(re);
      expect(match).not.toBeNull();
      expect(match![1]).toMatch(/font-variant-numeric:\s*tabular-nums/);
    }
  });
});

describe('anasayfa Apple Liquid Glass — vision/mission cam yüzey hizalaması', () => {
  it('.visionCard tam olarak bir kez tanımlı olmalı (ölü ikinci blok silinmiş)', () => {
    const matches = pageCss.match(/^\.visionCard\s*\{/gm) || [];
    expect(matches.length).toBe(1);
  });

  it('.visionMission tam olarak bir kez tanımlı olmalı (base kural; @media içindeki responsive override hariç)', () => {
    const matches = pageCss.match(/^\.visionMission\s*\{/gm) || [];
    expect(matches.length).toBe(1);
  });

  it('.visionCard:hover tam olarak bir kez tanımlı olmalı', () => {
    const matches = pageCss.match(/^\.visionCard:hover\s*\{/gm) || [];
    expect(matches.length).toBe(1);
  });

  it('light-tema .visionCard nested-glass referans desenini kullanmalı (mavi tint gradient + kenar parıltısı box-shadow)', () => {
    const lightMatch = pageCss.match(/:global\(\[data-theme='light'\]\)\s*\.visionCard\s*\{([^}]*)\}/);
    expect(lightMatch).not.toBeNull();
    expect(lightMatch![1]).toMatch(/linear-gradient\(165deg/);
    expect(lightMatch![1]).toMatch(/inset 0 1px 0 rgba\(255,\s*255,\s*255,\s*0\.85\)/);
  });

  it('.visionCard konsolide blok birleşik property setini korumalı (final review I2 fix — .visionImageContainer/.visionImg CSS\'te tanımsız, overflow:hidden tek clip mekanizması; bu guard olmadan "gereksiz görünen" bir satır silindiğinde suite 345/345 geçerdi ama vision bölümü görsel olarak bozulurdu)', () => {
    const match = pageCss.match(/^\.visionCard\s*\{([^}]*)\}/m);
    expect(match).not.toBeNull();
    const body = match![1];
    for (const prop of [
      /overflow:\s*hidden/,
      /display:\s*flex/,
      /flex-direction:\s*column/,
      /align-items:\s*center/,
      /padding:\s*2\.5rem 2rem/,
      /text-align:\s*center/,
      /border-radius:\s*24px/,
    ]) {
      expect(body).toMatch(prop);
    }
  });
});

describe('anasayfa Apple Liquid Glass — blog kartları', () => {
  it('.blogCard hover kenar parıltısı mavi-ailesi olmalı (zaten öyleydi, regresyon guard\'ı)', () => {
    expect(pageCss).toMatch(/\.blogCard:hover\s*\{[^}]*rgba\(31,\s*111,\s*235/);
  });

  it('.blogCategoryTag border\'ı mavi-aileye geçmeli ve arka plan opaklığı düşmeli (0.75→0.55, navy zemin okunabilirlik için korunur)', () => {
    const match = pageCss.match(/\.blogCategoryTag\s*\{([^}]*)\}/);
    expect(match).not.toBeNull();
    expect(match![1]).toMatch(/rgba\(31,\s*111,\s*235,\s*0\.35\)/);
    expect(match![1]).toMatch(/rgba\(15,\s*23,\s*42,\s*0\.55\)/);
  });
});

describe('anasayfa Apple Liquid Glass — FAQ', () => {
  it('light-tema .faqItem nested-glass referans desenini kullanmalı', () => {
    const lightMatch = pageCss.match(/:global\(\[data-theme='light'\]\)\s*\.faqItem\s*\{([^}]*)\}/);
    expect(lightMatch).not.toBeNull();
    expect(lightMatch![1]).toMatch(/linear-gradient\(165deg/);
  });

  it('.faqItem blueprint grid dokusu içermeli (fotoğrafsız yüzey, aksan uygun)', () => {
    const match = pageCss.match(/\.faqItem\s*\{([^}]*)\}/);
    expect(match).not.toBeNull();
    expect(match![1]).toMatch(/repeating-linear-gradient/);
  });

  it('.faqOpen da blueprint doku katmanını korumalı (açık accordion durumunda doku kaybolmamalı)', () => {
    const match = pageCss.match(/\.faqOpen\s*\{([^}]*)\}/);
    expect(match).not.toBeNull();
    expect(match![1]).toMatch(/repeating-linear-gradient/);
  });

  it('light-tema .faqOpen override tanımlı olmalı ve var(--primary) kenar + doku taşımalı (final review I1 fix — .faqOpen light temada dead rule idi, specificity (0,2,0) .faqItem override tarafından eziliyordu)', () => {
    const lightOpenMatch = pageCss.match(/:global\(\[data-theme='light'\]\)\s*\.faqItem\.faqOpen\s*\{([^}]*)\}/);
    expect(lightOpenMatch).not.toBeNull();
    expect(lightOpenMatch![1]).toMatch(/border-color:\s*var\(--primary\)/);
    expect(lightOpenMatch![1]).toMatch(/repeating-linear-gradient/);
  });

  it('light-tema .faqOpen override bileşik seçici (.faqItem.faqOpen) kullanmalı — tek sınıflı hâle sadeleştirme specificity (0,2,0) eşitliğine ve sıra bağımlılığına geri döner (re-review specificity hardening)', () => {
    expect(pageCss).toMatch(/:global\(\[data-theme='light'\]\)\s*\.faqItem\.faqOpen\s*\{/);
  });
});

describe('anasayfa Apple Liquid Glass — CTA', () => {
  it('.ctaSection kenar parıltısı (inset highlight) içermeli, referans desenle tutarlı', () => {
    const match = pageCss.match(/\.ctaSection\s*\{([^}]*)\}/);
    expect(match).not.toBeNull();
    expect(match![1]).toMatch(/inset 0 1px 0 rgba\(255,\s*255,\s*255,\s*0\.[0-9]+\)/);
  });

  it('light-tema .ctaSection nested-glass referans desenini kullanmalı (flat beyaz yerine mavi tint gradient + kenar parıltısı)', () => {
    const lightMatch = pageCss.match(/:global\(\[data-theme='light'\]\)\s*\.ctaSection\s*\{([^}]*)\}/);
    expect(lightMatch).not.toBeNull();
    expect(lightMatch![1]).toMatch(/linear-gradient\(165deg/);
    expect(lightMatch![1]).toMatch(/inset 0 1px 0 rgba\(255,\s*255,\s*255,\s*0\.[0-9]+\)/);
  });
});
