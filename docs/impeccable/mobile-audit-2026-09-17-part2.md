# ArsaBil Mobil UI — Teknik Audit Part 2 (Impeccable)

**Tarih:** 2026-09-17
**Kapsam:** `src/app/marketplace/` + `src/components/marketplace/`, `src/app/listing/[id]/` (ilan detay), `src/app/inbox/` + `src/app/inbox/[userId]/`, `src/app/listings/new/` + `src/components/listing-wizard/`, `src/app/arsa-fiyatlari/**` (SEO mahalle sayfaları)
**Yöntem:** Kod-seviyesi statik inceleme (tarayıcı/dev sunucu kullanılmadı) + Impeccable bundled detector. Önceki turda (mobile-audit-2026-09-17.md) denetlenen `src/components/mobile/`, `src/app/hesapla/mobile/`, `src/app/dashboard/`, `src/app/deger/`, `src/components/akif/` bu turda TEKRAR denetlenmedi.

## Audit Health Score

| # | Boyut | Puan | Ana Bulgu |
|---|-------|------|-----------|
| 1 | Accessibility | 1 | Birincil etkileşimler (ilan kartı, konuşma satırı, teklif seçim satırı, mesaj gönder) tekrar eden bir desenle `<div>`/`<span onClick>` — klavye/ekran okuyucu ile ERİŞİLEMEZ |
| 2 | Performance | 3 | Bir detector bulgusu (`width` transition) dışında sorun yok |
| 3 | Responsive Design | 3 | Touch target'lar (`--touch-target`) tutarlı uygulanmış; wizard/SEO sayfaları mobilde düzgün reflow ediyor |
| 4 | Theming | 3 | Token sistemi tutarlı; wizard'da 2 hardcoded hex + SEO sayfasında kullanılmayan (ölü) fallback hex'ler |
| 5 | Implementation Integrity | 1 | Aynı "tıklanabilir kart" anti-deseni 3 AYRI dosyada tekrarlanıyor; `/inbox/[userId]` doğru inşa edilmiş ama HİÇBİR YERDEN linklenmeyen yetim bir route |
| **Toplam** | | **11/20** | **Kabul edilebilir (önemli iş gerekiyor)** |

## Implementation Integrity Verdict

**Kaldı.** En kritik bulgu: `/inbox/[userId]/page.tsx` (`MobileChatPage`) klavye-farkındalığı (`useKeyboardInset`) ve doğru semantik (`<button type="submit" disabled>`) ile ÖRNEK ŞEKİLDE inşa edilmiş — ama kod tabanında hiçbir yerden bu route'a link/`router.push` YOK, tamamen erişilemez/yetim. Bunun yanında GERÇEKTE kullanılan `/inbox` (aynı bileşen mobil+masaüstü) kendi "Gönder" butonunu bir `<span onClick>` olarak yazmış — aynı sorunun daha önce çözülmüş bir emsali dururken tekrar yaşanıyor. Aynı "tıklanabilir div/span" deseni marketplace'teki `ListingCard` (liste satırı) ve wizard'daki `WizardStep4Feasibility` (rapor seçim satırı) içinde de bağımsız olarak tekrarlanmış — üç farklı dosyada üç kez aynı anti-desen, sistemik bir alışkanlık.

## Executive Summary

- **Audit Health Score:** 11/20 (Kabul edilebilir)
- **Bulgu sayısı:** P0: 0, P1: 4, P2: 3, P3: 3
- **En kritik 4 bulgu:**
  1. **[P1]** `ListingCard` (marketplace liste/split görünüm) tüm kart `<div onClick>` — klavye ile açılamaz (küçük "Detay" butonu tek klavye yolu)
  2. **[P1]** `/inbox` konuşma listesi satırı `<div onClick>` — klavye kullanıcısı HİÇBİR konuşmayı açamaz, alternatif yok
  3. **[P1]** `/inbox` "Gönder" butonu `<span onClick>` — kendi kardeş route'u (`/inbox/[userId]`) aynı işi doğru `<button>` ile yapıyor ama o route yetim/erişilemez
  4. **[P1]** `WizardStep4Feasibility` rapor seçim satırı `<div onClick>`, sahte `.radioCircle` — `role="radio"`/`aria-checked` yok
- **Önerilen sıradaki adım:** `/impeccable harden` (tüm div/span-as-button örneklerini gerçek `<button>`/`role` ile değiştir) → `/impeccable polish`

## Detaylı Bulgular

### P1 — Önemli

**[P1] `ListingCard` tüm kart tıklanabilir ama klavye ile erişilemez**
- **Konum:** `src/components/marketplace/ListingCard.tsx:74-90` (list view), `:215` (split view)
- **Kategori:** Accessibility · Marketplace
- **Etki:** `<div onClick={() => router.push(...)}>` — `role`, `tabIndex`, `onKeyDown` yok. İçindeki "Detay" butonu (satır 175-178) klavye erişimini kurtarıyor ama birincil/beklenen etkileşim (tüm kartı tıklamak) klavye/switch-access kullanıcısı için hiç çalışmıyor.
- **WCAG:** 2.1.1 Keyboard (kısmi — alternatif var, tam blokaj değil).
- **Öneri:** `role="link"` + `tabIndex={0}` + Enter/Space `onKeyDown` ekle, veya kartı gerçek bir `<Link>`/`<a>` ile sarmalayıp iç butonları `stopPropagation` ile koru.
- **Önerilen komut:** `/impeccable harden`

**[P1] `/inbox` konuşma listesi satırı klavye ile açılamaz (alternatif YOK)**
- **Konum:** `src/app/inbox/page.tsx:216-238`
- **Kategori:** Accessibility · Inbox
- **Etki:** `<div onClick={() => openConversation(...)}>`, hiçbir başka yol yok — klavye/switch-access kullanıcısı tek bir konuşmayı bile açamaz. Aynı dosyadaki "Geri" butonu (satır 248) doğru `<button aria-label>` — tutarsızlık aynı dosya içinde.
- **WCAG:** 2.1.1 Keyboard (tam blokaj, alternatif yok).
- **Öneri:** `role="button"` + `tabIndex={0}` + `onKeyDown` (Enter/Space) ekle, veya gerçek `<button>` kullan.
- **Önerilen komut:** `/impeccable harden`

**[P1] `/inbox` "Gönder" butonu `<span onClick>` — kendi kardeş route'unda doğru inşa edilmiş ama o route yetim**
- **Konum:** `src/app/inbox/page.tsx:291-298` (kusurlu) vs. `src/app/inbox/[userId]/page.tsx:134-136` (doğru: `<button type="submit" disabled={!draft.trim() || sending}>`)
- **Kategori:** Accessibility + Implementation Integrity · Inbox
- **Etki:** Gerçekte kullanılan `/inbox` sayfasında (mobil+masaüstü aynı bileşen) mesaj gönderme klavye ile ancak textarea'da Enter'a basarak mümkün — "Gönder" elemanının kendisi odaklanamaz/aktive edilemez. Bu arada `/inbox/[userId]` route'u (kendi test dosyası bile var: `chatMobile.test.tsx`) `useKeyboardInset` + gerçek `<button>` ile TAM doğru yapılmış ama kod tabanında `router.push`/`href` ile HİÇBİR yerden ona yönlendirme yok — tamamen erişilemez, terk edilmiş bir route.
- **Öneri:** Ya `/inbox`'un gönder butonunu gerçek `<button type="submit">` yap, ya da `/inbox/[userId]`'i gerçekten devreye al (mobilde ona yönlendir) ve `/inbox`'u masaüstüne indir — ikisinin birden bakımsız paralel yaşamasını sonlandır.
- **Önerilen komut:** `/impeccable harden`

**[P1] Wizard rapor seçim satırı sahte radio — `role`/`aria-checked` yok**
- **Konum:** `src/components/listing-wizard/WizardStep4Feasibility.tsx:41-53`
- **Kategori:** Accessibility · Listing Wizard
- **Etki:** `<div onClick>` + görsel `.radioCircle` ile radio-benzeri bir seçim sunuyor ama `role="radio"`, `aria-checked`, `tabIndex`, klavye desteği yok. Ekran okuyucu kullanıcısı hangi raporun seçili olduğunu bilemez, seçemez.
- **Öneri:** `role="radio"` + `aria-checked={data.reportId === r.id}` + `tabIndex={0}` + `onKeyDown` ekle (grup için `role="radiogroup"`).
- **Önerilen komut:** `/impeccable harden`

### P2 — Minor

**[P2] Marketplace hızlı filtre çipleri toggle durumunu duyurmuyor**
- **Konum:** `src/app/marketplace/page.tsx:166-178`
- **Kategori:** Accessibility · Marketplace
- **Etki:** "Satış" / "Kat Karşılığı / Ortaklık" çipleri basılı/basılı-değil durumunu yalnızca renkle gösteriyor, `aria-pressed` yok.
- **Öneri:** `aria-pressed={active}` ekle.
- **Önerilen komut:** `/impeccable harden`

**[P2] Marketplace sıralama `<select>`'i etiketsiz**
- **Konum:** `src/app/marketplace/page.tsx:184-188`
- **Kategori:** Accessibility · Marketplace
- **Etki:** Görünür bir `<label>` veya `aria-label` yok — ekran okuyucu kullanıcısı bu alanın ne işe yaradığını bilemez.
- **Öneri:** `aria-label="Sıralama"` ekle.
- **Önerilen komut:** `/impeccable harden`

**[P2] Wizard hata banner'ı token sistemini atlıyor (hardcoded hex)**
- **Konum:** `src/app/listings/new/page.tsx:72` (`rgba(255,45,85,.12)`, `#b8102f`)
- **Kategori:** Theming · Listing Wizard
- **Etki:** Proje genelinde hata rengi için `var(--red)`/`var(--red-rgb)` token'ları var (bkz. `ListingCard.tsx`, `page.tsx` score renkleri) — bu satır onları atlayıp inline hex kullanıyor, dark/light tema geçişinde ayrışabilir.
- **Öneri:** `var(--red)`/`var(--red-rgb)` token'larına geçir.
- **Önerilen komut:** `/impeccable typeset` veya `/impeccable polish`

### P3 — Cila

**[P3] Detector: fizibilite skor çubuğu `width` transition (layout thrash riski)**
- **Konum:** `src/app/listing/[id]/page.module.css:140`
- **Kategori:** Performance (detector)
- **Etki:** Düşük — tek bir küçük çubuk, ölçülebilir bir donma yaratmıyor ama proje genelinde `transform` tercih edilen desenle tutarsız.
- **Öneri:** `width` yerine `transform: scaleX(var(--score-pct-ratio))` (`transform-origin:left`).
- **Önerilen komut:** `/impeccable optimize`

**[P3] SEO mahalle sayfaları — ölü/uyumsuz fallback hex'ler**
- **Konum:** `src/app/arsa-fiyatlari/areaSeo.module.css` (tüm dosya, ör. `var(--text, #1d1d1f)`, `var(--panel, #f5f5f7)`)
- **Kategori:** Implementation Integrity (detector "slop" değil, elle doğrulandı)
- **Etki:** Doğrulandı: `--text`/`--panel`/`--muted`/`--border`/`--accent-violet` `globals.css`'te HER ZAMAN tanımlı (`:root` + light override), yani bu fallback'ler PRATİKTE hiç devreye girmiyor — canlı bir tema kırılması YOK. Ama fallback değerleri (`#1d1d1f`, `#f5f5f7` — Apple açık-tema gri tonları) gerçek token değerleriyle (`#e1e8f0`, `#0f2a4a`) örtüşmüyor, gelecekte biri bu dosyayı token'lar tanımsızken (ör. izole bir preview ortamında) render ederse markaya aykırı bir açık tema sessizce çıkar.
- **Öneri:** Fallback'leri kaldır veya gerçek token değerleriyle eşitle.
- **Önerilen komut:** `/impeccable polish`

**[P3] Marketplace/inbox arama ikonları dekoratif emoji, `aria-hidden` yok**
- **Konum:** `src/app/marketplace/page.tsx:214-216` ("⚙"), `src/app/inbox/page.tsx:199` ("🔍")
- **Kategori:** Accessibility (küçük)
- **Etki:** Ekran okuyucu emojiyi sesli tarif edebilir ("dişli", "büyüteç"), yanındaki metinle gereksiz tekrar yaratır.
- **Öneri:** `aria-hidden="true"` ekle.
- **Önerilen komut:** `/impeccable polish`

## Sistemik Bulgular

- **"Tıklanabilir div/span" anti-deseni 3 bağımsız dosyada tekrarlanmış** (`ListingCard`, `/inbox` sayfası, `WizardStep4Feasibility`) — aynı proje aynı sorunu `GirdiKarti.tsx`'te (`role="tablist"`/`role="tab"`/`aria-selected`) ve `/inbox/[userId]`'de (gerçek `<button>`) doğru çözmüş; deseni bilen doğru bir emsal var ama tutarlı uygulanmamış.
- **Yetim route:** `/inbox/[userId]` düzgün inşa edilmiş ama linklenmemiş — ya devreye alınmalı ya da kaldırılmalı (bakım yükü + kafa karışıklığı riski, iki paralel implementasyon zamanla ayrışır).
- **İlan detay tab çubuğu** (`src/app/listing/[id]/page.tsx:195-205`) da düz `<button>` listesi, `role="tablist"`/`aria-selected` yok — aynı ailenin bir örneği daha (P2 seviyesinde, marketplace/inbox kadar kritik değil çünkü her tab bağımsız erişilebilir buton).

## Olumlu Bulgular

- `WizardShell` + `listing-wizard` adımları: `StickyActionBar` doğru tüketiliyor, mobilde duplicate nav yok (`.nav { display:none }` mobilde), tüm CTA'lar gerçek `<button>`.
- `/inbox/[userId]/page.tsx`: `useKeyboardInset()` + gerçek `<button type="submit" disabled>` — projenin kendi çözdüğü klavye deseninin doğru bir örneği (ne yazık ki linklenmemiş).
- `arsa-fiyatlari` SEO sayfaları: server component, gerçek `<Link>`/`<table>` semantiği, `--touch-target` ihlali yok, responsive `clamp()` başlıklar.
- Touch target token'ı (`--touch-target`) marketplace/listing detay/wizard genelinde tutarlı uygulanmış (`.pageBtn`, `.quickChip`, `.tab`, sticky butonlar).

## Önerilen Aksiyonlar (öncelik sırası)

1. **[P1] `/impeccable harden`** — `ListingCard`, `/inbox` konuşma satırı + gönder butonu, `WizardStep4Feasibility` seçim satırı: gerçek `<button>`/`role`+`tabIndex`+`onKeyDown` ile değiştir.
2. **[P1] Karar gerektirir** — `/inbox/[userId]` route'unu devreye al ya da kaldır (kod değişikliği değil, ürün kararı).
3. **[P2] `/impeccable harden`** — marketplace çip `aria-pressed` + sort `<select>` `aria-label`.
4. **[P2]/[P3] `/impeccable polish`** — wizard hata rengi token'a taşı, SEO sayfası ölü fallback hex'leri temizle, dekoratif emoji `aria-hidden`, skor çubuğu `transform`'a geçir.

Fix'ler uygulandıktan sonra `/impeccable audit`'i tekrar çalıştırıp skorun yükseldiğini doğrula.

## 2026-09-17 — Fix turu TAMAMLANDI (kod-seviyesi), commit YOK

Tüm P1 + P2 + P3 bulguları kapatıldı:

- **ListingCard** (`src/components/marketplace/ListingCard.tsx`): her iki görünüm (list+split) `role="link"` + `tabIndex={0}` + `aria-label={listing.title}` + Enter/Space `onKeyDown` aldı. İç butonlar zaten `stopPropagation` ile korunuyordu.
- **`/inbox` konuşma satırı**: `role="button"` + `tabIndex={0}` + `aria-label` + Enter/Space `onKeyDown`.
- **`/inbox` "Gönder"**: `<span onClick>` → gerçek `<button type="button" disabled={sending}>`, `.sendLink` CSS'ine native buton chrome sıfırlaması eklendi.
- **Yetim `/inbox/[userId]` route'u**: KULLANICI KARARIYLA SİLİNDİ (kendi test dosyasıyla birlikte) — `/inbox`'un düzeltilmesi tercih edildi.
- **`WizardStep4Feasibility`**: rapor seçim satırı `role="radio"` + `aria-checked` + `tabIndex={0}` + `onKeyDown`, liste `role="radiogroup"` aldı.
- **Marketplace filtre çipleri**: `aria-pressed={active}`. **Sort `<select>`**: `aria-label="Sıralama"`. **Filtre butonu emoji (⚙)** + **inbox arama emojisi (🔍)**: `aria-hidden="true"`.
- **Wizard hata banner'ı**: hardcoded `#b8102f`/`rgba(255,45,85,.12)` → `var(--red)`/`rgba(var(--red-rgb),.12)`. **Not:** bu token zaten dashboard/settings gibi diğer `role="alert"` banner'larında da kullanılıyor — ama hesaplama sırasında AÇIK TEMADA (`--stat-bg`/beyaz panel üzerinde) `var(--red)` metninin kontrastı ~3:1'de kalıyor (WCAG AA 4.5:1'in altında), KOYU TEMADA ise (`--panel` #0f2a4a) ~4.7:1 ile geçiyor. Bu proje genelinde paylaşılan, ÖNCEDEN VAR OLAN bir sorun (bu fix'in kapsamı dışında, en az 6 dosyayı etkiliyor — `role="alert"` grep'i: StudioSaveDialog, dashboard/settings, dashboard/profile/edit, dashboard/profile, dashboard/reports) — açık temada erişilebilir bir hata rengi token'ı tanımlamak ayrı bir `/impeccable harden` veya `/impeccable colorize` turu gerektirir.
- **Listing detay skor çubuğu**: `width` transition → `transform: scaleX()` (compositor-only, layout-thrash riski yok).
- **SEO mahalle sayfaları** (`areaSeo.module.css`): tüm ölü hex/rgba/rem fallback'ler (`var(--text, #1d1d1f)` vb., `var(--border, rgba(...))`, `var(--radius-lg, 1rem)`) temizlendi — hepsi zaten `globals.css`'te her zaman tanımlı.
- **Listing detay tab çubuğu** (sistemik bulgu, ayrı P kodu almamıştı ama aynı aile): `role="tablist"`/`role="tab"`/`aria-selected`/`role="tabpanel"` eklendi.

Doğrulama: tsc 0 (önce `.next` temizlendi — silinen `[userId]` route'una referans veren bayat validator dosyası yanlış alarm veriyordu), jest 346/346 suite (2562/2562 test), `npm run build` Compiled successfully + TypeScript check geçti (sondaki Prisma/DB hatası yerel Postgres kapalı olduğu için, ortam kısıtı). **Commit edilmedi.**
