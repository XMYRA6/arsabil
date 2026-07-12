import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { sendEmail, buildPasswordResetEmail } from "@/lib/email";
import { checkRateLimit, getClientIp, RATE_LIMITS } from "@/lib/rate-limit";

export async function POST(req: Request) {
    const rl = checkRateLimit(`forgot-password:${getClientIp(req)}`, RATE_LIMITS.PASSWORD_RESET);
    if (!rl.ok) {
        return NextResponse.json(
            { message: "Çok fazla deneme. Lütfen daha sonra tekrar deneyin." },
            { status: 429, headers: { "Retry-After": String(rl.retryAfterSec ?? 60) } }
        );
    }

    const GENERIC_SUCCESS = { message: "Bu e-posta adresine kayıtlı bir hesap varsa, şifre sıfırlama talimatları e-posta adresinize gönderildi." };

    try {
        const { email } = await req.json();
        if (!email) {
            return NextResponse.json({ message: "E-posta adresi gereklidir." }, { status: 400 });
        }

        const user = await prisma.user.findUnique({ where: { email } });
        // Kullanıcı bulunamsa bile GENEL mesajla 200 dön — aksi halde bu endpoint
        // hangi e-postaların kayıtlı olduğunu dışarıya sızdıran bir enumeration
        // aracına dönüşür (register'daki "zaten kayıtlı" mesajından farklı olarak
        // burada anonimlik daha kritik: saldırgan başka bir kullanıcının hesabını
        // hedeflediğini gizlemeye çalışıyor olabilir).
        if (!user || !user.email) {
            return NextResponse.json(GENERIC_SUCCESS);
        }

        const token = crypto.randomBytes(32).toString("hex");
        const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 saat

        await prisma.verificationToken.create({
            data: {
                identifier: `password-reset:${user.email}`,
                token,
                expires,
            },
        });

        const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
        const resetUrl = `${baseUrl}/reset-password/${token}`;

        await sendEmail({
            to: user.email,
            subject: "ArsaBil — Şifre Sıfırlama Talebi",
            html: buildPasswordResetEmail(resetUrl),
        });

        return NextResponse.json(GENERIC_SUCCESS);
    } catch (error) {
        console.error("Forgot-password error:", error);
        return NextResponse.json({ message: "Hata oluştu." }, { status: 500 });
    }
}
