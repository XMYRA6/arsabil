# ArsaBil Faz 1A — Müşteri UI Çekirdek Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dashboard yenileme, mesajlaşma UI'ını gerçek API'a bağlama ve 5 adımlı ilan oluşturma wizard'ı ekle.

**Architecture:** DB schema önce → API katmanı → UI. Her task bağımsız commit'lenir. Mevcut inbox UI'ı (güzel tasarımlı) korunur, sadece mock data gerçek API'a bağlanır.

**Tech Stack:** Next.js 16 App Router, TypeScript, Prisma ORM (PostgreSQL), CSS Modules, NextAuth.js (session.user.id pattern), Jest/ts-jest

---

## Dosya Haritası

| Dosya | İşlem | Açıklama |
|-------|--------|----------|
| `prisma/schema.prisma` | Modify | Message.read + Listing yeni alanlar |
| `src/app/api/user/dashboard/route.ts` | Modify | Stats + recentMessages ekle |
| `src/app/dashboard/page.tsx` | Modify | Komple yeniden yaz |
| `src/app/dashboard/page.module.css` | Modify | Yeni layout CSS |
| `src/app/api/messages/route.ts` | Modify | Güvenlik fix + konuşma gruplandırma |
| `src/app/api/messages/[userId]/route.ts` | Create | İki kullanıcı arası mesajlar |
| `src/app/api/messages/[id]/read/route.ts` | Create | Okundu işareti |
| `src/app/inbox/page.tsx` | Modify | Mock data → gerçek API |
| `src/lib/upload.ts` | Create | Dosya doğrulama utilities |
| `src/lib/upload.test.ts` | Create | Upload utility testleri |
| `src/app/api/upload/route.ts` | Create | Dosya yükleme endpoint |
| `src/app/api/listings/route.ts` | Modify | reportId opsiyonel + yeni alanlar |
| `src/components/listing-wizard/types.ts` | Create | WizardFormData tip tanımı |
| `src/components/listing-wizard/wizard.module.css` | Create | Wizard bileşen stilleri |
| `src/components/listing-wizard/WizardProgress.tsx` | Create | Adım ilerleme çubuğu |
| `src/components/listing-wizard/WizardStep1Location.tsx` | Create | Konum adımı |
| `src/components/listing-wizard/WizardStep2Detail.tsx` | Create | Arsa detay adımı |
| `src/components/listing-wizard/WizardStep3Photos.tsx` | Create | Fotoğraf yükleme adımı |
| `src/components/listing-wizard/WizardStep4Feasibility.tsx` | Create | Fizibilite bağlama adımı |
| `src/components/listing-wizard/WizardStep5Preview.tsx` | Create | Önizle & yayınla adımı |
| `src/app/listings/new/page.tsx` | Create | Wizard ana sayfası |
| `src/app/listings/new/page.module.css` | Create | Wizard sayfa stilleri |

---

## Task 1: DB Schema Migrasyonu

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Message modeline read flag ekle**

`prisma/schema.prisma` içinde Message modelini bul. `createdAt` satırının altına ekle:

```prisma
model Message {
  id         String   @id @default(cuid())
  content    String
  reportId   String?
  senderId   String
  receiverId String
  read       Boolean  @default(false)
  createdAt  DateTime @default(now())
  receiver   User     @relation("ReceivedMessages", fields: [receiverId], references: [id])
  sender     User     @relation("SentMessages", fields: [senderId], references: [id])
}
```

- [ ] **Step 2: Listing modeline yeni alanları ekle**

`prisma/schema.prisma` içinde Listing modelini bul. Mevcut `reportId String @unique` satırını `reportId String? @unique` olarak değiştir (String → String? — nullable). Ardından `isActive` satırının altına yeni alanları ekle:

```prisma
model Listing {
  id          String   @id @default(cuid())
  reportId    String?  @unique
  userId      String
  city        String?
  district    String?
  notes       String?
  isActive    Boolean  @default(true)
  title       String?
  address     String?
  phone       String?
  description String?
  price       Float?
  landSizeSqm Float?
  zoning      String?
  titleDeed   String?
  photos      String[] @default([])
  createdAt   DateTime @default(now())
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  report      Report?  @relation(fields: [reportId], references: [id], onDelete: Cascade)
  offers      Offer[]
}
```

Not: `Report.listing` relation'ı da `Listing?`'den `Listing?`'e değişmez (zaten optional), ama `report` field'ı `Listing`'de `Report?` olur çünkü artık reportId nullable.

- [ ] **Step 3: Migration çalıştır**

```bash
npx prisma migrate dev --name faz1a-listing-message-updates
```

Expected output:
```
✔ Generated Prisma Client
The following migration(s) have been created and applied from new schema changes:
migrations/
  └─ 20260607XXXXXX_faz1a_listing_message_updates/
    └─ migration.sql
```

- [ ] **Step 4: Prisma client yenile**

```bash
npx prisma generate
```

- [ ] **Step 5: TypeScript kontrolü**

```bash
npx tsc --noEmit
```

Expected: no output (no errors)

- [ ] **Step 6: Commit**

```bash
git add prisma/
git commit -m "feat(db): add Message.read flag and new Listing fields for Faz 1A"
```

---

## Task 2: Dashboard API Zenginleştirme

**Files:**
- Modify: `src/app/api/user/dashboard/route.ts`

- [ ] **Step 1: Dosyayı oku**

`src/app/api/user/dashboard/route.ts` dosyasını oku, mevcut yapıyı anla. (Zaten `session.user.id` kullanıyor.)

- [ ] **Step 2: Route'u güncelle**

Mevcut içeriği aşağıdakiyle değiştir:

```typescript
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { prisma } from "@/lib/prisma";

export async function GET() {
    const session = await getServerSession();
    if (!session?.user?.id) {
        return NextResponse.json({ message: "Yetkisiz erişim." }, { status: 403 });
    }

    const userId = session.user.id as string;

    const [
        reportCount,
        activeListingCount,
        offerCount,
        unreadMessageCount,
        recentReports,
        recentMessages,
        recentOffers,
    ] = await Promise.all([
        prisma.report.count({ where: { userId } }),
        prisma.listing.count({ where: { userId, isActive: true } }),
        prisma.offer.count({ where: { listing: { userId } } }),
        prisma.message.count({ where: { receiverId: userId, read: false } }),
        prisma.report.findMany({
            where: { userId },
            orderBy: { createdAt: "desc" },
            take: 5,
            select: {
                id: true,
                title: true,
                createdAt: true,
                landShareRatio: true,
                minApartmentPrice: true,
            },
        }),
        prisma.message.findMany({
            where: { receiverId: userId },
            orderBy: { createdAt: "desc" },
            take: 3,
            include: {
                sender: { select: { id: true, name: true, image: true } },
            },
        }),
        prisma.offer.findMany({
            where: { listing: { userId } },
            orderBy: { createdAt: "desc" },
            take: 3,
            include: {
                listing: { select: { id: true, title: true, city: true } },
                bidder: { select: { id: true, name: true } },
            },
        }),
    ]);

    return NextResponse.json({
        stats: { reportCount, activeListingCount, offerCount, unreadMessageCount },
        recentReports,
        recentMessages,
        recentOffers,
    });
}
```

- [ ] **Step 3: TypeScript kontrolü**

```bash
npx tsc --noEmit
```

Expected: no output

- [ ] **Step 4: Commit**

```bash
git add src/app/api/user/dashboard/route.ts
git commit -m "feat(api): enrich dashboard with stats + recent reports/messages/offers"
```

---

## Task 3: Dashboard UI

**Files:**
- Modify: `src/app/dashboard/page.tsx`
- Modify (veya Create): `src/app/dashboard/page.module.css`

- [ ] **Step 1: Mevcut dosyaları oku**

`src/app/dashboard/page.tsx` ve `src/app/dashboard/page.module.css` (varsa) dosyalarını oku.

- [ ] **Step 2: page.module.css oluştur/güncelle**

`src/app/dashboard/page.module.css` içeriğini aşağıdakiyle değiştir:

```css
.container {
  max-width: 1100px;
  margin: 0 auto;
  padding: 2rem 1rem 6rem;
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.loading {
  text-align: center;
  color: var(--muted);
  padding: 4rem;
}

.pageTitle {
  font-size: 2rem;
  font-weight: 900;
  color: var(--page-title-color);
  letter-spacing: -1px;
  margin: 0;
}

.welcome {
  color: var(--muted);
  font-size: 1rem;
  margin: -1.5rem 0 0;
}

.statsGrid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
}

.statCard {
  border-radius: 16px;
  padding: 1.25rem 1rem;
  text-align: center;
  background: rgba(var(--card-accent-rgb, 59, 130, 246), 0.08);
  border: 1px solid rgba(var(--card-accent-rgb, 59, 130, 246), 0.2);
}

.statValue {
  font-size: 2rem;
  font-weight: 900;
  line-height: 1;
  margin-bottom: 0.4rem;
}

.statLabel {
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.twoCol {
  display: grid;
  grid-template-columns: 1.4fr 1fr;
  gap: 1.5rem;
  align-items: start;
}

.rightCol {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.section {
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 1.25rem;
}

.sectionHeader {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.sectionTitle {
  font-size: 0.75rem;
  font-weight: 800;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.07em;
  margin: 0;
}

.sectionLink {
  font-size: 0.8rem;
  color: var(--primary);
  text-decoration: none;
  font-weight: 700;
}

.empty {
  color: var(--muted);
  font-size: 0.85rem;
}

.empty a {
  color: var(--primary);
  text-decoration: none;
  font-weight: 700;
}

.reportList, .messageList, .offerList {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.reportRow {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 0.875rem;
  background: var(--bg);
  border-radius: 10px;
  border: 1px solid var(--border);
  gap: 0.5rem;
}

.reportInfo {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.reportTitle {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.reportMeta {
  font-size: 0.7rem;
  color: var(--muted);
}

.reportActions {
  display: flex;
  gap: 0.25rem;
  align-items: center;
  flex-shrink: 0;
}

.actionLink {
  font-size: 0.75rem;
  color: var(--primary);
  text-decoration: none;
  font-weight: 700;
}

.actionDivider {
  color: var(--border);
  font-size: 0.75rem;
}

.messageRow {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 0.625rem 0.75rem;
  background: var(--bg);
  border-radius: 10px;
  border: 1px solid var(--border);
  text-decoration: none;
  transition: border-color 0.15s;
}

.messageRow:hover { border-color: var(--primary); }

.messageSender {
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--text);
}

.messagePreview {
  font-size: 0.72rem;
  color: var(--muted);
}

.offerRow {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 0.75rem;
  background: var(--bg);
  border-radius: 10px;
  border: 1px solid var(--border);
  text-decoration: none;
  font-size: 0.78rem;
  transition: border-color 0.15s;
}

.offerRow:hover { border-color: var(--primary); }

.offerAmount { font-weight: 800; color: var(--primary); flex-shrink: 0; }

.offerListing {
  flex: 1;
  color: var(--muted);
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.offerStatus {
  font-size: 0.65rem;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 20px;
  flex-shrink: 0;
}

.statusPending  { background: rgba(245,158,11,.12); color: #f59e0b; }
.statusAccepted { background: rgba(16,163,74,.12);  color: #10a34a; }
.statusRejected { background: rgba(239,68,68,.12);  color: #ef4444; }

.quickActions {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.qaBtn {
  padding: 0.625rem 1.25rem;
  border-radius: 10px;
  background: var(--panel);
  border: 1px solid var(--border);
  color: var(--text);
  font-size: 0.875rem;
  font-weight: 700;
  text-decoration: none;
  transition: border-color 0.15s, background 0.15s;
}

.qaBtn:hover {
  border-color: var(--primary);
  background: var(--panel-2);
}

@media (max-width: 768px) {
  .statsGrid { grid-template-columns: repeat(2, 1fr); }
  .twoCol { grid-template-columns: 1fr; }
}
```

- [ ] **Step 3: page.tsx'i yeniden yaz**

`src/app/dashboard/page.tsx` içeriğini aşağıdakiyle değiştir:

```tsx
'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import styles from './page.module.css'

interface DashboardData {
  stats: {
    reportCount: number
    activeListingCount: number
    offerCount: number
    unreadMessageCount: number
  }
  recentReports: Array<{
    id: string
    title: string
    createdAt: string
    landShareRatio: number
    minApartmentPrice: number
  }>
  recentMessages: Array<{
    id: string
    content: string
    createdAt: string
    sender: { id: string; name: string | null; image: string | null }
  }>
  recentOffers: Array<{
    id: string
    offeredShare: number
    status: string
    createdAt: string
    listing: { id: string; title: string | null; city: string | null }
    bidder: { id: string; name: string | null }
  }>
}

const STAT_CONFIG = [
  { key: 'reportCount',        label: 'Hesaplama',       color: '#3b82f6' },
  { key: 'activeListingCount', label: 'Aktif İlan',       color: '#10a34a' },
  { key: 'offerCount',         label: 'Teklif',          color: '#f59e0b' },
  { key: 'unreadMessageCount', label: 'Okunmamış Mesaj', color: '#8b5cf6' },
] as const

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
  }, [status, router])

  useEffect(() => {
    if (status !== 'authenticated') return
    fetch('/api/user/dashboard')
      .then(r => r.json())
      .then(setData)
      .finally(() => setLoading(false))
  }, [status])

  if (loading || !data) {
    return <div className={styles.container}><div className={styles.loading}>Yükleniyor...</div></div>
  }

  const { stats, recentReports, recentMessages, recentOffers } = data
  const statValues: Record<string, number> = stats

  const offerStatusClass = (s: string) => {
    if (s === 'PENDING') return styles.statusPending
    if (s === 'ACCEPTED') return styles.statusAccepted
    return styles.statusRejected
  }

  const offerStatusLabel = (s: string) => {
    if (s === 'PENDING') return 'Bekliyor'
    if (s === 'ACCEPTED') return 'Kabul'
    return 'Reddedildi'
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.pageTitle}>Dashboard</h1>
      <p className={styles.welcome}>Hoş geldin, {session?.user?.name || 'Kullanıcı'}</p>

      {/* Stat kartları */}
      <div className={styles.statsGrid}>
        {STAT_CONFIG.map(({ key, label, color }) => (
          <div key={key} className={styles.statCard} style={{ '--card-accent-rgb': hexToRgb(color) } as React.CSSProperties}>
            <div className={styles.statValue} style={{ color }}>{statValues[key] ?? 0}</div>
            <div className={styles.statLabel}>{label}</div>
          </div>
        ))}
      </div>

      {/* İki kolon */}
      <div className={styles.twoCol}>
        {/* Sol: Son raporlar */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Son Projeler & Raporlar</h2>
            <Link href="/dashboard/reports" className={styles.sectionLink}>Tümü →</Link>
          </div>
          {recentReports.length === 0 ? (
            <p className={styles.empty}>Henüz hesaplama yok. <Link href="/hesapla">Hesapla →</Link></p>
          ) : (
            <div className={styles.reportList}>
              {recentReports.map(r => (
                <div key={r.id} className={styles.reportRow}>
                  <div className={styles.reportInfo}>
                    <span className={styles.reportTitle}>{r.title}</span>
                    <span className={styles.reportMeta}>
                      Arsa payı: %{(r.landShareRatio * 100).toFixed(0)} · Min. daire: {r.minApartmentPrice.toLocaleString('tr-TR')} ₺
                    </span>
                  </div>
                  <div className={styles.reportActions}>
                    <Link href={`/hesapla?reportId=${r.id}`} className={styles.actionLink}>Aç</Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Sağ: Mesajlar + Teklifler */}
        <div className={styles.rightCol}>
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Son Mesajlar</h2>
              <Link href="/inbox" className={styles.sectionLink}>Tümü →</Link>
            </div>
            {recentMessages.length === 0 ? (
              <p className={styles.empty}>Mesaj yok.</p>
            ) : (
              <div className={styles.messageList}>
                {recentMessages.map(m => (
                  <Link key={m.id} href={`/inbox?with=${m.sender.id}`} className={styles.messageRow}>
                    <span className={styles.messageSender}>{m.sender.name || 'Kullanıcı'}</span>
                    <span className={styles.messagePreview}>
                      {m.content.length > 55 ? m.content.slice(0, 55) + '…' : m.content}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </section>

          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Son Teklifler</h2>
              <Link href="/dashboard/projects" className={styles.sectionLink}>Tümü →</Link>
            </div>
            {recentOffers.length === 0 ? (
              <p className={styles.empty}>Teklif yok.</p>
            ) : (
              <div className={styles.offerList}>
                {recentOffers.map(o => (
                  <Link key={o.id} href={`/listing/${o.listing.id}`} className={styles.offerRow}>
                    <span className={styles.offerAmount}>%{o.offeredShare} pay</span>
                    <span className={styles.offerListing}>{o.listing.title || o.listing.city || 'İlan'}</span>
                    <span className={`${styles.offerStatus} ${offerStatusClass(o.status)}`}>
                      {offerStatusLabel(o.status)}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>

      {/* Hızlı aksiyonlar */}
      <div className={styles.quickActions}>
        <Link href="/hesapla" className={styles.qaBtn}>+ Yeni Hesaplama</Link>
        <Link href="/listings/new" className={styles.qaBtn}>+ Yeni İlan</Link>
        <Link href="/inbox" className={styles.qaBtn}>Mesajlar</Link>
        <Link href="/marketplace" className={styles.qaBtn}>Pazar Yeri</Link>
      </div>
    </div>
  )
}

function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `${r}, ${g}, ${b}`
}
```

- [ ] **Step 4: TypeScript kontrolü**

```bash
npx tsc --noEmit
```

Expected: no output

- [ ] **Step 5: Commit**

```bash
git add src/app/dashboard/
git commit -m "feat(ui): rewrite dashboard with stats, reports, messages, offers"
```

---

## Task 4: Messages API — Güvenlik Fix + Yeni Route'lar

**Files:**
- Modify: `src/app/api/messages/route.ts`
- Create: `src/app/api/messages/[userId]/route.ts`
- Create: `src/app/api/messages/[id]/read/route.ts`

- [ ] **Step 1: messages/route.ts güncelle**

Mevcut route'un güvenlik sorunu var: POST `senderId` request body'den alıyor. Session'dan alacak şekilde düzelt. GET konuşma listesi döndürecek şekilde güncelle:

```typescript
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
    const session = await getServerSession()
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const userId = session.user.id as string

    const messages = await prisma.message.findMany({
        where: { OR: [{ senderId: userId }, { receiverId: userId }] },
        orderBy: { createdAt: 'desc' },
        include: {
            sender: { select: { id: true, name: true, image: true } },
            receiver: { select: { id: true, name: true, image: true } },
        },
    })

    // Konuşmalara grupla: her unique karşı kullanıcı bir konuşmadır
    const map = new Map<string, {
        otherUser: { id: string; name: string | null; image: string | null }
        lastMessage: string
        lastMessageAt: string
        unreadCount: number
    }>()

    for (const msg of messages) {
        const otherUser = msg.senderId === userId ? msg.receiver : msg.sender
        if (!map.has(otherUser.id)) {
            map.set(otherUser.id, {
                otherUser,
                lastMessage: msg.content,
                lastMessageAt: msg.createdAt.toISOString(),
                unreadCount: 0,
            })
        }
        if (msg.receiverId === userId && !msg.read) {
            map.get(otherUser.id)!.unreadCount += 1
        }
    }

    const conversations = Array.from(map.values())
    return NextResponse.json({ conversations })
}

export async function POST(req: Request) {
    const session = await getServerSession()
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const senderId = session.user.id as string

    const { receiverId, content, reportId } = await req.json()
    if (!receiverId || !content?.trim()) {
        return NextResponse.json({ error: 'receiverId ve content zorunlu' }, { status: 400 })
    }

    const message = await prisma.message.create({
        data: { senderId, receiverId, content: content.trim(), reportId: reportId || null },
        include: { sender: { select: { id: true, name: true, image: true } } },
    })

    return NextResponse.json({ success: true, message }, { status: 201 })
}
```

- [ ] **Step 2: messages/[userId]/route.ts oluştur**

`src/app/api/messages/[userId]/route.ts` dosyasını oluştur:

```typescript
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { prisma } from '@/lib/prisma'

export async function GET(
    _req: Request,
    { params }: { params: { userId: string } }
) {
    const session = await getServerSession()
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const currentUserId = session.user.id as string
    const { userId: otherId } = params

    const messages = await prisma.message.findMany({
        where: {
            OR: [
                { senderId: currentUserId, receiverId: otherId },
                { senderId: otherId, receiverId: currentUserId },
            ],
        },
        orderBy: { createdAt: 'asc' },
        include: {
            sender: { select: { id: true, name: true, image: true } },
        },
    })

    // Bu konuşmayı okundu olarak işaretle
    await prisma.message.updateMany({
        where: { senderId: otherId, receiverId: currentUserId, read: false },
        data: { read: true },
    })

    return NextResponse.json({ messages })
}
```

- [ ] **Step 3: messages/[id]/read/route.ts oluştur**

`src/app/api/messages/[id]/read/route.ts` dosyasını oluştur:

```typescript
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { prisma } from '@/lib/prisma'

export async function PATCH(
    _req: Request,
    { params }: { params: { id: string } }
) {
    const session = await getServerSession()
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const userId = session.user.id as string

    const message = await prisma.message.findUnique({
        where: { id: params.id },
        select: { receiverId: true },
    })
    if (!message) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (message.receiverId !== userId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await prisma.message.update({ where: { id: params.id }, data: { read: true } })
    return NextResponse.json({ ok: true })
}
```

- [ ] **Step 4: TypeScript kontrolü**

```bash
npx tsc --noEmit
```

Expected: no output

- [ ] **Step 5: Commit**

```bash
git add src/app/api/messages/
git commit -m "feat(api): fix messages security, add conversation grouping and read status"
```

---

## Task 5: Inbox UI — Gerçek API Bağlantısı

**Files:**
- Modify: `src/app/inbox/page.tsx`

Mevcut inbox UI güzel tasarlanmış, mock data gerçek API'a bağlanacak. Dosyayı oku, ardından aşağıdaki değişiklikleri yap.

- [ ] **Step 1: Mevcut inbox/page.tsx dosyasını oku**

`src/app/inbox/page.tsx` ve `src/app/inbox/inbox.module.css` dosyalarını oku.

- [ ] **Step 2: page.tsx dosyasını gerçek API'a bağlanacak şekilde yeniden yaz**

Mock `INITIAL` data ve `Conversation`/`Message` tiplerini API shape'ine uygun değiştir. Dosyanın tamamını aşağıdakiyle değiştir:

```tsx
'use client'

import React, { useEffect, useRef, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'react-hot-toast'
import styles from './inbox.module.css'

interface OtherUser {
    id: string
    name: string | null
    image: string | null
}

interface Conversation {
    otherUser: OtherUser
    lastMessage: string
    lastMessageAt: string
    unreadCount: number
}

interface Message {
    id: string
    content: string
    senderId: string
    receiverId: string
    createdAt: string
    read: boolean
    reportId: string | null
    sender: OtherUser
}

export default function Inbox() {
    const { data: session, status } = useSession()
    const router = useRouter()
    const searchParams = useSearchParams()
    const [conversations, setConversations] = useState<Conversation[]>([])
    const [activeOtherId, setActiveOtherId] = useState<string | null>(null)
    const [messages, setMessages] = useState<Message[]>([])
    const [draft, setDraft] = useState('')
    const [sending, setSending] = useState(false)
    const [isMobileChatActive, setIsMobileChatActive] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')
    const bottomRef = useRef<HTMLDivElement>(null)
    const textareaRef = useRef<HTMLTextAreaElement>(null)

    useEffect(() => {
        if (status === 'unauthenticated') router.push('/login')
    }, [status, router])

    const loadConversations = useCallback(async () => {
        const res = await fetch('/api/messages')
        const data = await res.json()
        if (data.conversations) setConversations(data.conversations)
    }, [])

    useEffect(() => {
        if (status === 'authenticated') loadConversations()
    }, [status, loadConversations])

    const loadMessages = useCallback(async (otherId: string) => {
        const res = await fetch(`/api/messages/${otherId}`)
        const data = await res.json()
        if (data.messages) setMessages(data.messages)
        // Unread badge güncelle
        setConversations(prev =>
            prev.map(c => c.otherUser.id === otherId ? { ...c, unreadCount: 0 } : c)
        )
    }, [])

    const openConversation = useCallback((otherId: string) => {
        setActiveOtherId(otherId)
        setIsMobileChatActive(true)
        loadMessages(otherId)
    }, [loadMessages])

    // URL'den ?with= parametresi
    useEffect(() => {
        const withParam = searchParams.get('with')
        if (withParam && status === 'authenticated') openConversation(withParam)
    }, [searchParams, status, openConversation])

    // Desktop: açık konuşma yok → ilk konuşmayı aç
    useEffect(() => {
        if (typeof window !== 'undefined' && window.innerWidth > 768 && !activeOtherId && conversations.length > 0) {
            openConversation(conversations[0].otherUser.id)
        }
    }, [conversations, activeOtherId, openConversation])

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages.length])

    const sendMessage = async () => {
        if (!draft.trim() || !activeOtherId || sending) return
        setSending(true)
        const res = await fetch('/api/messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ receiverId: activeOtherId, content: draft.trim() }),
        })
        if (res.ok) {
            setDraft('')
            await loadMessages(activeOtherId)
            await loadConversations()
        } else {
            toast.error('Mesaj gönderilemedi')
        }
        setSending(false)
    }

    const handleKey = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
    }

    const activeConv = conversations.find(c => c.otherUser.id === activeOtherId)
    const currentUserId = (session?.user as { id?: string })?.id

    const filtered = conversations.filter(c =>
        (c.otherUser.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.lastMessage.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const avatarInitials = (name: string | null) => (name || 'U').slice(0, 2).toUpperCase()

    if (status === 'loading') return null

    return (
        <div className={styles.inboxContainer}>
            {/* Sidebar */}
            <aside className={`${styles.sidebar} ${isMobileChatActive ? styles.sidebarHidden : ''}`}>
                <div className={styles.sidebarHeader}>
                    <div className={styles.sidebarTitleRow}>
                        <h2 className={styles.sidebarTitle}>Mesajlar</h2>
                    </div>
                    <div className={styles.searchBox}>
                        <span className={styles.searchIcon}>🔍</span>
                        <input
                            className={styles.searchInput}
                            placeholder="Ara"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className={styles.convList}>
                    {filtered.length === 0 && (
                        <div style={{ padding: '1.5rem', color: 'var(--muted)', fontSize: '0.85rem' }}>
                            Henüz mesaj yok.
                        </div>
                    )}
                    {filtered.map(c => (
                        <div
                            key={c.otherUser.id}
                            className={`${styles.convItem} ${c.otherUser.id === activeOtherId ? styles.convItemActive : ''}`}
                            onClick={() => openConversation(c.otherUser.id)}
                        >
                            <div className={styles.avatar} style={{ width: 56, height: 56, background: 'var(--primary)' }}>
                                <div style={{ width: '100%', height: '100%', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--primary)', color: 'white', fontWeight: 800 }}>
                                    {avatarInitials(c.otherUser.name)}
                                </div>
                            </div>
                            <div className={styles.convText}>
                                <div className={styles.convNameRow}>
                                    <span className={styles.convName}>{c.otherUser.name || 'Kullanıcı'}</span>
                                </div>
                                <div className={`${styles.convLastMsg} ${c.unreadCount > 0 ? styles.convUnreadText : ''}`}>
                                    {c.lastMessage.length > 45 ? c.lastMessage.slice(0, 45) + '…' : c.lastMessage}
                                </div>
                            </div>
                            {c.unreadCount > 0 && (
                                <div style={{ width: 20, height: 20, background: 'var(--primary)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '0.65rem', fontWeight: 800, marginLeft: 'auto', flexShrink: 0 }}>
                                    {c.unreadCount}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </aside>

            {/* Chat view */}
            <main className={`${styles.chatView} ${isMobileChatActive ? styles.chatViewActive : ''}`}>
                {activeConv ? (
                    <>
                        <div className={styles.chatHeader}>
                            <button className={styles.backButton} onClick={() => setIsMobileChatActive(false)}>
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="15 18 9 12 15 6" />
                                </svg>
                            </button>
                            <div className={styles.avatar} style={{ width: 36, height: 36, fontSize: '0.75rem', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 800, borderRadius: '50%' }}>
                                {avatarInitials(activeConv.otherUser.name)}
                            </div>
                            <div className={styles.chatInfo}>
                                <div className={styles.chatName}>{activeConv.otherUser.name || 'Kullanıcı'}</div>
                            </div>
                        </div>

                        <div className={styles.messagesArea}>
                            {messages.map(msg => {
                                const isMine = msg.senderId === currentUserId
                                return (
                                    <div key={msg.id} className={`${styles.messageRow} ${isMine ? styles.mine : styles.theirs}`}>
                                        <div className={`${styles.bubble} ${isMine ? styles.bubbleMine : styles.bubbleTheirs}`}>
                                            <div>{msg.content}</div>
                                            <div className={styles.msgMeta}>
                                                <span style={{ fontSize: '0.6rem' }}>
                                                    {new Date(msg.createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                            <div ref={bottomRef} />
                        </div>

                        <div className={styles.inputArea}>
                            <div className={styles.inputWrapper}>
                                <textarea
                                    ref={textareaRef}
                                    className={styles.textarea}
                                    placeholder="Mesaj gönder..."
                                    value={draft}
                                    onChange={e => setDraft(e.target.value)}
                                    onKeyDown={handleKey}
                                    rows={1}
                                />
                                {draft.trim() && (
                                    <span
                                        onClick={sendMessage}
                                        style={{ color: 'var(--primary)', fontWeight: 800, cursor: sending ? 'not-allowed' : 'pointer', padding: '0 8px', fontSize: '0.95rem', opacity: sending ? 0.5 : 1 }}
                                    >
                                        Gönder
                                    </span>
                                )}
                            </div>
                        </div>
                    </>
                ) : (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', opacity: 0.6 }}>
                        <div style={{ width: 96, height: 96, borderRadius: '50%', border: '2px solid currentColor', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                            </svg>
                        </div>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--card-title)', letterSpacing: '-0.5px' }}>Mesajların</h3>
                        <p style={{ marginTop: 8, fontSize: '0.9rem', textAlign: 'center', maxWidth: 260 }}>Soldaki listeden bir konuşma seç.</p>
                    </div>
                )}
            </main>
        </div>
    )
}
```

- [ ] **Step 3: TypeScript kontrolü**

```bash
npx tsc --noEmit
```

Expected: no output

- [ ] **Step 4: Commit**

```bash
git add src/app/inbox/page.tsx
git commit -m "feat(ui): connect inbox to real messages API, remove mock data"
```

---

## Task 6: File Upload API

**Files:**
- Create: `src/lib/upload.ts`
- Create: `src/lib/upload.test.ts`
- Create: `src/app/api/upload/route.ts`

- [ ] **Step 1: Upload utilities yaz**

`src/lib/upload.ts` oluştur:

```typescript
export const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const
export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024 // 5 MB
export const MAX_FILES_PER_LISTING = 10

export function isAllowedMimeType(mimeType: string): boolean {
    return (ALLOWED_MIME_TYPES as readonly string[]).includes(mimeType)
}

export function isWithinSizeLimit(sizeBytes: number): boolean {
    return sizeBytes <= MAX_FILE_SIZE_BYTES
}

export function mimeToExtension(mimeType: string): string {
    const map: Record<string, string> = {
        'image/jpeg': 'jpg',
        'image/png':  'png',
        'image/webp': 'webp',
    }
    return map[mimeType] ?? 'jpg'
}
```

- [ ] **Step 2: Upload testlerini yaz**

`src/lib/upload.test.ts` oluştur:

```typescript
import {
    isAllowedMimeType,
    isWithinSizeLimit,
    mimeToExtension,
    MAX_FILE_SIZE_BYTES,
} from './upload'

describe('isAllowedMimeType', () => {
    it('kabul: image/jpeg', () => expect(isAllowedMimeType('image/jpeg')).toBe(true))
    it('kabul: image/png',  () => expect(isAllowedMimeType('image/png')).toBe(true))
    it('kabul: image/webp', () => expect(isAllowedMimeType('image/webp')).toBe(true))
    it('red: image/gif',    () => expect(isAllowedMimeType('image/gif')).toBe(false))
    it('red: application/pdf', () => expect(isAllowedMimeType('application/pdf')).toBe(false))
    it('red: boş string',  () => expect(isAllowedMimeType('')).toBe(false))
})

describe('isWithinSizeLimit', () => {
    it('5MB tam limitinde kabul', () => expect(isWithinSizeLimit(MAX_FILE_SIZE_BYTES)).toBe(true))
    it('1KB kabul',              () => expect(isWithinSizeLimit(1024)).toBe(true))
    it('5MB+1 byte red',         () => expect(isWithinSizeLimit(MAX_FILE_SIZE_BYTES + 1)).toBe(false))
})

describe('mimeToExtension', () => {
    it('jpeg → jpg',  () => expect(mimeToExtension('image/jpeg')).toBe('jpg'))
    it('png  → png',  () => expect(mimeToExtension('image/png')).toBe('png'))
    it('webp → webp', () => expect(mimeToExtension('image/webp')).toBe('webp'))
    it('bilinmeyen → jpg', () => expect(mimeToExtension('image/tiff')).toBe('jpg'))
})
```

- [ ] **Step 3: Testleri çalıştır — geçmeli**

```bash
npx jest src/lib/upload.test.ts --no-coverage
```

Expected:
```
PASS src/lib/upload.test.ts
  isAllowedMimeType
    ✓ kabul: image/jpeg
    ✓ kabul: image/png
    ✓ kabul: image/webp
    ✓ red: image/gif
    ✓ red: application/pdf
    ✓ red: boş string
  isWithinSizeLimit
    ✓ 5MB tam limitinde kabul
    ✓ 1KB kabul
    ✓ 5MB+1 byte red
  mimeToExtension
    ✓ jpeg → jpg
    ✓ png  → png
    ✓ webp → webp
    ✓ bilinmeyen → jpg

Tests: 13 passed
```

- [ ] **Step 4: Upload API route oluştur**

`src/app/api/upload/route.ts` oluştur:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { isAllowedMimeType, isWithinSizeLimit, mimeToExtension } from '@/lib/upload'

export async function POST(req: NextRequest) {
    const session = await getServerSession()
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const listingId = formData.get('listingId') as string | null

    if (!file)      return NextResponse.json({ error: 'Dosya bulunamadı' }, { status: 400 })
    if (!listingId) return NextResponse.json({ error: 'listingId zorunlu' }, { status: 400 })

    if (!isAllowedMimeType(file.type)) {
        return NextResponse.json({ error: 'Sadece JPG, PNG veya WebP yüklenebilir' }, { status: 400 })
    }
    if (!isWithinSizeLimit(file.size)) {
        return NextResponse.json({ error: 'Dosya 5MB limitini aşıyor' }, { status: 400 })
    }

    const ext = mimeToExtension(file.type)
    const fileName = `${crypto.randomUUID()}.${ext}`
    const uploadDir = join(process.cwd(), 'public', 'uploads', 'listings', listingId)

    await mkdir(uploadDir, { recursive: true })
    const bytes = await file.arrayBuffer()
    await writeFile(join(uploadDir, fileName), Buffer.from(bytes))

    return NextResponse.json({ url: `/uploads/listings/${listingId}/${fileName}` }, { status: 201 })
}
```

- [ ] **Step 5: TypeScript kontrolü**

```bash
npx tsc --noEmit
```

Expected: no output

- [ ] **Step 6: Commit**

```bash
git add src/lib/upload.ts src/lib/upload.test.ts src/app/api/upload/route.ts
git commit -m "feat(api): add file upload endpoint with mime/size validation"
```

---

## Task 7: Listings API — reportId Opsiyonel + Yeni Alanlar

**Files:**
- Modify: `src/app/api/listings/route.ts`

- [ ] **Step 1: listings/route.ts POST handler'ı güncelle**

`src/app/api/listings/route.ts` dosyasını oku. POST handler'ını aşağıdakiyle değiştir (GET olduğu gibi kalsın):

```typescript
export async function POST(req: Request) {
    try {
        const session = await getServerSession()
        if (!session?.user?.id) {
            return NextResponse.json({ message: "Yetkisiz erişim." }, { status: 403 })
        }

        const {
            reportId, city, district, notes,
            title, address, phone, description,
            price, landSizeSqm, zoning, titleDeed, photos,
        } = await req.json()

        // reportId varsa sahipliği kontrol et
        if (reportId) {
            const report = await prisma.report.findFirst({
                where: { id: reportId, userId: session.user.id as string },
            })
            if (!report) {
                return NextResponse.json({ message: "Rapor bulunamadı veya size ait değil." }, { status: 404 })
            }
            const existing = await prisma.listing.findUnique({ where: { reportId } })
            if (existing) {
                return NextResponse.json({ message: "Bu rapor zaten ilanda." }, { status: 400 })
            }
        }

        const listing = await prisma.listing.create({
            data: {
                userId: session.user.id as string,
                reportId: reportId || null,
                city: city || null,
                district: district || null,
                notes: notes || null,
                title: title || null,
                address: address || null,
                phone: phone || null,
                description: description || null,
                price: price ? Number(price) : null,
                landSizeSqm: landSizeSqm ? Number(landSizeSqm) : null,
                zoning: zoning || null,
                titleDeed: titleDeed || null,
                photos: photos || [],
                isActive: true,
            },
        })

        return NextResponse.json(listing, { status: 201 })
    } catch (error) {
        console.error("Listing create error:", error)
        return NextResponse.json({ message: "İlan oluşturulurken hata oluştu." }, { status: 500 })
    }
}
```

- [ ] **Step 2: TypeScript kontrolü**

```bash
npx tsc --noEmit
```

Expected: no output

- [ ] **Step 3: Commit**

```bash
git add src/app/api/listings/route.ts
git commit -m "feat(api): make reportId optional in listings, accept new wizard fields"
```

---

## Task 8: Wizard Bileşenleri

**Files:**
- Create: `src/components/listing-wizard/types.ts`
- Create: `src/components/listing-wizard/wizard.module.css`
- Create: `src/components/listing-wizard/WizardProgress.tsx`
- Create: `src/components/listing-wizard/WizardStep1Location.tsx`
- Create: `src/components/listing-wizard/WizardStep2Detail.tsx`
- Create: `src/components/listing-wizard/WizardStep3Photos.tsx`
- Create: `src/components/listing-wizard/WizardStep4Feasibility.tsx`
- Create: `src/components/listing-wizard/WizardStep5Preview.tsx`

- [ ] **Step 1: types.ts oluştur**

`src/components/listing-wizard/types.ts` oluştur:

```typescript
export interface WizardFormData {
    city: string
    district: string
    address: string
    title: string
    landSizeSqm: string
    price: string
    zoning: string
    titleDeed: string
    description: string
    phone: string
    photos: string[]
    reportId: string
}

export const emptyFormData: WizardFormData = {
    city: '', district: '', address: '',
    title: '', landSizeSqm: '', price: '',
    zoning: '', titleDeed: '', description: '', phone: '',
    photos: [],
    reportId: '',
}
```

- [ ] **Step 2: wizard.module.css oluştur**

`src/components/listing-wizard/wizard.module.css` oluştur:

```css
.stepContainer {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.fieldGroup {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.label {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.input, .select, .textarea {
  padding: 0.75rem 1rem;
  border-radius: 12px;
  border: 1px solid var(--border);
  background: var(--input-bg);
  color: var(--text);
  font-size: 0.9rem;
  font-family: inherit;
  outline: none;
  width: 100%;
  transition: border-color 0.15s;
  box-sizing: border-box;
}

.input:focus, .select:focus, .textarea:focus {
  border-color: var(--primary);
}

.textarea { resize: vertical; min-height: 100px; }

.twoCol {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

/* Photo upload */
.dropZone {
  border: 2px dashed var(--border);
  border-radius: 14px;
  padding: 2rem;
  text-align: center;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}

.dropZone:hover {
  border-color: var(--primary);
  background: rgba(59,130,246,0.04);
}

.dropZoneText {
  color: var(--muted);
  font-size: 0.875rem;
  margin: 0;
  line-height: 1.6;
}

.photoGrid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(90px, 1fr));
  gap: 0.625rem;
}

.photoItem {
  position: relative;
  aspect-ratio: 1;
  border-radius: 10px;
  overflow: hidden;
  border: 1px solid var(--border);
}

.photoImg {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.photoRemove {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: rgba(0,0,0,0.65);
  color: white;
  border: none;
  cursor: pointer;
  font-size: 0.85rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.photoCount {
  font-size: 0.78rem;
  color: var(--muted);
}

.errorText {
  font-size: 0.8rem;
  color: var(--red, #dc2626);
}

/* Report selector */
.reportList {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.reportOption {
  display: flex;
  align-items: center;
  gap: 0.875rem;
  padding: 0.875rem 1rem;
  border-radius: 12px;
  border: 1.5px solid var(--border);
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}

.reportOption:hover { border-color: var(--primary); background: rgba(59,130,246,0.03); }
.reportOptionSelected { border-color: var(--primary); background: rgba(59,130,246,0.07); }

.reportOptionInfo { flex: 1; }

.reportOptionTitle {
  font-size: 0.875rem;
  font-weight: 700;
  color: var(--text);
}

.reportOptionMeta {
  font-size: 0.72rem;
  color: var(--muted);
  margin-top: 2px;
}

.radioCircle {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 2px solid var(--border);
  flex-shrink: 0;
  transition: all 0.15s;
}

.radioCircleSelected {
  border-color: var(--primary);
  background: var(--primary);
}

.skipBtn {
  background: none;
  border: none;
  color: var(--muted);
  font-size: 0.85rem;
  cursor: pointer;
  text-decoration: underline;
  padding: 0;
  text-align: left;
}

/* Preview card */
.previewCard {
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 16px;
  overflow: hidden;
}

.previewImgPlaceholder {
  width: 100%;
  height: 180px;
  background: var(--panel-2);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--muted);
  font-size: 0.875rem;
}

.previewBody { padding: 1rem; }

.previewTitle {
  font-size: 1.1rem;
  font-weight: 800;
  color: var(--text);
  margin-bottom: 0.375rem;
}

.previewLocation {
  font-size: 0.8rem;
  color: var(--muted);
  margin-bottom: 0.5rem;
}

.previewMeta {
  font-size: 0.78rem;
  color: var(--muted);
  margin-bottom: 0.625rem;
}

.previewPrice {
  font-size: 1.3rem;
  font-weight: 900;
  color: var(--primary);
}

.publishBtn {
  width: 100%;
  padding: 0.875rem 2rem;
  border-radius: 14px;
  background: var(--primary);
  border: none;
  color: white;
  font-weight: 800;
  font-size: 1rem;
  cursor: pointer;
  margin-top: 1rem;
  transition: opacity 0.15s;
}

.publishBtn:disabled { opacity: 0.5; cursor: not-allowed; }

.validationError {
  font-size: 0.8rem;
  color: var(--red, #dc2626);
  text-align: center;
  margin-top: 0.25rem;
}

@media (max-width: 600px) {
  .twoCol { grid-template-columns: 1fr; }
}
```

- [ ] **Step 3: WizardProgress.tsx oluştur**

`src/components/listing-wizard/WizardProgress.tsx` oluştur:

```tsx
import React from 'react'

const STEP_LABELS = ['Konum', 'Detay', 'Fotoğraf', 'Fizibilite', 'Yayınla']

interface Props {
  currentStep: number // 1–5
}

export function WizardProgress({ currentStep }: Props) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '2rem' }}>
      {STEP_LABELS.map((label, i) => {
        const step = i + 1
        const done   = step < currentStep
        const active = step === currentStep
        return (
          <React.Fragment key={step}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flex: 1 }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                background: done || active ? 'var(--primary)' : 'var(--panel)',
                border: `2px solid ${done || active ? 'var(--primary)' : 'var(--border)'}`,
                color: done || active ? 'white' : 'var(--muted)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.8rem', fontWeight: 800,
              }}>
                {done ? '✓' : step}
              </div>
              <span style={{
                fontSize: '0.6rem', whiteSpace: 'nowrap',
                fontWeight: active ? 800 : 600,
                color: active ? 'var(--primary)' : done ? 'var(--text)' : 'var(--muted)',
              }}>
                {label}
              </span>
            </div>
            {i < STEP_LABELS.length - 1 && (
              <div style={{
                height: 2, flex: 1, marginBottom: 20,
                background: done ? 'var(--primary)' : 'var(--border)',
              }} />
            )}
          </React.Fragment>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 4: WizardStep1Location.tsx oluştur**

`src/components/listing-wizard/WizardStep1Location.tsx` oluştur:

```tsx
import styles from './wizard.module.css'
import { WizardFormData } from './types'

const CITIES = ['Adana','Adıyaman','Afyonkarahisar','Ağrı','Amasya','Ankara','Antalya','Artvin','Aydın','Balıkesir','Bilecik','Bingöl','Bitlis','Bolu','Burdur','Bursa','Çanakkale','Çankırı','Çorum','Denizli','Diyarbakır','Edirne','Elazığ','Erzincan','Erzurum','Eskişehir','Gaziantep','Giresun','Gümüşhane','Hakkari','Hatay','Isparta','İçel','İstanbul','İzmir','Kars','Kastamonu','Kayseri','Kırklareli','Kırşehir','Kocaeli','Konya','Kütahya','Malatya','Manisa','Kahramanmaraş','Mardin','Muğla','Muş','Nevşehir','Niğde','Ordu','Rize','Sakarya','Samsun','Siirt','Sinop','Sivas','Tekirdağ','Tokat','Trabzon','Tunceli','Şanlıurfa','Uşak','Van','Yozgat','Zonguldak','Aksaray','Bayburt','Karaman','Kırıkkale','Batman','Şırnak','Bartın','Ardahan','Iğdır','Yalova','Karabük','Kilis','Osmaniye','Düzce']

interface Props {
  data: WizardFormData
  onChange: (patch: Partial<WizardFormData>) => void
}

export function WizardStep1Location({ data, onChange }: Props) {
  return (
    <div className={styles.stepContainer}>
      <div className={styles.twoCol}>
        <div className={styles.fieldGroup}>
          <label className={styles.label}>İl *</label>
          <select
            className={styles.select}
            value={data.city}
            onChange={e => onChange({ city: e.target.value, district: '' })}
          >
            <option value="">Seçiniz</option>
            {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className={styles.fieldGroup}>
          <label className={styles.label}>İlçe</label>
          <input
            className={styles.input}
            placeholder="İlçe adı"
            value={data.district}
            onChange={e => onChange({ district: e.target.value })}
          />
        </div>
      </div>
      <div className={styles.fieldGroup}>
        <label className={styles.label}>Tam Adres</label>
        <input
          className={styles.input}
          placeholder="Mahalle, cadde, sokak..."
          value={data.address}
          onChange={e => onChange({ address: e.target.value })}
        />
      </div>
    </div>
  )
}
```

- [ ] **Step 5: WizardStep2Detail.tsx oluştur**

`src/components/listing-wizard/WizardStep2Detail.tsx` oluştur:

```tsx
import styles from './wizard.module.css'
import { WizardFormData } from './types'

interface Props {
  data: WizardFormData
  onChange: (patch: Partial<WizardFormData>) => void
}

export function WizardStep2Detail({ data, onChange }: Props) {
  return (
    <div className={styles.stepContainer}>
      <div className={styles.fieldGroup}>
        <label className={styles.label}>İlan Başlığı *</label>
        <input
          className={styles.input}
          placeholder="Örn: Kadıköy'de 450m² imarlı arsa"
          value={data.title}
          onChange={e => onChange({ title: e.target.value })}
          maxLength={120}
        />
      </div>

      <div className={styles.twoCol}>
        <div className={styles.fieldGroup}>
          <label className={styles.label}>Arsa Alanı (m²) *</label>
          <input
            className={styles.input}
            type="number"
            placeholder="450"
            value={data.landSizeSqm}
            onChange={e => onChange({ landSizeSqm: e.target.value })}
            min={1}
          />
        </div>
        <div className={styles.fieldGroup}>
          <label className={styles.label}>İstenen Fiyat (₺)</label>
          <input
            className={styles.input}
            type="number"
            placeholder="5000000"
            value={data.price}
            onChange={e => onChange({ price: e.target.value })}
            min={0}
          />
        </div>
      </div>

      <div className={styles.twoCol}>
        <div className={styles.fieldGroup}>
          <label className={styles.label}>İmar Durumu</label>
          <select className={styles.select} value={data.zoning} onChange={e => onChange({ zoning: e.target.value })}>
            <option value="">Seçiniz</option>
            <option value="KONUT">Konut</option>
            <option value="TICARI">Ticari</option>
            <option value="KARMA">Karma</option>
            <option value="TARIM">Tarım</option>
          </select>
        </div>
        <div className={styles.fieldGroup}>
          <label className={styles.label}>Tapu Durumu</label>
          <select className={styles.select} value={data.titleDeed} onChange={e => onChange({ titleDeed: e.target.value })}>
            <option value="">Seçiniz</option>
            <option value="KAT_MULKIYETI">Kat Mülkiyeti</option>
            <option value="ARSA">Arsa Tapusu</option>
            <option value="HISSELI">Hisseli Tapu</option>
            <option value="DIGER">Diğer</option>
          </select>
        </div>
      </div>

      <div className={styles.fieldGroup}>
        <label className={styles.label}>İletişim Telefonu</label>
        <input
          className={styles.input}
          type="tel"
          placeholder="0532 xxx xx xx"
          value={data.phone}
          onChange={e => onChange({ phone: e.target.value })}
        />
      </div>

      <div className={styles.fieldGroup}>
        <label className={styles.label}>Açıklama</label>
        <textarea
          className={styles.textarea}
          placeholder="Arsa hakkında detaylı bilgi..."
          value={data.description}
          onChange={e => onChange({ description: e.target.value })}
          maxLength={1000}
        />
      </div>
    </div>
  )
}
```

- [ ] **Step 6: WizardStep3Photos.tsx oluştur**

`src/components/listing-wizard/WizardStep3Photos.tsx` oluştur:

```tsx
import { useRef, useState } from 'react'
import styles from './wizard.module.css'
import { WizardFormData } from './types'
import { MAX_FILES_PER_LISTING } from '@/lib/upload'

interface Props {
  data: WizardFormData
  onChange: (patch: Partial<WizardFormData>) => void
  tempListingId: string
}

export function WizardStep3Photos({ data, onChange, tempListingId }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    const slots = MAX_FILES_PER_LISTING - data.photos.length
    if (slots <= 0) { setError(`En fazla ${MAX_FILES_PER_LISTING} fotoğraf yüklenebilir`); return }
    setUploading(true)
    setError('')
    const uploaded: string[] = []
    for (const file of Array.from(files).slice(0, slots)) {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('listingId', tempListingId)
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      if (res.ok) {
        const { url } = await res.json()
        uploaded.push(url)
      } else {
        const { error: err } = await res.json()
        setError(err || 'Yükleme hatası')
      }
    }
    onChange({ photos: [...data.photos, ...uploaded] })
    setUploading(false)
  }

  return (
    <div className={styles.stepContainer}>
      <div
        className={styles.dropZone}
        onClick={() => inputRef.current?.click()}
        onDragOver={e => e.preventDefault()}
        onDrop={e => { e.preventDefault(); handleFiles(e.dataTransfer.files) }}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          style={{ display: 'none' }}
          onChange={e => handleFiles(e.target.files)}
        />
        <p className={styles.dropZoneText}>
          {uploading
            ? 'Yükleniyor...'
            : <>Fotoğraf yüklemek için tıkla veya sürükle bırak<br /><small>Max {MAX_FILES_PER_LISTING} görsel · JPG, PNG, WebP · 5MB/dosya</small></>
          }
        </p>
      </div>

      {error && <p className={styles.errorText}>{error}</p>}

      {data.photos.length > 0 && (
        <div className={styles.photoGrid}>
          {data.photos.map(url => (
            <div key={url} className={styles.photoItem}>
              <img src={url} alt="" className={styles.photoImg} />
              <button
                className={styles.photoRemove}
                onClick={() => onChange({ photos: data.photos.filter(p => p !== url) })}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <p className={styles.photoCount}>{data.photos.length}/{MAX_FILES_PER_LISTING} fotoğraf · Bu adımı atlayabilirsin</p>
    </div>
  )
}
```

- [ ] **Step 7: WizardStep4Feasibility.tsx oluştur**

`src/components/listing-wizard/WizardStep4Feasibility.tsx` oluştur:

```tsx
import { useEffect, useState } from 'react'
import styles from './wizard.module.css'
import { WizardFormData } from './types'

interface Report {
  id: string
  title: string
  landShareRatio: number
  minApartmentPrice: number
}

interface Props {
  data: WizardFormData
  onChange: (patch: Partial<WizardFormData>) => void
}

export function WizardStep4Feasibility({ data, onChange }: Props) {
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/reports')
      .then(r => r.json())
      .then(d => { setReports((Array.isArray(d) ? d : d.reports ?? []).slice(0, 10)); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  return (
    <div className={styles.stepContainer}>
      <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>
        Kaydedilmiş bir hesaplama raporunu bu ilanla bağla. Marketplace'te fizibilite skoru gösterilir.
      </p>

      {loading ? (
        <p style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>Raporlar yükleniyor...</p>
      ) : reports.length === 0 ? (
        <p style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>Kaydedilmiş hesaplama yok. Bu adımı atlayabilirsin.</p>
      ) : (
        <div className={styles.reportList}>
          {reports.map(r => (
            <div
              key={r.id}
              className={`${styles.reportOption} ${data.reportId === r.id ? styles.reportOptionSelected : ''}`}
              onClick={() => onChange({ reportId: data.reportId === r.id ? '' : r.id })}
            >
              <div className={`${styles.radioCircle} ${data.reportId === r.id ? styles.radioCircleSelected : ''}`} />
              <div className={styles.reportOptionInfo}>
                <div className={styles.reportOptionTitle}>{r.title}</div>
                <div className={styles.reportOptionMeta}>
                  Arsa payı: %{(r.landShareRatio * 100).toFixed(0)} · Min. daire: {r.minApartmentPrice.toLocaleString('tr-TR')} ₺
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <button className={styles.skipBtn} onClick={() => onChange({ reportId: '' })}>
        Bu adımı atla →
      </button>
    </div>
  )
}
```

- [ ] **Step 8: WizardStep5Preview.tsx oluştur**

`src/components/listing-wizard/WizardStep5Preview.tsx` oluştur:

```tsx
import styles from './wizard.module.css'
import { WizardFormData } from './types'

const ZONING_LABEL: Record<string, string> = {
  KONUT: 'Konut imarlı', TICARI: 'Ticari imarlı', KARMA: 'Karma imarlı', TARIM: 'Tarım',
}

interface Props {
  data: WizardFormData
  publishing: boolean
  onPublish: () => void
}

export function WizardStep5Preview({ data, publishing, onPublish }: Props) {
  const price = data.price ? Number(data.price).toLocaleString('tr-TR') + ' ₺' : 'Fiyat belirtilmedi'
  const location = [data.district, data.city].filter(Boolean).join(', ') || 'Konum belirtilmedi'
  const canPublish = !!data.title && !!data.city

  return (
    <div className={styles.stepContainer}>
      <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>İlanın marketplace'te şu şekilde görünecek:</p>

      <div className={styles.previewCard}>
        {data.photos.length > 0 ? (
          <img src={data.photos[0]} alt={data.title} style={{ width: '100%', height: 180, objectFit: 'cover', display: 'block' }} />
        ) : (
          <div className={styles.previewImgPlaceholder}>📷 Fotoğraf eklenmedi</div>
        )}
        <div className={styles.previewBody}>
          <div className={styles.previewTitle}>{data.title || 'Başlık girilmedi'}</div>
          <div className={styles.previewLocation}>📍 {location}</div>
          {(data.landSizeSqm || data.zoning) && (
            <div className={styles.previewMeta}>
              {data.landSizeSqm && `${data.landSizeSqm} m²`}
              {data.landSizeSqm && data.zoning && ' · '}
              {data.zoning && ZONING_LABEL[data.zoning]}
            </div>
          )}
          <div className={styles.previewPrice}>{price}</div>
        </div>
      </div>

      <button className={styles.publishBtn} onClick={onPublish} disabled={publishing || !canPublish}>
        {publishing ? 'Yayınlanıyor...' : '🚀 İlanı Yayınla'}
      </button>

      {!canPublish && (
        <p className={styles.validationError}>Yayınlamak için başlık (Adım 2) ve il (Adım 1) zorunlu.</p>
      )}
    </div>
  )
}
```

- [ ] **Step 9: TypeScript kontrolü**

```bash
npx tsc --noEmit
```

Expected: no output

- [ ] **Step 10: Commit**

```bash
git add src/components/listing-wizard/
git commit -m "feat(ui): add listing wizard components — progress bar + 5 steps"
```

---

## Task 9: Wizard Sayfası

**Files:**
- Create: `src/app/listings/new/page.tsx`
- Create: `src/app/listings/new/page.module.css`

- [ ] **Step 1: page.module.css oluştur**

`src/app/listings/new/page.module.css` oluştur:

```css
.container {
  max-width: 720px;
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

.card {
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 20px;
  padding: 2rem;
}

.stepTitle {
  font-size: 1.25rem;
  font-weight: 800;
  color: var(--text);
  margin-bottom: 1.5rem;
}

.nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 2rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--border);
}

.backBtn {
  padding: 0.75rem 1.5rem;
  border-radius: 12px;
  background: var(--panel);
  border: 1px solid var(--border);
  color: var(--text);
  font-weight: 700;
  cursor: pointer;
  font-size: 0.9rem;
  transition: border-color 0.15s;
}

.backBtn:hover { border-color: var(--primary); }

.nextBtn {
  padding: 0.75rem 2rem;
  border-radius: 12px;
  background: var(--primary);
  border: none;
  color: white;
  font-weight: 800;
  cursor: pointer;
  font-size: 0.9rem;
  transition: opacity 0.15s;
}

.nextBtn:disabled { opacity: 0.5; cursor: not-allowed; }

@media (max-width: 768px) {
  .card { padding: 1.25rem; }
}
```

- [ ] **Step 2: page.tsx oluştur**

`src/app/listings/new/page.tsx` oluştur:

```tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import styles from './page.module.css'
import { WizardProgress } from '@/components/listing-wizard/WizardProgress'
import { WizardStep1Location } from '@/components/listing-wizard/WizardStep1Location'
import { WizardStep2Detail } from '@/components/listing-wizard/WizardStep2Detail'
import { WizardStep3Photos } from '@/components/listing-wizard/WizardStep3Photos'
import { WizardStep4Feasibility } from '@/components/listing-wizard/WizardStep4Feasibility'
import { WizardStep5Preview } from '@/components/listing-wizard/WizardStep5Preview'
import { WizardFormData, emptyFormData } from '@/components/listing-wizard/types'

const STEP_TITLES = [
  'Konum Bilgisi',
  'Arsa Detayları',
  'Fotoğraflar',
  'Fizibilite Bağla',
  'Önizle & Yayınla',
]

export default function NewListingPage() {
  const { status } = useSession()
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [form, setForm] = useState<WizardFormData>(emptyFormData)
  const [publishing, setPublishing] = useState(false)
  // Fotoğraf yükleme için sabit oturum ID'si (component mount'ta bir kez üretilir)
  const tempIdRef = useRef<string>(`temp-${crypto.randomUUID()}`)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
  }, [status, router])

  const update = (patch: Partial<WizardFormData>) => setForm(prev => ({ ...prev, ...patch }))

  const canGoNext = (): boolean => {
    if (step === 1) return !!form.city
    if (step === 2) return !!form.title && !!form.landSizeSqm
    return true
  }

  const handlePublish = async () => {
    setPublishing(true)
    try {
      const res = await fetch('/api/listings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          city: form.city,
          district: form.district || null,
          address: form.address || null,
          title: form.title,
          landSizeSqm: form.landSizeSqm ? Number(form.landSizeSqm) : null,
          price: form.price ? Number(form.price) : null,
          zoning: form.zoning || null,
          titleDeed: form.titleDeed || null,
          description: form.description || null,
          phone: form.phone || null,
          photos: form.photos,
          reportId: form.reportId || null,
        }),
      })
      if (res.ok) {
        const listing = await res.json()
        router.push(`/listing/${listing.id}`)
      } else {
        const err = await res.json()
        alert(err.message || 'İlan yayınlanırken bir hata oluştu.')
        setPublishing(false)
      }
    } catch {
      alert('Bir hata oluştu.')
      setPublishing(false)
    }
  }

  if (status === 'loading') return null

  return (
    <div className={styles.container}>
      <h1 className={styles.pageTitle}>Yeni İlan Oluştur</h1>

      <div className={styles.card}>
        <WizardProgress currentStep={step} />
        <h2 className={styles.stepTitle}>{STEP_TITLES[step - 1]}</h2>

        {step === 1 && <WizardStep1Location data={form} onChange={update} />}
        {step === 2 && <WizardStep2Detail data={form} onChange={update} />}
        {step === 3 && <WizardStep3Photos data={form} onChange={update} tempListingId={tempIdRef.current} />}
        {step === 4 && <WizardStep4Feasibility data={form} onChange={update} />}
        {step === 5 && <WizardStep5Preview data={form} publishing={publishing} onPublish={handlePublish} />}

        {step < 5 && (
          <div className={styles.nav}>
            {step > 1
              ? <button className={styles.backBtn} onClick={() => setStep(s => s - 1)}>← Geri</button>
              : <div />
            }
            <button className={styles.nextBtn} onClick={() => setStep(s => s + 1)} disabled={!canGoNext()}>
              İleri →
            </button>
          </div>
        )}

        {step === 5 && (
          <div className={styles.nav}>
            <button className={styles.backBtn} onClick={() => setStep(s => s - 1)}>← Geri</button>
            <div />
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: TypeScript kontrolü**

```bash
npx tsc --noEmit
```

Expected: no output

- [ ] **Step 4: Tüm testleri çalıştır**

```bash
npx jest --no-coverage
```

Expected: All tests pass (upload.test.ts + engine_v2.test.ts)

- [ ] **Step 5: Final commit**

```bash
git add src/app/listings/
git commit -m "feat(ui): add 5-step listing creation wizard page"
```

---

## Özet

| Task | Özellik | Commit |
|------|---------|--------|
| 1 | DB migration | `feat(db): add Message.read flag and new Listing fields` |
| 2 | Dashboard API | `feat(api): enrich dashboard with stats + recent data` |
| 3 | Dashboard UI | `feat(ui): rewrite dashboard with stats, reports, messages, offers` |
| 4 | Messages API | `feat(api): fix messages security, add conversation grouping` |
| 5 | Inbox UI | `feat(ui): connect inbox to real messages API` |
| 6 | Upload API | `feat(api): add file upload endpoint with validation` |
| 7 | Listings API | `feat(api): make reportId optional, accept new wizard fields` |
| 8 | Wizard Components | `feat(ui): add listing wizard components` |
| 9 | Wizard Page | `feat(ui): add 5-step listing creation wizard page` |
