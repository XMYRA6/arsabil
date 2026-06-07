# ArsaBil Faz 2A Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Admin panel completion (listing approval flow, isVerified toggle, plan management) + SaaS plan infrastructure (FREE/PRO limits) + Resend email notifications with user preferences.

**Architecture:** Backend-first — DB migration → utility libs (plan, email) → API changes → admin UI updates → email prefs UI. Each task is independently deployable. Email is always fire-and-forget (`catch(() => {})`). Plan limits return 403 with `{ error: 'PLAN_LIMIT', upgradeRequired: true }`.

**Tech Stack:** Next.js 16 App Router, TypeScript, Prisma + PostgreSQL, NextAuth (`getServerSession(authOptions)` from `@/lib/auth`), Resend, Jest/ts-jest, CSS Modules (no Tailwind), react-hot-toast.

---

## File Map

| File | Action |
|------|--------|
| `prisma/schema.prisma` | Modify — add Listing.status, User.plan, User.emailPrefs |
| `src/lib/plan.ts` | Create — plan limit checker |
| `src/lib/plan.test.ts` | Create — unit tests |
| `src/lib/email.ts` | Create — Resend wrapper + templates |
| `src/lib/email.test.ts` | Create — template tests |
| `src/app/api/listings/route.ts` | Modify — POST: status=PENDING, isActive=false |
| `src/app/api/admin/listings/route.ts` | Modify — PATCH: approve/reject + notification |
| `src/app/admin/listings/page.tsx` | Modify — Bekliyor tab + Onayla/Reddet buttons |
| `src/app/api/admin/users/route.ts` | Modify — PATCH: isVerified + plan + fix validRoles + isBanned |
| `src/app/admin/users/page.tsx` | Modify — isVerified toggle + plan dropdown |
| `src/app/api/reports/route.ts` | Modify — POST: real auth + plan limit check |
| `src/app/api/listings/route.ts` | Modify — POST: add plan limit check |
| `src/app/api/projects/[id]/scenarios/route.ts` | Modify — POST: fix authOptions import + plan limit check |
| `src/app/api/messages/route.ts` | Modify — add sendEmail trigger |
| `src/app/api/offers/route.ts` | Modify — add sendEmail trigger |
| `src/app/api/admin/listings/route.ts` | Modify — approve action: add email trigger |
| `src/app/api/user/profile/route.ts` | Modify — PATCH: emailPrefs support |
| `src/app/dashboard/profile/page.tsx` | Modify — Settings tab: email preference toggles |

---

## Task 1: DB Schema Migration

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add fields to schema**

Open `prisma/schema.prisma`. Find the `Listing` model and add `status` after `isActive`. Find the `User` model and add `plan` and `emailPrefs` after `isVerified`.

In `Listing` model, add after the `isActive Boolean @default(true)` line:
```prisma
  status      String   @default("PENDING")
```

In `User` model, add after the `isVerified Boolean @default(false)` line:
```prisma
  plan        String   @default("FREE")
  emailPrefs  String   @default("{}")
```

- [ ] **Step 2: Run migration**

```bash
npx prisma migrate dev --name faz2a-plan-approval-email
```

Expected: Migration created and applied. Prisma client regenerated.

If Docker is not running, start it first: `docker compose up -d`

- [ ] **Step 3: Verify**

```bash
npx prisma studio
```

Open browser to http://localhost:5555. Confirm `Listing` has `status` column and `User` has `plan`/`emailPrefs` columns. Close studio.

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat: add Listing.status, User.plan, User.emailPrefs"
```

---

## Task 2: Plan Utility + Tests

**Files:**
- Create: `src/lib/plan.ts`
- Create: `src/lib/plan.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/lib/plan.test.ts`:

```typescript
import { checkPlanLimit, PLAN_LIMITS } from './plan'

jest.mock('@/lib/prisma', () => ({
    prisma: {
        user: {
            findUnique: jest.fn(),
        },
        report: {
            count: jest.fn(),
        },
        listing: {
            count: jest.fn(),
        },
        scenario: {
            count: jest.fn(),
        },
    },
}))

import { prisma } from '@/lib/prisma'
const mockPrisma = prisma as jest.Mocked<typeof prisma>

describe('PLAN_LIMITS', () => {
    it('FREE limits are correct', () => {
        expect(PLAN_LIMITS.FREE.reports).toBe(10)
        expect(PLAN_LIMITS.FREE.listings).toBe(2)
        expect(PLAN_LIMITS.FREE.scenarios).toBe(3)
    })

    it('PRO limits are correct', () => {
        expect(PLAN_LIMITS.PRO.reports).toBe(Infinity)
        expect(PLAN_LIMITS.PRO.listings).toBe(10)
        expect(PLAN_LIMITS.PRO.scenarios).toBe(Infinity)
    })
})

describe('checkPlanLimit', () => {
    beforeEach(() => jest.clearAllMocks())

    it('allows FREE user under reports limit', async () => {
        ;(mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({ plan: 'FREE' })
        ;(mockPrisma.report.count as jest.Mock).mockResolvedValue(5)
        const result = await checkPlanLimit('user-1', 'reports')
        expect(result.allowed).toBe(true)
        expect(result.current).toBe(5)
        expect(result.limit).toBe(10)
    })

    it('blocks FREE user at reports limit', async () => {
        ;(mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({ plan: 'FREE' })
        ;(mockPrisma.report.count as jest.Mock).mockResolvedValue(10)
        const result = await checkPlanLimit('user-1', 'reports')
        expect(result.allowed).toBe(false)
        expect(result.reason).toMatch(/10/)
    })

    it('allows PRO user unlimited reports', async () => {
        ;(mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({ plan: 'PRO' })
        const result = await checkPlanLimit('user-1', 'reports')
        expect(result.allowed).toBe(true)
        expect(result.limit).toBe(Infinity)
        // Should not call count for Infinity limit
        expect(mockPrisma.report.count).not.toHaveBeenCalled()
    })

    it('checks listings count for FREE user', async () => {
        ;(mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({ plan: 'FREE' })
        ;(mockPrisma.listing.count as jest.Mock).mockResolvedValue(2)
        const result = await checkPlanLimit('user-1', 'listings')
        expect(result.allowed).toBe(false)
        expect(result.current).toBe(2)
    })

    it('checks scenarios count for FREE user', async () => {
        ;(mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({ plan: 'FREE' })
        ;(mockPrisma.scenario.count as jest.Mock).mockResolvedValue(1)
        const result = await checkPlanLimit('user-1', 'scenarios')
        expect(result.allowed).toBe(true)
        expect(result.current).toBe(1)
        expect(result.limit).toBe(3)
    })

    it('defaults to FREE plan if user not found', async () => {
        ;(mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null)
        ;(mockPrisma.report.count as jest.Mock).mockResolvedValue(0)
        const result = await checkPlanLimit('ghost', 'reports')
        expect(result.limit).toBe(10)
    })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx jest src/lib/plan.test.ts --no-coverage
```

Expected: FAIL — "Cannot find module './plan'"

- [ ] **Step 3: Implement plan.ts**

Create `src/lib/plan.ts`:

```typescript
import { prisma } from '@/lib/prisma'

export type PlanResource = 'reports' | 'listings' | 'scenarios'

export const PLAN_LIMITS: Record<string, Record<PlanResource, number>> = {
    FREE: { reports: 10, listings: 2, scenarios: 3 },
    PRO:  { reports: Infinity, listings: 10, scenarios: Infinity },
}

export async function checkPlanLimit(
    userId: string,
    resource: PlanResource
): Promise<{ allowed: boolean; reason?: string; current: number; limit: number }> {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { plan: true },
    })
    const plan = user?.plan ?? 'FREE'
    const limit = PLAN_LIMITS[plan]?.[resource] ?? PLAN_LIMITS.FREE[resource]

    if (limit === Infinity) {
        return { allowed: true, current: 0, limit: Infinity }
    }

    let current = 0
    if (resource === 'reports') {
        const startOfMonth = new Date()
        startOfMonth.setDate(1)
        startOfMonth.setHours(0, 0, 0, 0)
        current = await prisma.report.count({
            where: { userId, createdAt: { gte: startOfMonth } },
        })
    } else if (resource === 'listings') {
        current = await prisma.listing.count({
            where: { userId, status: { not: 'REJECTED' } },
        })
    } else {
        current = await prisma.scenario.count({
            where: { project: { userId } },
        })
    }

    const allowed = current < limit
    return {
        allowed,
        current,
        limit,
        ...(allowed ? {} : { reason: `${resource} limitine ulaştınız (${current}/${limit})` }),
    }
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npx jest src/lib/plan.test.ts --no-coverage
```

Expected: 8 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/plan.ts src/lib/plan.test.ts
git commit -m "feat: add plan limit utility with FREE/PRO limits"
```

---

## Task 3: Listing Approval APIs

**Files:**
- Modify: `src/app/api/listings/route.ts` — POST sets status=PENDING, isActive=false
- Modify: `src/app/api/admin/listings/route.ts` — PATCH handles approve/reject + notification

- [ ] **Step 1: Update listings POST to set PENDING status**

In `src/app/api/listings/route.ts`, find the `prisma.listing.create` data block and change:
```typescript
        isActive: true,
```
to:
```typescript
        isActive: false,
        status: 'PENDING',
```

- [ ] **Step 2: Update admin/listings PATCH to handle approve/reject**

Replace the entire `src/app/api/admin/listings/route.ts` with:

```typescript
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createNotification } from '@/lib/notifications';

export async function GET() {
    try {
        const listings = await prisma.listing.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                user: { select: { name: true, email: true } },
                report: { select: { title: true, minApartmentPrice: true, landShareRatio: true, totalApartments: true } },
                _count: { select: { offers: true } },
            },
        });
        return NextResponse.json({ listings });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ listings: [] });
    }
}

export async function PATCH(req: Request) {
    try {
        const { listingId, isActive, action } = await req.json();
        if (!listingId) return NextResponse.json({ message: 'listingId gerekli' }, { status: 400 });

        if (action === 'approve') {
            const listing = await prisma.listing.update({
                where: { id: listingId },
                data: { status: 'APPROVED', isActive: true },
                include: { user: { select: { id: true, name: true } } },
            });
            createNotification({
                type: 'ILAN_ONAYLANDI',
                userId: listing.user.id,
                title: 'İlanınız Onaylandı',
                body: `"${listing.title ?? 'İlanınız'}" pazar yerine eklendi.`,
                url: '/marketplace',
            }).catch(() => {});
            return NextResponse.json({ ok: true });
        }

        if (action === 'reject') {
            await prisma.listing.update({
                where: { id: listingId },
                data: { status: 'REJECTED', isActive: false },
            });
            return NextResponse.json({ ok: true });
        }

        // Legacy: toggle isActive
        if (isActive !== undefined) {
            await prisma.listing.update({
                where: { id: listingId },
                data: { isActive },
            });
            return NextResponse.json({ ok: true });
        }

        return NextResponse.json({ message: 'action veya isActive gerekli' }, { status: 400 });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ message: 'Hata oluştu' }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    try {
        const { listingId } = await req.json();
        if (!listingId) return NextResponse.json({ message: 'listingId gerekli' }, { status: 400 });

        await prisma.listing.delete({ where: { id: listingId } });
        return NextResponse.json({ ok: true });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ message: 'Hata oluştu' }, { status: 500 });
    }
}
```

- [ ] **Step 3: Build check**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/listings/route.ts src/app/api/admin/listings/route.ts
git commit -m "feat: listing approval flow - PENDING on create, admin approve/reject action"
```

---

## Task 4: Listing Approval Admin UI

**Files:**
- Modify: `src/app/admin/listings/page.tsx`

- [ ] **Step 1: Update ListingRow interface and filter type**

In `src/app/admin/listings/page.tsx`, replace the `ListingRow` interface:

```typescript
interface ListingRow {
    id: string;
    title: string | null;
    city: string | null;
    district: string | null;
    isActive: boolean;
    status: string;
    createdAt: string;
    user: { name: string | null; email: string | null };
    report: { title: string; minApartmentPrice: number; landShareRatio: number; totalApartments: number };
    _count: { offers: number };
}
```

Change the filter state type:
```typescript
const [filter, setFilter] = useState<'all' | 'pending' | 'active' | 'inactive'>('all');
```

- [ ] **Step 2: Add approveAction handler**

After the `deleteListing` function, add:

```typescript
    const approveAction = async (id: string, action: 'approve' | 'reject') => {
        try {
            const res = await fetch('/api/admin/listings', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ listingId: id, action }),
            });
            if (res.ok) {
                setMessage({ type: 'success', text: action === 'approve' ? '✅ İlan onaylandı.' : '❌ İlan reddedildi.' });
                fetchListings();
            }
        } catch {
            setMessage({ type: 'error', text: 'Sunucu hatası.' });
        }
        setTimeout(() => setMessage(null), 3000);
    };
```

- [ ] **Step 3: Update filter logic and counts**

Replace the `filtered` and count lines:

```typescript
    const filtered = listings.filter(l => {
        if (filter === 'pending') return l.status === 'PENDING';
        if (filter === 'active') return l.isActive && l.status === 'APPROVED';
        if (filter === 'inactive') return !l.isActive && l.status !== 'PENDING';
        return true;
    });

    const pendingCount = listings.filter(l => l.status === 'PENDING').length;
    const activeCount = listings.filter(l => l.isActive && l.status === 'APPROVED').length;
    const totalOffers = listings.reduce((s, l) => s + l._count.offers, 0);
```

- [ ] **Step 4: Update stats grid**

Replace the stats array in the `statsGrid`:

```typescript
                {[
                    { icon: '🏗️', value: listings.length, label: 'Toplam İlan' },
                    { icon: '⏳', value: pendingCount, label: 'Bekliyor' },
                    { icon: '✅', value: activeCount, label: 'Aktif' },
                    { icon: '📩', value: totalOffers, label: 'Toplam Teklif' },
                ].map(s => (
```

- [ ] **Step 5: Update segment tabs**

Replace the segment tabs render:

```typescript
                <div className={styles.segmentTabs}>
                    {([
                        { value: 'all', label: 'Tümü' },
                        { value: 'pending', label: '⏳ Bekliyor' },
                        { value: 'active', label: '✅ Aktif' },
                        { value: 'inactive', label: '⏸️ Pasif' },
                    ] as const).map(f => (
                        <button
                            key={f.value}
                            onClick={() => setFilter(f.value)}
                            className={filter === f.value ? styles.segmentTabActive : styles.segmentTab}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>
```

- [ ] **Step 6: Update status badge and add approve/reject buttons**

In the table row, replace the status `<td>` and the actions `<td>`:

Replace status badge td:
```typescript
                                <td>
                                    <span className={styles.roleBadge} style={
                                        listing.status === 'PENDING'
                                            ? { background: 'rgba(245,158,11,.12)', color: '#f59e0b', border: '1px solid rgba(245,158,11,.25)' }
                                            : listing.isActive
                                            ? { background: 'rgba(16,185,129,.12)', color: '#10b981', border: '1px solid rgba(16,185,129,.25)' }
                                            : { background: 'rgba(107,114,128,.12)', color: '#6b7280', border: '1px solid rgba(107,114,128,.25)' }
                                    }>
                                        {listing.status === 'PENDING' ? '⏳ Bekliyor' : listing.isActive ? 'Aktif' : 'Pasif'}
                                    </span>
                                </td>
```

Replace actions td:
```typescript
                                <td>
                                    <div style={{ display: 'flex', gap: 6 }}>
                                        {listing.status === 'PENDING' ? (
                                            <>
                                                <button
                                                    onClick={() => approveAction(listing.id, 'approve')}
                                                    className={styles.iconBtn}
                                                    style={{ color: '#10b981', fontSize: '0.75rem', padding: '2px 8px' }}
                                                    title="Onayla"
                                                >✅ Onayla</button>
                                                <button
                                                    onClick={() => approveAction(listing.id, 'reject')}
                                                    className={styles.iconBtn}
                                                    style={{ color: '#ef4444', fontSize: '0.75rem', padding: '2px 8px' }}
                                                    title="Reddet"
                                                >❌ Reddet</button>
                                            </>
                                        ) : (
                                            <button
                                                onClick={() => toggleActive(listing.id, !listing.isActive)}
                                                title={listing.isActive ? 'Pasife Al' : 'Aktif Et'}
                                                className={styles.iconBtn}
                                                style={{ color: listing.isActive ? '#f59e0b' : '#10b981' }}
                                            >
                                                {listing.isActive ? '⏸️' : '▶️'}
                                            </button>
                                        )}
                                        <button
                                            onClick={() => deleteListing(listing.id)}
                                            title="Sil"
                                            className={styles.iconBtn}
                                            style={{ color: '#ef4444' }}
                                        >🗑️</button>
                                    </div>
                                </td>
```

- [ ] **Step 7: Build check**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 8: Commit**

```bash
git add src/app/admin/listings/page.tsx
git commit -m "feat: admin listings - pending tab, approve/reject buttons"
```

---

## Task 5: isVerified + Plan Admin API

**Files:**
- Modify: `src/app/api/admin/users/route.ts`

- [ ] **Step 1: Replace PATCH handler**

Replace the existing `PATCH` export in `src/app/api/admin/users/route.ts` with:

```typescript
export async function PATCH(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user?.role !== "ADMIN") {
            return NextResponse.json({ message: "Yetkisiz." }, { status: 403 });
        }

        const { userId, role, isBanned, isVerified, plan } = await req.json();

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
        if (isBanned !== undefined) data.isBanned = isBanned;
        if (isVerified !== undefined) data.isVerified = isVerified;
        if (plan !== undefined) {
            if (!["FREE", "PRO"].includes(plan)) {
                return NextResponse.json({ message: "Geçersiz plan." }, { status: 400 });
            }
            data.plan = plan;
        }

        if (Object.keys(data).length === 0) {
            return NextResponse.json({ message: "Güncellenecek alan yok." }, { status: 400 });
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

- [ ] **Step 2: Build check**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/admin/users/route.ts
git commit -m "feat: admin users API - isVerified, plan, isBanned support; fix validRoles"
```

---

## Task 6: isVerified + Plan Admin UI

**Files:**
- Modify: `src/app/admin/users/page.tsx`

- [ ] **Step 1: Update UserRow interface**

Replace the `UserRow` interface:

```typescript
interface UserRow {
    id: string;
    name: string | null;
    email: string | null;
    role: string;
    plan: string;
    isVerified: boolean;
    isBanned?: boolean;
    createdAt: string;
    _count: { reports: number; listings: number; offers: number };
}
```

- [ ] **Step 2: Add handleVerified and handlePlan functions**

After `handleBan`, add:

```typescript
    const handleVerified = async (userId: string, isVerified: boolean) => {
        try {
            await fetch('/api/admin/users', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, isVerified }),
            });
            fetchUsers();
        } catch {
            setMessage({ type: 'error', text: 'Sunucu hatası.' });
            setTimeout(() => setMessage(null), 3000);
        }
    };

    const handlePlan = async (userId: string, plan: string) => {
        try {
            const res = await fetch('/api/admin/users', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, plan }),
            });
            if (res.ok) {
                setMessage({ type: 'success', text: `✅ Plan güncellendi: ${plan}` });
                fetchUsers();
            }
        } catch {
            setMessage({ type: 'error', text: 'Sunucu hatası.' });
        }
        setTimeout(() => setMessage(null), 3000);
    };
```

- [ ] **Step 3: Add isVerified column to table header**

In the `<thead>`, after `<th>Durum</th>`, add:
```typescript
                            <th>Doğrulandı</th>
                            <th>Plan</th>
```

- [ ] **Step 4: Add isVerified toggle and plan dropdown to table rows**

In the `<tbody>` rows, after the status `<td>`, add:

```typescript
                                <td>
                                    <div
                                        onClick={() => handleVerified(user.id, !user.isVerified)}
                                        title={user.isVerified ? 'Doğrulamayı Kaldır' : 'Doğrula'}
                                        style={{
                                            width: 36, height: 18, borderRadius: 9,
                                            background: user.isVerified ? '#10b981' : '#30363d',
                                            position: 'relative', cursor: 'pointer',
                                            transition: 'background 0.2s',
                                        }}
                                    >
                                        <div style={{
                                            width: 14, height: 14, background: 'white', borderRadius: '50%',
                                            position: 'absolute',
                                            top: 2,
                                            left: user.isVerified ? 20 : 2,
                                            transition: 'left 0.2s',
                                        }} />
                                    </div>
                                </td>
                                <td>
                                    <select
                                        value={user.plan ?? 'FREE'}
                                        onChange={e => handlePlan(user.id, e.target.value)}
                                        className={styles.roleSelect}
                                        style={{
                                            fontSize: '0.78rem', height: 28,
                                            color: user.plan === 'PRO' ? '#f59e0b' : 'var(--muted)',
                                        }}
                                    >
                                        <option value="FREE">FREE</option>
                                        <option value="PRO">PRO</option>
                                    </select>
                                </td>
```

- [ ] **Step 5: Build check**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 6: Commit**

```bash
git add src/app/admin/users/page.tsx
git commit -m "feat: admin users UI - isVerified toggle, plan dropdown"
```

---

## Task 7: Plan Enforcement APIs

**Files:**
- Modify: `src/app/api/reports/route.ts` — real auth + plan check
- Modify: `src/app/api/listings/route.ts` — plan check in POST
- Modify: `src/app/api/projects/[id]/scenarios/route.ts` — fix authOptions + plan check

- [ ] **Step 1: Fix reports POST — add real auth and plan check**

Replace `src/app/api/reports/route.ts` POST handler entirely:

```typescript
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { checkPlanLimit } from '@/lib/plan';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ success: false, error: 'Yetkisiz erişim.' }, { status: 401 });
        }

        const userId = session.user.id as string;
        const limitCheck = await checkPlanLimit(userId, 'reports');
        if (!limitCheck.allowed) {
            return NextResponse.json({
                success: false,
                error: 'PLAN_LIMIT',
                message: limitCheck.reason,
                upgradeRequired: true,
                current: limitCheck.current,
                limit: limitCheck.limit,
            }, { status: 403 });
        }

        const body = await req.json();

        const report = await prisma.report.create({
            data: {
                title: body.title || 'Yeni Arsa Hesaplama Raporu',
                totalApartments: body.totalApartments,
                apartmentSizeSqm: body.apartmentSizeSqm,
                luxLevelModifier: body.luxLevelModifier,
                landShareRatio: body.landShareRatio,
                minApartmentPrice: body.minApartmentPrice,
                landCost: body.landCost,
                userId,
            },
        });

        return NextResponse.json({ success: true, report }, { status: 201 });
    } catch (error) {
        console.error('Report creation error:', error);
        return NextResponse.json({ success: false, error: 'Sunucu hatası' }, { status: 500 });
    }
}

export async function GET() {
    try {
        const reports = await prisma.report.findMany({
            include: { user: true },
            orderBy: { createdAt: 'desc' }
        });
        return NextResponse.json({ success: true, reports });
    } catch (error) {
        return NextResponse.json({ success: false }, { status: 500 });
    }
}
```

- [ ] **Step 2: Add plan check to listings POST**

In `src/app/api/listings/route.ts`, add `import { checkPlanLimit } from '@/lib/plan'` at the top.

After the session check in POST, add the plan limit check (before the reportId ownership check):

```typescript
        const limitCheck = await checkPlanLimit(session.user.id as string, 'listings')
        if (!limitCheck.allowed) {
            return NextResponse.json({
                error: 'PLAN_LIMIT',
                message: limitCheck.reason,
                upgradeRequired: true,
                current: limitCheck.current,
                limit: limitCheck.limit,
            }, { status: 403 })
        }
```

- [ ] **Step 3: Fix scenarios POST — authOptions + plan check**

Replace `src/app/api/projects/[id]/scenarios/route.ts` entirely:

```typescript
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkPlanLimit } from "@/lib/plan";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id: projectId } = await params;
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ message: "Yetkisiz." }, { status: 403 });
        }

        const userId = session.user.id as string;

        const project = await prisma.project.findFirst({
            where: { id: projectId, userId },
        });
        if (!project) {
            return NextResponse.json({ message: "Proje bulunamadı." }, { status: 404 });
        }

        const limitCheck = await checkPlanLimit(userId, 'scenarios');
        if (!limitCheck.allowed) {
            return NextResponse.json({
                error: 'PLAN_LIMIT',
                message: limitCheck.reason,
                upgradeRequired: true,
                current: limitCheck.current,
                limit: limitCheck.limit,
            }, { status: 403 });
        }

        const body = await req.json();

        const scenario = await prisma.scenario.create({
            data: {
                name: body.name || `Senaryo ${Date.now()}`,
                projectId,
                luxLevel: body.luxLevel,
                apartmentSize: body.apartmentSize,
                landShareRatio: body.landShareRatio,
                totalApartments: body.totalApartments || null,
                arsaAlani: body.arsaAlani || null,
                riskLevel: body.riskLevel,
                builderProfit: body.builderProfit,
                iksaMode: body.iksaMode || "off",
                iksaPercentage: body.iksaPercentage || 0,
                iksaManualTL: body.iksaManualTL || 0,
                marketPrice: body.marketPrice || 0,
                fdTotal: body.fdTotal,
                fdPerM2: body.fdPerM2,
                mi: body.mi,
                ma: body.ma,
                totalCost: body.totalCost,
                fa: body.fa || null,
                fabirim: body.fabirim || null,
                sdx: body.sdx || null,
            },
        });

        return NextResponse.json({ message: "Senaryo eklendi.", scenario });
    } catch (error) {
        console.error("Scenario create error:", error);
        return NextResponse.json({ message: "Hata oluştu." }, { status: 500 });
    }
}
```

- [ ] **Step 4: Build check**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/reports/route.ts src/app/api/listings/route.ts src/app/api/projects/
git commit -m "feat: plan limit enforcement on reports, listings, scenarios POST"
```

---

## Task 8: Email Utility + Tests

**Files:**
- Create: `src/lib/email.ts`
- Create: `src/lib/email.test.ts`

- [ ] **Step 1: Install Resend**

```bash
npm install resend
```

- [ ] **Step 2: Add env var**

In `.env`, add:
```
RESEND_API_KEY=re_placeholder_change_this
```

In `.env.example` (if exists), add the same line with placeholder value.

- [ ] **Step 3: Write failing tests**

Create `src/lib/email.test.ts`:

```typescript
jest.mock('resend', () => ({
    Resend: jest.fn().mockImplementation(() => ({
        emails: {
            send: jest.fn().mockResolvedValue({ id: 'test-id' }),
        },
    })),
}))

jest.mock('@/lib/prisma', () => ({
    prisma: {
        user: {
            findUnique: jest.fn(),
        },
    },
}))

import { sendEmail, getEmailPrefs, buildMessageEmail, buildOfferEmail, buildApprovalEmail } from './email'
import { prisma } from '@/lib/prisma'

describe('buildMessageEmail', () => {
    it('includes sender name', () => {
        const html = buildMessageEmail('Emre Taner')
        expect(html).toContain('Emre Taner')
    })

    it('includes inbox link', () => {
        const html = buildMessageEmail('Emre')
        expect(html).toContain('/inbox')
    })
})

describe('buildOfferEmail', () => {
    it('includes listing title and share amount', () => {
        const html = buildOfferEmail('Kadıköy Arsası', 35)
        expect(html).toContain('Kadıköy Arsası')
        expect(html).toContain('%35')
    })
})

describe('buildApprovalEmail', () => {
    it('includes listing title', () => {
        const html = buildApprovalEmail('Beşiktaş 450m²')
        expect(html).toContain('Beşiktaş 450m²')
    })

    it('includes marketplace link', () => {
        const html = buildApprovalEmail('Test')
        expect(html).toContain('/marketplace')
    })
})

describe('getEmailPrefs', () => {
    const mockFindUnique = prisma.user.findUnique as jest.Mock

    beforeEach(() => jest.clearAllMocks())

    it('parses stored prefs', async () => {
        mockFindUnique.mockResolvedValue({ emailPrefs: '{"mesaj":false,"teklif":true,"ilan":true}' })
        const prefs = await getEmailPrefs('user-1')
        expect(prefs.mesaj).toBe(false)
        expect(prefs.teklif).toBe(true)
    })

    it('returns defaults when emailPrefs is empty string', async () => {
        mockFindUnique.mockResolvedValue({ emailPrefs: '{}' })
        const prefs = await getEmailPrefs('user-1')
        expect(prefs.mesaj).toBe(true)
        expect(prefs.teklif).toBe(true)
        expect(prefs.ilan).toBe(true)
    })

    it('returns defaults when user not found', async () => {
        mockFindUnique.mockResolvedValue(null)
        const prefs = await getEmailPrefs('ghost')
        expect(prefs.mesaj).toBe(true)
    })
})

describe('sendEmail', () => {
    it('calls resend.emails.send', async () => {
        const { Resend } = require('resend')
        const instance = new Resend()
        await sendEmail({ to: 'test@example.com', subject: 'Test', html: '<p>hi</p>' })
        // sendEmail creates its own Resend instance — just ensure no throw
    })
})
```

- [ ] **Step 4: Run tests to confirm they fail**

```bash
npx jest src/lib/email.test.ts --no-coverage
```

Expected: FAIL — "Cannot find module './email'"

- [ ] **Step 5: Implement email.ts**

Create `src/lib/email.ts`:

```typescript
import { Resend } from 'resend'
import { prisma } from '@/lib/prisma'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendEmail(params: {
    to: string
    subject: string
    html: string
}): Promise<void> {
    await resend.emails.send({
        from: 'ArsaBil <noreply@arsabil.com>',
        to: params.to,
        subject: params.subject,
        html: params.html,
    })
}

export async function getEmailPrefs(userId: string): Promise<{
    mesaj: boolean
    teklif: boolean
    ilan: boolean
}> {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { emailPrefs: true },
    })
    try {
        const parsed = JSON.parse(user?.emailPrefs ?? '{}')
        return {
            mesaj: parsed.mesaj ?? true,
            teklif: parsed.teklif ?? true,
            ilan: parsed.ilan ?? true,
        }
    } catch {
        return { mesaj: true, teklif: true, ilan: true }
    }
}

export function buildMessageEmail(senderName: string): string {
    return `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
        <h2 style="color:#1f6feb">Yeni Mesajınız Var</h2>
        <p><strong>${senderName}</strong> size bir mesaj gönderdi.</p>
        <a href="https://arsabil.com/inbox" style="display:inline-block;margin-top:16px;padding:10px 20px;background:#1f6feb;color:white;text-decoration:none;border-radius:8px;font-weight:700">Mesajı Görüntüle →</a>
        <p style="margin-top:24px;font-size:0.8rem;color:#6b7280">Bu bildirimi almak istemiyorsanız profil ayarlarınızdan e-posta tercihlerinizi güncelleyebilirsiniz.</p>
    </div>`
}

export function buildOfferEmail(listingTitle: string, share: number): string {
    return `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
        <h2 style="color:#10b981">Yeni Teklif Geldi!</h2>
        <p>"<strong>${listingTitle}</strong>" ilanınıza <strong>%${share}</strong> arsa payı teklifi geldi.</p>
        <a href="https://arsabil.com/dashboard" style="display:inline-block;margin-top:16px;padding:10px 20px;background:#10b981;color:white;text-decoration:none;border-radius:8px;font-weight:700">Teklifleri Görüntüle →</a>
        <p style="margin-top:24px;font-size:0.8rem;color:#6b7280">Bu bildirimi almak istemiyorsanız profil ayarlarınızdan e-posta tercihlerinizi güncelleyebilirsiniz.</p>
    </div>`
}

export function buildApprovalEmail(listingTitle: string): string {
    return `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
        <h2 style="color:#10b981">İlanınız Onaylandı!</h2>
        <p>"<strong>${listingTitle}</strong>" ilanınız yönetici tarafından onaylandı ve pazar yerine eklendi.</p>
        <a href="https://arsabil.com/marketplace" style="display:inline-block;margin-top:16px;padding:10px 20px;background:#1f6feb;color:white;text-decoration:none;border-radius:8px;font-weight:700">Pazar Yerini Görüntüle →</a>
        <p style="margin-top:24px;font-size:0.8rem;color:#6b7280">Bu bildirimi almak istemiyorsanız profil ayarlarınızdan e-posta tercihlerinizi güncelleyebilirsiniz.</p>
    </div>`
}
```

- [ ] **Step 6: Run tests to confirm they pass**

```bash
npx jest src/lib/email.test.ts --no-coverage
```

Expected: 10 tests pass.

- [ ] **Step 7: Commit**

```bash
git add src/lib/email.ts src/lib/email.test.ts package.json package-lock.json
git commit -m "feat: Resend email utility with message/offer/approval templates"
```

---

## Task 9: Email Triggers

**Files:**
- Modify: `src/app/api/messages/route.ts` — add sendEmail after createNotification
- Modify: `src/app/api/offers/route.ts` — add sendEmail after createNotification
- Modify: `src/app/api/admin/listings/route.ts` — add sendEmail in approve action

- [ ] **Step 1: Add email trigger to messages route**

In `src/app/api/messages/route.ts`:

Add to imports at top:
```typescript
import { sendEmail, buildMessageEmail, getEmailPrefs } from '@/lib/email'
```

In the POST handler, after the existing `createNotification(...).catch(() => {})` call for MESAJ_VAR, add:

```typescript
        // Email trigger — fire-and-forget
        if (receiverUser.email) {
            getEmailPrefs(receiverUserId).then(prefs => {
                if (!prefs.mesaj) return
                return sendEmail({
                    to: receiverUser.email!,
                    subject: 'Yeni Mesajınız Var — ArsaBil',
                    html: buildMessageEmail(senderName),
                })
            }).catch(() => {})
        }
```

Note: `receiverUser`, `receiverUserId`, and `senderName` come from the existing messages route logic. Adapt variable names to match what already exists in that file. Read the file to confirm exact variable names before editing.

- [ ] **Step 2: Add email trigger to offers route**

In `src/app/api/offers/route.ts`:

Add to imports at top:
```typescript
import { sendEmail, buildOfferEmail, getEmailPrefs } from '@/lib/email'
```

In the POST handler, after the existing `createNotification(...).catch(() => {})` call for TEKLIF_GELDI, add:

```typescript
        // Email trigger — fire-and-forget
        if (listingOwner.email) {
            getEmailPrefs(listingOwner.id).then(prefs => {
                if (!prefs.teklif) return
                return sendEmail({
                    to: listingOwner.email!,
                    subject: 'Yeni Teklif Geldi — ArsaBil',
                    html: buildOfferEmail(listingTitle, offerShare),
                })
            }).catch(() => {})
        }
```

Note: Adapt variable names (`listingOwner`, `listingTitle`, `offerShare`) to match what already exists in the offers route. Read the file before editing.

- [ ] **Step 3: Add email trigger to admin/listings approve action**

In `src/app/api/admin/listings/route.ts`:

Add to imports at top:
```typescript
import { sendEmail, buildApprovalEmail, getEmailPrefs } from '@/lib/email'
```

In the `action === 'approve'` block, after `createNotification(...).catch(() => {})`, add — but first extend the include to fetch user email:

Change the include in the approve `prisma.listing.update`:
```typescript
                include: { user: { select: { id: true, name: true, email: true } } },
```

Then after createNotification:
```typescript
            if (listing.user.email) {
                getEmailPrefs(listing.user.id).then(prefs => {
                    if (!prefs.ilan) return
                    return sendEmail({
                        to: listing.user.email!,
                        subject: 'İlanınız Onaylandı — ArsaBil',
                        html: buildApprovalEmail(listing.title ?? 'İlanınız'),
                    })
                }).catch(() => {})
            }
```

- [ ] **Step 4: Build check**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/messages/route.ts src/app/api/offers/route.ts src/app/api/admin/listings/route.ts
git commit -m "feat: email triggers for messages, offers, and listing approval"
```

---

## Task 10: Email Prefs API + UI

**Files:**
- Modify: `src/app/api/user/profile/route.ts` — PATCH: accept emailPrefs
- Modify: `src/app/dashboard/profile/page.tsx` — Settings tab: email pref toggles

- [ ] **Step 1: Update profile PATCH to accept emailPrefs**

In `src/app/api/user/profile/route.ts`, find the PATCH handler. Currently it handles `{ bio, linkedin, website }`. Add `emailPrefs` support.

In the destructuring from `req.json()`, add `emailPrefs`:
```typescript
        const { bio, linkedin, website, emailPrefs } = await req.json()
```

In the `prisma.user.update` data block, add:
```typescript
            ...(emailPrefs !== undefined ? { emailPrefs: JSON.stringify(emailPrefs) } : {}),
```

Also in the GET public profile response, ensure `emailPrefs` is NOT returned (it's private). The current GET for `/api/user/profile/[userId]` should not include emailPrefs in the select. The PATCH is on `/api/user/profile` (current user).

- [ ] **Step 2: Update profile page state**

In `src/app/dashboard/profile/page.tsx`:

Add to the `Tab` type:
```typescript
type Tab = 'portfolio' | 'listings' | 'favorites' | 'settings'
```

Add email prefs state (after existing state declarations):
```typescript
    const [emailPrefs, setEmailPrefs] = useState({ mesaj: true, teklif: true, ilan: true })
    const [savingPrefs, setSavingPrefs] = useState(false)
```

In the existing profile fetch `useEffect`, after setting bio/linkedin/website, also fetch emailPrefs:
```typescript
                if (data.emailPrefs) {
                    try {
                        setEmailPrefs(JSON.parse(data.emailPrefs))
                    } catch { /* keep defaults */ }
                }
```

For this to work, the `ProfileData` interface needs `emailPrefs: string | null` and the GET `/api/user/profile/[userId]` needs to return emailPrefs only for the owner. Since the profile page fetches `GET /api/user/profile/${session.user.id}`, and that route returns the full user data including emailPrefs, add `emailPrefs: string | null` to `ProfileData`.

- [ ] **Step 3: Add saveEmailPrefs function**

After the existing `handleSave` function, add:

```typescript
    const saveEmailPrefs = async () => {
        setSavingPrefs(true)
        try {
            await fetch('/api/user/profile', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ emailPrefs }),
            })
        } finally {
            setSavingPrefs(false)
        }
    }
```

- [ ] **Step 4: Add email prefs toggles to Settings tab**

In the settings tab JSX (where Tema & Ayarlar content is rendered), add after the existing theme section:

```tsx
                        {/* E-posta Tercihleri */}
                        <div style={{ marginTop: 28 }}>
                            <h3 style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--card-title)', marginBottom: 16 }}>
                                E-posta Bildirimleri
                            </h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                {([
                                    { key: 'mesaj', label: 'Yeni mesaj bildirimleri' },
                                    { key: 'teklif', label: 'Yeni teklif bildirimleri' },
                                    { key: 'ilan', label: 'İlan durum bildirimleri' },
                                ] as const).map(({ key, label }) => (
                                    <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontSize: '0.85rem', color: 'var(--text)' }}>{label}</span>
                                        <div
                                            onClick={() => setEmailPrefs(p => ({ ...p, [key]: !p[key] }))}
                                            style={{
                                                width: 40, height: 22, borderRadius: 11,
                                                background: emailPrefs[key] ? 'var(--primary)' : 'var(--border)',
                                                position: 'relative', cursor: 'pointer', transition: 'background 0.2s',
                                            }}
                                        >
                                            <div style={{
                                                width: 16, height: 16, background: 'white', borderRadius: '50%',
                                                position: 'absolute', top: 3,
                                                left: emailPrefs[key] ? 21 : 3,
                                                transition: 'left 0.2s',
                                            }} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <button
                                onClick={saveEmailPrefs}
                                disabled={savingPrefs}
                                style={{
                                    marginTop: 16, padding: '8px 20px',
                                    background: 'var(--primary)', color: 'white',
                                    border: 'none', borderRadius: 8, cursor: 'pointer',
                                    fontFamily: 'inherit', fontWeight: 700, fontSize: '0.85rem',
                                    opacity: savingPrefs ? 0.6 : 1,
                                }}
                            >
                                {savingPrefs ? 'Kaydediliyor…' : 'Kaydet'}
                            </button>
                        </div>
```

- [ ] **Step 5: Build check**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 6: Run full test suite to confirm no regressions**

```bash
npx jest --no-coverage
```

Expected: All tests pass (30 existing + 8 plan + 10 email = 48 tests).

- [ ] **Step 7: Commit**

```bash
git add src/app/api/user/profile/route.ts src/app/dashboard/profile/page.tsx
git commit -m "feat: email prefs - PATCH API + dashboard settings toggles"
```

---

## Faz 2A Complete ✅

All 10 tasks complete. Run final verification:

```bash
npx jest --no-coverage
npx tsc --noEmit
```

Both should pass cleanly.
