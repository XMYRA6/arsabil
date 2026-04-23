import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
    try {
        const { name, email, password, role } = await req.json();

        if (!name || !email || !password) {
            return NextResponse.json({ message: "Tüm alanlar zorunludur." }, { status: 400 });
        }

        const existingUser = await prisma.user.findUnique({
            where: { email }
        });

        if (existingUser) {
            return NextResponse.json({ message: "Bu e-posta adresi ile zaten kayıt olunmuş." }, { status: 400 });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = await prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                role: role || "USER"
            } as any
        });

        return NextResponse.json({ message: "Kayıt başarılı", user: newUser }, { status: 201 });
    } catch (error) {
        console.error("Kayıt hatası:", error);
        return NextResponse.json({ message: "Kayıt sırasında bir hata oluştu." }, { status: 500 });
    }
}
