# ArsaBil Faz 3A Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add profile photo upload via Cloudinary and listing rejection notifications (bildirim + email).

**Architecture:** Two independent tracks. Track A (Tasks 1-3): Add `ILAN_REDDEDILDI` notification type to the existing notification/email system, then trigger it from the admin reject action. Track B (Tasks 4-9): Install Cloudinary SDK, create `POST /api/user/avatar` server-side upload endpoint, wire avatar image display into dashboard profile, Navbar, and public profile pages.

**Tech Stack:** Next.js 16 App Router, TypeScript, Prisma + PostgreSQL, NextAuth.js, Cloudinary Node SDK (`cloudinary` npm package), CSS Modules (no Tailwind), Jest/ts-jest.

---

## File Map

| File | Action |
|------|--------|
| `src/lib/notifications.ts` | Modify — add `ILAN_REDDEDILDI` to type union + getNotificationUrl + getNotificationIcon |
| `src/lib/notifications.test.ts` | Modify — add tests for ILAN_REDDEDILDI |
| `src/lib/email.ts` | Modify — add `buildRejectionEmail()` |
| `src/lib/email.test.ts` | Modify — add `buildRejectionEmail` tests |
| `src/app/api/admin/listings/route.ts` | Modify — reject action: include user, createNotification, sendEmail |
| `next.config.mjs` | Modify — add remotePatterns for res.cloudinary.com |
| `src/app/api/user/avatar/route.ts` | Create — POST: multipart, Cloudinary upload, save URL |
| `src/app/api/user/profile/[userId]/route.ts` | Modify — GET select: add `image: true` for owner |
| `src/app/dashboard/profile/page.tsx` | Modify — avatar upload UI, handleAvatarUpload, session update |
| `src/app/dashboard/profile/profile.module.css` | Modify — avatarWrapper, avatarOverlay classes |
| `src/components/layout/Navbar.tsx` | Modify — show session.user.image or initials in two places |
| `src/app/profile/[userId]/page.tsx` | Modify — ProfileData interface + image display |

---

## Task 1: ILAN_REDDEDILDI Notification Type + Tests

**Files:**
- Modify: `src/lib/notifications.ts`
- Modify: `src/lib/notifications.test.ts`

- [ ] **Step 1: Write failing tests**

Open `src/lib/notifications.test.ts`. Add two new test cases at the end of the existing test blocks:

```typescript
// In describe('getNotificationUrl', ...) add:
it('ILAN_REDDEDILDI → /listing/entityId', () =>
    expect(getNotificationUrl('ILAN_REDDEDILDI', 'xyz')).toBe('/listing/xyz'))

// In describe('getNotificationIcon', ...) add:
it('ILAN_REDDEDILDI → ❌', () => expect(getNotificationIcon('ILAN_REDDEDILDI')).toBe('❌'))
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx jest src/lib/notifications.test.ts --no-coverage
```

Expected: 2 failures (`getNotificationUrl` returning `''` for ILAN_REDDEDILDI, `getNotificationIcon` returning `'🔔'`).

- [ ] **Step 3: Update notifications.ts**

Replace the content of `src/lib/notifications.ts` with:

```typescript
import { prisma } from './prisma'

export type NotificationType = 'MESAJ_VAR' | 'TEKLIF_GELDI' | 'ILAN_ONAYLANDI' | 'ILAN_REDDEDILDI'

export function getNotificationUrl(type: string, entityId: string): string {
    if (!entityId) return ''
    if (type === 'MESAJ_VAR') return `/inbox?with=${entityId}`
    if (type === 'TEKLIF_GELDI') return `/listing/${entityId}`
    if (type === 'ILAN_ONAYLANDI') return `/listing/${entityId}`
    if (type === 'ILAN_REDDEDILDI') return `/listing/${entityId}`
    return ''
}

export function getNotificationIcon(type: string): string {
    if (type === 'MESAJ_VAR') return '💬'
    if (type === 'TEKLIF_GELDI') return '🏷️'
    if (type === 'ILAN_ONAYLANDI') return '✅'
    if (type === 'ILAN_REDDEDILDI') return '❌'
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

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npx jest src/lib/notifications.test.ts --no-coverage
```

Expected: All 6 tests pass (4 existing + 2 new).

- [ ] **Step 5: Commit**

```bash
git add src/lib/notifications.ts src/lib/notifications.test.ts
git commit -m "feat: add ILAN_REDDEDILDI notification type"
```

---

## Task 2: buildRejectionEmail Template + Test

**Files:**
- Modify: `src/lib/email.ts`
- Modify: `src/lib/email.test.ts`

- [ ] **Step 1: Write failing test**

Open `src/lib/email.test.ts`. Add import of `buildRejectionEmail` (add it to the existing import line):

```typescript
import { sendEmail, getEmailPrefs, buildMessageEmail, buildOfferEmail, buildApprovalEmail, buildRejectionEmail } from './email'
```

Then add a new describe block at the end of the file:

```typescript
describe('buildRejectionEmail', () => {
    it('includes listing title', () => {
        const html = buildRejectionEmail('Kadıköy 300m²')
        expect(html).toContain('Kadıköy 300m²')
    })

    it('handles null title gracefully', () => {
        const html = buildRejectionEmail(null)
        expect(html).toContain('İlanınız')
    })

    it('includes dashboard link', () => {
        const html = buildRejectionEmail('Test')
        expect(html).toContain('/dashboard')
    })
})
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
npx jest src/lib/email.test.ts --no-coverage
```

Expected: 3 failures (buildRejectionEmail not exported).

- [ ] **Step 3: Add buildRejectionEmail to email.ts**

Open `src/lib/email.ts`. Add this function at the end of the file (before the last closing brace/export if any, or simply append):

```typescript
export function buildRejectionEmail(listingTitle: string | null): string {
    const title = listingTitle ?? 'İlanınız'
    return `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
            <h2 style="color:#ef4444">❌ İlan Onaylanmadı</h2>
            <p>"<strong>${title}</strong>" başlıklı ilanınız incelendi ve onaylanmadı.</p>
            <p style="color:#666;font-size:0.9rem">
                Daha fazla bilgi için destek ekibimizle iletişime geçebilirsiniz.
            </p>
            <a href="https://arsabil.com/dashboard"
               style="display:inline-block;margin-top:16px;padding:10px 20px;background:#6366f1;color:white;border-radius:8px;text-decoration:none">
                Dashboard'a Git
            </a>
        </div>
    `
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npx jest src/lib/email.test.ts --no-coverage
```

Expected: All tests pass (9 existing + 3 new = 12 total).

- [ ] **Step 5: Commit**

```bash
git add src/lib/email.ts src/lib/email.test.ts
git commit -m "feat: add buildRejectionEmail template"
```

---

## Task 3: Admin Reject Action — Notification + Email Trigger

**Files:**
- Modify: `src/app/api/admin/listings/route.ts`

- [ ] **Step 1: Add buildRejectionEmail to imports**

Open `src/app/api/admin/listings/route.ts`. Find the existing import:

```typescript
import { sendEmail, buildApprovalEmail, getEmailPrefs } from '@/lib/email';
```

Replace with:

```typescript
import { sendEmail, buildApprovalEmail, buildRejectionEmail, getEmailPrefs } from '@/lib/email';
```

- [ ] **Step 2: Replace the reject action block**

Find this block (lines 64-70):

```typescript
        if (action === 'reject') {
            await prisma.listing.update({
                where: { id: listingId },
                data: { status: 'REJECTED', isActive: false },
            });
            return NextResponse.json({ ok: true });
        }
```

Replace with:

```typescript
        if (action === 'reject') {
            const listing = await prisma.listing.update({
                where: { id: listingId },
                data: { status: 'REJECTED', isActive: false },
                include: { user: { select: { id: true, name: true, email: true } } },
            });

            createNotification({
                userId: listing.user.id,
                type: 'ILAN_REDDEDILDI',
                title: 'İlan Onaylanmadı',
                body: `"${listing.title ?? 'İlanınız'}" incelendi ve onaylanmadı.`,
                entityId: listing.id,
            }).catch(() => {});

            getEmailPrefs(listing.user.id).then(prefs => {
                if (!prefs.ilan) return
                if (!listing.user.email) return
                return sendEmail({
                    to: listing.user.email,
                    subject: 'İlanınız Onaylanmadı — ArsaBil',
                    html: buildRejectionEmail(listing.title),
                })
            }).catch(() => {})

            return NextResponse.json({ ok: true });
        }
```

- [ ] **Step 3: Build check**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 4: Run full test suite**

```bash
npx jest --no-coverage
```

Expected: All tests pass (now 50 total: 47 original + 3 new email tests).

- [ ] **Step 5: Commit**

```bash
git add src/app/api/admin/listings/route.ts
git commit -m "feat: rejection notification + email on admin reject action"
```

---

## Task 4: Cloudinary Install + next.config.mjs

**Files:**
- Modify: `next.config.mjs`
- (Manual) `.env` — add 3 env vars

- [ ] **Step 1: Install cloudinary**

```bash
npm install cloudinary
```

Expected: `cloudinary` added to `package.json` dependencies.

- [ ] **Step 2: Add Cloudinary image domain to next.config.mjs**

Replace `next.config.mjs` content with:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
    output: "standalone",
    eslint: {
        ignoreDuringBuilds: true,
    },
    typescript: {
        ignoreBuildErrors: true,
    },
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'res.cloudinary.com',
            },
        ],
    },
};

export default nextConfig;
```

- [ ] **Step 3: Add env vars to .env**

Open `.env` (or `.env.local` if that exists). Add:

```
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

Get these values from https://console.cloudinary.com → Dashboard → API Keys.

- [ ] **Step 4: Build check**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add next.config.mjs package.json package-lock.json
git commit -m "feat: add Cloudinary image domain to next.config"
```

---

## Task 5: Avatar Upload API

**Files:**
- Create: `src/app/api/user/avatar/route.ts`

- [ ] **Step 1: Create the route file**

Create `src/app/api/user/avatar/route.ts` with this exact content:

```typescript
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { v2 as cloudinary } from 'cloudinary'

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
})

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_BYTES = 2 * 1024 * 1024  // 2 MB

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return NextResponse.json({ message: 'Yetkisiz.' }, { status: 401 })
        }

        const userId = session.user.id as string
        const formData = await req.formData()
        const file = formData.get('file') as File | null

        if (!file) {
            return NextResponse.json({ message: 'Dosya bulunamadı.' }, { status: 400 })
        }
        if (!ALLOWED_TYPES.includes(file.type)) {
            return NextResponse.json({ message: 'Sadece JPEG, PNG veya WebP yükleyebilirsiniz.' }, { status: 400 })
        }
        if (file.size > MAX_BYTES) {
            return NextResponse.json({ message: 'Dosya boyutu 2MB\'ı geçemez.' }, { status: 400 })
        }

        const buffer = Buffer.from(await file.arrayBuffer())
        const dataUri = `data:${file.type};base64,${buffer.toString('base64')}`

        const result = await cloudinary.uploader.upload(dataUri, {
            folder: 'arsabil/avatars',
            public_id: `user_${userId}`,
            overwrite: true,
            transformation: [{ width: 200, height: 200, crop: 'fill', gravity: 'face' }],
        })

        await prisma.user.update({
            where: { id: userId },
            data: { image: result.secure_url },
        })

        return NextResponse.json({ imageUrl: result.secure_url })
    } catch (error) {
        console.error('Avatar upload error:', error)
        return NextResponse.json({ message: 'Yükleme başarısız.' }, { status: 500 })
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
git add src/app/api/user/avatar/route.ts
git commit -m "feat: avatar upload API - Cloudinary server-side upload"
```

---

## Task 6: Profile GET — Add image Field

**Files:**
- Modify: `src/app/api/user/profile/[userId]/route.ts`

- [ ] **Step 1: Read current file**

Read `src/app/api/user/profile/[userId]/route.ts` to see the Prisma select for the owner vs non-owner.

- [ ] **Step 2: Add image to the owner select**

Find the Prisma `findUnique` call. The select object likely has conditional spread for owner. Add `image: true` to the owner-specific select (the part inside `...(isOwner ? { emailPrefs: true } : {})`):

Change:
```typescript
            ...(isOwner ? { emailPrefs: true } : {})
```
To:
```typescript
            ...(isOwner ? { emailPrefs: true, image: true } : { image: true })
```

Note: `image` is returned for ALL visitors (it's not sensitive — Cloudinary URLs are public). Only `emailPrefs` is owner-only.

- [ ] **Step 3: Build check**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 4: Run full test suite**

```bash
npx jest --no-coverage
```

Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/user/profile/[userId]/route.ts
git commit -m "feat: profile GET - include image field in response"
```

---

## Task 7: Dashboard Profile — Avatar Upload UI

**Files:**
- Modify: `src/app/dashboard/profile/page.tsx`
- Modify: `src/app/dashboard/profile/profile.module.css`

- [ ] **Step 1: Add CSS classes to profile.module.css**

Open `src/app/dashboard/profile/profile.module.css`. Append at the end:

```css
.avatarWrapper {
  position: relative;
  width: 72px;
  height: 72px;
  margin: 0 auto;
  cursor: pointer;
}

.avatarWrapper:hover .avatarOverlay {
  opacity: 1;
}

.avatarImage {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  object-fit: cover;
  display: block;
}

.avatarOverlay {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  opacity: 0;
  transition: opacity 0.2s;
}
```

- [ ] **Step 2: Update imports in profile page**

Open `src/app/dashboard/profile/page.tsx`. Find:

```typescript
import { useEffect, useState } from 'react'
import { useSession, signOut } from 'next-auth/react'
```

Replace with:

```typescript
import { useEffect, useState, useRef } from 'react'
import { useSession, signOut } from 'next-auth/react'
```

- [ ] **Step 3: Update useSession destructuring**

Find:

```typescript
    const { data: session } = useSession()
```

Replace with:

```typescript
    const { data: session, update } = useSession()
```

- [ ] **Step 4: Add avatar state and ref**

Find where existing state declarations end (around line 46, after `const [loadingFavs, setLoadingFavs] = useState(false)`). Add:

```typescript
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
    const [uploadingAvatar, setUploadingAvatar] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)
```

- [ ] **Step 5: Initialize avatarUrl from session**

The `useEffect` that fetches profile data is at line 64. After setting bio/linkedin/website, also initialize avatarUrl from the session image. Find the profile fetch useEffect and add:

```typescript
        setAvatarUrl(data.image ?? null)
```

Add this line after the emailPrefs parsing block (after the `try/catch` for emailPrefs), so it looks like:

```typescript
            .then((data: ProfileData) => {
                setProfile(data)
                setBio(data.bio ?? '')
                setLinkedin(data.linkedin ?? '')
                setWebsite(data.website ?? '')
                setAvatarUrl(data.image ?? null)
                if (data.emailPrefs) {
                    try {
                        setEmailPrefs(JSON.parse(data.emailPrefs))
                    } catch { /* keep defaults */ }
                }
            })
```

- [ ] **Step 6: Update ProfileData interface**

Find:
```typescript
interface ProfileData {
    id: string
    name: string | null
    bio: string | null
    linkedin: string | null
    website: string | null
    isVerified: boolean
    emailPrefs: string | null
    reports: { id: string; title: string; landShareRatio: number; createdAt: string }[]
    listings: { id: string; title: string | null; city: string | null; price: number | null; isActive: boolean; createdAt: string }[]
}
```

Replace with:
```typescript
interface ProfileData {
    id: string
    name: string | null
    bio: string | null
    linkedin: string | null
    website: string | null
    isVerified: boolean
    emailPrefs: string | null
    image: string | null
    reports: { id: string; title: string; landShareRatio: number; createdAt: string }[]
    listings: { id: string; title: string | null; city: string | null; price: number | null; isActive: boolean; createdAt: string }[]
}
```

- [ ] **Step 7: Add handleAvatarUpload function**

After the `saveEmailPrefs` function, add:

```typescript
    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        const formData = new FormData()
        formData.append('file', file)
        setUploadingAvatar(true)
        try {
            const res = await fetch('/api/user/avatar', { method: 'POST', body: formData })
            const data = await res.json()
            if (res.ok) {
                setAvatarUrl(data.imageUrl)
                await update({ image: data.imageUrl })
            }
        } finally {
            setUploadingAvatar(false)
            if (fileInputRef.current) fileInputRef.current.value = ''
        }
    }
```

- [ ] **Step 8: Replace avatar JSX**

In the JSX, find:

```tsx
                    <div className={styles.avatarCircle}>{getInitials()}</div>
```

Replace with:

```tsx
                    <div
                        className={styles.avatarWrapper}
                        onClick={() => !uploadingAvatar && fileInputRef.current?.click()}
                        title="Fotoğraf değiştir"
                    >
                        {avatarUrl
                            ? <img src={avatarUrl} alt="Profil" className={styles.avatarImage} />
                            : <div className={styles.avatarCircle}>{getInitials()}</div>
                        }
                        <div className={styles.avatarOverlay}>
                            {uploadingAvatar ? '⏳' : '📷'}
                        </div>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            style={{ display: 'none' }}
                            onChange={handleAvatarUpload}
                        />
                    </div>
```

- [ ] **Step 9: Build check**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 10: Run tests**

```bash
npx jest --no-coverage
```

Expected: All tests pass.

- [ ] **Step 11: Commit**

```bash
git add src/app/dashboard/profile/page.tsx src/app/dashboard/profile/profile.module.css
git commit -m "feat: profile page - avatar click-to-upload with Cloudinary + session refresh"
```

---

## Task 8: Navbar — Show Avatar Image

**Files:**
- Modify: `src/components/layout/Navbar.tsx`

The Navbar shows initials in two places:
1. The `<button className={styles.userBtn}>` trigger (line ~361-367)
2. The `styles.userInitialsLarge` div inside the dropdown header (line ~375)

- [ ] **Step 1: Update userBtn to show image or initials**

Find:

```tsx
                            <button className={styles.userBtn} onClick={() => {
                                setIsUserMenuOpen(!isUserMenuOpen);
                                setIsInboxOpen(false);
                                setIsNotifOpen(false);
                            }}>
                                {getInitials()}
                            </button>
```

Replace with:

```tsx
                            <button className={styles.userBtn} onClick={() => {
                                setIsUserMenuOpen(!isUserMenuOpen);
                                setIsInboxOpen(false);
                                setIsNotifOpen(false);
                            }} style={{ padding: session?.user?.image ? 0 : undefined, overflow: 'hidden' }}>
                                {session?.user?.image
                                    ? <img src={session.user.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                                    : getInitials()
                                }
                            </button>
```

- [ ] **Step 2: Update dropdown header avatar**

Find:

```tsx
                                        <div className={styles.userInitialsLarge}>{getInitials()}</div>
```

Replace with:

```tsx
                                        {session?.user?.image
                                            ? <img src={session.user.image} alt="" className={styles.userInitialsLarge} style={{ objectFit: 'cover', borderRadius: '50%' }} />
                                            : <div className={styles.userInitialsLarge}>{getInitials()}</div>
                                        }
```

- [ ] **Step 3: Build check**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 4: Run tests**

```bash
npx jest --no-coverage
```

Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/layout/Navbar.tsx
git commit -m "feat: Navbar - show profile photo when available"
```

---

## Task 9: Public Profile — Show Avatar Image

**Files:**
- Modify: `src/app/profile/[userId]/page.tsx`

- [ ] **Step 1: Update ProfileData interface**

Find:

```typescript
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
```

Replace with:

```typescript
interface ProfileData {
    id: string
    name: string | null
    bio: string | null
    linkedin: string | null
    website: string | null
    isVerified: boolean
    image: string | null
    reports: { id: string; title: string; landShareRatio: number; createdAt: string }[]
    listings: { id: string; title: string | null; city: string | null; price: number | null; isActive: boolean }[]
}
```

- [ ] **Step 2: Update page params (Next.js 15+ async params)**

Check the current function signature. If it uses:
```typescript
export default async function PublicProfilePage({ params }: { params: { userId: string } }) {
    const profile = await getProfile(params.userId)
```

The public profile page is a server component. In Next.js 15+, params in server components must also be awaited. Change to:

```typescript
export default async function PublicProfilePage({ params }: { params: Promise<{ userId: string }> }) {
    const { userId } = await params
    const profile = await getProfile(userId)
```

- [ ] **Step 3: Replace avatar JSX**

Find:

```tsx
                <div className={styles.avatarCircle}>{getInitials(profile.name)}</div>
```

Replace with:

```tsx
                {profile.image
                    ? <img src={profile.image} alt={profile.name ?? 'Profil'} style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover' }} />
                    : <div className={styles.avatarCircle}>{getInitials(profile.name)}</div>
                }
```

- [ ] **Step 4: Build check**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 5: Run full test suite**

```bash
npx jest --no-coverage
```

Expected: All tests pass. Total: 50 tests (47 original + 3 buildRejectionEmail).

- [ ] **Step 6: Commit**

```bash
git add src/app/profile/[userId]/page.tsx
git commit -m "feat: public profile - show avatar image when available"
```

---

## Faz 3A Complete ✅

Final verification:

```bash
npx jest --no-coverage
npx tsc --noEmit
```

Both should pass cleanly.

**Manual smoke test checklist:**
- [ ] Go to `/dashboard/profile` → click avatar circle → select a photo → verify photo appears in avatar + Navbar
- [ ] Go to `/admin/listings` → reject a listing → check the listing owner's notification panel shows ❌ İlan Onaylanmadı
- [ ] Go to `/profile/[userId]` of a user with a photo → verify avatar shows (not initials)
- [ ] Try uploading a file > 2MB → verify error toast
- [ ] Try uploading a .gif → verify error toast
