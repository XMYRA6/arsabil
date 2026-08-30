# ArsaBil İlan Crawler (v1)

Lokal çalışan, elle tetiklenen crawler. Sahibinden / Emlakjet / Hepsiemlak'tan
satılık arsa + konut ilanlarını çeker, normalize eder, `MarketListing`
tablosuna yazar.

## Çalıştırma

```bash
npm run crawl -- --portal=sahibinden --il=trabzon --category=arsa --max-pages=5
npm run crawl -- --portal=sahibinden --il=trabzon --category=arsa --dry-run --limit=1
```

## Delisting (ilan düşürme) ne zaman çalışır?

`markDelistedExcept` + cross-portal kopya-birleştirme YALNIZCA aşağıdaki
koşulların **HEPSİ** sağlandığında çalışır:

1. `--dry-run` DEĞİL.
2. Tur `blocked` değil — hiçbir sayfada anti-bot (HTTP 403/429/5xx veya challenge
   kalıbı) görülmedi **ve** abort-oranı (gözlenemeyen ilan oranı > %30) tetiklenmedi.
3. Tur `complete` — sayfalama döngüsü **temiz bir boş sayfaya** çarparak bitti:
   sayfa index'i > 0, HTTP 200, challenge işareti yok, 0 ilan. Tüm `--max-pages`'i
   dolaşıp son sayfa hâlâ doluysa bu `complete` SAYILMAZ.
4. Tur `cleanRun` — sıfır ilan-başı contained fault (`failed`) **ve** sıfır parse
   hatası (`parseFailed`).

Yani: `--max-pages` gerçek sayfa sayısına eşit/altındaysa, ya da turda tek bir
geçici hata bile olduysa, o tur delist etmez — delisting sonraki temiz + tam
sayfalanmış turda olur. `--limit=N` verilen tur asla delist etmez (kısmi `seenIds`).

`CrawlRun.notes` durumu taşır: `complete=<bool>`, ve atlandıysa
`delistSkipped=<blocked|not-complete|not-clean>`. Operatör neden atlandığını
buradan görür.

Tam kapsamlı bir delisting turu için `--max-pages`'i gerçek sayfa sayısının
belirgin şekilde üstünde tut (crawler temiz boş sayfayı görünce `complete` yapar).
`--limit` inceleme için hâlâ `--dry-run` ile eşleştirilmeli.

## Test

```bash
npm run test:crawler
```

## Kapsam / sınırlar

v1'de **Sahibinden** ve **Emlakjet** adaptörleri hazır. **Hepsiemlak v1 dışı** (proxy
gerekli, minified `window.__NUXT__` yükü; proxy-geçiş sonrası eklenir). Komutte
`--portal=hepsiemlak` kullanmaya çalışırsanız CLI reddeder.

Bkz. `docs/superpowers/specs/2026-08-29-ilan-crawler-veri-hatti-design.md` §6.
Otomasyon, proxy, kopya birleştirme, UI gösterimi v1 dışı.

## Fixture yenileme

Portal HTML'i değişince testler kırılır. `crawler/fixtures/` altındaki ilgili
`.html` dosyasını tarayıcıdan "Sayfayı kaydet" ile yenile (kişisel veriyi —
telefon, ilan sahibi adı — sil), testi güncelle.

## Prod'a yazma (ilk kez)

Crawler lokal çalışır ama prod DB'ye yazacaksa `MarketListing` migration'ı
prod'da uygulanmalı:

```bash
DATABASE_URL="<prod url>" npx prisma migrate deploy
```

Migration dosyası `prisma/migrations/20260829120000_add_market_listing/` altında
hazır ama **henüz hiçbir ortamda uygulanmadı** (SDD oturumunda lokal DB yoktu).

`migrate deploy` öncesi durumu kontrol et:

```bash
DATABASE_URL="<prod url>" npx prisma migrate status
```

Sonra `crawl` komutunu prod DB'ye bakacak şekilde çalıştır. Prod'a yazarken
`--max-pages` küçük tut, `CrawlRun.blocked` sonuçlarını izle.

## Canlı smoke — bu oturumda ÇALIŞTIRILMADI

Bu adımlar Task 13'ün deferred Step 6–7'sini tamamlar (gerçek DB + network ister):

1. **DB başlat:**
   ```bash
   npm run dev:db
   ```

2. **Migration uygula** (lokal Postgres'e):
   ```bash
   npx prisma migrate deploy
   ```
   ya da `migrate dev` (otomatik).

3. **Dry-run (yazma yok):**
   ```bash
   npm run crawl -- --portal=emlakjet --il=trabzon --category=arsa --dry-run --limit=1 --headful
   ```
   Beklenti: 1 ilanın normalize + geo JSON'ı stdout'a yazdırılır, DB yazılmaz.

4. **Gerçek crawl (Emlakjet):**
   ```bash
   npm run crawl -- --portal=emlakjet --il=trabzon --category=arsa --max-pages=2
   npm run crawl -- --portal=emlakjet --il=trabzon --category=arsa --max-pages=2
   ```
   Beklenti: 1. koşu ilanları `MarketListing`'e yazar, 2. koşu aynı kayıtları upsert eder
   (yeni satır yok), `CrawlRun` özeti gösterilir.

5. **Sahibinden testi:**
   ```bash
   npm run crawl -- --portal=sahibinden --il=trabzon --category=arsa --max-pages=2
   ```
   **Not:** Sahibinden fixture yakalama sırasında PerimeterX tarayıcıyı engelledi.
   Gerçek crawl muhtemelen proxy-geçiş sonrası gerekecek.

Emlakjet fixture yakalama sırasında headful mod'da çalıştı — ilk canlı hedef olarak tercih
edilir.

## Bilinen v1 sınırları

- Otomasyon / cron: yok (elle `npm run crawl` ile tetiklenir)
- Proxy: yok (Hepsiemlak gerekir, PerimeterX muhtemelen Sahibinden'i engeller)
- Kopya birleştirme: tur içi adaylar + tur sonunda (yalnız `complete` turda)
  dokunulan mahallelerdeki diğer portal aktif ilanları — `dupeOfId` yazılır, lokal merge değil
- `blocked` bayrağı: anti-bot, parser-rot abort **ve** `maxRequestsPerRun` cap'ini
  kapsar — hepsinde delisting atlanır; ayrımı `CrawlRun.notes` verir
- `CrawlRun.notes`: `<sebep> · unparseable=.. parseFailed=.. failed=.. delisted=.. dupes=.. complete=.. [delistSkipped=..]`
- **Kabul edilen artık risk:** sayfa index > 0'da HTTP 200 dönen ama tanınan
  challenge işareti taşımayan bir "soft-block" sayfası, gerçek boş sayfadan
  ayırt edilemez → tükenme (`complete`) sayılır. İlk canlı Sahibinden turunda
  `CrawlRun` satır sayılarını (özellikle `delisted`) yakından izle.
- UI gösterimi: v1 dışı

Bkz. `docs/superpowers/specs/2026-08-29-ilan-crawler-veri-hatti-design.md` §6.
