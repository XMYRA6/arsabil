import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
    try {
        const [totalUsers, totalReports, totalListings, totalOffers] = await Promise.all([
            prisma.user.count(),
            prisma.report.count(),
            prisma.listing.count(),
            prisma.offer.count(),
        ]);

        // Role distribution
        const users = await prisma.user.findMany({ select: { role: true } });
        const roleMap: Record<string, number> = {};
        users.forEach(u => { roleMap[u.role] = (roleMap[u.role] || 0) + 1; });
        const roleDistribution = Object.entries(roleMap).map(([role, count]) => ({ role, count }))
            .sort((a, b) => b.count - a.count);

        // City distribution from listings
        const listings = await prisma.listing.findMany({ select: { city: true } });
        const cityMap: Record<string, number> = {};
        listings.forEach(l => { if (l.city) cityMap[l.city] = (cityMap[l.city] || 0) + 1; });
        const cityDistribution = Object.entries(cityMap).map(([city, count]) => ({ city, count }))
            .sort((a, b) => b.count - a.count);

        // Recent users
        const recentUsers = await prisma.user.findMany({
            orderBy: { createdAt: 'desc' },
            take: 10,
            select: { name: true, email: true, createdAt: true },
        });

        return NextResponse.json({
            totalUsers,
            totalReports,
            totalListings,
            totalOffers,
            roleDistribution,
            cityDistribution,
            recentUsers,
        });
    } catch (e) {
        console.error(e);
        return NextResponse.json({
            totalUsers: 0, totalReports: 0, totalListings: 0, totalOffers: 0,
            roleDistribution: [], cityDistribution: [], recentUsers: [],
        });
    }
}
