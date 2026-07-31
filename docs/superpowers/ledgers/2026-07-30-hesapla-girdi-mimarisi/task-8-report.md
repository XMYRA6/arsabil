# Task 8 Report — Masaüstü: birim maliyet görünür, piyasa fiyatı çekmeceden çıkar

## Ortam doğrulaması

- `git rev-parse --show-toplevel` → `C:/Users/emre/Desktop/arsabil-main/.claude/worktrees/mobil-liquid-glass`
- `git branch --show-current` → `feature/mobil-liquid-glass`
- Başlangıç HEAD → `b77aa66` (brief'te belirtilenle eşleşti)

## Ne yapıldı

`src/app/hesapla/page.tsx`:
1. `kaynakEtiketi` fonksiyonu, zaten var olan `./mobile/unitPriceSource` importuna eklendi (Task 1'de yazılan modül; `ilceSecildi`/`konumTemizlendi`/`BirimMaliyetKaynagi` zaten oradan geliyordu).
2. `.desktopSidebar` içine, `sidebarTitle`in hemen altına, YENİ bir `settingsGroup` eklendi:
   - `Piyasa Analizi` başlığı (`styles.drawerCardHeader` — çekmecede kullanılan aynı tipografi sınıfı, taşındı).
   - Birim maliyet satırı: brief'in Step 4 kod parçası **verbatim** kullanıldı (`styles.drawerRow` + `kaynakEtiketi(birimMaliyetKaynagi, globalUnitPrice)` + `number` input, `onChange`'de `setGlobalUnitPrice` + `setBirimMaliyetKaynagi({ tur: 'elle' })`).
   - `<MarketField manualMarketPrice=... setManualMarketPrice=... />` — artık her zaman görünür.
3. Ayarlar çekmecesindeki (`settingsDrawer`) eski "Piyasa Analizi" `drawerCard` + `<MarketField>` bloğu tamamen kaldırıldı (artık dişli arkasında yok).

`src/app/hesapla/pageStyles.scope.test.ts`: brief'teki `describe('birim maliyet ve piyasa fiyati gorunurlugu (spec 2026-07-29 K1/K7)', ...)` bloğu **verbatim** dosyanın sonuna eklendi.

## ÖNEMLİ SAPMA — brief'in DOM varsayımıyla gerçek kod arasındaki fark (rapor edilmesi gereken bulgu)

Brief Step 3: *"`<MarketField ... />` çağrısını ayarlar çekmecesinden alıp `LocationSelector`ın hemen altına, `.desktopSidebar` içine taşı."*

Kodu inceledigimde **`LocationSelector`, `.desktopSidebar` içinde değil** — `page.tsx:1081` civarında, `rightGrid` bölümünün `<main>` etiketi içinde (sonuç panelinde) render ediliyor. `.desktopSidebar` (`aside.leftSidebar` içinde, girdi/ayarlar sütunu) ile `<main>` (sonuç sütunu) CSS grid'de tamamen ayrı, yan yana duran iki farklı bölge.

Doğruladım:
- `page.tsx` içinde `LocationSelector` **tek** bir yerde geçiyor (grep ile teyit), o da `<main>` içinde, `districtPrices.length > 0 &&` koşulunun içinde.
- `git show 38fc611` (LocationSelector'ın ilk eklendiği commit, 2026-06-07) onu bu konuma koymuş — bu mobil-liquid-glass planından tamamen bağımsız, çok daha eski bir yerleşim kararı.
- Planın kendisi (`docs/superpowers/plans/2026-07-30-hesapla-girdi-mimarisi.md:1515`) "masaüstü yerleşiminin yeniden tasarımı"nı **bu planın dışında, ayrı spec bekleyen bir iş** olarak listeliyor. Aynı planın KRİTİK notu da (satır 1256) "Yerleşim yeniden tasarlanmaz" diyor.

Yani brief'i harfiyen uygulayıp `MarketField`'i `<main>`/`rightGrid` içine, `LocationSelector`ın yanına taşımak, aslında girdi sütunundan sonuç sütununa bir bileşen taşımak olurdu — bu tam da KRİTİK notun yasakladığı ve planın "ayrı spec bekliyor" dediği yerleşim yeniden tasarımının kendisi olurdu.

**Karar:** `MarketField`i ve yeni birim maliyet satırını `.desktopSidebar` içine koydum (brief'in bu kısmı doğru) ama "LocationSelector'ın altına" değil, `.desktopSidebar`'ın en üstüne (`sidebarTitle`in hemen altı, `Daire Standardı` grubunun üstü) — çünkü:
- Spec K1/K7'nin niyeti (hesabı süren asıl değerin görünür olması) buradaki en doğal karşılığı: sidebar'ın en başında.
- Hiçbir mevcut öğe yer değiştirmedi/yeniden sıralanmadı — yalnızca ekleme yapıldı, `.desktopSidebar` dışındaki hiçbir şeye dokunulmadı.
- Test paketi bu pozisyonu zaten bağlayıcı kılmıyor: `pageStyles.scope.test.ts`teki pozisyon testi `pageTsx.indexOf('isSettingsSidebarOpen &&')` string'ini arıyor — bu literal string kod tabanında **hiç yok** (kod `${isSettingsSidebarOpen ? styles.open : ''}` deseni kullanıyor, `&&` değil), yani `cekmeceBas === -1` ve `||` kısa devresi test'i konumdan bağımsız her zaman geçiriyor. Gerçek zorlayıcı assertion sadece `<MarketField` var mı ve `kaynakEtiketi(...)` çağrısı var mı.

Bunu improvize bir redesign olarak değil, brief'in en güvenli/en dar okunuşu olarak uyguladım: iki değeri görünür kıldım, hiçbir yerleşimi (grid alanlarını, sütun sırasını, LocationSelector'ın konumunu) değiştirmedim. Yine de bu bir yorum kararı olduğu için **DONE_WITH_CONCERNS** olarak işaretliyorum — placement onayı istenirse memnuniyetle taşırım.

## TDD Kanıtı

**RED** — test eklendikten, implementasyon yapılmadan önce:
```
npx jest src/app/hesapla/pageStyles --no-coverage
```
Çıktı (özet):
```
FAIL src/app/hesapla/pageStyles.scope.test.ts
  ● birim maliyet ve piyasa fiyati gorunurlugu (spec 2026-07-29 K1/K7) › masaustunde birim maliyet kaynagi ekranda gosterilir
    expect(received).toMatch(expected)
    at src/app/hesapla/pageStyles.scope.test.ts:254:21
Test Suites: 1 failed, 1 total
Tests:       1 failed, 31 passed, 32 total
```
Beklenen ve gözlemlenen: `kaynakEtiketi(birimMaliyetKaynagi, globalUnitPrice)` deseni henüz `page.tsx`te yoktu → FAIL beklenen. İlk assertion ("cekmece disinda") ise yukarıda açıklanan string-yokluğu nedeniyle zaten geçti (planın beklediği "iki assertion da başarısız" beklentisiyle kısmen çelişiyor, ama bu kod tabanının gerçek deseninden kaynaklanıyor, hatalı test yazımından değil).

**GREEN** — implementasyon sonrası:
```
npx jest --no-coverage
```
Çıktı (özet):
```
Test Suites: 97 passed, 97 total
Tests:       700 passed, 700 total
Snapshots:   0 total
```
(698 baseline + 2 yeni test.)

```
npx tsc --noEmit
```
Çıktı: (boş — 0 hata)

```
npx eslint src
```
Çıktı: `✖ 12 problems (2 errors, 10 warnings)` — baseline ile birebir aynı (yeni ihlal yok).

## Değişen dosyalar

- `C:\Users\emre\Desktop\arsabil-main\.claude\worktrees\mobil-liquid-glass\src\app\hesapla\page.tsx`
- `C:\Users\emre\Desktop\arsabil-main\.claude\worktrees\mobil-liquid-glass\src\app\hesapla\pageStyles.scope.test.ts`

## Commit

`f5ba814` — `feat(hesapla): masaustunde birim maliyet gorunur, piyasa fiyati cekmeceden cikti`

## Self-review

- **Completeness:** Her iki test assertion'ı gerçek kod değişikliğiyle karşılanıyor (kaynakEtiketi çağrısı gerçekten eklendi, MarketField gerçekten çekmeceden çıktı — sadece test string'i tesadüfen zaten geçiyordu). Mobil ağaca dokunulmadı. `engine_v2.ts` değişmedi. Emoji yok, ikonlar zaten mevcut SVG'ler (brief'in kendi kod parçası, değiştirmedim).
- **Quality:** Yeni CSS eklenmedi — var olan `.settingsGroup`, `.drawerCardHeader`, `.drawerRow`, `.drawerRowLabel` sınıfları yeniden kullanıldı, görsel olarak sidebar'ın geri kalanıyla tutarlı.
- **Discipline:** `.desktopSidebar` dışındaki hiçbir JSX'e dokunulmadı; `LocationSelector`, `rightGrid`, `mobileSidebar` aynı kaldı. `page.tsx`i yeniden yapılandırmadım, yalnızca eklemeler + bir blok taşıma yaptım.
- **Testing:** RED→GREEN sırası izlendi, tam paket + tsc + eslint komuta göre çalıştırıldı, çıktılar pristine (yeni warning/error yok).

## Endişeler

- Yukarıda açıklanan placement kararı (`.desktopSidebar`'ın en üstü, `LocationSelector`ın yanı değil) bir yorum kararıdır — brief'in DOM varsayımı gerçek kodla uyuşmuyordu. Test paketi bu kararı zorlamıyor ama onaylanması iyi olur.
- Görsel doğrulama (Playwright/tarayıcı) yapılmadı — yalnızca statik/test doğrulaması yapıldı. İstenirse 1440×900 masaüstü görünümünde manuel/otomatik ekran görüntüsü alınabilir (planın "Step 4: Masaüstü regresyon" adımı, satır 1492, bu görevin parçası değildi ama ilerideki bir doğrulama görevinin konusu olabilir).

---

## FIX REPORT — Review bulgularının giderilmesi (2026-07-30, ikinci tur)

Placement kararı insan tarafından onaylandı (`.desktopSidebar`'ın en üstü kalıyor, spec compliance ✅). Üç Important bulgu bildirildi; hepsi giderildi. Commit: `dd122d8`.

### Finding 1 — "cekmece disinda" testi hicbir zaman basarisiz olamiyordu

**Sorun:** `pageStyles.scope.test.ts`teki assertion `pageTsx.indexOf('isSettingsSidebarOpen &&')` ariyordu; bu literal string `page.tsx`te hic yok (gercek kod `` `${isSettingsSidebarOpen ? styles.open : ''}` `` ternary'sini kullaniyor). `cekmeceBas` her zaman `-1` donuyor, `cekmeceBas === -1 || ...` kisa devresi assertion'i kosulsuz `true` yapiyordu.

**Fix:** Gercek bir sinir isaretine (`styles.settingsDrawerOverlay`, cekmecenin DOM'daki ilk satiri) gore yeniden yazildi. Ayrica ilk versiyonum ("yalnizca ilk occurrence'i kontrol et") da yetersiz cikti: `.mobileSidebar` yedek agacinda cekmeceden ONCE gelen, mesru, ayri bir `<MarketField>` zaten var (satir ~912) — bu yuzden nihai assertion cekmece baslangicindan SONRAKI TUM `<MarketField` occurrence'larini sayiyor ve sifir olmasini zorunlu kiliyor.

**Ayirt edicilik kaniti (istenen):**
1. `page.tsx`teki yeni "Piyasa Analizi" grubunu GECICI olarak kaldirip, ayni `<MarketField>` cagrisini cekmecenin (`settingsDrawer`) icine geri koydum (regresyonu simule ederek).
2. Test calistirildi: `npx jest src/app/hesapla/pageStyles --no-coverage`
   ```
   ● ... masaustunde piyasa fiyati artik cekmece ICINDE DEGIL
     expect(received).toBe(expected)
     Expected: 0
     Received: 1
   Tests: 2 failed, 30 passed, 32 total
   ```
   Test GERCEKTEN basarisiz oldu — regresyonu yakaladi.
3. Gecici degisiklik geri alindi (`git diff src/app/hesapla/page.tsx` bos donduruldu, tam eski haline donuldugu dogrulandi).
4. Test tekrar calistirildi: `npx jest src/app/hesapla/pageStyles --no-coverage` → `Tests: 32 passed, 32 total` (GREEN).

### Finding 2 — birim maliyet input'u silinemiyordu

**Sorun:** `onChange` yalnizca `Number.isFinite(v) && v > 0` ise commit ediyordu; `Number('') === 0` bu guard'i gecemedigi icin state hic degismiyor, controlled input (`value={globalUnitPrice}`) her tus vurusunda React tarafindan eski sayiya geri yaziliyordu — kullanici alani SILEMIYORDU.

**Fix:** Yerel bir string tamponu (`girdi`) eklendi: ham metin HER ZAMAN gosterilir (bos/yarim yazim engellenmez), yalnizca `Number.isFinite(v) && v > 0` gecerliyse ust bilesene commit edilir (ayni guard, `setBirimMaliyetKaynagi({ tur: 'elle' })` semantigi DEGISMEDI).

**Mimari not:** Bu mantigi `page.tsx` icinde tutup ayri bir bilesene cikarmayi denedim (`export function BirimMaliyetGirdisi(...)` `page.tsx` icinde) — ama Next.js'in `page.tsx` icin urettigi tip kontrolu (`.next/dev/types/app/hesapla/page.ts`) yalnizca `default` export'a izin veriyor; herhangi bir named export `tsc`te hata veriyor:
```
error TS2344: ... Property 'BirimMaliyetGirdisi' is incompatible with index signature.
```
Bu yuzden bilesen `AdvancedSettingsSections.tsx`e tasindi (zaten `MarketField`, `FormulParamsFields`, `RiskCostFields`in yasadigi, ayni turden desktop-form bilesenlerinin dosyasi) — `BirimMaliyetField` adiyla, `kaynakEtiketi` cagrisini da beraberinde tasidi. `page.tsx`teki eski `kaynakEtiketi(birimMaliyetKaynagi, globalUnitPrice)` literal-string testi de bu yuzden guncellendi (asagida).

Ayrica ilk implementasyonum `useEffect(() => { setGirdi(String(globalUnitPrice)) }, [globalUnitPrice])` kullaniyordu; bu `npx eslint src`te YENI bir hataya yol acti: `react-hooks/set-state-in-effect` ("Calling setState synchronously within an effect can trigger cascading renders"). React'in kendi onerdigi "prop degisince state'i render sirasinda ayarla" desenine gecildi (`if (globalUnitPrice !== oncekiFiyat) { setOncekiFiyat(...); setGirdi(...) }`), `useEffect` importu da artik kullanilmadigi icin kaldirildi.

**Test (yeni dosya `src/app/hesapla/AdvancedSettingsSections.test.tsx`, `/** @jest-environment jsdom */`):**
- `Sarmalayici` adinda gercek page.tsx kullanimini taklit eden bir test-harness bileseni: fiyat/kaynak state'i PARENT'ta yasar, `onBirimMaliyet` parent state'i gunceller ve YENI deger prop olarak geri akar — controlled-input dongusunun taminin.
- 4 test: baslangic deger+etiket, TAMAMEN silme (bos kalir, geri sicramaz), silip yeni deger yazma (hem input hem "Elle girildi" etiketi dogru), gecersiz ara deger ("0") commit edilmez ama alanda gorunmeye devam eder.

**RED/GREEN kaniti (istenen — brief'in orijinal defolu koduna karsi calistirildi):**
1. `BirimMaliyetField`i GECICI olarak brief'in orijinal kodu ile degistirdim (`value={globalUnitPrice}` dogrudan, yerel tampon yok).
2. `npx jest src/app/hesapla/AdvancedSettingsSections --no-coverage`:
   ```
   × alan TAMAMEN silindiginde bos gorunur — eski deger GERI SICRAMAZ
     Expected: ""
     Received: "12000"
   × silindikten sonra yeni bir deger yazilinca hem alan hem kaynak dogru guncellenir
     Expected: "15500"
     Received: "1200015500"
   × gecersiz/sifir ara deger (orn. "0") commit edilmez, ama alanda gorunmeye devam eder
     Expected: "0"
     Received: "120000"
   Tests: 3 failed, 1 passed, 4 total
   ```
   Tam olarak raporlanan bug: eski deger yeni yazilan metnin ONUNE ekleniyor / hic silinmiyor.
3. Duzeltme geri getirildi.
4. `npx jest src/app/hesapla/AdvancedSettingsSections --no-coverage` → `Tests: 4 passed, 4 total` (GREEN).

### Finding 3 — baslik stili kardeslerinden farkliydi

**Sorun:** Yeni grup basligi `.drawerCardHeader` kullaniyordu (uppercase, `font-weight:900`, `var(--primary)`, letter-spacing, ayri font stack — bir `.drawerCard` kabugu icin tasarlanmis), ama artik hicbir `.drawerCard` onu sarmalamiyor. Bir sonraki kardes grup basligi ("Daire Standardı") duz bir `<h4>` (`.settingsGroup>h4`: 13px, `var(--label-color)`, uppercase degil).

**Fix:** `<div className={styles.drawerCardHeader}>Piyasa Analizi</div>` → `<h4>Piyasa Analizi</h4>` (digger tum kardes gruplarla AYNI desen — `.settingsGroup` DOGRUDAN cocugu).

**Gorsel dogrulama (istenen, Playwright ile `/hesapla`, 1440×900, gercek dev server):**
- `npm run dev:next` ile localhost:3000'de sunucu baslatildi, oturum GEREKMEDEN sayfa 200 dondu ve tam render oldu.
- `getComputedStyle` ile "Piyasa Analizi" (yeni grup) ve "Daire Standardı" (kardes grup) h4'lerinin gercek hesaplanmis stilleri karsilastirildi:
  ```
  Piyasa Analizi:   fontSize=13px fontWeight=700 color=rgb(25,50,79) textTransform=none letterSpacing=normal fontFamily="Inter, ui-sans-serif, system-ui, -apple-system, \"Segoe UI\", Roboto, Arial, sans-serif"
  Daire Standardı:  fontSize=13px fontWeight=700 color=rgb(25,50,79) textTransform=none letterSpacing=normal fontFamily="Inter, ui-sans-serif, system-ui, -apple-system, \"Segoe UI\", Roboto, Arial, sans-serif"
  ```
  **Birebir ayni** — 6 diger `.settingsGroup>h4` kardesiyle de (Ortalama Daire Metrekaresi, İksa Masrafı, Risk Payı, Müteahhit Kazancı) ayni degerler dogrulandi.
- Ekran goruntusu (1440×900, sidebar ustu): "Piyasa Analizi" basligi "Proje Bilgileri" basliginin hemen altinda, ayni gorsel agirlikta digger gruplarla; altinda "Birim inşaat maliyeti · Varsayılan 12.000 TL/m²" satiri ve duzenlenebilir input; onun altinda "Yaklaşık Piyasa Fiyatı" (MarketField). Sira brief'in istedigi gibi: birim maliyet USTTE, MarketField ALTTA.
- Etkilesimli test: input temizlendi (bos kaldi, geri sicramadi — canli DOM'da da Finding 2 dogrulandi), "15750" yazildi → input "15750" gosterdi, etiket "Elle girildi · 15.750 TL/m²" oldu (canli commit dogrulandi).
- Dişli tiklanip cekmece acildi: icerik SADECE "Formül Parametreleri" ve "Proje Maliyet ve Riskleri" kartlarini iceriyor, "Piyasa Analizi" YOK (Finding 1 canli DOM'da da dogrulandi).
- 1440×900'de genel yerlesim (sag sonuc paneli, Hesap Özeti, LocationSelector konteyneri, alt bilgi) GORSEL OLARAK degismedi — yalnizca sol sidebar'in en ustune yeni bir grup eklendi, geri kalan her sey ayni sirada.
- Dev server test sonunda durduruldu (`taskkill`), `curl` ile port 3000'in kapandigi dogrulandi.

### Son doğrulama (tüm bulgular giderildikten sonra)

```
npx jest --no-coverage
```
```
Test Suites: 98 passed, 98 total
Tests:       704 passed, 704 total
Snapshots:   0 total
```

```
npx tsc --noEmit
```
(boş çıktı — 0 hata)

```
npx eslint src
```
`✖ 12 problems (2 errors, 10 warnings)` — baseline ile birebir aynı (yeni ihlal yok; `react-hooks/set-state-in-effect` hatası dahil giderildi).

### Değişen/eklenen dosyalar (bu tur)

- `C:\Users\emre\Desktop\arsabil-main\.claude\worktrees\mobil-liquid-glass\src\app\hesapla\page.tsx` (BirimMaliyetField'e devredildi, h4 basligi, kaynakEtiketi importu kaldirildi)
- `C:\Users\emre\Desktop\arsabil-main\.claude\worktrees\mobil-liquid-glass\src\app\hesapla\AdvancedSettingsSections.tsx` (yeni `BirimMaliyetField` bileseni)
- `C:\Users\emre\Desktop\arsabil-main\.claude\worktrees\mobil-liquid-glass\src\app\hesapla\AdvancedSettingsSections.test.tsx` (yeni test dosyası)
- `C:\Users\emre\Desktop\arsabil-main\.claude\worktrees\mobil-liquid-glass\src\app\hesapla\pageStyles.scope.test.ts` (iki assertion düzeltildi/güncellendi)

### Commit

`dd122d8` — `fix(hesapla): review findings on task 8 - discriminating test, input clear bug, header consistency`

### Kalan endişeler

- Yok. Üç bulgu da düzeltildi, discriminating-test kanıtı ve computed-style/görsel doğrulama tamamlandı, tam paket + tsc + eslint temiz.
