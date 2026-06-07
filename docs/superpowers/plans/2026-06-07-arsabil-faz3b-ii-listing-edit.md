# ArsaBil Faz 3B-II — İlan Düzenleme Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let listing owners edit their published listings via a wizard-style edit page at `/listings/[id]/edit`.

**Architecture:** New PATCH endpoint on `/api/listings/[id]` (owner-only). New client page reuses existing wizard step components (WizardStep1-4). On save, listing status is forced to PENDING and `isActive = false` so admin re-approves. "Düzenle" button appears on the listing detail page only for the owner.

**Prerequisites:** Faz 3B-I must be complete — `WizardFormData.photos` is `{ url: string; publicId: string }[]`, and `publicIdFromUrl` is exported from `src/lib/upload.ts`.

**Tech Stack:** Next.js 16 App Router, TypeScript, Prisma ORM, CSS Modules, existing wizard components at `src/components/listing-wizard/`.

---

## File Map

| File | Action |
|------|--------|
| `src/app/api/listings/[id]/route.ts` | Add PATCH handler |
| `src/app/listings/[id]/edit/page.tsx` | New page |
| `src/app/listing/[id]/page.tsx` | Add "Düzenle" button for owner |

---

### Task 1: PATCH /api/listings/[id] — owner edit endpoint

**Files:**
- Modify: `src/app/api/listings/[id]/route.ts`

Current file only has `GET`. Add `PATCH` that updates listing fields and resets status to PENDING.

**Context:**
- Auth: `getServerSession(authOptions)` from `'next-auth/next'`; `authOptions` from `'@/lib/auth'`
- Prisma: `prisma` from `'@/lib/prisma'`
- Async params pattern: `context: { params: Promise<{ id: string }> }` + `const { id } = await context.params`
- The `GET` handler already uses this pattern — match it

- [ ] **Step 1: Add PATCH to `src/app/api/listings/[id]/route.ts`**

Read the current file first. Then append after the existing `GET` function:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
```

(Add these imports at the top if not already present. `prisma` is already imported.)

Then add the PATCH function after GET:

```typescript
export async function PATCH(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const userId = session.user.id as string
    const { id } = await context.params

    try {
        const existing = await prisma.listing.findUnique({
            where: { id },
            select: { userId: true },
        })
        if (!existing) {
            return NextResponse.json({ error: 'İlan bulunamadı' }, { status: 404 })
        }
        if (existing.userId !== userId) {
            return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 })
        }

        const body = await req.json()
        const { title, address, phone, description, price, landSizeSqm, zoning, titleDeed, photos, city, district, reportId } = body

        const updated = await prisma.listing.update({
            where: { id },
            data: {
                ...(city !== undefined ? { city } : {}),
                ...(district !== undefined ? { district } : {}),
                ...(address !== undefined ? { address } : {}),
                ...(title !== undefined ? { title } : {}),
                ...(landSizeSqm !== undefined ? { landSizeSqm: landSizeSqm ? Number(landSizeSqm) : null } : {}),
                ...(price !== undefined ? { price: price ? Number(price) : null } : {}),
                ...(zoning !== undefined ? { zoning } : {}),
                ...(titleDeed !== undefined ? { titleDeed } : {}),
                ...(description !== undefined ? { description } : {}),
                ...(phone !== undefined ? { phone } : {}),
                ...(photos !== undefined ? { photos } : {}),
                ...(reportId !== undefined ? { reportId: reportId || null } : {}),
                status: 'PENDING',
                isActive: false,
            },
        })
        return NextResponse.json(updated)
    } catch {
        return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
    }
}
```

- [ ] **Step 2: TypeScript check**

```
npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 3: Run tests**

```
npx jest --no-coverage
```

Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/listings/[id]/route.ts
git commit -m "feat: add PATCH /api/listings/[id] for owner listing edit"
```

---

### Task 2: /listings/[id]/edit page

**Files:**
- Create: `src/app/listings/[id]/edit/page.tsx`

This page reuses all existing wizard step components. It fetches the listing on mount, pre-fills form, and saves via PATCH.

**Important — photos pre-fill:** The DB stores photos as `String[]` (plain URLs). We convert them to `{ url, publicId: '' }[]` for the wizard form. When the user removes one, `WizardStep3Photos.handleRemove` uses `publicIdFromUrl(photo.url)` as fallback when `publicId` is empty — this correctly derives the Cloudinary public_id from the URL.

**CSS:** Import the existing `src/app/listings/new/page.module.css` (same layout, no new CSS file needed).

- [ ] **Step 1: Create `src/app/listings/[id]/edit/page.tsx`**

```typescript
'use client'

import { useEffect, useRef, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useParams, useRouter } from 'next/navigation'
import styles from '../../new/page.module.css'
import { WizardProgress } from '@/components/listing-wizard/WizardProgress'
import { WizardStep1Location } from '@/components/listing-wizard/WizardStep1Location'
import { WizardStep2Detail } from '@/components/listing-wizard/WizardStep2Detail'
import { WizardStep3Photos } from '@/components/listing-wizard/WizardStep3Photos'
import { WizardStep4Feasibility } from '@/components/listing-wizard/WizardStep4Feasibility'
import { WizardFormData, emptyFormData } from '@/components/listing-wizard/types'

const STEP_TITLES = [
    'Konum Bilgisi',
    'Arsa Detayları',
    'Fotoğraflar',
    'Fizibilite Bağla',
    'Önizle & Kaydet',
]

export default function EditListingPage() {
    const { status } = useSession()
    const router = useRouter()
    const params = useParams()
    const id = params?.id as string
    const [step, setStep] = useState(1)
    const [form, setForm] = useState<WizardFormData>(emptyFormData)
    const [loadingData, setLoadingData] = useState(true)
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        if (status === 'unauthenticated') router.push('/login')
    }, [status, router])

    useEffect(() => {
        if (status !== 'authenticated' || !id) return
        fetch(`/api/listings/${id}`)
            .then(r => r.json())
            .then(listing => {
                if (!listing?.id) { router.push('/marketplace'); return }
                setForm({
                    city: listing.city ?? '',
                    district: listing.district ?? '',
                    address: listing.address ?? '',
                    title: listing.title ?? '',
                    landSizeSqm: listing.landSizeSqm ? String(listing.landSizeSqm) : '',
                    price: listing.price ? String(listing.price) : '',
                    zoning: listing.zoning ?? '',
                    titleDeed: listing.titleDeed ?? '',
                    description: listing.description ?? '',
                    phone: listing.phone ?? '',
                    photos: (listing.photos ?? []).map((url: string) => ({ url, publicId: '' })),
                    reportId: listing.reportId ?? '',
                })
            })
            .catch(() => router.push('/marketplace'))
            .finally(() => setLoadingData(false))
    }, [status, id, router])

    const update = (patch: Partial<WizardFormData>) => setForm(prev => ({ ...prev, ...patch }))

    const canGoNext = (): boolean => {
        if (step === 1) return !!form.city
        if (step === 2) return !!form.title && !!form.landSizeSqm
        return true
    }

    const handleSave = async () => {
        setSaving(true)
        try {
            const res = await fetch(`/api/listings/${id}`, {
                method: 'PATCH',
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
                    photos: form.photos.map(p => p.url),
                    reportId: form.reportId || null,
                }),
            })
            if (res.ok) {
                router.push(`/listing/${id}`)
            } else {
                const err = await res.json()
                alert(err.message || err.error || 'İlan güncellenirken bir hata oluştu.')
                setSaving(false)
            }
        } catch {
            alert('Bir hata oluştu.')
            setSaving(false)
        }
    }

    if (status === 'loading' || loadingData) return null

    return (
        <div className={styles.container}>
            <h1 className={styles.pageTitle}>İlanı Düzenle</h1>

            <div className={styles.card}>
                <WizardProgress currentStep={step} />
                <h2 className={styles.stepTitle}>{STEP_TITLES[step - 1]}</h2>

                {step === 1 && <WizardStep1Location data={form} onChange={update} />}
                {step === 2 && <WizardStep2Detail data={form} onChange={update} />}
                {step === 3 && <WizardStep3Photos data={form} onChange={update} tempListingId={id} />}
                {step === 4 && <WizardStep4Feasibility data={form} onChange={update} />}
                {step === 5 && (
                    <div style={{ padding: '1rem 0' }}>
                        <p style={{ color: 'var(--muted)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
                            İlanı kaydetmek, tekrar admin onayına gönderecek. Onay sonrası marketplace&apos;te görünür.
                        </p>
                        <button
                            onClick={handleSave}
                            disabled={saving || !form.title || !form.city}
                            style={{
                                padding: '0.75rem 2rem', background: 'var(--primary)', color: 'white',
                                border: 'none', borderRadius: '8px', fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer',
                                fontSize: '1rem', opacity: (saving || !form.title || !form.city) ? 0.6 : 1,
                            }}
                        >
                            {saving ? 'Kaydediliyor...' : '💾 İlanı Kaydet'}
                        </button>
                    </div>
                )}

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

- [ ] **Step 2: TypeScript check**

```
npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 3: Run tests**

```
npx jest --no-coverage
```

Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/app/listings/[id]/edit/page.tsx
git commit -m "feat: add listing edit page at /listings/[id]/edit"
```

---

### Task 3: "Düzenle" button on listing detail page

**Files:**
- Modify: `src/app/listing/[id]/page.tsx`

Add a "Düzenle" button visible only to the listing owner. The page is already a client component with `useParams` and `useRouter`. Need to import `useSession` and check `session?.user?.id === listing.user?.id`.

- [ ] **Step 1: Read `src/app/listing/[id]/page.tsx`**

Read the full file to understand current imports and where `listing.user` is referenced.

- [ ] **Step 2: Add `useSession` import**

Find the existing import line at the top:
```typescript
import { useParams, useRouter, useSearchParams } from 'next/navigation';
```

Add a new import line after the existing imports from `next/navigation`:
```typescript
import { useSession } from 'next-auth/react';
```

- [ ] **Step 3: Add `useSession` to the component**

Find in `export default function ListingDetailPage()`:
```typescript
const params = useParams();
```

Add after it:
```typescript
const { data: session } = useSession();
```

- [ ] **Step 4: Add "Düzenle" button**

Find the title row block in the JSX — it looks like:
```tsx
<div style={{ marginBottom: 20 }}>
    <h1 style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--card-title)', marginBottom: 4 }}>{listing.title}</h1>
    <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>📍 {listing.district}, {listing.city}</div>
</div>
```

Replace it with:
```tsx
<div style={{ marginBottom: 20 }}>
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--card-title)', marginBottom: 4 }}>{listing.title}</h1>
        {session?.user?.id && listing.user?.id && session.user.id === listing.user.id && (
            <button
                onClick={() => router.push(`/listings/${id}/edit`)}
                style={{
                    padding: '6px 14px', background: 'var(--border)', color: 'var(--card-title)',
                    border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 700,
                    fontSize: '0.8rem', whiteSpace: 'nowrap', flexShrink: 0,
                }}
            >
                ✏️ Düzenle
            </button>
        )}
    </div>
    <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>📍 {listing.district}, {listing.city}</div>
</div>
```

- [ ] **Step 5: TypeScript check**

```
npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 6: Run tests**

```
npx jest --no-coverage
```

Expected: all tests pass.

- [ ] **Step 7: Commit**

```bash
git add src/app/listing/[id]/page.tsx
git commit -m "feat: show Düzenle button on listing detail for owner"
```
