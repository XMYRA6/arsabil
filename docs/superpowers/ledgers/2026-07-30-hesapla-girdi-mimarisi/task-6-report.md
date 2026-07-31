# Task 6 Report: `HesaplaMobile` ve `page.tsx` bağlaması

## Status: DONE (Fix Round 1 uygulandı)

## Ne yapıldı

### Step 1 — `GirdiKarti`ya konum bloğunu ekledim
- `GirdiKartiProps`a `konum: KonumBloguProps` alanı eklendi.
- `GirdiKarti` fonksiyonunda `<KonumBlogu {...konum} />` kartın **en üstünde**
  render ediliyor (diğer satırlar dokunulmadı).
- `GirdiKarti.test.tsx`: `props()` fikstürüne Task 2'nin `KonumBlogu.test.tsx`
  fikstürü aynen taşındı (`FIYATLAR`, `konum: {...}`), brief'teki
  `'konum blogu kartin EN USTUNDE'` testi eklendi.

### Step 2 — `HesaplaMobile` sadeleştirildi
- Başlıktaki konum çipi (`headerChip`) ve dişli butonu (`headerIconBtn`) JSX'ten
  silindi; başlık artık yalnızca logo + "Hesapla".
- `SekmeSecici` importu ve `.sekmeKap` sarmalayıcısı silindi.
- `HesaplaMobileProps`: `konumEtiketi`, `onKonumAc`, `aktifSekme`,
  `onSekmeDegis` kalktı; yerine `analizAcik: boolean`, `onAnalizAc: () => void`,
  `onAnalizKapat: () => void` geldi (brief'teki tanım aynen).
- `analizAcik` dallanması: `true` ise `AnalizSekmesi` (üstünde etiketli
  "Kapat" satırı, `FiyatAciklamasi`'nin kapat deseniyle aynı — ikon değil
  metin buton), aksi halde mevcut `SonucKarti` + (`fisAcik ? FiyatAciklamasi :
  GirdiKarti + Gelişmiş ayarlar butonu)` akışı korunur.
- Not: `onAnalizAc` prop tipte var (brief'in istediği "produces" sözleşmesi)
  ama component gövdesinde **destructure edilmedi** — çünkü fiilen kullanılmıyor:
  `SonucKarti`'nin kendi `sonuc.onAnalizAc`'ı zaten Task 4'te analiz açma işini
  görüyor (`page.tsx`'teki `sonuc={{ ..., onAnalizAc: () => setMobilAnalizAcik(true) }}`,
  dokunulmadı). `onAnalizAc`'ı sessizce kullanmayan bir yerel değişken olarak
  bırakmak yerine, tipte tutup gövdede atlamayı tercih ettim.

### Step 3 — `page.tsx` bağlandı
- Yeni state: `birimMaliyetKaynagi` (`useState<BirimMaliyetKaynagi>({ tur: 'varsayilan' })`).
- `mobilSekme` state'i ve `MobilSekme` importu silindi.
- `handleIlceChange` brief'teki `ilceSecildi` yardımcısını kullanacak şekilde
  yeniden yazıldı; **sıralama tuzağına dikkat edildi** — `birimMaliyetKaynagi.tur
  === 'elle'` testi `setBirimMaliyetKaynagi(sonuc.kaynak)`'tan ÖNCE okunuyor
  (eski state'i test ediyor, yenisini değil).
- `handleIlChange` ve `handleClearLocation`'ın geri-yükleme dallarına
  `setBirimMaliyetKaynagi(konumTemizlendi(originalUnitPrice).kaynak)` eklendi.
- Mobil dalda `HesaplaMobile`a yeni prop'lar geçirildi; `konum` nesnesi
  `girdi={{ konum: {...}, ... }}` içine kuruldu (çünkü `konum`, Step 1'de
  `GirdiKartiProps`'un bir alanı oldu — `HesaplaMobileProps`'un değil).
  `analizAcik`/`onAnalizAc`/`onAnalizKapat` `HesaplaMobile`a doğrudan
  top-level prop olarak geçti.
- `sonuc={{...}}` ve `GelismisAyarlarSheet` çağrısına dokunulmadı (Task 4/5'in
  işi).

### Fold-in cleanup (CSS)
Brief'in listelediği 3 kalem + kendi tespit ettiğim 2 ek kalem:

| Sınıf | Neden dead | Nasıl doğrulandı |
|---|---|---|
| `.sekmeKap`, `.sekmeKap [role='tablist']`, `.sekmeKap [role='tab']` | `SekmeSecici`/tab strip kalktı | `grep -rn sekmeKap src/` → yalnızca CSS'te vardı, artık hiç yok |
| `.sonucRozet`, `.sonucRozetUcuz`, `.sonucRozetPahali` | Rozet Task 4'te `KarsilastirmaBlogu`'na taşındı (`karsRozet*` kullanıyor) | `grep -rn sonucRozet src/` → hiçbir `.tsx` dosyasında referans yok, yalnızca CSS |
| `.sonucUst`'taki `justify-content: space-between` | Rozet çıkınca tek çocuk kaldı (`sonucFiyatWrap`) | `SonucKarti.tsx`'i okudum: `.sonucUst` artık tek `<div>` sarmalıyor |
| `.headerActions`, `.headerChip`, `.headerChipIcon`, `.headerIconBtn` (+ touch-target `::after`/`position:relative` grup girişleri) | Bu task'ın kendisi (Step 2) bu JSX'i sildiği için orphan oldu; brief'in listesinde yoktu ama aynı ilkeyle (dead CSS) temizledim | `grep -rn "headerChip\|headerActions\|headerIconBtn" src/` → temizlik sonrası sıfır sonuç |

Yeni eklenen CSS: `.analizKapatSatiri` (analiz "Kapat" satırının kendi yatay
kenar boşluğunu taşıması için — `.fiyatAciklamasi`'nin kendi `margin: 0 14px`'i
taşıdığı gibi; `.hesaplaMobilKok`'un düz sütununda hiçbir satırın örtük kenar
boşluğu yok, her kart kendi taşır).

## Brief kapsamının dışına çıkan bir karar — açıkça bildiriyorum

Brief'in "Files" listesi yalnızca `HesaplaMobile.tsx`, `GirdiKarti.tsx`,
`GirdiKarti.test.tsx`, `page.tsx`'i sayıyor ve şunu söylüyor: **"Task 7 owns
`AnalizSekmesi` ve `onKapat` prop'unu ekleyecek. Bu task'ta `analiz` aynen
bugünkü haliyle geçilir."**

Ama üst görev talimatı şunu istiyordu: `grep -rn "SekmeSecici\|sekmeKap\|MobilSekme"
src/` **boş dönmeli**. Bu ikisi çelişiyordu: `SekmeSecici` fonksiyonu ve
`MobilSekme` tipi `AnalizSekmesi.tsx` içinde tanımlıydı (Task 7'nin dosyası),
`HesaplaMobile`'daki tek kullanım yeri kalksa bile TANIM orada kalıyordu; ayrıca
`Analiz.test.tsx`'te bu ikisini test eden ayrı bir `describe` bloğu vardı.

Çözümüm: Bunu "Task 7'ye dokunma" kuralını ihlal etmeden çözülebilir buldum —
`AnalizSekmesi` fonksiyonu, `AnalizSekmesiProps` tipi ve render mantığına HİÇ
dokunmadım (Task 7'nin gerçek malzemesi). Yalnızca artık **hiçbir yerden
çağrılmayan** `SekmeSecici` fonksiyonunu ve `MobilSekme` tipini o dosyadan
sildim (ve kullanılmayan `SegmentedTabs` importunu), `Analiz.test.tsx`'teki
`'HesaplaMobile sekme gecisi'` describe bloğunu (yalnızca `SekmeSecici`'yi test
ediyordu, `AnalizSekmesi`'ni değil) kaldırdım. `AnalizSekmesi`'nin kendi üç
testi (`'AnalizSekmesi'` describe bloğu) dokunulmadan duruyor.

Bunu bir onay isteği olarak değil, şeffaf bir karar kaydı olarak raporluyorum:
gerekçe sağlam görünüyor (ölü kod + üst görevin açık doğrulama şartı), ama
"Task 7 owns AnalizSekmesi" cümlesi net bir sınır çizdiği için bunu
gizlemektense öne çıkarıyorum. Eğer yanlış karar verdiysem, `AnalizSekmesi.tsx`
ve `Analiz.test.tsx`'i bu commit'ten önceki haline geri almak tek satırlık bir
`git revert` parçası olur (7 dosyanın ikisi).

## Doğrulama

### TDD kanıtı
- Step 1'in testi (`'konum blogu kartin EN USTUNDE'`) brief'te verilen kodla
  birebir eklendi ve implementasyon zaten mevcut olduğu için hemen yeşil
  döndü (bu adımda gerçek red-green döngüsü yoktu çünkü `KonumBlogu`
  bileşeni Task 2'de tamamlanmıştı; test yalnızca **entegrasyonu** doğruluyor).
  Testi implementasyonsuz halde çalıştırıp kırmızı gördüm değil — ama testi
  yazdıktan hemen sonra izole çalıştırıp geçtiğini doğruladım:
  `npx jest src/app/hesapla/mobile/GirdiKarti.test.tsx --no-coverage` →
  11/11 PASS (yeni test dahil).
- `handleIlceChange`'in toast dalı brief'in talimatı gereği ayrı bir birim
  testine EKLENMEDİ (saf yardımcı `toast` bilmiyor); Task 10 Step 2'nin
  davranış turunda canlı doğrulanacak — brief'in kendi notu.

### Komutlar ve sonuçlar
- `npx tsc --noEmit` → **0 hata** (iki kez çalıştırıldı: ilk implementasyon
  sonrası ve `AnalizSekmesi`/`Analiz.test.tsx` temizliği sonrası).
- `npx jest --no-coverage` → **691/691 PASS**, 96 test suite.
  (Baseline 692 + 1 yeni `GirdiKarti` testi − 2 kaldırılan `SekmeSecici`
  testi = 691; matematik tutarlı.)
- `npx eslint src` → **12 problem (2 error, 10 warning)** — baseline ile
  birebir aynı, hiçbiri `hesapla/` altında değil (hepsi
  `api/user/export/__tests__/route.test.ts`, `dashboardStyles.scope.test.ts`,
  `app/page.tsx`'te — bu task'ın dokunmadığı dosyalar).
- `mobileStyles.scope.test.ts` (CSS kapsam guard'ı) → PASS.

### İki zorunlu grep (ikisi de boş dönüyor)
```
$ grep -rn "SekmeSecici\|sekmeKap\|MobilSekme" src/
(exit 1, sonuç yok)

$ grep -rn 'aria-label="Gelişmiş ayarlar"' src/
(exit 1, sonuç yok)
```
(İlk grep'te başlangıçta yalnızca benim açıklama yorumlarımda "SekmeSecici"/
"MobilSekme" kelimeleri geçiyordu — kod değil, düz metin. Grep'in harfiyen
boş dönmesi için yorumları da bu kelimeleri içermeyecek şekilde yeniden
yazdım.)

### Masaüstü dokunulmadı mı?
- `git diff -- src/app/hesapla/page.tsx` içinde masaüstü ağacına
  (`styles.container`, `styles.layout`, `desktopSidebar`, `FormulParamsFields`,
  masaüstü `LocationSelector` çağrısı) tek satır dokunulmadığı diff'te
  görülüyor — değişikliklerin hepsi state tanımları, üç handler, ve
  `if (!isDesktopViewport)` bloğunun İÇİNDE.
- `grep -n "onIlChange=|onIlceChange=|onClear="` → tek eşleşme seti, satır
  1064-1066'da, masaüstü `LocationSelector`'ın kendi çağrısında — mobildeki
  yeni `konum={{...}}` nesnesiyle karışmıyor, ikisi ayrı.
- `FormulParamsFields`'ın çağrısına dokunulmadı (grep ile teyit — dosyada
  tek bir çağrı yeri var, Step 3 diff'i onu içermiyor).

## Self-review sonuçları

- **Tek kapı**: Çip, dişli, sekme şeridi — üçü de JSX'ten kalktı. Gelişmiş
  ayarlara giden tek yol artık girdi kartının altındaki etiketli
  "Gelişmiş ayarlar · risk, iksa, kâr" butonu.
- **Masaüstü dokunulmadı**: Yukarıda doğrulandı.
- **Toast sıralaması**: `birimMaliyetKaynagi.tur === 'elle'` testi
  `setBirimMaliyetKaynagi(sonuc.kaynak)`'tan önce çalışıyor — eski kaynağı
  test ediyor.
- **Konum kablolaması**: `parselIsaretli: parcelValue.lat !== null &&
  parcelValue.lng !== null` — gerçek koordinatları yansıtıyor.
  `onParselAc: () => { setMobilAyarBolumu('risk'); setMobilAyarlarAcik(true); }`
  — yaprağı risk bölümüne odaklı açıyor (brief'teki `onKonumAc`'ın eski
  davranışıyla aynı hedef bölüm).
- **State sahipliği**: `HesaplaMobile` hâlâ hiçbir `useState` içermiyor
  (dosyada `useState` araması sıfır sonuç verir); tüm state `page.tsx`'te.
- **Ölü CSS**: Yukarıdaki tabloda her sınıf için grep kanıtı var.
- **Test kalitesi**: `src/app/hesapla` altındaki testlerde `act()` uyarısı
  yok (ayrıca doğrulandı). Tüm test suite'inde görülen `ParcelPicker`
  `act()` uyarıları bu task'ın dokunmadığı bir dosyadan (`src/components/
  listing-wizard/ParcelPicker.tsx`) geliyor — önceden var olan, bu commit'le
  ilgisiz bir gürültü.

## Değiştirilen dosyalar
- `src/app/hesapla/mobile/GirdiKarti.tsx`
- `src/app/hesapla/mobile/GirdiKarti.test.tsx`
- `src/app/hesapla/mobile/HesaplaMobile.tsx`
- `src/app/hesapla/page.tsx`
- `src/app/hesapla/mobile/mobile.module.css`
- `src/app/hesapla/mobile/AnalizSekmesi.tsx` (brief kapsamı dışı — yukarıda gerekçelendirildi)
- `src/app/hesapla/mobile/Analiz.test.tsx` (brief kapsamı dışı — yukarıda gerekçelendirildi)

## Endişeler
- `AnalizSekmesi.tsx`/`Analiz.test.tsx`'e dokunma kararı brief'in açık sınırının
  dışında; gerekçesi yukarıda tam olarak yazılı. Task 7'yi üstlenecek kişi/ajan
  bu dosyaların şu an `SekmeSecici`/`MobilSekme` içermediğini bilmeli (muhtemelen
  sorun değil, zira Task 7 zaten yeni bir "drill-down" tasarımı getirecek).
- `HesaplaMobileProps.onAnalizAc` component gövdesinde hiç kullanılmıyor (yalnızca
  tipte var, brief'in sözleşmesi gereği). Bu kasıtlı ama not etmeye değer:
  gerçek tetikleyici `sonuc.onAnalizAc` (Task 4, `SonucKarti` içinde).
  **[Fix Round 1'de kaldırıldı — aşağıya bakın.]**

---

# Fix Round 1 (review: Needs fixes → 2 Important + 4 Minor)

Commit: `33ffb3c` — fix(hesapla): piyasa fiyati da elle-ezilme uyarisina dahil, kaynak birlikte geri yuklenir

## Finding 1 (Important) — piyasa fiyatı sessizce eziliyordu

**Sorun:** `handleIlceChange`, ilçe seçildiğinde hem `globalUnitPrice`'ı hem
`manualMarketPrice`'ı dolduruyor, ama uyarı yalnızca birim maliyetin
kaynağına (`birimMaliyetKaynagi.tur === 'elle'`) bakıyordu. Kullanıcı
piyasa fiyatını elle yazıp sonra ilçe seçerse, birim maliyet kaynağı
`'ilce'`/`'varsayilan'` olabilir ve toast hiç ateşlenmezken piyasa fiyatı
sessizce eziliyordu — tam olarak önlenmek istenen "neden değişti" hatası.

**Düzeltme:**
- Yeni state: `piyasaFiyatiElle: boolean` (`page.tsx`, `birimMaliyetKaynagi`
  ile aynı bloğa eklendi). Piyasa fiyatının kendi bir `BirimMaliyetKaynagi`
  tipi yok (o tip yalnızca birim maliyet için var), bu yüzden minimum bir
  provenance bayrağı yeterli.
- `sonuc.karsilastirma.onPiyasaFiyati` artık `(v) => { setManualMarketPrice(v);
  setPiyasaFiyatiElle(true); }` — kullanıcı piyasa fiyatını elle
  değiştirdiğinde işaretleniyor.
- `handleIlceChange`: `setPiyasaFiyatiElle(false)` ilçe dolgusuyla birlikte
  yazılıyor (değer artık ilçeden geldi, elle değil).
- Toast kapısı genişledi: `if (birimMaliyetKaynagi.tur === 'elle' ||
  piyasaFiyatiElle)`. **Sıralama burada da önemli**: `setPiyasaFiyatiElle(false)`
  çağrısı `if` kontrolünden ÖNCE yazılıyor ama React state güncellemeleri
  senkron değil — `if` içindeki `piyasaFiyatiElle` closure'daki ESKİ değeri
  okuyor (render'daki değer), yeni `false`'u değil. Yani kullanıcı gerçekten
  elle yazmışsa `if` bunu doğru yakalıyor; `birimMaliyetKaynagi` için
  kullanılan aynı "eski değeri oku, sonra yaz" deseni burada da tekrarlandı.
- `toast(...)` çağrısına eksik olan `{ position: 'top-right' }` eklendi —
  dosyadaki diğer üç `toast.success`/`toast.error` çağrısının hepsi bunu
  zaten kullanıyor (`page.tsx:340,345,349`), yalnızca bu satır eksikti.

## Finding 2 (Important) — temizlenince elle-girilmiş değer "Varsayılan" etiketleniyordu

**Sorun:** `handleIlChange`/`handleClearLocation`'ın geri-yükleme dalları
`originalUnitPrice`'ı geri getiriyordu ama kaynağını her zaman
`konumTemizlendi(...).kaynak` (= her zaman `{tur:'varsayilan'}`) ile
damgalıyordu — `originalUnitPrice`'ın GERÇEK kaynağı ne olursa olsun.

**Sıra ile doğrulama (review'ın verdiği senaryo):**
1. Varsayılan: `globalUnitPrice=12000`, `birimMaliyetKaynagi={tur:'varsayilan'}`.
2. Kullanıcı elle `15000` yazar → `onBirimMaliyet(15000)` →
   `globalUnitPrice=15000`, `birimMaliyetKaynagi={tur:'elle'}`.
   `originalUnitPrice` hâlâ `null` (henüz ilçe seçilmedi).
3. Kullanıcı bir ilçe seçer → `handleIlceChange`: `originalUnitPrice===null`
   olduğu için **hem** `setOriginalUnitPrice(15000)` **hem**
   `setOriginalUnitPriceKaynagi({tur:'elle'})` yazılıyor (düzeltme öncesi
   yalnızca ilki vardı). Sonra `globalUnitPrice` ilçe değerine döner,
   `birimMaliyetKaynagi={tur:'ilce',...}` olur.
4. Kullanıcı konumu temizler → `handleClearLocation`:
   `setGlobalUnitPrice(konumTemizlendi(15000).birimMaliyet)` → `15000`
   (helper artık değeri de TEK kaynaktan veriyor, Minor 2'nin konusu).
   `setBirimMaliyetKaynagi(originalUnitPriceKaynagi ?? konumTemizlendi(15000).kaynak)`
   → `originalUnitPriceKaynagi` `{tur:'elle'}` olduğu için **bu** kullanılıyor,
   `konumTemizlendi`'nin `{tur:'varsayilan'}` fallback'ine hiç düşülmüyor.
   Sonuç: `birimMaliyet=15000`, etiket **"Elle girildi · 15.000 TL/m²"** —
   düzeltme ÖNCESİ bu "Varsayılan 15.000 TL/m²" yazardı (yanlış).
5. `originalUnitPrice`/`originalUnitPriceKaynagi` ikisi de `null`'a dönüyor.

**Düzeltme:** Yeni state `originalUnitPriceKaynagi: BirimMaliyetKaynagi | null`.
`handleIlceChange`'in yakalama dalına eklendi; her iki geri-yükleme dalına
(`handleIlChange`, `handleClearLocation`) `originalUnitPriceKaynagi ?? konumTemizlendi(...).kaynak`
eklendi (kayıtlı kaynak varsa o, yoksa varsayılan fallback), ve temizlik
sırasında `setOriginalUnitPriceKaynagi(null)` de sıfırlanıyor.

## Minor 1 — kullanılmayan `onAnalizAc` kaldırıldı
`HesaplaMobileProps`'tan ve `page.tsx`'teki `<HesaplaMobile onAnalizAc={...} />`
çağrısından silindi. Gerçek tetikleyici `sonuc.onAnalizAc` (Task 4,
`SonucKarti`'nin kendi "Analiz" satırı) zaten var ve dokunulmadı.

## Minor 2 — `konumTemizlendi` artık tek kaynak
`handleIlChange`/`handleClearLocation`'da `setGlobalUnitPrice(originalUnitPrice)`
yerine `setGlobalUnitPrice(konumTemizlendi(originalUnitPrice).birimMaliyet)`
kullanıldı — davranış aynı (helper `varsayilanBirimMaliyet` parametresini
olduğu gibi döndürüyor) ama artık helper gerçekten tek kaynak.

## Minor 3 — Analiz "Kapat" satırına başlık eklendi
`HesaplaMobile.tsx`'te analiz Kapat satırı artık `FiyatAciklamasi`'nin
`.aciklamaBaslik` desenini birebir taşıyor: `<h2 className={styles.aciklamaBaslikMetin}>Analiz</h2>`
+ Kapat butonu, aynı satırda `space-between` ile. `.analizKapatSatiri` CSS'i
`align-items:center; justify-content:space-between; gap:10px` alacak şekilde
güncellendi (kendi `margin:0 14px`'ini koruyarak, çünkü `.aciklamaBaslik`'ın
aksine bu satır `.hesaplaMobilKok`'un düz sütununda doğrudan duruyor).

## Minor 4 — `HesaplaMobile.test.tsx` eklendi ("tek kapı" invaryant guard'ı)
4 test, ~yarım dakika: `AnalizSekmesi` mock'landı (canvas gerektiren grafik
bileşenlerini taşımak için — kendi testleri `Analiz.test.tsx`'te zaten var).
- Gelişmiş ayarlara giden buton tam olarak 1 tane (`getAllByRole('button',
  { name: /Gelişmiş ayarlar/ })` → length 1).
- Başlıkta (`getByRole('banner')` — `<header>`, `<main>` altında değil,
  implicit "banner" rolü taşıyor) `role="tab"` kalıntısı yok. Bilerek TÜM
  sayfada değil, yalnızca başlık bölgesinde arandı — `GirdiKarti`'nin kendi
  "Yapı standardı" segment kontrolü de `role="tab"` kullanıyor ve o kasıtlı,
  ilgisiz bir bileşen.
- `analizAcik` `true`/`false` arasında geçince sonuç kartı ↔ analiz görünümü
  doğru şekilde yer değiştiriyor (`rerender` ile aynı test içinde iki durum
  da doğrulandı).
- Kapat butonu tıklanınca `onAnalizKapat` çağrılıyor.

## Doğrulama (Fix Round 1)

- `npx tsc --noEmit` → **0 hata**.
- `npx jest --no-coverage` → **695/695 PASS**, 97 test suite (691 + 4 yeni
  `HesaplaMobile.test.tsx` testi = 695; matematik tutarlı).
- `npx jest src/app/hesapla/mobile/HesaplaMobile.test.tsx --no-coverage` →
  izole çalıştırıldı, 4/4 PASS, temiz çıktı (act() uyarısı yok).
- `npx eslint src` → **12 problem (2 error, 10 warning)** — baseline ile
  birebir aynı, hiçbiri bu round'da değiştirilen dosyalarda değil.

## Değiştirilen dosyalar (Fix Round 1)
- `src/app/hesapla/page.tsx`
- `src/app/hesapla/mobile/HesaplaMobile.tsx`
- `src/app/hesapla/mobile/mobile.module.css`
- `src/app/hesapla/mobile/HesaplaMobile.test.tsx` (yeni)

## Kalan endişeler
Yok. Reviewer'ın ledger'a attığı iki bulgu (`analizAcik`+`fisAcik` bağımsız
booleanlar olduğu için `fis && analiz` durumunun teorik olarak erişilebilir
olması; `onParselAc`'ın scroll olmadan iki bölümü vurgulaması) bu round'un
kapsamında değil — kararı üst mesajda zaten verilmişti, burada tekrar
açılmadı.
