# TÜİK SDMX Introspection — FINDINGS

> Task 1 çıktısı. `TUIK_API_KEY` ile 2026-09-07'de canlı SDMX REST API'sine karşı
> doğrulandı. **Plan/spec rev 2'nin veri modeli varsayımlarının bir kısmı yanlış
> çıktı — aşağıdaki "Plan sapmaları" bölümüne bak.**

## Kimlik doğrulama

| | |
|---|---|
| Token uç noktası | `https://giris.tuik.gov.tr/realms/web/protocol/openid-connect/token` |
| Gövde | `grant_type=password&client_id=nsi-ws-consumer&api_key=<TUIK_API_KEY>` |
| Content-Type | `application/x-www-form-urlencoded` |
| Yanıt | `{ "access_token": "...", "expires_in": 300, ... }` — **TTL = 300 sn (5 dk)** |
| Veri tabanı | `https://nsiws.tuik.gov.tr/rest` (NSI Web Service v8.15.1.0) |

Token TTL çok kısa (5 dk). Crawl bir turda 4 dataflow çeker; her `fetch` ~30–120 sn
sürebiliyor (sunucu yavaş). **Öneri:** her dataflow isteğinden önce token'ı yenile
ya da 401 alınca bir kez yenileyip tekrar dene.

## Dataflow'lar + DSD

Dört dataflow da **AYNI** DSD'yi paylaşır: `TR:DSD_ADNKS` **v1.7**, **21 boyut**.
Dataflow versiyonları: hepsi **`1.1`**.

| Dataflow | Metrik | Seviye | Pinlenen `ADNKS_GOSTERGE` | Ek satır filtresi |
|---|---|---|---|---|
| `DF_ADNKS_T22` | `population` | ilçe | `NUFUS` | `YERLESIM_YERI_TUR == '_T'` |
| `DF_ADNKS_T38` | `populationGrowthPerMille` | ilçe | `NUFUS_ARTIS_HIZ_YIL` | (yok) |
| `DF_ADNKS_T23` | `medianAge` | il | `ORTANCA_YAS` | `SEX == '_T'` |
| `DF_ADNKS_T25` | `avgHouseholdSize` | il | `ORT_HH_BUYUKLUK` | (yok) |

Her dataflow `INDICATOR=NG_ADNKS` + tek bir `ADNKS_GOSTERGE` değerine kısıtlı;
kalan 18 boyut dönen satırlarda `_Z` (uygulanamaz) — tek istisnalar tabloda.

## Coğrafya — KRİTİK

**Coğrafi kod `REF_AREA`'da DEĞİL, `IKAMET_YERI` boyutundadır.** Dönen her satırda
`REF_AREA == "TR"` (sabit, işe yaramaz). Gerçek il/ilçe kodu `IKAMET_YERI` sütununda:

| Kod biçimi | Adet | Anlam | Kod listesi |
|---|---|---|---|
| `TR`, `TR100`, `TR211`, `TRA11`, `TRC34` … | 81 + ulusal | il (İBBS düzey-3) | `CL_IBBS` v1.2 |
| `1103`, `1421`, `6401` … (4 haneli sayısal) | 973 | ilçe | `CL_IBBS` v1.2 |
| `_T` | 1 | ulusal toplam (atılır) | — |

- İlçe → il eşlemesi `CL_IBBS`'in `Parent` ilişkisinden türetildi (ilçenin parent'ı
  ilin `TRxxx` kodu). `crawler/tuik/areaCodesData.ts` bu haritayı içerir
  (81 il + 973 ilçe = 1054 giriş), İBBS kod listesinden üretildi.
- `DF_ADNKS_T22` ilçe-seviyesi olsa da yanıtı `IKAMET_YERI` = `TRxxx` (il toplamı)
  ve `_T` (ulusal) satırlarını **da** içerir — `resolveArea` + `merge.ts` faz-1'in
  `area.ilce != null` guard'ı bunları eler.

## SDMX-CSV formatı

- `?format=SDMX-CSV` **query parametresi YOK SAYILIYOR** → sunucu GenericData XML döndürür.
  Doğru yol: **`Accept: application/vnd.sdmx.data+csv;version=1.0.0`** başlığı.
- **`Accept-Language: tr` ŞART (bazı istemciler için).** Node `undici` `fetch`
  Accept-Language göndermeden çağırınca sunucu **HTTP 500** + gövde `"languageTag1"`
  döndürüyor. `curl` (Accept-Language göndermez) sorunsuz — istemciye özgü bir NSI
  hatası. `Accept-Language: tr` eklenince `fetch` de 200 alıyor. `fetchData.ts` bu
  başlığı gönderiyor.
- Sütun düzeni: `DATAFLOW, REF_AREA, FREQ, INDICATOR, …(21 boyut)…, TIME_PERIOD,
  OBS_VALUE, OBS_STATUS, TIME_FORMAT, DECIMAL, UNIT_MEASURE, UNIT_MULT`.
- Ondalık ayırıcı: **nokta** (`34.8984734235134`, `-7.85440448180391`). Virgül görülmedi
  (parse.ts'in virgül normalizasyonu zararsız — kalabilir).
- Binlik ayırıcı yok, tırnak yok.
- Negatif değerler var (T38 nüfus artış hızı ‰ — kırsal ilçelerde eksi).

## Seri anahtarı / keyPart

Anahtarsız sorgu (`/rest/data/TR,DF_ADNKS_T22,1.1/?startPeriod=…`) çalışıyor ve yanıt
küçük (en büyüğü T22 ≈ 281 KB / 2615 satır). **Öneri: anahtarsız çek, satırları
`ADNKS_GOSTERGE` + yukarıdaki ek filtreyle istemci tarafında süz.** 20 boyutluk seri
anahtarı elle kurmak kırılgan; `fetchData.ts`'in mevcut `keyPart` mantığı gereksiz.

## Yıl

- **`DATA_YEAR = 2025`.** 2025 ADNKS sonuçları dört dataflow'da da mevcut
  (`startPeriod=2025&endPeriod=2025`). 2024 de var ama bayat.
- 2025 ve 2024 `IKAMET_YERI` kod kümeleri **birebir aynı** (yeni/kaybolan ilçe yok).

## Örnek değerler (2025, doğrulama için)

| | 2025 |
|---|---|
| Türkiye nüfusu (T22 `_T`) | 86.092.168 |
| İstanbul nüfusu (T22 `TR100`) | 15.754.053 |
| Kadıköy nüfusu (T22 `1421`) | 458.573 |
| Türkiye ortanca yaş (T23 `TR`, `SEX=_T`) | 34,90 |
| İstanbul ortanca yaş (T23 `TR100`, `SEX=_T`) | 34,96 |
| Türkiye ort. hane halkı (T25 `TR`) | 3,08 |
| Kadıköy nüfus artış hızı ‰ (T38 `1421`) | −7,85 |

## Fixtures

`crawler/tuik/fixtures/adnks-t{22,23,25,38}-*-2025.csv` — her dataflow'dan kırpılmış
gerçek SDMX-CSV (yalnız kamuya açık toplam istatistik, PII yok). Ulusal + birkaç il +
birkaç ilçe + (T22/T23) kentsel/kırsal ve cinsiyet kırılım satırları — istemci
filtresini test etmek için.

---

## Plan sapmaları (spec rev 2'ye karşı)

Aşağıdakiler merge edilmiş kod (`parse.ts`, `fetchData.ts`, `datasets.ts`) ve spec
ile çelişiyor — Task 1b kapsamında düzeltilmeli:

1. **Coğrafya `IKAMET_YERI`'nde, `REF_AREA`'da değil.** `parse.ts` `REF_AREA` sütununu
   okuyor → her satır için `"TR"` alır → `resolveArea` null → 0 satır. `parse.ts`
   `IKAMET_YERI`'yi okumalı.
2. **Satır filtresi gerekli.** `parse.ts` düz `OBS_VALUE` alıyor; T22 için
   kentsel/kırsal (`YERLESIM_YERI_TUR`), T23 için cinsiyet (`SEX`) kırılım satırları
   da geliyor. Filtresiz merge'de son-yazan-kazanır → yanlış/eksik değer.
   `parse.ts` bir `filter: Record<string,string>` almalı (dataflow'a özel).
3. **`Accept` başlığı.** `fetchData.ts` `?format=SDMX-CSV` kullanıyor → XML döner.
   `Accept: application/vnd.sdmx.data+csv;version=1.0.0` şart.
4. **`DataflowRef` şekli.** `keyDimensions` yerine `gosterge: string` +
   `rowFilter: Record<string,string>` gerekiyor. `keyPart` mantığı silinebilir.
5. **`merge.ts` muhtemelen olduğu gibi çalışır** — `parse.ts` `IKAMET_YERI` kodunu
   `obs.refArea` olarak verirse ve `AREA_CODES` hem ilçe hem il kodlarını içerirse,
   2-fazlı mantık (+ faz guard'ları) doğru. Doğrulanmalı.

## Bilinen veri-kapsama riski (kart JOIN'i)

51 ilçe TÜİK'te `"<İl> Merkez"` adıyla geçiyor (küçük illerin merkez ilçesi —
`1230 Çanakkale Merkez`, `1295 Edirne Merkez` …). Kart okuma tarafı
`districtDemographics.findUnique({ where: { il_ilce: { il, ilce } } })` ile
`normalizeAreaName(parselin ilçesi)` arıyor. TKGM `ilceListe` bu merkez ilçeler için
sıklıkla düz `"MERKEZ"` döndürür → `MERKEZ` ≠ `<İL> MERKEZ` → o ilçede demografi
görünmez (sessiz). Gerçek `crawl:tuik` dry-run'ında TKGM adlarıyla karşılaştırılıp
karar verilmeli (crawler'da alias yaz / okuma tarafında `<il> merkez` fallback'i /
kabul et).
