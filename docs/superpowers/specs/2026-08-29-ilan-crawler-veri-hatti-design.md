# İlan Crawler + Veri Hattı — Tasarım (v1)

**Tarih:** 2026-08-29
**Durum:** Onaylandı (brainstorming), uygulama planı bekliyor
**Alt-proje:** 1 / 6 (bkz. "Bağlam" — rakip kapatma yol haritası)

---

## Bağlam ve Amaç

ArsaBil, rakip `edermi.com` karşısında bir **arsa değer/rapor çıktısı** sunamıyor;
kullanıcıdan piyasa fiyatını *istiyor*, üretmiyor. Kök neden: altında **fiyat ve
emsal ilan verisi** yok (`DistrictPrice` tablosu pratikte boş, `ILCE_FIYATLARI = []`).
Rakip analizinde (bkz. `~/.claude/.../memory/project_arsabil_edermi_rakip.md`)
edermi.com'un harita pinlerinin **Sahibinden.com / Emlakjet / Hepsiemlak
ilanlarından** beslendiği, pin popup'larında "Kaynak: Sahibinden.com" yazdığı
doğrulandı.

Bu alt-proje, ArsaBil için **kendi ilan crawler'ını + normalize veri hattını**
kurar. Çıktısı, sonraki alt-projelerin (Değer Kartı, Emsal Harita, AI Uzman
Görüşü) tükettiği temel veri katmanıdır.

### Yol haritasındaki yeri (bilgi amaçlı, bu spec'in kapsamı DEĞİL)

| # | Alt-proje | Bağımlı |
|---|---|---|
| **1** | **İlan Crawler + Veri Hattı** ← bu spec | — |
| 2 | Ücretsiz "Arsa Değer Kartı" | 1 |
| 3 | Emsal ilan + harita katmanı (Nominatim sınır, pin) | 1, 2 |
| 4 | AI "Uzman Görüşü" (Akif) — AL/BEKLE/GEÇ + sesli | 2, 3 |
| 5 | WhatsApp botu | 2 |
| 6 | Derinlik: TÜİK demografi, fiyat trendi, SEO mahalle sayfaları | 1–4 |

---

## Sabitlenen Kararlar

| Konu | Karar | Gerekçe |
|---|---|---|
| Veri kaynağı | Kendi crawler'ımız (satın alma / 3. parti API değil) | Kullanıcı kararı |
| v1 kapsam | 3 portal (Sahibinden + Emlakjet + Hepsiemlak), **tek il**, satılık **arsa/arazi + konut** | Çapraz-kaynak dedup mantığını erken test et |
| İl (v1) | **Trabzon** | Kullanıcının bölgesi; rakip testi orada yapıldı; Akçaabat verisi tanıdık |
| Çekme katmanı | Kendi headless tarayıcı (**Playwright**) + (ileride) residential proxy | Tam kontrol, düşük istek-başı maliyet |
| Çalışma yeri | **Lokal / on-demand** (kullanıcı makinesi), çıktı prod DB'ye | Mevcut VPS kırılgan+paylaşımlı; önce hattı olgunlaştır |
| IP/proxy | Önce **yavaş + ev IP** (20–40 sn bekleme); duvara çarpınca proxy | Sıfır maliyet, pipeline-olgunlaştırma hedefi |
| Veri çıktısı | İlan başına **tam kayıt**, yeni `MarketListing` tablosu (foto URL + ham metin dahil) | Hem ilçe ortalaması hem emsal-pin bundan türetilir |
| Kod yeri | ArsaBil repo'su içinde, `crawler/` kök klasör (`src/` **dışında**), npm script'leri | Şema+parser+geo tek repo'da hızlı iterasyon; app bundle'ına sızmaz |

### Hukuki / operasyonel not

Sahibinden.com ToS'u scraping'i yasaklar, agresif bot koruması ve hukuki takip
geçmişi vardır. Bu risk kullanıcıya açıkça iletildi ve karar kullanıcıya aittir.
Tasarım bu gerçeği bir kısıt olarak alır: **düşük hızlı, önbellekli, engellenince
duran, insan-benzeri** bir mimari. `sourceUrl` her kayıtta saklanır (geri
işaret edilebilirlik). Fotoğraflar yeniden barındırılmaz — sadece URL.

---

## 1. Veri Modeli

Üç yeni Prisma modeli. `src/` şemasında tanımlı ama yalnızca `crawler/` ve
(ileride) alt-proje 2–6 okur.

```prisma
model MarketListing {
  id              String   @id @default(cuid())
  source          String   // 'sahibinden' | 'emlakjet' | 'hepsiemlak'
  sourceListingId String   // portalın kendi ilan no'su
  sourceUrl       String
  title           String?
  description     String?  @db.Text
  price           Float?
  currency        String   @default("TRY")
  areaSqm         Float?
  pricePerSqm     Float?   // türetilmiş: price / areaSqm
  listingType     String   // normalize: arsa|tarla|bag|bahce|zeytinlik|konut|ticari|arazi|diger
  imarStatus      String?  // imarli | imarsiz | bilinmiyor
  il              String?
  ilce            String?
  mahalle         String?
  adaNo           String?
  parselNo        String?
  lat             Float?
  lng             Float?
  geoPrecision    String?  // exact | neighborhood | none
  photoUrls       String[] @default([])
  listedAt        DateTime? // portaldaki "ilan tarihi"
  status          String   @default("active") // active | delisted
  firstSeenAt     DateTime @default(now())
  lastSeenAt      DateTime @default(now())
  dupeOfId        String?   // muhtemel çapraz-portal kopya (birleştirme YOK, sadece işaret)
  rawJson         Json?     // ham çıkarım — yeniden işlemek için, tekrar fetch'siz
  priceHistory    MarketListingPricePoint[]

  @@unique([source, sourceListingId])
  @@index([il, ilce, mahalle])
  @@index([listingType, status])
  @@index([lat, lng])
}

model MarketListingPricePoint {
  id         String        @id @default(cuid())
  listingId  String
  price      Float
  observedAt DateTime      @default(now())
  listing    MarketListing @relation(fields: [listingId], references: [id], onDelete: Cascade)
  @@index([listingId])
}

model CrawlRun {
  id               String    @id @default(cuid())
  source           String
  il               String
  category         String    // arsa | konut
  startedAt        DateTime  @default(now())
  finishedAt       DateTime?
  pagesFetched     Int       @default(0)
  listingsFound    Int       @default(0)
  listingsUpserted Int       @default(0)
  blocked          Boolean   @default(false)  // challenge/CAPTCHA görüldü
  notes            String?
}
```

**Kararlar:**
- Upsert anahtarı `(source, sourceListingId)`; tekrar görülen ilan güncellenir, `lastSeenAt` ilerler.
- Bir crawl turunda görülmeyen `active` ilan → `delisted` (yalnızca durum; "gerçekten satıldı mı" çıkarımı v1 dışı).
- Fiyat değişince `MarketListingPricePoint` eklenir.
- `dupeOfId`: çapraz-portal kopya **işaretlenir, birleştirilmez**.
- `rawJson`: markup değişince/yeni alan isteyince tekrar crawl etmeden yeniden işleme.
- Mevcut `Listing` (kullanıcı-ilanı KAT_KARSILIGI marketplace) ve `Report` modelleri ile **karışmaz** — ayrı tablo.

---

## 2. Modül Yapısı

`crawler/` kök klasörü (repo içinde, `src/` **dışında**):

```
crawler/
  tsconfig.json             # module: commonjs, noEmit, kendi include
  jest.config.js            # pure modül testleri
  run.ts                    # CLI giriş noktası
  config.ts                 # il, kategoriler, hız aralıkları, portal aç/kapa, eşikler
  fetcher/
    browser.ts              # Playwright sarmalayıcı: başlat, insan-benzeri gezin, rastgele bekleme, retry/backoff
    blockDetector.ts        # challenge/CAPTCHA/boş-sonuç sayfası tespiti → turu durdur
  adapters/
    types.ts                # PortalAdapter arayüzü, RawListing, ListingStub
    sahibinden.ts
    emlakjet.ts
    hepsiemlak.ts
  pipeline/
    normalize.ts            # RawListing → MarketListing girdisi
    geocode.ts              # pin çıkar → yoksa mahalle centroid → yoksa none
    dedupe.ts               # çapraz-portal muhtemel kopya eşleştirme (işaretle)
    upsert.ts               # Prisma: MarketListing + PricePoint + delisted
  fixtures/                 # gerçek sayfa HTML'leri (temizlenmiş, commit'li)
  __tests__/
```

**`PortalAdapter` arayüzü:**

```ts
interface PortalAdapter {
  source: 'sahibinden' | 'emlakjet' | 'hepsiemlak'
  searchUrls(il: string, category: 'arsa' | 'konut', maxPages: number): string[]
  parseSearchPage(html: string): ListingStub[]        // id + detay url + kaba alanlar
  parseDetailPage(html: string, url: string): RawListing
}
```

**Bağımlılık yönü (tek yönlü):**
- `adapters/*`, `pipeline/normalize`, `pipeline/dedupe` → **saf**: string/obje alır, DOM/Playwright/Prisma yok. `cheerio` ile parse. Jest'te fixture ile test edilir. Servise taşırken aynen çıkar.
- `fetcher/*` → Playwright'a bağımlı, birim test edilmez.
- `pipeline/geocode` → `src/lib/geo` yardımcıları; mahalle centroid kaynağı plan aşamasında netleşir (mevcut TKGM verisi yeterliyse o, değilse Nominatim — rakip de sınır için Nominatim kullanıyor).
- `pipeline/upsert` → app'in Prisma client'ını kullanır.
- `run.ts` → hepsini bağlar, `CrawlRun` yazar, ilerleme loglar.
- **app kodu `crawler/`'dan hiçbir şey import etmez.**

---

## 3. Pipeline / Veri Akışı

Bir crawl turu = tek portal + tek kategori
(`npm run crawl -- --portal=sahibinden --il=trabzon --category=arsa`):

```
1. run.ts
   → CrawlRun satırı aç (source, il, category, startedAt)
   → adapter.searchUrls(il, category, maxPages) → [sayfa1, sayfa2, …]

2. HER arama sonuç sayfası:
   → browser.get(url)  (20–40 sn rastgele bekleme, insan-benzeri scroll)
   → blockDetector: challenge / CAPTCHA / beklenmedik boş sayfa?
        EVET → turu DURDUR, CrawlRun.blocked=true, yüksek sesle logla, çık
   → adapter.parseSearchPage(html) → ListingStub[]
   → pagesFetched++

3. HER ilan stub'ı (yeni VEYA lastSeenAt > tazelemeAralığı):
   → browser.get(stub.detayUrl)  (rastgele bekleme)
   → blockDetector kontrolü
   → adapter.parseDetailPage(html, url) → RawListing (+ rawJson)
   → normalize(RawListing)  → fiyat/alan sayı, ₺/m², tip enum, tr-isim normalize
   → geocode(normalized)    → lat/lng + geoPrecision (pin → mahalle centroid → none)
   → upsert(record)         → MarketListing (source,sourceListingId unique)
        · fiyat değiştiyse → PricePoint ekle
        · firstSeenAt / lastSeenAt yönet
   → listingsFound++ / listingsUpserted++

4. Tur sonu:
   → bu turda görülmeyen, bu (source, il, category) kapsamındaki active ilanlar
     → status = delisted   (blocked=true ise BU ADIM ATLANIR)
   → dedupe: bu il'de tüm kaynaklardan yeni/güncel kayıtlar arası muhtemel kopya
     → dupeOfId işaretle (birleştirme yok)
   → CrawlRun.finishedAt + özet (pagesFetched, found, upserted, blocked)
   → konsola özet tablo
```

**Kararlar:**
- **Detay sayfası yalnızca gerektiğinde:** yeni ilan, ya da `lastSeenAt` > `detailRefreshDays` (config, default **7**). Taze ilana tekrar girilmez → istek sayısı düşer.
- **`blocked=true` turda `delisted` adımı çalışmaz** — yarım tur yüzünden yanlış "satıldı" olmaz.
- **dedupe tur sonunda, il genelinde.** Eşleşme anahtarı: normalize(ilçe+mahalle) + alan (±%5) + fiyat (±%3) + tip. Eşleşenlerden en eskisi "asıl", diğerleri `dupeOfId` ile ona işaret eder.
- Portallar **ardışık, tek seferde tek portal** — paralel yok.
- Her tur bağımsız (kaldığı yerden devam yok). Tur küçük: `--max-pages` default **20**.

---

## 4. Hata Yönetimi ve Engellenme Duruşu

### Engellenme (en kritik)

- `blockDetector` her sayfa yüklemesinden sonra: bilinen challenge işaretleri
  (Cloudflare / DataDome / hCaptcha iframe'i, "robot musunuz" metni), beklenen
  sonuç konteynerinin hiç olmaması, ani boş liste, HTTP 403/429.
- Tetiklenince: o portalın turu **anında durur**, `CrawlRun.blocked=true`,
  `notes`'a sebep, konsola kırmızı uyarı. **Tekrar deneme yok.**
- `delisted` adımı `blocked` turda atlanır.
- `config.perPortalCooldownHours` (default **12**): engellenen portal için tekrar
  tur başlatmayı yumuşakça engelle.

### İnsan-benzeri davranış

- İstekler arası 20–40 sn rastgele; her ~15 istekte 3–8 dk "mola".
- Gerçek User-Agent + tutarlı viewport; temel maskeleme (webdriver flag, plugin listesi).
- Sayfa içinde rastgele scroll + kısa bekleme, sonra parse.
- Tek portal, tek sekme, ardışık. `config.maxRequestsPerRun` (default **300**).

### Diğer hatalar

| Durum | Davranış |
|---|---|
| Ağ / timeout | 2 denemeye kadar üstel backoff (5s, 20s); yine olmazsa ilanı atla, logla, devam |
| Detay parse başarısız (selector yok) | İlanı atla, `rawJson` kaydet (varsa), `unparseable++` |
| Bir turda `unparseable / found > %30` | Turu durdur — muhtemel markup değişikliği |
| Normalize edilemeyen fiyat/alan | Kayıt yazılır, `price`/`areaSqm` null, `pricePerSqm` yok, `notes` işaretli |
| Geocode başarısız | `geoPrecision='none'`, lat/lng null, kayıt yine yazılır |
| Prisma upsert hatası | Logla, ilanı atla |

**İlke:** crawler sessizce yarım veri yazmaz; her tur sonunda net özet verir.
`%30 unparseable` eşiği körelmiş parser'ı erken yakalar.

---

## 5. Araç Zinciri, İzolasyon ve Test

### İzolasyon (Next build'ine sızmaması)

- `tsconfig.json` → `exclude`'a `"crawler"` eklenir.
- `crawler/tsconfig.json` kendi başına (`module: commonjs`, `noEmit`, kendi `include`).
- `jest.config.js` bugün `--roots src` ile koşuluyor; değişmez.
- Crawler testi ayrı: `npm run test:crawler` → `jest --config crawler/jest.config.js`.
- ESLint: `crawler/` ayrı override ya da kapsam dışı.
- CI/pre-commit: `test:crawler` ayrı adım; kırılırsa app deploy'unu bloklamaz ama görünür.

### Yeni bağımlılıklar (minimum)

- `cheerio` — adapter'ların saf HTML parse'ı.
- Playwright — `@playwright/test` zaten var; fetcher `chromium`'u ondan import edebilir (yeni paket gerekmeyebilir; gerekirse `playwright`).
- `ts-node` — `crawl` script'i (seed script'i ile aynı desen).
- Yeni npm script'leri: `crawl`, `test:crawler`.

### Test stratejisi (TDD)

| Katman | Nasıl |
|---|---|
| `adapters/*` parse | `fixtures/`'a kaydedilmiş gerçek HTML → beklenen `RawListing`. Her portal 2–3 fixture (arsa, konut, eksik-alan). RED→GREEN. |
| `normalize` | "1.250.000 TL"→1250000, "2.430 m²"→2430, ₺/m² hesabı, portal tip→enum, "Ortahisar"/"ORTAHISAR"→TKGM adı |
| `geocode` | Sayfa JSON'undan pin (fixture); pin yoksa mahalle centroid; ikisi de yoksa `none` |
| `dedupe` | Kurgu kayıt setleri → doğru `dupeOfId`; sınır durumlar (alan ±%5, fiyat ±%3) |
| `upsert` | Test DB: yeni kayıt, tekrar görülen (`lastSeenAt` ilerler), fiyat değişimi→`PricePoint`, görülmeyen→`delisted` |
| `fetcher` | Birim test **yok**. `npm run crawl -- --dry-run --limit=1` ile elle duman testi (DB'ye yazmaz). |
| Jest suite | Canlı ağ **yok** — fixture / mock / test-DB |

**Fixture'lar:** gerçek HTML, kişisel veri (telefon, ilan sahibi adı) temizlenip
commit edilir. Markup değişince fixture yenilenir, testler kırılır.

---

## 6. v1 Kapsam Sınırları (YAGNI)

### v1'DE VAR

- 3 portal adaptörü, tek il (Trabzon), satılık arsa/arazi + konut
- Lokal `npm run crawl` — elle tetiklenen, tek portal/kategori turu
- `MarketListing` + `MarketListingPricePoint` + `CrawlRun` tabloları
- Normalize + geocode (pin ya da mahalle centroid) + fiyat geçmişi + `delisted`
- Çapraz-portal kopya **işaretleme** (`dupeOfId`)
- Engellenme tespiti + insan-benzeri hız + tur özeti
- Parser/normalize/geocode/dedupe/upsert testleri + fixture'lar

### v1'DE YOK (sonraki alt-projeler / iterasyonlar)

- Otomasyon / zamanlama / cron — hep elle
- Proxy entegrasyonu — ban yiyince
- Ayrı VPS / servis / kuyruk
- Kopya kayıtları **birleştirme** (sadece işaret)
- Gerçek "satıldı mı" çıkarımı
- "Fiyatı düşen ilan" listesi, fiyat trendi grafiği — veri birikir, UI yok
- Bu veriyi ArsaBil arayüzünde gösterme — Değer Kartı (2) ve Emsal Harita (3) ayrı spec
- `DistrictPrice` ortalamalarını bu veriden türetme — alt-proje 2'nin işi
- Admin paneli crawl görünümü — `CrawlRun` var, UI sonra
- Fotoğrafları yeniden barındırma — sadece URL
- 2.+ il, kiralık ilanlar, diğer portallar

---

## Başarı Ölçütü

`npm run crawl -- --portal=sahibinden --il=trabzon --category=arsa --max-pages=5`
çalıştırıldığında:
- Trabzon'daki satılık arsa ilanları `MarketListing`'e yazılır (fiyat, alan, ₺/m², tip, ilçe/mahalle, lat/lng, kaynak, kaynak-URL, foto URL'leri, ilan tarihi).
- Aynı komut tekrar çalışınca kayıtlar güncellenir (yeni satır oluşmaz), fiyat değişenlerde `PricePoint` eklenir.
- Emlakjet + Hepsiemlak için de aynısı; il genelinde muhtemel kopyalar `dupeOfId` ile işaretli.
- `CrawlRun` satırları her turu özetler; engellenme olursa `blocked=true` ve tur temiz durur.
- `npm run test:crawler` yeşil; app'in `npx jest --roots src` suite'i etkilenmez; `next build` crawler'ı görmez.
