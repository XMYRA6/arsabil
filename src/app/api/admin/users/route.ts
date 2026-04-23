import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

// GET — Tüm kullanıcıları listele
export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user?.role !== "ADMIN") {
            return NextResponse.json({ message: "Yetkisiz." }, { status: 403 });
        }

        const users = await prisma.user.findMany({
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                createdAt: true,
                _count: {
                    select: {
                        reports: true,
                        listings: true,
                        offers: true,
                    }
                }
            },
            orderBy: { createdAt: "desc" },
        });

        return NextResponse.json({ users });
    } catch (error) {
        console.error("Admin users list error:", error);
        return NextResponse.json({ message: "Hata oluştu." }, { status: 500 });
    }
}

// PATCH — Kullanıcı rolünü değiştir
export async function PATCH(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user?.role !== "ADMIN") {
            return NextResponse.json({ message: "Yetkisiz." }, { status: 403 });
        }

        const { userId, role } = await req.json();

        if (!userId || !role) {
            return NextResponse.json({ message: "userId ve role gereklidir." }, { status: 400 });
        }

        // Admin kendini değiştiremesin
        if (userId === session.user.id) {
            return NextResponse.json({ message: "Kendi rolünüzü değiştiremezsiniz." }, { status: 400 });
        }

        const validRoles = ["USER", "ADMIN"];
        if (!validRoles.includes(role)) {
            return NextResponse.json({ message: "Geçersiz rol." }, { status: 400 });
        }

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: { role },
        });

        return NextResponse.json({ message: "Rol güncellendi.", user: updatedUser });
    } catch (error) {
        console.error("Admin role update error:", error);
        return NextResponse.json({ message: "Hata oluştu." }, { status: 500 });
    }
}
