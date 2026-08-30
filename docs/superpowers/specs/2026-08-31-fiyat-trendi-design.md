# Bölge Fiyat Trendi — Tasarım (v1)

**Tarih:** 2026-08-31
**Durum:** Onaylandı (brainstorming), uygulama planı bekliyor
**Alt-proje:** 6a / (6a, 6b, 6c) — "Derinlik" dekompozisyonu

---

## Bağlam ve Amaç

Alt-proje 2 (Değer Kartı) `DegerKarti`'de "Fiyat trendi" bir üye-duvarı arkası
"yakında" placeholder'ı olarak duruyor (`.soon` satırı). Bu alt-proje onu
gerçek bir **bölge ₺/m² zaman serisi grafiğiyle** doldurur.

edermi.com karşılığı: "Fiyat Trendi 12ay + 6ay AI öngörü" (kilitli bölüm).
Bizde v1 = geçmiş 12 ay + "son 3 ay %X" değişim özeti; **öngörü YOK** (aşağıda).

### "Derinlik" (alt-proje 6) dekompozisyonu — 2026-08-31, onaylı

Üç bağımsız alt-proje, her biri kendi spec→plan→SDD:

| # | Alt-proje | Bağımlı / not |
|---|---|---|
| **6a** | **Fiyat Trendi** ← bu spec | Mevcut `MarketListing` + `MarketListingPricePoint` verisi yeter. En küçük yeni-altyapı. `DegerKarti` slotunu doldurur. |
| 6b | SEO Mahalle Sayfaları | `AreaPriceStat` + `Neighborhood` + trend. **Ulusal veri gelmeden indekslenmeye değmez** (şu an sadece Trabzon) → Emlakjet Ulusal Crawl'dan sonra. |
| 6c | TÜİK Demografi | Greenfield: TÜİK API/bulk → yeni tablo + emlak yorumu. En büyük yeni-veri işi, en sona. |

### Veri gerçeği (2026-08-31)

- `MarketListingPricePoint`: 454 satır, ilan başına tam 1 nokta (crawler'ın "ilk
  görülen fiyat" baseline'ı — henüz hiç ilan fiyat değiştirmedi). Yani **per-ilan
  trend YOK**.
- Ama `MarketListing.listedAt` **2026-05-05 → 2026-08-30** aralığında, 464/464
  dolu. Aylık: Mayıs 15, Haziran 49, Temmuz 102, Ağustos 298. → **agregat trend
  VAR**: her ilanı `listedAt` ayında `pricePerSqm` değeriyle bir veri noktası
  say, alan-seviyesi ₺/m² eğilimini çıkar. Tekrarlı crawl'larla derinleşir.
- `listedAt` Emlakjet'in "İlan Güncelleme Tarihi"si olabilir (ilk-yayın değil) —
  yine de "bu fiyat şu ay geçerliydi" için makul sinyal.

---

## Sabitlenen Kararlar

| # | Konu | Karar |
|---|---|---|
| 1 | Hesap mimarisi | Yeni önhesap tablosu `AreaPriceTrend` + elle tetiklenen script (`AreaPriceStat` deseniyle simetrik). Anlık hesap değil. |
| 2 | Granülarite | Aylık kova (`date_trunc('month', listedAt)`), alan başına mahalle/ilçe/il — üç scope. Fallback mahalle → ilçe → il → yetersiz. |
| 3 | Öngörü | **YOK (v1).** 4 aylık veriyle öngörü sorumsuz. Geçmiş çizgi + "son 3 ay %X" özeti. Naif regresyon veri 12+ aya ulaşınca ayrı iterasyon. AI öngörü = alt-proje 4 (Akif). |
| 4 | Üye-gate | `priceTrend` DTO alanı **tamamen üye-gated** (yapısal — `opts.memberView` değilse hiç eklenmez, emsal `items` gibi). Anonim teaser = `.soon` metni. |
| 5 | Eksik ay | Doldurulmaz — kova yoksa nokta yok, chart'ta kesinti (`spanGaps: false`). |
| 6 | Kapsam | Parsele özgü hiçbir şey yok — alan-seviyesi. Yeni UI yüzeyi yok (yalnız `DegerKarti` üye bölümü). |

---

## Mimari

### Yeni Prisma modeli

```prisma
model AreaPriceTrend {
  id                String   @id @default(cuid())
  il                String              // normalizeAreaName uzayı
  ilce              String?
  mahalle           String?
  scope             String              // "il" | "ilce" | "mahalle"
  monthBucket       DateTime            // ayın 1'i (UTC), date_trunc('month', listedAt)
  medianPricePerSqm Float
  sampleCount       Int
  computedAt        DateTime

  @@unique([il, ilce, mahalle, monthBucket])
  @@index([il, ilce, mahalle])
}
```

Elle yazılan SQL migration (proje deseni). Metin alanları `normalizeAreaName`
uzayında (aggregate.ts / `AreaPriceStat` ile aynı — SQL eşitliği güvenli, C1
tuzağı yalnız ham `MarketListing` tablosundaydı).

### Yeni / değişen dosyalar

| Katman | Dosya | İş |
|---|---|---|
| Model | `AreaPriceTrend` + `prisma/migrations/<ts>_add_area_price_trend/migration.sql` | aylık kova × alan |
| Toplama (saf) | `src/lib/areaPrices/trendAggregate.ts` (+ `.test.ts`) | `MarketListing` satırları → aya grupla → medyan ₺/m² + sayı, her scope. `aggregate.ts` deseniyle simetrik (`stats.ts` `median` yeniden kullanılır). Grup `sampleCount < 3` → yazılmaz. |
| Toplama (wiring) | `scripts/aggregate-trend.ts` + `package.json` `prices:trend` | Prisma'dan oku → `trendAggregate()` → `AreaPriceTrend` upsert. **`findFirst` + create/update deseni** (Prisma null-compound-unique tuzağı — alt-proje 2 ruling'i). Elle tetiklenir. |
| Değerleme (saf) | `src/lib/deger/priceTrend.ts` (+ `.test.ts`) | `AreaPriceTrend` satırları → `PriceTrendResult`. Fallback + `changePct3m` + `thinTrend`. I/O yok. |
| Orkestrasyon | `src/lib/deger/card.ts` (+ `card.test.ts`) | yeni DI `findAreaTrend`; `priceTrend` DTO'ya top-level, üye-only. |
| API | `src/app/api/deger/kart/route.ts` (+ `route.test.ts`) | yeni inline DI: `prisma.areaPriceTrend.findMany` (alan + son 12 ay). |
| Grafik | `src/components/charts/PriceTrendChart.tsx` (+ `.test.tsx`) | `react-chartjs-2` `Line` — mevcut `PriceEvaluationChart` register/mock deseni. |
| Kart | `src/components/deger/DegerKarti.tsx` (+ `.test.tsx`, `.module.css`) | üye bölümüne trend bloğu (chart + "son 3 ay %X"); `.soon` → "Yakında (üyelere): Uzman görüşü". |

### `trendAggregate.ts` sözleşmesi

- **Girdi filtresi:** `status ∈ ('active','delisted')` (delisted ilanlar geçmiş
  fiyat sinyali taşır — trend için dahil), `listingType ∈ ARSA_LISTING_TYPES`,
  `pricePerSqm` sonlu ve `> 0`, `listedAt` dolu, `il` dolu.
- Ay kovası: `listedAt`'ten yıl-ay çıkarımı → `Date(Date.UTC(y, m, 1))`.
  (SQL `date_trunc` script tarafında; saf fonksiyon `Date`'ten çıkarır — test
  edilebilir sabit tanım.)
- Grupla: `(il)`, `(il, ilce)`, `(il, ilce, mahalle)` × ay — bir satır tüm
  uygulanabilir seviyelere katkı verir (`aggregate.ts` deseni).
- Grup `sampleCount < 3` → çıktıya yazılmaz.
- Çıktı satırı: `{ il, ilce, mahalle, scope, monthBucket, medianPricePerSqm, sampleCount }`.

### `priceTrend.ts` sözleşmesi

```ts
interface TrendRow {
  scope: 'il' | 'ilce' | 'mahalle'
  monthBucket: Date
  medianPricePerSqm: number
  sampleCount: number
}
interface PriceTrendResult {
  insufficientTrend: boolean
  basis?: 'mahalle' | 'ilce' | 'il'
  points?: Array<{ month: string; medianPricePerSqm: number; sampleCount: number }> // month = "YYYY-MM", ay artan
  changePct3m?: number | null
  thinTrend?: boolean
}
export function priceTrend(rows: TrendRow[], opts: { now: Date }): PriceTrendResult
```

- **Pencere:** `opts.now`'dan geriye 12 ay (`monthBucket >= now - 12mo`).
- **Fallback:** mahalle satırları pencerede **≥ 3 kova** → basis `mahalle`; yoksa
  ilçe ≥ 3 kova; yoksa il ≥ 3 kova; yoksa `insufficientTrend: true`.
- **`points`:** seçilen seviyenin kovaları, ay artan. Eksik aylar doldurulmaz.
  `month` = `monthBucket`'tan `"YYYY-MM"` (UTC — client tz-bağımsız).
- **`changePct3m`:** `points.length >= 4` ise
  `(points[last].median − points[last-3].median) / points[last-3].median × 100`
  (1 ondalık); yoksa `null`.
- **`thinTrend`:** toplam `sampleCount < 20` VEYA `points.length < 4` → `true`.
- **Guard:** `rows` boş → `insufficientTrend: true`.

### `card.ts` entegrasyonu

- `DegerCardDeps`'e: `findAreaTrend: (il: string, ilce: string, mahalle: string) => Promise<TrendRow[]>`
- Mevcut `Promise.all`'a eklenir (`normalizeAreaName`'li argümanlar).
- `priceTrend(trendRows, { now: new Date() })` çağrılır.
- `DegerCardDTO`'ya top-level `priceTrend?: { basis; points; changePct3m; thinTrend }`
  — **yalnız `opts.memberView && !result.insufficientTrend`** → eklenir. Anonim:
  alan yok. `insufficientTrend` / parsel-yok → alan yok.

### API route

`findAreaTrend` inline DI:
```ts
prisma.areaPriceTrend.findMany({
  where: {
    il, ilce, mahalle,          // AreaPriceTrend zaten normalizeAreaName uzayında — SQL eşitliği güvenli
    monthBucket: { gte: <now - 12 ay, ayın 1'i> },
  },
  select: { scope: true, monthBucket: true, medianPricePerSqm: true, sampleCount: true },
})
```
(il/ilce/mahalle `buildDegerCard` içinde zaten `normalizeAreaName`'den geçiyor —
`findAreaStats` deseni.) `findMany` üç scope satırını da döndürür (mahalle +
ilçe + il — `priceTrend` fallback için hepsini ister); `where` mahalle-eşitliği
mahalle satırlarını, ama ilçe/il satırları `mahalle: null` olduğu için ayrı OR
gerekir — `findAreaStats`'taki `OR: [{ilce:null,mahalle:null},{ilce,mahalle:null},{ilce,mahalle}]`
deseninin AYNISI.

### `PriceTrendChart.tsx`

- `'use client'`, `react-chartjs-2` `Line`. `chart.js` register: mevcut
  `src/components/charts/PriceEvaluationChart.tsx` importer'ını birebir izle
  (aynı `ChartJS.register(...)` + tree-shaking deseni).
- Props: `{ points: Array<{ month: string; medianPricePerSqm: number; sampleCount: number }>; changePct3m: number | null; thinTrend?: boolean }`.
- X ekseni: ay etiketleri (`"2026-06"` → `"Haz '26"` gibi kısa TR). Y: ₺/m²
  (`toLocaleString('tr-TR')` tick). Tek dataset, ArsaBil mavisi, `spanGaps: false`.
- Chart altında: `changePct3m != null` → "Son 3 ay: **{+/-}%X,X**" (yeşil/kırmızı);
  `thinTrend` → "⚠︎ sınırlı geçmiş veriye dayanıyor".
- Test: `PriceEvaluationChart.test.tsx` deseni (`react-chartjs-2` mock, `data`
  prop'u assert).

### `DegerKarti.tsx`

- Üye bölümüne (emsal bloğundan SONRA, `.disclaimer`'dan ÖNCE) trend bloğu:
  `isMember && card.priceTrend` → `<div className={styles.trendBlock}>` başlık
  "Bölge Fiyat Eğilimi" + `<PriceTrendChart points={...} changePct3m={...} thinTrend={...} />`.
- Anonim: blok HİÇ yok (`priceTrend` payload'da yok).
- `.soon` satırı: `Yakında (üyelere): Uzman görüşü` ("Fiyat trendi" çıkarıldı).
- `PriceTrendChart` `next/dynamic` GEREKMEZ (chart.js SSR-safe değil ama
  `DegerKarti` zaten `'use client'` ve `PriceEvaluationChart` de doğrudan
  import ediliyor — aynı desen). **Ama** `npm run build` doğrulaması şart.

---

## Test stratejisi

Proje TDD deseni — her birim RED→GREEN.

| Birim | Tür | Kapsam |
|---|---|---|
| `trendAggregate.ts` | saf unit | `Date`'ten ay-kova çıkarımı (UTC, ay sınırı), medyan, `<3` atlama, arsa filtresi, `delisted` dahil / `active` dahil / başka status hariç, tr-upper, 3 scope seviyesi, `listedAt` null/`pricePerSqm` ≤ 0 elenir |
| `priceTrend.ts` | saf unit | fallback (mahalle ≥3 kova → ilçe → il → yetersiz), 12-ay penceresi (13 ay önceki kova elenir), `changePct3m` (4+ kova hesap / <4 → null / negatif değişim), `thinTrend` (toplam <20 veya <4 kova), eksik ay doldurma YOK, boş girdi → insufficient |
| `AreaPriceTrend` migration | — | tablo + unique index, `prisma migrate status` temiz |
| `scripts/aggregate-trend.ts` | manuel (test yok — `aggregate-area-prices.ts` deseni, ince I/O) | dev DB'ye çalıştır, `AreaPriceTrend` satırları yazılır, idempotent 2. koşu |
| `card.ts` | unit (mock DI) | üye `priceTrend` var / anonim YOK / `insufficientTrend` → yok; `findAreaTrend` normalize edilmiş args + 3-scope OR; mevcut paywall `Object.keys(value)` iddiası DEĞİŞMEZ (trend `card.priceTrend`'de, `card.value`'da değil) |
| `api/deger/kart` route | entegrasyon (mock prisma) | `findAreaTrend` çağrılır, 12-ay `gte` filtresi, 3-scope OR `where`, üye/anon payload; mevcut route testleri yeşil |
| `PriceTrendChart.tsx` | RTL (chart.js mock) | points → dataset render, `changePct3m` özeti (+ işaret rengi), null'da gizli, `thinTrend` uyarısı |
| `DegerKarti.tsx` | RTL | üye trend bloğu var / anonim yok / `priceTrend` yoksa blok yok; `.soon` "Fiyat trendi" içermiyor, "Uzman görüşü" içeriyor; mevcut emsal/mini-harita/disclaimer testleri yeşil |

Her adım `tsc --noEmit` + scoped jest. `PriceTrendChart` / `DegerKarti` + final: `npm run build`.

---

## Kapsam dışı (v1 — bilinçli YAGNI)

- Öngörü / forecast (naif regresyon veya AI) — veri 12+ aya ulaşınca / alt-proje 4
- Per-ilan fiyat değişim geçmişi grafiği (`MarketListingPricePoint` başına)
- `changePct3m` dışında istatistik — volatilite, mevsimsellik, YoY
- Anonim teaser rakamı (`.soon` metni yeterli)
- Trend'i `/hesapla`, `EmsalMap` veya ayrı `/deger` bölümüne taşımak
- SEO mahalle sayfaları (6b), TÜİK demografi (6c)
- Cron / otomatik periyodik `prices:trend` — elle
- Eksik ayları interpolasyonla doldurmak
- `AreaPriceStat` + `AreaPriceTrend`'i tek script'te birleştirmek (ayrı `prices:trend` — `prices:aggregate` dokunulmaz, alt-proje 2 kontratı korunur)
