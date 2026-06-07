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

// PATCH — Kullanıcı rol/plan/isVerified güncelle
export async function PATCH(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user?.role !== "ADMIN") {
            return NextResponse.json({ message: "Yetkisiz." }, { status: 403 });
        }

        const { userId, role, isVerified, plan } = await req.json();

        if (!userId) {
            return NextResponse.json({ message: "userId gereklidir." }, { status: 400 });
        }

        if (userId === session.user.id && role !== undefined) {
            return NextResponse.json({ message: "Kendi hesabınızı değiştiremezsiniz." }, { status: 400 });
        }

        const data: Record<string, unknown> = {};

        if (role !== undefined) {
            const validRoles = ["USER", "ARSA_SAHIBI", "MUTEAHHIT", "DANISMAN", "ADMIN"];
            if (!validRoles.includes(role)) {
                return NextResponse.json({ message: "Geçersiz rol." }, { status: 400 });
            }
            data.role = role;
        }
        if (isVerified !== undefined) data.isVerified = isVerified;
        if (plan !== undefined) {
            if (!["FREE", "PRO"].includes(plan)) {
                return NextResponse.json({ message: "Geçersiz plan." }, { status: 400 });
            }
            data.plan = plan;
        }

        if (Object.keys(data).length === 0) {
            return NextResponse.json({ message: "Güncellenecek alan yok." }, { status: 400 });
        }

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data,
        });

        return NextResponse.json({ message: "Güncellendi.", user: updatedUser });
    } catch (error) {
        console.error("Admin user update error:", error);
        return NextResponse.json({ message: "Hata oluştu." }, { status: 500 });
    }
}
