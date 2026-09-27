# Sahibinden Crawl (Proxy Faz 2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a separate, conservative, single-worker Sahibinden crawl entrypoint (`npm run crawl:sahibinden`) that reuses the existing arsa-crawling pipeline (`runCrawl()`, delisting, dedupe, upsert — all untouched) but drives a Playwright `Fetcher` hardened with the techniques a code-only spike (`tyegen/sahibinden-emlak-scraper`, read not run) found necessary: real exported session cookies, full fingerprint spoofing, a Referer/Sec-Fetch header chain, and a mandatory residential proxy — with a fail-fast preflight so a dead cookie set aborts before touching any province.

**Architecture:** `crawler/fetcher/browser.ts`'s `createFetcher()` gets three new optional fields (`cookies`, `fullStealth`, `refererChain`) — all no-ops when omitted, so every existing Emlakjet call site stays byte-identical. A new `crawler/fetcher/sahibindenCookies.ts` loads and validates a gitignored, manually-exported cookie file. `crawler/orchestrator.ts` gets one additive field (`source?: string`, defaulting to `'emlakjet'`) so its existing `buildQueue()` resumability logic can be reused for Sahibinden without touching `crawl-all.ts`. A new `crawler/scripts/crawl-sahibinden.ts` is the CLI: validates proxy+cookies+preflight, then runs a plain sequential `for` loop (no worker pool, no early-stop) over `buildQueue()`'s result, calling the unmodified `runCrawl()` per province.

**Tech Stack:** TypeScript, Playwright (`@playwright/test`), Prisma (existing `CrawlRun` model — no new migration), Jest (`ts-jest`), Node's built-in `fs`/`path` (cookie file I/O).

**Spec:** `docs/superpowers/specs/2026-09-27-sahibinden-crawl-design.md`

## Global Constraints

- This is **Proxy Faz 2**, Sahibinden only, `arsa` category only — identical category scope to Faz 1.
- `crawler/scripts/crawl-all.ts` and `crawler/orchestrator.ts`'s worker pool / early-stop logic (`runWorker`, `runOrchestrator`) are **not modified** beyond the one additive `source` field on `OrchestratorDeps` and its one-line use inside `buildQueue()`. Faz 1's existing tests must stay green unchanged.
- `crawler/fetcher/browser.ts`'s `createFetcher()` signature only gains optional fields. Every existing call site (Emlakjet's `crawl-all.ts`, `run.ts`'s CLI) must keep working with zero changes and zero behavior difference.
- No new Prisma model, no new migration. `CrawlRun.source = 'sahibinden'` is just a new value in an existing free-text column.
- Real session cookies are **never committed**. `crawler/data/sahibinden-cookies.json` is gitignored; only a template (`sahibinden-cookies.example.json`, no real values) is committed.
- Sahibinden crawl **requires** a resolved proxy config (`resolveProxyConfig()` must not return `undefined`) — this is the one place Faz 2 diverges from Faz 1's "try proxy-less first" default, per the spike's own finding that Sahibinden blocks datacenter IPs.
- This plan does not run the crawl. No real cookies, no real proxy credentials, no live network calls in any task's verification — everything is unit-tested with mocked Playwright/Prisma, matching Faz 1's approach exactly.
- Tests run with `cd crawler && npx jest --config jest.config.js --testMatch "**/__tests__/**/*.test.ts"` or `npm run test:crawler` from repo root.

## Review Focus

- `createFetcher`'s new `refererChain` state (`lastUrl`) is a closure variable shared across every `.get()` call on that fetcher instance for the whole process lifetime — a test that only calls `.get()` once cannot distinguish "always sends no Referer" from "correctly sends no Referer on the first call". Task 2's tests call `.get()` twice on the same fetcher and assert the transition, not just a single snapshot.
- `loadSahibindenCookies()`'s expiry filter must treat *both* a missing `expires` field and the `-1` session-cookie sentinel as "always valid" — a filter that only checks "is `expires` in the past" without excluding `-1` would incorrectly discard nothing (harmless) but a naive `expires < now` check without a `typeof`/positivity guard would incorrectly treat `-1` as "expired 1970-something" and discard genuinely-valid session cookies. Task 1's tests cover both the missing-field and the `-1` cases explicitly.
- `evaluateSahibindenPreflight()` reuses `detectHardBlock()`, which only catches HTTP 4xx/5xx and known challenge-page text patterns — it does **not** detect a "successful-looking but actually empty/wrong" homepage (e.g., a redirect to an unrelated page that returns 200 with different but non-challenge HTML). This is an accepted v1 gap identical in kind to Faz 1's own `detectBlock` limitations; not something this plan's tests can close without a real live page to compare against.
- `buildQueue()`'s new `source` parameter is read once at the top of the function (`deps.source ?? 'emlakjet'`) — a task that adds this incorrectly by hardcoding `'sahibinden'` somewhere instead of threading `deps.source` would silently break Faz 1's resumability (Emlakjet runs would start seeing Sahibinden's `CrawlRun` rows, or vice versa) without any existing test catching it, because Faz 1's own tests never pass `source` and would still pass either way. Task 3's test explicitly asserts the value threaded into the Prisma `where` clause for both the default and the explicit-value cases.
- The CLI's cookie-loading failure path (`loadSahibindenCookies()` throwing) happens *before* `createFetcher()` is ever called — a plan that put proxy/cookie validation after fetcher creation would open (and leak, if not carefully closed) a real browser process before discovering the run can't proceed. Task 4's step order (proxy check → cookie load → *then* `createFetcher`) is written to guarantee this ordering; the fetcher is provably never constructed on either failure path.

---

## File Structure

| File | Responsibility |
|---|---|
| `crawler/data/sahibinden-cookies.example.json` (new, committed) | Template showing the expected cookie shape — no real values. |
| `crawler/data/sahibinden-cookies.json` (new, **gitignored**) | Real, manually-exported session cookies — never committed. |
| `.gitignore` (modify) | Ignore the real cookie file. |
| `crawler/fetcher/sahibindenCookies.ts` (new) | `SahibindenCookie` type + `loadSahibindenCookies()` — reads, validates, filters expired cookies. |
| `crawler/fetcher/browser.ts` (modify) | `createFetcher()` gains `cookies`/`fullStealth`/`refererChain` optional opts. |
| `crawler/orchestrator.ts` (modify) | `OrchestratorDeps.source?: string`, used in `buildQueue()`'s Prisma query. |
| `crawler/scripts/crawl-sahibinden.ts` (new) | CLI: arg parsing, proxy/cookie/preflight checks, sequential province loop. |

---

### Task 1: Cookie loader (`crawler/fetcher/sahibindenCookies.ts`)

**Files:**
- Create: `crawler/data/sahibinden-cookies.example.json`
- Modify: `.gitignore`
- Create: `crawler/fetcher/sahibindenCookies.ts`
- Test: `crawler/__tests__/sahibindenCookies.test.ts`

**Interfaces:**
- Produces: `export interface SahibindenCookie { name: string; value: string; domain: string; path: string; expires?: number; httpOnly?: boolean; secure?: boolean; sameSite?: 'Strict' | 'Lax' | 'None' }`, `export function loadSahibindenCookies(filePath?: string, now?: () => Date): SahibindenCookie[]`.

- [ ] **Step 1: Add the gitignore entry**

Append to `.gitignore` (after the existing `# env files` section, or at the end — exact position doesn't matter):

```
# sahibinden crawl — gerçek oturum çerezleri asla commit edilmez
crawler/data/sahibinden-cookies.json
```

- [ ] **Step 2: Create the example template**

```json
[
  {
    "name": "cf_clearance",
    "value": "REPLACE_ME",
    "domain": ".sahibinden.com",
    "path": "/",
    "secure": true,
    "httpOnly": true,
    "sameSite": "Lax",
    "expires": 1780000000
  },
  {
    "name": "_px3",
    "value": "REPLACE_ME",
    "domain": ".sahibinden.com",
    "path": "/",
    "secure": true,
    "httpOnly": false,
    "sameSite": "Lax"
  }
]
```

Save as `crawler/data/sahibinden-cookies.example.json`.

- [ ] **Step 3: Write the failing test**

```typescript
// crawler/__tests__/sahibindenCookies.test.ts
import * as fs from 'node:fs'
import * as path from 'node:path'
import * as os from 'node:os'
import { loadSahibindenCookies } from '../fetcher/sahibindenCookies'

const createdFiles: string[] = []

function writeTempCookieFile(content: unknown): string {
  const file = path.join(
    os.tmpdir(),
    `sahibinden-cookies-test-${Date.now()}-${Math.random().toString(36).slice(2)}.json`,
  )
  fs.writeFileSync(file, typeof content === 'string' ? content : JSON.stringify(content))
  createdFiles.push(file)
  return file
}

afterEach(() => {
  for (const f of createdFiles.splice(0)) {
    try {
      fs.unlinkSync(f)
    } catch {
      // already gone — fine
    }
  }
})

describe('loadSahibindenCookies', () => {
  it('geçerli dosyadan tüm taze çerezleri döner', () => {
    const file = writeTempCookieFile([
      { name: 'cf_clearance', value: 'abc', domain: '.sahibinden.com', path: '/', expires: 9999999999 },
    ])
    const cookies = loadSahibindenCookies(file, () => new Date('2026-09-27T00:00:00Z'))
    expect(cookies).toEqual([
      { name: 'cf_clearance', value: 'abc', domain: '.sahibinden.com', path: '/', expires: 9999999999 },
    ])
  })

  it('süresi geçmiş çerezi filtreler, tazeleri korur', () => {
    const file = writeTempCookieFile([
      { name: 'expired', value: 'x', domain: '.sahibinden.com', path: '/', expires: 1000 },
      { name: 'fresh', value: 'y', domain: '.sahibinden.com', path: '/', expires: 9999999999 },
    ])
    const cookies = loadSahibindenCookies(file, () => new Date('2026-09-27T00:00:00Z'))
    expect(cookies.map((c) => c.name)).toEqual(['fresh'])
  })

  it('expires alanı olmayan (session) çerezi her zaman geçerli sayar', () => {
    const file = writeTempCookieFile([{ name: 'session_c', value: 'z', domain: '.sahibinden.com', path: '/' }])
    const cookies = loadSahibindenCookies(file, () => new Date('2026-09-27T00:00:00Z'))
    expect(cookies).toHaveLength(1)
  })

  it('expires:-1 (session sentinel) çerezi her zaman geçerli sayar', () => {
    const file = writeTempCookieFile([
      { name: 'session_c', value: 'z', domain: '.sahibinden.com', path: '/', expires: -1 },
    ])
    const cookies = loadSahibindenCookies(file, () => new Date('2026-09-27T00:00:00Z'))
    expect(cookies).toHaveLength(1)
  })

  it('hepsi bayatsa açık mesajla throw eder', () => {
    const file = writeTempCookieFile([{ name: 'expired', value: 'x', domain: '.sahibinden.com', path: '/', expires: 1000 }])
    expect(() => loadSahibindenCookies(file, () => new Date('2026-09-27T00:00:00Z'))).toThrow(/bayat/)
  })

  it('dosya yoksa açık mesajla throw eder', () => {
    expect(() => loadSahibindenCookies('/nonexistent/path/sahibinden-cookies.json')).toThrow(/yok/)
  })

  it('geçersiz JSON ise throw eder', () => {
    const file = writeTempCookieFile('{not valid json')
    expect(() => loadSahibindenCookies(file)).toThrow()
  })

  it('dizi değilse throw eder', () => {
    const file = writeTempCookieFile({ not: 'an array' })
    expect(() => loadSahibindenCookies(file)).toThrow(/dizi/)
  })
})
```

- [ ] **Step 4: Run test to verify it fails**

Run: `cd crawler && npx jest --config jest.config.js --testMatch "**/__tests__/sahibindenCookies.test.ts"`
Expected: FAIL — `Cannot find module '../fetcher/sahibindenCookies'`

- [ ] **Step 5: Write the implementation**

```typescript
// crawler/fetcher/sahibindenCookies.ts
import * as fs from 'node:fs'
import * as path from 'node:path'

export interface SahibindenCookie {
  name: string
  value: string
  domain: string
  path: string
  expires?: number
  httpOnly?: boolean
  secure?: boolean
  sameSite?: 'Strict' | 'Lax' | 'None'
}

const DEFAULT_PATH = path.join(__dirname, '..', 'data', 'sahibinden-cookies.json')

/**
 * `crawler/data/sahibinden-cookies.json`'ı okur (gitignore'lu — gerçek tarayıcıda
 * meydan okuma çözülüp elle dışa aktarılır). Süresi geçmiş çerezleri filtreler;
 * `expires` yok ya da `-1` (session sentinel) ise her zaman geçerli sayılır.
 * Dosya yok / geçersiz JSON / dizi değil / hepsi bayatsa açık mesajla throw eder —
 * crawler hiç başlamasın diye (çağıran taraf bunu preflight'tan ÖNCE yakalar).
 */
export function loadSahibindenCookies(
  filePath: string = DEFAULT_PATH,
  now: () => Date = () => new Date(),
): SahibindenCookie[] {
  if (!fs.existsSync(filePath)) {
    throw new Error(
      `sahibinden-cookies.json yok (${filePath}) — gerçek tarayıcıda sahibinden.com'a girip meydan okumayı çöz, ` +
        `çerezleri dışa aktar (bkz. crawler/data/sahibinden-cookies.example.json).`,
    )
  }

  let raw: unknown
  try {
    raw = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
  } catch (e) {
    throw new Error(`sahibinden-cookies.json geçerli JSON değil: ${e instanceof Error ? e.message : String(e)}`)
  }

  if (!Array.isArray(raw)) {
    throw new Error('sahibinden-cookies.json bir dizi (array) olmalı')
  }

  const nowSecs = now().getTime() / 1000
  const valid = (raw as SahibindenCookie[]).filter((c) => {
    if (!c || typeof c.name !== 'string' || typeof c.value !== 'string') return false
    if (typeof c.expires === 'number' && c.expires > 0 && c.expires < nowSecs) return false
    return true
  })

  if (valid.length === 0) {
    throw new Error(
      "sahibinden-cookies.json içindeki tüm çerezler bayat (süresi dolmuş) — gerçek tarayıcıda " +
        "sahibinden.com'a girip meydan okumayı tekrar çöz, çerezleri yeniden dışa aktar.",
    )
  }

  return valid
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `cd crawler && npx jest --config jest.config.js --testMatch "**/__tests__/sahibindenCookies.test.ts"`
Expected: PASS (8/8)

- [ ] **Step 7: Commit**

```bash
git add .gitignore crawler/data/sahibinden-cookies.example.json crawler/fetcher/sahibindenCookies.ts crawler/__tests__/sahibindenCookies.test.ts
git commit -m "feat(crawl-sahibinden): çerez dosyası okuyucu + süre-dolmuş filtresi"
```

---

### Task 2: `createFetcher` — cookies, fullStealth, refererChain

**Files:**
- Modify: `crawler/fetcher/browser.ts`
- Test: `crawler/__tests__/browser.test.ts` (extend existing helpers + add new tests)

**Interfaces:**
- Consumes: `SahibindenCookie` from Task 1 (`crawler/fetcher/sahibindenCookies.ts`).
- Produces: `createFetcher(cfg, opts)` where `opts` gains `cookies?: SahibindenCookie[]`, `fullStealth?: boolean`, `refererChain?: boolean` — all optional, all no-ops when omitted.

- [ ] **Step 1: Write the failing tests**

Replace the entire contents of `crawler/__tests__/browser.test.ts` with (this extends the existing fixtures with the fields needed for real `.get()` calls, so the two Task-3-of-Faz-1 tests keep passing unchanged, plus adds three new `describe` blocks):

```typescript
// crawler/__tests__/browser.test.ts
const mockLaunch = jest.fn()
const mockNewContext = jest.fn()

jest.mock('@playwright/test', () => ({
  chromium: { launch: (...args: any[]) => mockLaunch(...args) },
}))

import { createFetcher } from '../fetcher/browser'
import { DEFAULT_CONFIG } from '../config'
import type { CrawlConfig } from '../config'
import type { SahibindenCookie } from '../fetcher/sahibindenCookies'
import type { ProxyConfig } from '../fetcher/proxy'

const FAST_CFG: CrawlConfig = {
  minDelayMs: 0,
  maxDelayMs: 0,
  breakEveryN: 0,
  breakMinMs: 0,
  breakMaxMs: 0,
  maxRequestsPerRun: 100,
  detailRefreshDays: 7,
  perPortalCooldownHours: 12,
  unparseableAbortRatio: 0.3,
}

function fakePage() {
  return {
    goto: jest.fn().mockResolvedValue({ status: () => 200 }),
    mouse: { wheel: jest.fn().mockResolvedValue(undefined) },
    content: jest.fn().mockResolvedValue('<html></html>'),
    close: jest.fn().mockResolvedValue(undefined),
  }
}

function fakeContext() {
  return {
    addInitScript: jest.fn(),
    addCookies: jest.fn(),
    setExtraHTTPHeaders: jest.fn(),
    newPage: jest.fn().mockResolvedValue(fakePage()),
    close: jest.fn(),
  }
}

function fakeBrowser(context: any) {
  mockNewContext.mockResolvedValue(context)
  return { newContext: mockNewContext, close: jest.fn() }
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe('createFetcher proxy geçişi', () => {
  it('proxy verilmezse newContext çağrısında proxy alanı olmaz', async () => {
    mockLaunch.mockResolvedValue(fakeBrowser(fakeContext()))
    await createFetcher(DEFAULT_CONFIG)
    const opts = mockNewContext.mock.calls[0][0]
    expect(opts.proxy).toBeUndefined()
  })

  it('proxy verilince newContext tam proxy alanlarıyla çağrılır', async () => {
    mockLaunch.mockResolvedValue(fakeBrowser(fakeContext()))
    const proxy: ProxyConfig = { server: 'http://p:8080', username: 'u', password: 'p' }
    await createFetcher(DEFAULT_CONFIG, { proxy })
    const opts = mockNewContext.mock.calls[0][0]
    expect(opts.proxy).toEqual({ server: 'http://p:8080', username: 'u', password: 'p' })
  })
})

describe('createFetcher cookie enjeksiyonu', () => {
  it('cookies verilmezse addCookies çağrılmaz', async () => {
    const ctx = fakeContext()
    mockLaunch.mockResolvedValue(fakeBrowser(ctx))
    await createFetcher(DEFAULT_CONFIG)
    expect(ctx.addCookies).not.toHaveBeenCalled()
  })

  it('cookies verilince context.addCookies tam listeyle çağrılır', async () => {
    const ctx = fakeContext()
    mockLaunch.mockResolvedValue(fakeBrowser(ctx))
    const cookies: SahibindenCookie[] = [{ name: 'cf_clearance', value: 'x', domain: '.sahibinden.com', path: '/' }]
    await createFetcher(DEFAULT_CONFIG, { cookies })
    expect(ctx.addCookies).toHaveBeenCalledWith(cookies)
  })
})

describe('createFetcher fullStealth', () => {
  it('fullStealth verilmezse addInitScript yalnız 1 kez (webdriver mask) çağrılır', async () => {
    const ctx = fakeContext()
    mockLaunch.mockResolvedValue(fakeBrowser(ctx))
    await createFetcher(DEFAULT_CONFIG)
    expect(ctx.addInitScript).toHaveBeenCalledTimes(1)
  })

  it('fullStealth:true iken addInitScript 2 kez çağrılır (webdriver mask + tam spoof)', async () => {
    const ctx = fakeContext()
    mockLaunch.mockResolvedValue(fakeBrowser(ctx))
    await createFetcher(DEFAULT_CONFIG, { fullStealth: true })
    expect(ctx.addInitScript).toHaveBeenCalledTimes(2)
  })
})

describe('createFetcher refererChain', () => {
  it(
    'refererChain verilmezse setExtraHTTPHeaders hiç çağrılmaz',
    async () => {
      const ctx = fakeContext()
      mockLaunch.mockResolvedValue(fakeBrowser(ctx))
      const fetcher = await createFetcher(FAST_CFG)
      await fetcher.get('https://www.sahibinden.com/satilik-arsa/trabzon')
      expect(ctx.setExtraHTTPHeaders).not.toHaveBeenCalled()
    },
    15000,
  )

  it(
    'refererChain:true iken ilk istekte Referer yok + Sec-Fetch-Site:none, ikinci istekte önceki URL Referer olur',
    async () => {
      const ctx = fakeContext()
      mockLaunch.mockResolvedValue(fakeBrowser(ctx))
      const fetcher = await createFetcher(FAST_CFG, { refererChain: true })

      await fetcher.get('https://www.sahibinden.com/satilik-arsa/trabzon')
      const firstHeaders = ctx.setExtraHTTPHeaders.mock.calls[0][0]
      expect(firstHeaders['Sec-Fetch-Site']).toBe('none')
      expect(firstHeaders.Referer).toBeUndefined()

      await fetcher.get('https://www.sahibinden.com/ilan/trabzon-arsa-123456/detay')
      const secondHeaders = ctx.setExtraHTTPHeaders.mock.calls[1][0]
      expect(secondHeaders['Sec-Fetch-Site']).toBe('same-origin')
      expect(secondHeaders.Referer).toBe('https://www.sahibinden.com/satilik-arsa/trabzon')
    },
    15000,
  )
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd crawler && npx jest --config jest.config.js --testMatch "**/__tests__/browser.test.ts"`
Expected: FAIL — the 4 new `describe` blocks fail (`addCookies`/`fullStealth`/`refererChain` behavior doesn't exist yet); the original 2 proxy tests still PASS unchanged.

- [ ] **Step 3: Write the implementation**

Replace the entire contents of `crawler/fetcher/browser.ts`:

```typescript
import { chromium, type Browser, type BrowserContext } from '@playwright/test'
import type { CrawlConfig } from '../config'
import { randDelayMs } from '../config'
import type { ProxyConfig } from './proxy'
import type { SahibindenCookie } from './sahibindenCookies'

export interface Fetcher {
  get(url: string): Promise<{ html: string; status: number }>
  requestCount: number
  close(): Promise<void>
}

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

export async function createFetcher(
  cfg: CrawlConfig,
  opts: {
    headful?: boolean
    proxy?: ProxyConfig
    cookies?: SahibindenCookie[]
    fullStealth?: boolean
    refererChain?: boolean
  } = {},
): Promise<Fetcher> {
  const browser: Browser = await chromium.launch({ headless: !opts.headful })
  let context: BrowserContext
  try {
    context = await browser.newContext({
      userAgent: UA,
      viewport: { width: 1440, height: 900 },
      locale: 'tr-TR',
      timezoneId: 'Europe/Istanbul',
      ...(opts.proxy
        ? { proxy: { server: opts.proxy.server, username: opts.proxy.username, password: opts.proxy.password } }
        : {}),
    })
    // basit maskeleme
    await context.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined })
    })
    // Faz 2 (Sahibinden) — tam fingerprint spoofing, yalnız fullStealth true iken.
    if (opts.fullStealth) {
      await context.addInitScript(() => {
        const win = window as any
        win.chrome = { runtime: {}, loadTimes: () => {}, csi: () => {}, app: {} }
        const nav = navigator as any
        const originalQuery = nav.permissions.query.bind(nav.permissions)
        nav.permissions.query = (parameters: any) =>
          parameters.name === 'notifications'
            ? Promise.resolve({ state: Notification.permission })
            : originalQuery(parameters)
        Object.defineProperty(navigator, 'languages', { get: () => ['tr-TR', 'tr', 'en-US', 'en'] })
        Object.defineProperty(navigator, 'platform', { get: () => 'Win32' })
        Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 8 })
        Object.defineProperty(navigator, 'deviceMemory', { get: () => 8 })
      })
    }
    if (opts.cookies && opts.cookies.length > 0) {
      await context.addCookies(opts.cookies)
    }
  } catch (e) {
    // kurulum hatası başlatılmış tarayıcıyı öksüz bırakmasın
    await browser.close()
    throw e
  }

  let requestCount = 0
  let lastUrl: string | undefined

  const fetcher: Fetcher = {
    get requestCount() {
      return requestCount
    },
    async get(url: string) {
      if (requestCount >= cfg.maxRequestsPerRun) {
        throw new Error(`maxRequestsPerRun (${cfg.maxRequestsPerRun}) aşıldı — tur durduruluyor`)
      }
      // istekler arası insan-benzeri bekleme (ilk istekte de kısa bekle)
      await sleep(randDelayMs(cfg))
      // periyodik uzun mola
      if (cfg.breakEveryN > 0 && requestCount > 0 && requestCount % cfg.breakEveryN === 0) {
        const brk = cfg.breakMinMs + Math.random() * (cfg.breakMaxMs - cfg.breakMinMs)
        console.log(`  … mola ${Math.round(brk / 1000)} sn`)
        await sleep(brk)
      }

      // Faz 2 (Sahibinden) — arama→detay geçişini gerçek navigasyon gibi göstermek
      // için Referer/Sec-Fetch zinciri. il sınırında sıfırlanmaz (bkz. spec).
      if (opts.refererChain) {
        await context.setExtraHTTPHeaders({
          'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': lastUrl ? 'same-origin' : 'none',
          'Sec-Fetch-User': '?1',
          'Upgrade-Insecure-Requests': '1',
          ...(lastUrl ? { Referer: lastUrl } : {}),
        })
      }

      const page = await context.newPage()
      try {
        const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45_000 })
        // insan-benzeri scroll
        await page.mouse.wheel(0, 600 + Math.random() * 1200)
        await sleep(1200 + Math.random() * 2500)
        const html = await page.content()
        const status = resp?.status() ?? 0
        requestCount++
        if (opts.refererChain) lastUrl = url
        return { html, status }
      } finally {
        await page.close()
      }
    },
    async close() {
      try {
        await context.close()
      } finally {
        await browser.close()
      }
    },
  }
  return fetcher
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd crawler && npx jest --config jest.config.js --testMatch "**/__tests__/browser.test.ts"`
Expected: PASS (10/10 — 2 original + 8 new)

- [ ] **Step 5: Run the full crawler suite**

Run: `cd crawler && npx jest --config jest.config.js`
Expected: all suites PASS (Emlakjet's `createFetcher` call sites are unaffected — `opts.cookies`/`fullStealth`/`refererChain` all undefined for them, identical to before).

- [ ] **Step 6: Commit**

```bash
git add crawler/fetcher/browser.ts crawler/__tests__/browser.test.ts
git commit -m "feat(crawl-sahibinden): createFetcher'a çerez/fingerprint/Referer-zinciri desteği"
```

---

### Task 3: `orchestrator.ts` — parameterize `source` for `buildQueue()` reuse

**Files:**
- Modify: `crawler/orchestrator.ts`
- Test: `crawler/__tests__/orchestrator.test.ts` (add 2 tests; existing tests unchanged)

**Interfaces:**
- Produces: `OrchestratorDeps.source?: string` — `buildQueue()`'s Prisma query uses `deps.source ?? 'emlakjet'` for the `where.source` field.

- [ ] **Step 1: Write the failing tests**

Add to `crawler/__tests__/orchestrator.test.ts`, inside the existing `describe('buildQueue', ...)` block (reusing the file's existing `baseDeps` helper):

```typescript
it('source verilince findMany where.source o değeri alır', async () => {
  let capturedWhere: any
  const deps = baseDeps({
    source: 'sahibinden',
    client: {
      crawlRun: {
        findMany: async (args: any) => {
          capturedWhere = args.where
          return []
        },
      },
    } as any,
  })
  await buildQueue(deps)
  expect(capturedWhere.source).toBe('sahibinden')
})

it('source verilmezse findMany where.source varsayılan emlakjet olur', async () => {
  let capturedWhere: any
  const deps = baseDeps({
    client: {
      crawlRun: {
        findMany: async (args: any) => {
          capturedWhere = args.where
          return []
        },
      },
    } as any,
  })
  await buildQueue(deps)
  expect(capturedWhere.source).toBe('emlakjet')
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd crawler && npx jest --config jest.config.js --testMatch "**/__tests__/orchestrator.test.ts"`
Expected: FAIL — TypeScript error (`source` not assignable, `OrchestratorDeps` has no such field) until Step 3 is applied. The second new test would pass on its own but won't compile until the field exists.

- [ ] **Step 3: Modify the implementation**

In `crawler/orchestrator.ts`, add the field to `OrchestratorDeps`:

```typescript
export interface OrchestratorDeps {
  client: RunDeps['client'] & { crawlRun: { findMany(args: any): Promise<{ il: string }[]> } }
  createFetcher: (cfg: CrawlConfig, opts: { headful?: boolean; proxy?: ProxyConfig }) => Promise<Fetcher>
  runCrawl: (
    args: { il: string; ilUrlOverride?: string; category: 'arsa' | 'konut'; maxPages: number; dryRun: boolean },
    deps: RunDeps,
  ) => Promise<RunSummary>
  geocodeDeps: GeocodeDeps
  detectBlock: (i: BlockCheckInput) => BlockResult
  now: () => Date
  proxy?: ProxyConfig
  workers: number
  maxPages: number
  resumeDays: number
  forceAll: boolean
  headful?: boolean
  only?: string[]
  /** Faz 2 (Sahibinden) buildQueue()'yu yeniden kullanmak için — varsayılan 'emlakjet'. */
  source?: string
}
```

And change the Prisma query inside `buildQueue()`:

```typescript
  const doneRuns = await deps.client.crawlRun.findMany({
    where: {
      source: deps.source ?? 'emlakjet',
      category: 'arsa',
      blocked: false,
      finishedAt: { not: null },
      startedAt: { gte: cutoff },
    },
    select: { il: true },
  })
```

(replacing the existing hardcoded `source: 'emlakjet'` line).

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd crawler && npx jest --config jest.config.js --testMatch "**/__tests__/orchestrator.test.ts"`
Expected: PASS, all tests in the file including the 2 new ones.

- [ ] **Step 5: Run the full crawler suite**

Run: `cd crawler && npx jest --config jest.config.js`
Expected: all suites PASS (Faz 1's `crawl-all.ts` never sets `source`, so its behavior is unchanged — defaults to `'emlakjet'` exactly as before).

- [ ] **Step 6: Commit**

```bash
git add crawler/orchestrator.ts crawler/__tests__/orchestrator.test.ts
git commit -m "feat(crawl-sahibinden): buildQueue() source parametreleştirildi (varsayılan emlakjet)"
```

---

### Task 4: CLI entrypoint (`crawler/scripts/crawl-sahibinden.ts`) + `package.json` script

**Files:**
- Create: `crawler/scripts/crawl-sahibinden.ts`
- Test: `crawler/__tests__/crawlSahibindenPreflight.test.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: `buildQueue`, `unmatchedOnlyTokens`, `OrchestratorDeps` (Task 3); `resolveProxyConfig` (existing, `crawler/fetcher/proxy.ts`); `createFetcher` (Task 2); `loadSahibindenCookies` (Task 1); `defaultGeocodeDeps`, `detectBlock`, `detectHardBlock` (existing); `sahibindenAdapter` (existing, `crawler/adapters/sahibinden.ts`); `runCrawl` (existing, `crawler/run.ts`); `DEFAULT_CONFIG` (existing, `crawler/config.ts`).
- Produces: `export function evaluateSahibindenPreflight(homepageResult: { html: string; status: number }): { ok: boolean; reason: string | null }` — the one piece of real logic in this file, exported specifically so it's unit-testable without mocking the CLI's wiring.

- [ ] **Step 1: Write the failing test**

```typescript
// crawler/__tests__/crawlSahibindenPreflight.test.ts
import { evaluateSahibindenPreflight } from '../scripts/crawl-sahibinden'

describe('evaluateSahibindenPreflight', () => {
  it('temiz sayfa için ok:true döner', () => {
    const verdict = evaluateSahibindenPreflight({ html: '<div class="searchResultsItem"></div>', status: 200 })
    expect(verdict).toEqual({ ok: true, reason: null })
  })

  it('PerimeterX meydan okuma kalıbı için ok:false + sebep döner', () => {
    const verdict = evaluateSahibindenPreflight({ html: '<div>px-captcha Basılı Tutun</div>', status: 200 })
    expect(verdict.ok).toBe(false)
    expect(verdict.reason).toMatch(/perimeterx/)
  })

  it('HTTP 403 için ok:false döner', () => {
    const verdict = evaluateSahibindenPreflight({ html: '<html></html>', status: 403 })
    expect(verdict.ok).toBe(false)
    expect(verdict.reason).toBe('http 403')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd crawler && npx jest --config jest.config.js --testMatch "**/__tests__/crawlSahibindenPreflight.test.ts"`
Expected: FAIL — `Cannot find module '../scripts/crawl-sahibinden'`

- [ ] **Step 3: Write the implementation**

```typescript
// crawler/scripts/crawl-sahibinden.ts
import { buildQueue, unmatchedOnlyTokens, type OrchestratorDeps } from '../orchestrator'
import { resolveProxyConfig } from '../fetcher/proxy'
import { createFetcher } from '../fetcher/browser'
import { loadSahibindenCookies } from '../fetcher/sahibindenCookies'
import { defaultGeocodeDeps } from '../pipeline/geocode'
import { detectBlock, detectHardBlock } from '../fetcher/blockDetector'
import { sahibindenAdapter } from '../adapters/sahibinden'
import { runCrawl } from '../run'
import { DEFAULT_CONFIG } from '../config'

export function evaluateSahibindenPreflight(
  homepageResult: { html: string; status: number },
): { ok: boolean; reason: string | null } {
  const check = detectHardBlock(homepageResult.html, homepageResult.status)
  return check.blocked ? { ok: false, reason: check.reason } : { ok: true, reason: null }
}

function parseArgs(argv: string[]) {
  const get = (k: string) => argv.find((a) => a.startsWith(`--${k}=`))?.split('=')[1]
  const has = (k: string) => argv.includes(`--${k}`)
  const onlyRaw = get('only')
  return {
    forceAll: has('force-all'),
    only: onlyRaw
      ? onlyRaw
          .split(',')
          .map((s) => s.trim().toLocaleLowerCase('tr-TR'))
          .filter(Boolean)
      : undefined,
    headful: has('headful'),
    maxPages: Number(get('max-pages') ?? 20),
    resumeDays: Number(process.env.CRAWL_RESUME_DAYS ?? 7),
  }
}

async function main() {
  const a = parseArgs(process.argv.slice(2))

  if (a.only) {
    const unmatched = unmatchedOnlyTokens(a.only)
    if (unmatched.length > 0) {
      console.error(`Bilinmeyen --only girdisi: ${unmatched.join(', ')} (il adı veya emlakjet slug'ı bekleniyor)`)
      process.exit(1)
    }
  }

  const proxy = resolveProxyConfig()
  if (!proxy) {
    console.error(
      'Sahibinden residential proxy olmadan neredeyse her zaman engellenir — ' +
        'CRAWL_PROXY_SERVER/CRAWL_PROXY_USERNAME/CRAWL_PROXY_PASSWORD env değişkenlerini doldurun.',
    )
    process.exit(1)
  }

  let cookies
  try {
    cookies = loadSahibindenCookies()
  } catch (e) {
    console.error(e instanceof Error ? e.message : String(e))
    process.exit(1)
  }

  console.log(
    `crawl:sahibinden — arsa, maxPages=${a.maxPages}, forceAll=${a.forceAll}, ` +
      `only=${a.only?.join(',') ?? '(hepsi)'}, çerez sayısı=${cookies.length}`,
  )

  const cfg = { ...DEFAULT_CONFIG, maxRequestsPerRun: a.maxPages * 31 }
  const fetcher = await createFetcher(cfg, {
    headful: a.headful,
    proxy,
    cookies,
    fullStealth: true,
    refererChain: true,
  })

  try {
    const preflight = await fetcher.get('https://www.sahibinden.com')
    const verdict = evaluateSahibindenPreflight(preflight)
    if (!verdict.ok) {
      console.error(`\n⚠️  Preflight engellendi: ${verdict.reason} — çerezleri gerçek tarayıcıda yenileyin.\n`)
      process.exitCode = 1
      return
    }
    console.log('Preflight temiz — çalışmaya devam ediliyor.')

    // I10 deseni (bkz run.ts) — prisma yalnız gerçek çalıştırmada yüklensin.
    const { prisma } = await import('@/lib/prisma')
    const deps: OrchestratorDeps = {
      client: prisma as unknown as OrchestratorDeps['client'],
      createFetcher,
      runCrawl,
      geocodeDeps: defaultGeocodeDeps(),
      detectBlock,
      now: () => new Date(),
      proxy,
      workers: 1,
      maxPages: a.maxPages,
      resumeDays: a.resumeDays,
      forceAll: a.forceAll,
      headful: a.headful,
      only: a.only,
      source: 'sahibinden',
    }

    const { queue, skippedResume } = await buildQueue(deps)
    const completed: string[] = []
    const blocked: { il: string; reason: string | null }[] = []

    for (const province of queue) {
      try {
        const summary = await runCrawl(
          {
            il: province.tkgmName,
            ilUrlOverride: province.emlakjetSlug,
            category: 'arsa',
            maxPages: a.maxPages,
            dryRun: false,
          },
          {
            adapter: sahibindenAdapter,
            client: deps.client,
            fetcher,
            geocodeDeps: deps.geocodeDeps,
            detectBlock: deps.detectBlock,
            now: deps.now,
            cfg,
          },
        )
        if (summary.blocked) blocked.push({ il: province.tkgmName, reason: summary.blockReason })
        else completed.push(province.tkgmName)
      } catch (e) {
        blocked.push({
          il: province.tkgmName,
          reason: `beklenmeyen hata: ${e instanceof Error ? e.message : String(e)}`,
        })
      }
    }

    console.log(
      `\n${completed.length} il tamam, ${blocked.length} il blocked, ${skippedResume.length} il atlandı (resume)`,
    )
    if (blocked.length > 0) console.table(blocked)

    await prisma.$disconnect()
  } finally {
    await fetcher.close()
  }
}

if (require.main === module) {
  main().catch((e) => {
    console.error(e)
    process.exit(1)
  })
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd crawler && npx jest --config jest.config.js --testMatch "**/__tests__/crawlSahibindenPreflight.test.ts"`
Expected: PASS (3/3)

- [ ] **Step 5: Type-check the crawler package**

Run: `cd crawler && npx tsc -p tsconfig.json`
Expected: no errors. (`process.exit(1)` is typed `never` in `@types/node`, so TypeScript's control-flow analysis treats `cookies` as definitely assigned after the `try`/`catch` — no "used before assigned" error.)

- [ ] **Step 6: Add the `package.json` script**

In the repo-root `package.json`, next to the existing `"crawl:all"` line, add:

```json
    "crawl:sahibinden": "cross-env TS_NODE_PROJECT=crawler/tsconfig.json ts-node --transpile-only -r tsconfig-paths/register crawler/scripts/crawl-sahibinden.ts",
```

- [ ] **Step 7: Verify the CLI wires up without hitting the network**

Run: `cd crawler && npx ts-node --transpile-only -r tsconfig-paths/register -e "require('./scripts/crawl-sahibinden.ts')"`
Expected: no throw (module loads; `main()` doesn't auto-run because `require.main === module` is false under `-e`).

- [ ] **Step 8: Run the full test + typecheck suite one more time**

Run: `cd crawler && npx jest --config jest.config.js && npx tsc -p tsconfig.json`
Expected: all green, 0 tsc errors.

- [ ] **Step 9: Lint check**

Run: `npx eslint crawler/scripts/crawl-sahibinden.ts` (from repo root)
Expected: 0 problems — this file is NOT covered by the `crawler/scripts/**` eslint ignore (only `capture-fixture.ts` is ignored; see the fix already merged in Faz 1), so it must lint clean like every other crawler source file.

- [ ] **Step 10: Commit**

```bash
git add crawler/scripts/crawl-sahibinden.ts crawler/__tests__/crawlSahibindenPreflight.test.ts package.json
git commit -m "feat(crawl-sahibinden): CLI entrypoint — proxy/çerez/preflight zorunlu, tek-worker sıralı il döngüsü"
```

**Operational note (not part of this task's automated verification):** before ever running `npm run crawl:sahibinden` for real: (1) get a residential TR proxy (e.g. Decodo/IPRoyal) and set `CRAWL_PROXY_SERVER`/`CRAWL_PROXY_USERNAME`/`CRAWL_PROXY_PASSWORD`; (2) manually visit sahibinden.com in a real browser, solve any challenge, export cookies (e.g. via the EditThisCookie extension) into `crawler/data/sahibinden-cookies.json` matching the example template's shape; (3) run with `--only=` a single province and `--max-pages=1` first and watch the console output — if preflight fails, the cookies are already bad and nothing was attempted; (4) per the spec's decision #10, spot-check that a couple of diacritic provinces' `emlakjetSlug`-derived URLs actually resolve on Sahibinden before trusting the full 81-province table; (5) expect to repeat step 2 periodically — cookies expire, and there is no mid-run health check (accepted v1 risk, see Review Focus).

---

## Self-Review

**1. Spec coverage:**
- Decision #1 (separate, conservative entrypoint) — Task 4 creates `crawl-sahibinden.ts`, never touches `crawl-all.ts`. ✓
- Decision #2 (single worker, sequential) — Task 4's `for...of` loop, no `Promise.all`. ✓
- Decision #3 (cookie source = manual JSON file) — Task 1. ✓
- Decision #4 (single preflight check, no mid-run recheck) — Task 4's preflight step; Review Focus documents the accepted gap explicitly rather than silently. ✓
- Decision #5 (proxy mandatory) — Task 4's `if (!proxy) { ...; process.exit(1) }`, checked *before* cookies are even loaded. ✓
- Decision #6 (`createFetcher` additive-only) — Task 2; Task 2's own tests re-verify the original 2 proxy tests still pass unchanged. ✓
- Decision #7 (resumability reuse via parameterized `source`) — Task 3. ✓
- Decision #8 (arsa only) — `category: 'arsa'` hardcoded in Task 4's `runCrawl()` call, matching Faz 1. ✓
- Decision #9 (no auto press-and-hold solver) — not implemented anywhere in this plan. ✓
- Decision #10 (slug reuse, not verified live) — Task 4's operational note explicitly calls this out as a pre-run manual step. ✓
- Cookie format / lifecycle (expiry filtering, session-cookie handling) — Task 1's tests cover both the missing-`expires` and `-1`-sentinel cases. ✓
- `createFetcher` enhancements (cookies via `context.addCookies`, fullStealth via second `addInitScript`, refererChain via `context.setExtraHTTPHeaders` with the exact header set from the spec) — Task 2, code matches the spec's snippet field-for-field. ✓
- `evaluateSahibindenPreflight()` exact signature — Task 4, copied verbatim from the spec. ✓
- Test strategy table (cookie loader / browser opts / orchestrator source / preflight pure function / no CLI-wiring test) — Tasks 1–4. ✓
- Error handling table (unknown `--only`, missing proxy, missing/bad cookies, preflight blocked, mid-run blocked, unexpected exception) — all five non-preflight paths reuse existing, already-tested primitives (`unmatchedOnlyTokens`, `resolveProxyConfig`, `loadSahibindenCookies`, `runCrawl`'s own blocked/exception handling); the preflight path is Task 4's one new tested piece of logic. ✓
- Kapsam Dışı items (auto-solver, parallel workers, mid-run cookie health, login automation, konut, live slug verification, merging with `crawl-all.ts`) — none touched by any task. ✓

**2. Placeholder scan:** No "TBD"/"add error handling"/"similar to Task N" phrasing in any step. Every code block is complete, copy-pasteable content, not a description of what to write.

**3. Type consistency:** `SahibindenCookie` (Task 1) is the exact type Task 2's `createFetcher` opts and Task 2's test import use. `OrchestratorDeps.source` (Task 3) is the exact field Task 4's CLI sets (`source: 'sahibinden'`). `evaluateSahibindenPreflight`'s `{ ok, reason }` return shape (Task 4) matches its own test's assertions exactly.

**4. Review Focus:** see the dedicated section above — all 5 items map to either a task's test (refererChain two-call transition → Task 2; expiry sentinel handling → Task 1; `source` threading → Task 3; proxy/cookie-before-fetcher ordering → Task 4's step order) or an explicitly-documented, deliberately-untestable v1 limitation (`detectHardBlock`'s coverage ceiling on preflight — inherited from Faz 1, not new).
