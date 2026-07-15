# Güvenlik/Hesap Akışları + SEO Temelleri Implementasyon Planı

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Şifre sıfırlama, e-posta doğrulama, hesap silme/veri indirme, CSP enforce modu, API yetkilendirme test suite'i ve temel SEO dosyalarını (robots.txt/sitemap.xml) ekleyerek ArsaBil'i canlıya almadan önceki güvenlik/hesap-yönetimi boşluklarını kapatmak.

**Architecture:** Mevcut `VerificationToken` modeli (NextAuth Adapter'dan miras, şu ana kadar hiç kullanılmıyordu) hem şifre sıfırlama hem e-posta doğrulama için `identifier` alanına önek ekleyerek (`password-reset:<email>` / `email-verify:<email>`) yeniden kullanılır — şema migration'ı gerekmez. E-posta gönderimi mevcut `src/lib/email.ts`'deki `sendEmail()`/`buildXEmail()` deseni izlenerek yapılır. Hesap silme, `prisma/schema.prisma`'daki `onDelete` ilişkileri baz alınarak tasarlandı (bkz. Global Constraints — hangi modellerin cascade olduğu, hangilerinin manuel silinmesi gerektiği orada listelidir).

**Tech Stack:** Next.js 16 (App Router), NextAuth v4 (credentials + JWT strategy), Prisma 5.22, PostgreSQL, Resend (e-posta), bcryptjs, Jest + ts-jest.

## Global Constraints

- Her yeni API route zorunlu alanları kontrol eder, hata mesajları Türkçe ve mevcut route'lardaki ton ile tutarlıdır (`"Yetkisiz."`, `"Hata oluştu."` gibi).
- Yeni auth-ilişkili route'lar (forgot-password, reset-password) `src/lib/rate-limit.ts`'deki `checkRateLimit`/`getClientIp` deseniyle IP başına sınırlanır — register/login'deki mevcut desenin birebir aynısı.
- Şifre sıfırlama/doğrulama linkleri **`process.env.NEXTAUTH_URL`** kullanılarak üretilir, `src/lib/email.ts`'deki mevcut bildirim şablonlarındaki gibi sabit `https://arsabil.com` YAZILMAZ — çünkü bu linkler tıklanabilir olmalı ve hangi ortamdan (dev/prod) gönderildiyse o ortama işaret etmesi gerekir (statik bildirim linklerinin aksine, kırık bir reset linki özelliği tamamen işlevsiz kılar).
- Hesap silme/şifre sıfırlama gibi geri alınamaz işlemler öncesi kullanıcının mevcut şifresini tekrar girmesi istenir (re-authentication) — tarayıcı sekmesi açık unutulmuş bir oturumun tek başına yeterli yetki sayılmaması için.
- E-posta doğrulaması **login'i bloke ETMEZ** — yalnızca bilgilendirici bir rozet/banner'dır. `src/lib/auth.ts`'deki `authorize()` fonksiyonuna `emailVerified` kontrolü EKLENMEZ (bunu eklemek `e2e/global-setup.ts`'nin seed ettiği tüm kullanıcıları — `emailVerified` hiç set edilmiyor — giriş yapamaz hale getirir ve önceki fazlardaki tüm e2e testlerini kırar).
- Prisma silme sıraları `prisma/schema.prisma`'daki gerçek `onDelete` değerlerine göre belirlendi: `Account`/`Session`/`Notification`/`CompareShare`/`Listing`/`Favorite`/`Offer`/`Project`→`Scenario` ilişkileri `onDelete: Cascade` — `User` silindiğinde OTOMATİK silinirler. `Report.user` VE `Message.sender`/`Message.receiver` ilişkilerinde `onDelete` TANIMLI DEĞİL (varsayılan Restrict) — bu ikisi `User` silinmeden ÖNCE manuel silinmelidir, aksi halde foreign key hatası alınır.
- Yeni sayfalar mevcut CSS Module deseni kullanır (`page.module.css`), yeni inline stil eklenmez.
- Her yeni route için en az bir Jest testi yazılır; `next-auth/next`'in `getServerSession`'ı `src/app/api/health/__tests__/route.test.ts`'teki `@/lib/prisma` mock desenine paralel şekilde mock'lanır.

---

## Task 1: Rate Limit — Şifre Sıfırlama Anahtarı

**Files:**
- Modify: `src/lib/rate-limit.ts`

**Interfaces:**
- Consumes: yok.
- Produces: `RATE_LIMITS.PASSWORD_RESET: { limit: number; windowMs: number }` — Task 2 ve Task 4 bunu tüketir.

- [ ] **Step 1: `RATE_LIMITS` sabitine yeni anahtar ekle**

`src/lib/rate-limit.ts` içinde mevcut:
```ts
export const RATE_LIMITS = {
    LOGIN:    { limit: 5,  windowMs: 60_000 },     // IP başına 5/dk
    REGISTER: { limit: 3,  windowMs: 3_600_000 },  // IP başına 3/saat
    UPLOAD:   { limit: 10, windowMs: 3_600_000 },  // kullanıcı başına 10/saat
    WRITE:    { limit: 30, windowMs: 60_000 },     // kullanıcı başına 30/dk (mesaj+teklif)
} as const
```
Şuna genişlet (`WRITE`'ın altına ekle):
```ts
export const RATE_LIMITS = {
    LOGIN:    { limit: 5,  windowMs: 60_000 },     // IP başına 5/dk
    REGISTER: { limit: 3,  windowMs: 3_600_000 },  // IP başına 3/saat
    UPLOAD:   { limit: 10, windowMs: 3_600_000 },  // kullanıcı başına 10/saat
    WRITE:    { limit: 30, windowMs: 60_000 },     // kullanıcı başına 30/dk (mesaj+teklif)
    PASSWORD_RESET: { limit: 3, windowMs: 3_600_000 }, // IP başına 3/saat (REGISTER ile aynı eşik)
} as const
```

- [ ] **Step 2: Doğrula**

```bash
npx tsc --noEmit
```
Beklenen: 0 hata.

- [ ] **Step 3: Commit**

```bash
git add src/lib/rate-limit.ts
git commit -m "feat(rate-limit): PASSWORD_RESET anahtarı eklendi

Şifre sıfırlama isteği/tamamlama endpoint'leri için IP başına 3/saat
sınırı — REGISTER ile aynı eşik, aynı gerekçe (kaba kuvvet/kullanıcı
enumeration önleme)."
```

---

## Task 2: Şifre Sıfırlama İsteği Endpoint'i

**Files:**
- Create: `src/app/api/auth/forgot-password/route.ts`
- Create: `src/app/api/auth/forgot-password/__tests__/route.test.ts`
- Modify: `src/lib/email.ts`

**Interfaces:**
- Consumes: `RATE_LIMITS.PASSWORD_RESET` (Task 1), `checkRateLimit`/`getClientIp` (`@/lib/rate-limit`), `sendEmail` (`@/lib/email`, mevcut).
- Produces: `buildPasswordResetEmail(resetUrl: string): string` (`@/lib/email`) — Task 4'ün testleri bu fonksiyonun var olduğunu varsaymaz (yalnızca bu task tüketir), ama isim burada sabitleniyor.

- [ ] **Step 1: `src/lib/email.ts`'e şifre sıfırlama şablonunu ekle**

Dosyanın SONUNA ekle:
```ts
export function buildPasswordResetEmail(resetUrl: string): string {
    return `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
        <h2 style="color:#1f6feb">Şifre Sıfırlama Talebi</h2>
        <p>Hesabınız için bir şifre sıfırlama talebi aldık. Aşağıdaki bağlantıya tıklayarak yeni bir şifre belirleyebilirsiniz.</p>
        <a href="${resetUrl}" style="display:inline-block;margin-top:16px;padding:10px 20px;background:#1f6feb;color:white;text-decoration:none;border-radius:8px;font-weight:700">Şifremi Sıfırla →</a>
        <p style="margin-top:24px;font-size:0.8rem;color:#6b7280">Bu talebi siz oluşturmadıysanız bu e-postayı yok sayabilirsiniz — hesabınızda hiçbir değişiklik yapılmayacaktır. Bağlantı 1 saat sonra geçersiz olur.</p>
    </div>`
}
```

- [ ] **Step 2: Testi yaz (RED)**

`src/app/api/auth/forgot-password/__tests__/route.test.ts`:
```ts
const findUniqueMock = jest.fn()
const createTokenMock = jest.fn()
const sendEmailMock = jest.fn()

jest.mock('@/lib/prisma', () => ({
    prisma: {
        user: { findUnique: (...args: unknown[]) => findUniqueMock(...args) },
        verificationToken: { create: (...args: unknown[]) => createTokenMock(...args) },
    },
}))
jest.mock('@/lib/email', () => ({
    sendEmail: (...args: unknown[]) => sendEmailMock(...args),
    buildPasswordResetEmail: (url: string) => `<a href="${url}">reset</a>`,
}))
jest.mock('@/lib/rate-limit', () => ({
    checkRateLimit: () => ({ ok: true }),
    getClientIp: () => '127.0.0.1',
    RATE_LIMITS: { PASSWORD_RESET: { limit: 3, windowMs: 3_600_000 } },
}))

import { POST } from '../route'

function req(body: unknown) {
    return new Request('http://localhost/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify(body),
    })
}

describe('POST /api/auth/forgot-password', () => {
    beforeEach(() => {
        findUniqueMock.mockReset()
        createTokenMock.mockReset()
        sendEmailMock.mockReset()
    })

    it('email eksikse 400 döner', async () => {
        const res = await POST(req({}))
        expect(res.status).toBe(400)
    })

    it('kullanıcı bulunmasa bile 200 ve genel mesaj döner (kullanıcı enumeration önleme), e-posta gönderilmez', async () => {
        findUniqueMock.mockResolvedValue(null)
        const res = await POST(req({ email: 'yok@test.com' }))
        const body = await res.json()
        expect(res.status).toBe(200)
        expect(body.message).toMatch(/e-posta adresinize gönderildi/i)
        expect(sendEmailMock).not.toHaveBeenCalled()
    })

    it('kullanıcı bulunursa token üretilir ve e-posta gönderilir', async () => {
        findUniqueMock.mockResolvedValue({ id: 'u1', email: 'var@test.com' })
        createTokenMock.mockResolvedValue({})
        const res = await POST(req({ email: 'var@test.com' }))
        const body = await res.json()
        expect(res.status).toBe(200)
        expect(body.message).toMatch(/e-posta adresinize gönderildi/i)
        expect(createTokenMock).toHaveBeenCalledTimes(1)
        const createArgs = createTokenMock.mock.calls[0][0]
        expect(createArgs.data.identifier).toBe('password-reset:var@test.com')
        expect(sendEmailMock).toHaveBeenCalledTimes(1)
        expect(sendEmailMock.mock.calls[0][0].to).toBe('var@test.com')
    })
})
```

- [ ] **Step 3: Testi çalıştır, RED olduğunu doğrula**

```bash
npx jest forgot-password --no-coverage
```
Beklenen: FAIL — `../route` modülü bulunamıyor.

- [ ] **Step 4: `src/app/api/auth/forgot-password/route.ts`'i yaz**

```ts
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
        // Kullanıcı bulunamasa bile GENEL mesajla 200 dön — aksi halde bu endpoint
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
```

- [ ] **Step 5: Testi tekrar çalıştır — GREEN**

```bash
npx jest forgot-password --no-coverage
npx tsc --noEmit
```
Beklenen: 3/3 PASS, tsc 0 hata.

- [ ] **Step 6: Commit**

```bash
git add src/lib/email.ts src/app/api/auth/forgot-password/
git commit -m "feat(auth): şifre sıfırlama isteği endpoint'i (POST /api/auth/forgot-password)

VerificationToken modeli identifier:password-reset:<email> öneki ile
yeniden kullanılıyor (şema migration'ı gerekmedi). Kullanıcı bulunamasa
bile aynı genel mesajla 200 dönülüyor (enumeration önleme). Link
NEXTAUTH_URL'den üretiliyor — dev/prod ortamına göre doğru çözülür."
```

---

## Task 3: Login Sayfası — Sahte `handleForgot`'u Gerçek API'ye Bağla

**Files:**
- Modify: `src/app/login/page.tsx`

**Interfaces:**
- Consumes: `POST /api/auth/forgot-password` (Task 2) — `{ email }` → `{ message }`.
- Produces: yok.

**Bağlam:** `src/app/login/page.tsx`'teki "Şifremi Unuttum" görünümü (view state, form, buton, stil) ZATEN VAR — yalnızca `handleForgot` fonksiyonu sahte (`setTimeout` ile simüle ediyor, hiçbir API çağırmıyor). Bu task YALNIZCA o fonksiyonun gövdesini gerçek API çağrısına bağlar; JSX/görünüm DEĞİŞMEZ.

- [ ] **Step 1: `handleForgot`'u gerçek fetch çağrısına çevir**

`src/app/login/page.tsx` içinde mevcut:
```ts
    const handleForgot = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        // Simüle edilmiş şifre hatırlatma işlemi
        setTimeout(() => {
            setError("Şifre sıfırlama talimatları e-posta adresinize gönderildi.");
            setLoading(false);
            setTimeout(() => {
                setError("");
                setView("login");
            }, 3000);
        }, 1500);
    };
```
Şuna değiştir:
```ts
    const handleForgot = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const res = await fetch("/api/auth/forgot-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email }),
            });
            const data = await res.json();
            setError(data.message || "Şifre sıfırlama talimatları e-posta adresinize gönderildi.");
            setTimeout(() => {
                setError("");
                setView("login");
            }, 4000);
        } catch {
            setError("Bağlantı hatası. Lütfen tekrar deneyin.");
        } finally {
            setLoading(false);
        }
    };
```
(`errorBannerSuccess` sınıfı zaten `error.includes("gönderildi")` koşuluyla mevcut JSX'te tetikleniyor — API'nin `GENERIC_SUCCESS.message` metni de "gönderildi" kelimesini içeriyor, bu yüzden JSX'e dokunmaya gerek yok.)

- [ ] **Step 2: Doğrula**

```bash
npx tsc --noEmit
npx jest --no-coverage
```
Beklenen: tsc 0 hata, tüm testler PASS (bu sayfa için mevcut bir test yok, bu adım yalnızca regresyon kontrolü).

- [ ] **Step 3: Commit**

```bash
git add src/app/login/page.tsx
git commit -m "fix(login): şifremi unuttum akışı gerçek API'ye bağlandı

handleForgot artık POST /api/auth/forgot-password çağırıyor (önceden
setTimeout ile simüle edilen sahte bir başarı mesajı gösteriyordu,
hiçbir e-posta gönderilmiyordu). JSX/stil değişmedi."
```

---

## Task 4: Şifre Sıfırlama Tamamlama Endpoint'i

**Files:**
- Create: `src/app/api/auth/reset-password/route.ts`
- Create: `src/app/api/auth/reset-password/__tests__/route.test.ts`

**Interfaces:**
- Consumes: `RATE_LIMITS.PASSWORD_RESET` (Task 1), `VerificationToken` kaydı (`identifier: password-reset:<email>`, Task 2'de oluşturulur).
- Produces: yok (Task 5'in UI'sı bu endpoint'i tüketir: `POST /api/auth/reset-password` — `{ token, password }` → `{ message }`).

- [ ] **Step 1: Testi yaz (RED)**

`src/app/api/auth/reset-password/__tests__/route.test.ts`:
```ts
const findTokenMock = jest.fn()
const deleteTokenMock = jest.fn()
const updateUserMock = jest.fn()

jest.mock('@/lib/prisma', () => ({
    prisma: {
        verificationToken: {
            findUnique: (...args: unknown[]) => findTokenMock(...args),
            delete: (...args: unknown[]) => deleteTokenMock(...args),
        },
        user: { update: (...args: unknown[]) => updateUserMock(...args) },
    },
}))
jest.mock('@/lib/rate-limit', () => ({
    checkRateLimit: () => ({ ok: true }),
    getClientIp: () => '127.0.0.1',
    RATE_LIMITS: { PASSWORD_RESET: { limit: 3, windowMs: 3_600_000 } },
}))

import { POST } from '../route'

function req(body: unknown) {
    return new Request('http://localhost/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify(body),
    })
}

describe('POST /api/auth/reset-password', () => {
    beforeEach(() => {
        findTokenMock.mockReset()
        deleteTokenMock.mockReset()
        updateUserMock.mockReset()
    })

    it('token veya password eksikse 400 döner', async () => {
        const res = await POST(req({ token: 'x' }))
        expect(res.status).toBe(400)
    })

    it('token bulunamazsa 400 döner', async () => {
        findTokenMock.mockResolvedValue(null)
        const res = await POST(req({ token: 'gecersiz', password: 'YeniSifre123!' }))
        expect(res.status).toBe(400)
    })

    it('token süresi dolmuşsa 400 döner ve token silinir', async () => {
        findTokenMock.mockResolvedValue({
            identifier: 'password-reset:kullanici@test.com',
            token: 'eski-token',
            expires: new Date(Date.now() - 1000),
        })
        const res = await POST(req({ token: 'eski-token', password: 'YeniSifre123!' }))
        expect(res.status).toBe(400)
        expect(deleteTokenMock).toHaveBeenCalled()
        expect(updateUserMock).not.toHaveBeenCalled()
    })

    it('geçerli token ile şifre güncellenir ve token silinir', async () => {
        findTokenMock.mockResolvedValue({
            identifier: 'password-reset:kullanici@test.com',
            token: 'gecerli-token',
            expires: new Date(Date.now() + 60_000),
        })
        updateUserMock.mockResolvedValue({})
        const res = await POST(req({ token: 'gecerli-token', password: 'YeniSifre123!' }))
        const body = await res.json()
        expect(res.status).toBe(200)
        expect(body.message).toMatch(/şifreniz güncellendi/i)
        expect(updateUserMock).toHaveBeenCalledTimes(1)
        expect(updateUserMock.mock.calls[0][0].where).toEqual({ email: 'kullanici@test.com' })
        expect(deleteTokenMock).toHaveBeenCalledTimes(1)
    })
})
```

- [ ] **Step 2: Testi çalıştır, RED olduğunu doğrula**

```bash
npx jest reset-password --no-coverage
```
Beklenen: FAIL — `../route` modülü bulunamıyor.

- [ ] **Step 3: `src/app/api/auth/reset-password/route.ts`'i yaz**

```ts
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
```

- [ ] **Step 4: Testi tekrar çalıştır — GREEN**

```bash
npx jest reset-password --no-coverage
npx tsc --noEmit
```
Beklenen: 4/4 PASS, tsc 0 hata.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/auth/reset-password/
git commit -m "feat(auth): şifre sıfırlama tamamlama endpoint'i (POST /api/auth/reset-password)

Token identifier'ı password-reset: önekiyle doğrulanıyor, süresi dolmuş
token'lar reddediliyor VE siliniyor (tekrar deneme sızıntısını önlemek
için), başarılı sıfırlama sonrası token tek kullanımlık olarak siliniyor."
```

---

## Task 5: Şifre Sıfırlama Sayfası

**Files:**
- Create: `src/app/reset-password/[token]/page.tsx`
- Create: `src/app/reset-password/[token]/page.module.css`

**Interfaces:**
- Consumes: `POST /api/auth/reset-password` (Task 4) — `{ token, password }` → `{ message }` (200) veya `{ message }` (400/429/500).
- Produces: yok.

- [ ] **Step 1: `page.module.css` oluştur**

`src/app/reset-password/[token]/page.module.css`:
```css
.page {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2rem 1rem;
    background: var(--bg);
}

.card {
    width: 100%;
    max-width: 420px;
    background: var(--panel);
    border: 1px solid var(--border);
    border-radius: 16px;
    padding: 2rem;
}

.title {
    font-size: 1.4rem;
    font-weight: 800;
    color: var(--card-title);
    margin-bottom: 0.5rem;
}

.subtitle {
    font-size: 0.9rem;
    color: var(--muted);
    margin-bottom: 1.5rem;
}

.fieldGroup {
    margin-bottom: 1rem;
}

.label {
    display: block;
    font-size: 0.85rem;
    font-weight: 700;
    color: var(--text);
    margin-bottom: 0.4rem;
}

.input {
    width: 100%;
    padding: 0.65rem 0.85rem;
    border-radius: 8px;
    border: 1px solid var(--border);
    background: var(--bg);
    color: var(--text);
    font-family: inherit;
    font-size: 0.9rem;
}

.submitBtn {
    width: 100%;
    margin-top: 0.5rem;
    padding: 0.75rem;
    border-radius: 10px;
    border: none;
    background: var(--primary);
    color: white;
    font-weight: 700;
    font-size: 0.9rem;
    cursor: pointer;
    font-family: inherit;
}

.submitBtn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

.banner {
    padding: 0.65rem 0.85rem;
    border-radius: 8px;
    font-size: 0.85rem;
    margin-bottom: 1rem;
}

.bannerError {
    background: rgba(239, 68, 68, 0.1);
    color: #ef4444;
    border: 1px solid rgba(239, 68, 68, 0.2);
}

.bannerSuccess {
    background: rgba(16, 185, 129, 0.1);
    color: #10b981;
    border: 1px solid rgba(16, 185, 129, 0.2);
}

.loginLink {
    display: block;
    text-align: center;
    margin-top: 1.25rem;
    font-size: 0.85rem;
    color: var(--primary);
    text-decoration: none;
    font-weight: 700;
}
```

- [ ] **Step 2: `page.tsx` oluştur**

`src/app/reset-password/[token]/page.tsx`:
```tsx
"use client";

import { useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import styles from "./page.module.css";

export default function ResetPasswordPage({ params }: { params: Promise<{ token: string }> }) {
    const { token } = use(params);
    const router = useRouter();
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setSuccess("");

        if (password.length < 8) {
            setError("Şifre en az 8 karakter olmalıdır.");
            return;
        }
        if (password !== confirmPassword) {
            setError("Şifreler eşleşmiyor.");
            return;
        }

        setLoading(true);
        try {
            const res = await fetch("/api/auth/reset-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token, password }),
            });
            const data = await res.json();

            if (res.ok) {
                setSuccess(data.message);
                setTimeout(() => router.push("/login"), 2500);
            } else {
                setError(data.message || "Bir hata oluştu.");
            }
        } catch {
            setError("Bağlantı hatası. Lütfen tekrar deneyin.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.page}>
            <div className={styles.card}>
                <h1 className={styles.title}>Yeni Şifre Belirle</h1>
                <p className={styles.subtitle}>Hesabın için yeni bir şifre gir.</p>

                {error && <div className={`${styles.banner} ${styles.bannerError}`}>{error}</div>}
                {success && <div className={`${styles.banner} ${styles.bannerSuccess}`}>{success}</div>}

                {!success && (
                    <form onSubmit={handleSubmit}>
                        <div className={styles.fieldGroup}>
                            <label className={styles.label} htmlFor="password">Yeni Şifre</label>
                            <input
                                id="password"
                                type="password"
                                className={styles.input}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                required
                                minLength={8}
                            />
                        </div>
                        <div className={styles.fieldGroup}>
                            <label className={styles.label} htmlFor="confirmPassword">Şifre Tekrar</label>
                            <input
                                id="confirmPassword"
                                type="password"
                                className={styles.input}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="••••••••"
                                required
                                minLength={8}
                            />
                        </div>
                        <button type="submit" className={styles.submitBtn} disabled={loading}>
                            {loading ? "Güncelleniyor..." : "Şifreyi Güncelle"}
                        </button>
                    </form>
                )}

                <Link href="/login" className={styles.loginLink}>← Giriş Ekranına Dön</Link>
            </div>
        </div>
    );
}
```

- [ ] **Step 3: Doğrula**

```bash
npx tsc --noEmit
npx eslint src/app/reset-password/[token]/page.tsx
```
Beklenen: tsc 0 hata, eslint 0 ihlal.

- [ ] **Step 4: Docker + dev server açıksa manuel doğrulama**

```bash
docker compose -f docker-compose.dev.yml up -d
npm run dev:next
```
`/api/auth/forgot-password`'a kayıtlı bir e-postayla istek at (curl veya login sayfasındaki form), dönen linki (veya doğrudan bir test token'ı DB'ye ekleyip) `/reset-password/<token>` sayfasında aç, yeni şifreyle giriş yapılabildiğini doğrula.

- [ ] **Step 5: Commit**

```bash
git add src/app/reset-password/
git commit -m "feat(reset-password): şifre sıfırlama tamamlama sayfası eklendi

/reset-password/[token] — yeni şifre + tekrar alanı, POST
/api/auth/reset-password'a bağlı, başarı sonrası /login'e yönlendirir."
```

---

## Task 6: E-posta Doğrulama — Kayıt Sonrası Gönderim

**Files:**
- Modify: `src/app/api/auth/register/route.ts`
- Modify: `src/app/api/auth/register/__tests__/route.test.ts` (yoksa oluştur)
- Modify: `src/lib/email.ts`

**Interfaces:**
- Consumes: `sendEmail` (`@/lib/email`, mevcut).
- Produces: `buildEmailVerificationEmail(verifyUrl: string): string` (`@/lib/email`) — Task 7 tüketmiyor (route tarafında kullanılıyor, sayfa yalnızca token'ı POST ediyor).

**Not:** Bu repo'da `src/app/api/auth/register/` için mevcut bir test dosyası yok — bu task'ta oluşturuluyor, hem mevcut davranışı (role sabit USER, password response'da yok — bugünkü güvenlik düzeltmelerinin regresyon testi) hem yeni e-posta gönderimini kapsar.

- [ ] **Step 1: `src/lib/email.ts`'e doğrulama şablonunu ekle**

Dosyanın SONUNA ekle (Task 2'nin `buildPasswordResetEmail`'inden SONRA):
```ts
export function buildEmailVerificationEmail(verifyUrl: string): string {
    return `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
        <h2 style="color:#1f6feb">ArsaBil'e Hoş Geldiniz</h2>
        <p>Hesabınızı doğrulamak için aşağıdaki bağlantıya tıklayın.</p>
        <a href="${verifyUrl}" style="display:inline-block;margin-top:16px;padding:10px 20px;background:#1f6feb;color:white;text-decoration:none;border-radius:8px;font-weight:700">E-postamı Doğrula →</a>
        <p style="margin-top:24px;font-size:0.8rem;color:#6b7280">Doğrulama isteğe bağlıdır — hesabınızı doğrulamadan da kullanmaya devam edebilirsiniz. Bağlantı 24 saat sonra geçersiz olur.</p>
    </div>`
}
```

- [ ] **Step 2: Testi yaz (mevcut davranış + yeni e-posta gönderimi)**

`src/app/api/auth/register/__tests__/route.test.ts`:
```ts
const findUniqueMock = jest.fn()
const createUserMock = jest.fn()
const createTokenMock = jest.fn()
const sendEmailMock = jest.fn()

jest.mock('@/lib/prisma', () => ({
    prisma: {
        user: {
            findUnique: (...args: unknown[]) => findUniqueMock(...args),
            create: (...args: unknown[]) => createUserMock(...args),
        },
        verificationToken: { create: (...args: unknown[]) => createTokenMock(...args) },
    },
}))
jest.mock('@/lib/email', () => ({
    sendEmail: (...args: unknown[]) => sendEmailMock(...args),
    buildEmailVerificationEmail: (url: string) => `<a href="${url}">verify</a>`,
}))
jest.mock('@/lib/rate-limit', () => ({
    checkRateLimit: () => ({ ok: true }),
    getClientIp: () => '127.0.0.1',
    RATE_LIMITS: { REGISTER: { limit: 3, windowMs: 3_600_000 } },
}))

import { POST } from '../route'

function req(body: unknown) {
    return new Request('http://localhost/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(body),
    })
}

describe('POST /api/auth/register', () => {
    beforeEach(() => {
        findUniqueMock.mockReset()
        createUserMock.mockReset()
        createTokenMock.mockReset()
        sendEmailMock.mockReset()
    })

    it('role client tarafından gönderilse bile USER olarak kaydedilir (privilege escalation regresyonu)', async () => {
        findUniqueMock.mockResolvedValue(null)
        createUserMock.mockResolvedValue({ id: 'u1', name: 'Test', email: 'test@test.com', role: 'USER', createdAt: new Date() })
        createTokenMock.mockResolvedValue({})

        await POST(req({ name: 'Test', email: 'test@test.com', password: 'Test1234!', role: 'ADMIN' }))

        expect(createUserMock).toHaveBeenCalledTimes(1)
        expect(createUserMock.mock.calls[0][0].data.role).toBe('USER')
    })

    it('response body\'de password alanı yer almaz (hash sızıntısı regresyonu)', async () => {
        findUniqueMock.mockResolvedValue(null)
        createUserMock.mockResolvedValue({ id: 'u1', name: 'Test', email: 'test@test.com', role: 'USER', createdAt: new Date() })
        createTokenMock.mockResolvedValue({})

        const res = await POST(req({ name: 'Test', email: 'test@test.com', password: 'Test1234!' }))
        const body = await res.json()

        expect(body.user).not.toHaveProperty('password')
    })

    it('başarılı kayıtta doğrulama token\'ı üretilir ve e-posta gönderilir', async () => {
        findUniqueMock.mockResolvedValue(null)
        createUserMock.mockResolvedValue({ id: 'u1', name: 'Test', email: 'test@test.com', role: 'USER', createdAt: new Date() })
        createTokenMock.mockResolvedValue({})

        await POST(req({ name: 'Test', email: 'test@test.com', password: 'Test1234!' }))

        expect(createTokenMock).toHaveBeenCalledTimes(1)
        expect(createTokenMock.mock.calls[0][0].data.identifier).toBe('email-verify:test@test.com')
        expect(sendEmailMock).toHaveBeenCalledTimes(1)
        expect(sendEmailMock.mock.calls[0][0].to).toBe('test@test.com')
    })

    it('e-posta gönderimi başarısız olsa bile kayıt 201 ile tamamlanır (doğrulama best-effort)', async () => {
        findUniqueMock.mockResolvedValue(null)
        createUserMock.mockResolvedValue({ id: 'u1', name: 'Test', email: 'test@test.com', role: 'USER', createdAt: new Date() })
        createTokenMock.mockResolvedValue({})
        sendEmailMock.mockRejectedValue(new Error('resend down'))

        const res = await POST(req({ name: 'Test', email: 'test@test.com', password: 'Test1234!' }))
        expect(res.status).toBe(201)
    })
})
```

- [ ] **Step 3: Testi çalıştır — mevcut route'a karşı kısmen geçmeli, e-posta testleri FAIL etmeli**

```bash
npx jest api/auth/register --no-coverage
```
Beklenen: ilk 2 test (role/password regresyonu) zaten PASS eder (bugünkü düzeltmeler sayesinde) — son 2 test (token/e-posta) FAIL eder (henüz route'ta bu mantık yok).

- [ ] **Step 4: `src/app/api/auth/register/route.ts`'e doğrulama e-postası gönderimini ekle**

Mevcut dosyanın import bloğunu ve `POST` fonksiyonunun son kısmını güncelle:
```ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { checkRateLimit, getClientIp, RATE_LIMITS } from "@/lib/rate-limit";
import { sendEmail, buildEmailVerificationEmail } from "@/lib/email";

export async function POST(req: Request) {
    const rl = checkRateLimit(`register:${getClientIp(req)}`, RATE_LIMITS.REGISTER);
    if (!rl.ok) {
        return NextResponse.json(
            { message: "Çok fazla kayıt denemesi. Lütfen daha sonra tekrar deneyin." },
            { status: 429, headers: { "Retry-After": String(rl.retryAfterSec ?? 60) } }
        );
    }
    try {
        const { name, email, password } = await req.json();

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
                role: "USER"
            },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                createdAt: true,
            }
        });

        // Doğrulama e-postası best-effort — gönderim başarısız olsa bile kayıt tamamlanır
        // (Global Constraints: e-posta doğrulama login'i bloke etmez, bu yüzden kritik değil).
        if (newUser.email) {
            try {
                const token = crypto.randomBytes(32).toString("hex");
                await prisma.verificationToken.create({
                    data: {
                        identifier: `email-verify:${newUser.email}`,
                        token,
                        expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
                    },
                });
                const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
                await sendEmail({
                    to: newUser.email,
                    subject: "ArsaBil — E-postanızı Doğrulayın",
                    html: buildEmailVerificationEmail(`${baseUrl}/verify-email/${token}`),
                });
            } catch (emailError) {
                console.error("Doğrulama e-postası gönderilemedi:", emailError);
            }
        }

        return NextResponse.json({ message: "Kayıt başarılı", user: newUser }, { status: 201 });
    } catch (error) {
        console.error("Kayıt hatası:", error);
        return NextResponse.json({ message: "Kayıt sırasında bir hata oluştu." }, { status: 500 });
    }
}
```

- [ ] **Step 5: Testi tekrar çalıştır — GREEN**

```bash
npx jest api/auth/register --no-coverage
npx tsc --noEmit
```
Beklenen: 4/4 PASS, tsc 0 hata.

- [ ] **Step 6: Tam suite**

```bash
npx jest --no-coverage
```
Beklenen: tüm testler PASS (register.scope.test.ts dahil — bu route'un register/page.tsx tarafındaki tüketimini değiştirmedik).

- [ ] **Step 7: Commit**

```bash
git add src/lib/email.ts src/app/api/auth/register/
git commit -m "feat(auth): kayıt sonrası e-posta doğrulama bağlantısı gönderiliyor

VerificationToken identifier:email-verify:<email> öneki ile kullanılıyor.
Gönderim best-effort (try/catch ile sarılı) — Resend hata verse bile kayıt
201 ile tamamlanır, login bloklanmaz (Global Constraints). Ayrıca role/
password regresyon testleri eklendi (bugünkü güvenlik düzeltmeleri için
hiç test yoktu)."
```

---

## Task 7: E-posta Doğrulama — Tüketim Endpoint'i + Sayfası

**Files:**
- Create: `src/app/api/auth/verify-email/route.ts`
- Create: `src/app/api/auth/verify-email/__tests__/route.test.ts`
- Create: `src/app/verify-email/[token]/page.tsx`
- Create: `src/app/verify-email/[token]/page.module.css`

**Interfaces:**
- Consumes: `VerificationToken` kaydı (`identifier: email-verify:<email>`, Task 6'da oluşturulur).
- Produces: `POST /api/auth/verify-email` — `{ token }` → `{ message }` (200/400/500). Sayfa bunu tüketir.

- [ ] **Step 1: Testi yaz (RED)**

`src/app/api/auth/verify-email/__tests__/route.test.ts`:
```ts
const findTokenMock = jest.fn()
const deleteTokenMock = jest.fn()
const updateUserMock = jest.fn()

jest.mock('@/lib/prisma', () => ({
    prisma: {
        verificationToken: {
            findUnique: (...args: unknown[]) => findTokenMock(...args),
            delete: (...args: unknown[]) => deleteTokenMock(...args),
        },
        user: { update: (...args: unknown[]) => updateUserMock(...args) },
    },
}))

import { POST } from '../route'

function req(body: unknown) {
    return new Request('http://localhost/api/auth/verify-email', {
        method: 'POST',
        body: JSON.stringify(body),
    })
}

describe('POST /api/auth/verify-email', () => {
    beforeEach(() => {
        findTokenMock.mockReset()
        deleteTokenMock.mockReset()
        updateUserMock.mockReset()
    })

    it('token eksikse 400 döner', async () => {
        const res = await POST(req({}))
        expect(res.status).toBe(400)
    })

    it('token bulunamazsa veya yanlış türdeyse 400 döner', async () => {
        findTokenMock.mockResolvedValue(null)
        const res = await POST(req({ token: 'gecersiz' }))
        expect(res.status).toBe(400)
    })

    it('süresi dolmuş token 400 döner ve silinir', async () => {
        findTokenMock.mockResolvedValue({
            identifier: 'email-verify:kullanici@test.com',
            token: 'eski',
            expires: new Date(Date.now() - 1000),
        })
        const res = await POST(req({ token: 'eski' }))
        expect(res.status).toBe(400)
        expect(deleteTokenMock).toHaveBeenCalled()
    })

    it('geçerli token ile emailVerified set edilir ve token silinir', async () => {
        findTokenMock.mockResolvedValue({
            identifier: 'email-verify:kullanici@test.com',
            token: 'gecerli',
            expires: new Date(Date.now() + 60_000),
        })
        updateUserMock.mockResolvedValue({})
        const res = await POST(req({ token: 'gecerli' }))
        const body = await res.json()
        expect(res.status).toBe(200)
        expect(body.message).toMatch(/doğrulandı/i)
        expect(updateUserMock.mock.calls[0][0].where).toEqual({ email: 'kullanici@test.com' })
        expect(updateUserMock.mock.calls[0][0].data.emailVerified).toBeInstanceOf(Date)
        expect(deleteTokenMock).toHaveBeenCalledTimes(1)
    })
})
```

- [ ] **Step 2: Testi çalıştır, RED olduğunu doğrula**

```bash
npx jest api/auth/verify-email --no-coverage
```
Beklenen: FAIL — `../route` modülü bulunamıyor.

- [ ] **Step 3: `src/app/api/auth/verify-email/route.ts`'i yaz**

```ts
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
```

- [ ] **Step 4: Testi tekrar çalıştır — GREEN**

```bash
npx jest api/auth/verify-email --no-coverage
npx tsc --noEmit
```
Beklenen: 4/4 PASS, tsc 0 hata.

- [ ] **Step 5: `page.module.css` oluştur**

`src/app/verify-email/[token]/page.module.css` — Task 5'teki `.page`/`.card`/`.title`/`.subtitle`/`.banner`/`.bannerError`/`.bannerSuccess`/`.loginLink` sınıflarının BİREBİR AYNISI (aynı dosya içeriği, farklı dosya konumu — form alanı olmadığı için `.fieldGroup`/`.label`/`.input`/`.submitBtn` bu dosyaya KOPYALANMAZ):
```css
.page {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2rem 1rem;
    background: var(--bg);
}

.card {
    width: 100%;
    max-width: 420px;
    background: var(--panel);
    border: 1px solid var(--border);
    border-radius: 16px;
    padding: 2rem;
    text-align: center;
}

.title {
    font-size: 1.4rem;
    font-weight: 800;
    color: var(--card-title);
    margin-bottom: 0.5rem;
}

.subtitle {
    font-size: 0.9rem;
    color: var(--muted);
    margin-bottom: 1.5rem;
}

.banner {
    padding: 0.65rem 0.85rem;
    border-radius: 8px;
    font-size: 0.85rem;
    margin-bottom: 1rem;
}

.bannerError {
    background: rgba(239, 68, 68, 0.1);
    color: #ef4444;
    border: 1px solid rgba(239, 68, 68, 0.2);
}

.bannerSuccess {
    background: rgba(16, 185, 129, 0.1);
    color: #10b981;
    border: 1px solid rgba(16, 185, 129, 0.2);
}

.loginLink {
    display: block;
    text-align: center;
    margin-top: 1.25rem;
    font-size: 0.85rem;
    color: var(--primary);
    text-decoration: none;
    font-weight: 700;
}
```

- [ ] **Step 6: `page.tsx` oluştur**

`src/app/verify-email/[token]/page.tsx` — mount olduğunda otomatik doğrulama isteği atar (kullanıcı etkileşimi gerekmez, link tıklanınca doğrudan doğrulansın diye):
```tsx
"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import styles from "./page.module.css";

export default function VerifyEmailPage({ params }: { params: Promise<{ token: string }> }) {
    const { token } = use(params);
    const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
    const [message, setMessage] = useState("");

    useEffect(() => {
        let cancelled = false;
        fetch("/api/auth/verify-email", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token }),
        })
            .then(async (res) => {
                const data = await res.json();
                if (cancelled) return;
                setStatus(res.ok ? "success" : "error");
                setMessage(data.message);
            })
            .catch(() => {
                if (!cancelled) {
                    setStatus("error");
                    setMessage("Bağlantı hatası. Lütfen tekrar deneyin.");
                }
            });
        return () => { cancelled = true; };
    }, [token]);

    return (
        <div className={styles.page}>
            <div className={styles.card}>
                <h1 className={styles.title}>E-posta Doğrulama</h1>
                {status === "loading" && <p className={styles.subtitle}>Doğrulanıyor...</p>}
                {status === "success" && <div className={`${styles.banner} ${styles.bannerSuccess}`}>{message}</div>}
                {status === "error" && <div className={`${styles.banner} ${styles.bannerError}`}>{message}</div>}
                <Link href="/login" className={styles.loginLink}>Giriş Ekranına Dön</Link>
            </div>
        </div>
    );
}
```

- [ ] **Step 7: Doğrula**

```bash
npx tsc --noEmit
npx eslint src/app/api/auth/verify-email/route.ts src/app/verify-email/[token]/page.tsx
npx jest --no-coverage
```
Beklenen: tsc 0 hata, eslint 0 ihlal, tüm testler PASS.

- [ ] **Step 8: Commit**

```bash
git add src/app/api/auth/verify-email/ src/app/verify-email/
git commit -m "feat(verify-email): e-posta doğrulama tüketim endpoint'i ve sayfası

/verify-email/[token] mount olduğunda otomatik POST /api/auth/verify-email
çağırır, emailVerified alanını set eder. Doğrulama login'i bloke etmiyor
(Global Constraints) — yalnızca informational, dashboard/profile'daki
rozet Task 10'da bu alana bağlanacak."
```

---

## Task 8: Hesap Silme Endpoint'i

**Files:**
- Create: `src/app/api/user/account/route.ts`
- Create: `src/app/api/user/account/__tests__/route.test.ts`

**Interfaces:**
- Consumes: `getServerSession(authOptions)` (mevcut desen), `bcrypt.compare` (mevcut desen, `src/lib/auth.ts`'teki `authorize()`'da kullanılıyor).
- Produces: `DELETE /api/user/account` — body `{ password }` → `{ message }` (200/400/401/403/500). Task 10'un UI'sı bu endpoint'i tüketir.

**Silme sırası (Global Constraints'teki şema analizinden):** `Message` (sender VEYA receiver — ikisi de `onDelete` tanımsız/Restrict) → `Report` (user ilişkisi `onDelete` tanımsız/Restrict; silinince ona bağlı `Listing` otomatik cascade olur) → `prisma.user.delete()` (geri kalan HER ŞEY — `Account`/`Session`/`Notification`/`CompareShare`/kalan `Listing`/`Favorite`/`Offer`/`Project`→`Scenario` — zaten `onDelete: Cascade` olduğu için otomatik silinir).

- [ ] **Step 1: Testi yaz (RED)**

`src/app/api/user/account/__tests__/route.test.ts`:
```ts
const getServerSessionMock = jest.fn()
const findUniqueMock = jest.fn()
const messageDeleteManyMock = jest.fn()
const reportDeleteManyMock = jest.fn()
const userDeleteMock = jest.fn()
const compareMock = jest.fn()

jest.mock('next-auth/next', () => ({
    getServerSession: (...args: unknown[]) => getServerSessionMock(...args),
}))
jest.mock('@/lib/auth', () => ({ authOptions: {} }))
jest.mock('bcryptjs', () => ({
    compare: (...args: unknown[]) => compareMock(...args),
}))
jest.mock('@/lib/prisma', () => ({
    prisma: {
        user: {
            findUnique: (...args: unknown[]) => findUniqueMock(...args),
            delete: (...args: unknown[]) => userDeleteMock(...args),
        },
        message: { deleteMany: (...args: unknown[]) => messageDeleteManyMock(...args) },
        report: { deleteMany: (...args: unknown[]) => reportDeleteManyMock(...args) },
    },
}))

import { DELETE } from '../route'

function req(body: unknown) {
    return new Request('http://localhost/api/user/account', {
        method: 'DELETE',
        body: JSON.stringify(body),
    })
}

describe('DELETE /api/user/account', () => {
    beforeEach(() => {
        getServerSessionMock.mockReset()
        findUniqueMock.mockReset()
        messageDeleteManyMock.mockReset()
        reportDeleteManyMock.mockReset()
        userDeleteMock.mockReset()
        compareMock.mockReset()
    })

    it('oturum yoksa 401 döner', async () => {
        getServerSessionMock.mockResolvedValue(null)
        const res = await DELETE(req({ password: 'x' }))
        expect(res.status).toBe(401)
    })

    it('şifre gönderilmezse 400 döner', async () => {
        getServerSessionMock.mockResolvedValue({ user: { id: 'u1' } })
        const res = await DELETE(req({}))
        expect(res.status).toBe(400)
    })

    it('şifre yanlışsa 403 döner, hiçbir silme yapılmaz', async () => {
        getServerSessionMock.mockResolvedValue({ user: { id: 'u1' } })
        findUniqueMock.mockResolvedValue({ id: 'u1', password: 'hash', email: 'u1@test.com' })
        compareMock.mockResolvedValue(false)
        const res = await DELETE(req({ password: 'yanlis' }))
        expect(res.status).toBe(403)
        expect(userDeleteMock).not.toHaveBeenCalled()
    })

    it('şifre doğruysa Message->Report->User sırasıyla silinir', async () => {
        getServerSessionMock.mockResolvedValue({ user: { id: 'u1' } })
        findUniqueMock.mockResolvedValue({ id: 'u1', password: 'hash', email: 'u1@test.com' })
        compareMock.mockResolvedValue(true)
        messageDeleteManyMock.mockResolvedValue({ count: 0 })
        reportDeleteManyMock.mockResolvedValue({ count: 0 })
        userDeleteMock.mockResolvedValue({})

        const res = await DELETE(req({ password: 'dogru' }))
        const body = await res.json()

        expect(res.status).toBe(200)
        expect(body.message).toMatch(/hesabınız silindi/i)
        expect(messageDeleteManyMock).toHaveBeenCalledWith({
            where: { OR: [{ senderId: 'u1' }, { receiverId: 'u1' }] },
        })
        expect(reportDeleteManyMock).toHaveBeenCalledWith({ where: { userId: 'u1' } })
        expect(userDeleteMock).toHaveBeenCalledWith({ where: { id: 'u1' } })

        // Sıra: message -> report -> user (FK kısıtları bu sırayı gerektiriyor)
        const messageOrder = messageDeleteManyMock.mock.invocationCallOrder[0]
        const reportOrder = reportDeleteManyMock.mock.invocationCallOrder[0]
        const userOrder = userDeleteMock.mock.invocationCallOrder[0]
        expect(messageOrder).toBeLessThan(reportOrder)
        expect(reportOrder).toBeLessThan(userOrder)
    })

    it('kullanıcının şifresi yoksa (OAuth hesabı varsayımı) 400 döner', async () => {
        getServerSessionMock.mockResolvedValue({ user: { id: 'u1' } })
        findUniqueMock.mockResolvedValue({ id: 'u1', password: null, email: 'u1@test.com' })
        const res = await DELETE(req({ password: 'herhangi' }))
        expect(res.status).toBe(400)
    })
})
```

- [ ] **Step 2: Testi çalıştır, RED olduğunu doğrula**

```bash
npx jest api/user/account --no-coverage
```
Beklenen: FAIL — `../route` modülü bulunamıyor.

- [ ] **Step 3: `src/app/api/user/account/route.ts`'i yaz**

```ts
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
```

- [ ] **Step 4: Testi tekrar çalıştır — GREEN**

```bash
npx jest api/user/account --no-coverage
npx tsc --noEmit
```
Beklenen: 5/5 PASS, tsc 0 hata.

- [ ] **Step 5: Docker + dev server açıksa gerçek DB'ye karşı entegrasyon kontrolü**

```bash
docker compose -f docker-compose.dev.yml up -d
npx prisma@5.22.0 migrate deploy
```
Bir test kullanıcısı oluştur (birkaç mesaj/rapor/proje/senaryo/favori ile), `DELETE /api/user/account`'ı doğru şifreyle çağır, `psql` ile tüm ilişkili tabloların (Message/Report/Listing/Project/Scenario/Favorite/Offer/Notification/CompareShare/Account/Session) o kullanıcıya ait satırlarının silindiğini doğrula:
```bash
docker exec -it arsabil_postgres_dev psql -U arsabil -d arsabil_dev -c "SELECT count(*) FROM \"Message\" WHERE \"senderId\"='<id>' OR \"receiverId\"='<id>';"
```
Beklenen: 0.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/user/account/
git commit -m "feat(account): hesap silme endpoint'i (DELETE /api/user/account)

Şifre re-confirmation zorunlu (Global Constraints). Silme sırası şemadaki
onDelete ilişkilerinden türetildi: Message ve Report onDelete tanımsız
(Restrict) olduğu için User'dan ÖNCE manuel silinir, geri kalanı
User.delete() cascade ile temizler. Gerçek DB'ye karşı entegrasyon
kontrolüyle doğrulandı (Docker)."
```

---

## Task 9: Veri İndirme Endpoint'i

**Files:**
- Create: `src/app/api/user/export/route.ts`
- Create: `src/app/api/user/export/__tests__/route.test.ts`

**Interfaces:**
- Consumes: `getServerSession(authOptions)` (mevcut desen).
- Produces: `GET /api/user/export` — `{ user, projects, listings, reports, favorites, sentMessages, receivedMessages, offers }` (200/401/500). Task 10'un UI'sı bu endpoint'i tüketir.

- [ ] **Step 1: Testi yaz (RED)**

`src/app/api/user/export/__tests__/route.test.ts`:
```ts
const getServerSessionMock = jest.fn()
const findUniqueMock = jest.fn()

jest.mock('next-auth/next', () => ({
    getServerSession: (...args: unknown[]) => getServerSessionMock(...args),
}))
jest.mock('@/lib/auth', () => ({ authOptions: {} }))
jest.mock('@/lib/prisma', () => ({
    prisma: {
        user: { findUnique: (...args: unknown[]) => findUniqueMock(...args) },
    },
}))

import { GET } from '../route'

describe('GET /api/user/export', () => {
    beforeEach(() => {
        getServerSessionMock.mockReset()
        findUniqueMock.mockReset()
    })

    it('oturum yoksa 401 döner', async () => {
        getServerSessionMock.mockResolvedValue(null)
        const res = await GET()
        expect(res.status).toBe(401)
    })

    it('kullanıcı verisini password hariç JSON olarak döner', async () => {
        getServerSessionMock.mockResolvedValue({ user: { id: 'u1' } })
        findUniqueMock.mockResolvedValue({
            id: 'u1', name: 'Test', email: 'test@test.com', password: 'gizli-hash',
            projects: [], listings: [], reports: [], favorites: [],
            sentMessages: [], receivedMessages: [], offers: [],
        })
        const res = await GET()
        const body = await res.json()
        expect(res.status).toBe(200)
        expect(body.user).not.toHaveProperty('password')
        expect(body.user.email).toBe('test@test.com')

        // select ile zaten dışlandığını doğrulamak için findUnique çağrısını incele
        const selectArg = findUniqueMock.mock.calls[0][0].select
        expect(selectArg.password).toBeUndefined()
    })
})
```

- [ ] **Step 2: Testi çalıştır, RED olduğunu doğrula**

```bash
npx jest api/user/export --no-coverage
```
Beklenen: FAIL — `../route` modülü bulunamıyor.

- [ ] **Step 3: `src/app/api/user/export/route.ts`'i yaz**

```ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ message: "Yetkisiz." }, { status: 401 });
    }

    try {
        const userId = session.user.id as string;
        const data = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                name: true,
                email: true,
                bio: true,
                linkedin: true,
                website: true,
                plan: true,
                createdAt: true,
                projects: { include: { scenarios: true } },
                listings: true,
                reports: true,
                favorites: true,
                sentMessages: true,
                receivedMessages: true,
                offers: true,
                // password ASLA select edilmez
            },
        });

        if (!data) {
            return NextResponse.json({ message: "Kullanıcı bulunamadı." }, { status: 404 });
        }

        return NextResponse.json({ user: data, exportedAt: new Date().toISOString() });
    } catch (error) {
        console.error("Data export error:", error);
        return NextResponse.json({ message: "Hata oluştu." }, { status: 500 });
    }
}
```

- [ ] **Step 4: Testi tekrar çalıştır — GREEN**

```bash
npx jest api/user/export --no-coverage
npx tsc --noEmit
```
Beklenen: 2/2 PASS, tsc 0 hata.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/user/export/
git commit -m "feat(account): veri indirme endpoint'i (GET /api/user/export)

Kullanıcının kendi verisi (projeler+senaryolar, ilanlar, raporlar,
favoriler, mesajlar, teklifler) JSON olarak döner. password alanı
select'te hiç yer almıyor (dışlama değil, baştan dahil etmeme)."
```

---

## Task 10: Dashboard/Profil — Hesap Silme + Veri İndirme UI

**Files:**
- Modify: `src/app/dashboard/profile/page.tsx`

**Interfaces:**
- Consumes: `GET /api/user/export` (Task 9), `DELETE /api/user/account` (Task 8) — body `{ password }`.
- Produces: yok.

**Bağlam:** `settings` tab'ında (satır ~457-522) mevcut "E-posta Bildirimleri" bloğu ve `signOut()` butonu var. Bu task o bloğun ALTINA, `signOut()` butonundan ÖNCE yeni bir "Hesap" bölümü ekler — mevcut inline-style deseniyle tutarlı (bu dosyanın settings tab'ı henüz CSS module'e taşınmamış, Faz 3 kapsamı dışında — dokunulmuyor).

- [ ] **Step 1: State ekle**

`export default function ProfilePage() {` içindeki state bloğuna (satır ~85, `isEditingProfile`'dan SONRA) ekle:
```ts
    const [showDeleteModal, setShowDeleteModal] = useState(false)
    const [deletePassword, setDeletePassword] = useState('')
    const [deleteError, setDeleteError] = useState('')
    const [deleting, setDeleting] = useState(false)
    const [exporting, setExporting] = useState(false)
```

- [ ] **Step 2: Handler fonksiyonlarını ekle**

`saveEmailPrefs` fonksiyonunun tanımlandığı yerin HEMEN ALTINA ekle (component body içinde, `return` bloğundan önce herhangi bir uygun yer — mevcut handler'ların yanı):
```ts
    const handleExportData = async () => {
        setExporting(true)
        try {
            const res = await fetch('/api/user/export')
            if (!res.ok) throw new Error('export failed')
            const data = await res.json()
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `arsabil-verilerim-${new Date().toISOString().slice(0, 10)}.json`
            a.click()
            URL.revokeObjectURL(url)
        } catch {
            alert('Veri indirme sırasında bir hata oluştu.')
        } finally {
            setExporting(false)
        }
    }

    const handleDeleteAccount = async () => {
        if (!deletePassword) {
            setDeleteError('Şifrenizi girmelisiniz.')
            return
        }
        setDeleting(true)
        setDeleteError('')
        try {
            const res = await fetch('/api/user/account', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: deletePassword }),
            })
            const data = await res.json()
            if (res.ok) {
                await signOut({ callbackUrl: '/' })
            } else {
                setDeleteError(data.message || 'Hesap silinemedi.')
                setDeleting(false)
            }
        } catch {
            setDeleteError('Bağlantı hatası.')
            setDeleting(false)
        }
    }
```

- [ ] **Step 3: JSX'e "Hesap" bölümünü ekle**

Mevcut (satır ~516-520):
```tsx
                                </div>

                                <button onClick={() => signOut()} className={styles.settingsSignOutBtn}>
                                    Çıkış Yap
                                </button>
                            </>
                        )}
```
Şuna değiştir (E-posta Bildirimleri bloğunun kapanışı ile signOut butonu ARASINA yeni bölüm eklenir):
```tsx
                                </div>

                                {/* Hesap Yönetimi */}
                                <div style={{ marginTop: 28, paddingTop: 20, borderTop: '1px solid var(--border)' }}>
                                    <h3 style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--card-title)', marginBottom: 12 }}>
                                        Hesap
                                    </h3>
                                    <button
                                        onClick={handleExportData}
                                        disabled={exporting}
                                        style={{
                                            padding: '8px 20px', background: 'var(--panel)', color: 'var(--text)',
                                            border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer',
                                            fontFamily: 'inherit', fontWeight: 700, fontSize: '0.85rem',
                                            opacity: exporting ? 0.6 : 1, marginRight: 10,
                                        }}
                                    >
                                        {exporting ? 'Hazırlanıyor…' : '📥 Verilerimi İndir'}
                                    </button>
                                    <button
                                        onClick={() => setShowDeleteModal(true)}
                                        style={{
                                            padding: '8px 20px', background: 'transparent', color: '#ef4444',
                                            border: '1px solid #ef4444', borderRadius: 8, cursor: 'pointer',
                                            fontFamily: 'inherit', fontWeight: 700, fontSize: '0.85rem',
                                        }}
                                    >
                                        Hesabımı Sil
                                    </button>
                                </div>

                                <button onClick={() => signOut()} className={styles.settingsSignOutBtn}>
                                    Çıkış Yap
                                </button>
                            </>
                        )}
```

- [ ] **Step 4: Silme onay modal'ını ekle**

`settings` tab bloğunu kapatan `)}` satırından SONRA, `</div>` (`.tabPanel` kapanışı) ve `</div>` (`.layout` kapanışı) satırlarından SONRA, `mobileSignOut` div'inden ÖNCE ekle (satır ~522-527 arası):
```tsx
                        )}
                    </div>
                </div>
            </div>

            {showDeleteModal && (
                <div
                    style={{
                        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
                    }}
                    onClick={() => { setShowDeleteModal(false); setDeletePassword(''); setDeleteError('') }}
                >
                    <div
                        style={{
                            background: 'var(--panel)', borderRadius: 16, padding: 24,
                            maxWidth: 400, width: '90%', border: '1px solid var(--border)',
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--card-title)', marginBottom: 8 }}>
                            Hesabını silmek istediğine emin misin?
                        </h3>
                        <p style={{ fontSize: '0.85rem', color: 'var(--muted)', marginBottom: 16 }}>
                            Bu işlem geri alınamaz. Tüm projelerin, ilanların, mesajların ve raporların kalıcı olarak silinecek.
                        </p>
                        {deleteError && (
                            <div style={{ padding: '8px 12px', background: 'rgba(239,68,68,0.1)', color: '#ef4444', borderRadius: 8, fontSize: '0.8rem', marginBottom: 12 }}>
                                {deleteError}
                            </div>
                        )}
                        <input
                            type="password"
                            placeholder="Şifreni gir"
                            value={deletePassword}
                            onChange={(e) => setDeletePassword(e.target.value)}
                            style={{
                                width: '100%', padding: '10px 12px', borderRadius: 8,
                                border: '1px solid var(--border)', background: 'var(--bg)',
                                color: 'var(--text)', fontFamily: 'inherit', fontSize: '0.85rem', marginBottom: 16,
                            }}
                        />
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button
                                onClick={() => { setShowDeleteModal(false); setDeletePassword(''); setDeleteError('') }}
                                style={{
                                    flex: 1, padding: '10px', borderRadius: 8, border: '1px solid var(--border)',
                                    background: 'transparent', color: 'var(--text)', cursor: 'pointer',
                                    fontFamily: 'inherit', fontWeight: 700, fontSize: '0.85rem',
                                }}
                            >
                                Vazgeç
                            </button>
                            <button
                                onClick={handleDeleteAccount}
                                disabled={deleting}
                                style={{
                                    flex: 1, padding: '10px', borderRadius: 8, border: 'none',
                                    background: '#ef4444', color: 'white', cursor: 'pointer',
                                    fontFamily: 'inherit', fontWeight: 700, fontSize: '0.85rem',
                                    opacity: deleting ? 0.6 : 1,
                                }}
                            >
                                {deleting ? 'Siliniyor…' : 'Evet, Hesabımı Sil'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className={styles.mobileSignOut}>
```
(`</div>` (`.mobileSignOut`) ve sonrasındaki mevcut kapanışlar DEĞİŞMEDEN kalır.)

- [ ] **Step 5: Doğrula**

```bash
npx tsc --noEmit
npx eslint src/app/dashboard/profile/page.tsx
npx jest --no-coverage
```
Beklenen: tsc 0 hata, eslint 0 ihlal, tüm testler PASS (bu dosya için mevcut `profileStyles.scope.test.ts` yalnızca CSS module'ü test ediyor, bu değişiklikle çakışmaz).

- [ ] **Step 6: Docker + dev server açıksa manuel doğrulama**

`/dashboard/profile` > Tema & Ayarlar sekmesinde "Verilerimi İndir" butonuna tıkla, bir JSON dosyasının indiğini doğrula. "Hesabımı Sil" > yanlış şifreyle dene (hata mesajı görünmeli) > doğru şifreyle dene (oturum kapanıp anasayfaya yönlenmeli, DB'de kullanıcı satırının silindiğini `psql` ile doğrula).

- [ ] **Step 7: Commit**

```bash
git add src/app/dashboard/profile/page.tsx
git commit -m "feat(profile): hesap silme + veri indirme UI'ı eklendi

Tema & Ayarlar sekmesine 'Verilerimi İndir' (GET /api/user/export'u
JSON dosyası olarak indirir) ve 'Hesabımı Sil' (şifre re-confirmation'lı
onay modal'ı, DELETE /api/user/account) butonları eklendi. Mevcut
inline-style deseniyle tutarlı (bu sekme Faz 3 kapsamında CSS module'e
taşınmamıştı, dokunulmadı)."
```

---

## Task 11: CSP — Report-Only'den Enforce Moduna Geçiş

**Files:**
- Modify: `next.config.mjs`

**Interfaces:**
- Consumes: yok.
- Produces: yok.

- [ ] **Step 1: Header anahtarını değiştir**

`next.config.mjs` içinde mevcut:
```js
                    {
                        key: 'Content-Security-Policy-Report-Only',
                        value: "default-src 'self'; img-src 'self' data: blob: https://res.cloudinary.com https://*.basemaps.cartocdn.com https://*.tile.openstreetmap.org; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; connect-src 'self' https://*.ingest.sentry.io https://*.sentry.io https://nominatim.openstreetmap.org; font-src 'self' data: https://fonts.gstatic.com; frame-ancestors 'none'",
                    },
```
Şuna değiştir (yalnızca header anahtarı `Content-Security-Policy-Report-Only` → `Content-Security-Policy`, politika değeri AYNI kalır):
```js
                    {
                        key: 'Content-Security-Policy',
                        value: "default-src 'self'; img-src 'self' data: blob: https://res.cloudinary.com https://*.basemaps.cartocdn.com https://*.tile.openstreetmap.org; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; connect-src 'self' https://*.ingest.sentry.io https://*.sentry.io https://nominatim.openstreetmap.org; font-src 'self' data: https://fonts.gstatic.com; frame-ancestors 'none'",
                    },
```

- [ ] **Step 2: Doğrula**

```bash
npx tsc --noEmit
npm run build
```
Beklenen: build başarılı (CSP başlığı yalnızca runtime response header'ı, build'i etkilemez).

- [ ] **Step 3: Docker + dev server açıksa TAM manuel regresyon — bu adım ATLANAMAZ**

Bu değişiklik uygulamanın her sayfasını etkileyebilir (CSP ihlali, kaynağı tamamen bloklar — sessizce bozulan bir özellik kolayca fark edilmeyebilir). Docker açıp:
```bash
docker compose -f docker-compose.dev.yml up -d
npm run dev:next
```
Tarayıcı DevTools > Console açık halde en az şu sayfaları gez ve CSP ihlali (console'da kırmızı "Refused to..." hatası) OLMADIĞINI doğrula:
- `/` (Leaflet harita — `img-src`'teki `*.tile.openstreetmap.org`/`*.basemaps.cartocdn.com` kapsıyor)
- `/hesapla` (grafik kütüphaneleri, PDF export)
- `/marketplace` (harita + filtre)
- `/dashboard/profile` (avatar upload — Cloudinary `img-src`'te var)
- `/inbox` (SSE — `connect-src 'self'` zaten aynı origin, sorun beklenmiyor)
- Sentry etkinse bir hata tetikleyip `*.ingest.sentry.io`'ya raporun gittiğini doğrula (`connect-src`'te tanımlı)

Herhangi bir sayfada konsol hatası görürsen DURUP raporla — CSP değerini genişletmek ayrı bir karar gerektirir, tahmin ederek eklemene gerek yok.

- [ ] **Step 4: Commit**

```bash
git add next.config.mjs
git commit -m "fix(security): CSP Report-Only'den enforce moduna geçirildi

Header adı Content-Security-Policy-Report-Only -> Content-Security-Policy;
politika değeri değişmedi. Önceden yalnızca izliyordu, gerçek bir XSS/
injection saldırısını engellemiyordu. Manuel regresyon: harita/upload/
grafik/SSE sayfalarında konsol hatası yok."
```

---

## Task 12: API Yetkilendirme Test Suite'i (Kalan Route'lar)

**Files:**
- Create: `src/app/api/admin/analytics/__tests__/route.test.ts`
- Create: `src/app/api/admin/offers/__tests__/route.test.ts`
- Create: `src/app/api/projects/__tests__/route.test.ts`

**Interfaces:**
- Consumes: mevcut route'lar (Task 6 dışında bugünkü oturumda düzeltilen 4 dosya) — yeni bir interface üretmiyor, yalnızca test kapsamı ekliyor.

**Bağlam:** Bugünkü oturumda 4 route'ta (`api/projects/route.ts`, `api/offers/[id]/route.ts`, `api/admin/stats/route.ts`, `api/admin/analytics/route.ts`, `api/admin/offers/route.ts`, `api/auth/register/route.ts`) yetkilendirme açığı bulunup düzeltildi — hiçbiri için test yoktu, bu yüzden hiçbiri hiçbir CI/test koşusunda yakalanmadı. `api/auth/register` testi Task 6'da zaten yazıldı. Bu task, `admin/analytics`, `admin/offers` ve `projects` (GET/POST) route'larını kapsar — `offers/[id]` ve `admin/stats` ayrı bir task gerektirmeyecek kadar küçük kapsamlı olduğundan (tek metod, tek kontrol) burada atlanmıyor, aşağıda `projects` testine ek olarak dahil ediliyor değil — kapsam dışı bırakıldı, gelecekte ayrıca eklenebilir (bu plan yalnızca bugün YENİ bulunan admin/analytics + admin/offers'ı ve en yüksek riskli projects'i kapsıyor).

- [ ] **Step 1: `admin/analytics` testi**

`src/app/api/admin/analytics/__tests__/route.test.ts`:
```ts
const getServerSessionMock = jest.fn()
const countMock = jest.fn()
const findManyMock = jest.fn()

jest.mock('next-auth/next', () => ({
    getServerSession: (...args: unknown[]) => getServerSessionMock(...args),
}))
jest.mock('@/lib/auth', () => ({ authOptions: {} }))
jest.mock('@/lib/prisma', () => ({
    prisma: {
        user: { count: (...args: unknown[]) => countMock(...args), findMany: (...args: unknown[]) => findManyMock(...args) },
        report: { count: (...args: unknown[]) => countMock(...args) },
        listing: { count: (...args: unknown[]) => countMock(...args), findMany: (...args: unknown[]) => findManyMock(...args) },
        offer: { count: (...args: unknown[]) => countMock(...args) },
    },
}))

import { GET } from '../route'

describe('GET /api/admin/analytics', () => {
    beforeEach(() => {
        getServerSessionMock.mockReset()
        countMock.mockReset().mockResolvedValue(0)
        findManyMock.mockReset().mockResolvedValue([])
    })

    it('oturum yoksa 403 döner', async () => {
        getServerSessionMock.mockResolvedValue(null)
        const res = await GET()
        expect(res.status).toBe(403)
    })

    it('ADMIN olmayan kullanıcı için 403 döner', async () => {
        getServerSessionMock.mockResolvedValue({ user: { id: 'u1', role: 'USER' } })
        const res = await GET()
        expect(res.status).toBe(403)
    })

    it('ADMIN kullanıcı için 200 döner', async () => {
        getServerSessionMock.mockResolvedValue({ user: { id: 'admin1', role: 'ADMIN' } })
        const res = await GET()
        expect(res.status).toBe(200)
    })
})
```

- [ ] **Step 2: `admin/offers` testi**

`src/app/api/admin/offers/__tests__/route.test.ts`:
```ts
const getServerSessionMock = jest.fn()
const findManyMock = jest.fn()

jest.mock('next-auth/next', () => ({
    getServerSession: (...args: unknown[]) => getServerSessionMock(...args),
}))
jest.mock('@/lib/auth', () => ({ authOptions: {} }))
jest.mock('@/lib/prisma', () => ({
    prisma: { offer: { findMany: (...args: unknown[]) => findManyMock(...args) } },
}))

import { GET } from '../route'

describe('GET /api/admin/offers', () => {
    beforeEach(() => {
        getServerSessionMock.mockReset()
        findManyMock.mockReset().mockResolvedValue([])
    })

    it('oturum yoksa 403 döner', async () => {
        getServerSessionMock.mockResolvedValue(null)
        const res = await GET()
        expect(res.status).toBe(403)
    })

    it('ADMIN olmayan kullanıcı için 403 döner', async () => {
        getServerSessionMock.mockResolvedValue({ user: { id: 'u1', role: 'USER' } })
        const res = await GET()
        expect(res.status).toBe(403)
    })

    it('ADMIN kullanıcı için 200 döner', async () => {
        getServerSessionMock.mockResolvedValue({ user: { id: 'admin1', role: 'ADMIN' } })
        const res = await GET()
        expect(res.status).toBe(200)
    })
})
```

- [ ] **Step 3: `projects` (GET/POST) testi**

`src/app/api/projects/__tests__/route.test.ts`:
```ts
const getServerSessionMock = jest.fn()
const findManyMock = jest.fn()
const createMock = jest.fn()

jest.mock('next-auth/next', () => ({
    getServerSession: (...args: unknown[]) => getServerSessionMock(...args),
}))
jest.mock('@/lib/auth', () => ({ authOptions: {} }))
jest.mock('@/lib/prisma', () => ({
    prisma: {
        project: {
            findMany: (...args: unknown[]) => findManyMock(...args),
            create: (...args: unknown[]) => createMock(...args),
        },
    },
}))

import { GET, POST } from '../route'

function postReq(body: unknown) {
    return new Request('http://localhost/api/projects', { method: 'POST', body: JSON.stringify(body) })
}

describe('GET /api/projects', () => {
    beforeEach(() => {
        getServerSessionMock.mockReset()
        findManyMock.mockReset().mockResolvedValue([])
    })

    it('oturum yoksa 403 döner', async () => {
        getServerSessionMock.mockResolvedValue(null)
        const res = await GET()
        expect(res.status).toBe(403)
    })

    it('yalnızca oturumdaki kullanıcının projelerini sorgular (userId filtresi asla undefined olmamalı — geçmişteki IDOR regresyonu)', async () => {
        getServerSessionMock.mockResolvedValue({ user: { id: 'u1' } })
        await GET()
        expect(findManyMock).toHaveBeenCalledTimes(1)
        expect(findManyMock.mock.calls[0][0].where.userId).toBe('u1')
        expect(findManyMock.mock.calls[0][0].where.userId).not.toBeUndefined()
    })
})

describe('POST /api/projects', () => {
    beforeEach(() => {
        getServerSessionMock.mockReset()
        createMock.mockReset().mockResolvedValue({ id: 'p1' })
    })

    it('oturum yoksa 403 döner', async () => {
        getServerSessionMock.mockResolvedValue(null)
        const res = await POST(postReq({ name: 'X' }))
        expect(res.status).toBe(403)
    })

    it('userId her zaman oturumdaki kullanıcıya sabitlenir', async () => {
        getServerSessionMock.mockResolvedValue({ user: { id: 'u1' } })
        await POST(postReq({ name: 'Test Proje' }))
        expect(createMock.mock.calls[0][0].data.userId).toBe('u1')
    })
})
```

- [ ] **Step 4: Çalıştır ve doğrula**

```bash
npx jest api/admin/analytics api/admin/offers "api/projects/__tests__" --no-coverage
npx tsc --noEmit
```
Beklenen: tüm yeni testler PASS (bu route'lar zaten bugün düzeltildi, bu adım regresyon kilidi ekliyor — RED/GREEN döngüsü gerekmiyor çünkü kod zaten doğru).

- [ ] **Step 5: Tam suite**

```bash
npx jest --no-coverage
```
Beklenen: tüm testler PASS.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/admin/analytics/__tests__/ src/app/api/admin/offers/__tests__/ "src/app/api/projects/__tests__/"
git commit -m "test(auth): admin/analytics, admin/offers, projects route'ları için yetkilendirme testleri

Bugün bulunup düzeltilen 3 açığın regresyon kilidi — hiçbiri daha önce
hiçbir testte kapsanmıyordu. GET /api/projects testi özellikle
where.userId'nin asla undefined olmadığını doğruluyor (bugünkü IDOR
açığının tam olarak sebebiydi)."
```

---

## Task 13: robots.txt

**Files:**
- Create: `src/app/robots.ts`

**Interfaces:**
- Consumes: yok.
- Produces: yok (Next.js App Router özel dosyası, otomatik `/robots.txt` olarak sunulur).

- [ ] **Step 1: `src/app/robots.ts`'i yaz**

```ts
import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
    const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

    return {
        rules: {
            userAgent: "*",
            allow: "/",
            disallow: ["/dashboard", "/admin", "/inbox", "/api", "/login", "/register"],
        },
        sitemap: `${baseUrl}/sitemap.xml`,
    };
}
```

- [ ] **Step 2: Doğrula**

```bash
npx tsc --noEmit
npm run build
```
Beklenen: build çıktısında `/robots.txt` route'unun listelendiğini doğrula.

- [ ] **Step 3: Docker + dev server açıksa manuel kontrol**

```bash
curl http://localhost:3000/robots.txt
```
Beklenen: `User-Agent: *` ve `Allow: /` içeren düz metin çıktı.

- [ ] **Step 4: Commit**

```bash
git add src/app/robots.ts
git commit -m "feat(seo): robots.txt eklendi

Dashboard/admin/inbox/api/login/register dışlanıyor (kimlik gerektiren
veya indexlenmesi anlamsız sayfalar), sitemap.xml'e işaret ediyor."
```

---

## Task 14: sitemap.xml

**Files:**
- Create: `src/app/sitemap.ts`

**Interfaces:**
- Consumes: `prisma.listing.findMany` (mevcut model, `isActive: true` filtresi).
- Produces: yok (Next.js App Router özel dosyası, otomatik `/sitemap.xml` olarak sunulur).

- [ ] **Step 1: `src/app/sitemap.ts`'i yaz**

```ts
import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

    const staticRoutes: MetadataRoute.Sitemap = [
        { url: `${baseUrl}/`, changeFrequency: "daily", priority: 1 },
        { url: `${baseUrl}/hesapla`, changeFrequency: "weekly", priority: 0.9 },
        { url: `${baseUrl}/marketplace`, changeFrequency: "daily", priority: 0.9 },
    ];

    const listings = await prisma.listing.findMany({
        where: { isActive: true },
        select: { id: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 1000,
    });

    const listingRoutes: MetadataRoute.Sitemap = listings.map((l) => ({
        url: `${baseUrl}/listing/${l.id}`,
        lastModified: l.createdAt,
        changeFrequency: "weekly",
        priority: 0.7,
    }));

    return [...staticRoutes, ...listingRoutes];
}
```

- [ ] **Step 2: Doğrula**

```bash
npx tsc --noEmit
npm run build
```
Beklenen: build çıktısında `/sitemap.xml` route'unun listelendiğini doğrula (dinamik olduğu için `ƒ` işaretli, DB'ye bağlı olduğundan build-time'da statik üretilmez — bu beklenen davranıştır).

- [ ] **Step 3: Docker + dev server açıksa manuel kontrol**

```bash
docker compose -f docker-compose.dev.yml up -d
npm run dev:next
curl http://localhost:3000/sitemap.xml
```
Beklenen: geçerli XML, `<url>` girdileri arasında `/`, `/hesapla`, `/marketplace` ve varsa aktif ilanlar.

- [ ] **Step 4: Commit**

```bash
git add src/app/sitemap.ts
git commit -m "feat(seo): sitemap.xml eklendi

Statik rotalar (/, /hesapla, /marketplace) + aktif ilanlar (isActive:true,
en fazla 1000, en yeniden eskiye). DB'ye bağlı olduğu için dinamik route
olarak build ediliyor."
```

---

## Task Sırası ve Bağımlılıklar

1. Task 1 (rate limit anahtarı) — bağımsız, Task 2/4'ün ön koşulu.
2. Task 2 (forgot-password endpoint) — Task 1'e bağımlı.
3. Task 3 (login sayfası bağlama) — Task 2'ye bağımlı.
4. Task 4 (reset-password endpoint) — Task 1'e bağımlı.
5. Task 5 (reset-password sayfası) — Task 4'e bağımlı.
6. Task 6 (kayıt sonrası doğrulama e-postası) — bağımsız (Task 1-5'ten bağımsız, aynı `email.ts` dosyasını genişletiyor ama farklı fonksiyon).
7. Task 7 (doğrulama tüketim endpoint'i + sayfa) — Task 6'ya bağımlı.
8. Task 8 (hesap silme endpoint'i) — bağımsız.
9. Task 9 (veri indirme endpoint'i) — bağımsız.
10. Task 10 (profil UI) — Task 8 VE Task 9'a bağımlı.
11. Task 11 (CSP enforce) — bağımsız.
12. Task 12 (API authz test suite) — bağımsız (bugün düzeltilen kod zaten mevcut).
13. Task 13 (robots.txt) — bağımsız.
14. Task 14 (sitemap.xml) — bağımsız.

Sıra: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10 → 11 → 12 → 13 → 14 (8/9/11/12/13/14 aralarında paralel çalışılabilir ama subagent-driven-development tek implementer akışında sıralı ilerlenecek).
