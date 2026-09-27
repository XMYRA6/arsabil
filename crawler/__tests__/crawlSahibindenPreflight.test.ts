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
