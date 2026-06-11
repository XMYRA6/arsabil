import { PrismaAdapter } from "@auth/prisma-adapter";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { NextAuthOptions } from "next-auth";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";

export const authOptions: NextAuthOptions = {
    adapter: PrismaAdapter(prisma) as any,
    session: {
        strategy: "jwt",
    },
    providers: [
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                email: { label: "E-Posta", type: "email", placeholder: "ornek@mail.com" },
                password: { label: "Şifre", type: "password" }
            },
            async authorize(credentials, req) {
                const headers = (req?.headers ?? {}) as Record<string, string | undefined>;
                const ip = headers["x-forwarded-for"]?.split(",")[0]?.trim()
                    || headers["x-real-ip"]
                    || "unknown";
                const rl = checkRateLimit(`login:${ip}`, RATE_LIMITS.LOGIN);
                if (!rl.ok) {
                    throw new Error("Çok fazla giriş denemesi. Lütfen 1 dakika sonra tekrar deneyin.");
                }
                if (!credentials?.email || !credentials?.password) {
                    throw new Error("Lütfen tüm alanları doldurun.");
                }

                const user = await prisma.user.findUnique({
                    where: { email: credentials.email }
                });

                if (!user || !user.password) {
                    throw new Error("Kullanıcı bulunamadı veya şifre yanlış.");
                }

                const isPasswordValid = await bcrypt.compare(credentials.password, user.password);

                if (!isPasswordValid) {
                    throw new Error("Şifre yanlış.");
                }

                return {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    role: user.role,
                } as any;
            }
        })
    ],
    callbacks: {
        async session({ session, token }) {
            if (token && session.user) {
                (session.user as any).id = token.id as string;
                (session.user as any).role = token.role as string;
            }
            return session;
        },
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id;
                token.role = (user as any).role;
            }
            return token;
        }
    },
    pages: {
        signIn: "/login",
    },
    debug: process.env.NODE_ENV === "development",
};
