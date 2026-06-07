# ArsaBil Faz 2 — Tasarım Dokümanı

**Tarih:** 2026-06-07
**Durum:** Onaylandı
**Kapsam:** Faz 2A (Admin Tamamlama + SaaS Planlar + E-posta) + Faz 2B (Marketplace + Harita + Favoriler)

---

## 1. Genel Bakış

Faz 1B'de tamamlanan profil, bildirim ve karşılaştırma modüllerinin üzerine iki bağımsız alt-faz eklenir:

| Alt-Faz | Modüller | Öncelik |
|---------|----------|---------|
| **2A** | Admin panel tamamlama, SaaS plan altyapısı, Resend e-posta | Backend önce |
| **2B** | Marketplace (sekme düzeni), Leaflet harita, Favoriler, İlan detay yenileme | UI önce |

2A bağımsız deploy edilebilir; 2B'yi beklemez.

---

## 2. Veri Modeli Değişiklikleri

### 2A Migration: `faz2a-plan-approval-email`

**Listing modeli** — `status` alanı eklenir:
```prisma
model Listing {
  // ... mevcut alanlar ...
  status  String  @default("PENDING")  // "PENDING" | "APPROVED" | "REJECTED"
}
```

**User modeli** — `plan` ve `emailPrefs` alanları eklenir:
```prisma
model User {
  // ... mevcut alanlar ...
  plan        String  @default("FREE")   // "FREE" | "PRO"
  emailPrefs  String  @default("{}")    // JSON: { mesaj: bool, teklif: bool, ilan: bool }
}
```

### 2B Migration: `faz2b-marketplace-favorites`

**Favorite modeli** — yeni:
```prisma
model Favorite {
  id        String   @id @default(cuid())
  userId    String
  listingId String
  createdAt DateTime @default(now())
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  listing   Listing  @relation(fields: [listingId], references: [id], onDelete: Cascade)

  @@unique([userId, listingId])
}
```

**User modeli** — relation eklenir:
```prisma
  favorites   Favorite[]
```

**Listing modeli** — relation eklenir:
```prisma
  favorites   Favorite[]
```

---

## 3. Faz 2A — Admin Tamamlama + SaaS + E-posta

### 3.1 İlan Onay Akışı

**Akış:**
1. Kullanıcı ilan oluşturur → `status = "PENDING"`, `isActive = false`
2. Admin panelde "⏳ Bekliyor (N)" sekmesi belirir
3. Admin "Onayla" → `status = "APPROVED"`, `isActive = true` + `createNotification(ILAN_ONAYLANDI)` + `sendEmail(ILAN_ONAYLANDI)` fire-and-forget
4. Admin "Reddet" → `status = "REJECTED"`, `isActive = false` (bildirim yok)

**Etkilenen dosyalar:**

| Dosya | İşlem |
|-------|-------|
| `prisma/schema.prisma` | Listing.status alanı |
| `src/app/api/listings/route.ts` | POST: status="PENDING", isActive=false |
| `src/app/api/admin/listings/route.ts` | PATCH: onayla/reddet aksiyonu |
| `src/app/admin/listings/page.tsx` | "Bekliyor" sekmesi + Onayla/Reddet butonları |

### 3.2 isVerified Toggle

Admin kullanıcılar sayfasına toggle switch eklenir. PATCH `/api/admin/users` endpoint'i zaten var; `isVerified` alanını da işleyecek şekilde güncellenir.

| Dosya | İşlem |
|-------|-------|
| `src/app/api/admin/users/route.ts` | PATCH: isVerified desteği ekle |
| `src/app/admin/users/page.tsx` | Toggle switch UI |

### 3.3 SaaS Plan Altyapısı

**Limitler:**

| Kaynak | FREE | PRO |
|--------|------|-----|
| Aylık rapor | 10 | Sınırsız |
| Aktif ilan | 2 | 10 |
| Senaryo/proje | 3 | Sınırsız |

**Plan helper:**

```typescript
// src/lib/plan.ts
export type PlanResource = 'reports' | 'listings' | 'scenarios'

export const PLAN_LIMITS: Record<string, Record<PlanResource, number>> = {
    FREE: { reports: 10, listings: 2, scenarios: 3 },
    PRO:  { reports: Infinity, listings: 10, scenarios: Infinity },
}

export async function checkPlanLimit(
    userId: string,
    resource: PlanResource
): Promise<{ allowed: boolean; reason?: string; current: number; limit: number }>
```

**Uygulama noktaları:**
- `POST /api/reports` → rapor limiti kontrolü
- `POST /api/listings` → ilan limiti kontrolü
- `POST /api/projects/[id]/scenarios` → senaryo limiti kontrolü
- Limit aşılınca 403 + `{ error: 'PLAN_LIMIT', message: '...', upgradeRequired: true }`

**Admin PRO atama:**
- `src/app/admin/users/page.tsx` satırına "FREE/PRO" dropdown eklenir
- `PATCH /api/admin/users` body: `{ userId, plan: 'PRO' }`

**UI:**
- Limit aşılınca `react-hot-toast` ile upgrade mesajı
- Dashboard'da plan badge (FREE/PRO etiketi)

| Dosya | İşlem |
|-------|-------|
| `src/lib/plan.ts` | Yeni — limit helper |
| `src/lib/plan.test.ts` | Yeni — unit testler |
| `src/app/api/reports/route.ts` | Modify — plan kontrolü |
| `src/app/api/listings/route.ts` | Modify — plan kontrolü |
| `src/app/api/admin/users/route.ts` | Modify — plan atama |
| `src/app/admin/users/page.tsx` | Modify — plan dropdown + PRO badge |

### 3.4 E-posta Bildirimleri (Resend)

**Kurulum:**
- `npm install resend`
- `.env`: `RESEND_API_KEY=re_...`

**Email utility:**

```typescript
// src/lib/email.ts
export async function sendEmail(params: {
    to: string
    subject: string
    html: string
}): Promise<void>

export function buildMessageEmail(senderName: string): string
export function buildOfferEmail(listingTitle: string, share: number): string
export function buildApprovalEmail(listingTitle: string): string
```

**Tetikleyiciler** (mevcut notification trigger'larının yanına eklenir):
- `POST /api/messages` → `sendEmail(buildMessageEmail(...)).catch(() => {})`
- `POST /api/offers` → `sendEmail(buildOfferEmail(...)).catch(() => {})`
- `PATCH /api/admin/listings` (onayla) → `sendEmail(buildApprovalEmail(...)).catch(() => {})`

**E-posta tercihleri:**
- `User.emailPrefs` JSON string: `{ "mesaj": true, "teklif": true, "ilan": true }`
- `src/lib/email.ts`'de `getEmailPrefs(userId)` helper — tercih false ise e-posta atlanır
- Dashboard profil sayfası Ayarlar sekmesine 3 toggle eklenir

| Dosya | İşlem |
|-------|-------|
| `src/lib/email.ts` | Yeni — Resend wrapper + şablonlar |
| `src/lib/email.test.ts` | Yeni — şablon unit testleri |
| `src/app/api/messages/route.ts` | Modify — e-posta tetikle |
| `src/app/api/offers/route.ts` | Modify — e-posta tetikle |
| `src/app/api/admin/listings/route.ts` | Modify — onayda e-posta tetikle |
| `src/app/dashboard/profile/page.tsx` | Modify — Ayarlar sekmesine e-posta toggleları |

---

## 4. Faz 2B — Marketplace + Harita + Favoriler

### 4.1 Marketplace Sayfası (Sekme Düzeni)

**Layout:** Üstte filtre çubuğu, altında `Liste | Harita` sekmeleri.

**Filtreler:**
- İl (dropdown)
- İlçe (il seçimine bağımlı dropdown)
- Fiyat aralığı (min/max input)
- Arsa payı aralığı (min/max %)
- "Filtrele" butonu → URL query params ile state yönetimi

**Liste sekmesi:** Mevcut marketplace grid'i korunur, favori butonu eklenir.

**Harita sekmesi:** Tam genişlik Leaflet haritası, her ilan için fiyat pin'i, pin'e tıklayınca popup (ilan başlığı + fiyat + "Detay →" linki).

| Dosya | İşlem |
|-------|-------|
| `src/app/marketplace/page.tsx` | Modify — sekme düzeni + filtreler |
| `src/app/marketplace/marketplace.module.css` | Modify/Create |
| `src/components/marketplace/ListingMap.tsx` | Yeni — react-leaflet harita bileşeni |
| `src/components/marketplace/ListingCard.tsx` | Yeni — favori butonu dahil kart |
| `src/app/api/marketplace/route.ts` | Yeni/Modify — filtre query params desteği |

**Kurulum:** `npm install react-leaflet leaflet @types/leaflet`

### 4.2 Favoriler

**API:**

| Endpoint | Method | Açıklama |
|----------|--------|----------|
| `/api/favorites` | GET | Kullanıcının favorileri |
| `/api/favorites` | POST | `{ listingId }` — favori ekle |
| `/api/favorites/[listingId]` | DELETE | Favoriden çıkar |

**UI:**
- `ListingCard` bileşeninde ❤️/🤍 toggle butonu
- Dashboard profil sayfası → "Favorilerim" sekmesi eklenir (Portfolyo/İlanlarım/Favorilerim/Ayarlar)

| Dosya | İşlem |
|-------|-------|
| `src/app/api/favorites/route.ts` | Yeni — GET + POST |
| `src/app/api/favorites/[listingId]/route.ts` | Yeni — DELETE |
| `src/app/dashboard/profile/page.tsx` | Modify — Favorilerim sekmesi |

### 4.3 İlan Detay Sayfası Yenileme

`/listing/[id]` sayfası:
- Fotoğraf galerisi (photos array'inden slideshow)
- İlan bilgileri (başlık, konum, arsa m², fiyat, imar, tapu)
- Teklif formu (mevcut `board/page.tsx`'teki form buraya taşınır)
- Paylaş butonu (link kopyala)
- Sahibin public profil linki (`/profile/[userId]`)

| Dosya | İşlem |
|-------|-------|
| `src/app/listing/[id]/page.tsx` | Modify — tam yenileme |
| `src/app/listing/[id]/listing.module.css` | Yeni |

---

## 5. Test Stratejisi

- `src/lib/plan.test.ts` — limit logic unit testleri (FREE/PRO sınırları)
- `src/lib/email.test.ts` — şablon render testleri (Resend mock)
- Mevcut 30 test regresyon olarak çalışmaya devam eder

---

## 6. Kapsam Dışı

- Gerçek ödeme entegrasyonu (Faz 3)
- Profil fotoğrafı yükleme (Faz 3 CDN ile)
- İlan reddi bildirimi (ILAN_REDDEDILDI tipi — Faz 3)
- Harita kümeleme (cluster) — ilanlar az olduğu için şimdilik pin yeterli
- Gerçek zamanlı harita güncelleme (polling yok, sayfa yükünde)
