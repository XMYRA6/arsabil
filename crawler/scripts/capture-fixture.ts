/**
 * Fixture yakalama aracı (dev-only, testte kullanılmaz).
 *
 * Portal arama + detay sayfalarının HTML'ini `crawler/fixtures/` altına kaydeder;
 * adapter parser testleri bunlara karşı koşar. HEADFUL çalışır — CAPTCHA çıkarsa
 * açılan pencerede elle çöz, script devam eder.
 *
 * Kullanım:
 *   npx ts-node --compiler-options "{\"module\":\"commonjs\"}" crawler/scripts/capture-fixture.ts
 *   npx ts-node ... crawler/scripts/capture-fixture.ts --only=sahibinden
 *   npx ts-node ... crawler/scripts/capture-fixture.ts --headless
 *
 * Not: bu bir crawl aracı değil — tek seferlik, ~9 sayfa. Gerçek crawler
 * `crawler/run.ts` (Task 13).
 */
import { chromium, type Page } from '@playwright/test'
import * as fs from 'node:fs'
import * as path from 'node:path'

const FIX_DIR = path.join(__dirname, '..', 'fixtures')
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

const args = process.argv.slice(2)
const only = args.find((a) => a.startsWith('--only='))?.split('=')[1]
const headless = args.includes('--headless')

type PortalPlan = {
  source: string
  arsaSearch: string
  konutSearch: string
  /** arama sayfasındaki bir ilan detay linkini seçer */
  detailHrefMatch: RegExp
  /** bu selector görünene kadar bekle (listeler JS ile render oluyorsa) */
  waitFor?: string
}

const PLANS: PortalPlan[] = [
  {
    source: 'sahibinden',
    arsaSearch: 'https://www.sahibinden.com/satilik-arsa/trabzon',
    konutSearch: 'https://www.sahibinden.com/satilik/trabzon',
    detailHrefMatch: /sahibinden\.com\/ilan\/.+-\d{6,}/,
    waitFor: 'a[href*="/ilan/"]',
  },
  {
    source: 'emlakjet',
    arsaSearch: 'https://www.emlakjet.com/satilik-arsa/trabzon/',
    konutSearch: 'https://www.emlakjet.com/satilik-konut/trabzon/',
    detailHrefMatch: /emlakjet\.com\/ilan\/.+-\d{4,}/,
    waitFor: 'a[href*="/ilan/"]',
  },
  {
    source: 'hepsiemlak',
    arsaSearch: 'https://www.hepsiemlak.com/trabzon-satilik/arsa',
    konutSearch: 'https://www.hepsiemlak.com/trabzon-satilik/konut',
    detailHrefMatch: /hepsiemlak\.com\/[a-z0-9-]+\/(arsa|konut)\/[a-z0-9-]+-\d{6,}/,
    waitFor: 'a[href*="/arsa/"], a[href*="/konut/"], .list-view-line',
  },
]

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

async function save(page: Page, url: string, file: string, waitFor?: string): Promise<void> {
  console.log(`  → ${url}`)
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60_000 })
  } catch (e) {
    console.log(`     goto uyarı: ${(e as Error).message}`)
  }
  // JS render + insan-benzeri bekleme; CAPTCHA varsa elle çözmek için pencere
  await sleep(4000)
  await page.mouse.wheel(0, 1200).catch(() => {})
  await sleep(2500)
  if (waitFor) {
    try {
      await page.waitForSelector(waitFor, { timeout: 25_000 })
    } catch {
      console.log(`     waitFor "${waitFor}" gelmedi (JS render / engel?)`)
    }
    await sleep(2500)
  }
  await page.mouse.wheel(0, 2000).catch(() => {})
  await sleep(2000)
  const html = await page.content()
  const dest = path.join(FIX_DIR, file)
  fs.writeFileSync(dest, html, 'utf8')
  const blocked = /just a moment|robot|captcha|datadome|px-captcha|erişim engellendi/i.test(html)
  console.log(`     kaydedildi: ${file} (${(html.length / 1024).toFixed(0)} KB)${blocked ? '  ⚠️ ENGEL ŞÜPHESİ' : ''}`)
}

async function firstDetailHref(page: Page, match: RegExp): Promise<string | null> {
  const hrefs: string[] = await page.$$eval('a[href]', (els) =>
    els.map((e) => (e as HTMLAnchorElement).href).filter(Boolean),
  )
  return hrefs.find((h) => match.test(h)) ?? null
}

async function main() {
  fs.mkdirSync(FIX_DIR, { recursive: true })
  const browser = await chromium.launch({ headless, slowMo: headless ? 0 : 120 })
  const ctx = await browser.newContext({
    userAgent: UA,
    viewport: { width: 1440, height: 900 },
    locale: 'tr-TR',
    timezoneId: 'Europe/Istanbul',
  })
  await ctx.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined })
  })
  const page = await ctx.newPage()

  for (const plan of PLANS) {
    if (only && plan.source !== only) continue
    console.log(`\n=== ${plan.source} ===`)

    await save(page, plan.arsaSearch, `${plan.source}-arsa-search.html`, plan.waitFor)
    const arsaDetail = await firstDetailHref(page, plan.detailHrefMatch)
    if (arsaDetail) {
      await sleep(2500)
      await save(page, arsaDetail, `${plan.source}-arsa-detail-1.html`)
    } else {
      console.log(`     ⚠️ arsa detay linki bulunamadı — ${plan.source}-arsa-detail-1.html atlandı`)
    }

    await sleep(3000)
    await save(page, plan.konutSearch, `${plan.source}-konut-search-TEMP.html`, plan.waitFor)
    const konutDetail = await firstDetailHref(page, plan.detailHrefMatch)
    if (konutDetail) {
      await sleep(2500)
      await save(page, konutDetail, `${plan.source}-konut-detail-1.html`)
    } else {
      console.log(`     ⚠️ konut detay linki bulunamadı — ${plan.source}-konut-detail-1.html atlandı`)
    }
    // konut arama sayfası sadece link kaynağı; adapter testi kullanmıyor
    fs.rmSync(path.join(FIX_DIR, `${plan.source}-konut-search-TEMP.html`), { force: true })

    await sleep(4000)
  }

  console.log('\nBitti. crawler/fixtures/ içindekiler:')
  for (const f of fs.readdirSync(FIX_DIR).filter((f) => f.endsWith('.html'))) {
    console.log('  ' + f)
  }
  await browser.close()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
