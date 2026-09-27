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
