import * as Sentry from '@sentry/nextjs'

const SENTRY_ENABLED = Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN)

Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    enabled: SENTRY_ENABLED,
    // DSN yokken OTel global tracer/propagator kaydini da atla (bosuna overhead)
    skipOpenTelemetrySetup: !SENTRY_ENABLED,
    tracesSampleRate: 0.1,
    sendDefaultPii: false,
    beforeSend(event, hint) {
        const err = hint?.originalException as { message?: string; digest?: string } | undefined
        const sig = `${err?.digest ?? ''} ${err?.message ?? ''}`
        if (sig.includes('NEXT_REDIRECT') || sig.includes('NEXT_HTTP_ERROR_FALLBACK') || sig.includes('NEXT_NOT_FOUND')) {
            return null
        }
        return event
    },
})
