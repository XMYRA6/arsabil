import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// PATCH — Arsa Dosyası'nı temizle (Akif-3). Tek desteklenen aksiyon: clear_memory.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ message: "Yetkisiz." }, { status: 403 });
        }

        const body = await req.json();
        if (body?.action !== 'clear_memory') {
            return NextResponse.json({ message: "Geçersiz aksiyon." }, { status: 400 });
        }

        const { id } = await params;
        const result = await prisma.project.updateMany({
            where: { id, userId: session.user.id },
            data: { akifMemory: null },
        });
        if (result.count === 0) {
            return NextResponse.json({ message: "Proje bulunamadı." }, { status: 404 });
        }

        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error("Project memory clear error:", error);
        return NextResponse.json({ message: "Hata oluştu." }, { status: 500 });
    }
}
