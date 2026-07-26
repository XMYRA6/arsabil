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

describe('anasayfa Apple Liquid Glass — bento --acc scope guard', () => {
  it('.bentoGrid --acc custom property tanımlamalı (bug fix: --acc daha önce yalnızca hiç uygulanmayan .accent* sınıflarında tanımlıydı, bu yüzden .bentoCard ve içindeki tüm var(--acc) referansları unset\'e düşüyordu — kart kenarlığı/gölgesi/arka planı, PDF indirme butonu, cipler ve avatar görünmüyordu)', () => {
    const match = pageCss.match(/\.bentoGrid\s*\{([^}]*)\}/);
    expect(match).not.toBeNull();
    expect(match![1]).toMatch(/--acc:\s*31,\s*111,\s*235/);
  });
});

describe('anasayfa takip kalemleri (2026-07-26) — adım ve vizyon görselleri boyutlandırılmalı', () => {
  // Regresyon: bu 4 sınıf page.tsx'te uygulandığı halde CSS'i HİÇ YOKTU; <img>'ler
  // kendi ham genişliğinde render olup yalnızca kartın overflow:hidden'ı ile
  // gelişigüzel kırpılıyordu. Kural silinirse aynı kusur sessizce geri gelir.
  it.each([
    ['howStepImageContainer', 'howStepImg'],
    ['visionImageContainer', 'visionImg'],
  ])('.%s sabit en-boy oranı, .%s object-fit:cover tanımlamalı', (container, img) => {
    const containerMatch = pageCss.match(new RegExp('\\.' + container + '\\s*\\{([^}]*)\\}'));
    expect(containerMatch).not.toBeNull();
    expect(containerMatch![1]).toMatch(/aspect-ratio:\s*4\s*\/\s*3/);
    expect(containerMatch![1]).toMatch(/overflow:\s*hidden/);

    const imgMatch = pageCss.match(new RegExp('\\.' + img + '\\s*\\{([^}]*)\\}'));
    expect(imgMatch).not.toBeNull();
    expect(imgMatch![1]).toMatch(/object-fit:\s*cover/);
    expect(imgMatch![1]).toMatch(/width:\s*100%/);
  });

  it('page.tsx bu 4 sınıfı gerçekten kullanıyor (test boşa güvence vermesin)', () => {
    expect(pageTsx).toMatch(/styles\.howStepImageContainer/);
    expect(pageTsx).toMatch(/styles\.howStepImg/);
    expect(pageTsx).toMatch(/styles\.visionImageContainer/);
    expect(pageTsx).toMatch(/styles\.visionImg/);
  });
});

describe('anasayfa takip kalemleri (2026-07-26) — stats strip ölü animasyon CSS\'i', () => {
  it('.statItem giriş animasyonu CSS\'i taşımamalı (framer-motion itemVariants sahibi; opacity:0 JS\'siz durumda şeridi kalıcı görünmez bırakıyordu)', () => {
    const match = pageCss.match(/\.statItem\s*\{([^}]*)\}/);
    expect(match).not.toBeNull();
    expect(match![1]).not.toMatch(/opacity:\s*0\s*;/);
    expect(match![1]).not.toMatch(/transform:\s*translateY/);
  });

  it('yetim .statVisible sınıfı tanımlı olmamalı', () => {
    expect(pageCss).not.toMatch(/\.statVisible\s*\{/);
  });

  it('page.tsx stats girişini framer-motion variants ile sürmeli', () => {
    expect(pageTsx).toMatch(/itemVariants/);
    expect(pageTsx).not.toMatch(/styles\.statVisible/);
  });
});

describe('anasayfa takip kalemleri (2026-07-26) — bentoTag dark tema kontrastı', () => {
  it('dark temada .bentoTag açık mavi tona geçmeli (ölçülen: 2.6:1 → 7.3:1, WCAG AA 4.5:1)', () => {
    const match = pageCss.match(/:global\(\[data-theme='dark'\]\)\s*\.bentoTag\s*\{([^}]*)\}/);
    expect(match).not.toBeNull();
    expect(match![1]).toMatch(/color:\s*rgb\(124,\s*168,\s*255\)/);
    expect(match![1]).toMatch(/opacity:\s*1/);
  });

  it('taban .bentoTag ve --acc dokunulmamış olmalı (light tema + kart kenarlığı/gölgesi etkilenmemeli)', () => {
    const base = pageCss.match(/\n\.bentoTag\s*\{([^}]*)\}/);
    expect(base).not.toBeNull();
    expect(base![1]).toMatch(/color:\s*rgb\(var\(--acc\)\)/);
    expect(pageCss).toMatch(/\.bentoGrid\s*\{[^}]*--acc:\s*31,\s*111,\s*235/);
  });
});

describe('anasayfa takip kalemleri (2026-07-26) — blog rozeti cam yarıçapı', () => {
  it('.blogCategoryTag blur yarıçapı >= 14px olmalı, opaklık 0.55 korunmalı', () => {
    const match = pageCss.match(/\.blogCategoryTag\s*\{([^}]*)\}/);
    expect(match).not.toBeNull();
    // Opaklık düşürmek fotoğraf üzerinde beyaz metni okunmaz yapar — kaldıraç blur.
    expect(match![1]).toMatch(/rgba\(15,\s*23,\s*42,\s*0\.55\)/);
    const blur = match![1].match(/backdrop-filter:\s*blur\((\d+)px\)/);
    expect(blur).not.toBeNull();
    expect(Number(blur![1])).toBeGreaterThanOrEqual(14);
  });
});

describe('anasayfa takip kalemleri (2026-07-26) — light cam reçetesi hizalaması', () => {
  it('light .faqItem de .visionCard/.ctaSection gibi üç katmanlı gölge kullanmalı (difüz + halka + iç parıltı)', () => {
    const match = pageCss.match(/:global\(\[data-theme='light'\]\)\s*\.faqItem\s*\{([^}]*)\}/);
    expect(match).not.toBeNull();
    const shadow = match![1].match(/box-shadow:([^;]*);/);
    expect(shadow).not.toBeNull();
    const layers = shadow![1].split(',').map((s) => s.trim()).filter(Boolean);
    // rgba(...) içindeki virgüller yüzünden katman sayısını doğrudan sayamayız;
    // üç katmanın imzasını ayrı ayrı arıyoruz.
    expect(layers.length).toBeGreaterThan(3);
    expect(shadow![1]).toMatch(/0 8px 22px rgba\(31,\s*111,\s*235/);   // dış difüz
    expect(shadow![1]).toMatch(/0 0 0 1px rgba\(31,\s*111,\s*235/);    // halka
    expect(shadow![1]).toMatch(/inset 0 1px 0 rgba\(255,\s*255,\s*255/); // iç parıltı
  });
});
