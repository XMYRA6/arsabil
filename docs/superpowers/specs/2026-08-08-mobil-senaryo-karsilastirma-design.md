# Mobil Senaryo Karşılaştırma — Tasarım

**Tarih:** 2026-08-08
**Durum:** Onaylandı (brainstorming), implementasyon planı bekliyor.

## Problem

Masaüstünde `/hesapla`'da tam çalışan bir senaryo kaydetme/karşılaştırma özelliği var: "+ Karşılaştır" butonu
(`page.tsx:410-418`) mevcut sonucu `savedScenarios`'a ekler (en fazla 3), kaldırılabilir pill'ler
(`page.tsx:420-437`) gösterilir, 2+ senaryo olunca `<ScenarioCompare>` (`src/components/ScenarioCompare.tsx`)
tablo halinde render olur — PDF indirme + paylaşım linki dahil.

**Mobil `/hesapla` (`HesaplaMobile.tsx` ve alt bileşenleri) bu özelliği HİÇ içermiyor** — ne "+ Karşılaştır"
butonu, ne `savedScenarios` state'i, ne `<ScenarioCompare>` render'ı, hiçbiri yok. Bu, 2026-07-29'dan beri
hafızada "mobile port DEĞİL, iki platform için yeni UX" notuyla bekleyen bir kalemdi.

**Önemli teknik keşif:** `ScenarioCompare.tsx`'in kendisi ZATEN mobil-uyumlu — `.tableWrap`/`.mobileCards`
arasındaki geçiş tamamen CSS `@media (max-width: 768px)` (`ScenarioCompare.module.css:140-146`) ile yapılıyor,
JS/prop tarafında hiçbir platform ayrımı yok. Yani bileşenin kendisine DOKUNULMUYOR — yalnızca mobil tarafta
onu tetikleyecek/barındıracak bir "yaprak" ekran ve giriş noktası eksik.

## Karar: mevcut `savedScenarios` state'ini mobile prop olarak akıt, yeni bir "yaprak" ekle

`HesaplaMobile`'ın kurulu mimarisi ("state SAHİPLENMEZ, `page.tsx`'te yaşar, prop olarak gelir") ve zaten
kanıtlanmış "derinleştirme yaprağı" deseni (`AnalizSekmesi`/`FiyatAciklamasi` — başlık + etiketli "Kapat"
satırı, `HesaplaMobile` sadece açık/kapalı durumuna göre bu bileşeni render eder) AYNEN uygulanır. Yeni bir
state modeli, yeni bir API/backend değişikliği YOK — bu tamamen bir UI wiring işi.

**Akış:**
1. Sabit CTA çubuğuna (`StickyActionBar`) mevcut büyük CTA'nın yanına küçük, ikincil bir **"+ Karşılaştır"**
   butonu eklenir. `!result || savedScenarios.length >= 3` iken disabled (masaüstüyle birebir aynı koşul).
   Tıklanınca `handleAddScenario` (page.tsx'te değişmeden) mevcut sonucu senaryo olarak ekler — ekran
   DEĞİŞMEZ, kullanıcı aynı yerde kalır.
2. `savedScenarios.length > 0` olduğunda, ana kaydırma akışının SONUNDA (`GirdiKarti` + "Gelişmiş ayarlar"
   butonunun altında — masaüstünde `actionsSection`'ın `<main>` sütununun en altında olmasının mobil
   karşılığı) kaldırılabilir pill'ler (masaüstündeki `.scenarioPill`/`.scenarioPillRemove` deseninin mobil
   kopyası) gösterilir.
3. `savedScenarios.length >= 2` olduğunda, pill satırının yanına **"Karşılaştır (N) ›"** çipi eklenir — bu,
   karşılaştırma yaprağını açan TEK tetikleyicidir. Tıklanınca `page.tsx`'te yeni `karsilastirmaAcik` state'i
   `true` olur (mevcut `analizAcik`/`fisAcik` ile birebir aynı desen).
4. Yeni `SenaryoKarsilastirmaSekmesi.tsx` (`AnalizSekmesi`/`FiyatAciklamasi` ile birebir aynı desen: başlık +
   etiketli "Kapat" satırı, paylaşılan `styles.aciklamaBaslikMetin`/`styles.aciklamaKapat` CSS sınıfları
   yeniden kullanılır) mevcut `<ScenarioCompare scenarios={savedScenarios} onShareRequest={...} />`'ı
   **HİÇ DEĞİŞTİRİLMEDEN** render eder — mobil kart görünümü otomatik devreye girer (CSS media query).
   `onShareRequest` masaüstündekiyle birebir aynı `/api/compare/share` fetch mantığını kullanır.

### Reddedilen alternatifler

- **Ana akışa gömme (masaüstü gibi, tam `ScenarioCompare` inline):** Kullanıcı tercihiyle reddedildi — mobilde
  sayfa uzunluğunu ciddi artırır, kanıtlanmış "yaprak" deseninden sapar.
- **BottomSheet ile:** Kullanıcı tercihiyle reddedildi — proje zaten "yaprak" (tam ekran, `MobileScreen`
  içeriğinin yerini alan) desenini bu tür derinleştirmeler için kullanıyor; BottomSheet farklı bir amaç için
  (parsel doğrulama gibi kısa/geçici etkileşimler) ayrılmış.
- **Giriş noktasını ayrı bir menü/sheet'e koymak:** Kullanıcı tercihiyle reddedildi — sabit CTA çubuğundaki
  ikincil buton masaüstündeki "hep görünür" davranışına en yakın, ekstra tıklama gerektirmiyor.

## Mimari

1. **`src/app/hesapla/mobile/SenaryoKarsilastirmaSekmesi.tsx`** (yeni) — Props: `scenarios: ScenarioItem[]`,
   `onRemove: (id: string) => void` YOK (kaldırma ana akıştaki pill'lerde kalır, yaprak salt görüntüleme +
   paylaşım + PDF), `onKapat: () => void`, `onShareRequest: (ids: string[]) => Promise<string | null>`.
   `scenarios.length < 2` iken `<ScenarioCompare>`'ın kendi "Karşılaştırma için en az 2 senaryo gereklidir"
   boş-durum mesajını zaten gösterdiğini not et — bu yaprak ayrıca bir boş-durum YAZMAZ (zaten `ScenarioCompare`
   içeride hallediyor, dedup).
2. **`HesaplaMobileProps`** genişler: `savedScenarios: ScenarioItem[]`, `onAddScenario: () => void`,
   `onRemoveScenario: (id: string) => void`, `karsilastirmaAcik: boolean`, `onKarsilastirmaAc: () => void`,
   `onKarsilastirmaKapat: () => void`, `onShareRequest: (ids: string[]) => Promise<string | null>`.
   (`ScenarioItem` tipi `page.tsx`'ten import edilir — export edilmesi gerekiyor, şu an dosya-lokal.)
3. **`HesaplaMobile.tsx`** — `karsilastirmaAcik` durumuna göre `AnalizSekmesi`/`FiyatAciklamasi` ile aynı
   üst-seviye dallanmaya eklenir (`analizAcik ? <AnalizSekmesi/> : karsilastirmaAcik ? <SenaryoKarsilastirmaSekmesi/> : (...)`).
   Ana dalın SONUNA (mevcut "Gelişmiş ayarlar" butonundan sonra), `savedScenarios.length > 0` iken pill satırı
   + (2+ ise) "Karşılaştır (N) ›" çipi eklenir. `StickyActionBar` içine ikincil "+ Karşılaştır" butonu eklenir.
4. **`page.tsx`** — `karsilastirmaAcik` state'i eklenir (`useState(false)`), `HesaplaMobile`'a yukarıdaki yeni
   prop'lar geçilir (`savedScenarios`/`handleAddScenario`/`handleRemoveScenario` zaten var, sadece prop olarak
   akıtılıyor; `onShareRequest` masaüstündeki `ScenarioCompare` çağrısındaki inline fonksiyonla AYNI mantık —
   tek bir `handleShareScenarios` fonksiyonuna çıkarılıp iki yerde de (masaüstü JSX + mobil prop) kullanılır,
   kod tekrarı önlenir). `ScenarioItem` interface'i `export` edilir.

## CSS notu (implementasyon planına aktarılacak)

`StickyActionBar.module.css:29-32`'deki `.bar > * { flex: 1; ... }` kuralı, çubuğa eklenecek ikinci butonu
birincil CTA ile EŞİT genişlikte yapar (istenmeyen — ikincil eylem masaüstünde de daha küçük/ikincil
görünüyor). İki buton için: birincil CTA `flex: 1` (mevcut genişliği korur), ikincil "+ Karşılaştır" butonu
`flex: 0 0 auto` (içerik genişliği) olacak şekilde class-özel bir override eklenmeli — `.bar > *`'ın genel
kuralını miras almak yerine.

## Kenar durumlar

- **3 senaryo doluyken CTA'daki "+ Karşılaştır":** Masaüstündeki `title="Maksimum 3 senaryo"` davranışı
  mobilde de korunur (disabled + aynı `title` attribute, dokunmatik cihazlarda tooltip görünmese de erişilebilirlik
  için değerli).
- **Yaprak açıkken bir pill kaldırılırsa (`savedScenarios.length` 2'den 1'e düşerse):** `ScenarioCompare`
  kendi "en az 2 senaryo gereklidir" boş-durumunu gösterir (yaprak kapanmaz, kullanıcı "Kapat"a basana kadar
  açık kalır) — masaüstünde de aynı davranış zaten var (pill kaldırılınca `<ScenarioCompare>` şartı
  `savedScenarios.length >= 2` false olur ama masaüstünde bu component'in DOM'dan kalkması demek; mobilde
  yaprak açık kalıp içeriği boş-duruma döner — küçük bir platform farkı, kasıtlı: kullanıcı yaprak içindeyken
  aniden ana ekrana atılmasın).
- **`result === null` iken (henüz hesaplama yapılmadı):** CTA'daki "+ Karşılaştır" zaten disabled, pill satırı
  hiç render edilmez (`savedScenarios.length` zaten 0'dır bu durumda pratikte).

## Test etkisi

- `SenaryoKarsilastirmaSekmesi.test.tsx` (yeni): `scenarios.length < 2` iken `ScenarioCompare`'ın boş-durum
  mesajını gösterdiği, `onKapat` çağrıldığı, "Kapat" satırının `AnalizSekmesi`/`FiyatAciklamasi` ile aynı
  yapıda olduğu.
- `HesaplaMobile.test.tsx`: yeni prop'ların doğru koşullarda render/disabled davranışı (pill satırı, "+
  Karşılaştır" butonu, "Karşılaştır (N) ›" çipinin yalnızca 2+ senaryoda göründüğü, `karsilastirmaAcik` true
  iken `SenaryoKarsilastirmaSekmesi`'nin render olduğu).
- `page.test.tsx`: `karsilastirmaAcik` state geçişinin `HesaplaMobile`'a doğru prop olarak aktığı (mevcut
  `analizAcik`/`fisAcik` testleriyle aynı desen).
- `mobileStyles.scope.test.ts`: yeni CSS sınıflarının (pill satırı, "+ Karşılaştır" butonu, "Karşılaştır ›"
  çipi) var olduğu regresyon guard'ı (projenin mevcut scope-test alışkanlığı).

## Doğrulama

- Mekanik: `npx tsc --noEmit` + tam jest suite yeşil.
- Canlı (Playwright, mobil viewport 390×844): en az 2 senaryo kaydet → "Karşılaştır (2) ›" çipi görünür →
  tıklanınca yaprak açılır, kart görünümünde (masaüstü tablo DEĞİL) karşılaştırma görünür → "Kapat" ana ekrana
  döner, pill'ler hâlâ orada → bir pill kaldırılır → yaprak tekrar açılınca boş-durum mesajı görünür.
