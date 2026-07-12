import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import bcrypt from "bcryptjs";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ message: "Yetkisiz." }, { status: 401 });
    }

    try {
        const { password } = await req.json();
        if (!password) {
            return NextResponse.json({ message: "Şifrenizi girmelisiniz." }, { status: 400 });
        }

        const userId = session.user.id as string;
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user || !user.password) {
            return NextResponse.json({ message: "Bu hesap için şifre doğrulaması yapılamıyor." }, { status: 400 });
        }

        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
            return NextResponse.json({ message: "Şifre yanlış." }, { status: 403 });
        }

        // Silme sırası şemadaki onDelete ilişkilerine göre ZORUNLU:
        // Message.sender/receiver ve Report.user'da onDelete tanımlı değil (Restrict) —
        // User silinmeden ÖNCE bunlar manuel silinmeli. Report silinince ona bağlı
        // Listing otomatik cascade olur (Listing.report: onDelete Cascade). Geri kalan
        // her şey (Account/Session/Notification/CompareShare/Listing/Favorite/Offer/
        // Project->Scenario) User.delete() ile otomatik cascade olur.
        await prisma.message.deleteMany({
            where: { OR: [{ senderId: userId }, { receiverId: userId }] },
        });
        await prisma.report.deleteMany({ where: { userId } });
        await prisma.user.delete({ where: { id: userId } });

        return NextResponse.json({ message: "Hesabınız silindi." });
    } catch (error) {
        console.error("Account delete error:", error);
        return NextResponse.json({ message: "Hata oluştu." }, { status: 500 });
    }
}
