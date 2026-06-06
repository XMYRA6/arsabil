import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const il = request.nextUrl.searchParams.get("il");
    const where = il ? { il } : {};
    const prices = await prisma.districtPrice.findMany({
      where,
      orderBy: [{ il: "asc" }, { ilce: "asc" }],
    });
    return NextResponse.json(prices);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: "İlçe fiyatları getirilemedi." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ message: "Yetkisiz erişim." }, { status: 403 });
    }
    const { il, ilce, avgSalesPricePerM2, avgUnitConstructionPrice } =
      await request.json();
    if (
      !il ||
      !ilce ||
      avgSalesPricePerM2 === undefined ||
      avgUnitConstructionPrice === undefined
    ) {
      return NextResponse.json(
        {
          message:
            "il, ilce, avgSalesPricePerM2, avgUnitConstructionPrice zorunludur.",
        },
        { status: 400 }
      );
    }
    const price = await prisma.districtPrice.create({
      data: {
        il: String(il),
        ilce: String(ilce),
        avgSalesPricePerM2: Number(avgSalesPricePerM2),
        avgUnitConstructionPrice: Number(avgUnitConstructionPrice),
      },
    });
    return NextResponse.json(price, { status: 201 });
  } catch (error: unknown) {
    if ((error as { code?: string }).code === "P2002") {
      return NextResponse.json(
        { message: "Bu il/ilçe kombinasyonu zaten mevcut." },
        { status: 409 }
      );
    }
    console.error(error);
    return NextResponse.json(
      { message: "Kayıt eklenirken hata oluştu." },
      { status: 500 }
    );
  }
}
