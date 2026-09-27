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
