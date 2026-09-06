# TÜİK Demografi Katmanı (Alt-proje 6c) — Design Spec

> **İlişkili:** `project_arsabil_edermi_rakip` dekompozisyonunun 6c parçası. Rakip
> `edermi.com`'un raporunda "TÜİK Demografi (her metriğe emlak yorumu)" kilitli bir
> bölüm; ArsaBil'de demografi katmanı hiç yok (`grep -rni "tuik\|demografi"` → 0).
> Emsal desen: `AreaPriceStat`/`AreaPriceTrend` (model + aggregate script + saf lib +
> `card.ts` DI + `DegerKarti` üye-gated blok). 6a Fiyat Trendi'nin `priceTrend`
> entegrasyonu bu spec'in birebir modelidir.
>
> **Rev 2 (2026-09-07):** Task 1 keşfi sonrası çekme yöntemi + metrik seti
> değişti — bkz. "Task 1 Bulguları" ve "Kararlar (rev 2)".

## Product Decision

ArsaBil'in Değer Kartı (`/deger`) bir parselin tahmini değerini + bölge ₺/m² +
sismik/taşkın riski + emsal ilanları + fiyat eğilimini gösteriyor. Eksik olan:
**bölgenin demografik profili** — nüfus büyüyor mu, genç mi, hane yapısı ne. Bu,
emlak talebini doğrudan besleyen bir sinyal ve rakipte var.

TÜİK ilçe demografisi **tek bir ulusal veri kümesi** (crawl'ladığımız Trabzon-pilot
fiyat verisinin aksine). Bu katman ~970 ilçenin tamamı için tek seferde
yayınlanabilir — fiyat verimizin hiç olmadığı yerlerde bile çalışan bir derinlik.

Bu katman fizibilite/değerleme hesabı YAPMAZ; yalnızca bölgesel demografik bağlam
sunar. Yorumlama (uzman görüşü) Akif'in işi — bu spec yalnızca **tek kural-tabanlı
özet cümle** üretir.

## Core User Story

> "Bir parselin değerine baktım. Bu ilçe canlı mı, nüfusu büyüyor mu, yaş yapısı
> ne — ortağıma göstermeden önce bölgenin demografik gidişatını görmek istiyorum."

## Task 1 Bulguları (2026-09-07, tarayıcı keşfi)

TÜİK verisi üç yoldan alınabiliyor; ilçe kırılımı gerçeği yolları kısıtladı:

| Metrik | MEDAS (public, kırılgan UI) | Toplu İndirme / SDMX API |
|---|---|---|
| Nüfus (ilçe) | ✓ | ✓ `DF_ADNKS_T22` — **ilçe** |
| Yıllık nüfus artış hızı ‰ (ilçe) | ✓ doğrudan | ✓ `DF_ADNKS_T38` "İl ve İlçelere Göre Yıllık Nüfus Artış Hızı" — **ilçe**, doğrudan |
| Medyan yaş | belki (doğrulanmadı) | ✗ `DF_ADNKS_T23` — **yalnız il** |
| Ortalama hane büyüklüğü | belki | ✗ `DF_ADNKS_T25` — **yalnız il** |
| Net göç hızı ‰ | belki | ✗ katalogda **yok** (yalnız "beyin göçü") |

- **SDMX REST API** (`nsiws.tuik.gov.tr/rest/data/...`) SDMX-CSV / JSON döndürüyor,
  ama **auth zorunlu**: `giris.tuik.gov.tr`'den token → API Key gerektirir → Türk
  telefon numarasıyla SMS doğrulaması (ya da `info@tuik.gov.tr` e-posta talebi).
- **MEDAS** (`biruni.tuik.gov.tr/medas/?kn=95`) public, auth yok — ama sihirbaz
  otomasyonu kırılgan (native select'ler, timeout'lar) ve 3 metriğin ilçe dönüşü
  spike'ta doğrulanamadı.

## Kararlar (rev 2 — brainstorming'de kapandı)

| Konu | Karar |
|---|---|
| Veri kaynağı | **TÜİK SDMX REST API** (`nsiws.tuik.gov.tr/rest`), SDMX-CSV formatı |
| Çekme yöntemi | Auth'lu `fetch()` — **Playwright YOK**. Token: API Key → OAuth `password` grant |
| Kod yeri | Yine `crawler/tuik/` giriş noktası (`CrawlRun` takibi + izole tsconfig/jest yeniden kullanılır) |
| Granülerlik | Nüfus + artış hızı **ilçe**; medyan yaş + hane **il** değeri, ilin tüm ilçelerine yayılır ("İl geneli" etiketiyle açıkça) |
| Metrikler | **Çekirdek 4**: `population` (ilçe) · `populationGrowthPerMille` ‰ (ilçe) · `medianAge` (il) · `avgHouseholdSize` (il). **Net göç ÇIKARILDI** |
| Yorum katmanı | **Tek** kural-tabanlı özet cümle (yalnız artış hızı + medyan yaş sinyali), LLM yok |
| Erişim katmanı | **Üye-gated** (trend/emsal ile aynı; anonim payload'a hiç konmaz) |
| Tazeleme | Elle `npm run crawl:tuik`, yılda bir (ADNKS Şubat'ta yayınlanır). Cron yok |

## Mimari & Veri Akışı

```
TÜİK SDMX REST API (nsiws.tuik.gov.tr/rest, auth: Bearer token)
  ↑ token: POST giris.tuik.gov.tr/realms/web/protocol/openid-connect/token
           (grant_type=password, client_id=nsi-ws-consumer, api_key=<API_KEY>)
  → [crawler/tuik/] her dataflow için:
       GET /rest/data/TR,<DATAFLOW>,<VER>?format=SDMX-CSV&startPeriod=<yıl>&endPeriod=<yıl>
  → parse SDMX-CSV → satır { REF_AREA kodu, TIME_PERIOD, OBS_VALUE }
  → REF_AREA kodu → il/ilçe adı (CL_ADRESSEL_KONUM / CL_IL_ILCE kod listesi, bir kez indirilir)
  → normalize (normalizeAreaName ile katlanmış il/ilçe anahtarı — İ/ı/ç)
  → merge: ilçe satırları (T22/T38) + il satırları (T23/T25 → ilin tüm ilçelerine yayılır)
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
  population               Int?      // ilçe değeri (DF_ADNKS_T22)
  populationGrowthPerMille Float?    // ilçe değeri, ‰ (DF_ADNKS_T38)
  medianAge                Float?    // İL değeri (DF_ADNKS_T23) — ilin tüm ilçelerine kopyalanır
  avgHouseholdSize         Float?    // İL değeri (DF_ADNKS_T25) — ilin tüm ilçelerine kopyalanır
  source                   String    // "tuik-adnks-sdmx"
  fetchedAt                DateTime
  updatedAt                DateTime  @updatedAt
  @@unique([il, ilce])
  @@index([il])
}
```

- İlçe başına **tek satır**, en güncel TÜİK yılı. Geçmiş serisi YOK (v1).
- `medianAge` ve `avgHouseholdSize` ilçe kırılımında yayınlanmadığı için **il
  değeri**; kart bunları "İl geneli" olarak etiketler (yanıltıcı olmasın).
- Metrik kolonları **nullable** — bir dataflow çekilemezse o alan `null` kalır.
- Migration elle yazılır (proje konvansiyonu), önce dev DB, prod'a batch deploy'da.
- Anahtar `normalizeAreaName`'den geçmiş `il`/`ilce` (`AreaPriceStat` ile aynı).

### Crawler — `crawler/tuik/`

```
crawler/tuik/
  auth.ts       — API Key → access token (POST openid-connect/token). Token bellekte, tur boyu.
  datasets.ts   — DATAFLOWS: 4 dataflow ref (id + versiyon + hangi model alanı + il mi ilçe mi)
                  + REF_AREA kod listesi eşlemesi. DATA_YEAR sabiti.
  fetchData.ts  — tek dataflow'u SDMX-CSV olarak çeker (Bearer token, startPeriod=endPeriod=yıl)
  parse.ts      — SDMX-CSV → satır { refAreaCode, value } ; saf, fixture'lı test
  areaCodes.ts  — REF_AREA kodu → { il, ilce | null } ; CL kod listesinden türetilmiş statik harita
  merge.ts      — ilçe satırları + il-yayılımı → MergedDistrictRow[] ; saf, test
  upsert.ts     — DistrictDemographics upsert (UPSERT, silme yok); DI'lı client
  run.ts        — giriş noktası (npm run crawl:tuik); token al → 4 dataflow çek → merge → upsert
                  → CrawlRun aç/kapat; --dry-run bayrağı
  README.md     — API Key kurulumu, çalıştırma, yıllık tazeleme
crawler/__tests__/tuik/  — parse + areaCodes + merge + upsert birim testleri (fixture'lı)
```

**`crawler/`'dan yeniden kullanılan:** izole `tsconfig.json`/`jest.config.js` (CI'da
`tsc -p crawler/tsconfig.json` + `npm run test:crawler` zaten var) · `CrawlRun` modeli.
**`fetcher/`, `config.ts` gecikme sabitleri, `blockDetector.ts` KULLANILMAZ** —
Playwright yok, TÜİK API rate-limit dostu.

**`CrawlRun` semantiği:** liste-crawl'a özel kolonları genel anlamda kullanılır —
`listingsUpserted` = yazılan ilçe satırı sayısı, `source="tuik"`, `il="ALL"`,
`category="demografi"`. Yeni migration gerektirmez.

**Yeni bağımlılık:** YOK. SDMX-CSV düz metin, elle satır-parse edilir. Token isteği
`fetch` + `URLSearchParams` ile.

**REF_AREA → il/ilçe:** SDMX-CSV `REF_AREA` sütunu TÜİK'in kendi konum kodudur
(ör. `TR900` benzeri İBBS + ilçe kodu). `areaCodes.ts` bu kodları il/ilçe adına
çevirir — kod listesi (`/rest/codelist/TR/<CL>/<ver>`) bir kez indirilip statik bir
harita olarak repo'ya yazılır (Task 1 çıktısı). ~970 ilçe + 81 il, ~1050 satır.

### Saf lib — `src/lib/demografi/`

```
src/lib/demografi/
  types.ts          — DistrictDemographicsRecord (4 metrik + dataYear), DemographicsSummary
  summarize.ts      — summarizeDemographics(record) → { sentence: string | null }
  summarize.test.ts
```

`summarizeDemographics` — deterministik, eşik → metin. Net göç olmadığı için
birincil sinyal **yıllık nüfus artış hızı**:

- artış ≥ +10‰ → *"Bu ilçede nüfus belirgin şekilde büyüyor — konut talebi güçlü."*
- artış ≤ −10‰ → *"Nüfus hızla azalıyor — konut talebi zayıf olabilir."*
- −10‰ < artış < +10‰ → *"Nüfus görece durağan; belirgin bir demografik baskı yok."*
- artış `null` → `sentence: null` (kart yalnız ham rakamları gösterir)
- medyan yaş ≤ 32 → cümle sonuna *" Genç nüfus yapısı."*; ≥ 40 →
  *" Yaşlanan nüfus."* (medyan yaş null ise ek yok)

İlçe-only olduğu için Değer Kartı tarafında **fallback zinciri yok** — kayıt ya var
ya yok. (İl-yayılımı crawler'da yapılır, kart bunu bilmez.)

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
    medianAge: number | null          // il geneli
    avgHouseholdSize: number | null    // il geneli
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
        medianAge: true, avgHouseholdSize: true,
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
  *"Bölge Demografisi · İlçe geneli"* + özet cümle (varsa) + metrik satırları
  (`memberRow` deseni):
  - "Nüfus: {population}" ve "Yıllık nüfus artışı: {±X,X‰}" — sade
  - "Medyan yaş: {X,X} *(il geneli)*" ve "Ortalama hane: {X,X kişi} *(il geneli)*"
  - küçük *"Kaynak: TÜİK {dataYear}"* notu
- anonim: mevcut `gatedWrap`/`blurred`/`overlay` deseni → blur + *"Ücretsiz
  üyelikle aç"* / *"Üye Ol"* (`/register?callbackUrl=...`)
- format: nüfus `toLocaleString('tr-TR')`; ‰ `+X,X‰` / `−X,X‰` (negatifte gerçek
  eksi işareti U+2212); medyan yaş `X,X`; hane `X,X kişi`
- yalnız `!= null` olan metrik satırı render edilir
- CSS: yeni sınıflar `DegerKarti.module.css`'e; `trendBlock`/`emsalBlock` görsel
  diliyle tutarlı

## Hata Yönetimi

- **Token alınamadı** (API Key geçersiz/süresi dolmuş): tur baştan abort, hiçbir
  satır yazılmaz, `CrawlRun` `blocked=true` + `notes="auth failed"`.
- **Bir dataflow 4xx/5xx / boş döndü:** o metrik için `null`, tur devam eder,
  `CrawlRun.notes`'a hangi dataflow'un düştüğü yazılır. Bir sonraki tur düzeltir.
- **HİÇBİR dataflow çekilemedi:** hiçbir satır yazılmaz (`districtPrices` disiplini —
  yarım veri hiç veriden kötü), `CrawlRun` `blocked=true`.
- **REF_AREA kodu haritada yok** (TÜİK yeni ilçe kodu): o satır atlanır, sayaç
  `notes`'a yazılır — insan `areaCodes.ts`'i günceller.
- **Kart — `districtDemographics` tablosu yok / sorgu hata verdi:** `catch → null`,
  demografi bloğu hiç render edilmez, kartın geri kalanı etkilenmez.
- **Kayıt var ama tüm metrikler null:** `demographics` DTO'ya konur (dataYear ile),
  `summary: null`, hiç `!= null` metrik yoksa blok gösterilmez.

## Test Stratejisi

- **crawler** (`crawler/__tests__/tuik/`):
  - `parse` — fixture SDMX-CSV → doğru `{refAreaCode, value}` satırları; ondalık `,`
    veya `.` ; boş `OBS_VALUE` → atlanır
  - `areaCodes` — bilinen kodlar doğru il/ilçe'ye çözülür; bilinmeyen kod → null
  - `merge` — ilçe satırları + il-yayılımı: bir ilin medyan yaşı o ilin HER ilçesine
    kopyalanır; ilçe-only alanlar (pop/growth) yayılmaz; İ/ı normalize
  - `upsert` — UPSERT davranışı, silme yok, mock client
- **lib**: `summarizeDemographics` — 3 artış dalı + medyan yaş ekleri + null dalı
  (RED→GREEN, saf fonksiyon tam kapsam)
- **card.ts**: `findDistrictDemographics` mock → `memberView` DTO'da `demographics`
  var; anon'da YOK; kayıt `null` ise alan eklenmez; `findDistrictDemographics`
  normalize edilmiş args alır; parsel bulunamazsa çağrılmaz
- **DegerKarti**: üye → metrikler + özet + "(il geneli)" etiketi render; anonim →
  blur overlay + "Üye Ol"; hiçbir `fetch` çağrılmaz; `summary: null` → cümle yok
  ama metrikler var
- **regresyon**: `tsc` (app + `crawler/tsconfig.json`) + jest (app + `test:crawler`)
  + `npm run build` temiz

## Kapsam Dışı (Non-Goals)

- Mahalle seviyesi demografi
- Demografi geçmiş serisi / trend grafiği
- **Net göç hızı** (TÜİK SDMX kataloğunda yok — MEDAS scraping istemiyoruz)
- Çekirdek-4 dışı metrikler (yaş dağılımı %, eğitim, konut satış, nüfus yoğunluğu) —
  ayrı bir takip turu
- MEDAS (`biruni.tuik.gov.tr`) scraping
- Otomatik/cron tazeleme
- Akif'in demografiyi tool olarak kullanması
- İlçe demografi SEO sayfası (alt-proje 6b'nin işi)
- Anonim / paylaşımlı (WhatsApp botu dâhil) demografi erişimi

## Ön Koşul (kod değil — KULLANICI yapar)

1. **TÜİK API Key:** Veri Portalı'na (`veriportali.tuik.gov.tr`) kullanıcı adı/şifre
   ile giriş → "Kullanıcı Bilgileri" → SMS ile telefon doğrulama → API Key üret.
   Türk telefonu yoksa `info@tuik.gov.tr`'ye talep. Key → `.env` `TUIK_API_KEY`
   (yerelde `crawl:tuik` için) ve prod deploy anında Coolify env'e.
2. İlk `npm run crawl:tuik` turu **prod deploy'dan sonra** çalıştırılır;
   `DistrictDemographics` migration'ı batch deploy planındaki diğer migration'larla
   birlikte prod'a uygulanır.

## Açık Kalan Teknik Kararlar (implementasyon Task 1'de kapatır — API Key gerekir)

- 4 dataflow'un **kesin versiyon numaraları** (`DF_ADNKS_T22` → `1.1`? `1.2`?) —
  `GET /rest/dataflow/TR/DF_ADNKS_T22/latest` ile doğrulanır
- Her dataflow'un **DSD boyut sırası** (seri anahtarı şablonu) ve hangi boyutun
  `REF_AREA`, hangisinin gösterge/cinsiyet olduğu — `GET /rest/datastructure/...`
- `REF_AREA` kod listesinin adı/versiyonu (`CL_IL_ILCE`? `CL_ADRESSEL_KONUM`?) ve
  ilçe kodlarının formatı → `areaCodes.ts` haritası
- `medianAge` T23'te cinsiyet boyutu var → "Toplam" (`_T`) değeri seçilir
- SDMX-CSV sütun başlıkları (`OBS_VALUE`, `REF_AREA`, `TIME_PERIOD` standart ama
  doğrulanmalı) ve ondalık ayıracı
- Token TTL / yenileme gereği (tek tur ~10 istek, muhtemelen gerek yok)
