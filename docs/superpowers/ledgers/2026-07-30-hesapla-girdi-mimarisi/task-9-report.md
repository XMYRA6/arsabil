# Task 9 Raporu: Raporlarım'a PDF indirme

## Durum: TAMAMLANDI — insan karariyla "indirgenmis PDF sablonu" yaklasimi uygulandi

(Asagidaki ilk bolum orijinal NEEDS_CONTEXT raporu; "Ek: Kararla devam"
bolumu koordinatorun rulinginden sonra yapilan isi anlatir.)

## [ORIJINAL RAPOR] Durum: NEEDS_CONTEXT (Step 1-3 tamamlandi, Step 4 blocked)

## Ozet

Brief'in Step 1-3'u (basarisiz test -> RaporPdfButonu bileseni -> yesil test) TDD ile
tamamlandi ve dogrulandi. Step 4 (page.tsx'teki gercek rapor listesine bagla) **kasitli
olarak yapilmadi**: kayitli `Report` veritabani kaydi, PDF ureteciin (`generatePdfReport`
/ `ReportInput`) zorunlu kildigi alanlarin buyuk cogunlugunu hic tasimiyor ve bu alanlar
API'den de gelmiyor. Brief'in kendisi tam bu senaryo icin durup sormayi istiyor
("uydurma deger koyma... hangi alanin nereden geldigi belirsizse dur ve sor").

## Bulgu: eksik alanlar (Step 4 neden blocked)

`Rapor` tipi = `Parameters<typeof generatePdfReport>[0]` = `ReportInput`
(`src/lib/pdf/report_generator.ts` + `src/lib/pdf/ReportDocument.tsx`):

```
interface ReportInput {
  luxLevel: number;
  apartmentSize: number;
  landShareRatio: number;
  totalApartments?: number;
  arsaAlani?: number;
  riskLevel: number;
  builderProfit: number;
  iksaMode: string;
  iksaPercentage?: number;
  iksaManualTL?: number;
  marketPrice: number;
  result: CalculationOutput;   // Mi_base, Mz, Z, Mi, Ma, M, FD_total, FD_per_m2, Sdx, FA, FAbirim
}
```

Sayfanin bugun kullandigi kayit sekli (`src/app/dashboard/reports/page.tsx` `Report`
interface'i, `prisma/schema.prisma` `model Report`, `src/app/api/reports/route.ts` POST/GET,
`src/app/api/user/dashboard/route.ts`):

```
model Report {
  id, title, totalApartments, apartmentSizeSqm, luxLevelModifier,
  landShareRatio, minApartmentPrice, landCost, userId, createdAt
}
```

Karsilastirma:

| ReportInput alani | Kaynak |
|---|---|
| `luxLevel` | `luxLevelModifier` — dogrudan eslesiyor, guvenilir |
| `apartmentSize` | `apartmentSizeSqm` — dogrudan eslesiyor, guvenilir |
| `landShareRatio` | ayni isim, ayni deger — guvenilir |
| `totalApartments` (opsiyonel) | ayni isim — guvenilir |
| `arsaAlani` (opsiyonel) | hic saklanmiyor — opsiyonel oldugu icin omit edilebilir, sorun degil |
| `result.FD_total` | `minApartmentPrice` — `src/app/hesapla/page.tsx:346`'da `minApartmentPrice: result.FD_total` olarak yazildigi dogrulandi, guvenilir |
| **`riskLevel`** | **HIC SAKLANMIYOR.** `Report` modelinde risk'e dair tek alan yok. Zorunlu (opsiyonel degil). |
| **`builderProfit`** | **HIC SAKLANMIYOR.** Motorun `K` katsayisi (`luxLevelModifier` == `L`, farkli alan) DB'ye hic yazilmiyor. Zorunlu. |
| **`iksaMode`** | **HIC SAKLANMIYOR.** `Report` modelinde iksa'ya dair tek alan yok. Zorunlu. |
| **`marketPrice`** | **HIC SAKLANMIYOR.** `src/app/hesapla/page.tsx`'teki POST body'sinde bile bu deger `/api/reports`'a hic gonderilmiyor. Zorunlu. |
| **`result.Mi_base`, `Mz`, `Z`, `Mi`, `M`, `FD_per_m2`, `Sdx`, `FA`, `FAbirim`** | **HIC SAKLANMIYOR.** Yalnizca `landCost` alani var ve o da kayit anlik olarak `result.FA \|\| result.Ma` (`src/app/hesapla/page.tsx:347`) — yani FA mi Ma mi oldugu bile belirsiz, ayrica geri kalan 8 alan icin hicbir kaynak yok. |

`prisma/schema.prisma`'da `Report` modelinde JSON/snapshot alani yok (tek `Json` alani
`Listing.parcelGeometry`, alakasiz). `Listing` modeli de hesaplama girdilerini
(risk/iksa/marketPrice/K) tasimiyor. Yani bu veriler DB'nin hicbir yerinde persist
edilmiyor — sayfadan "tamamlanacak" degil, hic var olmayan veri.

**Sonuc:** `riskLevel`, `builderProfit`, `iksaMode`, `marketPrice` ve
`CalculationOutput`'un 9 alanindan 8'i icin gercek deger yok. Bunlari `0`, `'off'`, `1`
gibi degerlerle doldurup PDF'e basmak, brief'in acikca yasakladigi "uydurma deger"
(mali fizibilite raporunda yanlis veri gosterme) olurdu. Bu yuzden Step 4 STOP edildi.

**Ihtiyac duyulan karar:** Ya (a) `Report` semasina bu alanlari (veya tek bir JSON
snapshot'i) ekleyip gecmise donuk mevcut kayitlar icin bir migration/varsayilan
stratejisi belirlemek, ya da (b) rapor PDF'ini yalnizca "kayit aninda hesaplanan ozet"
(FD_total, landCost, vb.) icin daha kucuk/ayri bir PDF sablonu tasarlamak. Bu karar bu
task'in kapsaminin disinda; insan girdisi gerekiyor.

## Tamamlanan is (Step 1-3)

### Dosyalar
- Eklendi: `src/app/dashboard/reports/RaporPdfButonu.tsx`
- Eklendi: `src/app/dashboard/reports/__tests__/reportsPdf.test.tsx`
- Degistirilmedi: `src/app/dashboard/reports/page.tsx` (Step 4 blocked oldugu icin dokunulmadi)

### TDD Kaniti

**RED** — `npx jest src/app/dashboard/reports --no-coverage`
```
FAIL src/app/dashboard/reports/__tests__/reportsPdf.test.tsx
  ● Test suite failed to run
    Cannot find module '../RaporPdfButonu' from 'src/app/dashboard/reports/__tests__/reportsPdf.test.tsx'
Test Suites: 1 failed, 1 total
```
Beklenen basarisizlik: bilesen dosyasi henuz yoktu.

**GREEN** — `npx jest src/app/dashboard/reports --no-coverage` (RaporPdfButonu.tsx eklendikten sonra)
```
PASS src/app/dashboard/reports/__tests__/reportsPdf.test.tsx
  RaporPdfButonu
    √ tiklaninca PDF uretecini rapor verisiyle cagirir (164 ms)
    √ uretim sirasinda buton devre disi ve durum bildiriliyor (78 ms)
    √ hata durumunda buton yeniden kullanilabilir olur (70 ms)
Test Suites: 1 passed, 1 total
Tests:       3 passed, 3 total
```

### Test fikstürü duzeltmesi (brief'in kendi talimati)

Brief'teki orijinal `RAPOR = { id: 'r1', name: 'Kadıköy Fizibilite', fdTotal: 8964000 }`
fikstürü `Rapor` (== `ReportInput`) tipini karsilamiyordu (zorunlu `luxLevel`,
`apartmentSize`, `landShareRatio`, `riskLevel`, `builderProfit`, `iksaMode`,
`marketPrice`, `result: CalculationOutput` alanlari eksikti). Brief acikca "fikstürü
düzelt, tipi gevşetme" dedigi icin fikstür tamamlandi: butun zorunlu `ReportInput`
alanlari eklendi (degerler bu test icin uydurma/temsili — gercek finansal veri degil,
sadece bilesenin `rapor` prop'unu oldugu gibi ureteciye ilettigini dogrulayan bir birim
testi fikstürü). `id` ve `name` fazladan alanlar olarak korundu (test bunlari
`toMatchObject` ile kontrol ediyor); TypeScript bir degiskene atanan nesne icin fazladan
alan kontrolu yapmadigindan `Rapor` tipine atanabilirlik bozulmuyor.

`act()` sarmalayici eklendi: brief'in orijinal ikinci testinde `cozumle()` cagrisi
`act()` disinda kaliyor ve React "not wrapped in act(...)" uyarisi veriyordu (test yine
de PASS oluyordu, ama cikti kirliydi). `await act(async () => { cozumle() })` ile
degistirilerek uyari giderildi; bu repo'da ayni desen zaten
`src/components/ScenarioCompare.test.tsx`'te kullaniliyor.

### Dogrulama

```
npx jest --no-coverage        -> Test Suites: 99 passed, 99 total / Tests: 707 passed, 707 total (baseline 704 + 3 yeni)
npx tsc --noEmit               -> 0 hata (Rapor tipinin generatePdfReport'tan turetilmesi derleniyor)
npx eslint src                 -> 12 problems (2 errors / 10 warnings) — baseline ile ayni, yeni ihlal yok
```

## Degisen dosyalar
- `src/app/dashboard/reports/RaporPdfButonu.tsx` (yeni)
- `src/app/dashboard/reports/__tests__/reportsPdf.test.tsx` (yeni)

## Self-review bulgulari
- Ilk halde ikinci testte React act() uyarisi vardi; duzeltildi (yukarida).
- Test fikstürü tipi karsilamiyordu; tamamlandi, tip gevsetilmedi (`as never`/`as any` yok).
- `page.tsx`'e dokunulmadi: Step 4 icin gercek veri yok, uydurma deger konulmadi.

## Sonraki adim onerisi
Step 4'u tamamlamak icin once bir karar gerekiyor: Report semasina eksik alanlari
(veya bir JSON snapshot) eklemek mi, yoksa PDF sablonunu "kayit aninda mevcut olan
kucuk veri seti" icin ayri/daha sade bir versiyona indirmek mi? Ikisi de bu task'in
dosya listesinin (yalnizca `page.tsx` + test) disinda semaya/migration'a dokunmayi
gerektirir.

---

## Ek: Koordinatorun rulinginden sonra yapilan is

**Karar (insan onayli):** Semaya dokunulmayacak, motor yeniden calistirilmayacak,
hicbir deger uydurulmayacak. Bunun yerine kayitli raporlar icin **ikinci, indirgenmis
bir PDF sablonu** yazildi — yalnizca Report DB kaydinin gercekten sakladigi 7 alani
basan, ayri bir belge/uretec.

### Ne yapildi

1. **Paylasilan indirme yardimcisi** — `src/lib/pdf/downloadPdf.ts` (yeni).
   `report_generator.ts`'teki blob→URL→`<a>`→click→revoke bloğu buraya tasindi;
   `downloadPdfBlob(element, filenamePrefix)` imzasiyla parametrik hale getirildi
   (dosya adı öneki artık çağrı yerine ait: `ArsaBilRapor` / `ArsaBilRaporOzeti`).
   Hem `report_generator.ts` hem `saved_report_generator.ts` bu tek fonksiyonu
   cagiriyor — blob/indirme mantığının ikinci bir kopyası yok.

2. **Icerik katmani (react-pdf'ten bagimsiz)** — `src/lib/pdf/savedReportContent.ts`
   (yeni). `SavedReportInput` tipini (yalnizca `title`, `totalApartments`,
   `apartmentSizeSqm`, `luxLevelModifier`, `landShareRatio`, `minApartmentPrice`,
   `landCost` — Report DB kaydiyla birebir) ve belgenin bastigi TUM icerigi ureten
   iki saf fonksiyonu barindirir: `buildSavedReportHero` (2 hero-metrik: Daire
   Fiyatı, Arsa Değeri) ve `buildSavedReportRows` (5 govde satiri: Rapor Adı, Daire
   Sayısı, Daire Alanı, Arsa Payı, Kalite Katsayısı). **Bu dosyanin react-pdf'e hic
   bagimliligi yok** — nedeni asagida "neden ayri dosya" bolumunde.

3. **SavedReportDocument.tsx** (yeni) — `ReportDocument.tsx`'in gorsel dilini
   (header/accent bar/hero-kart/veri-satiri stilleri, Roboto font kaydi, renk
   paleti) birebir izleyen, ama govdesi yalnizca `savedReportContent.ts`'in
   urettigi satirlari basan react-pdf `<Document>` bileseni. Motor ciktilarina
   (M, FD_total disinda, risk, iksa, marketPrice) dair TEK bir satir/bolum bile
   yok — sifir/bos deger olarak degil, bolum tamamen atlanarak.

4. **saved_report_generator.ts** (yeni) — `generateSavedReportPdf(input: SavedReportInput)`,
   `SavedReportDocument`'i olusturup `downloadPdfBlob`'a devrediyor. `report_generator.ts`
   (hesaplama ekranindaki tam ureteç) DEGISMEDI (sadece blob adimini paylasilan
   yardimciya tasidi, disaridan gorunen `generatePdfReport(input: ReportInput)`
   imzasi ayni kaldi; `src/app/hesapla/page.tsx`'teki cagrı yeri dokunulmadan
   calisiyor, dogrulandi: `npx tsc --noEmit` 0 hata).

5. **RaporPdfButonu.tsx** — davranis (loading state, uretim sirasinda disabled +
   "Hazırlanıyor…", hata sonrasi buton yeniden aktif) DEGISTIRILMEDI. Yalnizca
   `Rapor` tipinin turetildigi kaynak degisti:
   `Parameters<typeof import('@/lib/pdf/report_generator').generatePdfReport>[0]`
   → `Parameters<typeof import('@/lib/pdf/saved_report_generator').generateSavedReportPdf>[0]`.
   `as any`/`as never` yok, tip hala kaynaktan turetiliyor.

6. **`src/app/dashboard/reports/page.tsx`** — `RaporPdfButonu` import edildi, her
   rapor kartina `<div className={styles.reportPdfAction}><RaporPdfButonu rapor={report} /></div>`
   eklendi. Sayfadaki `Report` arayuzu (`title, totalApartments, apartmentSizeSqm,
   landShareRatio, luxLevelModifier, minApartmentPrice, landCost, ...`) `SavedReportInput`'in
   bir ust-kumesi oldugu icin `report` nesnesi DOGRUDAN `rapor` prop'una geciliyor —
   ek eslestirme/glue kod gerekmedi (yapisal tip uygunlugu `tsc` ile dogrulandi).

7. **`src/app/dashboard/dashboard.module.css`** — `.reportPdfAction` (+ `button`,
   `:hover:not(:disabled)`, `:disabled` alt kurallari) eklendi; `--primary-rgb`/`--border`
   gibi zaten var olan degiskenler kullanildi (yeni renk uydurulmadi). Touch-target
   kurali (`min-height: var(--touch-target)`) YALNIZCA mevcut TEK `@media (max-width: 768px)`
   blogunun icine eklendi — `dashboardStyles.scope.test.ts`'in "tek mobil media
   bloğu olmalı" guard'ı halen gecıyor (asagida dogrulandi).

### `landCost` icin durust etiket karari

`landCost`, kayit aninda `result.FA || result.Ma` olarak yaziliyor
(`src/app/hesapla/page.tsx:347`) — yani FA (toplam arsa degeri) mi Ma (arsa
maliyeti) mi oldugu PDF'i uretirken bilinemiyor. Yeni bir etiket uydurmak yerine,
uygulamanin geri kalaninda bu ayni alan icin ZATEN kullanilan etiket bulundu ve
tekrar kullanildi: `src/app/dashboard/reports/page.tsx:64` (degismeden once de,
degistikten sonra da) bu alani `<strong>Arsa Değeri:</strong>` olarak gosteriyor —
FA/Ma ayrimini hic yapmadan, her iki durumda da. `savedReportContent.ts`'teki
`buildSavedReportHero` ayni etiketi ("Arsa Değeri") kullaniyor. Bu, "iki ihtimalden
hangisi olursa olsun dogru olan bir etiket" sorusuna uygulamanin kendi onceden
verdigi cevaptir — yeni bir yorum icat edilmedi.

### Neden `savedReportContent.ts` ayri bir dosya (react-pdf'ten bagimsiz)

Ilk denemede `buildSavedReportHero`/`buildSavedReportRows` `SavedReportDocument.tsx`
icinde tanimliydi. "Omitted fields" guard testini yazarken bu dosyayi jest'te
import etmek `@react-pdf/renderer`'i de yukluyor; bu paket saf ESM
(`node_modules/@react-pdf/renderer/lib/react-pdf.js` `import * as primitives ...`
ile basliyor) ve repo'nun `jest.config.js`'i (`transformIgnorePatterns` override'i
yok) `node_modules`'u transform etmiyor — sonuc: "Cannot use import statement
outside a module". Repo'da su ana kadar hicbir test react-pdf'i gercekten
yuklemiyordu (butun PDF testleri ureteç modulunu `jest.mock` ile tamamen
degistiriyordu). Yeni bir react-pdf test altyapisi kurmak (transformIgnorePatterns
genisletmek, tum ESM transitive bagimliliklarini cozmek) bu task'in kapsamini asan,
paylasilan jest.config.js'i etkileyen bir degisiklik olurdu. Bunun yerine icerik
uretim mantigi (`savedReportContent.ts`) react-pdf'ten tamamen bagimsiz, saf bir
modul olarak cikarildi; `SavedReportDocument.tsx` bu modulun urettigi satirlari JSX'e
donusturmekten baska bir sey yapmiyor. Guard testi dogrudan bu saf fonksiyonlari
cagiriyor — react-pdf hic yuklenmiyor, testler hizli ve deterministik.

### Kapsayan testler ve komutlar

**Odaklı testler (yeni/degisen dosyalar):**
```
npx jest src/lib/pdf src/app/dashboard/reports --no-coverage
```
```
PASS src/lib/pdf/__tests__/savedReportContent.test.ts
PASS src/app/dashboard/reports/__tests__/reportsPdf.test.tsx

Test Suites: 2 passed, 2 total
Tests:       5 passed, 5 total
```

**RED/GREEN kaniti — "omitted fields" guard testi**
(`src/lib/pdf/__tests__/savedReportContent.test.ts`)

RED: `buildSavedReportRows`'a gecici olarak `{ label: 'Risk Payı', value: '%5' }`
satiri eklenip `npx jest src/lib/pdf/__tests__/savedReportContent.test.ts --no-coverage`
calistirildi:
```
FAIL src/lib/pdf/__tests__/savedReportContent.test.ts
  × yalnizca Report kaydinin sakladigi 7 alani basar (baska hicbir satir yok)
    - Expected  - 0
    + Received  + 1
    ...
    +   "Risk Payı",
  × motor ciktilarina veya saklanmayan girdilere dair hicbir terim icermez
    Expected substring: not "risk"
    Received string: "...{\"label\":\"risk payı\",\"value\":\"%5\"}]"
Tests: 2 failed, 2 total
```
Beklenen basarisizlik: guard'in gercekten bir ihlali yakaladigini kanitlamak icin
kasitli olarak forbidden bir alan eklendi — hem tam-liste (`toEqual`) hem terim
(`not.toContain('risk')`) assertion'i dogru sekilde patladi.

GREEN: satir geri alindi (orijinal `savedReportContent.ts`'e donduruldu), aynı komut:
```
PASS src/lib/pdf/__tests__/savedReportContent.test.ts
  SavedReportDocument icerik uretimi
    √ yalnizca Report kaydinin sakladigi 7 alani basar (baska hicbir satir yok) (4 ms)
    √ motor ciktilarina veya saklanmayan girdilere dair hicbir terim icermez (2 ms)
Tests: 2 passed, 2 total
```

**Tam suite + tsc + eslint (commit oncesi):**
```
npx jest --no-coverage
  -> Test Suites: 100 passed, 100 total / Tests: 709 passed, 709 total
     (onceki commit'teki 707 + yeni 2 = 709)

npx tsc --noEmit
  -> (cikti yok = 0 hata)

npx eslint src
  -> 12 problems (2 errors, 10 warnings) — baseline ile birebir ayni, yeni ihlal yok
```

Cikti temiz: act() uyarisi yok, unhandled promise rejection yok (RaporPdfButonu'nun
3 testi de degismeden hala PASS, `act()` sarmalayicisi korunuyor).

### RaporPdfButonu testinin fikstür guncellemesi

`src/app/dashboard/reports/__tests__/reportsPdf.test.tsx`: mock hedefi
`@/lib/pdf/report_generator` → `@/lib/pdf/saved_report_generator` olarak degisti;
`RAPOR` fikstürü GERCEK bir kayitli-rapor sekline cekildi (`title, totalApartments,
apartmentSizeSqm, luxLevelModifier, landShareRatio, minApartmentPrice, landCost` —
eski `id`/`name`/`fdTotal`/`result` gibi uydurma alanlar kaldirildi, artik `Rapor`
tipiyle 1:1). Assertion `toMatchObject({ name: ... })` → `toMatchObject({ title: ... })`
olarak guncellendi (SavedReportInput'ta `name` yok, `title` var). 3 davranis
(uretecin cagirilmasi; uretim sirasinda disabled+"Hazırlanıyor"; hata sonrasi buton
yeniden kullanilabilir) aynen korundu ve hepsi PASS.

## Degisen/eklenen dosyalar (bu ek is)
- Eklendi: `src/lib/pdf/downloadPdf.ts`
- Eklendi: `src/lib/pdf/savedReportContent.ts`
- Eklendi: `src/lib/pdf/SavedReportDocument.tsx`
- Eklendi: `src/lib/pdf/saved_report_generator.ts`
- Eklendi: `src/lib/pdf/__tests__/savedReportContent.test.ts`
- Degisti: `src/lib/pdf/report_generator.ts` (blob/indirme adimi `downloadPdf.ts`'e tasindi)
- Degisti: `src/app/dashboard/reports/RaporPdfButonu.tsx` (yalnizca tip kaynagi)
- Degisti: `src/app/dashboard/reports/__tests__/reportsPdf.test.tsx` (mock hedefi + fikstür)
- Degisti: `src/app/dashboard/reports/page.tsx` (buton baglandi)
- Degisti: `src/app/dashboard/dashboard.module.css` (`.reportPdfAction` + mobil touch-target)

## Self-review bulgulari (bu ek is)
- Ilk halde `SavedReportDocument.tsx`'te kullanilmayan `reportTitleWrap`/`reportTitle`
  stil tanimlari kalmisti (baslik satira tasindiktan sonra unutulmus); kaldirildi.
- Ilk denemede icerik-uretim fonksiyonlari `SavedReportDocument.tsx` icindeydi;
  guard testi yazarken react-pdf'in ESM'i jest'i patlattigini fark edip
  `savedReportContent.ts`'e ayirdim (yukarida detaylandirildi) — bu, dosyayi
  `plan'in niyetinin otesinde buyutmek` degil, tam tersi: react-pdf'e bagimli
  JSX ile bagimsiz saf mantigi ayirarak her ikisini de daha kucuk/tek-sorumluluklu
  hale getirdi.
- `report_generator.ts`'in disaridan gorunen imzasi/davranisi degismedi; `hesapla/page.tsx`
  cagrı yerine dokunulmadi, tsc bunu dogruladi.
- `dashboardStyles.scope.test.ts`'in "tek `@media (max-width: 768px)` bloğu" guard'ına
  uyuldu — yeni kural mevcut bloğun icine eklendi, ikinci bir blok acilmadi.
- `--seal-*` token'larina dokunulmadi (bu task o alanlari hic etkilemiyor).
- Emoji eklenmedi; sayfadaki onceden var olan emoji/checkmark (`📊`, `✓`) bu
  task'in kapsaminda degil, dokunulmadi.

## Kalan endiseler
- Ozet PDF ile tam fizibilite PDF'i (hesaplama ekraninda) gorsel olarak akraba ama
  icerik olarak farkli iki urun — kullanicinin bu farki anlamasi icin footer'a kisa
  bir aciklama cumlesi eklendi ("...detaylı fizibilite hesaplaması içermez").
  Bunun yeterli oldugunu dusunuyorum ama UX onayi isteyen bir tercih.
- `.reportPdfAction` stili minimal tutuldu (mevcut `--primary`/`--border`
  degiskenleriyle); sayfanin genel gorsel diline uyuyor ama ayrintili bir tasarim
  incelemesi yapilmadi.
