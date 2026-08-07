import fs from 'fs';
import path from 'path';

const pageCss = fs.readFileSync(path.join(__dirname, 'page.module.css'), 'utf8');
const globalsCss = fs.readFileSync(
  path.join(__dirname, '../globals.css'),
  'utf8'
);

/**
 * `css.indexOf(mediaQuery)`'den baslayarak brace-dengeli sekilde bir
 * `@media` blogunun ICERIGINI (disaridaki { } haric) doner. Basit bir
 * non-greedy regex (`\{([\s\S]*?)\}`) burada YETERSIZ — blok icinde
 * `.stepperInput { ... }` gibi ic ice kurallar oldugu icin ilk kapanan
 * `}`'de durur, dis bloktan cok once biter.
 */
function extractMediaBlock(css: string, mediaQuery: string): string | null {
  const startIdx = css.indexOf(mediaQuery);
  if (startIdx === -1) return null;
  const braceStart = css.indexOf('{', startIdx);
  if (braceStart === -1) return null;
  let depth = 0;
  for (let i = braceStart; i < css.length; i++) {
    if (css[i] === '{') depth++;
    else if (css[i] === '}') {
      depth--;
      if (depth === 0) {
        return css.slice(braceStart + 1, i);
      }
    }
  }
  return null;
}

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

  it('--seal-accent tanımı sayfa geneli (masaüstü dahil), herhangi bir @media bloğundan ÖNCE tanımlı olmalı — 2026-08-07 düzeltme: page.module.css içinde artık dar kapsamlı, kasıtlı bir @media (max-width: 768px) bloğu VAR (.stepperInput/.luxBox, AdvancedSettingsSections.tsx üzerinden mobil GelismisAyarlarSheet\'e sızıyor, final review bulgusu), ama --seal-accent onun içinde değil — dosyanın en üstünde, ilk @media bloğundan önce tanımlı kalmalı', () => {
    const sealAccentIndex = pageCss.indexOf('--seal-accent:');
    expect(sealAccentIndex).toBeGreaterThan(-1);
    const firstMediaIndex = pageCss.indexOf('@media');
    expect(firstMediaIndex).toBeGreaterThan(-1);
    expect(sealAccentIndex).toBeLessThan(firstMediaIndex);
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

describe('erisilemez mobil ölü kod kapsami', () => {
  it('.mobileSidebar/.mobileAccordions artik page.tsx JSX\'inde yok (isDesktopViewport===false erken donuyor, hic render edilmiyordu)', () => {
    const pageTsx = fs.readFileSync(path.join(__dirname, 'page.tsx'), 'utf8');
    expect(pageTsx).not.toMatch(/styles\.mobileSidebar/);
    expect(pageTsx).not.toMatch(/styles\.mobileAccordions/);
  });

  it('.desktopActionsSlot/.mobileActionsSlot page.tsx JSX\'inde hiç kullanılmıyor (Task 1: actionsSection tek yerde render ediliyor, dual-slot sarmalayıcılar kaldırıldı — bu guard yalnızca CSS tarafını değil JSX tarafını da kapsar)', () => {
    const pageTsx = fs.readFileSync(path.join(__dirname, 'page.tsx'), 'utf8');
    expect(pageTsx).not.toMatch(/styles\.desktopActionsSlot/);
    expect(pageTsx).not.toMatch(/styles\.mobileActionsSlot/);
  });
});

describe('paylaşılan bileşen override\'larının özgünlük deseni', () => {
  it('button.sealPrimaryBtn/button.sealOutlineBtn override kuralları artık CSS\'te yok (2026-08-07 ölü kod temizliği): bu kurallar yalnızca silinen 226 satırlık @media (max-width: 768px) bloğunun içindeydi — masaüstü JSX ağacı o genişlikte hiç render olmadığından (isDesktopViewport gate, page.tsx:518) zaten hiçbir zaman uygulanmıyorlardı. Ne sealOutlineBtn ne sealPrimaryBtn page.tsx\'te kullanılıyor (2026-08-07 düzeltme: sealPrimaryBtn asılı referansı — page.module.css\'te hiçbir zaman gerçek karşılığı olmayan bir class — page.tsx\'ten de kaldırıldı; Rapor Kaydet/PDF İndir butonları salt Button bileşeninin kendi variant stilini alıyor).', () => {
    expect(pageCss).not.toMatch(/button\.sealPrimaryBtn/);
    expect(pageCss).not.toMatch(/button\.sealOutlineBtn/);
    const pageTsx = fs.readFileSync(path.join(__dirname, 'page.tsx'), 'utf8');
    expect(pageTsx).not.toMatch(/styles\.sealOutlineBtn/);
    expect(pageTsx).not.toMatch(/styles\.sealPrimaryBtn/);
  });
});

describe('tekrarlayan sonuç/slider gizleme kapsamı', () => {
  it('.blueBox artık hiç kullanılmamalı — HesapFisi bileşeni onun yerini aldı (2026-07-24)', () => {
    expect(pageCss).not.toMatch(/\.blueBox\b/);
    const pageTsx = fs.readFileSync(path.join(__dirname, 'page.tsx'), 'utf8');
    expect(pageTsx).not.toMatch(/styles\.blueBox\b/);
    expect(pageTsx).toMatch(/<HesapFisi result={result} \/>/);
  });

  it('.sliderArea artık masaüstünde koşulsuz görünür — mobil viewport bu dosyanın JSX ağacını hiç render etmiyor, mobile-only gizleme kuralına gerek yok (2026-08-07 ölü kod temizliği)', () => {
    expect(pageCss).not.toMatch(/\.sliderArea\s*\{\s*display:\s*none/);
  });
});

describe('ölü @media (max-width: 768px) breakpoint kapsamı (2026-08-07 temizlik, 2026-08-07 düzeltme)', () => {
  // DÜZELTME NOTU (2026-08-07): "page.module.css içinde hiçbir @media
  // (max-width: 768px) kuralı kalmamalı" önermesi YANLIŞ çıktı — final
  // whole-branch review, `.stepperInput`/`.luxBox` kurallarının
  // `AdvancedSettingsSections.tsx` (BirimMaliyetField/MarketField/
  // RiskCostFields) üzerinden bu CSS modülüne, page.tsx'in mobil dalındaki
  // (isDesktopViewport===false, satır 518) `GelismisAyarlarSheet`e de
  // sızdığını buldu. Bu iki class gerçekten ≤768px'de render ediliyor,
  // dolayısıyla küçük ve kasıtlı bir @media (max-width: 768px) bloğu geri
  // eklendi. Guard artık "hiç @media yok" yerine "genuinely ölü class'lar
  // bu bloğun İÇİNDE değil" diye daraltıldı — asıl regresyon riski, eski
  // 226 satırlık bloğun (masaüstü-only kurallar) kazara geri gelmesi.
  it('page.module.css\'teki @media (max-width: 768px) bloğu SADECE .stepperInput/.luxBox içermeli — genuinely ölü class\'lar (masaüstü JSX ağacının ≤768px\'de asla mount olmadığı, isDesktopViewport gate page.tsx:518 nedeniyle) geri gelmemeli', () => {
    const mediaBlock = extractMediaBlock(pageCss, '@media (max-width: 768px)');
    expect(mediaBlock).not.toBeNull();

    const genuinelyDeadClasses = [
      'container', 'layout', 'leftSidebar', 'rightGrid', 'mainPanel', 'summaryPanel',
      'pagerTrack', 'pagerDots', 'pagerLabel', 'sliderArea', 'desktopActionsSlot',
      'mobileActionsSlot', 'stickyCta', 'topResultCard', 'statCard', 'topResultLabel',
      'actionBottomRow', 'segmentedControl', 'segmentItem', 'mobileCardTitle',
      'settingsGroup', 'hesapOzetiSeridi', 'swipeCard', 'desktopSidebar',
    ];
    for (const cls of genuinelyDeadClasses) {
      expect(mediaBlock as string).not.toMatch(new RegExp(`\\.${cls}\\b`));
    }
    expect(mediaBlock).not.toMatch(/button\.sealPrimaryBtn/);
    expect(mediaBlock).not.toMatch(/button\.sealOutlineBtn/);
    expect(mediaBlock).not.toMatch(/button\.compareBtn/);

    // Pozitif taraf: blok gerçekten canlı olan iki class'ı içermeli, yoksa
    // fix'in kendisi kazara silinmiş olur.
    expect(mediaBlock).toMatch(/\.stepperInput\b/);
    expect(mediaBlock).toMatch(/\.luxBox\b/);
  });

  it('.desktopActionsSlot/.mobileActionsSlot class\'ları artık CSS\'te (media bloğu içinde ya da dışında) hiç yok — actionsSection tek yerde render ediliyor (Task 1)', () => {
    expect(pageCss).not.toMatch(/\.desktopActionsSlot/);
    expect(pageCss).not.toMatch(/\.mobileActionsSlot/);
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
  it('--seal-ink-2 hâlâ hiçbir yerde doğrudan kullanılmıyor (Task 8\'de kaldırılmıştı, geri gelmemeli)', () => {
    expect(pageCss).not.toMatch(/var\(--seal-ink-2\)/);
  });

  it('.topResultCard/.statCard/.topResultLabel/.statCard h5 --seal-surface/--seal-text-muted override\'ları artık CSS\'te yok (2026-08-07 ölü kod temizliği): bu kurallar yalnızca silinen @media (max-width: 768px) bloğunun içindeydi — masaüstü JSX o genişlikte hiç render olmadığından (isDesktopViewport gate, page.tsx:518) zaten hiç uygulanmıyorlardı. Masaüstünde gerçek yüzey kaynağı .topResultCard\'ın brand-gradient tabanı ve .statCard\'ın stat-bg tabanı (bu task\'ın kapsamı dışında, ölü bloktan önce de gerçekte hiç uygulanmamış önceden var olan bir durum).', () => {
    expect(pageCss).not.toMatch(/\.topResultCard\s*\{[^}]*background:\s*var\(--seal-surface\)/);
    expect(pageCss).not.toMatch(/\.statCard\s*\{[^}]*background:\s*var\(--seal-surface\)/);
    expect(pageCss).not.toMatch(/\.topResultLabel\s*\{[^}]*color:\s*var\(--seal-text-muted\)/);
    expect(pageCss).not.toMatch(/\.statCard h5\s*\{[^}]*color:\s*var\(--seal-text-muted\)/);
  });
});

describe('sealPrimaryBtn asılı referans temizliği (2026-08-07 düzeltme)', () => {
  // Eski test burada "PDF İndir artık sealPrimaryBtn (dolgulu) class'ını
  // kullanmalı" diye bir iddia doğruluyordu — ama bu hiç doğru olmamıştı:
  // PDF İndir her zaman `<Button variant="outline">` idi, yani hiçbir zaman
  // "dolgulu" değildi. `styles.sealPrimaryBtn` zaten page.module.css'te
  // karşılığı olmayan asılı bir referanstı (final review bulgusu); page.tsx
  // içinden kaldırıldı. Test artık gerçeği yansıtacak şekilde ters çevrildi.
  it('page.tsx artık styles.sealPrimaryBtn kullanmıyor — Button bileşeninin kendi variant prop\'u zaten stil veriyor', () => {
    const pageTsx = fs.readFileSync(
      path.join(__dirname, 'page.tsx'),
      'utf8'
    );
    expect(pageTsx).not.toMatch(/styles\.sealPrimaryBtn/);
  });
});

describe('piyasa fiyatı ve grafik P tutarlılığı (2026-07-24 UX/UI redesign)', () => {
  it('manualMarketPrice varsayılanı boş olmalı (yanlış 7.500.000 sabiti kaldırıldı)', () => {
    // 2026-07-29: varsayılan artık `useState`'te satır içi değil,
    // `AYAR_VARSAYILANLARI` sabitinde — mobil yaprağın "Sıfırla" eylemiyle
    // aynı kaynağı kullansın diye. Guard'ın NİYETİ değişmedi: varsayılan boş
    // olmalı, yanlış 7.500.000 sabiti geri gelmemeli.
    const pageTsx = fs.readFileSync(path.join(__dirname, 'page.tsx'), 'utf8');
    expect(pageTsx).toMatch(/manualMarketPrice:\s*''/);
    expect(pageTsx).not.toMatch(/manualMarketPrice:\s*'7\.500\.000'/);
    expect(pageTsx).not.toMatch(/useState<string>\("7\.500\.000"\)/);
    // Baslangic degeri gercekten sabitten okunuyor mu?
    expect(pageTsx).toMatch(/useState<string>\(AYAR_VARSAYILANLARI\.manualMarketPrice\)/);
  });

  it('gelişmiş ayar varsayılanları TEK kaynakta (Sıfırla ile ayrışamaz)', () => {
    // Sıfırla eylemi riskLevel'i 0 yapıyordu ama sayfanın başlangıcı 10'du;
    // iki yerde ayrı yazıldıkları için sessizce ayrışmışlardı.
    const pageTsx = fs.readFileSync(path.join(__dirname, 'page.tsx'), 'utf8');
    // TUM 11 alan useState baslangic degeri olarak AYAR_VARSAYILANLARI'ndan
    // okunmali — bu, "TEK kaynak" iddiasinin useState yarisi.
    const tumAlanlar = [
      'builderProfit', 'riskLevel', 'iksaMode', 'iksaPercentage', 'iksaManualTL',
      'manualMarketPrice', 'isApartmentCountEnabled', 'totalApartments',
      'ownerApartmentShare', 'isAaEnabled', 'arsaAlani',
    ];
    for (const alan of tumAlanlar) {
      expect(pageTsx).toMatch(new RegExp(`useState<[^>]*>\\(AYAR_VARSAYILANLARI\\.${alan}\\)`));
    }
    // Sifirla'nin kapsami ise TUM 11 degil, yalnizca yapragin GOSTERDIGI
    // alanlar (Task 5, A1 I4): daire-sayisi/arsa-payi ucu yapraktan cikip
    // girdi kartina tasindi, bu yuzden Sifirla'nin disinda BILEREK. Ayni
    // gerekce 2026-08-04 TKGM konsolidasyonunda `isAaEnabled`/`arsaAlani`
    // icin de gecerli oldu — onlar da artik `SmartContextCard`ta. Yaprak
    // ileride yeni bir alan gosterirse bu liste de guncellenmeli — aksi
    // halde "Ayarlari sifirla" o alani sessizce atlar (A1 I3'un ayni
    // kusurunun bir varyasyonu).
    const sifirlananAlanlar = [
      'builderProfit', 'riskLevel', 'iksaMode', 'iksaPercentage', 'iksaManualTL',
      'manualMarketPrice',
    ];
    for (const alan of sifirlananAlanlar) {
      expect(pageTsx).toMatch(new RegExp(`set[A-Z]\\w*\\(AYAR_VARSAYILANLARI\\.${alan}\\)`));
    }
  });

  it('daire-sayisi/arsa-payi/arsa-alani Sıfırla eyleminde ARTIK okunmuyor (Task 5 A1 I4 + 2026-08-04 TKGM konsolidasyonu)', () => {
    // Bu alanlari yaprak artik render etmiyor; Sifirla onlari hala
    // sifirlarsa, yaprakta gorunmeyen girdi kartini sessizce yeniden yazar
    // — tam da bu task'in kapattigi kusurun kendisi, bu kez reset yolunda.
    const pageTsx = fs.readFileSync(path.join(__dirname, 'page.tsx'), 'utf8');
    const yaprakOlmayanAlanlar = [
      'isApartmentCountEnabled', 'totalApartments', 'ownerApartmentShare',
      'isAaEnabled', 'arsaAlani',
    ];
    for (const alan of yaprakOlmayanAlanlar) {
      expect(pageTsx).not.toMatch(new RegExp(`set[A-Z]\\w*\\(AYAR_VARSAYILANLARI\\.${alan}\\)`));
    }
  });

  it('SensitivityChart ve BreakEvenChart artık P: globalUnitPrice kullanmalı, sabit 10000 değil', () => {
    const pageTsx = fs.readFileSync(path.join(__dirname, 'page.tsx'), 'utf8');
    const hardcodedMatches = pageTsx.match(/P:\s*10000,/g) ?? [];
    expect(hardcodedMatches.length).toBe(0);
    // `?? 0`'lı hal, chartBaseInput'un (Task 5) result'a bagli olmadan
    // her zaman render edilmesi icin gereken null-guvenli varsayilan —
    // hala sabit 10000 degil, hala dinamik globalUnitPrice'tan turuyor.
    const dynamicMatches = pageTsx.match(/P:\s*globalUnitPrice(?:\s*\?\?\s*0)?,/g) ?? [];
    expect(dynamicMatches.length).toBeGreaterThanOrEqual(2);
  });

  it('Sd modu (Toplam Daire Sayısı) sayfa açılışında varsayılan kapalı olmalı', () => {
    // 2026-07-29: başlangıç değeri artık `useState`te satır içi değil,
    // `AYAR_VARSAYILANLARI` sabitinde (mobil yaprağın "Sıfırla"sıyla aynı
    // kaynağı kullansın diye). Guard'ın NİYETİ değişmedi: Sd modu açılışta
    // KAPALI olmalı — açık gelirse arsa payı sessizce N/M'ye kilitlenir.
    const pageTsx = fs.readFileSync(path.join(__dirname, 'page.tsx'), 'utf8');
    expect(pageTsx).toMatch(
      /\[isApartmentCountEnabled, setIsApartmentCountEnabled\] = useState<boolean>\(AYAR_VARSAYILANLARI\.isApartmentCountEnabled\)/
    );
    expect(pageTsx).toMatch(/isApartmentCountEnabled:\s*false/);
  });

  it('ownerApartmentCount ölü state\'i tamamen kaldırılmış olmalı', () => {
    const pageTsx = fs.readFileSync(path.join(__dirname, 'page.tsx'), 'utf8');
    expect(pageTsx).not.toMatch(/ownerApartmentCount/);
  });
});

describe('birim maliyet ve piyasa fiyati gorunurlugu (spec 2026-07-29 K1/K7)', () => {
  it('masaustu cekmece (settingsDrawer) artik kodda yok', () => {
    const pageTsx = fs.readFileSync(path.join(__dirname, 'page.tsx'), 'utf8');
    expect(pageTsx).not.toMatch(/settingsDrawerOverlay/);
    expect(pageTsx).not.toMatch(/isSettingsSidebarOpen/);
    expect(pageTsx).not.toMatch(/settingsGear/);
  });

  it('bagimsiz "Risk Payi" grubu artik kodda yok — risk SmartContextCard icinde', () => {
    const pageTsx = fs.readFileSync(path.join(__dirname, 'page.tsx'), 'utf8');
    expect(pageTsx).not.toMatch(/<h4>Risk Payı<\/h4>/);
  });

  // `piyasaFiyatiElle`/`piyasaFiyatiGirildi` provenance bayragi, elle
  // girilmis piyasa fiyatinin bir ilce secimiyle SESSIZCE ezilmesini
  // uyarmak icin vardi. Masaustu parsel redesign otomatik-ezme kaynaginin
  // KENDISINI (il/ilce secici) kaldirdi — artik manualMarketPrice'i
  // kullanicinin kendi girisi disinda hicbir yer yazmiyor, yani uyarilacak
  // bir "sessiz ezme" senaryosu kalmadi. Bayrak page.tsx'ten bilerek
  // kaldirildi (grep: sifir sonuc), bu yuzden guardrail'ler de kaldirildi.

  it('masaustunde birim maliyet kaynagi ekranda gosterilir', () => {
    // `kaynakEtiketi` cagrisi Finding 2 duzeltmesiyle `BirimMaliyetField`
    // bilesenine tasindi (AdvancedSettingsSections.tsx): Next.js `page.tsx`
    // yalnizca `default` export'a izin verir (baska bir named export tip
    // hatasi verir — `.next/dev/types` kontrolu), bu yuzden yerel arabellek
    // state'i (bkz. Finding 2) tasiyan bilesen ayri bir dosyada olmak
    // zorunda. Bu test artik IKI seyi birlikte dogruluyor: (1) page.tsx
    // dogru degerleri gercekten `BirimMaliyetField`e prop olarak geciriyor
    // mu, (2) `BirimMaliyetField` gercekten `kaynakEtiketi`yi bu iki deger
    // ile cagiriyor mu — ikisi birlikte, onceki tek-dosyalik assertion'la
    // ayni garantiyi veriyor.
    const pageTsx = fs.readFileSync(path.join(__dirname, 'page.tsx'), 'utf8');
    expect(pageTsx).toMatch(/<BirimMaliyetField/);
    expect(pageTsx).toMatch(/globalUnitPrice=\{globalUnitPrice\}/);
    expect(pageTsx).toMatch(/birimMaliyetKaynagi=\{birimMaliyetKaynagi\}/);

    const sectionsTsx = fs.readFileSync(path.join(__dirname, 'AdvancedSettingsSections.tsx'), 'utf8');
    expect(sectionsTsx).toMatch(/kaynakEtiketi\(birimMaliyetKaynagi, globalUnitPrice\)/);
  });

  // il/ilce -> ortalama ilce fiyati secici (handleKonumSec/handleIlceChange)
  // masaustu parsel redesign'de tamamen kaldirildi, yerini gercek TKGM
  // parsel sorgusu (SmartContextCard/ParcelModal) aldi. Bu guardrail artik
  // konusuz; page.tsx'te ne handleKonumSec ne selectedIl var.
});
