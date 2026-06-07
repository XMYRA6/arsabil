# ArsaBil Faz 3A — Profil Fotoğrafı Yükleme + İlan Reddi Bildirimi

**Tarih:** 2026-06-07
**Durum:** Onaylandı
**Kapsam:** Cloudinary profil fotoğrafı yükleme + ILAN_REDDEDILDI bildirim + email

---

## 1. Genel Bakış

İki bağımsız iyileştirme:

| Özellik | Kapsam |
|---------|--------|
| **Profil Fotoğrafı** | Cloudinary server-side upload, avatar dairesine tıkla, Navbar + profil sayfalarında göster |
| **Reddi Bildirimi** | ILAN_REDDEDILDI notification tipi + email, admin reject action'ına ekle |

---

## 2. Profil Fotoğrafı Yükleme

### 2.1 Veri Akışı

1. Kullanıcı avatar dairesine tıklar → gizli `<input type="file">` tetiklenir
2. Dosya seçilir → `FormData` ile `POST /api/user/avatar`
3. Sunucu: tip (JPEG/PNG/WebP) + boyut (max 2MB) validasyonu
4. Sunucu: Cloudinary Node SDK ile yükler (`cloudinary.uploader.upload`)
5. Sunucu: `prisma.user.update({ image: cloudinaryUrl })` kaydeder
6. Sunucu: `{ imageUrl }` döner
7. Client: local state güncellenir, avatar dairesi image olarak render edilir

### 2.2 Upload UI

Avatar dairesi üzerinde `position: relative` container. Fotoğraf varken dairenin üzerine gelinince `opacity: 0.7 + 📷` overlay gösterilir. Fotoğraf yokken sadece initials, hover'da 📷 overlay.

```tsx
<div style={{ position: 'relative', width: 80, height: 80, cursor: 'pointer' }}
     onClick={() => fileInputRef.current?.click()}>
    {imageUrl
        ? <img src={imageUrl} style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover' }} />
        : <div className={styles.avatarCircle}>{getInitials()}</div>
    }
    <div className={styles.avatarOverlay}>📷</div>
    <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp"
           style={{ display: 'none' }} onChange={handleAvatarUpload} />
</div>
```

`avatarOverlay` — `position: absolute; inset: 0; border-radius: 50%; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; opacity: 0; transition: opacity 0.2s` + parent hover → overlay `opacity: 1`.

### 2.3 API Endpoint

**`POST /api/user/avatar`** — multipart/form-data

```typescript
// Validasyon
const file = formData.get('file') as File
if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) → 400
if (file.size > 2 * 1024 * 1024) → 400  // 2MB

// Cloudinary
const buffer = Buffer.from(await file.arrayBuffer())
const result = await cloudinary.uploader.upload(
    `data:${file.type};base64,${buffer.toString('base64')}`,
    { folder: 'arsabil/avatars', public_id: `user_${userId}`, overwrite: true }
)

// DB
await prisma.user.update({ where: { id: userId }, data: { image: result.secure_url } })
return NextResponse.json({ imageUrl: result.secure_url })
```

`public_id: user_${userId}` + `overwrite: true` → her kullanıcının tek bir Cloudinary dosyası olur, güncelleme eski dosyanın üzerine yazar.

### 2.4 Session Refresh

NextAuth JWT token'ı upload sonrası otomatik güncellenmez. `handleAvatarUpload` başarılı olunca `update({ image: imageUrl })` çağrılır:

```typescript
// src/app/dashboard/profile/page.tsx
const { data: session, update } = useSession()

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
            await update({ image: data.imageUrl })  // JWT refresh → Navbar güncellenir
        }
    } finally {
        setUploadingAvatar(false)
    }
}
```

### 2.5 Navbar Avatar

`src/components/Navbar.tsx`'de `useSession()` ile `session.user.image` kontrol edilir. Session `update()` sonrası Navbar otomatik re-render edilir:

```tsx
{session.user.image
    ? <img src={session.user.image} style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover' }} />
    : <div className={styles.navAvatar}>{getInitials(session.user.name)}</div>
}
```

### 2.5 Public Profil Avatar

`src/app/profile/[userId]/page.tsx` — profil GET endpoint'i `image` alanını döner. JSX'de:

```tsx
{profile.image
    ? <img src={profile.image} style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover' }} />
    : <div className={styles.avatarCircle}>{getInitials(profile.name)}</div>
}
```

### 2.6 Konfigürasyon

**`next.config.mjs`** — Cloudinary image domain:
```js
images: {
    remotePatterns: [{ protocol: 'https', hostname: 'res.cloudinary.com' }]
}
```

**`.env`**:
```
CLOUDINARY_CLOUD_NAME=xxx
CLOUDINARY_API_KEY=xxx
CLOUDINARY_API_SECRET=xxx
```

**Bağımlılık:** `npm install cloudinary`

### 2.7 Etkilenen Dosyalar

| Dosya | İşlem |
|-------|-------|
| `src/app/api/user/avatar/route.ts` | Yeni — POST: upload to Cloudinary, save URL |
| `src/app/dashboard/profile/page.tsx` | Modify — avatar click, image display, upload handler |
| `src/components/Navbar.tsx` | Modify — session.user.image → avatar dairesi |
| `src/app/profile/[userId]/page.tsx` | Modify — profile.image → avatar gösterimi |
| `src/app/api/user/profile/[userId]/route.ts` | Modify — GET select'e `image: true` ekle |
| `src/app/dashboard/profile/page.module.css` | Modify — avatarOverlay, avatarWrapper stilleri |
| `next.config.mjs` | Modify — remotePatterns: res.cloudinary.com |

---

## 3. İlan Reddi Bildirimi

### 3.1 Akış

Admin "Reddet" butonuna tıklayınca:
1. `status: 'REJECTED', isActive: false` (mevcut)
2. **YENİ:** `createNotification(ILAN_REDDEDILDI, listing.user.id, entityId: listing.id)`
3. **YENİ:** Fire-and-forget email: `getEmailPrefs(listing.user.id).then(prefs => { if (!prefs.ilan) return; return sendEmail({ to: listing.user.email, subject: '...', html: buildRejectionEmail(listing.title) }) }).catch(() => {})`

### 3.2 Bildirim Tipi

`src/lib/notifications.ts`'e eklenir:

```typescript
ILAN_REDDEDILDI = 'ILAN_REDDEDILDI'
```

`getNotificationUrl` mapping:
```typescript
case 'ILAN_REDDEDILDI': return entityId ? `/listing/${entityId}` : '/dashboard'
```

`getNotificationMeta` mapping:
```typescript
case 'ILAN_REDDEDILDI':
    return { icon: '❌', title: 'İlan Onaylanmadı', body: 'İlanınız incelendi ve onaylanmadı.' }
```

### 3.3 Email Template

`src/lib/email.ts`'e eklenir:

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

### 3.4 Admin Listings PATCH Güncelleme

Mevcut `reject` action'ı:

```typescript
if (action === 'reject') {
    await prisma.listing.update({
        where: { id: listingId },
        data: { status: 'REJECTED', isActive: false },
    });
    return NextResponse.json({ ok: true });
}
```

Güncellenmiş:

```typescript
if (action === 'reject') {
    const listing = await prisma.listing.update({
        where: { id: listingId },
        data: { status: 'REJECTED', isActive: false },
        include: { user: { select: { id: true, name: true, email: true } } },
    });

    await createNotification({
        userId: listing.user.id,
        type: NotificationType.ILAN_REDDEDILDI,
        title: 'İlan Onaylanmadı',
        body: 'İlanınız incelendi ve onaylanmadı.',
        entityId: listing.id,
    });

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

### 3.5 Etkilenen Dosyalar

| Dosya | İşlem |
|-------|-------|
| `src/lib/notifications.ts` | ILAN_REDDEDILDI tipi + icon/url mapping |
| `src/lib/email.ts` | buildRejectionEmail() fonksiyonu |
| `src/lib/email.test.ts` | buildRejectionEmail testi |
| `src/app/api/admin/listings/route.ts` | reject action: notification + email trigger |

---

## 4. Test Stratejisi

- `src/lib/email.test.ts` — `buildRejectionEmail` şablonu test edilir (link, başlık içeriği)
- `src/lib/notifications.ts` — mevcut testlere `ILAN_REDDEDILDI` eklenir
- Mevcut 47 test regresyon olarak çalışmaya devam eder

---

## 5. Kapsam Dışı

- Cloudinary resim kırpma / crop UI (basit upload yeterli)
- Profil fotoğrafı silme / kaldır butonu
- Admin red gerekçesi / mesaj alanı
- Cloudinary CDN transformasyonları (thumbnail, resize)
