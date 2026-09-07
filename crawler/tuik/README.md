# crawler/tuik — TÜİK İlçe Demografi (SDMX API)

Değer Kartı'nın üye demografi bloğunu besleyen ilçe seviyesi TÜİK verisini
TÜİK SDMX REST API'sinden çeker.

## Ön koşul: API Key

1. `veriportali.tuik.gov.tr` → giriş → "Kullanıcı Bilgileri" → SMS ile telefon
   doğrula → **API Key** üret. (Türk telefonu yoksa `info@tuik.gov.tr`'ye talep.)
2. `TUIK_API_KEY=<key>` → yerel `.env` (crawl için) ve prod deploy anında Coolify env.

## Çalıştırma

1. Migration uygulanmış olmalı: `npx prisma migrate status` → up to date.
2. Kuru koşu: `npm run crawl:tuik -- --dry-run`
3. Gerçek koşu: `npm run crawl:tuik`

## Metrikler ve seviye

| Alan | Dataflow | Seviye |
|---|---|---|
| population | DF_ADNKS_T22 | ilçe |
| populationGrowthPerMille (‰) | DF_ADNKS_T38 | ilçe |
| medianAge | DF_ADNKS_T23 | **il** (ilin tüm ilçelerine kopyalanır) |
| avgHouseholdSize | DF_ADNKS_T25 | **il** (ilin tüm ilçelerine kopyalanır) |

## Tazeleme kadansı

Yılda bir — ADNKS Şubat'ta yayınlanır. `datasets.ts`'te `DATA_YEAR`'ı güncelle,
gerekirse dataflow `version`'larını `GET /rest/dataflow/TR/<DF>/latest` ile doğrula, koş.

## Bir dataflow çekilemezse

`CrawlRun.notes` (`dataflowsFailed`) hangi metriğin düştüğünü söyler. O sütun bir
sonraki başarılı turda güncellenir; eski değer korunur (UPSERT, silme yok).
Yeni ilçe kodu görülürse `areaCodesData.ts` güncellenir.
