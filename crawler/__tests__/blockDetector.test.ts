import { detectBlock, detectHardBlock } from '../fetcher/blockDetector'

const ok = { html: '<div class="results"><div class="card">x</div></div>', httpStatus: 200, expectedSelector: '.results', foundListingCount: 12 }

describe('detectBlock', () => {
  it('normal sayfada blocked=false', () => {
    expect(detectBlock(ok)).toEqual({ blocked: false, reason: null })
  })

  it('HTTP 403/429 → blocked', () => {
    expect(detectBlock({ ...ok, httpStatus: 403 }).blocked).toBe(true)
    expect(detectBlock({ ...ok, httpStatus: 429 }).blocked).toBe(true)
  })

  it('challenge işaretleri → blocked', () => {
    expect(detectBlock({ ...ok, html: '<title>Just a moment...</title>' }).blocked).toBe(true)
    expect(detectBlock({ ...ok, html: 'lütfen robot olmadığınızı doğrulayın' }).blocked).toBe(true)
    expect(detectBlock({ ...ok, html: '<iframe src="https://challenges.cloudflare.com/..."></iframe>' }).blocked).toBe(true)
    expect(detectBlock({ ...ok, html: '<div id="px-captcha"></div>' }).blocked).toBe(true)
  })

  it('beklenen konteyner yok → blocked', () => {
    expect(detectBlock({ ...ok, html: '<body>bambaşka</body>' }).blocked).toBe(true)
  })

  it('konteyner var ama 0 ilan (arama sayfasında) → blocked şüphesi', () => {
    expect(detectBlock({ ...ok, foundListingCount: 0 }).blocked).toBe(true)
  })

  it('foundListingCount negatif = "kontrol etme" (detay sayfası) → sadece diğer sinyaller', () => {
    expect(detectBlock({ ...ok, foundListingCount: -1 }).blocked).toBe(false)
  })
})

describe('detectHardBlock (G1)', () => {
  it('temiz 200 + challenge yok → blocked=false (konteyner/0-ilan kontrol edilmez)', () => {
    expect(detectHardBlock('<body>hiç ilan yok</body>', 200)).toEqual({ blocked: false, reason: null })
  })
  it('HTTP 403/429/5xx → blocked', () => {
    expect(detectHardBlock('x', 403).blocked).toBe(true)
    expect(detectHardBlock('x', 429).blocked).toBe(true)
    expect(detectHardBlock('x', 503).blocked).toBe(true)
  })
  it('challenge kalıpları → blocked', () => {
    expect(detectHardBlock('<title>Just a moment...</title>', 200).blocked).toBe(true)
    expect(detectHardBlock('<div id="px-captcha"></div>', 200).blocked).toBe(true)
  })
})
