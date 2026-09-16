import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { getSeoAreas } from "@/lib/areaSeo/seoAreaDeps";

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

    const staticRoutes: MetadataRoute.Sitemap = [
        { url: `${baseUrl}/`, changeFrequency: "daily", priority: 1 },
        { url: `${baseUrl}/hesapla`, changeFrequency: "weekly", priority: 0.9 },
        { url: `${baseUrl}/deger`, changeFrequency: "weekly", priority: 0.9 },
        { url: `${baseUrl}/marketplace`, changeFrequency: "daily", priority: 0.9 },
        { url: `${baseUrl}/arsa-fiyatlari`, changeFrequency: "weekly", priority: 0.8 },
        { url: `${baseUrl}/akif`, changeFrequency: "weekly", priority: 0.7 },
        { url: `${baseUrl}/contact`, changeFrequency: "yearly", priority: 0.3 },
        { url: `${baseUrl}/terms`, changeFrequency: "yearly", priority: 0.3 },
        { url: `${baseUrl}/privacy`, changeFrequency: "yearly", priority: 0.3 },
    ];

    const listings = await prisma.listing.findMany({
        where: { isActive: true },
        select: { id: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 1000,
    });

    const listingRoutes: MetadataRoute.Sitemap = listings.map((l) => ({
        url: `${baseUrl}/listing/${l.id}`,
        lastModified: l.createdAt,
        changeFrequency: "weekly",
        priority: 0.7,
    }));

    const [ilAreas, ilceAreas, mahalleAreas] = await Promise.all([
        getSeoAreas('il'),
        getSeoAreas('ilce'),
        getSeoAreas('mahalle'),
    ]);

    const areaSeoRoutes: MetadataRoute.Sitemap = [
        ...ilAreas.map((e) => ({
            url: `${baseUrl}/arsa-fiyatlari/${e.ilSlug}`,
            changeFrequency: "weekly" as const,
            priority: 0.6,
        })),
        ...ilceAreas.map((e) => ({
            url: `${baseUrl}/arsa-fiyatlari/${e.ilSlug}/${e.ilceSlug}`,
            changeFrequency: "weekly" as const,
            priority: 0.6,
        })),
        ...mahalleAreas.map((e) => ({
            url: `${baseUrl}/arsa-fiyatlari/${e.ilSlug}/${e.ilceSlug}/${e.mahalleSlug}`,
            changeFrequency: "weekly" as const,
            priority: 0.65,
        })),
    ];

    return [...staticRoutes, ...listingRoutes, ...areaSeoRoutes];
}
