# Hesapla Ölü Kod Temizliği Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/hesapla` sayfasında `actionsSection`'ın çift render edilmesini tek render'a indirgemek ve iki ölü CSS `@media (max-width: 768px)` breakpoint'ini (boş bir blok + 226 satırlık erişilemez bir blok) kaldırmak, ilgili test paketini yeni duruma göre güncellemek.

**Architecture:** `src/app/hesapla/page.tsx`, `isDesktopViewport` state'ine göre erken dallanıyor: `null` → nötr iskelet, `false` → tamamen ayrı `<HesaplaMobile>` bileşeni, yalnızca `true` iken bu dosyanın geri kalanındaki "masaüstü" JSX ağacı render ediliyor. Bu, o ağacın yalnızca gerçek masaüstü genişliğinde (≥769px) mount olduğu, `≤768px` genişlikte hiç DOM'a girmediği anlamına geliyor — dolayısıyla o ağacı hedefleyen `@media (max-width: 768px)` kuralları hiçbir zaman tetiklenemez. Bu plan önce JSX'teki çift render'ı kaldırıyor (Task 1), sonra ona bağlı ölü CSS'i ve test paketini temizliyor (Task 2).

**Tech Stack:** Next.js 16, React 19, TypeScript, CSS Modules, Jest + React Testing Library.

> **Düzeltme notu (2026-08-07, uygulama sonrası):** Yukarıdaki "226 satırlık
> erişilemez blok" ve "Bu ağacı hedefleyen kurallar hiçbir zaman tetiklenemez"
> önermeleri kısmen YANLIŞ çıktı. Final whole-branch review, bu bloktaki
> `.stepperInput`/`.luxBox` kurallarının `AdvancedSettingsSections.tsx` üzerinden
> `GelismisAyarlarSheet` (mobil, `page.tsx`'in `isDesktopViewport===false` dalı)
> aracılığıyla GERÇEKTEN ≤768px'de tetiklendiğini buldu. Bu iki kural küçük,
> kasıtlı bir `@media (max-width: 768px)` bloğu olarak geri eklendi; bloğun
> geri kalanı (gerçekten yalnızca masaüstü JSX ağacına ait class'lar) ölü kaldı.
> Ayrıntı: `docs/superpowers/specs/2026-08-07-hesapla-olu-kod-temizligi-design.md`
> "Düzeltme notu" bölümü ve `.superpowers/sdd/2026-08-07-hesapla-olu-kod-temizligi/final-fix-report.md`.

## Global Constraints

- `HesaplaMobile` ve `src/app/hesapla/mobile/` dizinine DOKUNULMAZ — ayrı, canlı bir ağaç.
- `@media (max-width: 1100px)` (`page.module.css:837`) DOKUNULMAZ — 769-1100px aralığındaki gerçek masaüstü daralmasını yönetiyor, canlı.
- Anasayfadaki (`MarketingHomePage`) dead-hover efektleri bu planın kapsamında DEĞİL.
- Her task sonunda: `npx tsc --noEmit` → 0 hata, `npx jest --no-coverage --roots "src" src/app/hesapla` → tüm testler yeşil.
- Spec: `docs/superpowers/specs/2026-08-07-hesapla-olu-kod-temizligi-design.md`

---

### Task 1: `actionsSection`'ı tek render'a indirgeme

**Files:**
- Modify: `src/app/hesapla/page.tsx:861-863` (desktopActionsSlot wrapper kaldırılır), `src/app/hesapla/page.tsx:947-949` (mobileActionsSlot bloğu tamamen silinir)
- Modify: `src/app/hesapla/page.test.tsx:126-131` (çoğul → tekil assertion)

**Interfaces:**
- Consumes: mevcut `actionsSection` JSX değişkeni (`page.tsx:399-459`, değişmiyor), mevcut `styles.desktopActionsSlot`/`styles.mobileActionsSlot` CSS class'ları (bu task'ta hâlâ CSS'te duruyorlar, Task 2'de silinecek — bu task yalnızca JSX kullanım noktalarını kaldırıyor).
- Produces: `actionsSection` artık DOM'da tek kopya. Task 2 bu invaryantı varsayarak `.desktopActionsSlot`/`.mobileActionsSlot` CSS'ini güvenle silebilir.

- [ ] **Step 1: Testi güncelle (önce başarısız olacak şekilde)**

`src/app/hesapla/page.test.tsx` içinde şu bloğu bul:

```tsx
    it('Rapor Kaydet boş durumda devre dışıdır', async () => {
        viewportKur(true)
        render(<HesaplaPage />)
        const butonlar = await screen.findAllByRole('button', { name: /Rapor Kaydet/i })
        butonlar.forEach(b => expect(b).toBeDisabled())
    })
```

Şununla değiştir:

```tsx
    it('Rapor Kaydet boş durumda devre dışıdır', async () => {
        viewportKur(true)
        render(<HesaplaPage />)
        const buton = await screen.findByRole('button', { name: /Rapor Kaydet/i })
        expect(buton).toBeDisabled()
    })
```

- [ ] **Step 2: Testi çalıştır, BAŞARISIZ olduğunu doğrula**

Run: `npx jest --no-coverage --roots "src" src/app/hesapla/page.test.tsx -t "Rapor Kaydet boş durumda devre dışıdır"`

Expected: FAIL — `findByRole` birden fazla eşleşme bulduğu için "Found multiple elements with the role button and name..." hatası fırlatır (mevcut kod hâlâ iki kopya render ediyor).

- [ ] **Step 3: `page.tsx`'te çift render'ı kaldır**

`src/app/hesapla/page.tsx` içinde şu bloğu bul (satır ~861-863):

```tsx
            <div className={styles.desktopActionsSlot}>
              {actionsSection}
            </div>
          </main>
```

Şununla değiştir:

```tsx
            {actionsSection}
          </main>
```

Aynı dosyada şu bloğu bul (satır ~947-949):

```tsx
          <div className={styles.mobileActionsSlot}>
            {actionsSection}
          </div>
        </section>
```

Şununla değiştir:

```tsx
        </section>
```

- [ ] **Step 4: Testi tekrar çalıştır, BAŞARILI olduğunu doğrula**

Run: `npx jest --no-coverage --roots "src" src/app/hesapla/page.test.tsx -t "Rapor Kaydet boş durumda devre dışıdır"`

Expected: PASS

- [ ] **Step 5: Tüm hesapla test paketini çalıştır**

Run: `npx jest --no-coverage --roots "src" src/app/hesapla`

Expected: PASS (tüm suite — `page.test.tsx`, `SmartContextCard.test.tsx`, `HesapFisi.test.tsx`, `mobile/*.test.tsx` vb. hiçbiri bu değişiklikten etkilenmemeli, `HesaplaMobile`'a dokunulmadı).

- [ ] **Step 6: tsc kontrolü**

Run: `npx tsc --noEmit`

Expected: 0 hata.

- [ ] **Step 7: Commit**

```bash
git add src/app/hesapla/page.tsx src/app/hesapla/page.test.tsx
git commit -m "refactor(hesapla): actionsSection'i tek yerde render et, dual-slot CSS-toggle deseni kaldirildi"
```

---

### Task 2: Ölü CSS breakpoint'lerini kaldırma + regresyon-guard testleri

**Files:**
- Modify: `src/app/hesapla/page.module.css:74-75` (boş `@media` bloğu silinir)
- Modify: `src/app/hesapla/page.module.css:704-710` (`.desktopActionsSlot`/`.mobileActionsSlot` base tanımları silinir)
- Modify: `src/app/hesapla/page.module.css:1228-1454` (226 satırlık ölü blok tamamen silinir)
- Modify: `src/app/hesapla/pageStyles.scope.test.ts:79-101` ve `:138-148` (obsolete testler kaldırılıp regresyon-guard testleriyle değiştirilir)

**Interfaces:**
- Consumes: Task 1'in ürettiği invaryant — `actionsSection` artık tek render, `.desktopActionsSlot`/`.mobileActionsSlot` class'ları JSX'te hiç kullanılmıyor.
- Produces: `page.module.css` içinde `@media (max-width: 768px)` literal string'i hiç geçmiyor; `.desktopActionsSlot`/`.mobileActionsSlot` class'ları CSS'te de yok.

- [ ] **Step 1: `pageStyles.scope.test.ts`'e regresyon-guard testlerini yaz (önce başarısız olacak şekilde)**

`src/app/hesapla/pageStyles.scope.test.ts` içinde şu bloğu bul (`.blueBox` testinin kapanışından `data-revealed gate kapsamı` describe'ının başına kadar, satır ~78-102):

```ts
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
```

Şununla değiştir:

```ts
  it('.sliderArea artık masaüstünde koşulsuz görünür — mobil viewport bu dosyanın JSX ağacını hiç render etmiyor, mobile-only gizleme kuralına gerek yok (2026-08-07 ölü kod temizliği)', () => {
    expect(pageCss).not.toMatch(/\.sliderArea\s*\{\s*display:\s*none/);
  });
});

describe('ölü @media (max-width: 768px) breakpoint kapsamı (2026-08-07 temizlik)', () => {
  it('page.module.css içinde hiçbir "@media (max-width: 768px)" kuralı kalmamalı — masaüstü JSX ağacı bu genişlikte asla mount olmuyor (isDesktopViewport===false erken <HesaplaMobile/>e dönüyor, page.tsx:518)', () => {
    expect(pageCss).not.toMatch(/@media \(max-width: 768px\)/);
  });

  it('.desktopActionsSlot/.mobileActionsSlot class\'ları artık CSS\'te yok — actionsSection tek yerde render ediliyor (Task 1)', () => {
    expect(pageCss).not.toMatch(/\.desktopActionsSlot/);
    expect(pageCss).not.toMatch(/\.mobileActionsSlot/);
  });
});
```

Aynı dosyada şu bloğu bul (satır ~138-148, `describe('buton reverse...')` içinde, `PDF İndir artık sealPrimaryBtn...` testinden HEMEN sonra):

```ts
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
```

Şununla değiştir (bu ikisi siliniyor, `describe` kapanışı korunuyor — yeni global "@media (max-width: 768px) hiç yok" testi zaten bu senaryoyu da kapsıyor):

```ts
});
```

- [ ] **Step 2: Testleri çalıştır, YENİ testlerin BAŞARISIZ olduğunu doğrula**

Run: `npx jest --no-coverage --roots "src" src/app/hesapla/pageStyles.scope.test.ts`

Expected: FAIL — en az şu testler kırmızı olmalı: "page.module.css içinde hiçbir @media (max-width: 768px) kuralı kalmamalı...", ".desktopActionsSlot/.mobileActionsSlot class'ları artık CSS'te yok...", ".sliderArea artık masaüstünde koşulsuz görünür..." (ölü CSS hâlâ dosyada, henüz silinmedi).

- [ ] **Step 3: Boş `@media` bloğunu sil**

`src/app/hesapla/page.module.css` içinde şu bloğu bul (satır ~72-76):

```css
/* Hero Section styles moved to homepage */

@media (max-width: 768px) {
}

/* =========================================================================
```

Şununla değiştir:

```css
/* Hero Section styles moved to homepage */

/* =========================================================================
```

- [ ] **Step 4: `.desktopActionsSlot`/`.mobileActionsSlot` base tanımlarını sil**

Aynı dosyada şu bloğu bul (satır ~703-711):

```css
.desktopActionsSlot {
    display: contents;
}

.mobileActionsSlot {
    display: none;
}

/* Action Bottom Row */
```

Şununla değiştir:

```css
/* Action Bottom Row */
```

- [ ] **Step 5: 226 satırlık ölü bloğu sil**

Bu blok `.stickyCta:disabled { opacity: 0.6; }` kuralından hemen sonra başlıyor (`@media (max-width: 768px) {`) ve `/* Hide number input spinners for all stepper inputs */` yorumundan hemen önce kapanıyor. Dosyada şu satırı bul:

```css
.stickyCta:disabled {
    opacity: 0.6;
}

@media (max-width: 768px) {
    .container {
```

Bu noktadan itibaren dosyada ilerleyip, aşağıdaki gibi biten bloğun TAMAMINI (yaklaşık 226 satır — `.container`, `.topResultCard`, `.desktopSidebar`, `.layout`, `.leftSidebar`/`.rightGrid`, `.hesapOzetiSeridi`, `.swipeCard`/`.mainPanel`/`.summaryPanel`, `.mobileCardTitle`, `.settingsGroup`, `.actionBottomRow`, `.stepperInput`, `.luxBox`, `.segmentedControl`/`.segmentItem`, `.pagerTrack`/`.pagerPage`/`.pagerDots`/`.pagerLabel`, `.statCard`/`.statCardValue`, `button.sealPrimaryBtn`/`sealOutlineBtn`/`compareBtn`, `.stickyCta`, `.sliderArea`, `.desktopActionsSlot`/`.mobileActionsSlot` kurallarının hepsini kapsıyor) sil:

```css
    .desktopActionsSlot {
        display: none;
    }

    /* İki fazlı görünürlük kaldırıldı (spec 2026-07-28 §2a): sonuç mobilde
       her zaman görünür ve canlı, aksiyon butonları da koşulsuz görünür. */
    .mobileActionsSlot {
        display: contents;
    }
}

/* Hide number input spinners for all stepper inputs */
```

Silme sonrası dosyada şu geçiş kalmalı (araya hiçbir `@media` kalmadan):

```css
.stickyCta:disabled {
    opacity: 0.6;
}

/* Hide number input spinners for all stepper inputs */
```

**Doğrulama ipucu:** silme sonrası `grep -c "@media (max-width: 768px)" src/app/hesapla/page.module.css` çıktısı `0` olmalı (yalnızca `@media (max-width: 1100px)` kalmalı, ona dokunulmadı).

- [ ] **Step 6: Testleri tekrar çalıştır, BAŞARILI olduğunu doğrula**

Run: `npx jest --no-coverage --roots "src" src/app/hesapla/pageStyles.scope.test.ts`

Expected: PASS — tüm testler yeşil.

- [ ] **Step 7: Tüm hesapla test paketini + tam suite'i çalıştır**

Run: `npx jest --no-coverage --roots "src" src/app/hesapla`

Expected: PASS.

Run: `npx jest --no-coverage --roots "src"`

Expected: PASS (tam suite, başka hiçbir yerde `.desktopActionsSlot`/`.mobileActionsSlot`/bu satırlardaki class'lara referans yok).

- [ ] **Step 8: tsc kontrolü**

Run: `npx tsc --noEmit`

Expected: 0 hata.

- [ ] **Step 9: Commit**

```bash
git add src/app/hesapla/page.module.css src/app/hesapla/pageStyles.scope.test.ts
git commit -m "refactor(hesapla): olu @media (max-width: 768px) breakpoint'lerini kaldir, scope testlerini regresyon-guard'a cevir"
```

---

### Task 3: Canlı doğrulama

**Files:** Yok (yalnızca manuel/tarayıcı doğrulaması — kod değişikliği yok).

**Interfaces:**
- Consumes: Task 1 + Task 2'nin tamamlanmış hâli.
- Produces: Yok — bu task yalnızca doğrulama, sonraki bir task'ın bağımlılığı değil.

- [ ] **Step 1: Dev server'ı başlat**

Run: `npm run dev:next`

- [ ] **Step 2: Masaüstü genişlikte `/hesapla`'yı kontrol et**

Tarayıcıda `http://localhost:3000/hesapla`'yı >768px genişlikte aç. "Örnek Proje ile Dene" ile bir sonuç üret, PDF İndir/Rapor Kaydet/+ Karşılaştır butonlarının TEK kopya (DevTools Elements panelinde `desktopActionsSlot`/`mobileActionsSlot` class'larının artık hiç geçmediğini, butonların doğrudan `<main>` altında tek kopya olduğunu) göründüğünü ve tıklanabilir olduğunu doğrula.

- [ ] **Step 3: Mobil genişlikte `/hesapla`'yı kontrol et**

Tarayıcı penceresini gerçekten ≤768px'e küçült (DevTools cihaz emülasyonu değil, gerçek pencere resize — `matchMedia` gerçek CSS breakpoint'ini dinliyor). `HesaplaMobile` ekranının (Premium Liquid Glass) değişmeden, önceki davranışıyla birebir çalıştığını doğrula.

- [ ] **Step 4: Dev server'ı durdur**

Kontrolü bitirince dev server'ı kapat (portu boşalt).
