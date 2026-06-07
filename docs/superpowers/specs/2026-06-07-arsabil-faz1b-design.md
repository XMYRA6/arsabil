# ArsaBil Faz 1B — Tasarım Dokümanı

**Tarih:** 2026-06-07
**Durum:** Onaylandı
**Kapsam:** M4 Profil, M5 Bildirimler, M6 Senaryo Karşılaştırma

---

## 1. Genel Bakış

Faz 1A'da tamamlanan dashboard, mesajlaşma ve ilan wizard'ının üzerine üç modül eklenir:

| Modül | Kapsam |
|-------|--------|
| **M4 Profil** | İki kolon + sekmeli profil sayfası, bio/sosyal linkler, doğrulama rozeti, public profil |
| **M5 Bildirimler** | Notification modeli, navbar polling, panel+filtre UI, MESAJ_VAR/TEKLIF_GELDI/ILAN_ONAYLANDI |
| **M6 Senaryo Karşılaştırma** | PDF export, DB token ile paylaşılabilir `/compare/[token]` sayfası |

---

## 2. Veri Modeli

### 2.1 User — 4 yeni alan

```prisma
model User {
  // ... mevcut alanlar ...
  bio           String?
  linkedin      String?
  website       String?
  isVerified    Boolean       @default(false)
  notifications Notification[]
  compareShares CompareShare[]
}
```

### 2.2 Notification — yeni model

```prisma
model Notification {
  id        String   @id @default(cuid())
  userId    String
  type      String   // "MESAJ_VAR" | "TEKLIF_GELDI" | "ILAN_ONAYLANDI"
  title     String
  body      String
  read      Boolean  @default(false)
  entityId  String?  // ilgili mesaj/teklif/ilan ID'si (yönlendirme için)
  createdAt DateTime @default(now())
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

### 2.3 CompareShare — yeni model

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

**Migration adı:** `faz1b-profile-notifications-compare`

---

## 3. M4 — Profil Sayfası

### 3.1 Layout

İki kolon + sekmeli yapı:

```
┌────────────────┬──────────────────────────────────────┐
│  [Avatar]      │  [Portfolyo] [İlanlarım] [Ayarlar]   │
│  Emre Taner    │  ─────────────────────────────────── │
│  Müteahhit     │  Portfolyo sekmesi:                  │
│  ✓ Doğrulandı  │  Son raporlardan türetilen projeler   │
│                │  (başlık, arsa payı, tarih)           │
│  [Bio textarea]│                                      │
│  [LinkedIn]    │  İlanlarım sekmesi:                  │
│  [Website]     │  Aktif listing'ler, durum + fiyat    │
│  [Kaydet]      │                                      │
│                │  Ayarlar sekmesi:                    │
│                │  Tema seçici (mevcut UI buraya taşınır)│
└────────────────┴──────────────────────────────────────┘
```

### 3.2 Dosyalar

| Dosya | İşlem |
|-------|-------|
| `src/app/dashboard/profile/page.tsx` | Komple yeniden yaz |
| `src/app/dashboard/profile/profile.module.css` | Yeni — iki kolon layout CSS |
| `src/app/profile/[userId]/page.tsx` | Yeni — public görüntüleme sayfası |
| `src/app/profile/[userId]/page.module.css` | Yeni |
| `src/app/api/user/profile/route.ts` | Yeni — PATCH endpoint |

### 3.3 API

**`PATCH /api/user/profile`**
- Auth: session'dan userId (body'den alınmaz)
- Body: `{ bio?, linkedin?, website? }`
- Response: güncellenmiş User objesi

**`GET /api/user/profile/[userId]`** (public)
- Auth: gerekmez
- Response: `{ name, bio, linkedin, website, isVerified, reports[], listings[] }`

### 3.4 Doğrulama Rozeti

- `isVerified` alanı sadece admin tarafından `true` yapılır (admin panel Faz 2'de)
- Şimdilik: `isVerified=true` olan kullanıcıda rozet gösterilir, atama manuel DB üzerinden

---

## 4. M5 — Bildirimler

### 4.1 Tetikleyiciler

| Olay | Tip | Tetikleyen API | Alıcı |
|------|-----|----------------|-------|
| Yeni mesaj | `MESAJ_VAR` | `POST /api/messages` | `receiverId` |
| Yeni teklif | `TEKLIF_GELDI` | `POST /api/offers` | ilan sahibi (`listing.userId`) |
| İlan onayı | `ILAN_ONAYLANDI` | Admin (manuel, Faz 2'de otomatik) | ilan sahibi |

### 4.2 API

| Endpoint | Method | Açıklama |
|----------|--------|----------|
| `/api/notifications` | GET | Son 30 bildirim, okunmamışlar önce |
| `/api/notifications/[id]/read` | PATCH | Tekli okundu işareti |
| `/api/notifications/read-all` | PATCH | Tümünü okundu işaretle |

### 4.3 Navbar Değişikliği

- Mock data (`NOTIFICATIONS` array) kaldırılır
- `useEffect` + `setInterval(30_000)` ile `GET /api/notifications` polling
- Okunmamış sayısı zil ikonunda badge olarak gösterilir
- Panel açılınca B düzeni: sol filtre (Tümü / Mesajlar / Teklifler / Sistem), sağda liste
- Bildirime tıklanınca `entityId`'ye göre yönlendirme:
  - `MESAJ_VAR` → `/inbox?with=[entityId]`
  - `TEKLIF_GELDI` → `/listing/[entityId]`
  - `ILAN_ONAYLANDI` → `/listing/[entityId]`

### 4.4 Dosyalar

| Dosya | İşlem |
|-------|-------|
| `src/components/layout/Navbar.tsx` | Güncelle — mock kaldır, polling ekle |
| `src/app/api/notifications/route.ts` | Yeni — GET + PATCH read-all |
| `src/app/api/notifications/[id]/read/route.ts` | Yeni — PATCH tekli okundu |

---

## 5. M6 — Senaryo Karşılaştırma

### 5.1 PDF Export

- `ScenarioCompare.tsx` bileşenine "📄 PDF İndir" butonu eklenir
- `jsPDF` + `jspdf-autotable` kullanılır (projede zaten mevcut)
- İçerik: başlık, tarih, tüm karşılaştırma satırları
- Dosya adı: `arsabil-karsilastirma-[tarih].pdf`

### 5.2 Paylaşım Linki

**Akış:**
1. Kullanıcı "🔗 Paylaş" butonuna tıklar
2. `POST /api/compare/share` body: `{ scenarioIds: string[] }`
3. Sunucu `CompareShare` kaydı oluşturur, token döner
4. UI kopyalanabilir link gösterir: `[origin]/compare/[token]`

**API:**

| Endpoint | Method | Açıklama |
|----------|--------|----------|
| `/api/compare/share` | POST | Token oluştur, auth gerekli |
| `/api/compare/[token]` | GET | Token'ı bul, senaryoları döner, auth gerekmez |

**`/compare/[token]` sayfası:**
- Giriş gerektirmez (herkese açık)
- `ScenarioCompare` bileşenini render eder
- Token bulunamazsa 404 gösterir
- Sayfada "ArsaBil'de Hesapla →" CTA butonu

### 5.3 Dosyalar

| Dosya | İşlem |
|-------|-------|
| `src/components/ScenarioCompare.tsx` | Güncelle — PDF + Paylaş butonları ekle |
| `src/app/api/compare/share/route.ts` | Yeni — POST token oluştur |
| `src/app/api/compare/[token]/route.ts` | Yeni — GET token'dan senaryo ver |
| `src/app/compare/[token]/page.tsx` | Yeni — public karşılaştırma sayfası |
| `src/app/compare/[token]/page.module.css` | Yeni |

---

## 6. Kapsam Dışı

- Profil fotoğrafı yükleme (Faz 3'te CDN ile birlikte)
- Gerçek zamanlı bildirim push (SSE/WebSocket — polling yeterli)
- `ILAN_ONAYLANDI` otomatik tetikleme (Faz 2 admin panel ile gelir)
- Senaryo sıralama/sürükle-bırak (`/compare/[token]` snapshot'tır)
- Grup mesajlaşma

---

## 7. Prisma Migration Özeti

```
migrations/
  └─ XXXXXX_faz1b_profile_notifications_compare/
    └─ migration.sql
       -- User: bio, linkedin, website, isVerified
       -- CREATE TABLE Notification
       -- CREATE TABLE CompareShare
```

---

## 8. Test Stratejisi

- `src/lib/notifications.test.ts` — bildirim oluşturma yardımcı fonksiyonları unit test
- `src/app/api/compare/share/route.test.ts` — token oluşturma + GET akışı
- Mevcut `upload.test.ts` + `engine_v2.test.ts` regresyon olarak çalışmaya devam eder
