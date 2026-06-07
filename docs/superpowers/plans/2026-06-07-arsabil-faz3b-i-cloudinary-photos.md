# ArsaBil Faz 3B-I — İlan Fotoğrafları Cloudinary Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace filesystem photo uploads with Cloudinary so listing photos work in production (Vercel/serverless).

**Architecture:** Drop-in API replacement — `POST /api/upload` becomes a Cloudinary uploader returning `{ url, publicId }`. `DELETE /api/upload` is added to delete individual photos. The `WizardFormData.photos` type changes from `string[]` to `{ url: string; publicId: string }[]` so publicId survives step navigation. DB schema unchanged (`Listing.photos String[]` keeps only URLs).

**Tech Stack:** Next.js 16 App Router, TypeScript, Cloudinary Node SDK (`cloudinary` package already installed), `src/lib/upload.ts` validation helpers, CSS Modules.

---

## File Map

| File | Action |
|------|--------|
| `src/lib/upload.ts` | Add `publicIdFromUrl` export |
| `src/app/api/upload/route.ts` | Full rewrite: Cloudinary POST + new DELETE |
| `src/components/listing-wizard/types.ts` | `photos` type change |
| `src/components/listing-wizard/WizardStep3Photos.tsx` | Upload/remove logic update |
| `src/components/listing-wizard/WizardStep5Preview.tsx` | Use `photo.url` |
| `src/app/listings/new/page.tsx` | `photos.map(p => p.url)` on publish |

---

### Task 1: Add publicIdFromUrl to upload utils + update WizardFormData type

**Files:**
- Modify: `src/lib/upload.ts`
- Modify: `src/components/listing-wizard/types.ts`

This task changes the `photos` type in `WizardFormData` and adds a helper used by the edit page later (Faz 3B-II).

- [ ] **Step 1: Add `publicIdFromUrl` to `src/lib/upload.ts`**

Append to the end of the file (keep all existing exports unchanged):

```typescript
export function publicIdFromUrl(url: string): string {
    // Extracts Cloudinary public_id from URL.
    // https://res.cloudinary.com/cloud/image/upload/v123/arsabil/listings/xyz/abc.jpg
    // → arsabil/listings/xyz/abc
    const match = url.match(/\/upload\/(?:v\d+\/)?(.+)\.[a-z]+$/)
    return match ? match[1] : ''
}
```

- [ ] **Step 2: Update `photos` type in `src/components/listing-wizard/types.ts`**

Replace the file completely with:

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
    photos: { url: string; publicId: string }[]
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

- [ ] **Step 3: Run TypeScript to see expected errors**

```
npx tsc --noEmit 2>&1 | head -40
```

Expected: errors in `WizardStep3Photos.tsx`, `WizardStep5Preview.tsx`, `listings/new/page.tsx` — these will be fixed in Task 2 and 3. Do NOT commit yet.

---

### Task 2: Update wizard components to use `{ url, publicId }[]`

**Files:**
- Modify: `src/components/listing-wizard/WizardStep3Photos.tsx`
- Modify: `src/components/listing-wizard/WizardStep5Preview.tsx`
- Modify: `src/app/listings/new/page.tsx`

- [ ] **Step 1: Rewrite `src/components/listing-wizard/WizardStep3Photos.tsx`**

```typescript
import { useRef, useState } from 'react'
import styles from './wizard.module.css'
import { WizardFormData } from './types'
import { MAX_FILES_PER_LISTING, publicIdFromUrl } from '@/lib/upload'

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
    const uploaded: { url: string; publicId: string }[] = []
    for (const file of Array.from(files).slice(0, slots)) {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('listingId', tempListingId)
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      if (res.ok) {
        const { url, publicId } = await res.json()
        uploaded.push({ url, publicId })
      } else {
        const { error: err } = await res.json()
        setError(err || 'Yükleme hatası')
      }
    }
    onChange({ photos: [...data.photos, ...uploaded] })
    setUploading(false)
  }

  const handleRemove = (photo: { url: string; publicId: string }) => {
    onChange({ photos: data.photos.filter(p => p.url !== photo.url) })
    const pid = photo.publicId || publicIdFromUrl(photo.url)
    if (pid) {
      fetch('/api/upload', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publicId: pid }),
      }).catch(() => {})
    }
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
            : <>{`Fotoğraf yüklemek için tıkla veya sürükle bırak`}<br /><small>{`Max ${MAX_FILES_PER_LISTING} görsel · JPG, PNG, WebP · 5MB/dosya`}</small></>
          }
        </p>
      </div>

      {error && <p className={styles.errorText}>{error}</p>}

      {data.photos.length > 0 && (
        <div className={styles.photoGrid}>
          {data.photos.map(photo => (
            <div key={photo.url} className={styles.photoItem}>
              <img src={photo.url} alt="" className={styles.photoImg} />
              <button
                className={styles.photoRemove}
                onClick={() => handleRemove(photo)}
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

- [ ] **Step 2: Fix photo display in `src/components/listing-wizard/WizardStep5Preview.tsx`**

Read the file first. Find this line:
```tsx
<img src={data.photos[0]} alt={data.title} ...
```

Replace it with:
```tsx
<img src={data.photos[0].url} alt={data.title} ...
```

That is the only change needed in this file.

- [ ] **Step 3: Fix publish handler in `src/app/listings/new/page.tsx`**

Read the file. Find in `handlePublish`:
```typescript
photos: form.photos,
```

Replace with:
```typescript
photos: form.photos.map(p => p.url),
```

That is the only change needed in this file.

- [ ] **Step 4: TypeScript check — should be clean**

```
npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 5: Run tests**

```
npx jest --no-coverage
```

Expected: all 52 tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/lib/upload.ts src/components/listing-wizard/types.ts src/components/listing-wizard/WizardStep3Photos.tsx src/components/listing-wizard/WizardStep5Preview.tsx src/app/listings/new/page.tsx
git commit -m "refactor: photos type { url, publicId }[], add publicIdFromUrl helper"
```

---

### Task 3: Rewrite upload API — Cloudinary POST + DELETE

**Files:**
- Modify: `src/app/api/upload/route.ts`

The current file uses `writeFile`/`mkdir` (filesystem). Replace it entirely with Cloudinary.

**Context:**
- Auth: `getServerSession(authOptions)` from `'next-auth/next'`, `authOptions` from `'@/lib/auth'`
- Prisma: NOT needed in this file
- Cloudinary env vars: `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
- Validation helpers from `@/lib/upload`: `isAllowedMimeType`, `isWithinSizeLimit` (keep using these)
- `mimeToExtension` is no longer needed (Cloudinary handles extension)

- [ ] **Step 1: Rewrite `src/app/api/upload/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { v2 as cloudinary } from 'cloudinary'
import { isAllowedMimeType, isWithinSizeLimit } from '@/lib/upload'

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key:    process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
})

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions)
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

    try {
        const buffer = Buffer.from(await file.arrayBuffer())
        const dataUri = `data:${file.type};base64,${buffer.toString('base64')}`
        const result = await cloudinary.uploader.upload(dataUri, {
            folder: 'arsabil/listings',
            public_id: `${listingId}/${crypto.randomUUID()}`,
            overwrite: false,
        })
        return NextResponse.json({ url: result.secure_url, publicId: result.public_id }, { status: 201 })
    } catch {
        return NextResponse.json({ error: 'Yükleme başarısız oldu.' }, { status: 500 })
    }
}

export async function DELETE(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const { publicId } = await req.json()
        if (!publicId) {
            return NextResponse.json({ error: 'publicId zorunlu' }, { status: 400 })
        }
        await cloudinary.uploader.destroy(publicId)
        return NextResponse.json({ ok: true })
    } catch {
        return NextResponse.json({ error: 'Silme başarısız oldu.' }, { status: 500 })
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

Expected: all 52 tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/upload/route.ts
git commit -m "feat: replace filesystem upload with Cloudinary, add DELETE /api/upload"
```
