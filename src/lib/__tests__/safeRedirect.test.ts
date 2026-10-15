import { safeRedirectPath } from '../safeRedirect'

describe('safeRedirectPath', () => {
  it('aynı-origin göreli yolları kabul eder (sorgu dahil)', () => {
    expect(safeRedirectPath('/akif/baglan?t=abc')).toBe('/akif/baglan?t=abc')
    expect(safeRedirectPath('/dashboard')).toBe('/dashboard')
  })

  it('açık yönlendirme girişimlerini reddeder', () => {
    for (const bad of ['//evil.com', '/\\evil.com', 'https://evil.com', 'javascript:alert(1)', 'evil.com', '', '/x\n/y', '/x\r']) {
      expect(safeRedirectPath(bad)).toBe('/')
    }
  })

  it('null/undefined → fallback; özel fallback verilebilir', () => {
    expect(safeRedirectPath(null)).toBe('/')
    expect(safeRedirectPath(undefined, '/dashboard')).toBe('/dashboard')
  })
})
