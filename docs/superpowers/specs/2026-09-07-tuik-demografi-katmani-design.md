# TÜİK Demografi Katmanı (Alt-proje 6c) — Design Spec

> **İlişkili:** `project_arsabil_edermi_rakip` dekompozisyonunun 6c parçası. Rakip
> `edermi.com`'un raporunda "TÜİK Demografi (her metriğe emlak yorumu)" kilitli bir
> bölüm; ArsaBil'de demografi katmanı hiç yok (`grep -rni "tuik\|demografi"` → 0).
> Emsal desen: `AreaPriceStat`/`AreaPriceTrend` (model + aggregate script + saf lib +
> `card.ts` DI + `DegerKarti` üye-gated blok) ve `districtPrices/data.ts` (tipli,
> doğrulanmış statik veri + disiplinli seed). 6a Fiyat Trendi'nin `priceTrend`
> entegrasyonu bu spec'in birebir modelidir.

## Product Decision

ArsaBil'in Değer Kartı (`/deger`) bir parselin tahmini değerini + bölge ₺/m² +
sismik/taşkın riski + emsal ilanları + fiyat eğilimini gösteriyor. Eksik olan:
**bölgenin demografik profili** — nüfus büyüyor mu, göç alıyor mu, genç mi. Bu,
emlak talebini doğrudan besleyen bir sinyal ve rakipte var.

TÜİK ilçe demografisi **tek bir ulusal veri kümesi** (crawl'ladığımız Trabzon-pilot
fiyat verisinin aksine). Bu katman ~970 ilçenin tamamı için tek seferde
yayınlanabilir — fiyat verimizin hiç olmadığı yerlerde bile çalışan bir derinlik.

Bu katman fizibilite/değerleme hesabı YAPMAZ; yalnızca bölgesel demografik bağlam
sunar. Yorumlama (uzman görüşü) Akif'in işi — bu spec yalnızca **tek kural-tabanlı
özet cümle** üretir.

## Core User Story

> "Bir parselin değerine baktım. Bu ilçe canlı mı, insanlar buraya mı taşınıyor
> yoksa terk mi ediyor, nüfus yapısı ne — ortağıma göstermeden önce bölgenin
> demografik gidişatını görmek istiyorum."

## Kararlar (brainstorming'de kapandı)

| Konu | Karar |
|---|---|
| Veri kaynağı yönetimi | `crawler/` altında ayrı giriş noktası (`crawler/tuik/`) |
| Çekme yöntemi | **B** — Playwright sorgu arayüzünü sürer, xlsx/csv **export** indirir, parse eder (DOM kazıma değil) |
| Granülerlik | Yalnız **ilçe** seviyesi (fallback zinciri yok) |
| Metrikler | **Çekirdek 5**: nüfus · yıllık nüfus artış hızı (‰) · medyan yaş · ortalama hane halkı büyüklüğü · net göç hızı (‰) |
| Yorum katmanı | **Tek** kural-tabanlı özet cümle (eşik → metin), LLM yok |
| Erişim katmanı | **Üye-gated** (trend/emsal ile aynı; anonim payload'a hiç konmaz) |
| Tazeleme | Elle `npm run crawl:tuik`, yılda bir. Cron yok. |

## Mimari & Veri Akışı

```
TÜİK portalı (data.tuik.gov.tr — İstatistiksel Tablolar)
  → [crawler/tuik/] Playwright: çekirdek-5'in her tablo grubu için sorgu arayüzünü
       sür (İlçe kırılımı + en güncel yıl) → export (csv tercih, yoksa xlsx) indir
  → parse → satır { il, ilce, <metrikler>, dataYear }
  → normalize (normalizeAreaName ile katlanmış il/ilçe anahtarı — İ/ı/ç)
  → upsert DistrictDemographics (il_ilce unique, UPSERT — SİLME YOK)
  → CrawlRun (source="tuik", category="demografi") tur özeti

Değer Kartı:
  buildDegerCard → deps.findDistrictDemographics(nIl, nIlce)
     (üye değilse route'ta null döner — anonCardDeps'e KONMAZ)
  → summarizeDemographics(record) → tek kural-tabanlı özet cümle
  → DTO.demographics (yalnız memberView)
  → DegerKarti: trend bloğundan sonra üye demografi bloğu; anonimde blur-overlay
```

**Değişmeyen ilke:** demografi katmanı hiçbir değer/fizibilite hesabına girmez;
yalnızca ayrı bir bağlam bloğu olarak render edilir.

## Bileşenler

### Veri modeli — `DistrictDemographics` (yeni Prisma modeli)

```prisma
model DistrictDemographics {
  id                       String   @id @default(cuid())
  il                       String
  ilce                     String
  dataYear                 Int       // TÜİK referans yılı — "Kaynak: TÜİK 2024" etiketi
  population               Int?
  populationGrowthPerMille Float?    // yıllık nüfus artış hızı ‰
  medianAge                Float?
  avgHouseholdSize         Float?
  netMigrationPerMille     Float?    // net göç hızı ‰
  source                   String    // "tuik-adnks"
  fetchedAt                DateTime
  updatedAt                DateTime  @updatedAt
  @@unique([il, ilce])
  @@index([il])
}
```

- İlçe başına **tek satır**, en güncel TÜİK yılı. Geçmiş serisi YOK (v1).
- Metrik kolonları **nullable** — bir tabloda bir ilçe eksik olabilir.
- Migration elle yazılır (proje konvansiyonu), önce dev DB, prod'a batch deploy'da.
- Anahtar `normalizeAreaName`'den geçmiş `il`/`ilce` (`AreaPriceStat` ile aynı).

### Crawler — `crawler/tuik/`

```
crawler/tuik/
  run.ts        — giriş noktası (npm run crawl:tuik); 5 metriğin çekimini sırayla yürütür,
                  CrawlRun aç/kapat, --dry-run + --headful bayrakları
  datasets.ts   — metrik başına "kaynak modülü": TÜİK tablo kimliği, sorgu parametreleri,
                  export sütunu → model alanı eşlemesi (Task 0 spike doldurur)
  extract.ts    — Playwright sürücüsü: sorgu arayüzüne git, İlçe kırılımı + yıl seç,
                  export tetikle (page.waitForEvent('download')), dosya yolu döndür
  parse.ts      — csv/xlsx → normalize satır { il, ilce, <alanlar>, dataYear }; saf, fixture'lı test
  upsert.ts     — DistrictDemographics upsert (UPSERT, silme yok); DI'lı client
  README.md     — çalıştırma adımları, yıllık tazeleme kadansı
crawler/__tests__/tuik/  — parse + normalize + upsert birim testleri (fixture'lı)
```

**`crawler/`'dan yeniden kullanılan:** izole `tsconfig.json`/`jest.config.js` (CI'da
`tsc -p crawler/tsconfig.json` + `npm run test:crawler` zaten var) · `config.ts`
gecikme/pacing sabitleri · `CrawlRun` modeli.

**Hedeflenen küçük iyileştirme (kapsam içi):** `crawler/fetcher/browser.ts`'in
context kurulumu (UA / `locale: tr-TR` / `timezoneId` / `navigator.webdriver`
maskesi) şu an `createFetcher` gövdesine gömülü. TÜİK sürücüsü tam bir Playwright
`page` (tıklama + `waitForEvent('download')`) istiyor; `Fetcher` arayüzü yalnız
`get(url) → {html,status}`. Ortak `crawler/fetcher/context.ts`
(`launchContext(cfg, opts) → { browser, context }`) çıkarılır; `createFetcher` ve
TÜİK `extract.ts` ikisi de kullanır. Kopya-yapıştır önlenir.

**`blockDetector.ts` kullanılmaz** — TÜİK'te PerimeterX/anti-bot yok.

**Yeni bağımlılık:** TÜİK export CSV sunuyorsa **sıfır dep** (elle satır parse).
Yalnız xlsx varsa `exceljs` (npm `xlsx`/SheetJS tedarik-zinciri gerekçesiyle
tercih edilmez). Kesin karar Task 0 spike'ta.

**`CrawlRun` semantiği:** liste-crawl'a özel kolonları (`listingsFound`,
`listingsUpserted`) genel anlamda kullanılır — `listingsUpserted` = yazılan ilçe
satırı sayısı, `category="demografi"`. Yeni migration gerektirmez.

### Saf lib — `src/lib/demografi/`

```
src/lib/demografi/
  types.ts          — DistrictDemographicsRecord (5 metrik + dataYear), DemographicsSummary
  summarize.ts      — summarizeDemographics(record) → { sentence: string | null }
  summarize.test.ts
```

`summarizeDemographics` — deterministik, eşik → metin. Birincil sinyal nüfus artışı
+ net göç:

- artış ≥ +5‰ **ve** net göç > 0 →
  *"Bu ilçede nüfus büyüyor ve net göç pozitif — konut talebi destekleniyor."*
- artış ≤ −5‰ **veya** net göç ≤ −10‰ →
  *"Nüfus geriliyor ya da ilçe net göç veriyor — konut talebi zayıf olabilir."*
- ikisi arası →
  *"Nüfus ve göç dengeli; belirgin bir demografik baskı yok."*
- medyan yaş ≤ 30 → cümle sonuna *" Genç nüfus yapısı."*; ≥ 40 →
  *" Yaşlanan nüfus."*
- artış **ve** net göç ikisi de `null` → `sentence: null` (kart yalnız ham
  rakamları gösterir)

İlçe-only olduğu için **fallback zinciri yok** (fiyat/trend'deki mahalle→ilçe→il
gibi değil) — kayıt ya var ya yok.

### Değer Kartı entegrasyonu

**`src/lib/deger/card.ts`:**
- `DegerCardDeps` + zorunlu
  `findDistrictDemographics: (il: string, ilce: string) => Promise<DistrictDemographicsRecord | null>`
  (zorunlu alan → `/api/deger/kart` ve WhatsApp route TS ile eklemeye zorlanır —
  planlı downstream tsc hatası)
- `DegerCardDTO` + opsiyonel alan (yalnız `memberView`):
  ```ts
  demographics?: {
    dataYear: number
    population: number | null
    populationGrowthPerMille: number | null
    medianAge: number | null
    avgHouseholdSize: number | null
    netMigrationPerMille: number | null
    summary: string | null
  }
  ```
- `buildDegerCard`: `Promise.all`'a `deps.findDistrictDemographics(nIl, nIlce)`
  eklenir; kayıt varsa `summarizeDemographics` çağrılır; `opts.memberView && rec`
  ise DTO'ya konur (trend deseniyle birebir).

**`src/lib/deger/anonCardDeps.ts`:** dönüş tipi
`Omit<DegerCardDeps, 'findAreaTrend' | 'findDistrictDemographics'>` olur;
`findDistrictDemographics` de üye-özel, `createAnonCardDeps`'e KONMAZ.

**`src/app/api/deger/kart/route.ts`:** deps'e eklenir —
```ts
findDistrictDemographics: async (il, ilce) => {
  if (!userId) return null
  try {
    return await prisma.districtDemographics.findUnique({
      where: { il_ilce: { il, ilce } },
      select: {
        dataYear: true, population: true, populationGrowthPerMille: true,
        medianAge: true, avgHouseholdSize: true, netMigrationPerMille: true,
      },
    })
  } catch {
    return null   // tablo henüz migrate edilmemişse /deger'i düşürme (trend'deki savunma)
  }
}
```

**`src/app/api/whatsapp/webhook/route.ts`:** `cardDeps`'e
`findDistrictDemographics: async () => null` eklenir (bot demografi göstermez).

**`src/components/deger/DegerKarti.tsx`:** trend bloğundan sonra, disclaimer'dan
önce yeni blok —
- üye (`isMember && card.demographics`): `divider` + label
  *"Bölge Demografisi · İlçe geneli"* + özet cümle (varsa) + 5 metrik satırı
  (`memberRow` deseni) + küçük *"Kaynak: TÜİK {dataYear}"* notu
- anonim: mevcut `gatedWrap`/`blurred`/`overlay` deseni → blur + *"Ücretsiz
  üyelikle aç"* / *"Üye Ol"* (`/register?callbackUrl=...`)
- format: nüfus `toLocaleString('tr-TR')`; ‰ değerleri `+X,X‰` / `−X,X‰`
  (negatifte gerçek eksi işareti); medyan yaş `X,X`; hane `X,X kişi`
- CSS: yeni sınıflar `DegerKarti.module.css`'e; `trendBlock`/`emsalBlock`
  görsel diliyle tutarlı

## Hata Yönetimi

- **Crawler — export indirilemedi / sorgu arayüzü değişti:** o metrik için `null`
  yaz, turu abort etme, `CrawlRun.notes`'a hangi metriğin başarısız olduğunu yaz.
  Bir sonraki tazeleme düzeltir.
- **Crawler — hiçbir metrik çekilemedi:** `CrawlRun` `blocked=true` + `notes`,
  hiçbir satır yazılmaz (yarım veri, hiç veriden kötü — `districtPrices` disiplini).
- **Kart — `districtDemographics` tablosu yok / sorgu hata verdi:** `catch → null`,
  demografi bloğu hiç render edilmez, kartın geri kalanı etkilenmez.
- **Kayıt var ama tüm metrikler null:** `demographics` DTO'ya konur (dataYear ile),
  `summary: null`, kart "veri bulunamadı" yerine mevcut alanları gösterir; hiç
  alan yoksa blok gösterilmez.

## Test Stratejisi

- **crawler** (`crawler/__tests__/tuik/`): `parse` (fixture csv/xlsx → doğru
  satırlar; İ/ı/ç normalize; eksik hücre → null); `upsert` (UPSERT davranışı, silme
  yok, mock client)
- **lib**: `summarizeDemographics` — 3 ana eşik dalı + medyan yaş ekleri + tam
  eksik-veri dalı (RED→GREEN, saf fonksiyon tam kapsam)
- **card.ts**: `findDistrictDemographics` mock → `memberView` DTO'da `demographics`
  var; anon'da YOK; kayıt `null` ise alan hiç eklenmez; `summarize` çıktısı DTO'ya
  taşınıyor
- **DegerKarti**: üye → 5 metrik + özet cümle render; anonim → blur overlay +
  "Üye Ol"; hiçbir `fetch` çağrılmaz
- **regresyon**: `tsc` (app + `crawler/tsconfig.json`) + jest (app + `test:crawler`)
  + `npm run build` temiz

## Kapsam Dışı (Non-Goals)

- Mahalle seviyesi demografi
- Demografi geçmiş serisi / trend grafiği (fiyat trendi gibi)
- Çekirdek-5 dışı metrikler (yaş dağılımı %, eğitim, konut satış istatistikleri) —
  ayrı bir takip turu
- TÜİK API entegrasyonu (biruni/İstatistiksel Tablolar JSON)
- Otomatik/cron tazeleme
- Akif'in demografiyi tool olarak kullanması
- İlçe demografi SEO sayfası (alt-proje 6b'nin işi)
- Anonim / paylaşımlı (WhatsApp botu dâhil) demografi erişimi

## Ön Koşul (kod değil)

İlk `npm run crawl:tuik` turu **prod deploy'dan sonra** VPS'te çalıştırılır;
`DistrictDemographics` migration'ı batch deploy planındaki diğer migration'larla
(`Neighborhood`, `AreaPriceStat`, `AreaPriceTrend`, `WhatsappConversation`,
`WhatsappSubscription`, `AkifTurnLog`) birlikte prod'a uygulanır.

## Açık Kalan Teknik Kararlar (implementasyon planına / Task 0 spike'a bırakılan)

- TÜİK'in çekirdek-5 için hangi tabloları ilçe kırılımında + indirilebilir
  sunduğu; export formatı (csv vs xlsx) → bağımlılık kararı
- Sorgu arayüzünün gerçek DOM yapısı / navigasyon adımları (Playwright selektörleri)
- `netMigrationPerMille` ve `populationGrowthPerMille`'nin TÜİK'te doğrudan mı
  verildiği yoksa ham sayılardan mı türetileceği
- `medianAge` bazı yıllarda yalnız il seviyesinde olabilir → ilçe yoksa alan null
