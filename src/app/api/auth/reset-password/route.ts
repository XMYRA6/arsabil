import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getClientIp, RATE_LIMITS } from "@/lib/rate-limit";

export async function POST(req: Request) {
    const rl = checkRateLimit(`reset-password:${getClientIp(req)}`, RATE_LIMITS.PASSWORD_RESET);
    if (!rl.ok) {
        return NextResponse.json(
            { message: "Çok fazla deneme. Lütfen daha sonra tekrar deneyin." },
            { status: 429, headers: { "Retry-After": String(rl.retryAfterSec ?? 60) } }
        );
    }

    try {
        const { token, password } = await req.json();
        if (!token || !password) {
            return NextResponse.json({ message: "Token ve şifre gereklidir." }, { status: 400 });
        }
        if (password.length < 8) {
            return NextResponse.json({ message: "Şifre en az 8 karakter olmalıdır." }, { status: 400 });
        }

        const record = await prisma.verificationToken.findUnique({ where: { token } });
        if (!record || !record.identifier.startsWith("password-reset:")) {
            return NextResponse.json({ message: "Geçersiz veya süresi dolmuş bağlantı." }, { status: 400 });
        }

        if (record.expires < new Date()) {
            await prisma.verificationToken.delete({ where: { token } });
            return NextResponse.json({ message: "Bu bağlantının süresi dolmuş. Lütfen yeni bir sıfırlama isteği oluşturun." }, { status: 400 });
        }

        const email = record.identifier.slice("password-reset:".length);
        const hashedPassword = await bcrypt.hash(password, 10);

        await prisma.user.update({
            where: { email },
            data: { password: hashedPassword },
        });

        // Tek kullanımlık — başarılı sıfırlamadan sonra token geçersiz kılınır.
        await prisma.verificationToken.delete({ where: { token } });

        return NextResponse.json({ message: "Şifreniz güncellendi. Şimdi yeni şifrenizle giriş yapabilirsiniz." });
    } catch (error) {
        console.error("Reset-password error:", error);
        return NextResponse.json({ message: "Hata oluştu." }, { status: 500 });
    }
}
