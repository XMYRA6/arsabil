# Task 10: Final doğrulama — Rapor

Worktree doğrulandı: `C:/Users/emre/Desktop/arsabil-main/.claude/worktrees/mobil-liquid-glass`, branch `feature/mobil-liquid-glass`, başlangıç HEAD `25608ff`. Fix commit sonrası HEAD `08a39bb`.

Ortam: Docker Desktop kapalıydı, başlatıldı; `arsabil_postgres_dev` container'ı `Exited` durumundaydı, `docker start` ile ayağa kaldırıldı. Dev server bu worktree'den `PORT=3457 npm run dev` ile başlatıldı (3000/3001 ana checkout'a ait olabileceği için kullanılmadı). `DistrictPrice` tablosu boştu (dev DB'de hiç ilçe fiyatı seed edilmemiş) — Step 2.3'ü canlı test edebilmek için 2 geçici test satırı eklendi (`TestIl/MerkezIlce`, `TestIl/IkinciIlce`), testler bitince silindi; DB, bulunduğu boş haliyle bırakıldı.

## Step 1: Tam komut paketi

Tüm komutlar **fix'lerden sonraki son hal** için:

```
npx tsc --noEmit          → 0 hata
npx jest --no-coverage    → Test Suites: 100 passed, Tests: 716 passed, 716 total
npx eslint src            → 12 problems (2 errors, 10 warnings) — baseline, hiçbiri bu planın dosyalarında
npm run build             → Compiled successfully, 49 route üretildi, hata yok
```

Baseline karşılaştırması: plan 709/709 test + 12 problem (2/10) bekliyordu. Fix'ler 7 yeni test ekledi (2 unitPriceSource, 3 GelismisAyarlarSheet, 1 BottomSheet transition ×2 = toplamda 716). eslint sayısı DEĞİŞMEDİ (12/2/10) — yeni kod sıfır ihlal ekledi. **PASS.**

Fix'lerden ÖNCE (ilk çalıştırma, canlı tur başlamadan): tsc 0, jest 709/709, eslint 12 (2/10) — plan baseline'ıyla birebir eşleşti.

## Step 2: Spec §8'in üç zorunlu doğrulaması (canlı, 390×844)

### 2.1 Yaprak kaydırma jesti — PASS

`4f` (Gelişmiş ayarlar) açıkken içerik alanı (`.content`, `overflow-y:auto`, `scrollHeight=1066` / `clientHeight=652`, `maxScroll=414`) 15× `mouse.wheel(0,200)` ile kaydırıldı:
- `scrollTop`: 0 → 400 (maxScroll'a çok yakın, kolayca ulaşılabiliyor)
- `dialogStillOpen`: `true` (kapanmadı)
- "Ayarları uygula ve kapat" butonu kaydırma sonrası görünür alana geldi (`top=797.6`, viewport 844 içinde)

### 2.2 Computed-style: HesapFişi mobil ağaçta zemin ve ayraç — PASS

"Mühendis görünümü" açıldıktan sonra ölçüldü:
```
outer (.hesapFisi)      backgroundColor: rgba(255, 255, 255, 0.66)   ← şeffaf DEĞİL
                        borderColor:      rgba(255, 255, 255, 0.92)
.hesapFisiRowTotal      borderTopWidth:   1px                        ← 0 DEĞİL
                        borderTopColor:   rgba(11, 32, 54, 0.07)
```
`--seal-*` fallback'leri (`--m-glass-bg`, `--m-ink`, `--m-divider`) doğru devrede — A1 I5 fix'i canlıda doğrulandı.

### 2.3 Davranış: ilçe → birim maliyet + piyasa fiyatı, elle ezme, ilçe değişince yeniden dolma, temizlenince varsayılan — PASS (1 kusur bulundu ve düzeltildi)

Not: `LocationSelector`, ilçe seçilince özet paneline geçip select'leri gizliyor (yalnızca "Konumu temizle" ile geri dönülüyor) — bu yüzden "ilçe değişince yeniden dolma" akışı gerçek UI'da yalnızca temizle→yeniden-seç yoluyla test edilebiliyor; ölçüm bu yolla yapıldı.

Ölçülen sekans (TestIl/MerkezIlce → elle ezme 7777 → temizle → TestIl/IkinciIlce → temizle):

| Adım | kaynak etiketi | piyasa alanı |
|---|---|---|
| 0. Başlangıç | `Varsayılan 12.000 TL/m²` | `""` |
| 1. MerkezIlce seçildi | `MerkezIlce ortalaması 15.000 TL/m²` | `7.000.000` |
| 2. Elle 7777 girildi | `Elle girildi · 7.777 TL/m²` | — |
| 3a. Konumu temizle (fix ÖNCESİ) | `Varsayılan 12.000 TL/m²` | **`7.000.000`** ← BUG: eski ilçenin piyasa değeri kalmış |
| 3b. IkinciIlce seçildi | `IkinciIlce ortalaması 18.000 TL/m²` | `8.400.000` |
| 4. Konumu temizle (fix ÖNCESİ) | `Varsayılan 12.000 TL/m²` | **`8.400.000`** ← BUG |

**Kusur:** `handleClearLocation` (page.tsx) birim maliyeti ve kaynağını orijinal değerine döndürüyordu ama piyasa fiyatını hiç dokunmuyordu — `ilceSecildi` ikisini birden doldurduğuna göre (spec 4), temizleme de ikisini birden geri almalıydı.

**Fix:** `unitPriceSource.ts:konumTemizlendi` ikinci parametre aldı (`orijinalPiyasaFiyati`); `page.tsx`'e `originalMarketPrice`/`originalPiyasaFiyatiElle` state'i eklendi, `handleIlceChange`'de ilk seçimde yakalanıyor, `handleClearLocation` (ve simetri için `handleIlChange`) içinde geri yükleniyor. TDD: önce `unitPriceSource.test.ts`'e 2 test eklendi (kırmızı görüldü), sonra implementasyon (yeşil).

**Fix SONRASI aynı sekans, tekrar ölçüldü:**
```
3a. Konumu temizle  → kaynak: "Varsayılan 12.000 TL/m²"  piyasa: ""        ✓ düzeldi
4.  Konumu temizle  → kaynak: "Varsayılan 12.000 TL/m²"  piyasa: ""        ✓ düzeldi
```

## Step 3: Tek kapı ve sadeleşme kontrolü — PASS

```
grep -rn "SekmeSecici\|sekmeKap\|MobilSekme" src/     → sekme seridi kalintisi yok
grep -rn 'aria-label="Gelişmiş ayarlar"' src/          → baslikaki disli kalmadi
```
İkisi de boş — beklendiği gibi.

## Step 4: Masaüstü regresyon (1440×900) — PASS

Statik analiz: `git log --oneline 892ab70..HEAD -- src/app/hesapla/page.module.css src/app/hesapla/page.tsx src/app/hesapla/AdvancedSettingsSections.tsx` → yalnızca 4 commit, ikisi bu K7 değişikliğiyle ilgili (`f5ba814`, `dd122d8`). `f5ba814`'ün diff'i yalnızca `page.tsx` + test dosyasını değiştiriyor, `page.module.css`'e HİÇ dokunmuyor — desktop CSS'te plan boyunca beklenmedik hiçbir değişiklik yok.

Canlı ölçüm (1440×900):
- `BirimMaliyetField` input'u sidebar'da görünür (`rect: {x:328, y:256, w:173, h:19}`), gear'ın arkasında DEĞİL.
- `MarketField` input'u sidebar'da görünür (`rect: {x:116, y:378, w:256, h:48}`).
- `LocationSelector` select'leri (2 adet) sidebar'da mevcut.
- Layout landmark'ları: `.layout` → `display:grid`, `gridTemplateColumns: 360px 876px`; `.leftSidebar` → `display:flex, width:360px` — sabit iki-kolonlu düzen, beklenen yapıda.
- Ekran görüntüsü alındı (`desktop-1440x900.png`): "Piyasa Analizi" (birim maliyet + piyasa fiyatı), "Daire Standardı", "Ortalama Daire Metrekaresi", "Toplam Daire Sayısı"/"Arsa Alanı (m²)" toggle'ları hepsi sidebar'da sırayla görünüyor.
- Küçük gözlem (kusur DEĞİL): `BirimMaliyetField`'in `.drawerRow` (flex, `justify-content:space-between`, 3 satır-içi eleman) düzeni 360px sidebar'da biraz sık duruyor. Bu, Task 7'nin AYNI CSS'i (sadece JSX konumu değişti, `page.module.css` değişmedi) drawer'dan sidebar'a taşımasının doğal sonucu — commit mesajı da "Yerleşim yeniden tasarlanmadı" diyor. Masaüstü yerleşiminin yeniden tasarımı zaten plan notlarında ayrı bir işe (Parça 3) bırakılmış; burada YENİ bir regresyon değil, mevcut drawer görünümünün olduğu gibi taşınması.

## Deferred item 3: FormulParamsFields masaüstü çekmecesi — PASS

Çekmece açıldı (⚙), `DaireSayisiFields` ve `ArsaAlaniFields` toggle'ları (`input[type=checkbox]`, 2 adet) tıklandı:
- "Toplam Daire Sayısı" input'u ortaya çıktı, değer `24` (varsayılan global state).
- "Arsa Alanı (m²)" input'u ortaya çıktı, değer `360` (varsayılan).
- Sıra doğrulandı: DaireSayisiFields ÖNCE, ArsaAlaniFields SONRA (kod yorumundaki kısıtla birebir).
- "Toplam Daire Sayısı" input'una JS ile `12` yazıldı, React state güncellemesi doğrulandı (DOM value `12` olarak kaldı, React re-render sonrası da `12`) — çekmece gerçekten çalışıyor.

## Step 5: Erişilebilirlik

### Dokunma hedefleri (elementFromPoint, gerçek vuruş alanı) — PASS + 1 gözlem

Sayfa açılışında (scroll=0) ve çeşitli scroll pozisyonlarında `document.elementFromPoint` ile test edildi. NEXTJS-PORTAL (dev-only) hedefe isabet eden "Pazar" linki brief talimatınca sayılmadı.

Tüm buton/input/select/link'ler (Hesap fişi, Analiz, İl/İlçe select, Birim maliyeti değiştir, Parseli işaretle, Standart/Orta/Lüks, Özet Rapor Oluştur, Raporlar/Ana sayfa/Mesajlar/Profil nav) gerçek vuruş alanında KENDİLERİNE isabet ediyor (`matchesSelf: true`).

**Gözlem (kusur olarak sınıflandırılmadı, ölçülüp raporlanıyor):** Sayfa ilk açıldığında (scrollY=0), "Metrekareyi azalt/artır" (38×38, `::after` ile 44px'e genişletilmiş) ve "Toplam daire sayısı üzerinden hesapla" toggle'ı (46×27) sırasıyla **40px** ve **100px** kaydırılana kadar StickyActionBar / BottomNavbar'ın GERÇEK vuruş alanına düşüyor (ekran görüntüsüyle doğrulandı: "Daire büyüklüğü" satırı CTA barının hemen altında, görsel olarak örtüşüyor). Kök neden muhtemelen Task 5'in `KonumBlogu`'yu girdi kartının en üstüne taşıması (kart ~130-150px uzadı). Bunu bir "kusur" olarak DEĞİL bir gözlem olarak raporluyorum çünkü: (1) 40-100px'lik kaydırma tipik/beklenen mobil scroll davranışı, kontrolü kalıcı olarak erişilemez kılmıyor — `maxScroll=263px` içinde rahatça temizleniyor; (2) düzeltmesi, kartların dikey yoğunluğunu azaltan bir yeniden-tasarım kararı gerektirir (hangi kartın kısalacağı), bu da plan notlarının ayrı bıraktığı "masaüstü/mobil yerleşim yeniden tasarımı" kapsamına giriyor, tek CSS satırıyla düzeltilecek bir bug değil. Task-11-acik-kalemler.md'ye eklenmesini öneririm.

### Yeni girişlerin aria-label'ı — PASS

Kontrol edilen tüm yeni/taşınmış elemanların erişilebilir adı var: "Metrekareyi azalt/artır", "Toplam daire sayısı üzerinden hesapla", "Birim inşaat maliyeti (TL/m²)", "Birim maliyeti değiştir", "Yaklaşık piyasa fiyatı (yalnızca karşılaştırma)", "Konumu temizle". Parsel butonunun aria-label'ı yok ama görünür metni var (erişilebilir isim metinden türüyor) — sorun değil.

### prefers-reduced-motion altında hareket kapalı — FAIL bulundu, düzeltildi

**Kusur (canlı ölçümle yakalandı, tam olarak brief'in öngördüğü yöntemle):** `reducedMotion:'reduce'` context'inde `4f` yaprağı açıldıktan 100ms sonra:
```
FIX ÖNCESİ:  opacity: "0.789168"  animations: [{playState:"running", duration:400}]  matchMediaReduce: true
```
`BottomSheet.tsx`'te `initial`/`animate` reduced motion'da opacity-only'e düşüyordu ama `transition` prop'u HER ZAMAN sabit `{type:'spring', damping:32, stiffness:320}` kalıyordu — hem yaprak hem backdrop için. Bu, plan kısıtı "prefers-reduced-motion altında tüm hareket kapalı"yı ihlal ediyordu (BottomSheet.tsx bu planın dosyası değil, Faz 0/1'den kalma, ama bu planın yeni `4f` yaprağı onu kullanıyor).

**Fix:** `sheetTransition(reduceMotion)` yardımcı fonksiyonu eklendi — reduced motion açıkken `{duration:0}`, kapalıyken eski spring. Hem yaprak hem backdrop `motion.div`'ine uygulandı. TDD: `BottomSheet.test.tsx`'e 2 test eklendi (kırmızı → yeşil).

**Fix SONRASI aynı ölçüm:**
```
t=100ms: opacity:"1"  animations:[]
t=600ms: opacity:"1"  animations:[] (animCount:0)
```
Karşılaştırma — normal motion (reducedMotion yok) aynı t=100ms'de: `transform: matrix(1,0,0,1,0,239.6)` — yaprak hâlâ kayma animasyonu ortasında (yani normal kullanıcılar için animasyon davranışı BOZULMADI, yalnızca reduced-motion tarafı düzeldi).

## Deferred item 1: onParselAc hedefleme — FAIL bulundu, düzeltildi

**Ölçüm (fix ÖNCESİ):** Parsel butonuna basılınca (`onParselAc` → `acilisBolumu='risk'`):
- İKİ bölüm birden `data-acilis="true"` oluyordu: "Maliyet ve riskler" (`bolum('kar','risk','iksa')` içinde 'risk' de var) VE "Konum ve resmi risk" (`bolum('risk')`).
- Açılışta OTOMATİK KAYDIRMA YOKTU (`scrollElScrollTop: 0`), `.ayarBolum`'daki `scroll-margin-top:12px` hiç kullanılmıyordu.
- Hedef bölüm ("Konum ve resmi risk", parsel picker'ı içeren) yaprağın EN ALTINDAYDI (`top:820.6`, görünür alan `652px` / toplam içerik `1066px`) — 844px viewport'ta görünür alanın (`scrollElRectBottom:844`) neredeyse tamamen dışında, elle kaydırma GEREKİYORDU.

**Kök neden:** `AyarBolumu` tipi `'risk'`i hem "kar/risk/iksa" (maliyet) bölümü hem "parsel/resmi risk" bölümü için kullanıyordu — isim çakışması.

**Fix:** Ayrı bir `'parsel'` değeri eklendi; `onParselAc` artık `setMobilAyarBolumu('parsel')` çağırıyor; parsel bölümünün `data-acilis`'i `bolum('parsel')`'e değişti. Her bölüme ref eklendi, açılışta hedef bölüme `scrollIntoView({block:'start', behavior: reducedMotion?'auto':'smooth'})` çağıran bir `useEffect` eklendi. TDD: `GelismisAyarlarSheet.test.tsx`'e 3 test eklendi (yalnızca doğru bölüm işaretleniyor + scrollIntoView çağrılıyor + reduced motion'da `behavior:'auto'`).

**Fix SONRASI canlı ölçüm:**
```
"Maliyet ve riskler"     data-acilis: "false"   ← artık işaretlenmiyor
"Konum ve resmi risk"    data-acilis: "true"
parselSectionTop: 406.6, viewportHeight: 844     ← görünür alanda, elle kaydırma GEREKMİYOR
scrollElScrollTop: 414 (== maxScroll)             ← otomatik kaydırma çalıştı
```
Ekran görüntüsüyle de doğrulandı (`parsel-targeting-after-fix.png`): parsel kartı (mavi çerçeveli, "Parseli Doğrula" butonlu) açılışta doğrudan görünür, başka hiçbir bölüm vurgulanmıyor.

**Yan not — jsdom altyapı eksiği:** Bu fix'i test ederken jsdom'un `window.matchMedia` ve `Element.prototype.scrollIntoView`'i hiç implemente etmediği ortaya çıktı (önceki testler bunu hiç tetiklememiş). `jest.setup.ts`'e güvenli no-op varsayılanlar eklendi; mevcut per-test mock deseni (`ScoreRevealBadge.test.tsx`) bozulmadı, üzerine yazılabiliyor.

## Deferred item 2: Masaüstü piksellerinin gerçekten değişmemiş olması — PASS

Bkz. Step 4 — hem statik git-diff analizi (`page.module.css` planın hiçbir commit'inde değişmemiş) hem canlı ölçüm (layout landmark'ları, K7 alanlarının görünürlüğü) ile doğrulandı.

## Özet: Bulunan kusurlar

| # | Kusur | Nerede yakalandı | Durum |
|---|---|---|---|
| 1 | "Konumu temizle" piyasa fiyatını eski ilçenin değerinde bırakıyordu | Step 2.3 canlı davranış testi | **Düzeltildi**, test + canlı doğrulandı |
| 2 | `prefers-reduced-motion: reduce` altında BottomSheet'in opacity fade'i hâlâ 400ms sürüyordu | Step 5 reduced-motion computed-style/getAnimations() ölçümü | **Düzeltildi**, test + canlı doğrulandı |
| 3 | `onParselAc` iki bölümü birden işaretliyordu, hedefe kaydırma yoktu | Deferred item 1 | **Düzeltildi**, test + canlı doğrulandı |
| — | Sayfa ilk açıldığında iki kontrol (apartman metrekare stepper'ı, daire-sayısı toggle'ı) 40-100px kaydırılana kadar üstteki sabit barların vuruş alanına düşüyor | Step 5 dokunma hedefi taraması | **Düzeltilmedi** — kayıtlı gözlem, task-11'e önerildi (bkz. gerekçe yukarıda) |

## Yapılamayan kontroller

Yok — brief'teki tüm adımlar canlı ortamda çalıştırıldı. Docker/DB başlangıçta kapalıydı ama başlatılabildi; `DistrictPrice` boştu ama geçici test verisiyle aşıldı ve sonra temizlendi.
