import { withSentryConfig } from '@sentry/nextjs'

/** @type {import('next').NextConfig} */
const nextConfig = {
    output: "standalone",
    images: {
        remotePatterns: [
            { protocol: 'https', hostname: 'res.cloudinary.com' },
        ],
    },
    async headers() {
        return [
            {
                source: '/:path*',
                headers: [
                    { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
                    { key: 'X-Frame-Options', value: 'DENY' },
                    { key: 'X-Content-Type-Options', value: 'nosniff' },
                    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
                    { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self)' },
                    {
                        key: 'Content-Security-Policy',
                        value: "default-src 'self'; img-src 'self' data: blob: https://res.cloudinary.com https://*.basemaps.cartocdn.com https://*.tile.openstreetmap.org; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; connect-src 'self' https://*.ingest.sentry.io https://*.sentry.io https://nominatim.openstreetmap.org; font-src 'self' data: https://fonts.gstatic.com; frame-ancestors 'none'",
                    },
                ],
            },
        ]
    },
};

export default withSentryConfig(nextConfig, {
    silent: true,
    org: process.env.SENTRY_ORG,
    project: process.env.SENTRY_PROJECT,
    authToken: process.env.SENTRY_AUTH_TOKEN,
    sourcemaps: {
        disable: !process.env.SENTRY_AUTH_TOKEN,
        deleteSourcemapsAfterUpload: true,
    },
});
