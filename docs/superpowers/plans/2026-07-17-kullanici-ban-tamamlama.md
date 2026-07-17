# Kullanıcı Askıya Alma (Ban) — Eksik Backend Tamamlama Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Admin panelindeki "Askıya Al" butonunu gerçekten çalışır hale getirmek — frontend zaten tam yazılmış, eksik olan `isBanned` şema alanı, API handler desteği ve giriş engelidir.

**Architecture:** `User` modeline `isBanned Boolean @default(false)` eklenir. `PATCH /api/admin/users` bu alanı whitelist'e alır ve `isBanned: true` gönderildiğinde aynı transaction'da kullanıcının aktif ilanlarını pasife çeker. `src/lib/auth.ts`'deki NextAuth `authorize()` fonksiyonu şifre doğrulamasından sonra `isBanned` kontrolü yapıp banlı kullanıcının girişini reddeder.

**Tech Stack:** Next.js 16 API routes, Prisma ORM (PostgreSQL), NextAuth.js v4 (JWT strategy, CredentialsProvider), Jest + ts-jest.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-07-17-kullanici-ban-tamamlama-design.md` — bu plan onun uygulamasıdır, kapsam dışı maddeler (gerçek zamanlı oturum kesme, şikayet sistemi, ban notu, süreli ban) bu plana dahil DEĞİLDİR.
- Tüm kullanıcıya dönük hata/durum mesajları Türkçe olacak, mevcut dosyalardaki üslupla birebir tutarlı (örn. "Şifre yanlış.", "Kendi hesabınızı değiştiremezsiniz.").
- Migration adı tam olarak `user-ban-flag` olacak (mevcut kalıp: `faz2a-plan-approval-email` gibi kebab-case, faz öneki gerekmez çünkü bu bir faz planı değil, bağımsız bug-fix).
- Test dosyalarında proje genelinde kullanılan mock deseni korunacak: `jest.mock('@/lib/prisma', () => ({ prisma: { ... } }))` ile yalnızca kullanılan metodlar mock'lanır, `getServerSession` `next-auth/next`'ten mock'lanır.
- `PATCH /api/admin/users` handler'ındaki mevcut `role`/`isVerified`/`plan` davranışı DEĞİŞTİRİLMEYECEK — yalnızca `isBanned` desteği eklenecek.

---

## Task 1: Prisma şemasına `isBanned` alanı ekleme + migration

**Files:**
- Modify: `prisma/schema.prisma` (User modeli, `isVerified` alanının hemen altı — satır ~35 civarı)

**Interfaces:**
- Produces: `User.isBanned: boolean` (Prisma Client tipi) — Task 2 ve Task 3 bu alanı okuyup yazacak.

- [ ] **Step 1: Şemaya alanı ekle**

`prisma/schema.prisma` içinde `User` modelinde `isVerified` satırının hemen altına ekle:

```prisma
  isVerified    Boolean        @default(false)
  isBanned      Boolean        @default(false)
```

- [ ] **Step 2: Migration oluştur**

Çalıştır: `npx prisma migrate dev --name user-ban-flag`

Beklenen: Yeni bir `prisma/migrations/<timestamp>_user_ban_flag/migration.sql` dosyası oluşur, içeriğinde `ALTER TABLE "User" ADD COLUMN "isBanned" BOOLEAN NOT NULL DEFAULT false;` benzeri bir satır olur. Komut "Your database is now in sync with your schema." ile biter.

- [ ] **Step 3: Prisma Client'ın güncellendiğini doğrula**

Çalıştır: `npx prisma generate`

Beklenen: Hatasız tamamlanır ("Generated Prisma Client" mesajı).

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat(db): User modeline isBanned alanı ekle"
```

---

## Task 2: `PATCH /api/admin/users` — `isBanned` desteği + otomatik ilan pasifleştirme

**Files:**
- Modify: `src/app/api/admin/users/route.ts:39-88` (PATCH fonksiyonu)
- Test: `src/app/api/admin/users/__tests__/route.test.ts` (yeni)

**Interfaces:**
- Consumes: `prisma.user.update`, `prisma.listing.updateMany`, `prisma.$transaction` (Prisma Client — Task 1'de üretilen `isBanned` alanı dahil)
- Produces: `PATCH /api/admin/users` artık `{ userId, isBanned: boolean }` body'sini kabul eder ve `200` durumunda `{ message: string, user: User }` döner; `isBanned: true` gönderildiğinde yan etki olarak kullanıcının `isActive: true` olan tüm `Listing` kayıtlarını `isActive: false` yapar.

- [ ] **Step 1: Başarısız testi yaz**

Oluştur: `src/app/api/admin/users/__tests__/route.test.ts`

```typescript
const getServerSessionMock = jest.fn()
const userUpdateMock = jest.fn()
const listingUpdateManyMock = jest.fn()
const transactionMock = jest.fn((ops: unknown[]) => Promise.all(ops))

jest.mock('next-auth/next', () => ({
    getServerSession: (...args: unknown[]) => getServerSessionMock(...args),
}))
jest.mock('@/lib/auth', () => ({ authOptions: {} }))
jest.mock('@/lib/prisma', () => ({
    prisma: {
        user: { update: (...args: unknown[]) => userUpdateMock(...args) },
        listing: { updateMany: (...args: unknown[]) => listingUpdateManyMock(...args) },
        $transaction: (...args: unknown[]) => transactionMock(...args),
    },
}))

import { PATCH } from '../route'

function req(body: unknown) {
    return new Request('http://localhost/api/admin/users', {
        method: 'PATCH',
        body: JSON.stringify(body),
    })
}

describe('PATCH /api/admin/users — isBanned', () => {
    beforeEach(() => {
        getServerSessionMock.mockReset()
        userUpdateMock.mockReset()
        listingUpdateManyMock.mockReset()
        transactionMock.mockReset().mockImplementation((ops: unknown[]) => Promise.all(ops))
    })

    it('ADMIN olmayan istekte 403 döner', async () => {
        getServerSessionMock.mockResolvedValue({ user: { id: 'u1', role: 'USER' } })
        const res = await PATCH(req({ userId: 'target-1', isBanned: true }))
        expect(res.status).toBe(403)
    })

    it('admin kendi hesabını banlayamaz', async () => {
        getServerSessionMock.mockResolvedValue({ user: { id: 'admin-1', role: 'ADMIN' } })
        const res = await PATCH(req({ userId: 'admin-1', isBanned: true }))
        expect(res.status).toBe(400)
        const body = await res.json()
        expect(body.message).toBe('Kendi hesabınızı değiştiremezsiniz.')
    })

    it('isBanned:true gönderildiğinde kullanıcı güncellenir ve aktif ilanları pasife alınır (transaction)', async () => {
        getServerSessionMock.mockResolvedValue({ user: { id: 'admin-1', role: 'ADMIN' } })
        userUpdateMock.mockResolvedValue({ id: 'target-1', isBanned: true })
        listingUpdateManyMock.mockResolvedValue({ count: 2 })

        const res = await PATCH(req({ userId: 'target-1', isBanned: true }))

        expect(res.status).toBe(200)
        expect(transactionMock).toHaveBeenCalledTimes(1)
        expect(userUpdateMock).toHaveBeenCalledWith({
            where: { id: 'target-1' },
            data: { isBanned: true },
        })
        expect(listingUpdateManyMock).toHaveBeenCalledWith({
            where: { userId: 'target-1', isActive: true },
            data: { isActive: false },
        })
    })

    it('isBanned:false (askı kaldırma) ilanlara dokunmaz, transaction kullanmaz', async () => {
        getServerSessionMock.mockResolvedValue({ user: { id: 'admin-1', role: 'ADMIN' } })
        userUpdateMock.mockResolvedValue({ id: 'target-1', isBanned: false })

        const res = await PATCH(req({ userId: 'target-1', isBanned: false }))

        expect(res.status).toBe(200)
        expect(transactionMock).not.toHaveBeenCalled()
        expect(listingUpdateManyMock).not.toHaveBeenCalled()
        expect(userUpdateMock).toHaveBeenCalledWith({
            where: { id: 'target-1' },
            data: { isBanned: false },
        })
    })
})
```

- [ ] **Step 2: Testi çalıştırıp başarısız olduğunu doğrula**

Çalıştır: `npx jest src/app/api/admin/users/__tests__/route.test.ts`
Beklenen: FAIL — `isBanned` henüz whitelist'te olmadığı için 4 testten en az ilk üçü 403/400 bekleneni verse de son iki test `transactionMock`/`userUpdateMock` hiç çağrılmadığı için başarısız olur ("Güncellenecek alan yok" 400 dönüyor, ama test 200 bekliyor).

- [ ] **Step 3: `route.ts` PATCH fonksiyonunu güncelle**

`src/app/api/admin/users/route.ts` içindeki mevcut PATCH fonksiyonunu (satır 39-88) şununla değiştir:

```typescript
// PATCH — Kullanıcı rol/plan/isVerified/isBanned güncelle
export async function PATCH(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user?.role !== "ADMIN") {
            return NextResponse.json({ message: "Yetkisiz." }, { status: 403 });
        }

        const { userId, role, isVerified, plan, isBanned } = await req.json();

        if (!userId) {
            return NextResponse.json({ message: "userId gereklidir." }, { status: 400 });
        }

        if (userId === session.user.id && (role !== undefined || isBanned !== undefined)) {
            return NextResponse.json({ message: "Kendi hesabınızı değiştiremezsiniz." }, { status: 400 });
        }

        const data: Record<string, unknown> = {};

        if (role !== undefined) {
            const validRoles = ["USER", "ARSA_SAHIBI", "MUTEAHHIT", "DANISMAN", "ADMIN"];
            if (!validRoles.includes(role)) {
                return NextResponse.json({ message: "Geçersiz rol." }, { status: 400 });
            }
            data.role = role;
        }
        if (isVerified !== undefined) data.isVerified = isVerified;
        if (plan !== undefined) {
            if (!["FREE", "PRO"].includes(plan)) {
                return NextResponse.json({ message: "Geçersiz plan." }, { status: 400 });
            }
            data.plan = plan;
        }
        if (isBanned !== undefined) data.isBanned = Boolean(isBanned);

        if (Object.keys(data).length === 0) {
            return NextResponse.json({ message: "Güncellenecek alan yok." }, { status: 400 });
        }

        if (isBanned === true) {
            const [updatedUser] = await prisma.$transaction([
                prisma.user.update({ where: { id: userId }, data }),
                prisma.listing.updateMany({
                    where: { userId, isActive: true },
                    data: { isActive: false },
                }),
            ]);
            return NextResponse.json({ message: "Güncellendi.", user: updatedUser });
        }

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data,
        });

        return NextResponse.json({ message: "Güncellendi.", user: updatedUser });
    } catch (error) {
        console.error("Admin user update error:", error);
        return NextResponse.json({ message: "Hata oluştu." }, { status: 500 });
    }
}
```

- [ ] **Step 4: Testi çalıştırıp geçtiğini doğrula**

Çalıştır: `npx jest src/app/api/admin/users/__tests__/route.test.ts`
Beklenen: PASS — 4/4 test yeşil.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/admin/users/route.ts src/app/api/admin/users/__tests__/route.test.ts
git commit -m "feat(admin): isBanned güncellemesini kabul et ve ban'da aktif ilanları pasife al"
```

---

## Task 3: Giriş engeli — `authorize()` içinde `isBanned` kontrolü

**Files:**
- Modify: `src/lib/auth.ts:32-44`
- Test: `src/lib/auth.test.ts` (yeni)

**Interfaces:**
- Consumes: `User.isBanned` (Task 1), `prisma.user.findUnique` (mevcut)
- Produces: `authOptions.providers[0].authorize` artık `isBanned: true` olan kullanıcılar için `Error("Hesabınız askıya alınmıştır.")` fırlatır.

- [ ] **Step 1: Başarısız testi yaz**

Oluştur: `src/lib/auth.test.ts`

```typescript
const findUniqueMock = jest.fn()
const compareMock = jest.fn()

jest.mock('@/lib/prisma', () => ({
    prisma: { user: { findUnique: (...args: unknown[]) => findUniqueMock(...args) } },
}))
jest.mock('bcryptjs', () => ({ compare: (...args: unknown[]) => compareMock(...args) }))
jest.mock('@/lib/rate-limit', () => ({
    checkRateLimit: () => ({ ok: true }),
    clientIpFromHeaders: () => '127.0.0.1',
    RATE_LIMITS: { LOGIN: { limit: 5, windowMs: 60_000 } },
}))

import { authOptions } from './auth'

type Authorize = (
    credentials: { email: string; password: string } | undefined,
    req: { headers: Record<string, string> },
) => Promise<unknown>

const provider = authOptions.providers[0] as unknown as { authorize: Authorize }

describe('authorize() — isBanned kontrolü', () => {
    beforeEach(() => {
        findUniqueMock.mockReset()
        compareMock.mockReset()
    })

    it('isBanned=true olan kullanıcı giriş yapamaz', async () => {
        findUniqueMock.mockResolvedValue({
            id: 'u1', email: 'test@test.com', name: 'Test', password: 'hashed', role: 'USER', isBanned: true,
        })
        compareMock.mockResolvedValue(true)

        await expect(
            provider.authorize({ email: 'test@test.com', password: 'Test1234!' }, { headers: {} })
        ).rejects.toThrow('Hesabınız askıya alınmıştır.')
    })

    it('isBanned=false olan kullanıcı normal giriş yapar', async () => {
        findUniqueMock.mockResolvedValue({
            id: 'u1', email: 'test@test.com', name: 'Test', password: 'hashed', role: 'USER', isBanned: false,
        })
        compareMock.mockResolvedValue(true)

        const result = await provider.authorize({ email: 'test@test.com', password: 'Test1234!' }, { headers: {} })

        expect(result).toEqual({ id: 'u1', email: 'test@test.com', name: 'Test', role: 'USER' })
    })
})
```

- [ ] **Step 2: Testi çalıştırıp başarısız olduğunu doğrula**

Çalıştır: `npx jest src/lib/auth.test.ts`
Beklenen: FAIL — ilk test bekleneni fırlatmıyor çünkü `authorize()` henüz `isBanned` kontrolü yapmıyor, `bcrypt.compare` `true` döndüğü için kullanıcı objesi ile resolve olur, `rejects.toThrow` başarısız olur.

- [ ] **Step 3: `authorize()`'a ban kontrolü ekle**

`src/lib/auth.ts` içinde satır 40 (`const isPasswordValid = ...`) ile satır 42-44 (`if (!isPasswordValid) {...}`) arasına, şifre doğrulamasından SONRA ekle:

```typescript
                const isPasswordValid = await bcrypt.compare(credentials.password, user.password);

                if (!isPasswordValid) {
                    throw new Error("Şifre yanlış.");
                }

                if (user.isBanned) {
                    throw new Error("Hesabınız askıya alınmıştır.");
                }

                return {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    role: user.role,
                } as { id: string; email: string | null; name: string | null; role: string };
```

(Not: ban kontrolü şifre doğrulamasından SONRA yapılıyor — yanlış şifre girildiğinde saldırgana "bu hesap banlı" bilgisi sızdırılmasın diye şifre önce doğrulanıyor.)

- [ ] **Step 4: Testi çalıştırıp geçtiğini doğrula**

Çalıştır: `npx jest src/lib/auth.test.ts`
Beklenen: PASS — 2/2 test yeşil.

- [ ] **Step 5: Commit**

```bash
git add src/lib/auth.ts src/lib/auth.test.ts
git commit -m "feat(auth): banlı kullanıcının girişini authorize() içinde reddet"
```

---

## Task 4: Frontend — askı kaldırma senaryosu için regresyon testi

**Files:**
- Modify: `src/app/admin/users/AdminUsers.test.tsx`

**Interfaces:**
- Consumes: `AdminUsers` bileşeni (mevcut, değişmiyor — `handleBan(userId, !user.isBanned)` zaten hem ban hem unban'ı destekliyor)
- Produces: yok (yalnızca test kapsamı genişliyor)

- [ ] **Step 1: Askı kaldırma testini yaz**

`src/app/admin/users/AdminUsers.test.tsx` içindeki `describe` bloğunun sonuna (mevcut son testin hemen altına, satır 53'ten önce) ekle:

```typescript
    it('banlı kullanıcıda "Askıyı Kaldır" butonu tıklanınca PATCH isteği isBanned:false ile atılır', async () => {
        window.confirm = jest.fn(() => true)
        global.fetch = jest.fn((url: string, opts?: RequestInit) => {
            if (!opts || opts.method === undefined) {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({ users: [{ ...mockUser, isBanned: true }] }),
                }) as unknown as Promise<Response>
            }
            return Promise.resolve({ ok: true, json: () => Promise.resolve({}) }) as unknown as Promise<Response>
        }) as jest.Mock

        render(<AdminUsers />)
        await waitFor(() => expect(screen.getAllByText('Ayşe Yılmaz').length).toBeGreaterThan(0))

        const unbanButtons = screen.getAllByTitle('Askıyı Kaldır')
        fireEvent.click(unbanButtons[unbanButtons.length - 1])

        await waitFor(() => {
            const calls = (global.fetch as jest.Mock).mock.calls
            const patchCall = calls.find(c => c[1]?.method === 'PATCH' && JSON.parse(c[1].body).isBanned === false)
            expect(patchCall).toBeDefined()
        })
    })
```

- [ ] **Step 2: Testi çalıştır**

Çalıştır: `npx jest src/app/admin/users/AdminUsers.test.tsx`
Beklenen: PASS — 3/3 test yeşil. (Bu test TDD-red-green akışının dışında çünkü `handleBan` zaten hem yönü de destekliyor — amaç yeni davranış eklemek değil, mevcut davranışı regresyona karşı sabitlemek.)

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/users/AdminUsers.test.tsx
git commit -m "test(admin): askı kaldırma senaryosu için regresyon testi ekle"
```

---

## Task 5: Tam test paketini ve build'i doğrulama

**Files:**
- (değişiklik yok — yalnızca doğrulama)

- [ ] **Step 1: Tüm test paketini çalıştır**

Çalıştır: `npx jest`
Beklenen: Tüm test suite'leri PASS, önceki dosyalarda regresyon yok.

- [ ] **Step 2: TypeScript tip kontrolü**

Çalıştır: `npx tsc --noEmit`
Beklenen: Hata yok.

- [ ] **Step 3: Production build**

Çalıştır: `npm run build`
Beklenen: Build başarıyla tamamlanır (Prisma Client'ın `isBanned` alanını içerdiği doğrulanmış olur).

Bu adımda commit YOK — bu task yalnızca doğrulamadır, kod değişikliği içermez.

---

## Self-Review Notu

- **Spec kapsaması:** Spec'in 3-6. bölümlerindeki her madde (şema, API, auth, kapsam dışı kararlar) Task 1-3'te karşılanıyor; 7. bölümdeki test stratejisi Task 2-4'te karşılanıyor.
- **Placeholder taraması:** Yok — tüm adımlarda tam kod/komut var.
- **Tip tutarlılığı:** `isBanned: boolean` Task 1 (şema) → Task 2 (API `Boolean(isBanned)`) → Task 3 (auth `user.isBanned`) boyunca tutarlı; `authorize()` dönüş tipi değişmedi (`isBanned` dönüş objesine eklenmedi — spec'te de belirtilmediği için JWT/session'a taşınmıyor, yalnızca giriş anında kontrol ediliyor).
