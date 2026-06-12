import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

// GET — Tüm risk seviyelerini getir (herkese açık)
export async function GET() {
    try {
        const levels = await prisma.riskLevel.findMany({
            orderBy: { sortOrder: "asc" },
        });

        // Eğer hiç kayıt yoksa varsayılanları oluştur ve döndür
        if (levels.length === 0) {
            const defaultLevels = [
                { label: "Risksiz", value: 0, sortOrder: 0, isDefault: true },
                { label: "Düşük", value: 5, sortOrder: 1, isDefault: false },
                { label: "Orta", value: 10, sortOrder: 2, isDefault: false },
                { label: "Yüksek", value: 15, sortOrder: 3, isDefault: false },
            ];

            const createdLevels = await prisma.$transaction(
                defaultLevels.map(l => prisma.riskLevel.create({ data: l }))
            );
            return NextResponse.json(createdLevels);
        }

        return NextResponse.json(levels);
    } catch (error) {
        console.error("Risk seviyeleri getirilemedi:", error);
        return NextResponse.json({ message: "Risk seviyeleri getirilemedi." }, { status: 500 });
    }
}

// POST — Yeni risk seviyesi ekle (sadece ADMIN)
export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== "ADMIN") {
            return NextResponse.json({ message: "Yetkisiz erişim." }, { status: 403 });
        }

        const { label, value, sortOrder, isDefault } = await req.json();

        if (!label || value === undefined) {
            return NextResponse.json({ message: "Label ve value zorunludur." }, { status: 400 });
        }

        // Eğer yeni kayıt varsayılan olacaksa, diğerlerinin varsayılanlığını kaldır
        if (isDefault) {
            await prisma.riskLevel.updateMany({
                where: { isDefault: true },
                data: { isDefault: false },
            });
        }

        const maxOrder = await prisma.riskLevel.aggregate({ _max: { sortOrder: true } });
        const newOrder = sortOrder !== undefined ? sortOrder : (maxOrder._max.sortOrder ?? -1) + 1;

        const level = await prisma.riskLevel.create({
            data: {
                label,
                value: Number(value),
                sortOrder: newOrder,
                isDefault: isDefault || false,
            },
        });

        return NextResponse.json(level, { status: 201 });
    } catch (error: unknown) {
        console.error("Risk seviyesi eklenirken hata:", error);
        return NextResponse.json({ message: "Risk seviyesi eklenirken hata oluştu.", error: error instanceof Error ? error.message : String(error) }, { status: 500 });
    }
}

// PUT — Mevcut risk seviyelerini toplu güncelle (sadece ADMIN)
export async function PUT(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== "ADMIN") {
            return NextResponse.json({ message: "Yetkisiz erişim." }, { status: 403 });
        }

        const { levels } = await req.json();

        if (!Array.isArray(levels) || levels.length === 0) {
            return NextResponse.json({ message: "En az bir seviye gerekli." }, { status: 400 });
        }

        // Transaction ile toplu güncelle
        const results = await prisma.$transaction(
            levels.map((level: { id: string; label: string; value: number; sortOrder: number; isDefault: boolean }) =>
                prisma.riskLevel.update({
                    where: { id: level.id },
                    data: {
                        label: level.label,
                        value: Number(level.value),
                        sortOrder: level.sortOrder,
                        isDefault: level.isDefault,
                    },
                })
            )
        );

        return NextResponse.json({ message: "Risk seviyeleri güncellendi.", levels: results });
    } catch (error: unknown) {
        console.error("Risk seviyeleri güncellenirken hata:", error);
        return NextResponse.json({ message: "Risk seviyeleri güncellenirken hata oluştu.", error: error instanceof Error ? error.message : String(error) }, { status: 500 });
    }
}

// DELETE — Risk seviyesi sil (sadece ADMIN)
export async function DELETE(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== "ADMIN") {
            return NextResponse.json({ message: "Yetkisiz erişim." }, { status: 403 });
        }

        const { id } = await req.json();

        if (!id) {
            return NextResponse.json({ message: "ID zorunludur." }, { status: 400 });
        }

        // En az 1 kayıt kalmalı
        const count = await prisma.riskLevel.count();
        if (count <= 1) {
            return NextResponse.json({ message: "En az bir risk seviyesi kalmalıdır." }, { status: 400 });
        }

        await prisma.riskLevel.delete({ where: { id } });

        return NextResponse.json({ message: "Risk seviyesi silindi." });
    } catch (error: unknown) {
        console.error("Risk seviyesi silinirken hata:", error);
        return NextResponse.json({ message: "Risk seviyesi silinirken hata oluştu.", error: error instanceof Error ? error.message : String(error) }, { status: 500 });
    }
}
