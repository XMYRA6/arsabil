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

`markDelistedExcept` + kopya-birleştirme YALNIZCA **tam (`complete`)** turda çalışır:
tur, sonuçların gerçek tükenmesiyle bitmiş olmalı — yani sayfalamada bir sonraki
sayfa **0 ilan** döndürmüş olmalı. Şu durumlarda delisting ATLANIR (güvenli taraf):

- `--limit=N` verilmiş tur → asla delist etmez (kısmi `seenIds`)
- `blocked` (anti-bot) veya parser-rot abort tetiklenmiş tur
- `--max-pages` gerçek sayfa sayısından küçük → son sayfa hâlâ doluyken biten tur
- `maxRequestsPerRun` capine takılan yarım tur

Sonuç: `--limit` artık **güvenli** (hiçbir zaman delist etmez), ama yine de
inceleme için `--dry-run` ile birlikte kullanmak en iyisidir. Tam kapsamlı bir
delisting turu için `--max-pages`'i gerçek sayfa sayısının üstünde tut (crawler
boş sayfayı görünce turu `complete` işaretler).

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
- `CrawlRun.notes`: `<sebep> · unparseable=.. parseFailed=.. failed=.. delisted=.. dupes=.. complete=..`
- UI gösterimi: v1 dışı

Bkz. `docs/superpowers/specs/2026-08-29-ilan-crawler-veri-hatti-design.md` §6.
