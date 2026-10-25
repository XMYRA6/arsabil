# Premium Gezinme Hissi Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** iOS'ta akıcılığı bozmadan tüm sayfalarda gezinirken premium his: sayfa girişi fade'i, yükleme iskeletleri, alt çubukta kayan gösterge, basma geri bildirimi.

**Architecture:** Saf CSS + küçük istemci bileşenleri; yeni kütüphane yok. `app/template.tsx` yalnız `{children}`'ı sarıp rota değişiminde opacity fade'i oynatır (ilk yüklemede oynamaz). Basma efekti global bir `[data-press]` yardımcısıyla opt-in. Alt çubuk göstergesi saf bir konum fonksiyonu + `transform: translateX`.

**Tech Stack:** Next 16 App Router, React 19.2, CSS modules + `globals.css` tokenları, jest + RTL (`/** @jest-environment jsdom */` pragma).

**Spec:** `docs/superpowers/specs/2026-10-25-premium-gezinme-hissi-design.md` (içindeki "Builder-check sonrası kararlar" bölümü bağlayıcı)

Test komutu: `npx jest <yol>`; tip: `npx tsc --noEmit`; lint: `npx eslint <yol>`.

## Global Constraints

- Yalnız `opacity` ve `transform` animasyonu; `filter`, `backdrop-filter` animasyonu, büyük gölge animasyonu, layout animasyonu YOK.
- Sayfa girişi: ≈240 ms, `var(--ease-out)`, yalnız opacity, `animation-fill-mode: backwards`, `will-change` YOK; ilk yüklemede (ilk mount) oynamaz.
- Kayan gösterge ≈320 ms `var(--ease-out)`; basma `scale(0.97)` ≈120 ms.
- "Hareketi azalt" (`prefers-reduced-motion: reduce`) açıkken bu işte eklenen HİÇBİR hareket çalışmaz.
- Titreşim, çıkış animasyonu, View Transitions, yeni animasyon kütüphanesi YOK. Mevcut framer-motion bileşenleri (BottomSheet vb.) değişmez.
- `toolRegistry`/Akif/WhatsApp dosyalarına dokunulmaz (bu iş yalnız UI).
- Test-first; her task sonunda commit; commit mesajı sonuna `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.
- Çalışma ağacında ilgisiz commit'siz dosyalar var (`design/**`, `chain.*`, `pics/**` vb.): yalnız kendi dosyalarını `git add <yol>` ile ekle, `git add -A` KULLANMA.

## Review Focus

- Alt çubukta hiçbir sekme aktif değilken (`/studio`, `/listing/..` gibi) gösterge gizli kalır, sekme kaymaz (Task 4).
- Sunucu/ilk render'da statik `.active` arka planı görünür; ölçüm sonrası gösterge devralınca çift arka plan veya sıçrama olmaz (Task 4).
- İlk yüklemede `template` animasyon sınıfı eklemez ve hydration uyarısı çıkmaz; ikinci mount'ta eklenir (Task 2).
- `prefers-reduced-motion` açıkken sayfa girişi, iskelet parıltısı, gösterge ve basma efekti kapanır (Task 1-4).
- Basma efekti girdilere/harita kontrollerine/BottomSheet tutacağına uygulanmaz; yalnız opt-in öğelerde (Task 5).

---

### Task 1: Hareket temeli (token, basma yardımcısı, reduced-motion, touch)

**Files:**
- Modify: `src/app/globals.css` (token'ların yanına + sonuna)
- Create: `src/components/ui/TouchActiveInit.tsx`
- Modify: `src/app/layout.tsx` (TouchActiveInit'i `<body>` içine ekle)
- Test: `src/app/globalsMotion.scope.test.ts`, `src/components/ui/__tests__/TouchActiveInit.test.tsx`

**Interfaces:**
- Produces: token `--dur-enter: 240ms`, `--dur-indicator: 320ms`, `--dur-press: 120ms`; global kural `[data-press]:active { transform: scale(0.97) }` (`transition: transform var(--dur-press) var(--ease-out)` ile); `@media (prefers-reduced-motion: reduce) { [data-press], [data-press]:active { transition: none; transform: none } }`; `export function TouchActiveInit(): null` (mount'ta `document.body`'ye pasif boş `touchstart` dinleyicisi ekler, unmount'ta kaldırır).

- [ ] **Step 1: Write the failing tests** — `globalsMotion.scope.test.ts` (mevcut `globalsMobile.scope.test.ts` örneği gibi `globals.css`'i okur): `defines motion duration tokens` (üç token adı), `defines [data-press]:active scale(0.97) rule`, `disables [data-press] motion under prefers-reduced-motion`. `TouchActiveInit.test.tsx` (jsdom): `adds a passive touchstart listener to body on mount` (`addEventListener` spy: `('touchstart', fn, { passive: true })`), `removes it on unmount`.
- [ ] **Step 2: Run** `npx jest src/app/globalsMotion.scope.test.ts src/components/ui/__tests__/TouchActiveInit.test.tsx` → FAIL.
- [ ] **Step 3: Implement** yukarıdaki imzalar/değerler; `layout.tsx`'te `<TemaKoru />` yanına `<TouchActiveInit />`.
- [ ] **Step 4: Run** testler + `npx tsc --noEmit` → PASS.
- [ ] **Step 5: Commit** — `feat(ui): hareket tokenları, basma yardımcısı ve iOS :active desteği`

---

### Task 2: Sayfa girişi fade'i (`template.tsx`)

**Files:**
- Create: `src/app/template.tsx`, `src/components/layout/SayfaGirisi.tsx`, `src/components/layout/SayfaGirisi.module.css`
- Test: `src/components/layout/__tests__/SayfaGirisi.test.tsx`

**Interfaces:**
- Consumes: token `--dur-enter` (Task 1).
- Produces: `export function SayfaGirisi({ children }: { children: React.ReactNode }): JSX.Element` — çocukları `<div className={styles.giris}>` ile sarar; animasyon sınıfı (`styles.oynat`) yalnız modül düzeyindeki "ilk mount geçti" bayrağı true iken eklenir; bayrak ilk mount'un `useEffect`'inde true yapılır. `template.tsx` varsayılan export: `<SayfaGirisi>{children}</SayfaGirisi>`. CSS: `.oynat { animation: sayfaGiris var(--dur-enter) var(--ease-out) backwards }`, `@keyframes sayfaGiris { from { opacity: 0 } to { opacity: 1 } }`, reduced-motion'da `.oynat { animation: none }`. `will-change` ve `transform` YOK.

- [ ] **Step 1: Write the failing tests** (jsdom): `first mount does not add the animation class`; `a later mount (after the first one mounted) adds the animation class` (ilk bileşeni render+unmount et, ikincisini render et, `className` `oynat` içerir); `renders children`. Test dosyası bayrağı sıfırlamak için `jest.isolateModules`/modül yeniden yükleme kullanır. CSS testi: `SayfaGirisi.module.css` dosyasında `prefers-reduced-motion` kuralı ve `will-change` yokluğu (`fs.readFileSync` ile).
- [ ] **Step 2: Run** `npx jest src/components/layout/__tests__/SayfaGirisi.test.tsx` → FAIL.
- [ ] **Step 3: Implement** yukarıdaki imzalarla; hydration uyuşmazlığı olmaması için sınıf kararı yalnız istemci state başlangıcından (modül bayrağı) gelir; sunucuda bayrak her zaman false.
- [ ] **Step 4: Run** testler + `npx tsc --noEmit` → PASS.
- [ ] **Step 5: Commit** — `feat(ui): rota değişiminde yumuşak sayfa girişi`

---

### Task 3: Yükleme iskeletleri

**Files:**
- Create: `src/components/ui/SayfaIskeleti.tsx`, `src/components/ui/SayfaIskeleti.module.css`
- Create: `src/app/arsa-fiyatlari/loading.tsx`, `src/app/profile/[userId]/loading.tsx`, `src/app/compare/[token]/loading.tsx`, `src/app/studio/share/[token]/loading.tsx`
- Test: `src/components/ui/__tests__/SayfaIskeleti.test.tsx`

**Interfaces:**
- Produces: `export type IskeletVaryant = 'liste' | 'detay' | 'panel'`; `export function SayfaIskeleti({ varyant }: { varyant: IskeletVaryant }): JSX.Element` — kök `<div role="status" aria-busy="true" aria-label="Yükleniyor">` (görünmeyen `Yükleniyor…` metni), varyanta göre blok sayısı/düzeni (`liste`: başlık + 6 kart ızgarası; `detay`: görsel + başlık + paragraf blokları; `panel`: başlık + 3 form/panel bloğu). Parıltı: blok içinde `::after` sözde-elemanı `transform: translateX(-100%)→translateX(100%)` animasyonu; reduced-motion'da animasyon yok. Tüm `loading.tsx` dosyaları varsayılan export olarak uygun varyantla `SayfaIskeleti` döner (`arsa-fiyatlari`: `liste`, `profile`: `detay`, `compare`: `detay`, `studio/share`: `detay`).
- **Ruling (kapsam):** 33 sayfa istemci bileşeni (veriyi `useEffect`'te çeker) ve suspend edemez; `loading.tsx` yalnız sunucu (async) segmentlerde işe yarar, bu yüzden liste yukarıdaki dört segmentle sınırlı. `arsa-fiyatlari/**` sayfaları `force-dynamic` olduğundan iskeletten en çok onlar yararlanır.

- [ ] **Step 1: Write the failing tests** (jsdom): `renders role=status with aria-busy and an accessible label` (3 varyant için); `liste variant renders six card blocks` (`data-testid="iskelet-blok"` sayısı); `each loading.tsx default export renders SayfaIskeleti` (dört dosya import edilip render edilir); CSS dosyası okunup `prefers-reduced-motion` kuralı ve `translateX` içerdiği, `background-position` animasyonu içermediği doğrulanır.
- [ ] **Step 2: Run** `npx jest src/components/ui/__tests__/SayfaIskeleti.test.tsx` → FAIL.
- [ ] **Step 3: Implement** yukarıdaki imzalarla; renkler mevcut tokenlardan (`--surface-2`, `--line`).
- [ ] **Step 4: Run** testler + `npx tsc --noEmit` + `npx eslint src/components/ui src/app/arsa-fiyatlari/loading.tsx` → PASS.
- [ ] **Step 5: Commit** — `feat(ui): sunucu rotaları için yükleme iskeletleri`

---

### Task 4: Alt çubukta kayan gösterge

**Files:**
- Create: `src/components/layout/tabIndicator.ts` (saf fonksiyon)
- Modify: `src/components/layout/TabBar.tsx` (istemci bileşeni olur), `src/components/layout/TabBar.module.css`
- Test: `src/components/layout/__tests__/tabIndicator.test.ts`, `src/components/layout/__tests__/TabBar.test.tsx`

**Interfaces:**
- Consumes: token `--dur-indicator` (Task 1).
- Produces: `export interface TabRect { left: number; width: number }`; `export function hesaplaGosterge(rects: TabRect[], aktifIndex: number): { x: number; width: number } | null` — `aktifIndex < 0` veya `rects[aktifIndex]` yoksa `null`, aksi halde `{ x: rects[aktifIndex].left, width: rects[aktifIndex].width }`. `TabBar` (`'use client'`): mevcut `TabBarProps` ve çıktı yapısı korunur; `<nav>` içine `aria-hidden` bir `<span className={styles.gosterge}>` eklenir; sekmelerin `offsetLeft/offsetWidth` değerleri `useLayoutEffect` + `ResizeObserver` (yoksa `window.resize`) ile ölçülür; gösterge `style={{ transform: translateX(x px), width }}` alır. Ölçüm tamamlanana kadar (ve ölçüm hiç olmazsa) aktif sekme statik `.active` arka planıyla çizilir; ölçüm tamamlanınca `<nav data-gosterge="hazir">` olur ve CSS `[data-gosterge="hazir"] .tab.active { background-color: transparent }` ile statik arka plan kapanır. Aktif sekme yoksa gösterge `opacity: 0`. CSS: `.gosterge { transition: transform var(--dur-indicator) var(--ease-out), width var(--dur-indicator) var(--ease-out), opacity var(--dur-ui) var(--ease-out) }`; reduced-motion'da `transition: none`. Mevcut `aria-current`, `.dot`, `srOnly` davranışı değişmez.

- [ ] **Step 1: Write the failing tests** — `tabIndicator.test.ts`: `returns null when no tab is active (-1)`; `returns null when index is out of range`; `returns x and width of the active tab`. `TabBar.test.tsx` (jsdom; `offsetLeft/offsetWidth` `Object.defineProperty` ile sahte): `marks the active tab with aria-current`; `renders the indicator element`; `indicator is hidden (opacity 0) when no tab is active` (`/studio` gibi aktif olmayan href); `static active class is kept before measurement` (ilk render'da aktif link `active` sınıfında); `sets data-gosterge="hazir" after measuring`; `dot and unread label still render`.
- [ ] **Step 2: Run** `npx jest src/components/layout/__tests__/tabIndicator.test.ts src/components/layout/__tests__/TabBar.test.tsx` → FAIL.
- [ ] **Step 3: Implement** yukarıdaki imzalar ve CSS; SSR güvenliği için `useLayoutEffect` yerine isomorphic effect kullan (sunucuda uyarı çıkmasın).
- [ ] **Step 4: Run** testler + `npx tsc --noEmit` + `npx jest src/components/layout` (mevcut scope testi geçsin) → PASS.
- [ ] **Step 5: Commit** — `feat(ui): alt gezinme çubuğunda kayan aktif gösterge`

---

### Task 5: Basma geri bildirimi (opt-in)

**Files:**
- Modify: `src/components/layout/TabBar.tsx`, `src/components/ui/Button.tsx`, `src/components/ui/Chip.tsx`, `src/components/ui/SegmentedControl.tsx`, `src/components/mobile/DataCard.tsx`, `src/components/mobile/SegmentedTabs.tsx`, `src/components/marketplace/ListingCard.tsx`, `src/app/profile/[userId]/IlanKarti.tsx`
- Test: ilgili mevcut test dosyalarına ekleme; yoksa `src/components/ui/__tests__/pressable.test.tsx`

**Interfaces:**
- Consumes: global `[data-press]` kuralı (Task 1).
- Produces: yukarıdaki bileşenlerin tıklanabilir kök/etkileşimli öğelerinde `data-press` özniteliği (değeri boş string). `Button` için `disabled` iken öznitelik eklenmez. Girdiler (`Input`, `RangeSlider`, `Toggle`), harita kontrolleri ve `BottomSheet` tutacağına EKLENMEZ.

- [ ] **Step 1: Write the failing tests** (jsdom): `Button has data-press and omits it when disabled`; `Chip, SegmentedControl option, SegmentedTabs tab have data-press`; `DataCard link has data-press when href is given`; `TabBar links have data-press`; `ListingCard and IlanKarti link have data-press`; `Input does not have data-press`.
- [ ] **Step 2: Run** ilgili testler → FAIL.
- [ ] **Step 3: Implement** `data-press=""` eklemeleri (mevcut sınıf/davranış değişmez).
- [ ] **Step 4: Run** `npx jest src/components` + `npx tsc --noEmit` → PASS.
- [ ] **Step 5: Commit** — `feat(ui): etkileşimli öğelerde basma geri bildirimi`

---

### Task 6: Cloudinary fotoğraflarında `next/image`

**Files:**
- Modify: `src/app/dashboard/favorites/page.tsx`, `src/app/dashboard/listings/page.tsx` (ve kodda Cloudinary `photoUrl` ile `<img>` kullanan başka yer bulunursa aynı kapsamda)
- Test: ilgili sayfaların mevcut testleri; yoksa görünür davranışı doğrulayan küçük bir test

**Interfaces:**
- Consumes: `next.config.mjs` `images.remotePatterns` (`res.cloudinary.com` zaten izinli).
- Produces: `photoUrl` ile çizilen ham `<img>`'ler `next/image` olur (`fill` + kapsayıcıya `position: relative` veya sabit `width/height`, `sizes` verilmiş, `alt` korunur); **diorama görselleri (`diorama.src800` webp) ve logo/ikon DOKUNULMAZ**. Görsel kapsayıcı boyutu ve kırpma (`object-fit`) bugünküyle aynı kalır (CLS yok).

- [ ] **Step 1: Write the failing test** — `renders the listing photo through next/image with alt and sizes` (jest'te `next/image` mock'u ile `src`, `alt`, `sizes` prop'ları doğrulanır); diorama dalının hâlâ `<img>` ürettiği doğrulanır.
- [ ] **Step 2: Run** ilgili testler → FAIL.
- [ ] **Step 3: Implement** dönüşüm; boyutlar için mevcut CSS modülündeki kapsayıcı kuralları incele, gerekirse kapsayıcıya `position: relative` ekle.
- [ ] **Step 4: Run** testler + `npx tsc --noEmit` → PASS.
- [ ] **Step 5: Commit** — `perf(ui): Cloudinary ilan fotoğrafları next/image ile`

---

### Task 7: Bütüncül doğrulama (build + tarayıcı + ölçüm)

**Files:** kod değişmez; bulgu çıkarsa ilgili task'ın dosyasında düzeltilir.

- [ ] **Step 1:** `npx jest src/components src/app` ve `npx tsc --noEmit` → hepsi PASS (bilinen, önceden var olan: `src/app/page.test.tsx` 4 test başarısız; yeni başarısızlık olmamalı).
- [ ] **Step 2:** Dev DB açıkken (`docker start arsabil_postgres_dev`, port 5433) `npm run build` → hatasız (Docker build koşulunu da doğrulamak için bir kez `DATABASE_URL=postgresql://x:y@127.0.0.1:1/x NEXTAUTH_SECRET=t NEXTAUTH_URL=http://localhost RESEND_API_KEY=re_t npx next build --webpack` de `exit=0` olmalı).
- [ ] **Step 3:** Önce/sonra ölçüm: taban commit `4b63c2f` (bu işin başlangıcı) ile yeni dal aynı makinede `next start` ile ayağa kaldırılır; tarayıcıda (PerformanceObserver: LCP, CLS, TTFB) ana sayfa, `/marketplace`, bir `/listing/[id]`, bir `/arsa-fiyatlari/[il]` için ölçülür; sonuçlar tabloya yazılır. LCP ±%10'dan kötüleşirse ve CLS > 0.02 olursa bulgu olarak raporlanır ve düzeltilir. (Taban için ayrı worktree açılırsa `node_modules` junction'ı silinmeden önce `cmd /c rmdir` ile bağ kaldırılır — junction hedefi silinmesin.)
- [ ] **Step 4:** Tarayıcıda (dar genişlikte, elle kıstırılmış) kontrol: sayfa girişi fade'i görünüyor, ilk yüklemede yok; alt çubuk göstergesi sekmeler arası kayıyor, aktif sekme olmayan rotada gizli; basma efekti; `prefers-reduced-motion` emülasyonunda hepsi kapalı. **iOS'ta his testi yapılmadı** olarak raporlanır; Emre'nin iPhone'da denemesi kabul koşuludur.
- [ ] **Step 5:** Bulgu varsa düzelt, ilgili testi ekle, commit.

---

## Plan notu

Spec §2 "çoğu rota" iskeleti istiyordu; kodda 33 sayfa istemci bileşeni olduğu için iskelet yalnız 4 sunucu segmentine (Task 3 ruling'i) uygulanıyor. İstemci sayfaların kendi yükleme durumları ayrı bir işte ele alınabilir.
