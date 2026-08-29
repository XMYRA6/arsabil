# ArsaBil İlan Crawler (v1)

Lokal çalışan, elle tetiklenen crawler. Sahibinden / Emlakjet / Hepsiemlak'tan
satılık arsa + konut ilanlarını çeker, normalize eder, `MarketListing`
tablosuna yazar.

## Çalıştırma

```bash
npm run crawl -- --portal=sahibinden --il=trabzon --category=arsa --max-pages=5
npm run crawl -- --portal=sahibinden --il=trabzon --category=arsa --dry-run --limit=1
```

## Test

```bash
npm run test:crawler
```

## Kapsam / sınırlar

Bkz. `docs/superpowers/specs/2026-08-29-ilan-crawler-veri-hatti-design.md` §6.
Otomasyon, proxy, kopya birleştirme, UI gösterimi v1 dışı.

## Fixture yenileme

Portal HTML'i değişince testler kırılır. `crawler/fixtures/` altındaki ilgili
`.html` dosyasını tarayıcıdan "Sayfayı kaydet" ile yenile (kişisel veriyi —
telefon, ilan sahibi adı — sil), testi güncelle.

## Migration durumu

`prisma/migrations/20260829120000_add_market_listing/migration.sql` oluşturuldu
ama **henüz uygulanmadı** (bu makinede çalışan bir Postgres yok). Bir DB
hazır olduğunda elle uygulanmalı:

```bash
npx prisma migrate deploy
```
