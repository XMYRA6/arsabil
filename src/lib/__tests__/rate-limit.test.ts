import { checkRateLimit, resetRateLimits, getClientIp, RATE_LIMITS } from '../rate-limit'

describe('checkRateLimit', () => {
    beforeEach(() => resetRateLimits())

    it('limit dolana kadar izin verir, sonra reddeder', () => {
        const opts = { limit: 3, windowMs: 60_000 }
        const now = 1_000_000
        expect(checkRateLimit('k', opts, now).ok).toBe(true)
        expect(checkRateLimit('k', opts, now + 1).ok).toBe(true)
        expect(checkRateLimit('k', opts, now + 2).ok).toBe(true)
        const denied = checkRateLimit('k', opts, now + 3)
        expect(denied.ok).toBe(false)
        expect(denied.retryAfterSec).toBeGreaterThan(0)
        expect(denied.retryAfterSec).toBeLessThanOrEqual(60)
    })

    it('pencere kayınca eski denemeler düşer', () => {
        const opts = { limit: 2, windowMs: 60_000 }
        const now = 1_000_000
        checkRateLimit('k', opts, now)
        checkRateLimit('k', opts, now + 1)
        expect(checkRateLimit('k', opts, now + 2).ok).toBe(false)
        // 61 sn sonra ilk iki deneme pencere dışı
        expect(checkRateLimit('k', opts, now + 61_000).ok).toBe(true)
    })

    it('farklı anahtarlar birbirini etkilemez', () => {
        const opts = { limit: 1, windowMs: 60_000 }
        expect(checkRateLimit('a', opts, 0).ok).toBe(true)
        expect(checkRateLimit('b', opts, 0).ok).toBe(true)
        expect(checkRateLimit('a', opts, 1).ok).toBe(false)
    })

    it('retryAfterSec en eski denemenin pencere çıkışına göre kesin hesaplanır', () => {
        const opts = { limit: 3, windowMs: 60_000 }
        // denemeler pencereye yayılmış: t=0, t=30s, t=59s
        checkRateLimit('p', opts, 0)
        checkRateLimit('p', opts, 30_000)
        checkRateLimit('p', opts, 59_000)
        const denied = checkRateLimit('p', opts, 59_500)
        expect(denied.ok).toBe(false)
        // en eski (t=0) çıkışı: 60_000 → kalan 500ms → ceil = 1 sn
        expect(denied.retryAfterSec).toBe(1)
    })

    it('MAX_KEYS asiminda en eski anahtar düşer, yeni anahtar kabul edilir', () => {
        const opts = { limit: 1, windowMs: 60_000 }
        for (let i = 0; i < 10_000; i++) checkRateLimit(`k${i}`, opts, 0)
        // kapasite dolu; yeni anahtar k0'ı (ilk eklenen) düşürür
        expect(checkRateLimit('yeni', opts, 1).ok).toBe(true)
        // düşmemiş anahtar (k1) limitinde kalmaya devam eder
        expect(checkRateLimit('k1', opts, 2).ok).toBe(false)
        // k0 düştüğü için taze sayaçla döner → izin verilir
        // (bu insert kapasite dolu olduğundan sıradaki en eski anahtarı düşürür — bilinçli)
        expect(checkRateLimit('k0', opts, 3).ok).toBe(true)
    })
})

describe('getClientIp', () => {
    it('x-forwarded-for ilk IP alınır', () => {
        const req = new Request('http://x', { headers: { 'x-forwarded-for': '1.2.3.4, 10.0.0.1' } })
        expect(getClientIp(req)).toBe('1.2.3.4')
    })
    it('x-forwarded-for yoksa x-real-ip kullanılır', () => {
        const req = new Request('http://x', { headers: { 'x-real-ip': '5.6.7.8' } })
        expect(getClientIp(req)).toBe('5.6.7.8')
    })
    it('header yoksa unknown döner', () => {
        expect(getClientIp(new Request('http://x'))).toBe('unknown')
    })
})

describe('RATE_LIMITS', () => {
    it('spec degerleri', () => {
        expect(RATE_LIMITS.LOGIN).toEqual({ limit: 5, windowMs: 60_000 })
        expect(RATE_LIMITS.REGISTER).toEqual({ limit: 3, windowMs: 3_600_000 })
        expect(RATE_LIMITS.UPLOAD).toEqual({ limit: 10, windowMs: 3_600_000 })
        expect(RATE_LIMITS.WRITE).toEqual({ limit: 30, windowMs: 60_000 })
    })
})
