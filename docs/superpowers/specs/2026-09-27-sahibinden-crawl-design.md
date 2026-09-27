# Sahibinden Crawl (Proxy Faz 2) — Tasarım (v1)

**Tarih:** 2026-09-27
**Durum:** Onaylandı (brainstorming). İmplementasyon planı sırada.
**Üst-proje:** "Proxy Takip Alt-Projesi" — Faz 2 / 3 (bkz. Faz 1: `docs/superpowers/specs/2026-08-31-emlakjet-ulusal-crawl-design.md`, tamamlandı+merge'li)

---

## Bağlam ve Amaç

Faz 1 (Emlakjet ulusal crawl) kod tarafı tamamlandı. Faz 2 = Sahibinden — üst-projenin
kendi kararına göre "en zor portal" (PerimeterX + agresif bot koruması), önce SPIKE
edilmesi gereken adım.

**Spike (2026-09-27, bu oturum):** Kullanıcının önceden bulduğu bir repo linki yoktu;
açık kaynak Sahibinden scraper'ları web'de arandı, en alakalı ve bakımlı olanı
(`tyegen/sahibinden-emlak-scraper`, gerçek-emlak-odaklı bir Apify Actor, Puppeteer +
`puppeteer-extra-plugin-stealth`) **koddan OKUNARAK** incelendi — hiçbir kod
ÇALIŞTIRILMADI/kurulmadı (tedarik zinciri riski, spec'in kendi kararı).

**Spike bulguları:**
- Sahibinden'in PerimeterX koruması gerçekten agresif — repo'nun kendisi "proxy+stealth
  tek başına yeterli değil" diyor.
- Asıl yük taşıyan mekanizma: **gerçek bir insanın tarayıcıda meydan okumayı çözüp
  dışa aktardığı oturum çerezleri** (`cf_clearance` + PerimeterX'in `_px3`/`_pxhd`/
  `_pxvid`/`pxcts` çerezleri), otomasyon aracına enjekte ediliyor.
- Ek teknikler: tam fingerprint spoofing (`navigator.webdriver` dışında `window.chrome`,
  `permissions.query`, `languages`, `platform`, `hardwareConcurrency`, `deviceMemory`),
  arama→detay sayfası geçişini taklit eden `Referer`+`Sec-Fetch-Site: same-origin`
  header zinciri, hedef sayfadan önce ana sayfaya "pre-warm" ziyareti (cf_clearance
  kazanmak için), ve **RESIDENTIAL TR proxy zorunluluğu** (datacenter IP'ler
  engelleniyor).
- Otomatik "press-and-hold" (PerimeterX'in "Basılı Tutun" meydan okuması) çözücü
  denemesi VAR ama repo'nun kendisi bunu güvenilmez/yedek plan olarak nitelendiriyor.

**Kritik fark (Emlakjet'e göre):** Emlakjet sıfır-dokunuş (giriş yok, çerez yok).
Sahibinden'de **tekrarlayan bir insan bağımlılığı** var — çerezler süresi dolunca
(cf_clearance/PerimeterX çerezleri saatler mertebesinde geçerli) birinin tekrar
tarayıcıda meydan okumayı çözüp dışa aktarması gerekiyor. Bu, "bir kere yaz, sürekli
çalıştır" değil, kalıcı bir operasyonel bakım yükü.

---

## Sabitlenen Kararlar (brainstorming, 2026-09-27)

| # | Konu | Karar |
|---|---|---|
| 1 | Orkestrasyon | **Ayrı, muhafazakâr giriş noktası** (`crawler/scripts/crawl-sahibinden.ts`). Emlakjet'in `crawl-all.ts`/`orchestrator.ts` worker havuzuna, early-stop mantığına DOKUNULMAZ. |
| 2 | Paralellik | **Tek worker**, sıralı il döngüsü. Çoklu paralel oturum = aynı IP'den çoklu çerez seti gerektirir (karmaşık+riskli), v1'de yok. |
| 3 | Çerez kaynağı | **Elle dışa aktarılan JSON dosyası** — `crawler/data/sahibinden-cookies.json` (gitignore'lu). Bir örnek/şablon dosyası (`sahibinden-cookies.example.json`) commit'lenir. |
| 4 | Bayat çerez davranışı | **Tek seferlik preflight kontrolü** — ilk ile geçmeden önce ana sayfaya bir istek atılır, engellenirse HİÇBİR il denenmeden net bir hata mesajıyla durulur. Mid-run (çalışma ortasında) tekrar kontrol YOK — bilinçli v1 riski (aşağıda "Kapsam Dışı"). |
| 5 | Proxy | **Zorunlu** (Emlakjet'ten farkı — orada proxy opsiyonel/varsayılan kapalıydı). Spike bulgusu net: Sahibinden datacenter IP'leri engelliyor. `resolveProxyConfig()` `undefined` dönerse crawler hiç başlamaz. |
| 6 | Fetcher zenginleştirmesi | `createFetcher()`'a opsiyonel `cookies`/`fullStealth`/`refererChain` alanları eklenir. **Emlakjet'in mevcut çağrıları değişmez** (tüm yeni alanlar opsiyonel, verilmezse davranış bugünküyle bit-bit aynı). |
| 7 | Resumability | `orchestrator.ts`'teki `buildQueue()`/`PROVINCES`/`unmatchedOnlyTokens` **yeniden kullanılır**. Tek değişiklik: `buildQueue`'nun hardcoded `source:'emlakjet'` filtresi parametreleştirilir (varsayılan `'emlakjet'` — `crawl-all.ts` hiç değişmez). |
| 8 | Kapsam | Yalnız **arsa** kategorisi (Emlakjet ile tutarlı). Konut yok. |
| 9 | Otomatik meydan okuma çözücü | **v1 KAPSAM DIŞI** — spike'ın kaynağı bile bunu güvenilmez buluyor, ek karmaşıklığa değmez. |
| 10 | İl URL slug'ı | Faz 1'in `Province.emlakjetSlug`'ı **yeniden kullanılır** (yeni bir `sahibindenSlug` alanı EKLENMEZ). Sahibinden'in gerçek URL'lerine karşı slug'ın doğru olup olmadığı canlı DOĞRULANMADI — ilk çalıştırmadan önce operasyonel bir kontrol adımı (Faz 1'in diakritikli-il kontrolüyle aynı desen). |

---

## Mimari

### Yeni/değişen dosyalar

| Dosya | İş |
|---|---|
| `crawler/data/sahibinden-cookies.example.json` (yeni, commit'lenir) | Beklenen çerez formatını gösteren şablon — gerçek değer YOK. |
| `crawler/data/sahibinden-cookies.json` (yeni, **gitignore'lu**) | Kullanıcının elle doldurduğu gerçek oturum çerezleri. |
| `crawler/fetcher/sahibindenCookies.ts` (yeni) | `loadSahibindenCookies()` — dosyayı okur, süresi geçmiş çerezleri filtreler, boş/eksik/hepsi-bayat durumunda açık mesajla `throw`. |
| `crawler/fetcher/browser.ts` (Modify) | `createFetcher(cfg, opts)` — `opts.cookies`/`opts.fullStealth`/`opts.refererChain` opsiyonel alanları. |
| `crawler/orchestrator.ts` (Modify, minimal) | `OrchestratorDeps.source?: string` (varsayılan `'emlakjet'`), `buildQueue()`'nun Prisma sorgusunda kullanılır. |
| `crawler/scripts/crawl-sahibinden.ts` (yeni) | CLI: preflight → resumable sıralı il döngüsü → özet. |

### Çerez formatı ve yaşam döngüsü

`sahibinden-cookies.json`, Playwright'ın `context.addCookies()` beklediği alanlara
yakın bir JSON dizisi:

```json
[
  { "name": "cf_clearance", "value": "...", "domain": ".sahibinden.com", "path": "/", "secure": true, "httpOnly": true, "sameSite": "Lax", "expires": 1780000000 },
  { "name": "_px3", "value": "...", "domain": ".sahibinden.com", "path": "/", "secure": true, "httpOnly": false, "sameSite": "Lax" }
]
```

`loadSahibindenCookies(filePath?, now?)`:
- Dosya yoksa: `throw new Error('sahibinden-cookies.json yok — gerçek tarayıcıda sahibinden.com'a girip meydan okumayı çöz, çerezleri dışa aktar (bkz. sahibinden-cookies.example.json)')`.
- JSON parse hatası: aynı şekilde açık mesajla `throw`.
- Her çerezin `expires` alanı varsa ve `now()`'dan (epoch saniye) küçükse **filtrelenir** (session çerezi — `expires` yok veya `-1` — her zaman geçerli sayılır).
- Filtre sonrası dizi **boşsa**: `throw new Error('tüm çerezler bayat — yeniden dışa aktar')`.
- Aksi halde Playwright'a verilecek şekle normalize edilmiş diziyi döner (`sameSite` eksikse `'Lax'` varsayılır).

### `createFetcher()` genişletmesi (`browser.ts`)

```typescript
export async function createFetcher(
  cfg: CrawlConfig,
  opts: {
    headful?: boolean
    proxy?: ProxyConfig
    cookies?: Array<{ name: string; value: string; domain: string; path: string; secure?: boolean; httpOnly?: boolean; sameSite?: 'Strict' | 'Lax' | 'None' }>
    fullStealth?: boolean
    refererChain?: boolean
  } = {},
): Promise<Fetcher>
```

- `opts.cookies` verilirse: context oluşturulduktan hemen sonra `await context.addCookies(opts.cookies)` — Playwright'ın context-seviyesi cookie API'si, her sayfa/istek için otomatik uygulanır (Puppeteer'daki gibi sayfa başına yeniden enjeksiyona gerek yok).
- `opts.fullStealth` `true` ise: mevcut `webdriver`-mask `addInitScript`'ine ek olarak ikinci bir `addInitScript` — `window.chrome` nesnesi, `navigator.permissions.query` override, `navigator.languages`/`platform`/`hardwareConcurrency`/`deviceMemory` sabitlenmiş gerçekçi değerler.
- `opts.refererChain` `true` ise: `createFetcher`'ın closure'ında `requestCount` gibi `let lastUrl: string | undefined` tutulur. Her `get(url)` çağrısında, `page.goto()`'dan ÖNCE `page.setExtraHTTPHeaders({...baseHeaders, ...(lastUrl ? { Referer: lastUrl, 'Sec-Fetch-Site': 'same-origin' } : { 'Sec-Fetch-Site': 'none' })})` ayarlanır (`baseHeaders`: `Accept-Language`, `Accept`, `Sec-Fetch-Dest:'document'`, `Sec-Fetch-Mode:'navigate'`, `Sec-Fetch-User:'?1'`, `Upgrade-Insecure-Requests:'1'`). Başarılı fetch'ten sonra `lastUrl = url`. `run.ts` bir arama sayfasını çekip HEMEN ardından o sayfadaki stub'ların detaylarını çektiği için (kod değişmeden), bu otomatik olarak spike'ın "detay sayfası aynı-kaynaklı görünsün" istediği zinciri üretir. `lastUrl` **il sınırında sıfırlanmaz** — tek bir `createFetcher()` çağrısı tüm sıralı il döngüsü boyunca yeniden kullanıldığından, bir ilin ilk arama sayfası isteği bir önceki ilin son detay sayfasını `Referer` olarak taşıyabilir. Bilinçli kabul edilen davranış: hâlâ `sahibinden.com→sahibinden.com` (same-origin) olduğu için zararsız — spike'ın asıl endişesi (bir detay sayfasının HİÇ referer'sız, doğrudan navigasyon gibi görünmesi) hiçbir zaman oluşmaz.
- Hiçbir yeni alan verilmezse (`opts` boş veya sadece `headful`/`proxy` içeriyorsa): davranış bugünküyle **bit-bit aynı** — Emlakjet'in hiçbir çağrısı değişmez.

### `orchestrator.ts` minimal değişikliği

`OrchestratorDeps`'e opsiyonel `source?: string` eklenir; `buildQueue()`'daki
`crawlRun.findMany` sorgusunun `where.source` alanı `deps.source ?? 'emlakjet'` olur.
`crawl-all.ts` bu alanı hiç geçmediği için davranışı değişmez.

### `crawl-sahibinden.ts` akışı

1. `parseArgs`: `--only=`, `--force-all`, `--max-pages` (varsayılan 20), `--limit`, `--headful`.
2. `--only` verilmişse `unmatchedOnlyTokens` ile doğrula (Faz 1'deki `crawl-all.ts` deseniyle birebir) — bilinmeyen token → net hata + `exit(1)`, hiçbir şey başlamadan.
3. `resolveProxyConfig()` — **`undefined` dönerse hemen `exit(1)`** ("Sahibinden residential proxy olmadan neredeyse her zaman engellenir — CRAWL_PROXY_* env'lerini doldurun").
4. `loadSahibindenCookies()` — dosya yok/boş/hepsi bayatsa kendi hata mesajıyla zaten `throw` eder, CLI bunu yakalayıp `exit(1)`.
5. `createFetcher(cfg, { proxy, cookies, fullStealth: true, refererChain: true, headful })`.
6. **Preflight** — saf bir fonksiyona çıkarılır (test edilebilir olsun diye, salt CLI-wiring değil):

```typescript
export function evaluateSahibindenPreflight(
  homepageResult: { html: string; status: number },
): { ok: boolean; reason: string | null } {
  const check = detectHardBlock(homepageResult.html, homepageResult.status)
  return check.blocked ? { ok: false, reason: check.reason } : { ok: true, reason: null }
}
```

   CLI: `const preflight = await fetcher.get('https://www.sahibinden.com'); const verdict = evaluateSahibindenPreflight(preflight)`. `verdict.ok === false` → `fetcher.close()` + net mesaj + `exit(1)`, hiçbir il denenmez.
7. `buildQueue({ ...deps, source: 'sahibinden' })` — resumable filtre + `--only`/`--force-all`.
8. Kuyruktaki her il için **sıralı** (tek worker, `Promise.all` YOK): `runCrawl({ il: province.tkgmName, ilUrlOverride: province.emlakjetSlug, category: 'arsa', maxPages, dryRun: false }, { adapter: sahibindenAdapter, client: prisma, fetcher, geocodeDeps, detectBlock, now, cfg })` — `run.ts` **değişmeden** yeniden kullanılır.
9. Her il sonrası `completed`/`blocked` listelerine ekle (Faz 1'in `OrchestratorResult` şekliyle tutarlı ama basit bir `for...of` biriktirici, worker havuzu yok). Erken-dur YOK (karar #4).
10. Sonunda özet log + `blocked.length > 0` ise `console.table`. `fetcher.close()`, `prisma.$disconnect()`.

---

## Hata Yönetimi

| Durum | Davranış |
|---|---|
| `--only` bilinmeyen il/slug | `exit(1)`, hiçbir fetch/DB işlemi yok (Faz 1'le aynı desen). |
| Proxy env eksik | `exit(1)`, fetcher hiç açılmaz. |
| Çerez dosyası yok / boş / hepsi bayat | `exit(1)`, fetcher hiç açılmaz (çerezler fetcher oluşturulmadan ÖNCE yüklenir). |
| Preflight engellenir | `exit(1)`, fetcher kapatılır, hiçbir il denenmez. |
| Bir ilde `runCrawl` `blocked` döner (mid-run bayatlık) | O il `blocked` listesine eklenir, **sıradaki ile geçilir** (Emlakjet'in tekil-il-blocked davranışıyla tutarlı) — ama Emlakjet'in "%50+ blocked → erken dur" mantığı burada YOK (karar #4, kabul edilen risk). |
| Beklenmeyen hata (`runCrawl` fırlatır) | Faz 1'in orchestrator'ındaki gibi yakalanır, o il `blocked` listesine hata mesajıyla eklenir, tur çökmez. |

---

## Test Stratejisi

| Birim | Kapsam |
|---|---|
| `sahibindenCookies.ts` | Geçerli dosya → normalize edilmiş çerez dizisi; süresi geçmiş çerez filtrelenir; session çerezi (expires yok/-1) her zaman geçerli; hepsi bayatsa `throw`; dosya yoksa `throw`. |
| `browser.ts` (mevcut `browser.test.ts`'e ekleme) | `cookies` verilince `context.addCookies` doğru argümanla çağrılır; `fullStealth:true` iken ikinci bir `addInitScript` çağrısı olur; `refererChain:true` iken ilk istekte `Sec-Fetch-Site:'none'` + `Referer` YOK, ikinci istekte önceki URL `Referer` olarak + `Sec-Fetch-Site:'same-origin'`. |
| `orchestrator.ts` (mevcut `orchestrator.test.ts`'e ekleme) | `source` verilince `findMany`'nin `where.source` alanı o değeri alır; verilmezse `'emlakjet'` varsayılanı (mevcut testler etkilenmez). |
| `crawl-sahibinden.ts` — `evaluateSahibindenPreflight()` | Saf fonksiyon olarak test edilir: temiz sayfa → `ok:true`; challenge kalıbı içeren HTML → `ok:false` + sebep; 403/429 durum kodu → `ok:false`. |
| `crawl-sahibinden.ts` CLI wiring (parseArgs, proxy/cookie exit akışı) | Faz 1'in `crawl-all.ts`'i gibi ayrı unit test YOK — ince bağlama katmanı, altındaki her parça (`unmatchedOnlyTokens`, `resolveProxyConfig`, `loadSahibindenCookies`, `evaluateSahibindenPreflight`, `buildQueue`, `runCrawl`) zaten ayrı test edilmiş. |

**Canlı smoke:** yok (bu spesifikasyon çalıştırılmıyor). İlk gerçek çalıştırma, kullanıcının
gerçek çerez dışa aktarımı + residential proxy tedariki + Faz 1'deki gibi birkaç ilde
manuel doğrulama gerektiren, ayrı bir operasyonel adım.

---

## Kapsam Dışı (v1 — bilinçli)

- Otomatik "press-and-hold" (PerimeterX) meydan okuma çözücü.
- Paralel Sahibinden worker'ları (aynı IP'den çoklu çerez seti gerektirir).
- Mid-run çerez sağlık kontrolü / otomatik yeniden-preflight (yalnız başlangıçta tek kontrol — karar #4).
- Giriş/kimlik bilgisi otomasyonu — çerezler her zaman insan tarafından dışa aktarılır.
- Konut ilanları (yalnız arsa).
- Sahibinden slug'ının 81 il için gerçek URL'lere karşı canlı doğrulanması — operasyonel adım, bu planın kapsamında değil (Faz 1'in diakritikli-il kontrolüyle aynı desen).
- Emlakjet'in ulusal orkestratörüyle (`crawl-all.ts`) birleştirme/parametrik tek-CLI — bilinçli olarak ayrı tutuldu (karar #1).
