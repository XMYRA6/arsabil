import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ message: "Yetkisiz erişim." }, { status: 403 });
        }

        const { status } = await req.json(); // "ACCEPTED" veya "REJECTED" bekleniyor

        if (!["ACCEPTED", "REJECTED"].includes(status)) {
            return NextResponse.json({ message: "Geçersiz durum (status)." }, { status: 400 });
        }

        const offer = await prisma.offer.findUnique({
            where: { id },
            include: { listing: true }
        });

        if (!offer) {
            return NextResponse.json({ message: "Teklif bulunamadı." }, { status: 404 });
        }

        // Sadece ilanın sahibi teklife cevap verebilir
        if (offer.listing.userId !== session.user.id) {
            return NextResponse.json({ message: "Bu işlem için yetkiniz yok." }, { status: 403 });
        }

        // Eğer mevcut durum zaten değiştirildiyse
        if (offer.status !== "PENDING") {
            return NextResponse.json({ message: "Bu teklif zaten yanıtlanmış." }, { status: 400 });
        }

        // Teklifi güncelle
        const updatedOffer = await prisma.offer.update({
            where: { id },
            data: { status }
        });

        // Eğer teklif kabul edildiyse, ilanı kapat ve diğer teklifleri reddet
        if (status === "ACCEPTED") {
            await prisma.listing.update({
                where: { id: offer.listingId },
                data: { isActive: false }
            });

            await prisma.offer.updateMany({
                where: {
                    listingId: offer.listingId,
                    id: { not: offer.id },
                    status: "PENDING"
                },
                data: { status: "REJECTED" }
            });

            // Otomatik DM başlat (Opsiyonel / Double Opt-in için)
            // İlan sahibi -> Teklif veren
            await prisma.message.create({
                data: {
                    senderId: offer.listing.userId,
                    receiverId: offer.bidderId,
                    content: `Merhaba, #${offer.listingId.slice(-4)} numaralı ilanıma yaptığınız teklifi ONAYLADIM. Kalan süreci buradan görüşebiliriz.`,
                    reportId: offer.listing.reportId
                }
            });
        }

        return NextResponse.json({ message: `Teklif başarıyla ${status === "ACCEPTED" ? "Kabul Edildi" : "Reddedildi"}.`, offer: updatedOffer });
    } catch (error) {
        console.error("Offer update error:", error);
        return NextResponse.json({ message: "Teklif güncellenirken hata oluştu." }, { status: 500 });
    }
}
