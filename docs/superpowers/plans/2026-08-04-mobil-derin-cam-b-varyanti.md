# Mobil "Derin Cam" (B) Varyantı Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Lead'in onayladığı "Derin Cam" (B) görsel varyantını mockup'tan gerçek `--m-*` token sistemine taşımak — blur/doygunluk/radius/gölge/mesh değerlerini güncellemek, tokenize edilmemiş üç sapmayı düzeltmek, ve birincil CTA butonuna ışık geçişi eklemek.

**Architecture:** Tek kaynak `globals.css`'teki `--m-*` `:root` bloğu; onu tüketen her yer (zaten `var()` ile bağlı olanlar) otomatik B'ye geçer. Token'a bağlı OLMAYAN üç kopya (`.stepperAzalt`, `.gelismisAyarlarBtn`, `BottomNavbar.module.css`) `var(--m-glass-blur)`'a bağlanarak aynı otomatik geçişe dahil edilir.

**Tech Stack:** CSS Modules, Jest (kaynak-metin okuyan `*.scope.test.ts` deseni — bu projede CSS değerleri davranış testiyle değil, dosya içeriğini okuyan testlerle doğrulanıyor).

## Global Constraints

- Yalnızca görsel token güncellemesi — bilgi mimarisi, davranış, JSX yapısı değişmiyor.
- Elle TKGM sorgulama formu ve konum tespiti (geolocation) bu planın KAPSAMI DIŞINDA.
- Masaüstü `--seal-*` sistemi dokunulmuyor.
- `.metrikKutu`/`.fisButonu`'ndaki `blur(10px)` BİLEREK değişmiyor — `--m-grad-accent` degrade zemin üzerindeki ayrı, kasıtlı olarak daha hafif bir cam katmanı.
- `--m-r-inner`, `--m-sh-card-sm`, `--m-sh-grad-btn`, `--m-sh-sheet`, `--m-sh-bottombar` değişmiyor — spec bunları kapsamıyor.
- Her task sonunda `npx tsc --noEmit` ve ilgili jest suite'i çalıştırılır.
- Ana checkout'ta jest komutu: `npx jest --no-coverage --roots "<rootDir>/src"`.
- Commit mesajları Türkçe, projenin mevcut üslubunda.

---

## Task 1: `globals.css` — `--m-*` root token'larını B değerlerine güncelle

**Files:**
- Modify: `src/app/globals.css:195-241` (mobil `@media (max-width: 768px)` bloğu içindeki `:root`)
- Modify: `src/app/globalsMobile.scope.test.ts:45` (eski A değerini pinleyen mevcut assertion)

**Interfaces:**
- Consumes: yok.
- Produces: yeni token değerleri — Task 2/3/4'ün `var(--m-glass-blur)` bağlantıları ve görsel sonuç bunlara dayanır.

- [ ] **Step 1: Mevcut token bloğunu güncelle**

`src/app/globals.css` içinde, `:root {` (satır ~195) ile başlayan blokta şu satırları:

```css
    --m-mesh:
      radial-gradient(680px 420px at 12% -6%, rgba(43,124,255,.42), transparent 62%),
      radial-gradient(560px 420px at 96% 8%,  rgba(34,211,238,.38), transparent 60%),
      radial-gradient(620px 520px at 78% 96%, rgba(124,58,237,.24), transparent 62%),
      radial-gradient(520px 380px at 4% 86%,  rgba(16,185,129,.22), transparent 60%);

    --m-grad-accent: linear-gradient(135deg, #3b8bff 0%, #1f6feb 46%, #22d3ee 118%);
    --m-grad-btn: linear-gradient(135deg, #3b8bff, #1f6feb 60%, #22d3ee);

    --m-ink: #0b2036;
    --m-body: #5c6b82;
    --m-on-glass: #173b63;
    --m-link: #1560d0;

    --m-glass-bg: rgba(255,255,255,.66);
    --m-glass-border: rgba(255,255,255,.92);
    --m-glass-blur: blur(30px) saturate(190%);
    --m-fill: rgba(11,32,54,.05);
    --m-divider: rgba(11,32,54,.07);

    --m-success: #10b981;
    --m-success-text: #0a8a63;
    --m-warn: #f59e0b;
    --m-danger: #ff2d55;

    --m-r-chip: 11px;
    --m-r-btn: 13px;
    --m-r-input: 16px;
    --m-r-inner: 20px;
    --m-r-card: 26px;
    --m-r-sheet: 30px;

    --m-sh-card: 0 14px 36px rgba(20,70,150,.12);
    --m-sh-card-sm: 0 6px 18px rgba(20,70,150,.10);
    --m-sh-grad-card: 0 18px 40px rgba(43,124,255,.34);
    --m-sh-grad-btn: 0 12px 28px rgba(43,124,255,.38);
    --m-sh-sheet: 0 -18px 50px rgba(11,32,54,.22);
    --m-sh-bottombar: 0 -8px 30px rgba(20,70,150,.08);
```

şununla değiştir (yalnızca listelenen token'lar değişti; `--m-r-inner`, `--m-sh-card-sm`, `--m-sh-grad-btn`, `--m-sh-sheet`, `--m-sh-bottombar`, `--m-success`, `--m-warn`, `--m-danger`, `--m-link` AYNEN kalıyor, spec'in kapsamı dışında):

```css
    --m-mesh:
      radial-gradient(680px 420px at 12% -6%, rgba(43,124,255,.55), transparent 62%),
      radial-gradient(560px 420px at 96% 8%,  rgba(34,211,238,.5), transparent 60%),
      radial-gradient(620px 520px at 78% 96%, rgba(124,58,237,.34), transparent 62%),
      radial-gradient(520px 380px at 4% 86%,  rgba(16,185,129,.16), transparent 60%);

    --m-grad-accent: linear-gradient(135deg, #4f9bff 0%, #1f6feb 46%, #22d3ee 118%);
    --m-grad-btn: linear-gradient(135deg, #4f9bff, #1f6feb 60%, #22d3ee);

    --m-ink: #081729;
    --m-body: #4c5d78;
    --m-on-glass: #12325a;
    --m-link: #1560d0;

    --m-glass-bg: rgba(238,246,255,.58);
    --m-glass-border: rgba(255,255,255,.85);
    --m-glass-blur: blur(42px) saturate(220%);
    --m-fill: rgba(11,32,54,.05);
    --m-divider: rgba(11,32,54,.07);

    --m-success: #10b981;
    --m-success-text: #067a56;
    --m-warn: #f59e0b;
    --m-danger: #ff2d55;

    --m-r-chip: 12px;
    --m-r-btn: 15px;
    --m-r-input: 17px;
    --m-r-inner: 20px;
    --m-r-card: 30px;
    --m-r-sheet: 30px;

    --m-sh-card: 0 22px 52px rgba(20,70,150,.20);
    --m-sh-card-sm: 0 6px 18px rgba(20,70,150,.10);
    --m-sh-grad-card: 0 26px 64px rgba(31,111,235,.46);
    --m-sh-grad-btn: 0 12px 28px rgba(43,124,255,.38);
    --m-sh-sheet: 0 -18px 50px rgba(11,32,54,.22);
    --m-sh-bottombar: 0 -8px 30px rgba(20,70,150,.08);
```

Ayrıca aynı blokta biraz üstte duran `--m-bg: #f7faff;` satırını `--m-bg: #f2f7ff;` yap.

- [ ] **Step 2: `globalsMobile.scope.test.ts`'teki eski değeri pinleyen testi güncelle**

`src/app/globalsMobile.scope.test.ts` içinde `'cam yardimci sinifi mobil blok icinde ve dogru recete'` testinde:

```ts
        // Token'in kendisi tasarim handoff'undaki degeri tasimali.
        expect(inside).toMatch(/--m-glass-blur:\s*blur\(30px\)\s+saturate\(190%\)/)
```

satırını şununla değiştir:

```ts
        // Token'in kendisi tasarim handoff'undaki degeri tasimali (2026-08-04
        // "Derin Cam" B varyanti — lead onayi).
        expect(inside).toMatch(/--m-glass-blur:\s*blur\(42px\)\s+saturate\(220%\)/)
```

- [ ] **Step 3: Yeni B değerlerini doğrulayan test ekle**

Aynı dosyada, `describe('mobil token katmani', ...)` bloğunun İÇİNE, mevcut testlerden birinin ardına ekle:

```ts
    it("B varyanti (2026-08-04): radius ve golge olcegi buyudu", () => {
        const inside = mobileBlock()
        expect(inside).toMatch(/--m-r-card:\s*30px/)
        expect(inside).toMatch(/--m-r-btn:\s*15px/)
        expect(inside).toMatch(/--m-r-input:\s*17px/)
        expect(inside).toMatch(/--m-r-chip:\s*12px/)
        expect(inside).toMatch(/--m-sh-card:\s*0 22px 52px rgba\(20,70,150,\.20\)/)
        expect(inside).toMatch(/--m-ink:\s*#081729/)
        expect(inside).toMatch(/--m-success-text:\s*#067a56/)
    })

    it("B varyanti: r-inner ve bottombar golgesi BILEREK degismedi (spec kapsami disinda)", () => {
        const inside = mobileBlock()
        expect(inside).toMatch(/--m-r-inner:\s*20px/)
        expect(inside).toMatch(/--m-sh-bottombar:\s*0 -8px 30px rgba\(20,70,150,\.08\)/)
    })
```

- [ ] **Step 4: Testleri çalıştır**

Run: `npx jest --no-coverage --roots "<rootDir>/src" --testPathPatterns "globalsMobile"`
Expected: PASS (tüm testler)

- [ ] **Step 5: tsc kontrolü**

Run: `npx tsc --noEmit`
Expected: 0 hata (CSS-only değişiklik, ama diğer dosyalar Task 2-4'te henüz güncellenmediği için bu adımda tsc zaten temiz olmalı — CSS modülleri tsc kapsamında değil).

- [ ] **Step 6: Commit**

```bash
git add src/app/globals.css src/app/globalsMobile.scope.test.ts
git commit -m "feat(mobil): Derin Cam (B) --m-* token'larini uygula (lead onayi)"
```

---

## Task 2: `mobile.module.css` — iki tokenize edilmemiş blur sapmasını düzelt

**Files:**
- Modify: `src/app/hesapla/mobile/mobile.module.css:551-552` (`.stepperAzalt`)
- Modify: `src/app/hesapla/mobile/mobile.module.css:615-616` (`.gelismisAyarlarBtn`)
- Modify: `src/app/hesapla/mobile/mobileStyles.scope.test.ts` (yeni guard testleri)

**Interfaces:**
- Consumes: Task 1'in `--m-glass-blur` token'ı (artık `blur(42px) saturate(220%)`).
- Produces: yok.

**Neden:** Bu iki kural ana cam blur'unu (o zamanki `blur(30px) saturate(190%)` değerini) KOPYALAMIŞ ama token'a bağlamamış — Task 1'den sonra sistemin geri kalanı B'ye geçerken bunlar eski A yoğunluğunda donup kalır.

- [ ] **Step 1: `.stepperAzalt`'ı token'a bağla**

```css
    .stepperAzalt {
        background: rgba(255, 255, 255, .55);
        backdrop-filter: blur(24px) saturate(190%);
        -webkit-backdrop-filter: blur(24px) saturate(190%);
        color: var(--m-on-glass);
    }
```

şununla değiştir:

```css
    .stepperAzalt {
        background: rgba(255, 255, 255, .55);
        backdrop-filter: var(--m-glass-blur);
        -webkit-backdrop-filter: var(--m-glass-blur);
        color: var(--m-on-glass);
    }
```

- [ ] **Step 2: `.gelismisAyarlarBtn`'i token'a bağla**

```css
    .gelismisAyarlarBtn {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        min-height: 44px;
        margin: 0 14px;
        /* 14px'lik yan margin'ler genislikten dusulur. */
        width: calc(100% - 28px);
        border-radius: 17px;
        border: 1px solid rgba(255, 255, 255, .9);
        background: rgba(255, 255, 255, .55);
        backdrop-filter: blur(26px) saturate(180%);
        -webkit-backdrop-filter: blur(26px) saturate(180%);
        box-shadow: 0 8px 24px rgba(20, 70, 150, .1), inset 0 1px 0 rgba(255, 255, 255, .95);
        color: var(--m-on-glass);
        font: 700 12.5px Inter, sans-serif;
        cursor: pointer;
    }
```

şununla değiştir (yalnızca `border-radius` → `var(--m-r-input)` ve `backdrop-filter`/`-webkit-backdrop-filter` → `var(--m-glass-blur)`, geri kalan AYNEN):

```css
    .gelismisAyarlarBtn {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        min-height: 44px;
        margin: 0 14px;
        /* 14px'lik yan margin'ler genislikten dusulur. */
        width: calc(100% - 28px);
        border-radius: var(--m-r-input);
        border: 1px solid rgba(255, 255, 255, .9);
        background: rgba(255, 255, 255, .55);
        backdrop-filter: var(--m-glass-blur);
        -webkit-backdrop-filter: var(--m-glass-blur);
        box-shadow: 0 8px 24px rgba(20, 70, 150, .1), inset 0 1px 0 rgba(255, 255, 255, .95);
        color: var(--m-on-glass);
        font: 700 12.5px Inter, sans-serif;
        cursor: pointer;
    }
```

(`border-radius`'ın da token'a bağlanması: hardcoded `17px` eski `--m-r-input` (16px) ile eşleşmiyordu — bağımsız/elle girilmiş bir değerdi. B'nin `--m-r-input`'u tam olarak `17px` olduğu için bu geçişte görsel fark SIFIR, ama artık gelecekte `--m-r-input` tekrar değişirse bu buton da otomatik izleyecek; ayrı bir değer olarak sürüklenmeyecek.)

- [ ] **Step 3: `mobileStyles.scope.test.ts`'e guard testleri ekle**

`src/app/hesapla/mobile/mobileStyles.scope.test.ts` dosyasını aç, en alttaki `describe` bloğunun içine (veya dosyanın sonuna yeni bir `describe` olarak) ekle:

```ts
describe('Derin Cam (B) — tokenize edilmemis sapmalar duzeltildi (2026-08-04)', () => {
    it('.stepperAzalt artik var(--m-glass-blur) kullaniyor, ham deger yok', () => {
        expect(css).not.toMatch(/blur\(24px\)\s*saturate\(190%\)/)
    })

    it('.gelismisAyarlarBtn artik var(--m-glass-blur) ve var(--m-r-input) kullaniyor, ham deger yok', () => {
        expect(css).not.toMatch(/blur\(26px\)\s*saturate\(180%\)/)
    })

    it('.metrikKutu / .fisButonu BILEREK degismedi — bunlar --m-grad-accent zemini uzerindeki ayri, hafif cam katmani', () => {
        expect(css).toMatch(/blur\(10px\)/)
    })
})
```

Dosyanın en üstünde zaten `const css = readFileSync(join(process.cwd(), CSS_YOLU), 'utf8')` tanımlı (satır 4-5) — yukarıdaki testler bu mevcut `css` değişkenini kullanıyor, yeni bir okuma eklemeye gerek yok.

- [ ] **Step 4: Testleri çalıştır**

Run: `npx jest --no-coverage --roots "<rootDir>/src" --testPathPatterns "mobileStyles"`
Expected: PASS (tüm testler)

- [ ] **Step 5: tsc kontrolü**

Run: `npx tsc --noEmit`
Expected: 0 hata

- [ ] **Step 6: Commit**

```bash
git add src/app/hesapla/mobile/mobile.module.css src/app/hesapla/mobile/mobileStyles.scope.test.ts
git commit -m "refactor(mobil): stepperAzalt/gelismisAyarlarBtn'i --m-glass-blur token'ina bagla"
```

---

## Task 3: `BottomNavbar.module.css` — aynı sapmayı düzelt

**Files:**
- Modify: `src/components/layout/BottomNavbar.module.css:14-19`
- Create: `src/components/layout/BottomNavbar.scope.test.ts` (bu dosya için ilk CSS-kaynak testi — mevcut `BottomNavbar.test.tsx` davranış testi, CSS içeriğini okumuyor)

**Interfaces:**
- Consumes: Task 1'in `--m-glass-blur` token'ı.
- Produces: yok.

**Neden:** Uygulamanın her mobil ekranında görünen alt gezinme çubuğu, ana cam blur'unu (`blur(30px) saturate(190%)`) token'a bağlı olmadan kopyalamış. Task 1'den sonra tek bu bileşen eski yoğunlukta kalırdı.

- [ ] **Step 1: Doğrula**

Run: `grep -n "backdrop-filter" src/components/layout/BottomNavbar.module.css`
Expected: `blur(30px) saturate(190%)` iki satırda (`backdrop-filter` ve `-webkit-backdrop-filter`), `var(--m-glass-blur)` DEĞİL.

- [ ] **Step 2: Token'a bağla**

`src/components/layout/BottomNavbar.module.css` içinde:

```css
    backdrop-filter: blur(30px) saturate(190%);
    -webkit-backdrop-filter: blur(30px) saturate(190%);
```

satırlarını şununla değiştir:

```css
    backdrop-filter: var(--m-glass-blur);
    -webkit-backdrop-filter: var(--m-glass-blur);
```

- [ ] **Step 3: Yazı testi (yeni dosya)**

`src/components/layout/BottomNavbar.scope.test.ts` dosyasını oluştur:

```ts
import { readFileSync } from 'fs'
import { join } from 'path'

const css = readFileSync(join(process.cwd(), 'src/components/layout/BottomNavbar.module.css'), 'utf8')

describe('BottomNavbar — Derin Cam (B) token baglantisi (2026-08-04)', () => {
    it('backdrop-filter artik var(--m-glass-blur) kullaniyor, ham deger yok', () => {
        expect(css).toMatch(/backdrop-filter:\s*var\(--m-glass-blur\)/)
        expect(css).toMatch(/-webkit-backdrop-filter:\s*var\(--m-glass-blur\)/)
        expect(css).not.toMatch(/blur\(30px\)\s*saturate\(190%\)/)
    })

    it('golge hala --m-sh-bottombar kullaniyor (bu token B kapsaminda degismedi)', () => {
        expect(css).toMatch(/box-shadow:\s*var\(--m-sh-bottombar\)/)
    })
})
```

- [ ] **Step 4: Testin geçtiğini doğrula**

Run: `npx jest --no-coverage --roots "<rootDir>/src" --testPathPatterns "BottomNavbar"`
Expected: PASS (yeni scope testi + mevcut `BottomNavbar.test.tsx` davranış testi, ikisi de)

- [ ] **Step 5: tsc kontrolü**

Run: `npx tsc --noEmit`
Expected: 0 hata

- [ ] **Step 6: Commit**

```bash
git add src/components/layout/BottomNavbar.module.css src/components/layout/BottomNavbar.scope.test.ts
git commit -m "refactor(layout): BottomNavbar'i --m-glass-blur token'ina bagla (Derin Cam B)"
```

---

## Task 4: `.mobilCta` — ışık geçişi ekle

**Files:**
- Modify: `src/app/hesapla/mobile/mobile.module.css:732-746` (`.mobilCta`)
- Modify: `src/app/hesapla/mobile/mobileStyles.scope.test.ts` (yeni test)

**Interfaces:**
- Consumes: yok (saf CSS ekleme).
- Produces: yok.

- [ ] **Step 1: `.mobilCta`'ya ışık geçişi ekle**

```css
    .mobilCta {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        width: 100%;
        min-height: 48px;
        border: 0;
        border-radius: var(--m-r-btn);
        background: var(--m-grad-btn);
        box-shadow: var(--m-sh-grad-btn);
        color: #fff;
        font: 800 14px Inter, sans-serif;
        cursor: pointer;
    }
```

şununla değiştir:

```css
    .mobilCta {
        position: relative;
        overflow: hidden;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        width: 100%;
        min-height: 48px;
        border: 0;
        border-radius: var(--m-r-btn);
        background: var(--m-grad-btn);
        box-shadow: var(--m-sh-grad-btn);
        color: #fff;
        font: 800 14px Inter, sans-serif;
        cursor: pointer;
    }

    /* Derin Cam (B) — statik cam-isik gecisi (2026-08-04, lead onayli mockup).
       Hareketsiz: prefers-reduced-motion sorunu yok, cunku zaten animasyon
       yok — yalnizca sabit bir gradyan overlay, cam yuzeyin isigi yansittigi
       hissini veriyor. */
    .mobilCta::after {
        content: "";
        position: absolute;
        inset: 0;
        background: linear-gradient(115deg, transparent 20%, rgba(255,255,255,.35) 35%, transparent 50%);
        pointer-events: none;
    }
```

- [ ] **Step 2: Yazı testi**

`src/app/hesapla/mobile/mobileStyles.scope.test.ts` içindeki B varyantı `describe` bloğuna ekle:

```ts
    it('.mobilCta isik gecisi aldi (::after overlay)', () => {
        expect(css).toMatch(/\.mobilCta::after\s*\{/)
        expect(css).toMatch(/\.mobilCta\s*\{[^}]*position:\s*relative/)
        expect(css).toMatch(/\.mobilCta\s*\{[^}]*overflow:\s*hidden/)
    })
```

- [ ] **Step 3: Testin geçtiğini doğrula**

Run: `npx jest --no-coverage --roots "<rootDir>/src" --testPathPatterns "mobileStyles"`
Expected: PASS (tüm testler, Task 2'nin testleri dahil)

- [ ] **Step 4: tsc kontrolü**

Run: `npx tsc --noEmit`
Expected: 0 hata

- [ ] **Step 5: Commit**

```bash
git add src/app/hesapla/mobile/mobile.module.css src/app/hesapla/mobile/mobileStyles.scope.test.ts
git commit -m "feat(mobil): .mobilCta'ya Derin Cam isik gecisi ekle"
```

---

## Task 5: Tam doğrulama

**Files:** yok (yalnızca doğrulama).

- [ ] **Step 1: Tam tsc**

Run: `npx tsc --noEmit`
Expected: 0 hata

- [ ] **Step 2: Tam jest**

Run: `npx jest --no-coverage --roots "<rootDir>/src"`
Expected: tüm suite'ler PASS

- [ ] **Step 3: eslint**

Run: `npx eslint src --ext .ts,.tsx`
Expected: mevcut baseline'a eşit veya daha az (bu CSS-only bir değişiklik, eslint'i etkilememesi beklenir)

- [ ] **Step 4: build**

Run: `npm run build`
Expected: başarılı

- [ ] **Step 5: Görsel doğrulama notu**

Bu plan yalnızca CSS token değerlerini değiştiriyor; jest suite'i içerik varlığını doğruluyor, gerçek render sonucunu değil. Tüm task'lar bittikten sonra `npm run dev` ile `/hesapla`'yı gerçek bir mobil viewport'ta (375×812 gibi) açıp:
- Cam kartların gözle görülür şekilde daha derin/doygun olduğunu,
- Köşelerin daha yuvarlak olduğunu,
- "Özet Rapor Oluştur" butonunda çapraz ışık şeridinin göründüğünü,
- Alt gezinme çubuğunun diğer kartlarla aynı yoğunlukta cam olduğunu

gözle doğrula. Bu adım otomatik test kapsamı dışında, insan onayı gerektiriyor.

