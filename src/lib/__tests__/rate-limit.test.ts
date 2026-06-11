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
})

describe('getClientIp', () => {
    it('x-forwarded-for ilk IP alınır', () => {
        const req = new Request('http://x', { headers: { 'x-forwarded-for': '1.2.3.4, 10.0.0.1' } })
        expect(getClientIp(req)).toBe('1.2.3.4')
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
