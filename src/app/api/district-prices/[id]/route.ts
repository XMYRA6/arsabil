import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ message: "Yetkisiz erişim." }, { status: 403 });
    }
    const { id } = await context.params;
    const body = await request.json();
    const data: Record<string, string | number> = {};
    if (body.il !== undefined) data.il = String(body.il);
    if (body.ilce !== undefined) data.ilce = String(body.ilce);
    if (body.avgSalesPricePerM2 !== undefined)
      data.avgSalesPricePerM2 = Number(body.avgSalesPricePerM2);
    if (body.avgUnitConstructionPrice !== undefined)
      data.avgUnitConstructionPrice = Number(body.avgUnitConstructionPrice);
    const price = await prisma.districtPrice.update({ where: { id }, data });
    return NextResponse.json(price);
  } catch (error: unknown) {
    if ((error as { code?: string }).code === "P2025") {
      return NextResponse.json({ message: "Kayıt bulunamadı." }, { status: 404 });
    }
    console.error(error);
    return NextResponse.json(
      { message: "Güncelleme başarısız." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ message: "Yetkisiz erişim." }, { status: 403 });
    }
    const { id } = await context.params;
    await prisma.districtPrice.delete({ where: { id } });
    return NextResponse.json({ message: "Silindi." });
  } catch (error: unknown) {
    if ((error as { code?: string }).code === "P2025") {
      return NextResponse.json({ message: "Kayıt bulunamadı." }, { status: 404 });
    }
    console.error(error);
    return NextResponse.json({ message: "Silme başarısız." }, { status: 500 });
  }
}
