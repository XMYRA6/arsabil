# Konut Tarama Runbook'u (Akif-5c Aşama C, pilot iller)

## Amaç

Pilot illerde (İstanbul, Ankara, İzmir, Trabzon) satılık **konut** ilanlarını Emlakjet'ten `MarketListing` tablosuna çekmek, ardından `npm run prices:konut` ile bölge bazlı `KonutFiyatStat` (il / ilçe / mahalle m² fiyat istatistiği) satırlarını üretmek. Akif'in `estimateDaireFiyati` aracı bu tabloyu okur.

## UYARI: bu runbook veritabanına YAZAR

Hem `crawl` hem `prices:konut`, `DATABASE_URL` neyi gösteriyorsa **oraya yazar** (`MarketListing`, `CrawlRun`, `KonutFiyatStat`). Yalnızca proje sahibinin onayladığı bir veritabanına karşı çalıştır. Çalıştırmadan önce `echo $DATABASE_URL` ile hedefi doğrula.

## Ön koşullar

- Gerçek bir Postgres (`DATABASE_URL` onaylı DB'yi göstermeli).
- Her iki migration da hedef DB'de uygulanmış olmalı (`DATABASE_URL=... npx prisma migrate deploy`; durum için `npx prisma migrate status`):
  - Aşama B: `20261015120000`
  - Aşama C: `20261016120000` (`KonutFiyatStat`)
  - (`MarketListing` migration'ı `20260829120000_add_market_listing` de uygulanmış olmalı.)
- Proxy gerekiyorsa üç env değişkeninin **hepsi** tanımlı olmalı, biri eksikse proxysiz çalışır (`crawler/fetcher/proxy.ts`): `CRAWL_PROXY_SERVER`, `CRAWL_PROXY_USERNAME`, `CRAWL_PROXY_PASSWORD`. (`crawler/README.md` proxy'yi v1'de "yok" olarak anar; Emlakjet proxysiz da çalışır, engellenirse proxy ekle.)

## Kullanılacak bayraklar (`crawler/run.ts` `parseArgs`)

| Bayrak | Anlam |
| --- | --- |
| `--portal=emlakjet` | Portal (`sahibinden` varsayılan; `hepsiemlak` desteklenmiyor) |
| `--il=<slug>` | İl, **ASCII küçük harf slug**: `istanbul`, `ankara`, `izmir`, `trabzon` (Emlakjet adaptörü değeri küçük harfe çevirip boşlukları `-` yapar ve URL'ye koyar; varsayılan `trabzon`) |
| `--category=konut` | `arsa` (varsayılan) veya `konut` |
| `--max-pages=<N>` | Sayfa üst sınırı (varsayılan 20) |
| `--dry-run` | DB'ye yazmaz, normalize çıktıyı yazdırır |
| `--limit=<N>` | İlk N ilan (delist asla çalışmaz) |
| `--headful` | Tarayıcıyı görünür açar (isteğe bağlı) |

`--fast` diye bir bayrak YOKTUR. **`crawl-all` kullanılmaz**: yalnızca arsa içindir.

## Adımlar

Tek worker, il il, sırayla (paralel çalıştırma yok). Bellek baskısı yüzünden büyük illeri (İstanbul) küçük `--max-pages` partileriyle böl; her il bittiğinde RAM/Docker kullanımını kontrol et, gerekirse tarayıcı süreçlerinin kapandığından emin ol, sonra sonraki ile geç.

1. Önce her il için kuru deneme (yazma yok):

   ```bash
   npm run crawl -- --portal=emlakjet --il=trabzon --category=konut --dry-run --limit=1
   ```

2. Gerçek tarama (il başına; `<N>`'i bellek durumuna göre seç, ör. 5-10 ile başla):

   ```bash
   npm run crawl -- --portal=emlakjet --il=istanbul --category=konut --max-pages=<N>
   npm run crawl -- --portal=emlakjet --il=ankara   --category=konut --max-pages=<N>
   npm run crawl -- --portal=emlakjet --il=izmir    --category=konut --max-pages=<N>
   npm run crawl -- --portal=emlakjet --il=trabzon  --category=konut --max-pages=<N>
   ```

   Çıktıdaki özet tablosunda `blocked` ise (çıkış kodu 2) dur, nedenini `CrawlRun.notes`'tan oku.

3. Tüm iller bitince istatistikleri üret:

   ```bash
   npm run prices:konut
   ```

## Doğrulama

```sql
SELECT scope, count(*) FROM "KonutFiyatStat" GROUP BY scope;
```

Pilot il başına örnek sayıları:

```sql
SELECT il, ilce, mahalle, scope, "sampleCount"
FROM "KonutFiyatStat"
WHERE il IN ('ISTANBUL', 'ANKARA', 'IZMIR', 'TRABZON')
ORDER BY il, scope, "sampleCount" DESC
LIMIT 50;
```

(`il`/`ilce`/`mahalle` değerleri `normalizeAreaName` ile büyük harf yazılır (İ→I, ı→i, sonra büyük harf; ğ/ş/ç/ö/ü korunur): örn. `ISTANBUL`, `IZMIR`, mahalle `UĞURLU`. Beklenmedik sonuçta `SELECT DISTINCT il FROM "KonutFiyatStat";` ile gerçek yazımı gör.)

## Sonuç

Taramadan sonra doldurulacak:

| il | ilan sayısı | KonutFiyatStat satır sayısı | tarih |
| --- | --- | --- | --- |
| İstanbul (ISTANBUL) |  |  |  |
| Ankara |  |  |  |
| İzmir (IZMIR) |  |  |  |
| Trabzon |  |  |  |

## Bilinen sınırlamalar

- Villa / müstakil ev de `konut` olarak sınıflanır; m² fiyatı daire fiyatından sapabilir.
- İlan fiyatı pazarlık payı içerir; gerçek satış fiyatından yüksektir.
- Sonradan ilanı kalmayan bölgelerin `KonutFiyatStat` satırları hiç silinmez; `computedAt` bayat kalabilir.
- `normalizeAreaName` `ğ`'yi korur: ASCII'ye çevrilmiş "Ugurlu", "UĞURLU" ile birleşmez.
