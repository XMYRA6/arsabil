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
