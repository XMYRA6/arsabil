# Emlakjet Ulusal Crawl (Proxy Faz 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the orchestrator that runs the existing Emlakjet crawler across all 81 Turkish provinces (resumable, N parallel workers, optional proxy), so a single `npm run crawl:all` VPS run can replace the current single-province (Trabzon) pilot data with national coverage.

**Architecture:** All new code lives under `crawler/` (already isolated from `src/`, per the existing pattern). A new `crawler/data/provinces.ts` supplies the 81-province table (TKGM display name + Emlakjet URL slug, slug derived by a tested Turkish-ASCII-fold function, not hand-typed). A new `crawler/orchestrator.ts` pulls provinces off a shared in-memory queue, spawns `CRAWL_WORKERS` (default 3) concurrent workers each with its own `Fetcher` (own browser context, own proxy session), and calls the **existing, unmodified** `runCrawl()` per province. Two small, additive changes unblock this: `run.ts` gets an optional `ilUrlOverride` so the URL-building province string (ASCII slug) can differ from the province string used for DB scoping/delisting (TKGM display name, e.g. `"Şanlıurfa"` vs `"sanliurfa"`) — this is the one real technical gap the spec's provinces table implies but doesn't spell out; `fetcher/browser.ts` gets an optional `proxy` passthrough to `newContext()`. A new `fetcher/proxy.ts` resolves proxy config from three env vars (all-or-nothing). A new `scripts/crawl-all.ts` is the CLI entrypoint (mirrors `run.ts`'s existing CLI conventions).

**Tech Stack:** TypeScript, Playwright (`@playwright/test`), Prisma (existing `CrawlRun`/`MarketListing`/`Neighborhood` models — no new migration), Jest (`ts-jest`), `ts-node` + `tsconfig-paths` (existing crawler CLI pattern).

**Spec:** `docs/superpowers/specs/2026-08-31-emlakjet-ulusal-crawl-design.md`

## Global Constraints

- Faz 1 scope is **Emlakjet only**, **arsa category only** (`arsa`/`tarla`/`bag`/`bahce`/`zeytinlik`/`arazi` — the existing `ARSA_TYPES` in `run.ts`). Sahibinden, Hepsiemlak, and `konut` are out of scope for this plan.
- All new code stays under `crawler/` and must not import from `src/` app code except the existing allowed exceptions (`@/lib/prisma`, `@/lib/tkgm/idariYapi`, `@/lib/geo/turkeyBounds` — already used by `run.ts`/`pipeline/geocode.ts`).
- `CRAWL_WORKERS` env default **3**. `CRAWL_RESUME_DAYS` env default **7**.
- Proxy is env-gated and **off by default**: `CRAWL_PROXY_SERVER`/`CRAWL_PROXY_USERNAME`/`CRAWL_PROXY_PASSWORD` must **all three** be present (non-empty after trim) or the crawl runs proxy-less — this is the spec's literal test requirement, not a "server-only-required" design.
- No new Prisma model, no new migration. Reuse `CrawlRun` (`source`, `il`, `category`, `startedAt`, `finishedAt`, `pagesFetched`, `listingsFound`, `listingsUpserted`, `blocked`, `notes`) exactly as `run.ts` already writes it.
- This plan does **not** run the crawl. `npm run crawl:all` against the real network/prod DB is a separate, human-supervised operational step per the spec's "Operasyon" section, after VPS deploy.
- Tests run with `cd crawler && npx jest --config jest.config.js --testMatch "**/__tests__/**/*.test.ts"` (worktree-safe path per project convention) or `npm run test:crawler` from repo root once merged.
- `runCrawl()` in `run.ts` is not otherwise modified — its tested delisting/dedupe/block-detection behavior (`crawler/run.ts`) must stay byte-identical except for the one new optional field.

## Review Focus

- A province's Turkish-ASCII-folded slug could still not match Emlakjet's real URL path for that specific province (fold is syntactically consistent but not independently verified against the live site for all 81). No unit test can catch this — Task 6's operational rollout note requires a manual `--dry-run` smoke check against the 12 diacritic-bearing provinces before the first full run.
- A typo'd `--only=` token (e.g. `--only=trabzn`) could silently produce an empty or partial queue instead of a clear error. Closed by `unmatchedOnlyTokens()` in Task 5 plus a CLI-level check in Task 6.
- The resume filter compares `CrawlRun.il` against `Province.tkgmName`, but manual ad-hoc single-province runs (`npm run crawl -- --il=trabzon`) write lowercase `il` values into the same table. Task 5's resume test uses a mixed-case fixture to confirm the `toLocaleUpperCase('tr-TR')` comparison still matches so those rows are correctly treated as "already done", not silently ignored.
- With `workers > 1`, hitting the early-stop threshold in one worker does not abort crawls other workers already popped off the queue — they finish naturally. Not a bug, but an operator watching logs could read continued activity after the "stopped early" message as broken. Documented in Task 6's operational note.
- The `maxRequestsPerRun` scaling formula (`maxPages * 31`) is the spec's own approximation, not a measured constant. Task 5 pins it behind a named, tested function (`maxRequestsFor`) so a future change is a deliberate edit, not silent drift.

---

## File Structure

| File | Responsibility |
|---|---|
| `crawler/data/provinces.ts` (new) | 81-province table + `foldTrToAscii()` slug derivation, tested. |
| `crawler/fetcher/proxy.ts` (new) | `resolveProxyConfig()` — reads 3 env vars, all-or-nothing. |
| `crawler/fetcher/browser.ts` (modify) | `createFetcher()` accepts optional `proxy`, passes to `newContext()`. |
| `crawler/run.ts` (modify) | `RunArgs` gains optional `ilUrlOverride`; one line changed to use it. |
| `crawler/orchestrator.ts` (new) | Queue build (resumable/forceAll/only filters), worker pool, blocked/early-stop bookkeeping. |
| `crawler/scripts/crawl-all.ts` (new) | CLI entrypoint, wires real deps, prints summary. |
| `package.json` (modify) | New `crawl:all` script. |

---

### Task 1: Province table (`crawler/data/provinces.ts`)

**Files:**
- Create: `crawler/data/provinces.ts`
- Test: `crawler/__tests__/provinces.test.ts`

**Interfaces:**
- Produces: `export interface Province { tkgmName: string; emlakjetSlug: string }`, `export const PROVINCES: Province[]` (81 entries), `export function foldTrToAscii(name: string): string`.

- [ ] **Step 1: Write the failing test**

```typescript
// crawler/__tests__/provinces.test.ts
import { PROVINCES, foldTrToAscii } from '../data/provinces'

describe('provinces', () => {
  it('81 il içerir', () => {
    expect(PROVINCES).toHaveLength(81)
  })

  it('tkgmName benzersizdir', () => {
    const names = PROVINCES.map((p) => p.tkgmName)
    expect(new Set(names).size).toBe(81)
  })

  it('emlakjetSlug benzersizdir', () => {
    const slugs = PROVINCES.map((p) => p.emlakjetSlug)
    expect(new Set(slugs).size).toBe(81)
  })

  it('emlakjetSlug yalnızca küçük harf ve tire içerir', () => {
    for (const p of PROVINCES) {
      expect(p.emlakjetSlug).toMatch(/^[a-z-]+$/)
    }
  })

  it('bilinen edge-case slugları doğru üretir', () => {
    const bySlug = (name: string) => PROVINCES.find((p) => p.tkgmName === name)!.emlakjetSlug
    expect(bySlug('İstanbul')).toBe('istanbul')
    expect(bySlug('Şanlıurfa')).toBe('sanliurfa')
    expect(bySlug('Afyonkarahisar')).toBe('afyonkarahisar')
    expect(bySlug('Kahramanmaraş')).toBe('kahramanmaras')
  })

  it('foldTrToAscii Türkçe karakterleri katlar', () => {
    expect(foldTrToAscii('Muğla')).toBe('mugla')
    expect(foldTrToAscii('Iğdır')).toBe('igdir')
    expect(foldTrToAscii('Çanakkale')).toBe('canakkale')
    expect(foldTrToAscii('Isparta')).toBe('isparta')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run (from repo root): `cd crawler && npx jest --config jest.config.js --testMatch "**/__tests__/provinces.test.ts"`
Expected: FAIL — `Cannot find module '../data/provinces'`

- [ ] **Step 3: Write the implementation**

```typescript
// crawler/data/provinces.ts

/**
 * 81 il: TKGM/idariYapi'nin döndürdüğü görünen ad (tkgmName, geocode eşleşmesi
 * ve CrawlRun/MarketListing scope'u için) + Emlakjet arama URL'lerinde
 * kullanılan ASCII slug (emlakjetSlug). Slug elle yazılmadı — tkgmName'den
 * deterministik bir Türkçe-ASCII katlama fonksiyonuyla türetildi, testle kilitli.
 */

const TR_ASCII_MAP: Record<string, string> = {
  ı: 'i',
  ğ: 'g',
  ü: 'u',
  ş: 's',
  ö: 'o',
  ç: 'c',
}

export function foldTrToAscii(name: string): string {
  const lower = name.toLocaleLowerCase('tr-TR')
  let out = ''
  for (const ch of lower) out += TR_ASCII_MAP[ch] ?? ch
  return out.replace(/\s+/g, '-')
}

const IL_ADLARI: string[] = [
  'Adana', 'Adıyaman', 'Afyonkarahisar', 'Ağrı', 'Amasya', 'Ankara', 'Antalya',
  'Artvin', 'Aydın', 'Balıkesir', 'Bilecik', 'Bingöl', 'Bitlis', 'Bolu',
  'Burdur', 'Bursa', 'Çanakkale', 'Çankırı', 'Çorum', 'Denizli', 'Diyarbakır',
  'Edirne', 'Elazığ', 'Erzincan', 'Erzurum', 'Eskişehir', 'Gaziantep',
  'Giresun', 'Gümüşhane', 'Hakkari', 'Hatay', 'Isparta', 'Mersin', 'İstanbul',
  'İzmir', 'Kars', 'Kastamonu', 'Kayseri', 'Kırklareli', 'Kırşehir', 'Kocaeli',
  'Konya', 'Kütahya', 'Malatya', 'Manisa', 'Kahramanmaraş', 'Mardin', 'Muğla',
  'Muş', 'Nevşehir', 'Niğde', 'Ordu', 'Rize', 'Sakarya', 'Samsun', 'Siirt',
  'Sinop', 'Sivas', 'Tekirdağ', 'Tokat', 'Trabzon', 'Tunceli', 'Şanlıurfa',
  'Uşak', 'Van', 'Yozgat', 'Zonguldak', 'Aksaray', 'Bayburt', 'Karaman',
  'Kırıkkale', 'Batman', 'Şırnak', 'Bartın', 'Ardahan', 'Iğdır', 'Yalova',
  'Karabük', 'Kilis', 'Osmaniye', 'Düzce',
]

export interface Province {
  tkgmName: string
  emlakjetSlug: string
}

export const PROVINCES: Province[] = IL_ADLARI.map((tkgmName) => ({
  tkgmName,
  emlakjetSlug: foldTrToAscii(tkgmName),
}))
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd crawler && npx jest --config jest.config.js --testMatch "**/__tests__/provinces.test.ts"`
Expected: PASS (6/6)

- [ ] **Step 5: Commit**

```bash
git add crawler/data/provinces.ts crawler/__tests__/provinces.test.ts
git commit -m "feat(crawl-all): 81 il tablosu + Türkçe-ASCII slug katlama"
```

---

### Task 2: Proxy config resolver (`crawler/fetcher/proxy.ts`)

**Files:**
- Create: `crawler/fetcher/proxy.ts`
- Test: `crawler/__tests__/proxy.test.ts`

**Interfaces:**
- Produces: `export interface ProxyConfig { server: string; username: string; password: string }`, `export function resolveProxyConfig(env?: NodeJS.ProcessEnv): ProxyConfig | undefined`.

- [ ] **Step 1: Write the failing test**

```typescript
// crawler/__tests__/proxy.test.ts
import { resolveProxyConfig } from '../fetcher/proxy'

describe('resolveProxyConfig', () => {
  it('üç alan da doluysa config döner', () => {
    const cfg = resolveProxyConfig({
      CRAWL_PROXY_SERVER: 'http://proxy:8080',
      CRAWL_PROXY_USERNAME: 'user',
      CRAWL_PROXY_PASSWORD: 'pass',
    } as NodeJS.ProcessEnv)
    expect(cfg).toEqual({ server: 'http://proxy:8080', username: 'user', password: 'pass' })
  })

  it('bir alan eksikse undefined döner', () => {
    const cfg = resolveProxyConfig({
      CRAWL_PROXY_SERVER: 'http://proxy:8080',
      CRAWL_PROXY_USERNAME: 'user',
    } as NodeJS.ProcessEnv)
    expect(cfg).toBeUndefined()
  })

  it('hiçbiri yoksa undefined döner', () => {
    expect(resolveProxyConfig({} as NodeJS.ProcessEnv)).toBeUndefined()
  })

  it('boş string alan varsa undefined döner', () => {
    const cfg = resolveProxyConfig({
      CRAWL_PROXY_SERVER: '',
      CRAWL_PROXY_USERNAME: 'user',
      CRAWL_PROXY_PASSWORD: 'pass',
    } as NodeJS.ProcessEnv)
    expect(cfg).toBeUndefined()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd crawler && npx jest --config jest.config.js --testMatch "**/__tests__/proxy.test.ts"`
Expected: FAIL — `Cannot find module '../fetcher/proxy'`

- [ ] **Step 3: Write the implementation**

```typescript
// crawler/fetcher/proxy.ts

export interface ProxyConfig {
  server: string
  username: string
  password: string
}

/**
 * Üç env değişkeni de (server/username/password) doluysa proxy config döner,
 * herhangi biri eksik/boşsa undefined (proxysiz — varsayılan davranış). Faz 1'de
 * anonim (kimliksiz) proxy desteklenmiyor — hepsi ya var ya yok.
 */
export function resolveProxyConfig(env: NodeJS.ProcessEnv = process.env): ProxyConfig | undefined {
  const server = env.CRAWL_PROXY_SERVER?.trim()
  const username = env.CRAWL_PROXY_USERNAME?.trim()
  const password = env.CRAWL_PROXY_PASSWORD?.trim()
  if (!server || !username || !password) return undefined
  return { server, username, password }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd crawler && npx jest --config jest.config.js --testMatch "**/__tests__/proxy.test.ts"`
Expected: PASS (4/4)

- [ ] **Step 5: Commit**

```bash
git add crawler/fetcher/proxy.ts crawler/__tests__/proxy.test.ts
git commit -m "feat(crawl-all): env-gated proxy config resolver"
```

---

### Task 3: `createFetcher` proxy passthrough (`crawler/fetcher/browser.ts`)

**Files:**
- Modify: `crawler/fetcher/browser.ts`
- Test: `crawler/__tests__/browser.test.ts` (new)

**Interfaces:**
- Consumes: `ProxyConfig` from Task 2 (`crawler/fetcher/proxy.ts`).
- Produces: `createFetcher(cfg: CrawlConfig, opts?: { headful?: boolean; proxy?: ProxyConfig }): Promise<Fetcher>` (same `Fetcher` shape as before — no change for existing callers that omit `proxy`).

- [ ] **Step 1: Write the failing test**

```typescript
// crawler/__tests__/browser.test.ts
const mockLaunch = jest.fn()
const mockNewContext = jest.fn()

jest.mock('@playwright/test', () => ({
  chromium: { launch: (...args: any[]) => mockLaunch(...args) },
}))

import { createFetcher } from '../fetcher/browser'
import { DEFAULT_CONFIG } from '../config'
import type { ProxyConfig } from '../fetcher/proxy'

function fakeContext() {
  return { addInitScript: jest.fn(), close: jest.fn(), newPage: jest.fn() }
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd crawler && npx jest --config jest.config.js --testMatch "**/__tests__/browser.test.ts"`
Expected: FAIL — second test fails (`opts.proxy` is `undefined`, not the expected object), because `createFetcher` doesn't accept/forward `proxy` yet.

- [ ] **Step 3: Modify the implementation**

In `crawler/fetcher/browser.ts`, add the import and change the function signature + `newContext` call:

```typescript
import { chromium, type Browser, type BrowserContext } from '@playwright/test'
import type { CrawlConfig } from '../config'
import { randDelayMs } from '../config'
import type { ProxyConfig } from './proxy'

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
  opts: { headful?: boolean; proxy?: ProxyConfig } = {},
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
  } catch (e) {
    // kurulum hatası başlatılmış tarayıcıyı öksüz bırakmasın
    await browser.close()
    throw e
  }
```

(The rest of the file — `requestCount`, `fetcher.get`, `fetcher.close` — is unchanged.)

- [ ] **Step 4: Run test to verify it passes**

Run: `cd crawler && npx jest --config jest.config.js --testMatch "**/__tests__/browser.test.ts"`
Expected: PASS (2/2)

- [ ] **Step 5: Run the full crawler suite to confirm no regression**

Run: `cd crawler && npx jest --config jest.config.js`
Expected: all existing suites still PASS (unchanged behavior when `opts.proxy` is omitted).

- [ ] **Step 6: Commit**

```bash
git add crawler/fetcher/browser.ts crawler/__tests__/browser.test.ts
git commit -m "feat(crawl-all): createFetcher proxy passthrough to newContext"
```

---

### Task 4: `run.ts` — `ilUrlOverride` for URL-building vs. DB-scoping province string

**Files:**
- Modify: `crawler/run.ts`
- Test: `crawler/__tests__/run.pipeline.test.ts` (add tests; existing tests unchanged)

**Interfaces:**
- Produces: `RunArgs.ilUrlOverride?: string` — when set, `adapter.searchUrls()` receives this value instead of `args.il`; `args.il` continues to be used, unchanged, for `CrawlRun.il`, `markDelistedExcept` scope, and geocoding.

- [ ] **Step 1: Write the failing tests**

Add to `crawler/__tests__/run.pipeline.test.ts` (near the other `describe('runCrawl', ...)` tests, reusing the file's existing `fakeAdapter`, `fakeClient`, `countingFetcher`, `geoOk` helpers already defined above in the file):

```typescript
it('ilUrlOverride verilirse searchUrls çağrısı args.il yerine bunu alır', async () => {
  const { client } = fakeClient()
  let capturedArg: string | undefined
  const spyAdapter: PortalAdapter = {
    ...fakeAdapter,
    searchUrls: (il) => {
      capturedArg = il
      return []
    },
  }
  await runCrawl(
    { il: 'Şanlıurfa', ilUrlOverride: 'sanliurfa', category: 'arsa', maxPages: 1, dryRun: false },
    {
      adapter: spyAdapter,
      client: client as any,
      fetcher: countingFetcher(),
      geocodeDeps: geoOk,
      detectBlock: () => ({ blocked: false, reason: null }),
      now: () => new Date('2026-09-27'),
    },
  )
  expect(capturedArg).toBe('sanliurfa')
})

it('ilUrlOverride verilmezse searchUrls args.il alır (mevcut davranış)', async () => {
  const { client } = fakeClient()
  let capturedArg: string | undefined
  const spyAdapter: PortalAdapter = {
    ...fakeAdapter,
    searchUrls: (il) => {
      capturedArg = il
      return []
    },
  }
  await runCrawl(
    { il: 'trabzon', category: 'arsa', maxPages: 1, dryRun: false },
    {
      adapter: spyAdapter,
      client: client as any,
      fetcher: countingFetcher(),
      geocodeDeps: geoOk,
      detectBlock: () => ({ blocked: false, reason: null }),
      now: () => new Date('2026-09-27'),
    },
  )
  expect(capturedArg).toBe('trabzon')
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd crawler && npx jest --config jest.config.js --testMatch "**/__tests__/run.pipeline.test.ts"`
Expected: FAIL on the first new test (TypeScript error / `ilUrlOverride` not assignable — `RunArgs` doesn't have that field yet) until Step 3 is applied; the second new test would already pass but won't compile until the type exists.

- [ ] **Step 3: Modify the implementation**

In `crawler/run.ts`, add the field to `RunArgs`:

```typescript
export interface RunArgs {
  il: string
  category: ListingCategory
  maxPages: number
  dryRun: boolean
  limit?: number
  /** Verilirse adapter.searchUrls() bu değeri alır (URL slug), args.il DB scope/delisting/geocode için değişmeden kalır. */
  ilUrlOverride?: string
}
```

And change the one line that builds search URLs:

```typescript
    const searchUrls = adapter.searchUrls(args.ilUrlOverride ?? args.il, args.category, args.maxPages)
```

(replacing the existing `const searchUrls = adapter.searchUrls(args.il, args.category, args.maxPages)`).

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd crawler && npx jest --config jest.config.js --testMatch "**/__tests__/run.pipeline.test.ts"`
Expected: PASS, all tests in the file including the 2 new ones.

- [ ] **Step 5: Run the full crawler suite**

Run: `cd crawler && npx jest --config jest.config.js`
Expected: all suites PASS (no other file references `RunArgs` positionally in a way this breaks).

- [ ] **Step 6: Commit**

```bash
git add crawler/run.ts crawler/__tests__/run.pipeline.test.ts
git commit -m "feat(crawl-all): RunArgs.ilUrlOverride ayırır — URL slug vs DB scope adı"
```

---

### Task 5: Orchestrator core (`crawler/orchestrator.ts`)

**Files:**
- Create: `crawler/orchestrator.ts`
- Test: `crawler/__tests__/orchestrator.test.ts`

**Interfaces:**
- Consumes: `PROVINCES`, `Province` (Task 1); `ProxyConfig` (Task 2); `Fetcher` from `crawler/fetcher/browser.ts`; `RunDeps`, `RunSummary`, `runCrawl` type from `crawler/run.ts` (Task 4 — `ilUrlOverride` field); `GeocodeDeps` from `crawler/pipeline/geocode.ts`; `BlockCheckInput`/`BlockResult` from `crawler/fetcher/blockDetector.ts`; `emlakjetAdapter` from `crawler/adapters/emlakjet.ts`; `DEFAULT_CONFIG`, `CrawlConfig` from `crawler/config.ts`.
- Produces: `export function maxRequestsFor(maxPages: number): number`; `export function unmatchedOnlyTokens(only: string[]): string[]`; `export interface OrchestratorDeps { ... }`; `export interface OrchestratorResult { completed: string[]; blocked: { il: string; reason: string | null }[]; skippedResume: string[]; stoppedEarly: boolean }`; `export async function buildQueue(deps: OrchestratorDeps): Promise<{ queue: Province[]; skippedResume: string[] }>`; `export async function runOrchestrator(deps: OrchestratorDeps): Promise<OrchestratorResult>`.

- [ ] **Step 1: Write the failing tests**

```typescript
// crawler/__tests__/orchestrator.test.ts
import { runOrchestrator, buildQueue, maxRequestsFor, unmatchedOnlyTokens, type OrchestratorDeps } from '../orchestrator'
import type { RunSummary } from '../run'

function okSummary(): RunSummary {
  return {
    pagesFetched: 1, listingsFound: 0, listingsUpserted: 0, unparseable: 0, parseFailed: 0,
    failed: 0, delisted: 0, dupes: 0, neighborhoodUpserted: 0, neighborhoodFailed: 0,
    blocked: false, blockReason: null, complete: true,
  }
}

function blockedSummary(reason = 'engellendi'): RunSummary {
  return { ...okSummary(), blocked: true, blockReason: reason, complete: false }
}

function baseDeps(overrides: Partial<OrchestratorDeps> = {}): OrchestratorDeps {
  return {
    client: { crawlRun: { findMany: async () => [] } } as any,
    createFetcher: async () => ({ get: async () => ({ html: '', status: 200 }), requestCount: 0, close: async () => {} }),
    runCrawl: async () => okSummary(),
    geocodeDeps: { resolveMahalleCentroid: async () => null, isWithinTurkey: () => true },
    detectBlock: () => ({ blocked: false, reason: null }),
    now: () => new Date('2026-09-27T00:00:00Z'),
    workers: 1,
    maxPages: 5,
    resumeDays: 7,
    forceAll: false,
    ...overrides,
  }
}

describe('maxRequestsFor', () => {
  it('maxPages * 31 üzerine yuvarlar', () => {
    expect(maxRequestsFor(25)).toBe(775)
    expect(maxRequestsFor(1)).toBe(31)
  })
})

describe('unmatchedOnlyTokens', () => {
  it('bilinen il adı veya slug için boş liste döner', () => {
    expect(unmatchedOnlyTokens(['trabzon', 'sanliurfa'])).toEqual([])
  })
  it('bilinmeyen bir token listelenir', () => {
    expect(unmatchedOnlyTokens(['trabzon', 'atlantis'])).toEqual(['atlantis'])
  })
})

describe('buildQueue', () => {
  it('forceAll ise resume filtresi atlanır, findMany hiç çağrılmaz', async () => {
    const findMany = jest.fn(async () => [])
    const deps = baseDeps({ forceAll: true, client: { crawlRun: { findMany } } as any })
    const { queue, skippedResume } = await buildQueue(deps)
    expect(queue).toHaveLength(81)
    expect(skippedResume).toEqual([])
    expect(findMany).not.toHaveBeenCalled()
  })

  it('yakın zamanda tamamlanmış iller kuyruktan atlanır (karışık-case CrawlRun.il dahil)', async () => {
    const deps = baseDeps({
      client: { crawlRun: { findMany: async () => [{ il: 'trabzon' }, { il: 'İstanbul' }] } } as any,
    })
    const { queue, skippedResume } = await buildQueue(deps)
    expect(queue.find((p) => p.tkgmName === 'Trabzon')).toBeUndefined()
    expect(queue.find((p) => p.tkgmName === 'İstanbul')).toBeUndefined()
    expect(queue).toHaveLength(79)
    expect(skippedResume.sort()).toEqual(['Trabzon', 'İstanbul'].sort())
  })

  it('only verilince sadece belirtilen iller adaya girer (isim veya slug ile)', async () => {
    const deps = baseDeps({ only: ['trabzon', 'sanliurfa'] })
    const { queue } = await buildQueue(deps)
    expect(queue.map((p) => p.tkgmName).sort()).toEqual(['Trabzon', 'Şanlıurfa'].sort())
  })
})

describe('runOrchestrator', () => {
  it('kuyruktaki tüm illeri worker sayısı kadar paralel tüketir', async () => {
    const processed: string[] = []
    const deps = baseDeps({
      only: ['trabzon', 'istanbul', 'izmir', 'ankara'],
      workers: 2,
      runCrawl: async (args: any) => {
        processed.push(args.il)
        await new Promise((r) => setTimeout(r, 0))
        return okSummary()
      },
    })
    const result = await runOrchestrator(deps)
    expect(result.completed.sort()).toEqual(['Ankara', 'Trabzon', 'İstanbul', 'İzmir'].sort())
    expect(processed).toHaveLength(4)
    expect(result.stoppedEarly).toBe(false)
  })

  it('blocked dönen il result.blocked listesine girer, kuyruk devam eder', async () => {
    const deps = baseDeps({
      only: ['trabzon', 'istanbul'],
      workers: 1,
      runCrawl: async (args: any) => (args.il === 'Trabzon' ? blockedSummary('test-block') : okSummary()),
    })
    const result = await runOrchestrator(deps)
    expect(result.blocked).toEqual([{ il: 'Trabzon', reason: 'test-block' }])
    expect(result.completed).toEqual(['İstanbul'])
  })

  it('runCrawl fırlatırsa il blocked listesine hata mesajıyla eklenir, tur çökmez', async () => {
    const deps = baseDeps({
      only: ['trabzon', 'istanbul'],
      workers: 1,
      runCrawl: async (args: any) => {
        if (args.il === 'Trabzon') throw new Error('ağ koptu')
        return okSummary()
      },
    })
    const result = await runOrchestrator(deps)
    expect(result.blocked).toEqual([{ il: 'Trabzon', reason: 'beklenmeyen hata: ağ koptu' }])
    expect(result.completed).toEqual(['İstanbul'])
  })

  it('%50\'den fazla blocked oranı minimum örnekten sonra erken durur', async () => {
    const only = ['trabzon', 'istanbul', 'izmir', 'ankara', 'bursa', 'antalya']
    const seen: string[] = []
    const deps = baseDeps({
      only,
      workers: 1,
      runCrawl: async (args: any) => {
        seen.push(args.il)
        if (seen.length <= 4) return blockedSummary('test')
        return okSummary()
      },
    })
    const result = await runOrchestrator(deps)
    expect(result.stoppedEarly).toBe(true)
    expect(seen.length).toBeLessThan(6)
  })

  it('kuyruk boşsa (hepsi resume ile atlandı) hiç worker/fetcher açmadan boş sonuç döner', async () => {
    const createFetcher = jest.fn()
    const deps = baseDeps({
      client: { crawlRun: { findMany: async () => [{ il: 'trabzon' }] } } as any,
      only: ['trabzon'],
      createFetcher,
    })
    const result = await runOrchestrator(deps)
    expect(result.completed).toEqual([])
    expect(result.skippedResume).toEqual(['Trabzon'])
    expect(createFetcher).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd crawler && npx jest --config jest.config.js --testMatch "**/__tests__/orchestrator.test.ts"`
Expected: FAIL — `Cannot find module '../orchestrator'`

- [ ] **Step 3: Write the implementation**

```typescript
// crawler/orchestrator.ts
import { DEFAULT_CONFIG, type CrawlConfig } from './config'
import { emlakjetAdapter } from './adapters/emlakjet'
import type { RunDeps, RunSummary } from './run'
import { PROVINCES, type Province } from './data/provinces'
import type { ProxyConfig } from './fetcher/proxy'
import type { Fetcher } from './fetcher/browser'
import type { GeocodeDeps } from './pipeline/geocode'
import type { BlockCheckInput, BlockResult } from './fetcher/blockDetector'

const REQUESTS_PER_PAGE_ESTIMATE = 31
// Erken-dur eşiği yalnız yeterli örnekten sonra değerlendirilir — 1 blocked/1 il
// %100 gösterip turu anlamsızca durdurmasın.
const MIN_SAMPLE_FOR_EARLY_STOP = 5

/** 25 sayfa × ~30 ilan + 25 arama sayfası ≈ 775 istek gerekir (spec matematiği) — maxPages'e göre ölçekle. */
export function maxRequestsFor(maxPages: number): number {
  return Math.ceil(maxPages * REQUESTS_PER_PAGE_ESTIMATE)
}

function matchesOnlyToken(p: Province, token: string): boolean {
  return token === p.tkgmName.toLocaleLowerCase('tr-TR') || token === p.emlakjetSlug
}

/** --only= listesindeki, hiçbir ile/slug'a karşılık gelmeyen tokenları döner (CLI hata mesajı için). */
export function unmatchedOnlyTokens(only: string[]): string[] {
  return only.filter((token) => !PROVINCES.some((p) => matchesOnlyToken(p, token)))
}

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
  /** tkgmName (tr-TR küçük harf) veya emlakjetSlug — her ikisiyle de eşleşir. */
  only?: string[]
}

export interface OrchestratorResult {
  completed: string[]
  blocked: { il: string; reason: string | null }[]
  skippedResume: string[]
  stoppedEarly: boolean
}

export async function buildQueue(
  deps: OrchestratorDeps,
): Promise<{ queue: Province[]; skippedResume: string[] }> {
  const candidates =
    deps.only && deps.only.length > 0
      ? PROVINCES.filter((p) => deps.only!.some((token) => matchesOnlyToken(p, token)))
      : [...PROVINCES]

  if (deps.forceAll) {
    return { queue: candidates, skippedResume: [] }
  }

  const cutoff = new Date(deps.now().getTime() - deps.resumeDays * 86_400_000)
  const doneRuns = await deps.client.crawlRun.findMany({
    where: {
      source: 'emlakjet',
      category: 'arsa',
      blocked: false,
      finishedAt: { not: null },
      startedAt: { gte: cutoff },
    },
    select: { il: true },
  })
  const doneSet = new Set(doneRuns.map((r) => r.il.toLocaleUpperCase('tr-TR')))

  const queue: Province[] = []
  const skippedResume: string[] = []
  for (const p of candidates) {
    if (doneSet.has(p.tkgmName.toLocaleUpperCase('tr-TR'))) skippedResume.push(p.tkgmName)
    else queue.push(p)
  }
  return { queue, skippedResume }
}

async function runWorker(
  queue: Province[],
  deps: OrchestratorDeps,
  result: OrchestratorResult,
): Promise<void> {
  const cfg: CrawlConfig = { ...DEFAULT_CONFIG, maxRequestsPerRun: maxRequestsFor(deps.maxPages) }
  const fetcher = await deps.createFetcher(cfg, { headful: deps.headful, proxy: deps.proxy })
  try {
    while (queue.length > 0) {
      if (result.stoppedEarly) return
      const province = queue.shift()
      if (!province) break

      try {
        const summary = await deps.runCrawl(
          {
            il: province.tkgmName,
            ilUrlOverride: province.emlakjetSlug,
            category: 'arsa',
            maxPages: deps.maxPages,
            dryRun: false,
          },
          {
            adapter: emlakjetAdapter,
            client: deps.client,
            fetcher,
            geocodeDeps: deps.geocodeDeps,
            detectBlock: deps.detectBlock,
            now: deps.now,
            cfg,
          },
        )
        if (summary.blocked) result.blocked.push({ il: province.tkgmName, reason: summary.blockReason })
        else result.completed.push(province.tkgmName)
      } catch (e) {
        result.blocked.push({
          il: province.tkgmName,
          reason: `beklenmeyen hata: ${e instanceof Error ? e.message : String(e)}`,
        })
      }

      const total = result.completed.length + result.blocked.length
      if (total >= MIN_SAMPLE_FOR_EARLY_STOP && result.blocked.length / total > 0.5) {
        result.stoppedEarly = true
        queue.length = 0
        return
      }
    }
  } finally {
    await fetcher.close()
  }
}

export async function runOrchestrator(deps: OrchestratorDeps): Promise<OrchestratorResult> {
  const { queue, skippedResume } = await buildQueue(deps)
  const result: OrchestratorResult = { completed: [], blocked: [], skippedResume, stoppedEarly: false }
  if (queue.length === 0) return result
  const workerCount = Math.max(1, Math.min(deps.workers, queue.length))
  await Promise.all(Array.from({ length: workerCount }, () => runWorker(queue, deps, result)))
  return result
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd crawler && npx jest --config jest.config.js --testMatch "**/__tests__/orchestrator.test.ts"`
Expected: PASS (all `describe` blocks — `maxRequestsFor`, `unmatchedOnlyTokens`, `buildQueue`, `runOrchestrator`)

- [ ] **Step 5: Run the full crawler suite**

Run: `cd crawler && npx jest --config jest.config.js`
Expected: all suites PASS.

- [ ] **Step 6: Commit**

```bash
git add crawler/orchestrator.ts crawler/__tests__/orchestrator.test.ts
git commit -m "feat(crawl-all): orchestrator — resumable kuyruk + worker havuzu + erken-dur"
```

---

### Task 6: CLI entrypoint (`crawler/scripts/crawl-all.ts`) + `package.json` script

**Files:**
- Create: `crawler/scripts/crawl-all.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: `runOrchestrator`, `OrchestratorDeps`, `unmatchedOnlyTokens` (Task 5); `resolveProxyConfig` (Task 2); `createFetcher` (Task 3); `defaultGeocodeDeps`, `detectBlock`, `runCrawl` (existing, from `pipeline/geocode.ts`, `fetcher/blockDetector.ts`, `run.ts`).
- No test file for this task — consistent with the existing convention that `run.ts`'s own `parseArgs`/`main()` CLI wiring is not unit-tested (only the underlying exported functions are); this file is a thin wire-up of already-tested pieces, verified below with `tsc` and a `--dry-run`-style manual smoke check (real network — outside the automated test suite).

- [ ] **Step 1: Write the implementation**

```typescript
// crawler/scripts/crawl-all.ts
import { runOrchestrator, unmatchedOnlyTokens, type OrchestratorDeps } from '../orchestrator'
import { resolveProxyConfig } from '../fetcher/proxy'
import { createFetcher } from '../fetcher/browser'
import { defaultGeocodeDeps } from '../pipeline/geocode'
import { detectBlock } from '../fetcher/blockDetector'
import { runCrawl } from '../run'

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
    maxPages: Number(get('max-pages') ?? 25),
    workers: Number(process.env.CRAWL_WORKERS ?? get('workers') ?? 3),
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
  console.log(
    `crawl:all — emlakjet/arsa, workers=${a.workers}, maxPages=${a.maxPages}, ` +
      `forceAll=${a.forceAll}, only=${a.only?.join(',') ?? '(hepsi)'}, proxy=${proxy ? 'AÇIK' : 'kapalı'}`,
  )

  // I10 deseni (bkz run.ts) — prisma yalnız gerçek çalıştırmada yüklensin.
  const { prisma } = await import('@/lib/prisma')
  const deps: OrchestratorDeps = {
    client: prisma as unknown as OrchestratorDeps['client'],
    createFetcher: (cfg, opts) => createFetcher(cfg, opts),
    runCrawl,
    geocodeDeps: defaultGeocodeDeps(),
    detectBlock,
    now: () => new Date(),
    proxy,
    workers: a.workers,
    maxPages: a.maxPages,
    resumeDays: a.resumeDays,
    forceAll: a.forceAll,
    headful: a.headful,
    only: a.only,
  }

  const result = await runOrchestrator(deps)
  console.log(
    `\n${result.completed.length} il tamam, ${result.blocked.length} il blocked, ` +
      `${result.skippedResume.length} il atlandı (resume)`,
  )
  if (result.blocked.length > 0) console.table(result.blocked)
  if (result.stoppedEarly) {
    console.error(
      "\n⚠️  Erken durduruldu: blocked oranı %50'i aştı — CRAWL_PROXY_* env değişkenlerini doldurup " +
        'tekrar çalıştırın (tamamlanan iller resume ile otomatik atlanır).\n',
    )
    process.exitCode = 2
  }

  await prisma.$disconnect()
}

if (require.main === module) {
  main().catch((e) => {
    console.error(e)
    process.exit(1)
  })
}
```

- [ ] **Step 2: Type-check the crawler package**

Run: `cd crawler && npx tsc -p tsconfig.json`
Expected: no errors.

- [ ] **Step 3: Add the `package.json` script**

In the repo-root `package.json`, next to the existing `"crawl"` line, add:

```json
    "crawl:all": "cross-env TS_NODE_PROJECT=crawler/tsconfig.json ts-node --transpile-only -r tsconfig-paths/register crawler/scripts/crawl-all.ts",
```

- [ ] **Step 4: Verify the CLI wires up without hitting the network (help/arg-parse smoke)**

Run: `npm run crawl:all -- --only=trabzon --force-all --max-pages=1 --dry-run` — **do not actually run this against the network in this task**; instead confirm via `node -e` that the script requires cleanly:

Run: `cd crawler && npx ts-node --transpile-only -r tsconfig-paths/register -e "require('./scripts/crawl-all.ts')"`
Expected: no throw (module loads; `main()` doesn't auto-run because `require.main === module` is false under `-e`).

- [ ] **Step 5: Run the full test + typecheck suite one more time (whole crawler package)**

Run: `cd crawler && npx jest --config jest.config.js && npx tsc -p tsconfig.json`
Expected: all green, 0 tsc errors.

- [ ] **Step 6: Commit**

```bash
git add crawler/scripts/crawl-all.ts package.json
git commit -m "feat(crawl-all): CLI entrypoint + npm run crawl:all"
```

**Operational note (not part of this task's automated verification, record in the commit body or a follow-up doc note):** before the first full national run on the VPS, per the spec's "Operasyon" section: (1) `npx prisma migrate deploy` on prod for `Neighborhood`/`AreaPriceStat` if not already applied; (2) run `--only=` a handful of diacritic provinces (`sanliurfa,canakkale,mugla,igdir,kirsehir,usak,duzce,gumushane,nigde,kahramanmaras,afyonkarahisar,istanbul`) with `--max-pages=1` and `--headful` off, and eyeball the resulting `CrawlRun` rows (`pagesFetched`/`listingsFound` > 0, `blocked=false`) before trusting the slug table for the full 81-province run; (3) if `stoppedEarly` fires mid-run with `CRAWL_WORKERS>1`, expect a few more `CrawlRun` rows to land after the log message — in-flight workers finish their current province, they are not aborted.

---

## Self-Review

**1. Spec coverage:**
- Decision #1 (own crawler, Emlakjet only) — Task 5/6 (`emlakjetAdapter` hardcoded, `category: 'arsa'` hardcoded). ✓
- Decision #2 (VPS, prod DB, systemd/tmux) — operational, no code; Task 6's operational note covers the run command. ✓
- Decision #3 (proxy env-gated, default off) — Task 2 + Task 3. ✓
- Decision #4 (arsa types only) — reuses `run.ts`'s existing `ARSA_TYPES`/`category:'arsa'` hardcoding, unchanged. ✓
- Decision #5 (`CRAWL_WORKERS` parametric, default 3) — Task 6's `parseArgs` (env-first, default 3). ✓
- Decision #6 (province-loop orchestration, one `CrawlRun` per province, resumable) — Task 5 `buildQueue`/`runWorker`. ✓
- Decision #7 (not run at spec time) — this plan doesn't run it either; Global Constraints says so explicitly. ✓
- Decision #8 (no new data types, no UI change) — no schema/UI file touched anywhere in this plan. ✓
- `provinces.ts` (81 il, tkgmName/emlakjetSlug) — Task 1. ✓
- `fetcher/proxy.ts` — Task 2. ✓
- `fetcher/browser.ts` proxy passthrough — Task 3. ✓
- `orchestrator.ts` (queue, workers, resumability, `blocked` handling, >50% early stop) — Task 5. ✓
- `scripts/crawl-all.ts` + `crawl:all` script + `--resume`(default)/`--force-all`/`--only` flags — Task 6 (note: the spec calls the default-resume behavior "`--resume`", this plan implements it as *always-on unless `--force-all`*, i.e., there is no separate `--resume` flag to pass — this is a deliberate simplification consistent with "varsayılan açık"; documented here so it's a visible decision, not a silent gap).
- Test strategy table (provinces/proxy/browser/orchestrator unit coverage, no live smoke) — Tasks 1–5 tests + Task 6's operational note. ✓
- Out-of-scope items (Sahibinden/Hepsiemlak, proxy rotation, konut, cron, stealth plugin, captcha, intra-province parallelism, `*Norm` columns) — none touched by any task. ✓

**2. Placeholder scan:** No "TBD"/"add error handling"/"similar to Task N" phrasing left in any step; the one spot that could look like a placeholder (the `runCrawl` field type note in Task 5) is resolved with a literal, copy-pasteable replacement, not a description.

**3. Type consistency:** `Province { tkgmName, emlakjetSlug }` (Task 1) used identically in Task 5's `PROVINCES`/`buildQueue`/`runWorker`. `ProxyConfig { server, username, password }` (Task 2) used identically in Task 3's `createFetcher` and Task 5/6's `OrchestratorDeps.proxy`. `RunArgs.ilUrlOverride` (Task 4) is the exact field name passed by Task 5's `runWorker`. `OrchestratorResult` shape (`completed`/`blocked`/`skippedResume`/`stoppedEarly`) is identical between Task 5's implementation and Task 6's consumption.

**4. Review Focus:** see the dedicated section above — all 5 items map to either a task's test (URL-slug mismatch → Task 6 operational dry-run; `--only` typo → `unmatchedOnlyTokens` test in Task 5 + CLI check in Task 6; resume-filter casing → Task 5's mixed-case test; early-stop with `workers>1` → documented, not testable via unit test; `maxRequestsFor` formula drift → pinned by Task 5's own test).
