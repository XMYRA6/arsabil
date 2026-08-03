/**
 * In-memory sliding-window rate limiter.
 * TEK INSTANCE varsayımı: yatay ölçeklemede Redis tabanlı implementasyonla
 * değiştirilmeli — arayüz (checkRateLimit) sabit kalacak şekilde tasarlandı.
 */

export type RateLimitOptions = { limit: number; windowMs: number }
export type RateLimitResult = { ok: boolean; retryAfterSec?: number }

const MAX_KEYS = 10_000
const buckets = new Map<string, number[]>()

export function checkRateLimit(key: string, opts: RateLimitOptions, now: number = Date.now()): RateLimitResult {
    const windowStart = now - opts.windowMs
    const recent = (buckets.get(key) ?? []).filter(t => t > windowStart)

    if (recent.length >= opts.limit) {
        buckets.set(key, recent)
        const oldestExpiry = recent[0] + opts.windowMs
        return { ok: false, retryAfterSec: Math.max(1, Math.ceil((oldestExpiry - now) / 1000)) }
    }

    recent.push(now)
    if (!buckets.has(key) && buckets.size >= MAX_KEYS) {
        // bellek üst sınırı: en eski eklenen anahtarı düşür
        const oldestKey = buckets.keys().next().value
        if (oldestKey !== undefined) buckets.delete(oldestKey)
    }
    buckets.set(key, recent)
    return { ok: true }
}

export function resetRateLimits(): void {
    buckets.clear()
}

/**
 * GÜVENİLEN PROXY VARSAYIMI: bu fonksiyon tek güvenilen reverse proxy
 * (Coolify/Traefik) arkasında çalışmak üzere tasarlandı. Proxy, istemcinin
 * gönderdiği x-forwarded-for'a GERÇEK istemci IP'sini SONA EKLER — bu yüzden
 * SON girdi alınır (ilk girdi istemci kontrolündedir, spoof edilebilir).
 * Proxy'siz (doğrudan) erişimde header'lar tamamen istemci kontrolündedir;
 * header yoksa tüm istemciler 'unknown' anahtarında birleşir (fail-closed).
 */
export function clientIpFromHeaders(
    forwardedFor: string | null | undefined,
    realIp: string | null | undefined,
): string {
    if (forwardedFor) {
        const parts = forwardedFor.split(',')
        return parts[parts.length - 1].trim()
    }
    return realIp ?? 'unknown'
}

export function getClientIp(req: Request): string {
    return clientIpFromHeaders(req.headers.get('x-forwarded-for'), req.headers.get('x-real-ip'))
}

export const RATE_LIMITS = {
    LOGIN:    { limit: 5,  windowMs: 60_000 },     // IP başına 5/dk
    REGISTER: { limit: 3,  windowMs: 3_600_000 },  // IP başına 3/saat
    UPLOAD:   { limit: 10, windowMs: 3_600_000 },  // kullanıcı başına 10/saat
    WRITE:    { limit: 30, windowMs: 60_000 },     // kullanıcı başına 30/dk (mesaj+teklif)
    PASSWORD_RESET: { limit: 3, windowMs: 3_600_000 }, // IP başına 3/saat (REGISTER ile aynı eşik)
    PARCEL_LOOKUP: { limit: 20, windowMs: 60_000 }, // kullanıcı başına 20/dk (TKGM'yi yormamak için)
    PARCEL_LOOKUP_ANON: { limit: 5, windowMs: 60_000 }, // IP başına 5/dk (anonim botları engellemek için)
    RISK_LOOKUP: { limit: 20, windowMs: 60_000 },   // kullanıcı başına 20/dk (PARCEL_LOOKUP ile aynı eşik)
    RISK_TILES: { limit: 300, windowMs: 60_000 },   // IP başına 300/dk — tek harita görünümü onlarca tile ister
} as const
