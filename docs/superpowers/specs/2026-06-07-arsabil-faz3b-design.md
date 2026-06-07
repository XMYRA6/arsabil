# ArsaBil Faz 3B — İlan Fotoğrafları Cloudinary + İlan Düzenleme + SSE Mesajlaşma

**Tarih:** 2026-06-07  
**Durum:** Onaylandı  
**Kapsam:** 3 bağımsız geliştirme — sırayla uygulanır

---

## Genel Plan

| Sıra | Özellik | Öncelik |
|------|---------|---------|
| **3B-I** | İlan Fotoğrafları → Cloudinary | Önce (production zorunluluğu) |
| **3B-II** | İlan Düzenleme (`/listings/[id]/edit`) | Sonra (Cloudinary hazır olunca) |
| **3B-III** | SSE Mesajlaşma | Son (bağımsız) |

Her alt faz kendi tasarım bölümüne sahip; tek spec dosyasında tutulur.

---

## 3B-I: İlan Fotoğrafları → Cloudinary

### Bağlam

Şu an `POST /api/upload` dosyaları `public/uploads/listings/[listingId]/` altına yazar ve `/uploads/...` şeklinde yerel URL döner. Vercel ve çok sunuculı ortamlarda filesystem yazılamaz — production'da çalışmaz. Cloudinary zaten kurulu (`npm install cloudinary` — Faz 3A'da yapıldı) ve `next.config.mjs` remotePatterns'e `res.cloudinary.com` eklendi.

Mevcut DB'de gerçek foto URL'si yok (test aşamasındayız) — migration gerekmez.

### Yaklaşım: Drop-in API değişimi (A)

`WizardFormData.photos` tipini `{ url, publicId }[]` yaparak publicId'yi parent state'de tut; publish anında sadece URL'leri DB'ye yaz. `DELETE /api/upload` yeni eklenir.

### 1. API Katmanı

#### `POST /api/upload` — Rewrite

```typescript
import { v2 as cloudinary } from 'cloudinary'

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key:    process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
})

// POST
const file = formData.get('file') as File
const listingId = formData.get('listingId') as string
// validate: isAllowedMimeType, isWithinSizeLimit (src/lib/upload.ts helpers kalır)

const buffer = Buffer.from(await file.arrayBuffer())
const dataUri = `data:${file.type};base64,${buffer.toString('base64')}`
const result = await cloudinary.uploader.upload(dataUri, {
    folder: 'arsabil/listings',
    public_id: `${listingId}/${crypto.randomUUID()}`,
    overwrite: false,
})

return NextResponse.json({ url: result.secure_url, publicId: result.public_id }, { status: 201 })
```

#### `DELETE /api/upload` — Yeni

```typescript
// DELETE
const { publicId } = await req.json()
if (!publicId) return NextResponse.json({ error: 'publicId zorunlu' }, { status: 400 })
await cloudinary.uploader.destroy(publicId)
return NextResponse.json({ ok: true })
```

Auth zorunlu (getServerSession). Hata durumunda 500.

### 2. Wizard Tip Değişikliği

**`src/components/listing-wizard/types.ts`:**

```typescript
export interface WizardFormData {
    // ...diğer alanlar aynı...
    photos: { url: string; publicId: string }[]  // string[] → bu
    // ...
}

export const emptyFormData: WizardFormData = {
    // ...
    photos: [],
    // ...
}
```

**Neden parent state:** Kullanıcı step 3'ten step 2'ye gidip geri dönerse local component state sıfırlanır. publicId'nin parent `WizardFormData`'da yaşaması sağlar ki remove için her zaman erişilebilir olsun.

**DB şeması değişmez:** `Listing.photos String[]` kalır. Publish anında `form.photos.map(p => p.url)` ile sadece URL'ler gider.

### 3. WizardStep3Photos Değişiklikleri

**Upload akışı:**
```typescript
const { url, publicId } = await res.json()
uploaded.push({ url, publicId })
// ...
onChange({ photos: [...data.photos, ...uploaded] })
```

**Remove akışı:**
```typescript
const handleRemove = async (photo: { url: string; publicId: string }) => {
    // UI'dan hemen kaldır (kullanıcıyı beklettirme)
    onChange({ photos: data.photos.filter(p => p.publicId !== photo.publicId) })
    // Cloudinary'den sil (fire-and-forget, hata önemsiz)
    fetch('/api/upload', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publicId: photo.publicId }),
    }).catch(() => {})
}
```

**JSX:**
```tsx
{data.photos.map(photo => (
    <div key={photo.publicId} className={styles.photoItem}>
        <img src={photo.url} alt="" className={styles.photoImg} />
        <button className={styles.photoRemove} onClick={() => handleRemove(photo)}>×</button>
    </div>
))}
```

### 4. Diğer Wizard Dosyaları

**`WizardStep5Preview.tsx`:** `data.photos` artık `{ url, publicId }[]` — sadece `photo.url` kullanılan yerler güncellenir.

**`src/app/listings/new/page.tsx`** publish handler:
```typescript
photos: form.photos.map(p => p.url)
```

### 5. Etkilenen Dosyalar

| Dosya | İşlem |
|-------|-------|
| `src/app/api/upload/route.ts` | Rewrite: filesystem → Cloudinary, DELETE ekle |
| `src/components/listing-wizard/types.ts` | `photos` tipi `{ url, publicId }[]` |
| `src/components/listing-wizard/WizardStep3Photos.tsx` | Upload/remove mantığı güncelle |
| `src/components/listing-wizard/WizardStep5Preview.tsx` | `photo.url` kullan |
| `src/app/listings/new/page.tsx` | Publish'te `photos.map(p => p.url)` |

### 6. Kapsam Dışı (3B-I)

- Mevcut `/public/uploads/` dosyalarının Cloudinary'ye taşınması (DB'de gerçek URL yok)
- Cloudinary CDN transformasyonları (thumbnail, resize)
- Fotoğraf sıralama (drag-drop)

---

## 3B-II: İlan Düzenleme (`/listings/[id]/edit`)

### Bağlam

Kullanıcılar ilan yayınladıktan sonra düzenleyemiyor. Bu temel bir UX eksiği. Wizard bileşenleri (Step1-5) zaten var ve yeniden kullanılabilir.

### Akış

1. Kullanıcı `/listing/[id]` sayfasında "Düzenle" butonuna basar (sadece ilan sahibine görünür)
2. `/listings/[id]/edit` sayfası açılır — wizard bileşenlerini pre-fill ederek yükler
3. Kullanıcı step'leri düzenler
4. "Güncelle" → `PATCH /api/listings/[id]`
5. Eğer ilan daha önce APPROVED ise tekrar PENDING'e düşer (admin tekrar onaylamalı)
6. Başarı sonrası `/listing/[id]`'ye yönlendirir

### Status Davranışı

| Mevcut Status | Düzenleme Sonrası |
|---------------|-------------------|
| PENDING | PENDING (değişmez) |
| APPROVED | PENDING (admin tekrar onaylar) |
| REJECTED | PENDING (yeniden inceleme şansı) |

### API

**`PATCH /api/listings/[id]`** — yeni:
```typescript
// Auth: sadece listing.userId === session.user.id
// Body: WizardFormData alanları (photos: string[])
// Günceller: title, address, price, landSizeSqm, zoning, titleDeed, description, phone, photos, city, district
// Status'u PENDING'e çeker (APPROVED/REJECTED ise), isActive = false
// PENDING kalıyorsa değiştirme
```

### Edit Sayfası

**`src/app/listings/[id]/edit/page.tsx`:**
- Client component
- Mount'ta `GET /api/listings/[id]` çağrısı → form pre-fill
- `photos`: DB'deki URL string[]'i `{ url, publicId: '' }[]`'e çevirir (publicId boş — Cloudinary'den silinmek istenirse URL'den türetilir)
- Aynı `WizardProgress` + step bileşenlerini kullanır
- Submit: `PATCH /api/listings/[id]`
- "Düzenle" butonu: `src/app/listing/[id]/page.tsx`'e eklenir (sadece owner'a)

### publicId Türetme (Edit için)

DB'deki URL'ler `https://res.cloudinary.com/[cloud]/image/upload/[version]/[public_id].[ext]` formatında. Edit sayfasında mevcut fotoğraflar pre-fill edilirken publicId boş gelir. Remove butonuna basıldığında URL'den publicId türetilir:

```typescript
function publicIdFromUrl(url: string): string {
    // https://res.cloudinary.com/cloud/image/upload/v123/arsabil/listings/xyz/abc.jpg
    // → arsabil/listings/xyz/abc
    const match = url.match(/\/upload\/(?:v\d+\/)?(.+)\.[a-z]+$/)
    return match ? match[1] : ''
}
```

### Etkilenen Dosyalar

| Dosya | İşlem |
|-------|-------|
| `src/app/api/listings/[id]/route.ts` | PATCH handler ekle |
| `src/app/listings/[id]/edit/page.tsx` | Yeni sayfa |
| `src/app/listing/[id]/page.tsx` | "Düzenle" butonu (owner'a) |

### Kapsam Dışı (3B-II)

- İlan silme
- Fotoğraf sıralama
- Admin'e "ilan güncellendi" bildirimi (ileride eklenebilir)

---

## 3B-III: SSE Mesajlaşma

### Bağlam

`/inbox` şu an polling kullanıyor (her N saniyede fetch). Server-Sent Events (SSE) ile yeni mesajlar push edilir, polling ortadan kalkar. Vercel'de SSE desteklenir (Edge Runtime değil, Node.js runtime ile).

### Akış

1. `/inbox` mount'ta `EventSource('/api/messages/sse')` bağlantısı açar
2. Server: auth kontrolü, konuşma listesini ve okunmamış sayısını stream eder
3. Yeni mesaj geldiğinde server event push eder → client UI günceller
4. Bağlantı koptuğunda EventSource otomatik reconnect yapar

### API

**`GET /api/messages/sse`** — yeni SSE endpoint:
```typescript
// Response headers:
// Content-Type: text/event-stream
// Cache-Control: no-cache
// Connection: keep-alive

// İlk bağlantıda: mevcut konuşmaları gönder
// Her 30 saniyede: heartbeat ping
// Yeni mesaj POST geldiğinde: SSE client'larını güncelle
```

### Mesaj Broadcast Mekanizması

Next.js stateless olduğundan in-memory global store kullanılır (single instance için yeterli, multi-instance için Redis pub/sub ileride):

```typescript
// src/lib/sse.ts
const clients = new Map<string, ReadableStreamDefaultController>()
export function addClient(userId: string, controller: ReadableStreamDefaultController) {...}
export function removeClient(userId: string) {...}
export function notifyUser(userId: string, data: object) {...}
```

`POST /api/messages` mesaj kaydedince `notifyUser(receiverId, { type: 'new_message', ... })` çağırır.

### Client Değişiklikleri

**`/inbox` sayfası:**
- Polling useEffect'i kaldırılır
- `useEffect(() => { const es = new EventSource('/api/messages/sse'); es.onmessage = ...; return () => es.close() }, [])` eklenir
- Konuşma listesi SSE event'iyle güncellenir, aktif chat de anlık yenilenir

### Etkilenen Dosyalar

| Dosya | İşlem |
|-------|-------|
| `src/lib/sse.ts` | Yeni — SSE client registry |
| `src/app/api/messages/sse/route.ts` | Yeni — SSE endpoint |
| `src/app/api/messages/route.ts` | POST'a `notifyUser` ekle |
| `src/app/inbox/page.tsx` | Polling → SSE |

### Kapsam Dışı (3B-III)

- Multi-instance / Redis pub/sub (tek server için in-memory yeterli)
- Bildirim SSE'ye geçiş (ileride değerlendirilebilir)
- Okundu bildirimi SSE üzerinden (şimdilik PATCH /read yeterli)

---

## Test Stratejisi

- TypeScript: `npx tsc --noEmit` her task sonrası
- Jest: mevcut 52 test regresyon olarak çalışmaya devam eder
- Manuel: wizard fotoğraf upload/remove, edit akışı, SSE canlı mesaj testi

---

## Uygulama Sırası

Her sub-faz bağımsız commit serisi oluşturur:
1. **3B-I** tamamlanınca production'da listing fotoğrafları çalışır
2. **3B-II** tamamlanınca edit sayfası Cloudinary fotoğraflarıyla entegre çalışır  
3. **3B-III** tamamlanınca inbox gerçek zamanlı olur
