# Emlakjet Ulusal Crawl (Proxy + Orkestrasyon) — Tasarım (v1)

**Tarih:** 2026-08-31
**Durum:** Onaylandı (brainstorming). **İmplementasyon ERTELENDİ** — kullanıcı önce alt-proje 6/5/4'ü tamamlayıp tek seferde VPS'ye deploy etmek, ULUSAL CRAWL'I ondan sonra çalıştırmak istiyor. Bu spec o zamana kadar donmuş referans.
**Üst-proje:** "Proxy Takip Alt-Projesi" — Faz 1 / 3 (bkz. "Bağlam")

---

## Bağlam ve Amaç

Alt-proje 2 (Değer Kartı) + alt-proje 3 (Emsal İlan + Harita) **kod olarak tüm
Türkiye için genel**, ama `MarketListing` / `Neighborhood` verisi crawler v1'in
tek-il pilotu yüzünden **yalnız Trabzon** (~450 arsa ilanı). Kullanıcı ulusal
emsal verisi istiyor.

### Üst-proje dekompozisyonu (2026-08-31, onaylı)

Yaklaşım **C (hibrit)**: en zor portala (Sahibinden/PerimeterX) tüm yol
haritasını kilitleme.

| Faz | Portal | Durum |
|---|---|---|
| **1** | **Emlakjet ulusal** ← bu spec | Crawler zaten sıfır proxy maliyetiyle çalışıyor (450 Trabzon ilanı, hiç engel yok). Ölçekleme = proxy *paralelleştirme + kibarlık* için, *kaçınma* için değil. |
| 2 | Sahibinden | SPIKE önce: kullanıcının bulduğu GitHub scraper repo'ları test edilir (kod OKUNARAK — tedarik zinciri riski). Çalışırsa adaptör olarak sarılır; çalışmazsa ertele. PerimeterX + ToS. |
| 3 | Hepsiemlak | `__NUXT__` payload + proxy. En sona. |

### edermi yol haritasındaki yeri

Bu, `project_arsabil_edermi_rakip` yol haritasının **"Proxy Takip Alt-Projesi"**
adımı. Kullanıcı isteğiyle alt-proje 6'nın (derinlik) ÖNÜNE alındı çünkü ulusal
emsal verisi 4/5/6'nın hepsini besliyor.

---

## Sabitlenen Kararlar

| # | Konu | Karar |
|---|---|---|
| 1 | Yaklaşım | Kendi crawler'ımız (satın alma / sağlayıcı API değil). Faz 1 = yalnız Emlakjet. |
| 2 | Nerede çalışır | **VPS** (168.231.106.19), orchestrator systemd service / tmux, sonuç doğrudan **prod DB**'ye. Kullanıcının makinesi serbest, kesinti yok. |
| 3 | Proxy | Katman **kod olarak hazır + env-gated (varsayılan KAPALI)**. Önce proxysiz dene (Emlakjet VPS datacenter IP'yi de engellemeyebilir). İlk 2-3 ilde `CrawlRun.blocked` izle; engellenirse env ile aktive et + o an sağlayıcı seç (Decodo/IPRoyal residential TR). |
| 4 | İlan tipi | Yalnız **arsa** (arsa/tarla/bağ/bahçe/zeytinlik/arazi). Konut sonra. ~36k ilan (81 il × ~450). |
| 5 | Paralellik | Config'de parametrik (`CRAWL_WORKERS`), **varsayılan 3**. `blocked=false` ise kademeli artırılır. 3 worker ≈ 2.5-3 gün. |
| 6 | Orkestrasyon | İl-döngüsü: mevcut `runCrawl` her il için çağrılır, il başına bir `CrawlRun` satırı. **Resumable** — yakın zamanda başarılı `CrawlRun`'ı olan il atlanır. |
| 7 | Çalıştırma anı | **Ulusal crawl bu spec yazıldığında ÇALIŞTIRILMAZ.** Alt-proje 6/5/4 + VPS deploy sonrası. |
| 8 | Kapsam sınırı | Yeni veri tipi YOK — mevcut `MarketListing` + `Neighborhood` + `AreaPriceStat` (`prices:aggregate`) hattı. Sahibinden/Hepsiemlak YOK. UI değişikliği YOK. |

---

## Mimari

Tüm yeni kod `crawler/` altında (izole — `src/` app'i import etmez; ayrı
tsconfig/jest/eslint, mevcut desen).

### Yeni bileşenler

| Dosya | İş |
|---|---|
| `crawler/data/provinces.ts` | 81 il tablosu: `{ tkgmName: string; emlakjetSlug: string }[]`. `tkgmName` geocode'un mahalle centroid çözümü için (İL adı `cleanTrName`/`toLocaleUpperCase('tr-TR')` uzayında), `emlakjetSlug` `searchUrls` için. Edge case'ler elle: İstanbul→`istanbul`, Şanlıurfa→`sanliurfa`, Afyonkarahisar→`afyonkarahisar`, Kahramanmaraş→`kahramanmaras`, vb. — Türkçe karakter ASCII-fold + boşluk→tire, ama doğrulanmış sabit liste (tahmin değil). |
| `crawler/fetcher/proxy.ts` | `resolveProxyConfig(): { server: string; username?: string; password?: string } \| undefined` — env'den (`CRAWL_PROXY_SERVER`, `CRAWL_PROXY_USERNAME`, `CRAWL_PROXY_PASSWORD`). Hepsi yoksa `undefined` (proxysiz — mevcut davranış). |
| `crawler/fetcher/browser.ts` (Modify) | `createFetcher(cfg, opts)` — `opts.proxy?: ProxyConfig`; varsa `browser.newContext({ proxy })`'e geçir. Proxy başına **sticky oturum** (bir worker bir proxy oturumu; rotasyon Faz 1'de YOK — engellenmede worker durur, orchestrator raporlar). |
| `crawler/orchestrator.ts` | Ana döngü. Paylaşılan il kuyruğu (`provinces.ts`'ten, resumable filtre uygulanmış). `CRAWL_WORKERS` kadar worker; her worker: kendi `Fetcher` (kendi browser context + kendi proxy oturumu) → kuyruktan il çek → `runCrawl({ il, category:'arsa', maxPages, dryRun:false }, deps)` → bitince kuyruktan sıradaki → kuyruk boşalınca kapan. Worker'lar arası DB paylaşımlı (`prisma` singleton). |
| `scripts/crawl-all.ts` + `package.json` `crawl:all` | `orchestrator.ts`'i tetikler. `--resume` (varsayılan açık), `--force-all`, `--only=il1,il2` bayrakları. `crawl` script'iyle aynı `ts-node` deseni. |

### Resumability

Bir il atlanır ⟺ `CrawlRun` satırı var VE `source='emlakjet'` VE `category='arsa'`
VE `il=<il>` VE `finishedAt IS NOT NULL` VE `blocked=false` VE
`startedAt > now() - interval '<N> days'` (`N` = env `CRAWL_RESUME_DAYS`,
varsayılan 7). `--force-all` bu filtreyi atlar.

### Worker izolasyonu

- Her worker'ın **kendi `BrowserContext`'i** (kendi çerez havuzu, kendi proxy
  oturumu). Playwright'ta `browser.newContext()` başına ayrı.
- Tek `chromium.launch()` yeterli (context'ler izole). Bellek: 3 context ≈ makul.
- `maxRequestsPerRun` (config, 600) **il başına** — bir il 25 sayfa × ~30 ilan +
  25 arama ≈ 775 istek gerekebilir → bu limiti `maxPages`'e göre ölçekle
  (`crawler/config.ts` DEFAULT_CONFIG'de veya orchestrator override'ında).
- İstek başı gecikme (20-40 sn) + mola (her 15'te 3-8 dk) worker başına
  KORUNUR — paralellik hızı worker sayısından gelir, worker'ı hızlandırmaktan
  değil. Toplam Emlakjet yükü = 3 × (1 worker hızı) ≈ hâlâ kibar.

### `blocked` davranışı (Faz 1 — proxy rotasyonu YOK)

- Bir worker bir ilde `runCrawl` `blocked=true` dönerse: o `CrawlRun` satırı
  `blocked=true` + `notes` sebebi ile kapanır, worker **o ili bırakır**, kuyruktan
  sıradakini çeker (başka il başka mahalle → hemen engellenmeyebilir).
- Orchestrator turun sonunda özet basar: `N il tamam, M il blocked (<liste>), K il atlandı (resume)`.
- Ardışık `blocked` oranı > %50 ise orchestrator **erken durur** ("proxy gerekli"
  sinyali) — kullanıcı `CRAWL_PROXY_*` env'lerini doldurup tekrar çalıştırır.

---

## Operasyon (deploy sonrası, ayrı adım)

1. VPS'te repo güncel (`codex/professional-ui-and-land-cost` → `main` merge + deploy sonrası).
2. `npx prisma migrate deploy` (prod) — `Neighborhood` + `AreaPriceStat` migration'ları prod'a ilk kez uygulanır.
3. `tmux new -s crawl-all` içinde: `CRAWL_WORKERS=3 npm run crawl:all` (proxysiz).
4. İlk ~30 dk izle: `SELECT il, blocked, "listingsUpserted" FROM "CrawlRun" WHERE source='emlakjet' ORDER BY "startedAt" DESC LIMIT 10;`
5. `blocked` görülürse: `CRAWL_PROXY_SERVER=... CRAWL_PROXY_USERNAME=... CRAWL_PROXY_PASSWORD=... npm run crawl:all --resume` (tamamlananlar atlanır).
6. Tur bitince: `npm run prices:aggregate` (prod) → `AreaPriceStat` ulusal doldurulur.
7. `/deger`'de birkaç ilde (İstanbul, Ankara, İzmir + Trabzon) gerçek parselle emsal + sınır doğrula.

---

## Test stratejisi

Proje TDD deseni — crawler testleri `crawler/__tests__/` altında (DÜZ), worktree'de
`cd crawler && npx jest --config jest.config.js --testMatch "**/__tests__/**/*.test.ts"`.

| Birim | Kapsam |
|---|---|
| `provinces.ts` | 81 kayıt, `tkgmName` benzersiz, `emlakjetSlug` benzersiz + slug formatı (`^[a-z-]+$`), bilinen edge case'ler (istanbul/sanliurfa/afyonkarahisar/kahramanmaras) doğru |
| `proxy.ts` | env üç alan dolu → config; biri eksik → `undefined`; boş string → `undefined` |
| `browser.ts` | `opts.proxy` verilince `newContext` `proxy` ile çağrılır (mock Playwright); verilmeyince `proxy` yok (mevcut testler bozulmaz) |
| `orchestrator.ts` | resumable filtre (yakın başarılı CrawlRun atlanır, blocked/eski atlanmaz), `--force-all` filtreyi atlar, `--only` sınırlar; N worker kuyruğu tüketir; bir worker `blocked` dönince o il bırakılır + sıradakine geçilir; >%50 blocked → erken durur. `runCrawl` + `prisma` mock'lu — gerçek ağ YOK. |

**Canlı smoke:** yok (bu spec çalıştırılmıyor). Operasyon adımları yukarıda,
deploy sonrası kullanıcı onayıyla.

---

## Kapsam dışı (v1 — bilinçli)

- Sahibinden / Hepsiemlak — ayrı fazlar
- Proxy rotasyonu / oturum yenileme — Faz 1'de worker sadece durur; rotasyon Sahibinden fazında gerekecek
- Konut ilanları
- Cron / otomatik periyodik tur — elle `npm run crawl:all`
- `playwright-extra` / stealth plugin — mevcut minimal maskeleme (Emlakjet için yetti); Sahibinden fazında değerlendirilir
- Captcha çözme servisi
- İl-içi paralellik (bir il tek worker'da, sayfalar sıralı) — mevcut `runCrawl` deseni korunur
- Prod DB'ye yazma güvenlik incelemesi ayrı (bu spec sadece crawler; migration deploy + ilk ulusal tur operasyon adımında insan gözetiminde)
- `MarketListing.il/ilce/mahalle` için kalıcı `*Norm` kolonları (alt-proje 3 final review önerisi) — ayrı iyileştirme, bu spec'in kapsamı değil ama ulusal veriden önce yapılırsa `findListingsNear`'ın app-katmanı filtresi SQL'e geri taşınabilir
