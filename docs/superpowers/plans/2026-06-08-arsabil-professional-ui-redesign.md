# ArsaBil Profesyonel UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ArsaBil'in mevcut sayfalarini Zillow/Redfin/Idealista referansli, daha profesyonel bir gayrimenkul urunu diline tasimak: guven laciverti + terracotta aksan, daha net tipografi hiyerarsisi, token tabanli spacing/shadow/radius ve sayfa bazli CSS module yenilemeleri.

**Architecture:** Once global token sistemi genisletilir; sonra sayfa CSS module'leri kucuk, bagimsiz paketler halinde yenilenir. JSX/TypeScript davranisi yalnizca gercekten gerekli oldugunda degisir (auth sayfalarinda CSS module baglamak gibi). Inline SVG/ikon temizligi gerekiyorsa mevcut `src/components/icons` seti veya yerel ikon deseni kullanilir; emoji kullanimi kaldirilir.

**Tech Stack:** Next.js 16 App Router, React 19, CSS Modules, TypeScript, Jest scope tests, Playwright visual smoke.

## Global Constraints

- API, Prisma, hesap motoru ve kullanici akislari degismez; bu plan gorunus ve CSS mimarisi planidir.
- Masaustu ve mobil breakpoint davranislari korunur; mobil yapisal refactor planlariyla cakisan alanlarda bu plan yalnizca token/gorsel katmani uygular.
- Yeni bir tema sistemi icat edilmez; mevcut 2 tema yapisi korunur.
- Yeni inline `style={{...}}` yazilmaz. Dinamik renk/oran gerekiyorsa CSS custom property istisnasi kullanilir.
- Emoji ikonlari kaldirilir; cizgi ikon/SVG kullanilir.
- Letter-spacing token'lari tanimlanabilir ama yeni UI elemanlarinda negatif tracking'e yaslanilmaz; mevcut tasarim geregi hero/H1 farklari local ve testlenmis kalir.
- Her task sonunda ilgili Jest + `npx tsc --noEmit`; faz sonunda Playwright 1440x900 ve 390x844 smoke.

---

## Dosya Yapisi

- **Modify/Test:** `src/app/globals.css`, `src/app/pageStyles.scope.test.ts` veya yeni `src/app/professionalTheme.scope.test.ts`
- **Modify/Test:** `src/app/page.module.css`, `src/app/pageStyles.scope.test.ts`
- **Modify/Test:** `src/app/marketplace/page.module.css`, `src/app/marketplace/pageStyles.scope.test.ts`
- **Modify/Test:** `src/components/marketplace/ListingCard.module.css`, mevcut ListingCard testleri
- **Modify/Test:** `src/app/hesapla/page.module.css`, `src/app/hesapla/pageStyles.scope.test.ts`
- **Modify/Test:** `src/app/dashboard/dashboard.module.css`, `src/app/dashboard/dashboardStyles.scope.test.ts`
- **Modify/Test:** `src/app/login/page.tsx`, `src/app/login/login.module.css`, `src/app/login/login.scope.test.ts`
- **Modify/Test:** `src/app/register/page.tsx`, `src/app/register/register.module.css`, `src/app/register/register.scope.test.ts`
- **Modify/Test:** `src/app/admin/admin.module.css`, `src/app/admin/admin.scope.test.ts`
- **Modify (olasi):** `src/components/layout/Navbar.module.css`, `src/components/layout/Navbar.tsx`

---

### Task 1: Global profesyonel token katmani

**Files:**
- Modify: `src/app/globals.css`
- Test: `src/app/professionalTheme.scope.test.ts`

**Interfaces:**
- Produces: `--accent`, `--accent-2`, `--topbar-height`, `--shadow-xl`, `--shadow-hover`, `--space-1..9`, `--font-display`, `--font-strong`, `--font-medium`, `--leading-*`, `--tracking-*`.
- Preserves: mevcut `--primary`, `--primary-rgb`, `--panel`, `--border`, `--hero-bg`, `--shadow2` compat token'lari.

- [x] **Step 1: Basarisiz scope testini yaz**

`src/app/professionalTheme.scope.test.ts`:

```ts
import { readFileSync } from 'fs'
import { join } from 'path'

const css = readFileSync(join(process.cwd(), 'src/app/globals.css'), 'utf8')

describe('profesyonel tema tokenlari', () => {
  it('light ve dark temalarda accent tokenlari var', () => {
    expect(css).toMatch(/\[data-theme="light"\][\s\S]*--accent\s*:/)
    expect(css).toMatch(/\[data-theme="dark"\][\s\S]*--accent\s*:/)
    expect(css).toMatch(/--accent-2\s*:/)
  })

  it('spacing, shadow ve typography tokenlari tanimli', () => {
    for (const token of ['--space-1', '--space-5', '--space-9', '--shadow-xl', '--shadow-hover', '--font-display', '--leading-normal', '--tracking-normal']) {
      expect(css).toContain(token)
    }
  })

  it('compat tokenlari korunur', () => {
    for (const token of ['--primary', '--primary-rgb', '--panel', '--border', '--shadow2']) {
      expect(css).toContain(token)
    }
  })
})
```

Run: `npx jest src/app/professionalTheme.scope.test.ts`
Expected: FAIL.

- [x] **Step 2: `globals.css` tokenlarini genislet**

Mevcut tema bloklarini tamamen silmek yerine, light/dark tema icinde eksik tokenlari ekle:
- light: `--accent: #c8845a`, `--accent-2: #b5714a`, `--bg-body` krem-kirik beyaz varyanti, `--primary` guven laciverti kullanimi.
- dark: `--accent: #e09070`, `--accent-2: #d07f60`, koyu lacivert yuzeyler.
- spacing scale: `--space-1` ... `--space-9`.
- typography: `--font-display`, `--font-strong`, `--font-medium`, `--font-normal`, `--leading-tight`, `--leading-normal`, `--leading-relaxed`, `--tracking-normal`, `--tracking-wide`.
- shadow: `--shadow-xl`, `--shadow-hover`.

Mevcut mobil `--m-*`, `--seal-*`, PWA ve animation token'lari silinmez.

- [x] **Step 3: Dogrulama**

Run:

```bash
npx jest src/app/professionalTheme.scope.test.ts
npx tsc --noEmit
```

- [x] **Step 4: Commit**

```bash
git add src/app/globals.css src/app/professionalTheme.scope.test.ts
git commit -m "feat(ui): profesyonel tema tokenlari eklendi"
```

---

### Task 2: Anasayfa CSS yenilemesi

**Files:**
- Modify: `src/app/page.module.css`
- Test: `src/app/pageStyles.scope.test.ts`

**Interfaces:**
- Consumes: Task 1 tokenlari.
- Produces: profesyonel hero, feature card, vision/mission, blog ve CTA stilleri.

- [x] **Step 1: Basarisiz CSS scope testlerini ekle**

`src/app/pageStyles.scope.test.ts` icine:
- hero zemini `var(--bg-body)` kullanir.
- ana CTA `var(--primary)` veya `var(--hero-bg)` kullanir.
- ikincil CTA `var(--primary)` border kullanir.
- feature kartlarda sol aksan cizgisi `var(--primary)`.
- CTA section terracotta aksan butonu `var(--accent)` kullanir.

Run: `npx jest src/app/pageStyles.scope.test.ts`
Expected: FAIL.

- [x] **Step 2: Hero ve CTA stillerini yenile**

`page.module.css` icinde:
- hero arka plani krem/kirik beyaz `var(--bg-body)`.
- hero baslik daha guclu; destek metni daha sakin.
- primary button lacivert, secondary button lacivert border.
- terracotta yalnizca vurgu ve CTA aksaninda.

- [x] **Step 3: Feature/blog/vision kartlarini yenile**

- Feature kartlar: yatay ikon + metin, sol `3px` primary aksan, hover `--shadow-hover`.
- Vision/mission: sol `4px` accent border.
- Blog kartlari: kategori/date aksanlari `--accent`; emoji placeholder varsa cizgi ikon veya gorsel pattern.

- [x] **Step 4: Dogrulama ve commit**

Run:

```bash
npx jest src/app/pageStyles.scope.test.ts
npx jest src/app/pageStyles.scope.test.ts src/app/professionalTheme.scope.test.ts
npx tsc --noEmit
```

```bash
git add src/app/page.module.css src/app/pageStyles.scope.test.ts
git commit -m "feat(ui): anasayfa profesyonel gayrimenkul diline tasindi"
```

---

### Task 3: Marketplace ve ListingCard gorsel yenilemesi

**Files:**
- Modify: `src/app/marketplace/page.module.css`
- Modify: `src/components/marketplace/ListingCard.module.css`
- Test: `src/app/marketplace/pageStyles.scope.test.ts`
- Test: mevcut `src/components/marketplace/*ListingCard*.test.tsx`

**Interfaces:**
- Consumes: `--accent`, `--primary`, `--shadow-hover`, `--radius-*`.
- Preserves: filtre davranisi, harita/list toggle, ListingCard props.

- [x] **Step 1: Basarisiz CSS testlerini yaz**

`src/app/marketplace/pageStyles.scope.test.ts` icine:
- filtre bar/panel radius token kullanir.
- filtre CTA `var(--accent)` kullanir.
- map panel border/radius token kullanir.

`ListingCard.module.css` icin mevcut scope test yoksa `ListingCard.scope.test.ts` genislet:
- fiyat metni `var(--primary)` kullanir.
- hover `--shadow-hover`.
- favori butonu foto uzerinde cam/pill yuzey kullanir.

- [x] **Step 2: Marketplace sayfa CSS'ini yenile**

- Filter bar daha kompakt, pill hissi, label'lar uppercase/small.
- `filterBtn` terracotta `var(--accent)`.
- Map panel radius ve border tutarli.
- Empty state lacivert ikon + sakin metin.

- [x] **Step 3: ListingCard CSS'ini yenile**

- Foto alanini sabit orana al; kart icinde fiyat birinci hiyerarsi.
- Konum satiri muted + pin ikon icin yer.
- Status badge: yesil nokta + "Aktif".
- Hover: `translateY(-4px)` + `--shadow-hover`; reduced motion guard varsa korunur.

- [x] **Step 4: Dogrulama ve commit**

Run:

```bash
npx jest src/app/marketplace src/components/marketplace
npx tsc --noEmit
```

```bash
git add src/app/marketplace/page.module.css src/app/marketplace/pageStyles.scope.test.ts src/components/marketplace
git commit -m "feat(ui): marketplace ve ilan kartlari profesyonel dile tasindi"
```

---

### Task 4: Hesapla ekraninin profesyonel kart dili

**Files:**
- Modify: `src/app/hesapla/page.module.css`
- Test: `src/app/hesapla/pageStyles.scope.test.ts`

**Interfaces:**
- Preserves: `page.tsx`, hesap motoru, form davranislari.
- Consumes: `--primary`, `--hero-bg`, `--shadow-hover`, `--accent` yalnizca ikincil vurgu.

- [x] **Step 1: Basarisiz CSS testlerini ekle**

Test beklentileri:
- `blueBox`/sonuc hero `--hero-bg` kullanir.
- `primaryActionBtn` `var(--primary)`/`var(--primary-2)` gradient kullanir.
- slider fill/thumb primary token kullanir.
- panel/card hover `--shadow-hover` kullanir.
- drawer header primary border-left kullanir.

- [x] **Step 2: Sol panel ve sonuc kartlarini yenile**

- Panel basliklarinda sol aksan.
- Stat/value metinleri daha guclu, tabular nums korunur.
- Slider yuzeyleri token tabanli.

- [x] **Step 3: Drawer ve aksiyon butonlarini yenile**

- Drawer header lacivert aksan.
- Primary action lacivert gradient; secondary daha sakin border.
- Mobil 07-28 premium liquid glass kurallariyla cakisan `@media (max-width:768px)` bloklarina dokunma; gerekiyorsa yalnizca desktop/default kurallari guncelle.

- [x] **Step 4: Dogrulama ve commit**

Run:

```bash
npx jest src/app/hesapla/pageStyles.scope.test.ts src/app/hesapla/page.test.tsx
npx tsc --noEmit
```

```bash
git add src/app/hesapla/page.module.css src/app/hesapla/pageStyles.scope.test.ts
git commit -m "feat(ui): hesapla kart dili profesyonel tokenlara tasindi"
```

---

### Task 5: Dashboard ve profil formlari

**Files:**
- Modify: `src/app/dashboard/dashboard.module.css`
- Modify: `src/app/dashboard/page.module.css` (varsa ilgili dashboard home stilleri)
- Modify: `src/app/dashboard/profile/profile.module.css`
- Test: `src/app/dashboard/dashboardStyles.scope.test.ts`
- Test: `src/app/dashboard/profile/profileStyles.scope.test.ts`

**Interfaces:**
- Preserves: dashboard route'lari ve data fetch davranisi.

- [x] **Step 1: Scope testlerini ekle/guncelle**

- Aktif nav item primary border-left kullanir.
- Stat box top border primary kullanir.
- Section title left border primary kullanir.
- Form input height `48px` veya token kullanir.

- [x] **Step 2: Dashboard shell'i yenile**

- Sidebar `var(--bg-body)`.
- Aktif nav lacivert sol aksan.
- Stat box ust aksan cizgisi.
- Rapor/teklif satirlari hover shadow ve muted metin dengesi.

- [x] **Step 3: Profil formunu yenile**

- Input height 48px.
- Focus state primary border + focus shadow.
- Butonlar primary/accent hiyerarsisine uygun.

- [x] **Step 4: Dogrulama ve commit**

Run:

```bash
npx jest src/app/dashboard
npx tsc --noEmit
```

```bash
git add src/app/dashboard
git commit -m "feat(ui): dashboard ve profil formlari profesyonel dile tasindi"
```

---

### Task 6: Auth sayfalari split layout

**Files:**
- Modify: `src/app/login/page.tsx`
- Modify: `src/app/login/login.module.css`
- Modify: `src/app/register/page.tsx`
- Modify: `src/app/register/register.module.css`
- Test: `src/app/login/login.scope.test.ts`
- Test: `src/app/register/register.scope.test.ts`

**Interfaces:**
- Preserves: auth form submit, validation, route behavior.
- Produces: desktop split layout; mobile tek kolon.

- [x] **Step 1: Basarisiz scope testlerini yaz**

Login/register CSS icin:
- desktop split panel class'i vardir.
- sol brand panel `var(--primary)` kullanir.
- sag form panel `var(--bg-body)` kullanir.
- mobile media query tek kolon yapar.
- inputlar mobilde `font-size:16px` ve `min-height:48px`.

- [x] **Step 2: JSX'i class tabanli hale getir**

Mevcut inline stiller varsa CSS module class'larina tasinir:
- `authShell`
- `brandPanel`
- `brandLogo`
- `brandBullets`
- `formPanel`
- `formCard`

Form elementleri ve event handler'lar degismez.

- [x] **Step 3: CSS'i uygula**

Desktop:

```text
[Sol Panel 42% primary] [Sag Panel 58% bg-body]
```

Mobile:
- tek kolon
- brand panel kompakt ust blok veya gizli degil, kisa kimlik sinyali olarak kalir.
- CTA ve inputlar 48px.

- [x] **Step 4: Dogrulama ve commit**

Run:

```bash
npx jest src/app/login src/app/register
npx tsc --noEmit
```

```bash
git add src/app/login src/app/register
git commit -m "feat(ui): auth sayfalari split profesyonel layouta tasindi"
```

---

### Task 7: Admin panel gorsel tutarlilik

**Files:**
- Modify: `src/app/admin/admin.module.css`
- Modify (olasi): `src/app/admin/*/*.module.css`
- Test: `src/app/admin/admin.scope.test.ts`
- Test: mevcut admin sayfa testleri

**Interfaces:**
- Preserves: admin CRUD behavior.

- [x] **Step 1: Scope testlerini ekle**

- Admin header border-bottom primary.
- Status badge tokenlari pending/approved/rejected icin primary/green/red.
- Table hover `var(--panel-2)`.
- Admin nav/dashboard kartlari radius/shadow token kullanir.

- [x] **Step 2: Admin shell'i yenile**

- Dashboard ile ayni token sistemi.
- Tablo satirlari sakin hover.
- Status badge'leri daha net semantic renklerde.
- Admin ana sayfa navigasyon kartlari tek tip.

- [x] **Step 3: Alt admin sayfalarini hizala**

`district-prices`, `users`, `listings`, `offers`, `settings`, `analytics` CSS module'lerinde ortak table/card/button hiyerarsisini tokenlara cek. Mobil DataCard planlariyla cakisan yapisal degisikliklere girme.

- [x] **Step 4: Dogrulama ve commit**

Run:

```bash
npx jest src/app/admin
npx tsc --noEmit
```

```bash
git add src/app/admin
git commit -m "feat(ui): admin panel profesyonel token sistemine hizalandi"
```

---

### Task 8: Navbar ve final gorsel denetim

**Files:**
- Modify (olasi): `src/components/layout/Navbar.module.css`
- Modify (olasi): `src/components/layout/Navbar.tsx`
- Test: `src/components/layout/__tests__/SiteChrome.test.tsx`, `src/components/layout/__tests__/AdminTopBar.test.tsx`

**Interfaces:**
- Preserves: auth/nav links, ThemeToggle.

- [x] **Step 1: Navbar CSS'ini hizala**

- `--topbar-height: 64px`.
- Logo primary.
- Active nav link primary + bottom border.
- CTA varsa accent.
- ThemeToggle mevcut 2 tema davranisini korur.

- [x] **Step 2: Playwright smoke**

Dev server:

```bash
npm run dev
```

Playwright:
- 1440x900: `/`, `/marketplace`, `/hesapla`, `/login`, `/register`, `/admin`
- 390x844: ayni sayfalarda yatay tasma yok.
- Light/dark toggle: refresh sonrasi tema korunur, anti-flash gozle kontrol edilir.

- [x] **Step 3: Tam dogrulama**

Run:

```bash
npx tsc --noEmit
npx jest
npm run build
```

- [x] **Step 4: Final commit (yalnizca navbar/final duzeltme olduysa)**

```bash
git add src/components/layout src/app
git commit -m "fix(ui): profesyonel redesign final gorsel denetim duzeltmeleri"
```

---

## Final Dogrulama

- `npx tsc --noEmit` -> 0 hata. (2026-08-15 PASS)
- `npx jest` -> tum suite yesil. (2026-08-15 PASS: 143 suite, 1227 test)
- `npm run build` -> basarili. (2026-08-15 PASS)
- Playwright 1440x900 ve 390x844: anasayfa, marketplace, hesapla, dashboard/auth/admin yuzeylerinde yatay tasma yok. (2026-08-15 PASS: `/`, `/marketplace`, `/hesapla`, `/login`, `/register`, `/admin`)
- Dark/light tema: localStorage persistans ve anti-flash script korunur. (2026-08-15 PASS: localStorage `theme=dark` refresh sonrasi korundu)
- Yeni inline style yok; mevcut inline style sayisi dokunulan sayfalarda azalir.

## Commit Kaydi

- Kod commitleri: c0fe45b (feat: add land cost model and professional UI refresh).
- Dokumantasyon commitleri: ec84ab4 (docs: archive execution plans and validation runbooks).

