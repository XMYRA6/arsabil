# Ücretsiz Arsa Değer Kartı — Tasarım (v1)

**Tarih:** 2026-08-30
**Durum:** Onaylandı (brainstorming), uygulama planı bekliyor
**Alt-proje:** 2 / 6 (bkz. "Bağlam" — rakip kapatma yol haritası)

---

## Bağlam ve Amaç

ArsaBil, rakip `edermi.com` karşısında parsele özel bir **değer çıktısı**
sunamıyor. Alt-proje 1 (İlan Crawler + Veri Hattı) `MarketListing` tablosunu
gerçek portal ilanlarıyla doldurdu. Bu alt-proje, o veriyi kullanıcının
gördüğü ilk ürüne dönüştürür: bir parsel için **tahmini değer + ₺/m² + risk
rozeti** gösteren, giriş gerektirmeyen bir **Değer Kartı** — ArsaBil'in yeni
giriş kancası.

edermi.com'un ücretsiz "Arsa Değer Raporu" önizlemesinin ArsaBil karşılığı:
temel değer herkese açık, net rakam + bağlam + (ileride) emsal/trend/uzman
görüşü üyelik arkasında.

### Yol haritasındaki yeri (bilgi amaçlı, bu spec'in kapsamı DEĞİL)

| # | Alt-proje | Bağımlı |
|---|---|---|
| 1 | İlan Crawler + Veri Hattı | — |
| **2** | **Ücretsiz "Arsa Değer Kartı"** ← bu spec | 1 |
| 3 | Emsal ilan + harita katmanı (Nominatim sınır, pin) | 1, 2 |
| 4 | AI "Uzman Görüşü" (Akif) — AL/BEKLE/GEÇ + sesli | 2, 3 |
| 5 | WhatsApp botu | 2 |
| 6 | Derinlik: TÜİK demografi, fiyat trendi, SEO mahalle sayfaları | 1–4 |

---

## Sabitlenen Kararlar

| # | Konu | Karar |
|---|---|---|
| 1 | Giriş noktası | Yeni `/deger` route + anasayfada kompakt kanca kutusu |
| 1 | Kimlik modeli | Anonim başlar, kartın bir kısmı ücretsiz-üyelik duvarı arkasında (edermi modeli) |
| 2 | Ücretsiz (duvar üstü) | Geniş değer aralığı, kaba ₺/m², risk rozeti, parsel haritası + temel bilgi, ince-veri uyarısı |
| 2 | Üye (duvar altı) | Net tek tahmin, dar aralık (p25–p75), güven skoru + örneklem sayısı, mahalle vs ilçe ₺/m² kırılımı, "bu parselle fizibilite hesapla" köprüsü |
| 2 | Kilitli "yakında" | Emsal ilanlar, fiyat trendi, uzman görüşü — yalnız pasif metin (alt-proje 3/4/6) |
| 3 | Değerleme yöntemi | `pricePerSqm` medyanı, sadece arsa tipleri; kademeli fallback mahalle → ilçe → il → yetersiz veri; parsele özgü düzeltme YOK |
| 4 | Fiyat toplama | Yeni `AreaPriceStat` önhesap tablosu + elle tetiklenen `npm run prices:aggregate` (cron yok). `DistrictPrice` DOKUNULMAZ |
| 5 | Girdi UX | `/deger` sekmeli: "Ada/Parsel ile" (mevcut `ManualParcelEntryForm`) \| "Haritadan seç" (mevcut `ParcelPicker`) — yeniden kullanım |
| 6 | API | Yeni birleşik endpoint `GET /api/deger/kart` — anonim, tek rate-limit, parsel+risk+fiyat sunucuda birleşir |
| 7 | Lead niteleme | v1'de YOK — kanca sürtünmesiz |
| 8 | Kalıcılık | v1'de YOK — kart geçici, login sadece ekstra alanları açar |
| 9 | Düzen | "Tek kart, kademeli kilit" — ücretsiz kısım net, üye kısmı aynı kartın içinde bulanık + "üye ol" örtüsü |
| 9 | Ücretsiz/üye hassasiyet | Ücretsiz: medyan ±%25 aralık + yuvarlanmış ₺/m². Üye: p25–p75 aralık + tam ₺/m² + kırılım. Üyelik "belirsizliği daraltır" |

---

## Mimari

### Yeni bileşenler

| Katman | Dosya | Sorumluluk |
|---|---|---|
| Model | `AreaPriceStat` (Prisma) | il / ilçe / mahalle(nullable) başına medyan ₺/m², p25, p75, örneklem sayısı, `computedAt` |
| Toplama (saf) | `src/lib/areaPrices/aggregate.ts` | `MarketListing` satırları → grupla → medyan/persentil/sayı → `AreaPriceStat` girdileri. I/O yok |
| Toplama (wiring) | `scripts/aggregate-area-prices.ts` + `package.json` `prices:aggregate` | Prisma'dan oku, `aggregate()` çağır, upsert et. Elle tetiklenir |
| Değerleme (saf) | `src/lib/areaPrices/valuation.ts` | parsel alanı + `AreaPriceStat` satırları → değerleme sonucu. I/O yok, tam test edilebilir |
| Orkestrasyon | `src/lib/deger/card.ts` | girdi → `fetchParcelBy*` + `buildRiskSnapshot` + `AreaPriceStat` sorgusu → `valuation()` → DTO. Ücretsiz alanlar hep, üye alanları yalnız oturum varsa |
| API | `src/app/api/deger/kart/route.ts` | GET, anonim, IP bazlı rate-limit, oturuma göre ücretsiz/üye payload |
| Sayfa | `src/app/deger/page.tsx` | sekmeli girdi + `<DegerKarti>` |
| Bileşen | `src/components/deger/DegerKarti.tsx` | Düzen A render |
| Kanca | `src/app/page.tsx` | anasayfaya tek kompakt "Değeri Öğren" kutusu |

### Veri akışı

```
npm run crawl              → MarketListing    (elle — alt-proje 1)
npm run prices:aggregate   → AreaPriceStat    (elle)
kullanıcı /deger'de ada/parsel girer veya haritaya tıklar
  → GET /api/deger/kart?lat&lng  |  ?mahalleId&ada&parsel
      → TKGM parsel + WMS risk + AreaPriceStat  (hepsi sunucuda birleşir)
      → valuation()  → DTO
  → DegerKarti render (üye alanları yalnız giriş yapılmışsa payload'da)
```

### İzolasyon ilkesi

`aggregate.ts` ve `valuation.ts` saf fonksiyonlar — testleri hızlı, dış bağımlılık
yok. `card.ts` tek birleştirme noktası. `DegerKarti` yalnız DTO alır, nasıl
üretildiğini bilmez. `AreaPriceStat` yazma yolu (`prices:aggregate`) ile okuma
yolu (`/api/deger/kart`) tamamen ayrık.

---

## `AreaPriceStat` şeması

```prisma
model AreaPriceStat {
  id                 String   @id @default(cuid())
  il                 String
  ilce               String?          // null = il geneli
  mahalle            String?          // null = ilçe geneli (ilce doluysa)
  scope              String           // "il" | "ilce" | "mahalle" — sorgu netliği için
  medianPricePerSqm  Float
  p25                Float
  p75                Float
  sampleCount        Int
  computedAt         DateTime
  @@unique([il, ilce, mahalle])
  @@index([il, ilce, mahalle])
}
```

- Tüm metin alanları `MarketListing` ile aynı `toLocaleUpperCase('tr-TR')`
  normalizasyonunda — eşleşme için.
- `@@unique([il, ilce, mahalle])`: Postgres NULL'ları unique kısıtta ayrı
  sayar, yani `(IL, NULL, NULL)` / `(IL, ILCE, NULL)` / `(IL, ILCE, MAHALLE)`
  ayrı satırlar olarak yaşar — istenen davranış. `scope` kolonu okuma
  sorgusunu netleştirmek için var (kısıtta değil).

---

## Değerleme mantığı (`valuation.ts`)

### Girdi

- `areaSqm: number` (parsel alanı, TKGM'den)
- `stats: { mahalle?: AreaPriceStat, ilce?: AreaPriceStat, il?: AreaPriceStat }`

### Fallback zinciri

| Seviye | Koşul | Güven |
|---|---|---|
| mahalle | `sampleCount ≥ 8` | Yüksek |
| ilçe | `sampleCount ≥ 5` | Orta |
| il | herhangi (satır varsa) | Düşük |
| — | hiçbir seviye yok | `insufficientData: true` |

### Hesap

- **Tahmin** = seçilen seviyenin `medianPricePerSqm` × `areaSqm`
- **Ücretsiz aralık** = `median × 0.75 × areaSqm` .. `median × 1.25 × areaSqm`
- **Üye aralık** = `p25 × areaSqm` .. `p75 × areaSqm`
- **Ücretsiz ₺/m²** = `median` en yakın 100'e yuvarlanmış
- **Üye ₺/m²** = mahalle ve ilçe seviyelerinin ikisi de döndürülür (varsa)
- Parsele özgü düzeltme YOK — DTO'da `"v1 tahmini; imar, cephe, eğim gibi
  parsel özellikleri hariç"` notu
- **`feasibilityHref` param kontratı** implementasyonda `/hesapla`'nın
  mevcut query okuması (`ParcelModal`/`useSearchParams`) ile doğrulanır.
  `/hesapla` parsel ön-doldurmayı desteklemiyorsa v1'de köprü düz `/hesapla`'ya
  gider (parsel prefill'i ayrı bir iyileştirme olarak not düşülür)

### Dürüstlük kuralı

Seçilen seviye `"il"` ise **veya** seçilen seviyenin `sampleCount < 10` ise →
DTO `thinData: true` → ücretsiz kartta ⚠︎ uyarı satırı.

### Guard'lar

- `areaSqm ≤ 0` veya `null` → `insufficientData: true` (değer hesaplanamaz)
- Negatif/sıfır `medianPricePerSqm` (bozuk veri) → o seviye yok sayılır

---

## `aggregate.ts`

- **Girdi filtresi:** `MarketListing` — `status='active'`,
  `listingType ∈ {arsa, tarla, bag, bahce, zeytinlik, arazi}` (konut/ticari
  HARİÇ), `pricePerSqm` dolu ve > 0.
- Her `il`, `(il, ilce)`, `(il, ilce, mahalle)` grubu için: medyan, p25, p75, sayı.
  Persentil yöntemi: sıralı listede lineer enterpolasyon (test edilebilir sabit
  tanım).
- **Grup `sampleCount < 3` → satır yazılmaz** (gürültü eşiği).
- Upsert (`@@unique` üzerinden), **silme yok** — ileride elle düzeltilmiş /
  admin-override satırlar korunsun.
- `computedAt` = çalıştırma zamanı.

---

## API — `GET /api/deger/kart`

Girdi: `?lat&lng` (haritadan) **veya** `?mahalleId&ada&parsel` (form).

### Anonim yanıt (oturum yok)

```jsonc
{
  "parcel": { "il", "ilce", "mahalle", "ada", "parsel", "areaSqm", "geometry" },
  "risk":   { "faultDistanceM": 1800, "floodQ100": false, "status": "ok" },
  "value": {
    "tier": "free",
    "rangeLow": 2400000,
    "rangeHigh": 3100000,
    "pricePerSqmCoarse": 3700,
    "basis": "ilce",
    "thinData": true
  }
}
```

### Giriş yapmış yanıt — `value` bloğu genişler

```jsonc
"value": {
  "tier": "member",
  "estimate": 2750000,
  "rangeLow": 2550000,
  "rangeHigh": 2950000,
  "pricePerSqm": { "mahalle": 3900, "ilce": 3500 },
  "confidence": "orta",
  "sampleCount": { "mahalle": 6, "ilce": 21 },
  "basis": "ilce",
  "feasibilityHref": "/hesapla?ada=142&parsel=7&mahalleId=...&alan=728",
  "thinData": true
}
```

### Güvenlik

Mevcut `src/lib/risk/riskSnapshot.ts` / `parcelSnapshot.ts` deseniyle aynı:

- Risk + değer **yalnız sunucuda** hesaplanır; istemcinin gönderdiği hiçbir
  risk/değer alanı okunmaz.
- Üye alanları anonim yanıta **hiç konmaz** (client'ta gizlenmez) → duvar
  gerçek, devtools ile aşılamaz.
- Anonim: IP bazlı rate-limit `RATE_LIMITS.DEGER_KART_ANON` — parsel lookup
  ANON limitinden biraz daha sıkı (tek çağrı 2 dış servis + DB tüketiyor).
  Giriş yapmışlar: `RATE_LIMITS.DEGER_KART` kullanıcı bazlı, daha gevşek.
- TR sınırları dışı koordinat → TÜCBS/TKGM'ye hiç gitmez (mevcut
  `isWithinTurkey` guard).
- Birleşik endpoint → hangi WMS katmanı / hangi tablo dışarı sızmaz.

### Hata durumları

| Durum | Yanıt | Kart davranışı |
|---|---|---|
| Parsel bulunamadı | `{ error: "parcel_not_found" }` (404) | "Parsel bulunamadı" |
| WMS timeout | `risk.status: "unavailable"` | Risk çipi yerine "risk verisi alınamadı", kalan kart render olur |
| Hiç `AreaPriceStat` eşleşmesi yok | `value: { tier, insufficientData: true }` | Değer yerine "Bu bölge için yeterli emsal verisi yok"; risk + parsel yine görünür |
| Geçersiz girdi (eksik/format) | `{ error: "bad_request" }` (400) | Form hatası |

---

## Sayfa ve bileşen

### `/deger/page.tsx`

- Client component, anonim erişilebilir.
- Başlık: "Arsanın tahmini değerini öğren".
- Sekmeli girdi:
  - **"Ada / Parsel ile"** → mevcut `ManualParcelEntryForm`. Bugüne kadar
    ilan sihirbazına gömülüydü; sihirbaz-dışı bağlamdan çağrılabilmesi için
    `onResolved(parcel)` callback prop'u eklenir. **Sihirbaz davranışı
    değişmez.**
  - **"Haritadan seç"** → mevcut `ParcelPicker` (leaflet, tıkla-doğrula).
- Parsel çözülünce → `GET /api/deger/kart` → `<DegerKarti dto isLoggedIn />`.
- URL state: çözülen parsel `?mahalleId=&ada=&parsel=` olarak query'ye yazılır
  — paylaşılabilir, geri-tuşu çalışır, login'den dönünce aynı karta gelinir.

### `DegerKarti.tsx` (Düzen A)

- **Ücretsiz kısım (hep render):** parsel satırı · mini harita (geometri) ·
  "Tahmini Değer Aralığı ₺X–₺Y" · "≈ ₺N/m² bölge medyanı" · risk çipleri
  (fay mesafesi / taşkın) · `thinData` ise ⚠︎ uyarı satırı.
  Fay mesafesi metni mevcut `src/components/risk/RiskSuggestionCard.tsx`
  `formatDistance` mantığıyla aynı olmalı (≥1000 m → "1,8 km"; null →
  "25 km'den uzak") — ortak yardımcıya çıkarılır.
- **Divider.**
- **Üye kısmı:**
  - `isLoggedIn` → gerçek içerik: net değer, dar aralık, mahalle/ilçe ₺/m²,
    güven rozeti, "Bu parselle fizibilite hesapla →" (`value.feasibilityHref`).
  - değilse → aynı yapı **bulanık (blur + opacity + pointer-events:none)** +
    üstünde örtü: "🔒 Net değer + mahalle kırılımı · Ücretsiz üyelikle aç ·
    [Üye Ol]" → `/register?callbackUrl=/deger?mahalleId=...&ada=...&parsel=...`.
- **Alt:** "Yakında (üyelere): Emsal ilanlar · Fiyat trendi · Uzman görüşü" —
  pasif metin.
- `insufficientData` → değer bloğu yerine "Bu bölge için yeterli emsal verisi
  yok"; risk + parsel yine görünür.

### Anasayfa kancası

- `src/app/page.tsx` — mevcut hero'nun altına tek kompakt kart/şerit: başlık
  "Arsanın değeri ne kadar?" + kısa açıklama + "Değeri Öğren →" → `/deger`.
- **Anasayfa redesign DEĞİL** — en fazla ~1 ekran bloğu, mevcut akışa saygılı.

---

## Test stratejisi

Proje TDD deseni — her birim RED→GREEN.

| Birim | Test türü | Kapsam |
|---|---|---|
| `valuation.ts` | saf unit | fallback zinciri, güven kademeleri, aralık matematiği (±%25 vs p25–p75), `thinData` eşiği, sıfır veri, `areaSqm ≤ 0` guard, bozuk medyan guard |
| `aggregate.ts` | saf unit | medyan/persentil doğruluğu (çift/tek örneklem), `listingType` filtresi, grup<3 atlanır, tr-upper eşleşme, il/ilçe/mahalle gruplama |
| `api/deger/kart` route | entegrasyon (TKGM/WMS/prisma mock) | anonim payload'da üye alanı YOK, giriş yapmış payload tam, rate-limit (anon vs auth), geçersiz girdi, `parcel_not_found`, risk unavailable graceful, `insufficientData` |
| `DegerKarti.tsx` | RTL | ücretsiz kısım hep render, oturumsuz → bulanık+örtü, oturumlu → gerçek içerik, `thinData` → ⚠︎, `insufficientData` → mesaj, risk unavailable → "alınamadı" |
| `/deger/page.tsx` | RTL (hafif) | sekme geçişi, `ManualParcelEntryForm`/`ParcelPicker` callback ile karta bağlanıyor, URL query yazımı |
| `ManualParcelEntryForm` | mevcut + yeni | yeni `onResolved` prop'u sihirbaz-dışı çalışır, sihirbaz davranışı BOZULMAZ |
| anasayfa kutusu | RTL | link `/deger`'e gidiyor |

Ayrıca her adımda: `npm run build` (Turbopack/lightningcss build-time tuzakları),
`tsc --noEmit`, tam jest regresyon.

---

## Kapsam dışı (v1 — bilinçli YAGNI)

- Kalıcılık / geçmiş / "kaydet" / PDF
- Lead niteleme soruları
- Emsal ilan haritası, fiyat trendi grafiği, AI uzman görüşü — yalnız pasif
  "yakında" metni
- Parsele özgü değerleme düzeltmesi (imar, cephe, eğim, köşe parsel)
- `AreaPriceStat` için cron / otomatik toplama — elle `npm run prices:aggregate`
- `AreaPriceStat` admin override UI — ileride (model upsert-only, zemin hazır)
- Anasayfa redesign — sadece tek kanca kutusu
- 81 il verisi — crawler v1 sadece Trabzon; diğer iller "yetersiz veri"
  yolundan düzgün geçer
- `DistrictPrice` tablosuna dokunmak — `/hesapla` kontratı korunur
