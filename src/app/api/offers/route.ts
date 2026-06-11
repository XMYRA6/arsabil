import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";
import { sendEmail, buildOfferEmail, getEmailPrefs } from "@/lib/email";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";

export async function POST(req: Request) {
    try {
        const session = await getServerSession();
        if (!session || !session.user) {
            return NextResponse.json({ message: "Yetkisiz erişim." }, { status: 403 });
        }

        const rl = checkRateLimit(`write:${session.user.id}`, RATE_LIMITS.WRITE);
        if (!rl.ok) {
            return NextResponse.json(
                { message: "Çok hızlı işlem yapıyorsunuz. Lütfen biraz bekleyin." },
                { status: 429, headers: { "Retry-After": String(rl.retryAfterSec ?? 60) } }
            );
        }

        const { listingId, offeredShare, message } = await req.json();

        if (!listingId || offeredShare === undefined) {
            return NextResponse.json({ message: "Eksik bilgi." }, { status: 400 });
        }

        const listing = await prisma.listing.findUnique({
            where: { id: listingId },
            include: { user: { select: { id: true, email: true } } }
        });

        if (!listing || !listing.isActive) {
            return NextResponse.json({ message: "İlan bulunamadı veya kapalı." }, { status: 404 });
        }

        if (listing.userId === session.user.id) {
            return NextResponse.json({ message: "Kendi ilanınıza teklif veremezsiniz." }, { status: 400 });
        }

        // Check if user already offered on this listing
        const existingOffer = await prisma.offer.findFirst({
            where: { listingId, bidderId: session.user.id }
        });

        if (existingOffer) {
            return NextResponse.json({ message: "Bu ilana zaten bir teklifiniz var." }, { status: 400 });
        }

        const offer = await prisma.offer.create({
            data: {
                listingId,
                bidderId: session.user.id,
                offeredShare: Number(offeredShare),
                message,
                status: "PENDING"
            }
        });

        // İlan sahibine bildirim oluştur (hata olursa sessizce geç)
        createNotification({
            userId: listing.userId,
            type: 'TEKLIF_GELDI',
            title: 'Yeni teklif',
            body: `${session.user.name || 'Biri'} ilanınıza %${Number(offeredShare).toFixed(0)} pay teklifi verdi`,
            entityId: listingId,
        }).catch(() => {})

        // Email trigger
        const listingOwnerEmail = listing.user?.email ?? null
        if (listingOwnerEmail) {
            getEmailPrefs(listing.userId).then(prefs => {
                if (!prefs.teklif) return
                return sendEmail({
                    to: listingOwnerEmail,
                    subject: 'Yeni Teklif Geldi — ArsaBil',
                    html: buildOfferEmail(listing.title ?? 'İlanınız', Number(offeredShare)),
                })
            }).catch(() => {})
        }

        return NextResponse.json({ message: "Teklif başarıyla gönderildi.", offer }, { status: 201 });
    } catch (error) {
        console.error("Offer create error:", error);
        return NextResponse.json({ message: "Teklif gönderilirken hata oluştu." }, { status: 500 });
    }
}
