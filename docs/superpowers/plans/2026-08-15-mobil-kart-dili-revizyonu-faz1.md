# Mobil Kart Dili Revizyonu — Faz 1 Implementasyon Planı

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `--m-glass-bg/--m-glass-border/--m-glass-blur/--m-sh-card` dörtlüsünün her sayfada elle kopyalanmasına son vermek — iki paylaşılan global yüzey sınıfı (`.mStatSurface`, `.mRowList`) tanımlayıp Ana sayfa, Dashboard raporları ve Mesajlar'daki kart/satır öğelerini bunlara bağlamak; ayrıca ListingCard'ın mobilde kendi (zaten iyi olan) tasarımını ezen glass override'ını kaldırmak ve 2 `window.alert()` çağrısını inline hata mesajına çevirmek.

**Architecture:** CSS Modules'ün `composes: X from global` özelliği kullanılır — her sayfa kendi `.module.css`'inde artık `background/border/backdrop-filter/box-shadow` dörtlüsünü elle yazmaz, `composes: mStatSurface from global;` (veya `mRowList`) satırıyla `globals.css`'teki TEK tanıma bağlanır. Bu proje için yeni bir teknik (ilk kullanım) ama standart CSS Modules davranışı — `globals.css` zaten global (module olmayan) bir stylesheet, mevcut `.mGlass`/`.mNum` utility class'larıyla aynı konumda yaşayacak. Hiçbir React bileşeni değişmiyor (Task 5 ve 6 hariç — onlar JS/TSX değişikliği).

**Tech Stack:** Next.js 16 (CSS Modules, webpack), Jest (scope test'ler ham CSS metnini regex ile doğruluyor), Playwright (görsel doğrulama).

**Spec:** `docs/superpowers/specs/2026-08-15-mobil-kart-dili-revizyonu-design.md`

## Global Constraints

- Yalnızca `@media (max-width: 768px)` içindeki (veya zaten mobile-only olan) kod değişir — masaüstü tasarımına DOKUNULMAZ.
- Mobil tasarım sistemi (`--m-*` token'ları) şu an **yalnızca light tema** destekliyor (`globals.css`'teki `@media (max-width:768px) { :root { --m-ink:...} }` bloğunun `[data-theme="dark"]` karşılığı yok, bilinçli/dokümante bir tasarım — bkz. globals.css satır 250-253'teki yorum). Bu fazda dark tema desteği İCAT EDİLMEZ. **ÖNEMLİ:** `.mStatSurface`/`.mRowList` yüzey rengi için `--panel` (kök seviyede tanımlı, `[data-theme]`'e göre DEĞİŞEN bir token — light `#ffffff`/dark `#0f2a4a`) KULLANILMAZ; onun yerine Task 1'de yeni eklenecek, mobil bloğun içinde yaşayan, her zaman sabit light bir `--m-panel` token'ı kullanılır. Gerekçe: `--m-ink`/`--m-body` gibi metin token'ları LIGHT-ONLY (koyu metin) — eğer arka plan `--panel` üzerinden dark temada koyu lacivere dönerse, koyu metin koyu zeminde okunmaz hale gelir. `--m-panel` bu riski ortadan kaldırır çünkü diğer `--m-*` token'ları gibi tema-bağımsız sabit kalır.
- Pazar/`ListingCard.tsx` bileşeni Task 5 DIŞINDA değiştirilmez — Task 5 bile YENİ bir görsel eklemiyor, yalnızca mobile-only bir override'ı SİLİYOR (masaüstünün zaten iyi olan görünümüne dönüş).
- `--font-serif`/`.editorialListingCard` bu fazın kapsamında DEĞİL (Faz 1'de fotoğraf içeren bir kart dönüştürülmüyor) — Faz 2'ye bırakılır, burada tanımlanmaz (kullanılmayan CSS eklenmez).
- Her CSS değişikliği önce mevcut/güncellenmiş bir scope test'le (regex, ham CSS metni okuyan `*.scope.test.ts`) doğrulanır, TDD sırası: önce testi YENİ beklenen deseni arayacak şekilde güncelle → çalıştır, kırmızı olduğunu gör (eski kod hâlâ duruyor) → CSS'i değiştir → tekrar çalıştır, yeşil olduğunu gör.

---

### Task 1: Paylaşılan `.mStatSurface` / `.mRowList` global sınıfları

**Files:**
- Modify: `src/app/globals.css` (yeni sınıflar, `.mGlass`/`.mNum` tanımının hemen altına — bkz. satır ~313-319)
- Modify: `src/app/globalsMobile.scope.test.ts` (yeni describe bloğu)

**Interfaces:**
- Produces: `.mStatSurface` global CSS class (background/border/border-radius/focus-visible — box-shadow YOK, tüketici kendi `--m-sh-card` veya `--m-sh-card-sm`'ini ekler), `.mRowList` global CSS class (aynı yüzey + `:active` basma geri bildirimi + `text-decoration:none;color:inherit` çünkü hep `<Link>`/`<a>` üzerinde kullanılıyor). Sonraki task'lar bu iki sınıfı `composes: mStatSurface from global;` / `composes: mRowList from global;` ile tüketir.

- [x] **Step 1: Yeni describe bloğunu `globalsMobile.scope.test.ts`'e ekle (RED)**

`src/app/globalsMobile.scope.test.ts` dosyası zaten `const css = readFileSync(join(process.cwd(), 'src/app/globals.css'), 'utf8')` (satır 4) ve mobil `@media` bloğunun gövdesini döndüren bir `mobileBlock()` yardımcı fonksiyonu (satır 6-20) tanımlıyor — yeni testler de bu ikisini kullanır. Dosyanın sonuna (satır 99'daki son `})`'dan sonra) ekle:

```ts
describe('Kart tekdüzeliği düzeltmesi — paylaşılan yüzey sınıfları (2026-08-15)', () => {
    it('.mStatSurface panel yüzeyi + kenarlık + köşe yarıçapı tanımlar, cam/blur YOK', () => {
        const inside = mobileBlock()
        expect(inside).toMatch(/\.mStatSurface\s*\{[^}]*background:\s*var\(--m-panel\)/)
        expect(inside).toMatch(/\.mStatSurface\s*\{[^}]*border:\s*1px solid var\(--m-divider\)/)
        expect(inside).toMatch(/\.mStatSurface\s*\{[^}]*border-radius:\s*var\(--m-r-card\)/)
        expect(inside).not.toMatch(/\.mStatSurface\s*\{[^}]*backdrop-filter/)
    })

    it('.mStatSurface:focus-visible --focus-ring kullanır', () => {
        expect(mobileBlock()).toMatch(/\.mStatSurface:focus-visible\s*\{[^}]*box-shadow:\s*var\(--focus-ring\)/)
    })

    it('.mRowList panel yüzeyi + link sıfırlama + basma geri bildirimi tanımlar', () => {
        const inside = mobileBlock()
        expect(inside).toMatch(/\.mRowList\s*\{[^}]*background:\s*var\(--m-panel\)/)
        expect(inside).toMatch(/\.mRowList\s*\{[^}]*border:\s*1px solid var\(--m-divider\)/)
        expect(inside).toMatch(/\.mRowList\s*\{[^}]*border-radius:\s*var\(--m-r-card\)/)
        expect(inside).toMatch(/\.mRowList\s*\{[^}]*text-decoration:\s*none/)
        expect(inside).not.toMatch(/\.mRowList\s*\{[^}]*backdrop-filter/)
    })

    it('.mRowList:active kucuk bir olcek gerilemesiyle basma geri bildirimi verir', () => {
        expect(mobileBlock()).toMatch(/\.mRowList:active\s*\{[^}]*transform:\s*scale\(0\.98\)/)
    })

    it('.mRowList:focus-visible --focus-ring kullanır', () => {
        expect(mobileBlock()).toMatch(/\.mRowList:focus-visible\s*\{[^}]*box-shadow:\s*var\(--focus-ring\)/)
    })

    it('--m-panel tema-bagimsiz sabit acik bir yuzey tanimlar (--panel DEGIL — o [data-theme]e gore degisir ve --m-ink/--m-body gibi light-only metin tokenlariyla dark temada catisirdi)', () => {
        expect(mobileBlock()).toMatch(/--m-panel:\s*#fff/i)
    })
})
```

- [x] **Step 2: Testi çalıştır, RED olduğunu doğrula**

Run: `npx jest src/app/globalsMobile.scope.test.ts -t "Kart tekdüzeliği"`
Expected: FAIL — `.mStatSurface`/`.mRowList` henüz `globals.css`'te yok.

- [x] **Step 3: `globals.css`'e `--m-panel` token'ını ve iki sınıfı ekle**

`src/app/globals.css`'teki mobil `:root` bloğunda `--m-fill: rgba(11,32,54,.05);` satırının (satır ~275) hemen ALTINA yeni token'ı ekle:

```css
    --m-panel: #ffffff;
```

Ardından `.mGlass { ... }` bloğunun (satır ~307-313) hemen ALTINA, `.mNum` bloğundan ÖNCE veya SONRA (aynı `@media (max-width:768px) { :root {...} ... }` bloğunun İÇİNDE, `:root` kapanışından SONRAKİ class tanımları arasında) ekle:

```css
  /* Kart tekdüzeliği düzeltmesi (2026-08-15): .mGlass her icerik turune
     (istatistik/liste/foto) ayni cam formulunu dayatiyordu — "her sayfa
     ayni gorunuyor" hissinin kaynagi (bkz. docs/superpowers/specs/2026-08-15-
     mobil-kart-dili-revizyonu-design.md). Bu iki sinif ROLE gore ayrisir:
     sayfa CSS'leri `composes: ... from global` ile bunlara baglanir,
     glass ozelliklerini bir daha elle kopyalamaz. Box-shadow BILEREK
     disaridi birakildi — tuketiciler arasinda --m-sh-card / --m-sh-card-sm
     farkli agirliklarda kullaniliyor, bu context'e ozel kalmali. */
  .mStatSurface {
    background: var(--m-panel);
    border: 1px solid var(--m-divider);
    border-radius: var(--m-r-card);
  }
  .mStatSurface:focus-visible {
    outline: none;
    box-shadow: var(--focus-ring);
  }

  .mRowList {
    display: block;
    background: var(--m-panel);
    border: 1px solid var(--m-divider);
    border-radius: var(--m-r-card);
    text-decoration: none;
    color: inherit;
    transition: transform .15s ease;
  }
  .mRowList:active {
    transform: scale(0.98);
  }
  .mRowList:focus-visible {
    outline: none;
    box-shadow: var(--focus-ring);
  }
```

- [x] **Step 4: Testi çalıştır, GREEN olduğunu doğrula**

Run: `npx jest src/app/globalsMobile.scope.test.ts`
Expected: PASS (tüm testler, yeni eklenenler dahil)

- [x] **Step 5: tsc + tam jest çalıştır**

Run: `npx tsc --noEmit && npx jest`
Expected: 0 tsc hatası, tüm test suite'leri PASS (bu adımda henüz hiçbir tüketici dosyası değişmedi, sadece yeni CSS eklendi — mevcut hiçbir testin kırılmaması gerekir).

- [ ] **Step 6: Commit**

```bash
git add src/app/globals.css src/app/globalsMobile.scope.test.ts
git commit -m "feat(mobile): .mStatSurface/.mRowList paylasilan yuzey siniflari eklendi"
```

---

### Task 2: Ana sayfa — `.listRow` / `.statGrid` paylaşılan sınıflara bağlanır

**Files:**
- Modify: `src/app/mobile/mobile.module.css:74-87` (`.listRow`), `:125-136` (`.statGrid`)
- Modify: `src/app/homeMobile.scope.test.ts:30` (mevcut assertion güncellenir)

**Interfaces:**
- Consumes: `.mStatSurface`/`.mRowList` (Task 1)

- [x] **Step 1: `homeMobile.scope.test.ts`'teki mevcut assertion'ı YENİ beklenen deseni arayacak şekilde güncelle (RED)**

`src/app/homeMobile.scope.test.ts:26-32` içindeki test şu an:

```ts
  it('mobil hero ve kartlar Liquid Glass tokenlarini kullanir', () => {
    expect(mediaIndex).toBeGreaterThan(-1)
    expect(mobile).toMatch(/\.homeMobileKok\s*\{[^}]*background:\s*var\(--m-mesh\)/)
    expect(mobile).toMatch(/\.mobileHero\s*\{[^}]*background:\s*var\(--m-grad-accent\)/)
    expect(mobile).toMatch(/\.statGrid\s*\{[^}]*background:\s*var\(--m-glass-bg\)/)
    expect(mobile).toMatch(/\.actionTile\s*\{[^}]*min-height:\s*var\(--touch-target\)/)
  })
```

`.statGrid` satırını şununla DEĞİŞTİR (diğer 3 satır aynı kalır):

```ts
  it('mobil hero ve kartlar Liquid Glass tokenlarini kullanir', () => {
    expect(mediaIndex).toBeGreaterThan(-1)
    expect(mobile).toMatch(/\.homeMobileKok\s*\{[^}]*background:\s*var\(--m-mesh\)/)
    expect(mobile).toMatch(/\.mobileHero\s*\{[^}]*background:\s*var\(--m-grad-accent\)/)
    expect(mobile).toMatch(/\.statGrid\s*\{[^}]*composes:\s*mStatSurface from global/)
    expect(mobile).toMatch(/\.actionTile\s*\{[^}]*min-height:\s*var\(--touch-target\)/)
  })

  it('.listRow paylasilan .mRowList yuzeyine baglanir, glass ozelliklerini elle tekrarlamaz', () => {
    expect(mobile).toMatch(/\.listRow\s*\{[^}]*composes:\s*mRowList from global/)
    expect(mobile).not.toMatch(/\.listRow\s*\{[^}]*background:\s*var\(--m-glass-bg\)/)
  })
```

- [x] **Step 2: Testi çalıştır, RED olduğunu doğrula**

Run: `npx jest src/app/homeMobile.scope.test.ts`
Expected: FAIL — `.statGrid`/`.listRow` henüz `composes` kullanmıyor.

- [x] **Step 3: `mobile.module.css`'te `.listRow` ve `.statGrid`'i güncelle**

`src/app/mobile/mobile.module.css:74-87` şu an:

```css
    .listRow {
        display: flex;
        flex-direction: column;
        gap: 3px;
        padding: 12px 14px;
        border-radius: var(--m-r-card);
        background: var(--m-glass-bg);
        border: 1px solid var(--m-glass-border);
        backdrop-filter: var(--m-glass-blur);
        -webkit-backdrop-filter: var(--m-glass-blur);
        box-shadow: var(--m-sh-card), inset 0 1px 0 #fff;
        text-decoration: none;
        color: inherit;
    }
```

Şununla DEĞİŞTİR:

```css
    .listRow {
        composes: mRowList from global;
        display: flex;
        flex-direction: column;
        gap: 3px;
        padding: 12px 14px;
        box-shadow: var(--m-sh-card), inset 0 1px 0 #fff;
    }
```

(`border-radius`/`background`/`border`/`backdrop-filter`/`-webkit-backdrop-filter`/`text-decoration`/`color` satırları `mRowList`'ten geliyor artık — silindi. `box-shadow` kalıyor, context'e özel.)

`mobile.module.css:125-136` şu an:

```css
    .statGrid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 6px;
        padding: 10px 8px;
        border-radius: var(--m-r-card);
        background: var(--m-glass-bg);
        border: 1px solid var(--m-glass-border);
        backdrop-filter: var(--m-glass-blur);
        -webkit-backdrop-filter: var(--m-glass-blur);
        box-shadow: var(--m-sh-card), inset 0 1px 0 #fff;
    }
```

Şununla DEĞİŞTİR:

```css
    .statGrid {
        composes: mStatSurface from global;
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 6px;
        padding: 10px 8px;
        box-shadow: var(--m-sh-card), inset 0 1px 0 #fff;
    }
```

- [x] **Step 4: Testi çalıştır, GREEN olduğunu doğrula**

Run: `npx jest src/app/homeMobile.scope.test.ts`
Expected: PASS

- [x] **Step 5: tsc + tam jest çalıştır**

Run: `npx tsc --noEmit && npx jest`
Expected: 0 hata, tüm suite PASS.

- [ ] **Step 6: Commit**

```bash
git add src/app/mobile/mobile.module.css src/app/homeMobile.scope.test.ts
git commit -m "refactor(mobile-home): listRow/statGrid paylasilan yuzey siniflarina baglandi"
```

---

### Task 3: Dashboard raporları — `.heroCard/.reportCard/.emptyCard/.stateCard` → `.mStatSurface`

**Files:**
- Modify: `src/app/dashboard/reports/page.module.css:244-254`
- Modify: `src/app/dashboard/reports/reportsMobile.scope.test.ts:25-29`

**Interfaces:**
- Consumes: `.mStatSurface` (Task 1)

- [x] **Step 1: `reportsMobile.scope.test.ts`'teki mevcut assertion'ı güncelle (RED)**

`src/app/dashboard/reports/reportsMobile.scope.test.ts:25-29` şu an:

```ts
    it('mobil kabuk --m-* mesh ve cam yuzey tokenlarini kullanir', () => {
        expect(mobile).toMatch(/\.reportsShell\s*\{[^}]*background:\s*var\(--m-mesh\),\s*var\(--m-bg\)/)
        expect(mobile).toMatch(/\.heroCard,\s*\.reportCard,\s*\.emptyCard,\s*\.stateCard\s*\{[^}]*background:\s*var\(--m-glass-bg\)/)
        expect(mobile).toMatch(/backdrop-filter:\s*var\(--m-glass-blur\)/)
    })
```

Şununla DEĞİŞTİR:

```ts
    it('mobil kabuk --m-* mesh tokenini kullanir', () => {
        expect(mobile).toMatch(/\.reportsShell\s*\{[^}]*background:\s*var\(--m-mesh\),\s*var\(--m-bg\)/)
    })

    it('hero/rapor/bos/durum kartlari paylasilan .mStatSurface yuzeyine baglanir', () => {
        expect(mobile).toMatch(/\.heroCard,\s*\.reportCard,\s*\.emptyCard,\s*\.stateCard\s*\{[^}]*composes:\s*mStatSurface from global/)
        expect(mobile).not.toMatch(/\.heroCard,\s*\.reportCard,\s*\.emptyCard,\s*\.stateCard\s*\{[^}]*background:\s*var\(--m-glass-bg\)/)
    })
```

- [x] **Step 2: Testi çalıştır, RED olduğunu doğrula**

Run: `npx jest src/app/dashboard/reports/reportsMobile.scope.test.ts`
Expected: FAIL

- [x] **Step 3: `page.module.css`'i güncelle**

`src/app/dashboard/reports/page.module.css:244-254` şu an:

```css
    .heroCard,
    .reportCard,
    .emptyCard,
    .stateCard {
        border-radius: var(--m-r-card);
        background: var(--m-glass-bg);
        border: 1px solid var(--m-glass-border);
        backdrop-filter: var(--m-glass-blur);
        -webkit-backdrop-filter: var(--m-glass-blur);
        box-shadow: var(--m-sh-card), inset 0 1px 0 #fff;
    }
```

Şununla DEĞİŞTİR:

```css
    .heroCard,
    .reportCard,
    .emptyCard,
    .stateCard {
        composes: mStatSurface from global;
        box-shadow: var(--m-sh-card), inset 0 1px 0 #fff;
    }
```

- [x] **Step 4: Testi çalıştır, GREEN olduğunu doğrula**

Run: `npx jest src/app/dashboard/reports/reportsMobile.scope.test.ts`
Expected: PASS

- [x] **Step 5: tsc + tam jest çalıştır**

Run: `npx tsc --noEmit && npx jest`
Expected: 0 hata, tüm suite PASS.

- [ ] **Step 6: Commit**

```bash
git add src/app/dashboard/reports/page.module.css src/app/dashboard/reports/reportsMobile.scope.test.ts
git commit -m "refactor(dashboard-reports): hero/rapor/bos/durum kartlari mStatSurface'a baglandi"
```

---

### Task 4: Mesajlar — konuşma listesi `.mRowList`'e, boş/durum notları `.mStatSurface`'a bağlanır

**Files:**
- Modify: `src/app/inbox/inbox.module.css` (`.convItem` ~571-577, `.emptyConvList`/`.loadingList` ~627-636)
- Modify: `src/app/inbox/inbox.scope.test.ts:42`
- Modify: `src/app/inbox/inboxMobile.scope.test.ts:12`, `:25-26`
- Modify: `src/app/inbox/[userId]/page.module.css:112-122` (`.stateCard`)
- Test: `src/app/inbox/[userId]/chatMobile.test.tsx` (yeni test eklenir — mevcut testler DEĞİŞMEZ, bkz. Step 5)

**Interfaces:**
- Consumes: `.mStatSurface`/`.mRowList` (Task 1)

**ÖNEMLİ — dokunulmayacaklar:** `.sidebar`, `.chatHeader`, `.inputArea`, `.chatTopbar`, `.composerInner`, `.bubbleMine`, `.bubbleTheirs`, `.convItemActive` (`!important` override'ı KALIR, ayrı bir seçici) — bunlar sohbet chrome'u/mesaj balonları, kart deseni DEĞİL. Sadece aşağıda listelenenlere dokun.

- [x] **Step 1: `inbox.scope.test.ts`'teki `.convItem` assertion'ını güncelle (RED)**

`src/app/inbox/inbox.scope.test.ts:41-44` şu an:

```ts
  it('.convItem mobilde cam kart, .convTime mono zaman etiketi olmali', () => {
    expect(mobile()).toMatch(/\.convItem\s*\{[^}]*background:\s*var\(--m-glass-bg\)/);
    expect(mobile()).toMatch(/\.convTime\s*\{[^}]*font-family:\s*var\(--m-mono\)/);
  });
```

Şununla DEĞİŞTİR:

```ts
  it('.convItem paylasilan .mRowList yuzeyine baglanir, .convTime mono zaman etiketi olmali', () => {
    expect(mobile()).toMatch(/\.convItem\s*\{[^}]*composes:\s*mRowList from global/);
    expect(mobile()).not.toMatch(/\.convItem\s*\{[^}]*background:\s*var\(--m-glass-bg\)/);
    expect(mobile()).toMatch(/\.convTime\s*\{[^}]*font-family:\s*var\(--m-mono\)/);
  });
```

- [x] **Step 2: `inboxMobile.scope.test.ts`'teki iki assertion'ı güncelle (RED)**

`src/app/inbox/inboxMobile.scope.test.ts:9-16` şu an:

```ts
  it('konusma listesi cam kartlar, okunmamis durum ve mono zaman etiketi tasir', () => {
    expect(tsx).toMatch(/styles\.convTime/)
    expect(tsx).toMatch(/styles\.avatarUnread/)
    expect(mobile).toMatch(/\.convItem\s*\{[^}]*background:\s*var\(--m-glass-bg\)/)
    expect(mobile).toMatch(/\.convItem\.convItemActive\s*\{[^}]*background:\s*var\(--m-fill\)\s*!important/)
    expect(mobile).toMatch(/\.convTime\s*\{[^}]*font-family:\s*var\(--m-mono\)/)
    expect(mobile).toMatch(/\.unreadCountBadge\s*\{[^}]*background:\s*var\(--m-grad-btn\)/)
  })
```

`.convItem` satırını şununla DEĞİŞTİR (diğer satırlar aynı kalır):

```ts
    expect(mobile).toMatch(/\.convItem\s*\{[^}]*composes:\s*mRowList from global/)
```

`inboxMobile.scope.test.ts:24-27` şu an:

```ts
  it('bos durum ve yukleniyor mobilde cam not karti olarak stillenir', () => {
    expect(mobile).toMatch(/\.emptyConvList,\s*\.loadingList\s*\{[^}]*background:\s*var\(--m-glass-bg\)/)
    expect(mobile).toMatch(/\.emptyConvList,\s*\.loadingList\s*\{[^}]*border:\s*1px solid var\(--m-glass-border\)/)
  })
```

Şununla DEĞİŞTİR:

```ts
  it('bos durum ve yukleniyor mobilde paylasilan .mStatSurface yuzeyini kullanir', () => {
    expect(mobile).toMatch(/\.emptyConvList,\s*\.loadingList\s*\{[^}]*composes:\s*mStatSurface from global/)
    expect(mobile).not.toMatch(/\.emptyConvList,\s*\.loadingList\s*\{[^}]*background:\s*var\(--m-glass-bg\)/)
  })
```

- [x] **Step 3: Testleri çalıştır, RED olduğunu doğrula**

Run: `npx jest src/app/inbox/inbox.scope.test.ts src/app/inbox/inboxMobile.scope.test.ts`
Expected: FAIL (3 test)

- [x] **Step 4: `inbox.module.css`'i güncelle**

`src/app/inbox/inbox.module.css:567-578` şu an (`.convItem.convItemActive` — satır 580-583 — AYRI bir selector, DOKUNULMAZ):

```css
    .convItem {
        min-height: 72px;
        padding: 12px;
        border-radius: var(--m-r-card);
        background: var(--m-glass-bg);
        border: 1px solid var(--m-glass-border);
        box-shadow: var(--m-sh-card-sm), inset 0 1px 0 #fff;
    }

    .convItem:hover {
        background: var(--m-glass-bg);
    }
```

Şununla DEĞİŞTİR (`:hover` kuralı SİLİNDİ — dokunmatik cihazda anlamsız, ayrıca `:hover`'ın 0-2-0 özgüllüğü composed `.mRowList`'in tabanını ezip eski glass rengini geri getirirdi; dokunma geri bildirimi zaten `.mRowList:active`'ten geliyor):

```css
    .convItem {
        composes: mRowList from global;
        min-height: 72px;
        padding: 12px;
        box-shadow: var(--m-sh-card-sm), inset 0 1px 0 #fff;
    }
```

`src/app/inbox/inbox.module.css:622-631` şu an:

```css
    .emptyConvList,
    .loadingList {
        margin: 8px 0;
        padding: 18px;
        border-radius: var(--m-r-card);
        background: var(--m-glass-bg);
        border: 1px solid var(--m-glass-border);
        color: var(--m-body);
        box-shadow: var(--m-sh-card-sm), inset 0 1px 0 #fff;
    }
```

Şununla DEĞİŞTİR:

```css
    .emptyConvList,
    .loadingList {
        composes: mStatSurface from global;
        margin: 8px 0;
        padding: 18px;
        color: var(--m-body);
        box-shadow: var(--m-sh-card-sm), inset 0 1px 0 #fff;
    }
```

- [x] **Step 5: `chatMobile.test.tsx`'e `.stateCard` için yeni bir test ekle (RED)**

`src/app/inbox/[userId]/chatMobile.test.tsx` sonuna (mevcut son `})`'dan sonra, aynı `describe` bloğu içinde veya yeni bir `describe` olarak) ekle:

```ts
describe('inbox sohbet detay — durum notu paylasilan yuzeye baglanir (2026-08-15)', () => {
  it('.stateCard paylasilan .mStatSurface yuzeyine baglanir', () => {
    expect(mobile).toMatch(/\.stateCard\s*\{[^}]*composes:\s*mStatSurface from global/)
    expect(mobile).not.toMatch(/\.stateCard\s*\{[^}]*background:\s*var\(--m-glass-bg\)/)
  })
})
```

(Dosyanın en üstünde `mobile` adlı bir değişkenin zaten `@media (max-width: 768px)` bloğunu dilimlediğini doğrula — yoksa mevcut testlerin nasıl CSS okuduğuna bak ve aynı deseni kullan.)

- [x] **Step 6: Testi çalıştır, RED olduğunu doğrula**

Run: `npx jest src/app/inbox/[userId]/chatMobile.test.tsx`
Expected: FAIL

- [x] **Step 7: `inbox/[userId]/page.module.css`'teki `.stateCard`'ı güncelle**

`src/app/inbox/[userId]/page.module.css:112-122` şu an:

```css
    .stateCard {
        margin: 20px 0 0;
        padding: 18px;
        border-radius: var(--m-r-card);
        background: var(--m-glass-bg);
        border: 1px solid var(--m-glass-border);
        color: var(--m-body);
        font: 700 13px/1.45 Inter, sans-serif;
        text-align: center;
        box-shadow: var(--m-sh-card-sm), inset 0 1px 0 #fff;
    }
```

Şununla DEĞİŞTİR:

```css
    .stateCard {
        composes: mStatSurface from global;
        margin: 20px 0 0;
        padding: 18px;
        color: var(--m-body);
        font: 700 13px/1.45 Inter, sans-serif;
        text-align: center;
        box-shadow: var(--m-sh-card-sm), inset 0 1px 0 #fff;
    }
```

- [x] **Step 8: Tüm mesajlar testlerini çalıştır, GREEN olduğunu doğrula**

Run: `npx jest src/app/inbox`
Expected: PASS (tüm inbox test dosyaları)

- [x] **Step 9: tsc + tam jest çalıştır**

Run: `npx tsc --noEmit && npx jest`
Expected: 0 hata, tüm suite PASS.

- [ ] **Step 10: Commit**

```bash
git add src/app/inbox/inbox.module.css src/app/inbox/inbox.scope.test.ts src/app/inbox/inboxMobile.scope.test.ts src/app/inbox/[userId]/page.module.css src/app/inbox/[userId]/chatMobile.test.tsx
git commit -m "refactor(inbox): konusma listesi mRowList'e, durum notlari mStatSurface'a baglandi"
```

---

### Task 5: ListingCard mobil — glass override kaldırılıyor

**Files:**
- Modify: `src/components/marketplace/ListingCard.module.css:100-131`
- Test: `src/components/marketplace/ListingCard.module.css` için scope test dosyası varsa güncellenir (yoksa yeni `src/components/marketplace/ListingCard.scope.test.ts` oluşturulur)

**Interfaces:**
- Consumes: yok (yalnızca silme işlemi)

**Bağlam:** `ListingCard` masaüstünde/genel olarak zaten iyi durumda (gerçek fotoğraf, `FizibiliteScoreBadge`, hover/tabular-nums). Mobil `@media(max-width:768px)` bloğundaki `.cardRoot` override'ı bu iyi tasarımı `!important` ile eziyor. Düzeltme YENİ bir sınıf eklemek değil, bu override'ı SİLMEK — kart mobilde masaüstüyle aynı (zaten onaylı) görünüme döner.

- [x] **Step 1: Önce mevcut/olası scope test dosyasını kontrol et**

Run: `Glob "src/components/marketplace/ListingCard*.test*"` (veya proje kökünden `find`) — `ListingCard.module.css`'i test eden bir `*.scope.test.ts` dosyası var mı bak. Varsa `.cardRoot`'un mobil `--m-glass-*` kullanımını doğrulayan bir assertion olup olmadığını grep'le: `grep -n "cardRoot" <bulunan dosya>`.

- [x] **Step 2: Eğer mevcut bir assertion .cardRoot'un glass arka planını bekliyorsa, testi güncelle (RED)**

Bulunursa, o assertion'ı "`.cardRoot` mobilde EK bir glass override TAŞIMAMALI" şeklinde tersine çevir, örnek:

```ts
  it('.cardRoot mobilde masaustunun glass override etmeyen tasarimini korur (2026-08-15 duzeltmesi)', () => {
    const mobile = css.slice(css.indexOf('@media (max-width: 768px)'))
    expect(mobile).not.toMatch(/\.cardRoot\s*\{[^}]*background:\s*var\(--m-glass-bg\)/)
  })
```

Eğer böyle bir test dosyası HİÇ yoksa, `src/components/marketplace/ListingCard.scope.test.ts` adında yeni bir dosya oluştur:

```ts
import fs from 'fs'
import path from 'path'

const css = fs.readFileSync(path.join(__dirname, 'ListingCard.module.css'), 'utf8')

describe('ListingCard mobil — glass override kaldirildi (2026-08-15)', () => {
    it('.cardRoot mobilde artik ayri bir glass arka plan/kenarlik/blur override'i tasimaz', () => {
        const mobile = css.slice(css.indexOf('@media (max-width: 768px)'))
        expect(mobile).not.toMatch(/\.cardRoot\s*\{[^}]*background:\s*var\(--m-glass-bg\)/)
        expect(mobile).not.toMatch(/\.cardRoot\s*\{[^}]*backdrop-filter/)
    })
})
```

- [x] **Step 3: Testi çalıştır, RED olduğunu doğrula**

Run: `npx jest ListingCard`
Expected: FAIL (yeni/güncellenmiş test, `.cardRoot` hâlâ glass override taşıyor)

- [x] **Step 4: `.cardRoot`'un mobil override'ını sil**

`src/components/marketplace/ListingCard.module.css` içinde `@media (max-width: 768px)` bloğunda satır ~105-112 civarındaki:

```css
    .cardRoot {
        background: var(--m-glass-bg) !important;
        border: 1px solid var(--m-glass-border) !important;
        border-radius: var(--m-r-card) !important;
        backdrop-filter: var(--m-glass-blur);
        -webkit-backdrop-filter: var(--m-glass-blur);
        box-shadow: var(--m-sh-card), inset 0 1px 0 #fff !important;
    }
```

bloğunun TAMAMINI SİL. `.dataNum` (aynı media query'de, satır ~101-104, `font-family`/`tabular-nums`) ZARARSIZ — SİLİNMEZ, kalır.

- [x] **Step 5: `.priceText`/`.typeBadge` mobil override'larını kontrol et**

`.cardRoot` bloğundan hemen sonra (satır ~114'ten itibaren, `.photoFrame` ve devamı) gelen diğer mobil override'ları oku. Eğer aralarında `var(--m-glass-*)` kullanan BAŞKA bir kural varsa (ör. `.priceText`/`.typeBadge` üzerinde), onu da aynı gerekçeyle (masaüstü tasarımını gereksiz yere ezmesin diye) değerlendir — yalnızca `--m-glass-bg/--m-glass-border/--m-glass-blur` kullanan kısımları sil, `--m-mono`/`--m-ink` gibi zararsız token kullanımlarına DOKUNMA.

- [x] **Step 6: Testi çalıştır, GREEN olduğunu doğrula**

Run: `npx jest ListingCard`
Expected: PASS

- [x] **Step 7: tsc + tam jest çalıştır**

Run: `npx tsc --noEmit && npx jest`
Expected: 0 hata, tüm suite PASS.

- [ ] **Step 8: Commit**

```bash
git add src/components/marketplace/ListingCard.module.css src/components/marketplace/ListingCard.scope.test.ts
git commit -m "fix(marketplace): ListingCard mobil glass override kaldirildi, masaustu tasarimi korunur"
```

---

### Task 6: `window.alert()` → inline hata mesajı (2 yer)

**Files:**
- Modify: `src/app/dashboard/profile/page.tsx:195-213` (`handleExportData`)
- Modify: `src/app/dashboard/profile/page.tsx` (JSX — export butonunun altına hata notu)
- Test: `src/app/dashboard/profile/alertRemoval.scope.test.ts` (yeni dosya)
- Modify: `src/app/listings/new/page.tsx:43-63` (`handlePublish`)
- Modify: `src/app/listings/new/page.tsx` (JSX — publish butonunun yakınına hata notu)
- Test: `src/app/listings/new/alertRemoval.scope.test.ts` (yeni dosya)

**Interfaces:**
- Consumes: yok

**Not (test yaklaşımı gerekçesi):** Her iki sayfanın da (ne `dashboard/profile/page.tsx` ne `listings/new/page.tsx`) mevcut bir render-test altyapısı (mock session/router/fetch) yok — sadece CSS `*.scope.test.ts` dosyaları var. `listings/new` ayrıca 5 adımlı bir wizard (`WizardStep1Location` harita/`ParcelPicker` bileşeni gerektiriyor) — tam render+mock kurmak bu küçük düzeltme için orantısız karmaşıklık ve kırılganlık getirir. Bunun yerine bu projede ZATEN baskın olan desen kullanılıyor: ham `.tsx` kaynağını okuyup regex ile yapısal garanti veren `*.scope.test.ts`. Bu, "alert() kalmadı + state-tabanlı hata mesajı var" garantisini render etmeden de güvenilir şekilde verir.

- [x] **Step 1: `dashboard/profile/alertRemoval.scope.test.ts` dosyasını oluştur (RED)**

```ts
import fs from 'fs'
import path from 'path'

const tsx = fs.readFileSync(path.join(__dirname, 'page.tsx'), 'utf8')

describe('dashboard/profile — window.alert() kaldirildi (2026-08-15)', () => {
    it('handleExportData artik alert() cagirmiyor', () => {
        const fnMatch = tsx.match(/const handleExportData = async \(\) => \{[\s\S]*?\n    \}/)
        expect(fnMatch).not.toBeNull()
        expect(fnMatch![0]).not.toMatch(/alert\(/)
        expect(fnMatch![0]).toMatch(/setExportError\(/)
    })

    it('exportError state tanimli ve JSX icinde kosullu olarak render ediliyor', () => {
        expect(tsx).toMatch(/const \[exportError, setExportError\] = useState\(/)
        expect(tsx).toMatch(/\{exportError && \(/)
    })
})
```

- [x] **Step 2: Testi çalıştır, RED olduğunu doğrula**

Run: `npx jest src/app/dashboard/profile/alertRemoval.scope.test.ts`
Expected: FAIL — `alert(` hâlâ var, `exportError` state yok.

- [x] **Step 3: `handleExportData`'yı güncelle**

`src/app/dashboard/profile/page.tsx:88` civarına (`deleteError` state'inin yanına) yeni bir state ekle:

```ts
    const [exportError, setExportError] = useState('')
```

`src/app/dashboard/profile/page.tsx:195-213`'teki mevcut hali:

```ts
    const handleExportData = async () => {
        setExporting(true)
        try {
            const res = await fetch('/api/user/export')
            if (!res.ok) throw new Error('export failed')
            const data = await res.json()
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `arsabil-verilerim-${new Date().toISOString().slice(0, 10)}.json`
            a.click()
            URL.revokeObjectURL(url)
        } catch {
            alert('Veri indirme sırasında bir hata oluştu.')
        } finally {
            setExporting(false)
        }
    }
```

Şununla DEĞİŞTİR:

```ts
    const handleExportData = async () => {
        setExporting(true)
        setExportError('')
        try {
            const res = await fetch('/api/user/export')
            if (!res.ok) throw new Error('export failed')
            const data = await res.json()
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `arsabil-verilerim-${new Date().toISOString().slice(0, 10)}.json`
            a.click()
            URL.revokeObjectURL(url)
        } catch {
            setExportError('Veri indirme sırasında bir hata oluştu.')
        } finally {
            setExporting(false)
        }
    }
```

`src/app/dashboard/profile/page.tsx:560-567` civarındaki export butonunun (mevcut hali):

```tsx
                                    <button
                                        onClick={handleExportData}
                                        disabled={exporting}
                                        className={styles.btnSecondarySmall}
                                        style={{ opacity: exporting ? 0.6 : 1 }}
                                    >
                                        {exporting ? 'Hazırlanıyor…' : '📥 Verilerimi İndir'}
                                    </button>
```

HEMEN ALTINA (mevcut `deleteModalError` deseniyle AYNI class'ı kullanarak) ekle:

```tsx
                                    <button
                                        onClick={handleExportData}
                                        disabled={exporting}
                                        className={styles.btnSecondarySmall}
                                        style={{ opacity: exporting ? 0.6 : 1 }}
                                    >
                                        {exporting ? 'Hazırlanıyor…' : '📥 Verilerimi İndir'}
                                    </button>
                                    {exportError && (
                                        <div className={styles.deleteModalError}>
                                            {exportError}
                                        </div>
                                    )}
```

- [x] **Step 4: Testi çalıştır, GREEN olduğunu doğrula**

Run: `npx jest src/app/dashboard/profile/alertRemoval.scope.test.ts`
Expected: PASS

- [x] **Step 5: `listings/new/alertRemoval.scope.test.ts` dosyasını oluştur (RED)**

`src/components/listing-wizard/WizardShell.tsx`'in `error`/`errorMessage` benzeri bir prop KABUL ETMEDİĞİ doğrulandı (yalnızca `pageTitle`/`stepTitle`/`step`/`onBack`/`onNext`/`nextDisabled`/`children`) — bu yüzden hata mesajı `<WizardShell>`'in DIŞINA, bir üst `<>...</>` fragment'i içine eklenecek.

```ts
import fs from 'fs'
import path from 'path'

const tsx = fs.readFileSync(path.join(__dirname, 'page.tsx'), 'utf8')

describe('listings/new — window.alert() kaldirildi (2026-08-15)', () => {
    it('handlePublish artik alert() cagirmiyor', () => {
        const fnMatch = tsx.match(/const handlePublish = async \(\) => \{[\s\S]*?\n  \}/)
        expect(fnMatch).not.toBeNull()
        expect(fnMatch![0]).not.toMatch(/alert\(/)
        expect(fnMatch![0]).toMatch(/setPublishError\(/)
    })

    it('publishError state tanimli ve JSX icinde kosullu olarak render ediliyor', () => {
        expect(tsx).toMatch(/const \[publishError, setPublishError\] = useState\(/)
        expect(tsx).toMatch(/\{publishError && \(/)
        expect(tsx).toMatch(/role="alert"/)
    })
})
```

- [x] **Step 6: Testi çalıştır, RED olduğunu doğrula**

Run: `npx jest src/app/listings/new/alertRemoval.scope.test.ts`
Expected: FAIL — `alert(` hâlâ var, `publishError` state yok.

- [x] **Step 7: `handlePublish`'i ve JSX'i güncelle**

`src/app/listings/new/page.tsx:28` civarına (`tempId` state'inin yanına) yeni bir state ekle:

```ts
  const [publishError, setPublishError] = useState('')
```

`src/app/listings/new/page.tsx:43-63`'teki mevcut hali:

```ts
  const handlePublish = async () => {
    setPublishing(true)
    try {
      const res = await fetch('/api/listings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildListingPublishBody(form)),
      })
      if (res.ok) {
        const listing = await res.json()
        router.push(`/listing/${listing.id}`)
      } else {
        const err = await res.json()
        alert(err.message || 'İlan yayınlanırken bir hata oluştu.')
        setPublishing(false)
      }
    } catch {
      alert('Bir hata oluştu.')
      setPublishing(false)
    }
  }
```

Şununla DEĞİŞTİR:

```ts
  const handlePublish = async () => {
    setPublishing(true)
    setPublishError('')
    try {
      const res = await fetch('/api/listings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildListingPublishBody(form)),
      })
      if (res.ok) {
        const listing = await res.json()
        router.push(`/listing/${listing.id}`)
      } else {
        const err = await res.json()
        setPublishError(err.message || 'İlan yayınlanırken bir hata oluştu.')
        setPublishing(false)
      }
    } catch {
      setPublishError('Bir hata oluştu.')
      setPublishing(false)
    }
  }
```

`src/app/listings/new/page.tsx:67-82`'deki mevcut return bloğu:

```tsx
  return (
    <WizardShell
      pageTitle="Yeni İlan Oluştur"
      stepTitle={STEP_TITLES[step - 1]}
      step={step}
      onBack={step > 1 ? () => setStep(s => s - 1) : undefined}
      onNext={step < 5 ? () => setStep(s => s + 1) : undefined}
      nextDisabled={!canGoNext()}
    >
      {step === 1 && <WizardStep1Location data={form} onChange={update} />}
      {step === 2 && <WizardStep2Detail data={form} onChange={update} />}
      {step === 3 && <WizardStep3Photos data={form} onChange={update} tempListingId={tempId} />}
      {step === 4 && <WizardStep4Feasibility data={form} onChange={update} />}
      {step === 5 && <WizardStep5Preview data={form} publishing={publishing} onPublish={handlePublish} />}
    </WizardShell>
  )
```

Şununla DEĞİŞTİR:

```tsx
  return (
    <>
      {publishError && (
        <div role="alert" style={{ padding: '10px 16px', background: 'rgba(255,45,85,.12)', color: '#b8102f', fontSize: '.85rem', fontWeight: 600 }}>
          {publishError}
        </div>
      )}
      <WizardShell
        pageTitle="Yeni İlan Oluştur"
        stepTitle={STEP_TITLES[step - 1]}
        step={step}
        onBack={step > 1 ? () => setStep(s => s - 1) : undefined}
        onNext={step < 5 ? () => setStep(s => s + 1) : undefined}
        nextDisabled={!canGoNext()}
      >
        {step === 1 && <WizardStep1Location data={form} onChange={update} />}
        {step === 2 && <WizardStep2Detail data={form} onChange={update} />}
        {step === 3 && <WizardStep3Photos data={form} onChange={update} tempListingId={tempId} />}
        {step === 4 && <WizardStep4Feasibility data={form} onChange={update} />}
        {step === 5 && <WizardStep5Preview data={form} publishing={publishing} onPublish={handlePublish} />}
      </WizardShell>
    </>
  )
```

- [x] **Step 8: Testi çalıştır, GREEN olduğunu doğrula**

Run: `npx jest src/app/listings/new/alertRemoval.scope.test.ts`
Expected: PASS

- [x] **Step 9: tsc + tam jest çalıştır**

Run: `npx tsc --noEmit && npx jest`
Expected: 0 hata, tüm suite PASS.

- [ ] **Step 10: Commit**

```bash
git add src/app/dashboard/profile/page.tsx src/app/dashboard/profile/alertRemoval.scope.test.ts src/app/listings/new/page.tsx src/app/listings/new/alertRemoval.scope.test.ts
git commit -m "fix(a11y): window.alert() yerine sayfa ici hata mesaji (disa aktarma + ilan yayinlama)"
```

---

## Faz 1 Sonrası (plan dışı, controller tarafından yapılacak)

- Tüm task'lar birleştikten sonra `finishing-a-development-branch` akışıyla merge.
- Playwright ile gerçek dev server üzerinde ışık temada Ana sayfa/Dashboard raporları/Mesajlar/Pazar (ListingCard) mobil görünümü ekran görüntüsüyle doğrulanır (bu proje dark tema mobilde henüz desteklenmiyor — bkz. Global Constraints).
- Kapsam dışı bırakılanlar (login/register/ilan detay/dashboard settings-profile edit/notifications/hesapla mobil/ScenarioCompare/FilterSidebar, `:focus-visible`'ın diğer sayfalara yayılması, skeleton loader, jenerik hata metinleri) için Faz 2 planı — kullanıcıyla ayrıca görüşülecek.

## Validation Notes

- Task 1 is already implemented: `src/app/globals.css` defines `--m-panel`, `.mStatSurface`, and `.mRowList`; `src/app/globalsMobile.scope.test.ts` verifies mobile-only surface contracts and no blur on shared stat/list surfaces.
- Task 2 is implemented: `src/app/mobile/mobile.module.css` composes `.listRow` from `mRowList` and `.statGrid` from `mStatSurface`; `src/app/homeMobile.scope.test.ts` covers the shared-surface contract.
- Task 3 is implemented: `src/app/dashboard/reports/page.module.css` composes hero/report/empty/state cards from `mStatSurface`; `src/app/dashboard/reports/reportsMobile.scope.test.ts` covers it.
- Task 4 is implemented: inbox conversation rows compose `mRowList`, empty/loading/state cards compose `mStatSurface`, while chat chrome/bubbles keep their intentional glass styling; inbox tests cover the split.
- Task 5 is implemented: `src/components/marketplace/ListingCard.module.css` no longer applies a mobile `.cardRoot` glass override; `src/components/marketplace/ListingCard.scope.test.ts` guards the absence of that override.
- Task 6 is implemented: `dashboard/profile` and `listings/new` no longer use `window.alert()` for the covered paths; inline error state is guarded by `alertRemoval.scope.test.ts` files.
- Targeted Faz 1 tests PASS: `npx jest src/app/globalsMobile.scope.test.ts src/app/homeMobile.scope.test.ts src/app/dashboard/reports/reportsMobile.scope.test.ts src/app/inbox src/components/marketplace/ListingCard.scope.test.ts src/app/dashboard/profile/alertRemoval.scope.test.ts src/app/listings/new/alertRemoval.scope.test.ts` -> 18 suites / 128 tests.
- `npx tsc --noEmit` PASS.
- `npx jest --no-coverage --roots "<rootDir>/src"` PASS: 173 suites / 1358 tests.
- `npm run build` PASS.
