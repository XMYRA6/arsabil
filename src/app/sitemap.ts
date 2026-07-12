import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

    const staticRoutes: MetadataRoute.Sitemap = [
        { url: `${baseUrl}/`, changeFrequency: "daily", priority: 1 },
        { url: `${baseUrl}/hesapla`, changeFrequency: "weekly", priority: 0.9 },
        { url: `${baseUrl}/marketplace`, changeFrequency: "daily", priority: 0.9 },
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

    return [...staticRoutes, ...listingRoutes];
}
