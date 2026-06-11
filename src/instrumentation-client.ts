import * as Sentry from '@sentry/nextjs'

Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    enabled: Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN),
    tracesSampleRate: 0.1,
    sendDefaultPii: false,
    beforeSend(event, hint) {
        const msg = String((hint?.originalException as Error | undefined)?.message ?? '')
        if (msg.includes('NEXT_NOT_FOUND') || msg.includes('NEXT_REDIRECT')) return null
        return event
    },
})

// NOTE: captureRouterTransitionStart is not available in @sentry/nextjs v10.57.0
// (it was a v9 API). Export omitted intentionally.
