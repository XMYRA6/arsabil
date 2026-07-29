import fs from 'fs';
import path from 'path';

const pageCss = fs.readFileSync(path.join(__dirname, 'page.module.css'), 'utf8');
const globalsCss = fs.readFileSync(
  path.join(__dirname, '../globals.css'),
  'utf8'
);

describe('hesapla mobil cam kart + aurora mavi vurgu token kapsamı', () => {
  it('yeni seal token\'ları globals.css içine hiç sızmamış olmalı', () => {
    expect(globalsCss).not.toMatch(/--seal-(ink|accent|surface|border|text)/);
  });

  it('--seal-accent marka Aurora cyan\'ı kullanmalı, pirinç sarısı olmamalı', () => {
    expect(pageCss).toMatch(/--seal-accent:\s*var\(--aurora-cyan\)/);
    expect(pageCss).not.toMatch(/--seal-accent:\s*#C9A15A/);
  });

  it('--seal-accent-rgb, --aurora-cyan (#2b7cff) ile tutarlı olmalı (43, 124, 255)', () => {
    expect(pageCss).toMatch(/--seal-accent-rgb:\s*43,\s*124,\s*255/);
  });

  it('--seal-accent tanımı artık sayfa geneli (masaüstü dahil) olmalı — mobil media query\'nin İÇİNDE OLMAMALI (2026-07-24 hesapla redesign kararı)', () => {
    const firstMobileMediaIndex = pageCss.indexOf('@media (max-width: 768px)');
    const sealAccentIndex = pageCss.indexOf('--seal-accent:');
    expect(firstMobileMediaIndex).toBeGreaterThan(-1);
    expect(sealAccentIndex).toBeGreaterThan(-1);
    expect(sealAccentIndex).toBeLessThan(firstMobileMediaIndex);
  });

  it('--seal-surface hem dark hem light tema bloğunda tanımlı olmalı', () => {
    expect(pageCss).toMatch(/\[data-theme="dark"\]\s*\.container\s*\{[^}]*--seal-surface:/);
    expect(pageCss).toMatch(/\[data-theme="light"\]\s*\.container\s*\{[^}]*--seal-surface:/);
  });

  it('light temada --seal-surface, mevcut --shell-bg camsı token\'ını kullanmalı (yeni rgba icat edilmemeli)', () => {
    expect(pageCss).toMatch(/\[data-theme="light"\]\s*\.container\s*\{[^}]*--seal-surface:\s*var\(--shell-bg\)/);
  });

  it('dark temada --seal-surface, eski lacivert gradienti korumalı', () => {
    expect(pageCss).toMatch(/\[data-theme="dark"\]\s*\.container\s*\{[^}]*--seal-surface:\s*linear-gradient\(160deg, #0F2A43 0%, #16324F 100%\)/);
  });

  it('--seal-text hem dark hem light tema bloğunda tanımlı olmalı', () => {
    expect(pageCss).toMatch(/\[data-theme="dark"\]\s*\.container\s*\{[^}]*--seal-text:/);
    expect(pageCss).toMatch(/\[data-theme="light"\]\s*\.container\s*\{[^}]*--seal-text:/);
  });

  it('light temada --seal-text, mevcut --card-title token\'ını kullanmalı', () => {
    expect(pageCss).toMatch(/\[data-theme="light"\]\s*\.container\s*\{[^}]*--seal-text:\s*var\(--card-title\)/);
  });
});

describe('kat dilimi şeridi kapsamı', () => {
  it('.mobileAccordions .drawerRow::before selektörü tanımlı olmalı', () => {
    expect(pageCss).toMatch(/\.mobileAccordions\s+\.drawerRow::before/);
  });

  it('çıplak .drawerRow::before (mobileAccordions olmadan) TANIMLI OLMAMALI', () => {
    // .mobileAccordions .drawerRow::before dışında hiçbir yerde bare .drawerRow::before olmamalı
    const bareRulePattern = /(?<!\.mobileAccordions\s)\.drawerRow::before/g;
    const matches = pageCss.match(bareRulePattern) ?? [];
    expect(matches.length).toBe(0);
  });
});

describe('paylaşılan bileşen override\'larının özgünlük deseni', () => {
  it('Rapor Kaydet/PDF İndir butonları element+class selektörüyle override edilmeli (bkz. compareBtn hata geçmişi)', () => {
    expect(pageCss).toMatch(/button\.sealPrimaryBtn/);
    expect(pageCss).toMatch(/button\.sealOutlineBtn/);
  });

  it('mobil RangeSlider brass override\'ı input\\[type="range"\\] elementine scope\'lanmalı', () => {
    expect(pageCss).toMatch(/\.sealRangeSlider input\[type="range"\]/);
  });
});

describe('tekrarlayan sonuç/slider gizleme kapsamı', () => {
  it('.blueBox artık hiç kullanılmamalı — HesapFisi bileşeni onun yerini aldı (2026-07-24)', () => {
    expect(pageCss).not.toMatch(/\.blueBox\b/);
    const pageTsx = fs.readFileSync(path.join(__dirname, 'page.tsx'), 'utf8');
    expect(pageTsx).not.toMatch(/styles\.blueBox\b/);
    expect(pageTsx).toMatch(/<HesapFisi result={result} \/>/);
  });

  it('.sliderArea mobilde gizlenmeli, kural mobil media query içinde olmalı', () => {
    const lastMobileMediaIndex = pageCss.lastIndexOf('@media (max-width: 768px)');
    const sliderAreaHideMatch = pageCss.match(/\.sliderArea\s*\{[^}]*display:\s*none/);
    expect(sliderAreaHideMatch).not.toBeNull();
    expect(sliderAreaHideMatch!.index).toBeGreaterThan(lastMobileMediaIndex);
  });
});

describe('aksiyon butonları dual-slot kapsamı', () => {
  it('.desktopActionsSlot mobilde gizlenmeli', () => {
    const lastMobileMediaIndex = pageCss.lastIndexOf('@media (max-width: 768px)');
    const match = pageCss.match(/\.desktopActionsSlot\s*\{[^}]*display:\s*none/);
    expect(match).not.toBeNull();
    expect(match!.index).toBeGreaterThan(lastMobileMediaIndex);
  });

  it('.mobileActionsSlot mobilde koşulsuz display: contents olmalı', () => {
    const lastMobileMediaIndex = pageCss.lastIndexOf('@media (max-width: 768px)');
    const match = pageCss.match(/\.mobileActionsSlot\s*\{[^}]*display:\s*contents/);
    expect(match).not.toBeNull();
    expect(match!.index).toBeGreaterThan(lastMobileMediaIndex);
  });
});

describe('data-revealed gate kapsamı', () => {
  it('data-revealed gate\'i tamamen kaldırılmış olmalı', () => {
    // İki fazlı görünürlük kaldırıldı (spec 2026-07-28 §2a): sonuç mobilde
    // her zaman görünür ve canlı. Geriye kalan bir data-revealed kuralı
    // sonucu sessizce gizlerdi.
    expect(pageCss).not.toMatch(/data-revealed/);
  });
});

describe('kart yüzeyi migrasyonu — seal-ink/seal-ink-2 doğrudan kullanılmamalı', () => {
  it('topResultCard, statCard, accordion artık --seal-surface kullanmalı (eski --seal-ink-2 gradienti değil)', () => {
    expect(pageCss).toMatch(/\.topResultCard\s*\{[^}]*background:\s*var\(--seal-surface\)/);
    expect(pageCss).toMatch(/\.statCard\s*\{[^}]*background:\s*var\(--seal-surface\)/);
    expect(pageCss).toMatch(/\.accordion\s*\{[^}]*background:\s*var\(--seal-surface\)/);
  });

  it('bu üç kart artık backdrop-filter blur uygulamalı (light temada camsı yüzey için gerekli)', () => {
    expect(pageCss).toMatch(/\.topResultCard\s*\{[^}]*backdrop-filter:\s*blur\(24px\)/);
    expect(pageCss).toMatch(/\.statCard\s*\{[^}]*backdrop-filter:\s*blur\(24px\)/);
    expect(pageCss).toMatch(/\.accordion\s*\{[^}]*backdrop-filter:\s*blur\(24px\)/);
  });

  it('topResultLabel/statCard h5 artık --seal-text-muted kullanmalı', () => {
    expect(pageCss).toMatch(/\.topResultLabel\s*\{[^}]*color:\s*var\(--seal-text-muted\)/);
    expect(pageCss).toMatch(/\.statCard h5\s*\{[^}]*color:\s*var\(--seal-text-muted\)/);
  });
});

describe('buton reverse — PDF İndir ve Karşılaştır dolgulu stile geçmeli', () => {
  it('PDF İndir artık sealPrimaryBtn (dolgulu) class\'ını kullanmalı, sealOutlineBtn değil', () => {
    const pageTsx = fs.readFileSync(
      path.join(__dirname, 'page.tsx'),
      'utf8'
    );
    expect(pageTsx).toMatch(/handlePdfDownload[^>]*className=\{styles\.sealPrimaryBtn\}/);
  });

  it('button.compareBtn mobilde dolgulu yeşil override almalı, override mobil media query içinde olmalı', () => {
    const lastMobileMediaIndex = pageCss.lastIndexOf('@media (max-width: 768px)');
    const matches = [...pageCss.matchAll(/button\.compareBtn\s*\{[^}]*background:\s*var\(--green\)/g)];
    expect(matches.length).toBe(1);
    expect(matches[0].index).toBeGreaterThan(lastMobileMediaIndex);
  });

  it('masaüstü (media query dışı) button.compareBtn hâlâ outline (transparan/açık arka plan) olmalı', () => {
    const outsideMobileCss = pageCss.slice(0, pageCss.lastIndexOf('@media (max-width: 768px)'));
    expect(outsideMobileCss).toMatch(/button\.compareBtn\s*\{[^}]*background:\s*rgba\(var\(--green-rgb\), 0\.08\)/);
  });
});

describe('piyasa fiyatı ve grafik P tutarlılığı (2026-07-24 UX/UI redesign)', () => {
  it('manualMarketPrice varsayılanı boş olmalı (yanlış 7.500.000 sabiti kaldırıldı)', () => {
    const pageTsx = fs.readFileSync(path.join(__dirname, 'page.tsx'), 'utf8');
    expect(pageTsx).toMatch(/useState<string>\(""\)/);
    expect(pageTsx).not.toMatch(/useState<string>\("7\.500\.000"\)/);
  });

  it('SensitivityChart ve BreakEvenChart artık P: globalUnitPrice kullanmalı, sabit 10000 değil', () => {
    const pageTsx = fs.readFileSync(path.join(__dirname, 'page.tsx'), 'utf8');
    const hardcodedMatches = pageTsx.match(/P:\s*10000,/g) ?? [];
    expect(hardcodedMatches.length).toBe(0);
    const dynamicMatches = pageTsx.match(/P:\s*globalUnitPrice,/g) ?? [];
    expect(dynamicMatches.length).toBeGreaterThanOrEqual(2);
  });

  it('Sd modu (Toplam Daire Sayısı) sayfa açılışında varsayılan kapalı olmalı', () => {
    const pageTsx = fs.readFileSync(path.join(__dirname, 'page.tsx'), 'utf8');
    expect(pageTsx).toMatch(/\[isApartmentCountEnabled, setIsApartmentCountEnabled\] = useState<boolean>\(false\)/);
  });

  it('ownerApartmentCount ölü state\'i tamamen kaldırılmış olmalı', () => {
    const pageTsx = fs.readFileSync(path.join(__dirname, 'page.tsx'), 'utf8');
    expect(pageTsx).not.toMatch(/ownerApartmentCount/);
  });
});
