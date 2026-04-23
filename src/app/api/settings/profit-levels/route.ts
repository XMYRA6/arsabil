import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

// GET — Tüm kâr katsayılarını getir (herkese açık)
export async function GET() {
    try {
        const levels = await prisma.profitLevel.findMany({
            orderBy: { sortOrder: "asc" },
        });

        // Eğer hiç kayıt yoksa varsayılanları oluştur ve döndür
        if (levels.length === 0) {
            const defaultLevels = [
                { label: "Düşük", value: 1.15, sortOrder: 0, isDefault: false },
                { label: "Orta", value: 1.30, sortOrder: 1, isDefault: true },
                { label: "Yüksek", value: 1.50, sortOrder: 2, isDefault: false },
            ];

            const createdLevels = await prisma.$transaction(
                defaultLevels.map(l => prisma.profitLevel.create({ data: l }))
            );
            return NextResponse.json(createdLevels);
        }

        return NextResponse.json(levels);
    } catch (error) {
        console.error("Kâr katsayıları getirilemedi:", error);
        return NextResponse.json({ message: "Katsayılar getirilemedi." }, { status: 500 });
    }
}

// POST — Yeni kâr katsayısı ekle (sadece ADMIN)
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
            await prisma.profitLevel.updateMany({
                where: { isDefault: true },
                data: { isDefault: false },
            });
        }

        const maxOrder = await prisma.profitLevel.aggregate({ _max: { sortOrder: true } });
        const newOrder = sortOrder !== undefined ? sortOrder : (maxOrder._max.sortOrder ?? -1) + 1;

        const level = await prisma.profitLevel.create({
            data: {
                label,
                value: Number(value),
                sortOrder: newOrder,
                isDefault: isDefault || false,
            },
        });

        return NextResponse.json(level, { status: 201 });
    } catch (error) {
        console.error("Katsayı eklenirken hata:", error);
        return NextResponse.json({ message: "Katsayı eklenirken hata oluştu." }, { status: 500 });
    }
}

// PUT — Mevcut kâr katsayılarını toplu güncelle (sadece ADMIN)
export async function PUT(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== "ADMIN") {
            return NextResponse.json({ message: "Yetkisiz erişim." }, { status: 403 });
        }

        const { levels } = await req.json();

        if (!Array.isArray(levels) || levels.length === 0) {
            return NextResponse.json({ message: "En az bir katsayı gerekli." }, { status: 400 });
        }

        // Transaction ile toplu güncelle
        const results = await prisma.$transaction(
            levels.map((level: { id: string; label: string; value: number; sortOrder: number; isDefault: boolean }) =>
                prisma.profitLevel.update({
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

        return NextResponse.json({ message: "Katsayılar güncellendi.", levels: results });
    } catch (error) {
        console.error("Katsayılar güncellenirken hata:", error);
        return NextResponse.json({ message: "Katsayılar güncellenirken hata oluştu." }, { status: 500 });
    }
}

// DELETE — Kâr katsayısı sil (sadece ADMIN)
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
        const count = await prisma.profitLevel.count();
        if (count <= 1) {
            return NextResponse.json({ message: "En az bir kâr katsayısı kalmalıdır." }, { status: 400 });
        }

        await prisma.profitLevel.delete({ where: { id } });

        return NextResponse.json({ message: "Katsayı silindi." });
    } catch (error) {
        console.error("Katsayı silinirken hata:", error);
        return NextResponse.json({ message: "Katsayı silinirken hata oluştu." }, { status: 500 });
    }
}
