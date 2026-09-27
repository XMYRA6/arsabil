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
