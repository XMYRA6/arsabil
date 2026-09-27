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
