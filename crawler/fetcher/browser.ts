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

  let requestCount = 0

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

      const page = await context.newPage()
      try {
        const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45_000 })
        // insan-benzeri scroll
        await page.mouse.wheel(0, 600 + Math.random() * 1200)
        await sleep(1200 + Math.random() * 2500)
        const html = await page.content()
        const status = resp?.status() ?? 0
        requestCount++
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
