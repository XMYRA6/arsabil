# ArsaBil Faz 1B Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** M4 Profil (iki kolon + sekmeli, bio/sosyal/rozet), M5 Bildirimler (Notification modeli + navbar polling), M6 Senaryo Karşılaştırma (PDF export + paylaşılabilir /compare/[token]) modüllerini ekle.

**Architecture:** DB migration önce → yardımcı utility + testler → API katmanı → UI. Her modül bağımsız commit'lenir. Mevcut `authOptions` pattern'i (`getServerSession(authOptions)` from `@/lib/auth`) ve CSS Modules korunur.

**Tech Stack:** Next.js 16 App Router, TypeScript, Prisma ORM (SQLite dev/PostgreSQL prod), CSS Modules, NextAuth.js, jsPDF + jspdf-autotable, Jest/ts-jest

---

## Dosya Haritası

| Dosya | İşlem | Açıklama |
|-------|-------|----------|
| `prisma/schema.prisma` | Modify | User +4 alan, Notification modeli, CompareShare modeli |
| `src/lib/notifications.ts` | Create | createNotification helper + saf yardımcı fn'ler |
| `src/lib/notifications.test.ts` | Create | Saf fonksiyon testleri |
| `src/app/api/notifications/route.ts` | Create | GET (liste) + PATCH (tümünü okundu) |
| `src/app/api/notifications/[id]/read/route.ts` | Create | PATCH tekli okundu |
| `src/app/api/messages/route.ts` | Modify | POST'a MESAJ_VAR bildirimi ekle |
| `src/app/api/offers/route.ts` | Modify | POST'a TEKLIF_GELDI bildirimi ekle |
| `src/components/layout/Navbar.tsx` | Modify | Mock kaldır, polling + Panel B UI |
| `src/app/api/user/profile/route.ts` | Create | PATCH (kendi profili güncelle) |
| `src/app/api/user/profile/[userId]/route.ts` | Create | GET public profil |
| `src/app/dashboard/profile/page.tsx` | Modify | İki kolon + sekmeli yeniden yaz |
| `src/app/dashboard/profile/profile.module.css` | Create | İki kolon layout CSS |
| `src/app/profile/[userId]/page.tsx` | Create | Public profil sayfası |
| `src/app/profile/[userId]/page.module.css` | Create | Public profil CSS |
| `src/app/api/compare/share/route.ts` | Create | POST token oluştur |
| `src/app/api/compare/[token]/route.ts` | Create | GET token → senaryo ver |
| `src/components/ScenarioCompare.tsx` | Modify | PDF + Paylaş butonları ekle |
| `src/app/compare/[token]/page.tsx` | Create | Public karşılaştırma sayfası |
| `src/app/compare/[token]/page.module.css` | Create | Public karşılaştırma CSS |

---

## Task 1: DB Schema Migrasyonu

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: User modeline 4 alan ekle**

`prisma/schema.prisma` dosyasını oku. `User` modelinde `sessions Session[]` satırından sonrasına ekle:

```prisma
  bio           String?
  linkedin      String?
  website       String?
  isVerified    Boolean        @default(false)
  notifications Notification[]
  compareShares CompareShare[]
```

- [ ] **Step 2: Notification modelini ekle**

`schema.prisma` dosyasına `Message` modelinin hemen arkasına ekle:

```prisma
model Notification {
  id        String   @id @default(cuid())
  userId    String
  type      String
  title     String
  body      String
  read      Boolean  @default(false)
  entityId  String?
  createdAt DateTime @default(now())
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

- [ ] **Step 3: CompareShare modelini ekle**

`schema.prisma` dosyasına `Notification` modelinin hemen arkasına ekle:

```prisma
model CompareShare {
  id          String   @id @default(cuid())
  token       String   @unique @default(cuid())
  userId      String
  scenarioIds String[]
  createdAt   DateTime @default(now())
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

- [ ] **Step 4: Migration çalıştır**

```bash
cd "C:\Users\emre\Desktop\arsabil-main"
npx prisma migrate dev --name faz1b-profile-notifications-compare
```

Expected output:
```
✔ Generated Prisma Client
migrations/
  └─ ..._faz1b_profile_notifications_compare/
    └─ migration.sql
```

- [ ] **Step 5: TypeScript kontrolü**

```bash
npx tsc --noEmit
```

Expected: çıktı yok (hata yok)

- [ ] **Step 6: Commit**

```bash
git add prisma/
git commit -m "feat(db): add User profile fields, Notification and CompareShare models"
```

---

## Task 2: Notification Utility + Testler

**Files:**
- Create: `src/lib/notifications.ts`
- Create: `src/lib/notifications.test.ts`

- [ ] **Step 1: Testleri yaz (önce)**

`src/lib/notifications.test.ts` dosyasını oluştur:

```typescript
import { getNotificationUrl, getNotificationIcon } from './notifications'

describe('getNotificationUrl', () => {
    it('MESAJ_VAR → /inbox?with=entityId', () =>
        expect(getNotificationUrl('MESAJ_VAR', 'abc')).toBe('/inbox?with=abc'))
    it('TEKLIF_GELDI → /listing/entityId', () =>
        expect(getNotificationUrl('TEKLIF_GELDI', 'xyz')).toBe('/listing/xyz'))
    it('ILAN_ONAYLANDI → /listing/entityId', () =>
        expect(getNotificationUrl('ILAN_ONAYLANDI', 'xyz')).toBe('/listing/xyz'))
    it('entityId yoksa boş string', () =>
        expect(getNotificationUrl('MESAJ_VAR', '')).toBe(''))
    it('bilinmeyen tip → boş string', () =>
        expect(getNotificationUrl('BILINMEYEN', 'abc')).toBe(''))
})

describe('getNotificationIcon', () => {
    it('MESAJ_VAR → 💬', () => expect(getNotificationIcon('MESAJ_VAR')).toBe('💬'))
    it('TEKLIF_GELDI → 🏷️', () => expect(getNotificationIcon('TEKLIF_GELDI')).toBe('🏷️'))
    it('ILAN_ONAYLANDI → ✅', () => expect(getNotificationIcon('ILAN_ONAYLANDI')).toBe('✅'))
    it('bilinmeyen tip → 🔔', () => expect(getNotificationIcon('BILINMEYEN')).toBe('🔔'))
})
```

- [ ] **Step 2: Testleri çalıştır — fail etmeli**

```bash
npx jest src/lib/notifications.test.ts --no-coverage 2>&1 | tail -10
```

Expected: FAIL — `Cannot find module './notifications'`

- [ ] **Step 3: notifications.ts oluştur**

`src/lib/notifications.ts` dosyasını oluştur:

```typescript
import { prisma } from './prisma'

export type NotificationType = 'MESAJ_VAR' | 'TEKLIF_GELDI' | 'ILAN_ONAYLANDI'

export function getNotificationUrl(type: string, entityId: string): string {
    if (!entityId) return ''
    if (type === 'MESAJ_VAR') return `/inbox?with=${entityId}`
    if (type === 'TEKLIF_GELDI') return `/listing/${entityId}`
    if (type === 'ILAN_ONAYLANDI') return `/listing/${entityId}`
    return ''
}

export function getNotificationIcon(type: string): string {
    if (type === 'MESAJ_VAR') return '💬'
    if (type === 'TEKLIF_GELDI') return '🏷️'
    if (type === 'ILAN_ONAYLANDI') return '✅'
    return '🔔'
}

export async function createNotification(params: {
    userId: string
    type: NotificationType
    title: string
    body: string
    entityId?: string
}): Promise<void> {
    await prisma.notification.create({
        data: {
            userId: params.userId,
            type: params.type,
            title: params.title,
            body: params.body,
            entityId: params.entityId ?? null,
            read: false,
        },
    })
}
```

- [ ] **Step 4: Testleri çalıştır — pass etmeli**

```bash
npx jest src/lib/notifications.test.ts --no-coverage 2>&1 | tail -10
```

Expected:
```
PASS src/lib/notifications.test.ts
Tests: 9 passed, 9 total
```

- [ ] **Step 5: Tüm testleri çalıştır**

```bash
npx jest --no-coverage 2>&1 | tail -6
```

Expected: 30 passed (21 eski + 9 yeni)

- [ ] **Step 6: Commit**

```bash
git add src/lib/notifications.ts src/lib/notifications.test.ts
git commit -m "feat(lib): add notification utility with url/icon helpers and createNotification"
```

---

## Task 3: Notifications API

**Files:**
- Create: `src/app/api/notifications/route.ts`
- Create: `src/app/api/notifications/[id]/read/route.ts`

- [ ] **Step 1: `src/app/api/notifications/route.ts` oluştur**

```typescript
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const userId = session.user.id as string

    const notifications = await prisma.notification.findMany({
        where: { userId },
        orderBy: [{ read: 'asc' }, { createdAt: 'desc' }],
        take: 30,
    })

    return NextResponse.json({ notifications })
}

export async function PATCH() {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const userId = session.user.id as string

    await prisma.notification.updateMany({
        where: { userId, read: false },
        data: { read: true },
    })

    return NextResponse.json({ ok: true })
}
```

- [ ] **Step 2: `src/app/api/notifications/[id]/read/route.ts` oluştur**

```typescript
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(
    _req: Request,
    { params }: { params: { id: string } }
) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const userId = session.user.id as string

    const notif = await prisma.notification.findUnique({
        where: { id: params.id },
        select: { userId: true },
    })
    if (!notif) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (notif.userId !== userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    await prisma.notification.update({ where: { id: params.id }, data: { read: true } })
    return NextResponse.json({ ok: true })
}
```

- [ ] **Step 3: TypeScript kontrolü**

```bash
npx tsc --noEmit
```

Expected: çıktı yok

- [ ] **Step 4: Commit**

```bash
git add src/app/api/notifications/
git commit -m "feat(api): add notifications endpoints — list, read-all, read-one"
```

---

## Task 4: Bildirim Tetikleyicileri (Messages + Offers)

**Files:**
- Modify: `src/app/api/messages/route.ts`
- Modify: `src/app/api/offers/route.ts`

- [ ] **Step 1: `src/app/api/messages/route.ts` dosyasını oku**

Dosyanın tam içeriğini oku. POST handler'da `message` oluştuktan sonra bildirim eklenecek.

- [ ] **Step 2: messages/route.ts POST handler'ına bildirim ekle**

`import { prisma } from '@/lib/prisma'` satırının hemen altına şunu ekle:

```typescript
import { createNotification } from '@/lib/notifications'
```

POST handler'da `return NextResponse.json(...)` satırından **önce** şunu ekle:

```typescript
        // Alıcıya bildirim oluştur (hata olursa sessizce geç)
        createNotification({
            userId: receiverId,
            type: 'MESAJ_VAR',
            title: 'Yeni mesaj',
            body: `${session.user.name || 'Biri'} size mesaj gönderdi`,
            entityId: senderId,
        }).catch(() => {})
```

- [ ] **Step 3: `src/app/api/offers/route.ts` dosyasını oku**

Dosyanın tam içeriğini oku. POST handler'da `offer` oluştuktan sonra bildirim eklenecek.

- [ ] **Step 4: offers/route.ts'e bildirim ekle**

`import { prisma }` satırının hemen altına şunu ekle:

```typescript
import { createNotification } from '@/lib/notifications'
```

POST handler'da `return NextResponse.json({ message: "Teklif başarıyla gönderildi.", offer }` satırından **önce** şunu ekle:

```typescript
        // İlan sahibine bildirim oluştur (hata olursa sessizce geç)
        createNotification({
            userId: listing.userId,
            type: 'TEKLIF_GELDI',
            title: 'Yeni teklif',
            body: `${session.user.name || 'Biri'} ilanınıza %${Number(offeredShare).toFixed(0)} pay teklifi verdi`,
            entityId: listingId,
        }).catch(() => {})
```

- [ ] **Step 5: TypeScript kontrolü**

```bash
npx tsc --noEmit
```

Expected: çıktı yok

- [ ] **Step 6: Commit**

```bash
git add src/app/api/messages/route.ts src/app/api/offers/route.ts
git commit -m "feat(api): trigger notifications on new message and new offer"
```

---

## Task 5: Navbar — Mock Kaldır, Polling + Panel B UI

**Files:**
- Modify: `src/components/layout/Navbar.tsx`

- [ ] **Step 1: `src/components/layout/Navbar.tsx` dosyasını oku**

Dosyanın tamamını oku. Mevcut `NOTIFS` array'ini, `readNotifs` state'ini ve bildirim dropdown JSX'ini not et.

- [ ] **Step 2: Import'ları güncelle**

Dosyanın en üstündeki import bloğunu bul. `useState` import'ına `useEffect, useCallback, useRef` ekle:

```typescript
import { useState, useEffect, useCallback, useRef } from "react";
```

`getNotificationIcon, getNotificationUrl` import'unu ekle (`useSession` import'unun altına):

```typescript
import { getNotificationIcon, getNotificationUrl } from '@/lib/notifications'
```

- [ ] **Step 3: State değişikliği**

Şu satırları **kaldır**:
```typescript
const [readNotifs, setReadNotifs] = useState<number[]>([]);

const NOTIFS = [
    { id: 1, icon: '📄', text: 'Raporunuz başarıyla kaydedildi', sub: 'Hesaplama · ArsaBil', time: '2dk' },
    { id: 2, icon: '💬', text: 'Ahmet Yılmaz size mesaj gönderdi', sub: 'DM Kutusu', time: '15dk' },
    { id: 3, icon: '🏪', text: 'İlanınıza yeni bir teklif geldi', sub: 'Pazar Yeri · %33 Arsa Payı', time: '1s' },
    { id: 4, icon: '📊', text: 'Proje analiziniz tamamlandı', sub: 'Finansal Modelleme', time: '3s' },
    { id: 5, icon: '🔔', text: 'ArsaBil güncellemesi hazır', sub: 'Sistem Bildirimi', time: '1g' },
];
const unreadCount = NOTIFS.filter(n => !readNotifs.includes(n.id)).length;
```

Onların yerine şu state ve tipleri ekle (`const [isMenuOpen...` satırından sonra):

```typescript
    const [notifFilter, setNotifFilter] = useState<'ALL' | 'MESAJ_VAR' | 'TEKLIF_GELDI' | 'ILAN_ONAYLANDI'>('ALL')
    const [notifications, setNotifications] = useState<Array<{
        id: string
        type: string
        title: string
        body: string
        read: boolean
        entityId: string | null
        createdAt: string
    }>>([])
    const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)

    const fetchNotifications = useCallback(async () => {
        if (!session?.user) return
        try {
            const res = await fetch('/api/notifications')
            if (res.ok) {
                const data = await res.json()
                setNotifications(data.notifications ?? [])
            }
        } catch { /* sessizce geç */ }
    }, [session?.user])

    useEffect(() => {
        if (!session?.user) return
        fetchNotifications()
        pollingRef.current = setInterval(fetchNotifications, 30_000)
        return () => { if (pollingRef.current) clearInterval(pollingRef.current) }
    }, [session?.user, fetchNotifications])

    const unreadCount = notifications.filter(n => !n.read).length

    const markAllRead = async () => {
        await fetch('/api/notifications', { method: 'PATCH' })
        setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    }

    const markOneRead = async (id: string) => {
        await fetch(`/api/notifications/${id}/read`, { method: 'PATCH' })
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
    }

    const filteredNotifs = notifFilter === 'ALL'
        ? notifications
        : notifications.filter(n => n.type === notifFilter)
```

- [ ] **Step 4: Bildirim dropdown JSX'ini değiştir**

`{/* Notification Dropdown */}` ile başlayıp kapanan `</>` bloğunu (yaklaşık satır 134–180) bul ve şununla değiştir:

```tsx
                        {/* Notification Dropdown */}
                        {isNotifOpen && (
                            <>
                                <div style={{ position: 'fixed', inset: 0, zIndex: 99 }} onClick={() => setIsNotifOpen(false)} />
                                <div style={{
                                    position: 'absolute', top: 'calc(100% + 10px)', right: 0,
                                    width: 380, maxHeight: 440,
                                    background: 'var(--panel)', border: '1px solid var(--border)',
                                    borderRadius: 16, boxShadow: '0 20px 60px rgba(0,0,0,.25)',
                                    zIndex: 100, overflow: 'hidden', display: 'flex', flexDirection: 'column',
                                }}>
                                    {/* Header */}
                                    <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                                        <span style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--card-title)' }}>Bildirimler</span>
                                        <button onClick={markAllRead} style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Tümünü Okundu İşaretle</button>
                                    </div>
                                    {/* Body: sol filtre + sağ liste */}
                                    <div style={{ display: 'flex', flex: 1, overflow: 'hidden', minHeight: 0 }}>
                                        {/* Sol filtre */}
                                        <div style={{ width: 110, borderRight: '1px solid var(--border)', padding: '8px 0', display: 'flex', flexDirection: 'column', gap: 2, flexShrink: 0 }}>
                                            {([
                                                { key: 'ALL', label: 'Tümü' },
                                                { key: 'MESAJ_VAR', label: '💬 Mesajlar' },
                                                { key: 'TEKLIF_GELDI', label: '🏷️ Teklifler' },
                                                { key: 'ILAN_ONAYLANDI', label: '✅ Sistem' },
                                            ] as const).map(f => (
                                                <button key={f.key} onClick={() => setNotifFilter(f.key)} style={{
                                                    background: notifFilter === f.key ? 'rgba(59,130,246,.1)' : 'none',
                                                    border: 'none', color: notifFilter === f.key ? 'var(--primary)' : 'var(--muted)',
                                                    fontWeight: notifFilter === f.key ? 700 : 500,
                                                    fontSize: '0.7rem', padding: '6px 10px', cursor: 'pointer',
                                                    textAlign: 'left', fontFamily: 'inherit', borderRadius: 6,
                                                    margin: '0 4px',
                                                }}>
                                                    {f.label}
                                                    {f.key !== 'ALL' && notifications.filter(n => n.type === f.key && !n.read).length > 0 && (
                                                        <span style={{ marginLeft: 4, background: 'var(--primary)', color: 'white', borderRadius: 8, padding: '1px 5px', fontSize: '0.55rem' }}>
                                                            {notifications.filter(n => n.type === f.key && !n.read).length}
                                                        </span>
                                                    )}
                                                </button>
                                            ))}
                                        </div>
                                        {/* Sağ liste */}
                                        <div style={{ flex: 1, overflowY: 'auto', maxHeight: 380 }}>
                                            {filteredNotifs.length === 0 && (
                                                <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--muted)', fontSize: '0.8rem' }}>
                                                    Bildirim yok
                                                </div>
                                            )}
                                            {filteredNotifs.map(n => (
                                                <div key={n.id}
                                                    onClick={() => {
                                                        markOneRead(n.id)
                                                        const url = getNotificationUrl(n.type, n.entityId ?? '')
                                                        if (url) { router.push(url); setIsNotifOpen(false) }
                                                    }}
                                                    style={{
                                                        padding: '10px 12px', display: 'flex', gap: 10, alignItems: 'flex-start',
                                                        cursor: 'pointer', background: n.read ? 'transparent' : 'rgba(59,130,246,.06)',
                                                        borderBottom: '1px solid var(--border)', transition: 'background 0.15s',
                                                    }}
                                                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(59,130,246,.1)')}
                                                    onMouseLeave={e => (e.currentTarget.style.background = n.read ? 'transparent' : 'rgba(59,130,246,.06)')}
                                                >
                                                    <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(59,130,246,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', flexShrink: 0 }}>
                                                        {getNotificationIcon(n.type)}
                                                    </div>
                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                        <div style={{ fontSize: '0.77rem', fontWeight: n.read ? 500 : 700, color: 'var(--card-title)', lineHeight: 1.4 }}>{n.title}</div>
                                                        <div style={{ fontSize: '0.7rem', color: 'var(--muted)', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{n.body}</div>
                                                    </div>
                                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                                                        <span style={{ fontSize: '0.6rem', color: 'var(--muted)' }}>
                                                            {new Date(n.createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                        {!n.read && <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--primary)' }} />}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}
```

- [ ] **Step 5: TypeScript kontrolü**

```bash
npx tsc --noEmit
```

Expected: çıktı yok

- [ ] **Step 6: Commit**

```bash
git add src/components/layout/Navbar.tsx
git commit -m "feat(ui): connect navbar notifications to real API with 30s polling and filter panel"
```

---

## Task 6: Profile API

**Files:**
- Create: `src/app/api/user/profile/route.ts`
- Create: `src/app/api/user/profile/[userId]/route.ts`

- [ ] **Step 1: `src/app/api/user/profile/route.ts` oluştur**

```typescript
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const userId = session.user.id as string

    const { bio, linkedin, website } = await req.json()

    const updated = await prisma.user.update({
        where: { id: userId },
        data: {
            bio: bio ?? undefined,
            linkedin: linkedin ?? undefined,
            website: website ?? undefined,
        },
        select: { id: true, name: true, bio: true, linkedin: true, website: true, isVerified: true },
    })

    return NextResponse.json(updated)
}
```

- [ ] **Step 2: `src/app/api/user/profile/[userId]/route.ts` oluştur**

```typescript
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(
    _req: Request,
    { params }: { params: { userId: string } }
) {
    const user = await prisma.user.findUnique({
        where: { id: params.userId },
        select: {
            id: true,
            name: true,
            bio: true,
            linkedin: true,
            website: true,
            isVerified: true,
            createdAt: true,
            reports: {
                orderBy: { createdAt: 'desc' },
                take: 20,
                select: { id: true, title: true, landShareRatio: true, createdAt: true },
            },
            listings: {
                where: { isActive: true },
                orderBy: { createdAt: 'desc' },
                take: 10,
                select: { id: true, title: true, city: true, price: true, isActive: true, createdAt: true },
            },
        },
    })

    if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(user)
}
```

- [ ] **Step 3: TypeScript kontrolü**

```bash
npx tsc --noEmit
```

Expected: çıktı yok

- [ ] **Step 4: Commit**

```bash
git add src/app/api/user/profile/
git commit -m "feat(api): add profile PATCH (own) and GET (public) endpoints"
```

---

## Task 7: Dashboard Profil Sayfası (İki Kolon + Sekmeler)

**Files:**
- Modify: `src/app/dashboard/profile/page.tsx`
- Create: `src/app/dashboard/profile/profile.module.css`

- [ ] **Step 1: `src/app/dashboard/profile/profile.module.css` oluştur**

```css
.container {
  max-width: 960px;
  margin: 0 auto;
  padding: 2rem 1rem 6rem;
}

.pageTitle {
  font-size: 2rem;
  font-weight: 900;
  color: var(--page-title-color);
  letter-spacing: -1px;
  margin-bottom: 2rem;
}

.layout {
  display: grid;
  grid-template-columns: 240px 1fr;
  gap: 1.5rem;
  align-items: start;
}

/* Sol kart */
.profileCard {
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 20px;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  position: sticky;
  top: 80px;
}

.avatarCircle {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--primary), #8b5cf6);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.6rem;
  font-weight: 900;
  color: white;
  margin: 0 auto;
}

.displayName {
  text-align: center;
  font-size: 1rem;
  font-weight: 800;
  color: var(--text);
  margin: 0;
}

.roleTag {
  text-align: center;
  font-size: 0.72rem;
  color: var(--muted);
  margin: -0.5rem 0 0;
}

.verifiedBadge {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  font-size: 0.7rem;
  font-weight: 700;
  color: #10a34a;
  background: rgba(16, 163, 74, 0.1);
  border-radius: 20px;
  padding: 3px 10px;
}

.fieldGroup {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.label {
  font-size: 0.68rem;
  font-weight: 700;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.input {
  padding: 0.6rem 0.875rem;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: var(--input-bg, var(--bg));
  color: var(--text);
  font-size: 0.85rem;
  font-family: inherit;
  outline: none;
  width: 100%;
  box-sizing: border-box;
  transition: border-color 0.15s;
}

.input:focus { border-color: var(--primary); }

.textarea {
  padding: 0.6rem 0.875rem;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: var(--input-bg, var(--bg));
  color: var(--text);
  font-size: 0.85rem;
  font-family: inherit;
  outline: none;
  width: 100%;
  box-sizing: border-box;
  resize: vertical;
  min-height: 80px;
  transition: border-color 0.15s;
}

.textarea:focus { border-color: var(--primary); }

.saveBtn {
  padding: 0.625rem 1rem;
  border-radius: 10px;
  background: var(--primary);
  border: none;
  color: white;
  font-weight: 700;
  font-size: 0.875rem;
  cursor: pointer;
  width: 100%;
  transition: opacity 0.15s;
}

.saveBtn:disabled { opacity: 0.5; cursor: not-allowed; }

/* Sağ sekme paneli */
.tabPanel {
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 20px;
  overflow: hidden;
}

.tabs {
  display: flex;
  border-bottom: 1px solid var(--border);
  background: var(--panel-2, var(--panel));
}

.tab {
  flex: 1;
  padding: 0.875rem 1rem;
  background: none;
  border: none;
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--muted);
  cursor: pointer;
  font-family: inherit;
  transition: color 0.15s;
  border-bottom: 2px solid transparent;
}

.tabActive {
  color: var(--primary);
  border-bottom-color: var(--primary);
}

.tabContent {
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
  min-height: 200px;
}

.emptyNote {
  color: var(--muted);
  font-size: 0.85rem;
  text-align: center;
  padding: 2rem;
}

.listRow {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 0.875rem;
  background: var(--bg);
  border-radius: 10px;
  border: 1px solid var(--border);
  gap: 0.5rem;
  text-decoration: none;
}

.listTitle {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--text);
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.listMeta {
  font-size: 0.7rem;
  color: var(--muted);
  flex-shrink: 0;
}

/* Tema grid (Ayarlar sekmesi) */
.themeGrid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.75rem;
}

.themeBtn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 0.875rem 0.5rem;
  border-radius: 12px;
  border: 2px solid var(--border);
  background: var(--bg);
  cursor: pointer;
  font-family: inherit;
  font-size: 0.75rem;
  color: var(--text);
  font-weight: 700;
  transition: border-color 0.15s;
}

.themeBtnActive { border-color: var(--primary); }

.themeColor {
  width: 32px;
  height: 32px;
  border-radius: 50%;
}

@media (max-width: 768px) {
  .layout { grid-template-columns: 1fr; }
  .profileCard { position: static; }
  .themeGrid { grid-template-columns: repeat(2, 1fr); }
}
```

- [ ] **Step 2: `src/app/dashboard/profile/page.tsx` dosyasını komple yeniden yaz**

```tsx
'use client'

import { useEffect, useState } from 'react'
import { useSession, signOut } from 'next-auth/react'
import Link from 'next/link'
import styles from './profile.module.css'

type Tab = 'portfolio' | 'listings' | 'settings'
type Theme = 'dark' | 'light' | 'sky' | 'mint' | 'sand'

const PALETTES: { id: Theme; label: string; color: string; icon: string }[] = [
    { id: 'dark',  label: 'Gece',     color: '#1f6feb', icon: '🌙' },
    { id: 'light', label: 'Gündüz',   color: '#e0e8f4', icon: '☀️' },
    { id: 'sky',   label: 'Gökyüzü',  color: '#2b7cff', icon: '☁️' },
    { id: 'mint',  label: 'Nane',     color: '#1fbf9a', icon: '🍃' },
    { id: 'sand',  label: 'Kum',      color: '#f2a23a', icon: '🏜️' },
]

interface ProfileData {
    id: string
    name: string | null
    bio: string | null
    linkedin: string | null
    website: string | null
    isVerified: boolean
    reports: { id: string; title: string; landShareRatio: number; createdAt: string }[]
    listings: { id: string; title: string | null; city: string | null; price: number | null; isActive: boolean; createdAt: string }[]
}

export default function ProfilePage() {
    const { data: session } = useSession()
    const [tab, setTab] = useState<Tab>('portfolio')
    const [profile, setProfile] = useState<ProfileData | null>(null)
    const [bio, setBio] = useState('')
    const [linkedin, setLinkedin] = useState('')
    const [website, setWebsite] = useState('')
    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)
    const [theme, setTheme] = useState<Theme>('dark')
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
        const saved = (localStorage.getItem('arsabil-theme') as Theme) || 'dark'
        setTheme(saved)
    }, [])

    useEffect(() => {
        if (!session?.user?.id) return
        fetch(`/api/user/profile/${session.user.id}`)
            .then(r => r.json())
            .then((data: ProfileData) => {
                setProfile(data)
                setBio(data.bio ?? '')
                setLinkedin(data.linkedin ?? '')
                setWebsite(data.website ?? '')
            })
    }, [session?.user?.id])

    const applyTheme = (mode: Theme) => {
        setTheme(mode)
        document.documentElement.setAttribute('data-theme', mode)
        localStorage.setItem('arsabil-theme', mode)
    }

    const handleSave = async () => {
        setSaving(true)
        const res = await fetch('/api/user/profile', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ bio: bio || null, linkedin: linkedin || null, website: website || null }),
        })
        if (res.ok) {
            const updated = await res.json()
            setProfile(prev => prev ? { ...prev, ...updated } : prev)
            setSaved(true)
            setTimeout(() => setSaved(false), 2000)
        }
        setSaving(false)
    }

    const getInitials = () => {
        if (!session?.user?.name) return 'US'
        const parts = session.user.name.trim().split(' ')
        if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
        return parts[0].substring(0, 2).toUpperCase()
    }

    if (!session || !mounted) return null

    return (
        <div className={styles.container}>
            <h1 className={styles.pageTitle}>Profilim</h1>

            <div className={styles.layout}>
                {/* Sol: Profil kartı */}
                <div className={styles.profileCard}>
                    <div className={styles.avatarCircle}>{getInitials()}</div>
                    <h2 className={styles.displayName}>{session.user?.name || 'Kullanıcı'}</h2>
                    <p className={styles.roleTag}>{(session.user as { role?: string })?.role || 'USER'}</p>

                    {profile?.isVerified && (
                        <div className={styles.verifiedBadge}>✓ Doğrulandı</div>
                    )}

                    <div className={styles.fieldGroup}>
                        <label className={styles.label}>Hakkında</label>
                        <textarea
                            className={styles.textarea}
                            placeholder="Kendinizi tanıtın..."
                            value={bio}
                            onChange={e => setBio(e.target.value)}
                            maxLength={300}
                        />
                    </div>

                    <div className={styles.fieldGroup}>
                        <label className={styles.label}>LinkedIn</label>
                        <input
                            className={styles.input}
                            placeholder="https://linkedin.com/in/..."
                            value={linkedin}
                            onChange={e => setLinkedin(e.target.value)}
                        />
                    </div>

                    <div className={styles.fieldGroup}>
                        <label className={styles.label}>Website</label>
                        <input
                            className={styles.input}
                            placeholder="https://..."
                            value={website}
                            onChange={e => setWebsite(e.target.value)}
                        />
                    </div>

                    <button className={styles.saveBtn} onClick={handleSave} disabled={saving}>
                        {saved ? '✓ Kaydedildi' : saving ? 'Kaydediliyor...' : 'Kaydet'}
                    </button>

                    <button
                        onClick={() => signOut()}
                        style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--muted)', borderRadius: 10, padding: '0.5rem', fontSize: '0.8rem', cursor: 'pointer', fontFamily: 'inherit' }}
                    >
                        Çıkış Yap
                    </button>
                </div>

                {/* Sağ: Sekmeli panel */}
                <div className={styles.tabPanel}>
                    <div className={styles.tabs}>
                        {([
                            { key: 'portfolio', label: 'Portfolyo' },
                            { key: 'listings',  label: 'İlanlarım' },
                            { key: 'settings',  label: 'Tema & Ayarlar' },
                        ] as const).map(t => (
                            <button
                                key={t.key}
                                className={`${styles.tab} ${tab === t.key ? styles.tabActive : ''}`}
                                onClick={() => setTab(t.key)}
                            >
                                {t.label}
                            </button>
                        ))}
                    </div>

                    <div className={styles.tabContent}>
                        {tab === 'portfolio' && (
                            profile?.reports && profile.reports.length > 0 ? profile.reports.map(r => (
                                <Link key={r.id} href={`/hesapla?reportId=${r.id}`} className={styles.listRow}>
                                    <span className={styles.listTitle}>{r.title}</span>
                                    <span className={styles.listMeta}>Arsa payı: %{(r.landShareRatio * 100).toFixed(0)}</span>
                                </Link>
                            )) : (
                                <p className={styles.emptyNote}>Henüz hesaplama yok. <Link href="/hesapla" style={{ color: 'var(--primary)' }}>Hesapla →</Link></p>
                            )
                        )}

                        {tab === 'listings' && (
                            profile?.listings && profile.listings.length > 0 ? profile.listings.map(l => (
                                <Link key={l.id} href={`/listing/${l.id}`} className={styles.listRow}>
                                    <span className={styles.listTitle}>{l.title || 'İsimsiz İlan'}</span>
                                    <span className={styles.listMeta}>{l.city || '—'} · {l.price ? l.price.toLocaleString('tr-TR') + ' ₺' : 'Fiyat yok'}</span>
                                </Link>
                            )) : (
                                <p className={styles.emptyNote}>Aktif ilan yok. <Link href="/listings/new" style={{ color: 'var(--primary)' }}>İlan Oluştur →</Link></p>
                            )
                        )}

                        {tab === 'settings' && (
                            <div className={styles.themeGrid}>
                                {PALETTES.map(p => (
                                    <button
                                        key={p.id}
                                        className={`${styles.themeBtn} ${theme === p.id ? styles.themeBtnActive : ''}`}
                                        onClick={() => applyTheme(p.id)}
                                    >
                                        <div className={styles.themeColor} style={{ background: p.color }} />
                                        {p.icon} {p.label}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
```

- [ ] **Step 3: TypeScript kontrolü**

```bash
npx tsc --noEmit
```

Expected: çıktı yok

- [ ] **Step 4: Commit**

```bash
git add src/app/dashboard/profile/
git commit -m "feat(ui): redesign profile page with two-column + tabs layout"
```

---

## Task 8: Public Profil Sayfası

**Files:**
- Create: `src/app/profile/[userId]/page.tsx`
- Create: `src/app/profile/[userId]/page.module.css`

- [ ] **Step 1: `src/app/profile/[userId]/page.module.css` oluştur**

```css
.container {
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem 1rem 6rem;
}

.header {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 20px;
  padding: 1.5rem 2rem;
  margin-bottom: 1.5rem;
}

.avatarCircle {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--primary), #8b5cf6);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.4rem;
  font-weight: 900;
  color: white;
  flex-shrink: 0;
}

.name {
  font-size: 1.4rem;
  font-weight: 900;
  color: var(--text);
  margin: 0 0 4px;
}

.bio {
  font-size: 0.875rem;
  color: var(--muted);
  margin: 0 0 8px;
}

.links {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.link {
  font-size: 0.78rem;
  color: var(--primary);
  text-decoration: none;
  font-weight: 700;
}

.verifiedBadge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.7rem;
  font-weight: 700;
  color: #10a34a;
  background: rgba(16,163,74,.1);
  border-radius: 20px;
  padding: 2px 10px;
  margin-left: 8px;
}

.section {
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 1.25rem;
  margin-bottom: 1rem;
}

.sectionTitle {
  font-size: 0.72rem;
  font-weight: 800;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.07em;
  margin: 0 0 0.875rem;
}

.listRow {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.625rem 0.75rem;
  background: var(--bg);
  border-radius: 8px;
  border: 1px solid var(--border);
  margin-bottom: 6px;
  text-decoration: none;
}

.listTitle {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--text);
}

.listMeta {
  font-size: 0.7rem;
  color: var(--muted);
}

.ctaBtn {
  display: inline-block;
  margin-top: 1.5rem;
  padding: 0.75rem 2rem;
  background: var(--primary);
  color: white;
  border-radius: 12px;
  font-weight: 800;
  text-decoration: none;
  font-size: 0.9rem;
}
```

- [ ] **Step 2: `src/app/profile/[userId]/page.tsx` oluştur**

```tsx
import Link from 'next/link'
import { notFound } from 'next/navigation'
import styles from './page.module.css'

interface ProfileData {
    id: string
    name: string | null
    bio: string | null
    linkedin: string | null
    website: string | null
    isVerified: boolean
    reports: { id: string; title: string; landShareRatio: number; createdAt: string }[]
    listings: { id: string; title: string | null; city: string | null; price: number | null; isActive: boolean }[]
}

async function getProfile(userId: string): Promise<ProfileData | null> {
    try {
        const base = process.env.NEXTAUTH_URL || 'http://localhost:3000'
        const res = await fetch(`${base}/api/user/profile/${userId}`, { cache: 'no-store' })
        if (!res.ok) return null
        return res.json()
    } catch {
        return null
    }
}

function getInitials(name: string | null) {
    if (!name) return 'US'
    const parts = name.trim().split(' ')
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
    return parts[0].substring(0, 2).toUpperCase()
}

export default async function PublicProfilePage({ params }: { params: { userId: string } }) {
    const profile = await getProfile(params.userId)
    if (!profile) notFound()

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div className={styles.avatarCircle}>{getInitials(profile.name)}</div>
                <div>
                    <h1 className={styles.name}>
                        {profile.name || 'Kullanıcı'}
                        {profile.isVerified && <span className={styles.verifiedBadge}>✓ Doğrulandı</span>}
                    </h1>
                    {profile.bio && <p className={styles.bio}>{profile.bio}</p>}
                    <div className={styles.links}>
                        {profile.linkedin && <a href={profile.linkedin} target="_blank" rel="noopener noreferrer" className={styles.link}>🔗 LinkedIn</a>}
                        {profile.website && <a href={profile.website} target="_blank" rel="noopener noreferrer" className={styles.link}>🌐 Website</a>}
                    </div>
                </div>
            </div>

            {profile.reports.length > 0 && (
                <div className={styles.section}>
                    <h2 className={styles.sectionTitle}>Portfolyo ({profile.reports.length} proje)</h2>
                    {profile.reports.map(r => (
                        <div key={r.id} className={styles.listRow}>
                            <span className={styles.listTitle}>{r.title}</span>
                            <span className={styles.listMeta}>Arsa payı: %{(r.landShareRatio * 100).toFixed(0)}</span>
                        </div>
                    ))}
                </div>
            )}

            {profile.listings.length > 0 && (
                <div className={styles.section}>
                    <h2 className={styles.sectionTitle}>Aktif İlanlar ({profile.listings.length})</h2>
                    {profile.listings.map(l => (
                        <Link key={l.id} href={`/listing/${l.id}`} className={styles.listRow}>
                            <span className={styles.listTitle}>{l.title || 'İsimsiz İlan'}</span>
                            <span className={styles.listMeta}>{l.city || '—'} · {l.price ? l.price.toLocaleString('tr-TR') + ' ₺' : ''}</span>
                        </Link>
                    ))}
                </div>
            )}

            <Link href="/marketplace" className={styles.ctaBtn}>Marketplace'e Göz At →</Link>
        </div>
    )
}
```

- [ ] **Step 3: TypeScript kontrolü**

```bash
npx tsc --noEmit
```

Expected: çıktı yok

- [ ] **Step 4: Commit**

```bash
git add src/app/profile/
git commit -m "feat(ui): add public profile page /profile/[userId]"
```

---

## Task 9: CompareShare API

**Files:**
- Create: `src/app/api/compare/share/route.ts`
- Create: `src/app/api/compare/[token]/route.ts`

- [ ] **Step 1: `src/app/api/compare/share/route.ts` oluştur**

```typescript
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const userId = session.user.id as string

    const { scenarioIds } = await req.json()
    if (!Array.isArray(scenarioIds) || scenarioIds.length < 2) {
        return NextResponse.json({ error: 'En az 2 senaryo ID gerekli' }, { status: 400 })
    }

    // scenarioIds'lerin bu kullanıcıya ait olduğunu doğrula
    const scenarios = await prisma.scenario.findMany({
        where: { id: { in: scenarioIds }, project: { userId } },
        select: { id: true },
    })
    if (scenarios.length !== scenarioIds.length) {
        return NextResponse.json({ error: 'Geçersiz senaryo ID' }, { status: 403 })
    }

    const share = await prisma.compareShare.create({
        data: { userId, scenarioIds },
        select: { token: true },
    })

    return NextResponse.json({ token: share.token }, { status: 201 })
}
```

- [ ] **Step 2: `src/app/api/compare/[token]/route.ts` oluştur**

```typescript
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(
    _req: Request,
    { params }: { params: { token: string } }
) {
    const share = await prisma.compareShare.findUnique({
        where: { token: params.token },
        select: { scenarioIds: true, createdAt: true },
    })

    if (!share) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const scenarios = await prisma.scenario.findMany({
        where: { id: { in: share.scenarioIds } },
    })

    // Orijinal sırayı koru
    const ordered = share.scenarioIds
        .map(id => scenarios.find(s => s.id === id))
        .filter(Boolean)

    return NextResponse.json({ scenarios: ordered, createdAt: share.createdAt })
}
```

- [ ] **Step 3: TypeScript kontrolü**

```bash
npx tsc --noEmit
```

Expected: çıktı yok

- [ ] **Step 4: Commit**

```bash
git add src/app/api/compare/
git commit -m "feat(api): add compare share token endpoints — create and resolve"
```

---

## Task 10: ScenarioCompare — PDF + Paylaş Butonları

**Files:**
- Modify: `src/components/ScenarioCompare.tsx`

- [ ] **Step 1: `src/components/ScenarioCompare.tsx` dosyasını oku**

Dosyanın tamamını oku. `Scenario` interface'ini ve mevcut `return (...)` bloğunu not et.

- [ ] **Step 2: Props interface'i ve import'ları güncelle**

Dosyanın en üstüne import ekle:

```typescript
import { useState } from 'react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
```

`Props` interface'ini şununla değiştir:

```typescript
interface Props {
    scenarios: Scenario[];
    onShareRequest?: (ids: string[]) => Promise<string | null>
}
```

Bileşen imzasını güncelle:

```typescript
export const ScenarioCompare: React.FC<Props> = ({ scenarios, onShareRequest }) => {
```

- [ ] **Step 3: State ve fonksiyonları ekle**

`bestIdx` tanımından sonra şunu ekle:

```typescript
    const [shareUrl, setShareUrl] = useState<string | null>(null)
    const [sharing, setSharing] = useState(false)
    const [copied, setCopied] = useState(false)

    const handlePdf = () => {
        const doc = new jsPDF()
        doc.setFontSize(14)
        doc.text('ArsaBil — Senaryo Karşılaştırma', 14, 18)
        doc.setFontSize(9)
        doc.text(`Oluşturulma: ${new Date().toLocaleDateString('tr-TR')}`, 14, 25)
        autoTable(doc, {
            startY: 30,
            head: [['Parametre', ...scenarios.map(s => s.name)]],
            body: rows.map(r => [r.label, ...r.values]),
            styles: { fontSize: 8 },
            headStyles: { fillColor: [59, 130, 246] },
        })
        const dateStr = new Date().toISOString().slice(0, 10)
        doc.save(`arsabil-karsilastirma-${dateStr}.pdf`)
    }

    const handleShare = async () => {
        if (!onShareRequest) return
        setSharing(true)
        const url = await onShareRequest(scenarios.map(s => s.id))
        setShareUrl(url)
        setSharing(false)
    }

    const handleCopy = () => {
        if (!shareUrl) return
        navigator.clipboard.writeText(shareUrl)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }
```

- [ ] **Step 4: JSX'e butonları ekle**

`return (` bloğundaki en dıştaki `<div style={{ overflowX: 'auto' }}>` öncesine şu butonu ekle:

```tsx
    return (
        <div>
            {/* Aksiyon butonları */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.875rem', flexWrap: 'wrap' }}>
                <button onClick={handlePdf} style={{
                    padding: '0.5rem 1rem', borderRadius: 8, background: 'var(--panel)',
                    border: '1px solid var(--border)', color: 'var(--text)', cursor: 'pointer',
                    fontSize: '0.8rem', fontWeight: 700, fontFamily: 'inherit',
                }}>
                    📄 PDF İndir
                </button>
                {onShareRequest && (
                    <button onClick={handleShare} disabled={sharing} style={{
                        padding: '0.5rem 1rem', borderRadius: 8, background: 'var(--panel)',
                        border: '1px solid var(--border)', color: 'var(--text)', cursor: sharing ? 'not-allowed' : 'pointer',
                        fontSize: '0.8rem', fontWeight: 700, fontFamily: 'inherit', opacity: sharing ? 0.6 : 1,
                    }}>
                        {sharing ? 'Link oluşturuluyor...' : '🔗 Paylaş'}
                    </button>
                )}
            </div>
            {shareUrl && (
                <div style={{
                    display: 'flex', gap: 8, alignItems: 'center', padding: '0.625rem 0.875rem',
                    background: 'rgba(59,130,246,.07)', border: '1px solid rgba(59,130,246,.2)',
                    borderRadius: 10, marginBottom: '0.875rem',
                }}>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{shareUrl}</span>
                    <button onClick={handleCopy} style={{
                        padding: '3px 10px', borderRadius: 6, background: 'var(--primary)', border: 'none',
                        color: 'white', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer', flexShrink: 0, fontFamily: 'inherit',
                    }}>
                        {copied ? '✓ Kopyalandı' : 'Kopyala'}
                    </button>
                </div>
            )}
            <div style={{ overflowX: 'auto' }}>
```

Ve en sondaki kapanış `</div>` önüne fazladan `</div>` ekle:

```tsx
            </div>
        </div>
    )
```

- [ ] **Step 5: `onShareRequest` prop'unu hesapla/page.tsx'e bağla**

`src/app/hesapla/page.tsx` dosyasını oku. `<ScenarioCompare scenarios={savedScenarios} />` satırını bul ve şununla değiştir:

```tsx
<ScenarioCompare
    scenarios={savedScenarios}
    onShareRequest={async (ids) => {
        const res = await fetch('/api/compare/share', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ scenarioIds: ids }),
        })
        if (!res.ok) return null
        const { token } = await res.json()
        return `${window.location.origin}/compare/${token}`
    }}
/>
```

`src/app/dashboard/projects/page.tsx` dosyasında da `<ScenarioCompare scenarios={project.scenarios} />` satırını bul ve aynı şekilde değiştir.

- [ ] **Step 6: TypeScript kontrolü**

```bash
npx tsc --noEmit
```

Expected: çıktı yok

- [ ] **Step 7: Commit**

```bash
git add src/components/ScenarioCompare.tsx src/app/hesapla/page.tsx src/app/dashboard/projects/page.tsx
git commit -m "feat(ui): add PDF export and share link to ScenarioCompare component"
```

---

## Task 11: Public Compare Sayfası

**Files:**
- Create: `src/app/compare/[token]/page.tsx`
- Create: `src/app/compare/[token]/page.module.css`

- [ ] **Step 1: `src/app/compare/[token]/page.module.css` oluştur**

```css
.container {
  max-width: 900px;
  margin: 0 auto;
  padding: 2rem 1rem 6rem;
}

.header {
  margin-bottom: 1.5rem;
}

.title {
  font-size: 1.75rem;
  font-weight: 900;
  color: var(--text);
  letter-spacing: -0.5px;
  margin: 0 0 6px;
}

.subtitle {
  font-size: 0.85rem;
  color: var(--muted);
  margin: 0;
}

.card {
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 20px;
  padding: 1.5rem;
}

.cta {
  margin-top: 1.5rem;
  text-align: center;
}

.ctaBtn {
  display: inline-block;
  padding: 0.75rem 2rem;
  background: var(--primary);
  color: white;
  border-radius: 12px;
  font-weight: 800;
  text-decoration: none;
  font-size: 0.9rem;
}

.notFound {
  text-align: center;
  padding: 4rem 1rem;
  color: var(--muted);
}
```

- [ ] **Step 2: `src/app/compare/[token]/page.tsx` oluştur**

```tsx
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ScenarioCompare } from '@/components/ScenarioCompare'
import styles from './page.module.css'

interface Scenario {
    id: string
    name: string
    luxLevel: number
    apartmentSize: number
    landShareRatio: number
    totalApartments: number | null
    riskLevel: number
    builderProfit: number
    fdTotal: number
    fdPerM2: number
    mi: number
    ma: number
    totalCost: number
    fa: number | null
    sdx: number | null
}

async function getCompare(token: string): Promise<{ scenarios: Scenario[]; createdAt: string } | null> {
    try {
        const base = process.env.NEXTAUTH_URL || 'http://localhost:3000'
        const res = await fetch(`${base}/api/compare/${token}`, { cache: 'no-store' })
        if (!res.ok) return null
        return res.json()
    } catch {
        return null
    }
}

export default async function ComparePage({ params }: { params: { token: string } }) {
    const data = await getCompare(params.token)
    if (!data) notFound()

    const dateStr = new Date(data.createdAt).toLocaleDateString('tr-TR', {
        day: 'numeric', month: 'long', year: 'numeric',
    })

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1 className={styles.title}>Senaryo Karşılaştırması</h1>
                <p className={styles.subtitle}>{data.scenarios.length} senaryo · {dateStr} tarihinde paylaşıldı</p>
            </div>

            <div className={styles.card}>
                <ScenarioCompare scenarios={data.scenarios} />
            </div>

            <div className={styles.cta}>
                <Link href="/hesapla" className={styles.ctaBtn}>ArsaBil&apos;de Kendi Hesabını Yap →</Link>
            </div>
        </div>
    )
}
```

- [ ] **Step 3: TypeScript kontrolü**

```bash
npx tsc --noEmit
```

Expected: çıktı yok

- [ ] **Step 4: Tüm testleri çalıştır**

```bash
npx jest --no-coverage 2>&1 | tail -6
```

Expected: 30 passed

- [ ] **Step 5: Commit**

```bash
git add src/app/compare/
git commit -m "feat(ui): add public compare page /compare/[token]"
```

---

## Özet

| Task | Modül | Commit |
|------|-------|--------|
| 1 | DB Migration | `feat(db): add User profile fields, Notification and CompareShare models` |
| 2 | Notification utility | `feat(lib): add notification utility with url/icon helpers` |
| 3 | Notifications API | `feat(api): add notifications endpoints` |
| 4 | Bildirim tetikleyicileri | `feat(api): trigger notifications on new message and new offer` |
| 5 | Navbar polling | `feat(ui): connect navbar notifications to real API` |
| 6 | Profile API | `feat(api): add profile PATCH and GET endpoints` |
| 7 | Dashboard profil UI | `feat(ui): redesign profile page with two-column + tabs` |
| 8 | Public profil | `feat(ui): add public profile page /profile/[userId]` |
| 9 | CompareShare API | `feat(api): add compare share token endpoints` |
| 10 | ScenarioCompare butonları | `feat(ui): add PDF export and share link to ScenarioCompare` |
| 11 | Public compare | `feat(ui): add public compare page /compare/[token]` |
