import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ message: "Yetkisiz." }, { status: 401 });
    }

    try {
        const userId = session.user.id as string;
        const data = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                name: true,
                email: true,
                bio: true,
                linkedin: true,
                website: true,
                plan: true,
                createdAt: true,
                projects: { include: { scenarios: true } },
                listings: true,
                reports: true,
                favorites: true,
                sentMessages: true,
                receivedMessages: true,
                offers: true,
                // password ASLA select edilmez
            },
        });

        if (!data) {
            return NextResponse.json({ message: "Kullanıcı bulunamadı." }, { status: 404 });
        }

        return NextResponse.json({ user: data, exportedAt: new Date().toISOString() });
    } catch (error) {
        console.error("Data export error:", error);
        return NextResponse.json({ message: "Hata oluştu." }, { status: 500 });
    }
}
