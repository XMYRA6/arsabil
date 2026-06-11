import * as Sentry from '@sentry/nextjs'

Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    enabled: Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN),
    tracesSampleRate: 0.1,
    sendDefaultPii: false,
    beforeSend(event, hint) {
        const err = hint?.originalException as { message?: string; digest?: string } | undefined
        const sig = `${err?.digest ?? ''} ${err?.message ?? ''}`
        // Next kontrol-akışı hataları: redirect() ve notFound()/HTTP fallback
        if (sig.includes('NEXT_REDIRECT') || sig.includes('NEXT_HTTP_ERROR_FALLBACK') || sig.includes('NEXT_NOT_FOUND')) {
            return null
        }
        return event
    },
})

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
