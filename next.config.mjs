/** @type {import('next').NextConfig} */
const nextConfig = {
    output: "standalone",
    images: {
        remotePatterns: [
            { protocol: 'https', hostname: 'res.cloudinary.com' },
        ],
    },
    eslint: {
        // Task 15 (lint temizliği) tamamlanınca bu blok silinecek
        ignoreDuringBuilds: true,
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
                        key: 'Content-Security-Policy-Report-Only',
                        value: "default-src 'self'; img-src 'self' data: blob: https://res.cloudinary.com https://*.tile.openstreetmap.org; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; connect-src 'self' https://*.ingest.sentry.io https://*.sentry.io; font-src 'self' data:; frame-ancestors 'none'",
                    },
                ],
            },
        ]
    },
};

export default nextConfig;
