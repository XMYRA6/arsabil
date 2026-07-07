# Mühür Kimliğinin Listing/Marketplace/Dashboard'a Genişletilmesi

## Bağlam

Hesapla sayfasının mobil görünümü, "Mühür Lacivert" kimliğiyle yeniden tasarlandı: sayfa-scope'lu `--seal-*` token'ları (`--seal-accent`, `--seal-ink`, `--seal-surface`, `--seal-border(-soft)`, `--seal-text(-muted/-faint)`), tema-duyarlı cam kart yüzeyi (`backdrop-filter: blur(24px)`, light'ta beyaz buz, dark'ta lacivert gradient), tüm para/yüzde değerlerinde `JetBrains Mono` + `tabular-nums`, aurora marka gradienti (`var(--brand-gradient)`: mor→mavi→cyan) kullanan dolgulu CTA'lar ve "Canlı Mühür" (`SealBadge.tsx`) — bir eşiği geçince tek seferlik damga-oturma animasyonu oynatan imza bileşen. Bugünkü oturumda ayrıca `--seal-accent`'in flat/soluk `#4C8DFF` yerine sitenin zaten kullandığı `var(--brand-gradient)`/`--aurora-cyan` ailesine çekildiği bir düzeltme yapıldı (commit `3b91953`) — CTA'lar artık masaüstüyle aynı gradient'i paylaşıyor.

Kullanıcı bu kimliğin `listing/[id]`, `marketplace` ve `dashboard` sayfalarına da taşınmasını istiyor. Bu üç sayfa şu an bu kimlikten tamamen bağımsız: `--seal-*`/`--brand-gradient` referansı yok, farklı olgunluk seviyelerinde mobil CSS'e sahipler (bkz. Kapsam bölümü).

## Kullanıcı Kararları (brainstorming oturumu, 2026-07-07)

1. **Kapsam:** Üç sayfa da tek bir spec+plan içinde ele alınır (Faz 1 deseni) — ayrı ayrı sıralanmaz.
2. **Cihaz:** Yalnızca mobil (`@media max-width: 768px`), hesapla'daki kuralın aynısı. Masaüstü hiçbir sayfada dokunulmaz.
3. **Derinlik — katmanlı yaklaşım:**
   - Cam kart token'ları + tabular-nums tipografi + gradient CTA **üç sayfada da** uygulanır.
   - **Canlı Mühür (animasyonlu damga rozeti) sadece `listing/[id]`'de** kullanılır (skor rozetinde doğal bir eşik-geçişi anı var). Marketplace'teki kart listesinde tekrarlanması dağınık/gimmick olur; dashboard'da eşik-geçişi kavramı yok.
4. **`ListingCard.tsx`** (yalnızca `marketplace/page.tsx` tarafından kullanılıyor, başka hiçbir sayfa import etmiyor) kapsama dahil — asıl fiyat/skor kartı orada yaşıyor.
5. **Semantik renkler dokunulmaz:** Karşılaştır/yeşil butonlar, kırmızı/yeşil durum renkleri (offer status, skor pill'leri vb.) kendi anlamlarını korur, mavi/gradient'e çevrilmez (hesapla'daki `compareBtn` kararıyla tutarlı).

## Kapsam — Sayfa Bazlı Envanter ve Değişiklik Haritası

Aşağıdaki envanter, uygulama planından önce yapılan gerçek kod taramasına dayanır (satır numaraları değişebilir, task yazımında teyit edilir).

### 1) `src/app/listing/[id]/page.tsx` + `page.module.css`

- Zaten Faz 0 birincil bileşenlerini kullanıyor: `AppBar`, `SwipeGallery`, `StickyActionBar`. Gerçek mobil CSS bloğu var (`@media max-width:768px`, ~L525-572): grid tek kolona iniyor, sidebar statikleşiyor, `StickyActionBar` sidebar aksiyonlarının yerini alıyor.
- **Cam yüzey alacak kartlar:** skor rozeti sarmalayıcısı (`.scoreOverlay` → `FizibiliteScoreBadge`), `.detailCell` (6 parsel-detay hücresi: Alan/İmar/Emsal vb.), `.fizCell` (6 fizibilite hücresi), sidebar `.priceValue` kartı, `.miniStat` çipleri (Net Kâr/Arsa Payı).
- **Tabular-nums'a geçecek değerler:** `.priceValue`, `.fizValue`, `.detailValue`, `.miniStatValue`, `.progressValue`, `.offerShare`, `.changeBadge` yüzdesi.
- **Gradient CTA'ya geçecek:** `.primaryBtn`, `.offerSubmit`, `.actionPrimary` (StickyActionBar bunları yeniden kullanıyor) — şu an hepsi flat `var(--primary)`/`var(--green)`. `.actionGreen`/yeşil aksiyonlar kendi rengini korur.
- **Canlı Mühür:** `FizibiliteScoreBadge`'in gösterdiği skor bir eşiği geçtiğinde (veya ilk göründüğünde) `SealBadge.tsx`'teki stamp-settle animasyonu tetiklenir. `SealBadge` bileşeni hesapla'ya özel yazılmışsa, bu iş kapsamında paylaşılabilir bir konuma taşınması (örn. `src/components/mobile/` veya `src/components/ui/`) gerekebilir — kesin karar uygulama planında.

### 2) `src/app/marketplace/page.tsx` + `page.module.css` + `src/app/marketplace/ListingCard.tsx`(`.module.css`)

- Sayfa zaten Faz 0 `SegmentedTabs` + `BottomSheet` kullanıyor. `.container`/`.topBar`/`.listPanel` üzerinde generic bir cam efekti (blur 20/14/12px) zaten var ama seal-scope'lu değil, `var(--panel)` gibi genel token kullanıyor.
- **ListingCard (asıl kapsam):** fiyat, fizibilite skoru, değişim yüzdesi gösteren kart — cam yüzey (seal-surface) + tabular-nums burada uygulanır. **Animasyonlu mühür rozeti YOK** (karar #3).
- **Sayfa içi CTA'lar:** `.quickChipActive`/`.pageBtnActive` (aktif durum göstergeleri) → gradient. `.filterBtn` (sheet açan buton, bir "aksiyon" değil bir "toggle") nötr/outline kalır.

### 3) `src/app/dashboard/page.tsx` + `page.module.css`

- Hiç Faz 0 bileşeni kullanmıyor; mobil blok (~L258-268) saf CSS reflow, mobile-özel markup yok.
- **Cam yüzeye geçecek:** `.statCard` (4 istatistik karosu), `.reportRow`, `.offerRow`.
- **Tabular-nums'a geçecek:** `.statValue`, `.reportMeta` içindeki "%X"/"Y ₺", `.offerAmount` ("%X pay").
- **CTA:** Sayfada gerçek bir "birincil aksiyon" butonu yok — `.qaBtn` quick-action grid'i navigasyon linkleri. Bunlara gradient **uygulanmaz** (karar: her yere gradient dayatılmaz, sadece gerçek CTA'larda kullanılır) — mevcut nötr/outline-hover stili korunur.

## Kapsam Dışı

- Masaüstü görünümün herhangi bir parçası (üç sayfada da).
- `globals.css`'e yeni global token eklenmesi (mevcut `--brand-gradient`/`--aurora-*` yeniden kullanılır, sayfa-scope'lu yeni `--seal-*` setleri her sayfanın kendi mobil media query'sine scope'lanır — hesapla kuralı aynen tekrarlanır).
- Marketplace/dashboard/listing dışındaki sayfalar (`compare`, `profile`, `inbox`, admin vb.) — bu spec kapsamına girmiyor, ayrı bir iş.
- Semantik durum renkleri (yeşil/kırmızı/turuncu) — dokunulmaz.
- `ListingCard.tsx`'e animasyonlu Canlı Mühür eklenmesi — kesin olarak kapsam dışı (karar #3).

## Teknik Yaklaşım

Her sayfa, hesapla'daki birebir desenle kendi `--seal-*` setini kendi mobil media query'si içinde tanımlar:

```css
@media (max-width: 768px) {
  .container /* veya sayfanın kök class'ı */ {
    --seal-accent: var(--aurora-cyan);
    --seal-accent-rgb: 43, 124, 255;
    --seal-ink: #0F2A43;
  }

  [data-theme="dark"] .container {
    --seal-surface: linear-gradient(160deg, #0F2A43 0%, #16324F 100%);
    --seal-border: rgba(43, 124, 255, 0.25);
    --seal-border-soft: rgba(43, 124, 255, 0.18);
    --seal-text: #F4F0E6;
    --seal-text-muted: rgba(244, 240, 230, 0.7);
    --seal-text-faint: rgba(244, 240, 230, 0.55);
  }

  [data-theme="light"] .container {
    --seal-surface: var(--shell-bg);
    --seal-border: var(--shell-border);
    --seal-border-soft: var(--shell-border);
    --seal-text: var(--card-title);
    --seal-text-muted: var(--muted);
    --seal-text-faint: var(--muted);
  }
}
```

Kart sınıfları (`.detailCell`, `.fizCell`, `.statCard`, ListingCard'ın kart kökü vb.) `background`/`border-color`'ını `var(--seal-surface)`/`var(--seal-border(-soft))` okuyacak şekilde değiştirilir, `backdrop-filter: blur(24px)` eklenir. CTA'lar `background: var(--brand-gradient); color: white;` alır (bugünkü hesapla düzeltmesiyle birebir aynı desen).

Her sayfa için hesapla'daki `pageStyles.scope.test.ts` deseninde bir scope-guard testi yazılır: (1) yeni `--seal-*` token'ları o sayfanın `globals.css`'ine değil kendi `page.module.css`'ine ve `@media max-width:768px` içine sızdığı, (2) dark/light blokların ikisinin de `--seal-surface` tanımladığı.

Kesin selector listesi, `SealBadge`'in paylaşılabilir konuma taşınıp taşınmayacağı, ve her sayfanın kaç task'a bölüneceği uygulama planında (writing-plans) netleşir.

## Test Planı

- Mevcut jest paketi (135/135) kırılmadan geçmeli; her sayfaya scope-guard testleri eklenir.
- `npx tsc --noEmit` ve `npm run lint` sıfır hata/ihlal.
- Playwright mobil (390×844) light/dark tema kontrolü: `listing/[id]` (skor rozeti + Canlı Mühür animasyonu dahil), `marketplace` (ListingCard cam yüzeyi), `dashboard` (statCard cam yüzeyi). `marketplace`/`dashboard` auth gerektiriyor — Docker/Postgres ayakta değilse bu ikisi için tam görsel doğrulama insan tarafından ertelenebilir (bilinen ortam kısıtı, hesapla dışındaki önceki fazlarda da karşılaşıldı).
- Masaüstü regresyon kontrolü: üç sayfa da 1280px genişlikte, değişim öncesi/sonrası birebir aynı görünmeli.
