import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { prisma } from "@/lib/prisma";

// PATCH — Kullanıcı profilini güncelle
export async function PATCH(req: Request) {
    try {
        const session = await getServerSession();
        if (!session || !session.user) {
            return NextResponse.json({ message: "Yetkisiz." }, { status: 403 });
        }

        const { name } = await req.json();

        if (!name || name.trim().length === 0) {
            return NextResponse.json({ message: "Ad alanı zorunludur." }, { status: 400 });
        }

        const updatedUser = await prisma.user.update({
            where: { id: session.user.id },
            data: { name: name.trim() },
        });

        return NextResponse.json({ message: "Profil güncellendi.", user: { name: updatedUser.name } });
    } catch (error) {
        console.error("Profile update error:", error);
        return NextResponse.json({ message: "Profil güncellenirken hata oluştu." }, { status: 500 });
    }
}
