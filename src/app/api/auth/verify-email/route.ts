import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
    try {
        const { token } = await req.json();
        if (!token) {
            return NextResponse.json({ message: "Token gereklidir." }, { status: 400 });
        }

        const record = await prisma.verificationToken.findUnique({ where: { token } });
        if (!record || !record.identifier.startsWith("email-verify:")) {
            return NextResponse.json({ message: "Geçersiz veya süresi dolmuş bağlantı." }, { status: 400 });
        }

        if (record.expires < new Date()) {
            await prisma.verificationToken.delete({ where: { token } });
            return NextResponse.json({ message: "Bu bağlantının süresi dolmuş." }, { status: 400 });
        }

        const email = record.identifier.slice("email-verify:".length);

        await prisma.user.update({
            where: { email },
            data: { emailVerified: new Date() },
        });

        await prisma.verificationToken.delete({ where: { token } });

        return NextResponse.json({ message: "E-postanız doğrulandı." });
    } catch (error) {
        console.error("Verify-email error:", error);
        return NextResponse.json({ message: "Hata oluştu." }, { status: 500 });
    }
}
