# Hesapla Sayfası — UX/UI Yeniden Tasarımı + Kritik Bug Düzeltmeleri

**Tarih:** 2026-07-24
**Durum:** Onaylandı (brainstorming), plan aşamasına geçiliyor.

## Arka Plan / Motivasyon

Kullanıcının müdürü, Hesapla (`/hesapla`) bölümünü "tamamen bozuk" ve "kullanılamaz/karışık" olarak nitelendirdi. `Arsabil Denklemleri.docx` (orijinal formül spesifikasyonu — Word denklem nesneleri (OMML) içeriyordu, doğru okumak için özel parser yazıldı) ile mevcut kod karşılaştırıldı ve canlı ortamda (Docker + dev server + Playwright) doğrulandı:

- **Matematik motoru (`engine_v2.ts`) doğru ve dokümanla birebir uyumlu.** 16/16 jest testi geçiyor. `SPEC.md` ile de tutarlı. Bu çalışma motoru DEĞİŞTİRMİYOR.
- **Asıl kırık yer arayüzde, 3 somut bug:**
  1. **Ölü state / eksik kontrol:** `ownerApartmentCount` (`page.tsx:67`, sabit `8`) hiçbir UI elemanı tarafından değiştirilmiyor. "Toplam Daire Sayısı" (Sd) modu varsayılan açık geliyor ve arsa payı sessizce `8/totalApartments` olarak sabitleniyor — kullanıcının "20 dairede bana 6 daire" gibi gerçek bir pazarlığı girmesinin hiçbir yolu yok. Görünür % slider'ı sürüklemek ise Sd modunu otomatik kapatıyor (`page.tsx:548-551`, `756-759`), bu da Sd-tabanlı "Arsa Fiyatı" hesabını sessizce devre dışı bırakıyor.
  2. **Yanlış/görünmez varsayılan piyasa fiyatı:** `manualMarketPrice` varsayılanı `"7.500.000"` (`page.tsx:84`) — kullanıcı hiç dokunmasa bile bu rastgele değer "piyasaya göre %X ucuz/pahalı" kıyaslamasına sessizce karışıyor. Alan ayrıca masaüstünde varsayılan olarak gizli (sadece ⚙ ayarlar çekmecesinde) — kullanıcı "hangi fiyat üzerinden hesap yapıldığını" göremiyor.
  3. **Tutarsız grafik girdisi:** `SensitivityChart`/`BreakEvenChart` çağrılarında (`page.tsx:829`, `847`) birim inşaat fiyatı (`P`) sabit `10000` kodlanmış — gerçek `globalUnitPrice` (admin/ilçe kaynaklı) ile uyuşmuyor, bu yüzden bu grafikler ana sonuçla çelişen rakamlar gösterebiliyor.

Kullanıcı, mevcut arayüzü yamamak yerine baştan bir UX/UI çalışması istedi ve brainstorming sürecinde şu kararlar netleşti (aşağıda detaylandırılıyor).

## Kapsam

**İçinde:** `src/app/hesapla/page.tsx`, `page.module.css`, `AdvancedSettingsSections.tsx`, yeni bir sticky özet şeridi bileşeni, yukarıdaki 3 bug'ın düzeltilmesi (redesign'ın doğal bir parçası olarak, ayrı bir "fix" adımı yok).

**Dışında:** `CalculatorEngineV2`/`engine_v2.ts`/`SPEC.md` (değişmiyor), PDF rapor üretici, `/api/reports`, `ScenarioCompare`, `LocationSelector`/ilçe fiyat entegrasyonu, `StickyActionBar` (mobil alt aksiyon çubuğu — ayrı bileşen), diğer sayfalar (marketplace/dashboard/listing — "Mühür Lacivert" kimliği zaten bu sayfalarda ayrı çalışmalarla var, buradan etkilenmiyor). "Adımlı (wizard)" akış kullanıcı tarafından açıkça reddedildi (profiller sadece müteahhit değil, tek-sayfa canlı hesaplama korunacak).

## Bilgi Mimarisi Kararı

Brainstorming sırasında görsel eşlikçi (Superpowers visual companion) ile 3 yön karşılaştırıldı: (A) Fiş/Makbuz modeli, (B) Adımlı wizard, (C) Sabit özet şeridi. Kullanıcı **A+C birleşimini** onayladı, B'yi kapsam dışı bıraktı.

### C — Sticky Özet Şeridi (`HesapOzetiSeridi`)
- **Masaüstü:** `position: sticky; top: 0`, sağ panelin (`rightGrid`) en üstünde, scroll'da kaybolmaz.
- **Mobil:** sticky DEĞİL — normal blok, `mainPanel`'in en üstünde (mevcut `StickyActionBar` ile çakışmaması için; o zaten ayrı ve alt aksiyon amaçlı).
- İçerik: Daire Fiyatı (büyük rakam), Arsa Payı özeti (`%30 (6/20 daire)` — Sd açıkken; sadece `%30` — Sd kapalıyken), Piyasa Fiyatı input'u (**her zaman görünür, ilk kez birincil akışta** — artık ⚙ çekmeceye gizli değil), ve mevcut `SealBadge` ("Canlı Mühür") component'i aynen reuse edilir (yeni animasyon yazılmıyor).
- Piyasa fiyatı boşken (yeni varsayılan) karşılaştırma satırı hiç render edilmez, `SealBadge show=false` kalır.

### A — Hesap Fişi (`HesapFisi`)
- Mevcut `mainPanelResults`/`blueBox` alanının yerini alır.
- **Her zaman açık** (kullanıcı kararı — "izlenebilirlik = güven", kapalı/genişletilebilir yapı reddedildi).
- Satır satır, sade etiket+değer formatında: `Mi → Ma → M → ×K → FD → FDbirim → (Sd açıksa) FA`.
- Görsel olarak mevcut `--seal-*` token paletini kullanır (yeni renk icat edilmiyor). **Önemli mimari not:** bu token'lar şu ana kadar SADECE mobilde tanımlıydı (`@media(max-width:768px)` içinde); bu çalışma aynı paleti masaüstüne de genişletir (ilk kez).

### Diğer Bileşen Değişiklikleri

- **`ownerApartmentShare` slider'ı iki yerde eklenir** (kod tabanında "Toplam Daire Sayısı" kontrolü zaten iki ayrı yerde tanımlı, aynı desen izlenir, tek state paylaşılır):
  - Masaüstü: `page.tsx` içindeki `desktopSidebar`'ın satır-içi "Toplam Daire Sayısı" bloğuna (`page.tsx:417-432`).
  - Mobil: paylaşılan `AdvancedSettingsSections.tsx` → `FormulParamsFields` bileşenine (bu bileşen hem mobil akordeon hem masaüstü çekmece tarafından reuse ediliyor).
- **Fix: `SensitivityChart`/`BreakEvenChart` çağrıları** (`page.tsx:829, 847`) — `P: 10000` yerine `P: globalUnitPrice` (gerçek admin/ilçe kaynaklı değer). Bu, "Arka Plan" bölümünde tanımlanan 3. bug'ın düzeltmesi.
- `MarketField` artık sadece "gelişmiş ayarlar" içinde değil, birincil sticky şeritte de kullanılacağı için basit, prop'lu, tekrar-kullanılabilir bir input olarak kalır (drawer'daki kopyası senkron, aynı `manualMarketPrice` state'i).

## State Modeli Değişiklikleri

- **Kaldırılıyor:** `ownerApartmentCount` state'i ve onu kullanan ölü türetme mantığı (`page.tsx:155-165`).
- **Yeni:** Sd modu açıkken tek gerçek kaynak `ownerApartmentShare: number` (0..`totalApartments` arası ayrık daire sayısı — doküman terimiyle "Sdx girdisi"). `x = ownerApartmentShare / totalApartments`. Yüzde bu değerden türetilir ve salt-okunur küçük yazıyla gösterilir; asla bağımsız olarak sürüklenip Sd modunu bozmaz.
- Sd modu **kapalıyken** (yeni varsayılan): tek kaynak mevcut `landShareRatio` (%) state'i, davranış değişmiyor.
- **`manualMarketPrice` varsayılanı** `"7.500.000"` → `""`. `marketPriceNum` zaten `parseInt(...|| '0')` ile 0'a düşer, `SealBadge`'in `show` koşulu (`marketPriceNum > 0`) sayesinde ekstra kod değişikliği gerekmez.
- Yeni bir "özet şerit" state'i yok — mevcut `result` (`CalculationOutput`) ve `marketPriceNum`'dan türetilir.

## Varsayılan Davranışlar (Kullanıcı Kararları)

- Sayfa ilk açıldığında **"Toplam Daire Sayısı" (Sd) modu KAPALI** gelir — kullanıcı sadece % ile başlar, hiçbir zaman anlamsız/sabit bir sayı ile (eski `8/24`) başlamaz. İsteyen kullanıcı toggle'ı açıp daire-sayısı moduna geçer.
- Hesap Fişi **her zaman açık**, "Detayları Göster" gibi bir gizleme adımı yok.

## Kenar Durumlar

- `totalApartments = 0` → `ownerApartmentShare` slider'ı `0`'a düşer, `x=0`; `engine_v2.ts`'teki mevcut `safeX` clamp (`Math.min(Math.max(x,0),0.999)`) zaten güvenli.
- `ownerApartmentShare > totalApartments` (kullanıcı toplam sayıyı sonradan azaltırsa) → yeni bir `useEffect` guard'ı ile `Math.min(ownerApartmentShare, totalApartments)` clamp edilir.
- Piyasa fiyatı boş → karşılaştırma satırı render edilmez (yukarıda ele alındı).
- Sd kapalıyken `FA`/`Sdx`/`FAbirim` → `engine_v2.ts` zaten `null` döndürüyor, Hesap Fişi'nde bu satırlar hiç render edilmez (mevcut davranış).
- PDF/rapor kaydetme (`handleSaveReport`/`handlePdfDownload`) hâlâ `landShareRatio`'yu (%) okur; Sd modunda bu değer `x*100` olarak senkron tutulur (mevcut `useEffect` deseninin devamı) — rapor tarafında değişiklik gerekmez.

## Test Stratejisi

- `engine_v2.test.ts` **dokunulmuyor** (16/16 geçiyor, motor değişmiyor).
- Yeni jest testleri (`hesapla/page.tsx`, RTL ile, mevcut `pageStyles.scope.test.ts` deseninin devamı):
  1. Sd açıkken `ownerApartmentShare` slider'ı değiştirilince hem % hem `FA`'nın güncellendiğini doğrulayan regresyon testi (asıl bug'ın testi).
  2. Piyasa fiyatı boşken `SealBadge`'in hiç render edilmediğini doğrulayan test.
  3. `totalApartments` azaltılınca `ownerApartmentShare`'in clamp edildiğini doğrulayan test.
- Final doğrulama: gerçek Playwright ile masaüstü + mobil canlı kontrol — sticky şeridin scroll davranışı, Hesap Fişi rakamlarının sticky şeritteki rakamla tutarlılığı, `SensitivityChart`/`BreakEvenChart`'ın artık `globalUnitPrice` ile tutarlı sonuç verdiğinin görsel kontrolü.

## Kabul Edilen Borç / Kapsam Dışı Notlar

- Diğer sayfalara (marketplace/dashboard/listing) "Mühür Lacivert" kimliğinin masaüstü genişlemesi bu çalışmanın kapsamında DEĞİL — sadece Hesapla sayfası.
- Wizard/adımlı akış kullanıcı tarafından bilinçli olarak reddedildi, ileride ayrı bir talep olarak gelebilir ama bu planın parçası değil.
