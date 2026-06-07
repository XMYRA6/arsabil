# ArsaBil — Geliştirme Yol Haritası & Faz 1A Tasarım Dokümanı

**Tarih:** 2026-06-07  
**Durum:** Onaylandı  
**Uygulama başlangıcı:** Faz 1A

---

## 1. Genel Yol Haritası

Tüm geliştirmeler 4 ana faza (+ 1 alt faz) bölünmüştür. Her faz kendi spec ve implementation plan dosyasına sahip olacak.

| Faz | Kapsam | Öncelik |
|-----|--------|---------|
| **1A** | Müşteri UI — Dashboard, Mesajlaşma, İlan Wizard | Şimdi |
| **1B** | Müşteri UI — Profil, In-App Bildirimler, Senaryo Karşılaştırma | 1A sonrası |
| **2** | Admin Panel — Analytics, Kullanıcı/Abonelik/Moderasyon/Duyuru | 1B sonrası |
| **3** | VIP / Abonelik — Stripe, Feature Gating, Rozet | 2 sonrası |
| **4** | Tamamlayıcı — E-posta, Onboarding, SEO | 3 sonrası |

**Faz sıralaması gerekçesi (Ürün Önce):** Kullanıcıların ödemeye geçmesi için önce güçlü bir ürün deneyimi görmesi gerekir. Dashboard ve mesajlaşma olmadan VIP satmak zorlaşır.

---

## 2. Plan Katmanları (Faz 3 için referans)

| Özellik | FREE | PRO (499 ₺/ay) | VIP (999 ₺/ay) |
|---------|------|-----------------|-----------------|
| Hesaplama | 3/ay | Sınırsız | Sınırsız |
| Kayıtlı proje | 1 | Sınırsız | Sınırsız |
| PDF / Excel export | ✗ | ✓ | ✓ |
| İlan yayınlama | ✗ | 5/ay | Sınırsız |
| Öne çıkan ilan | ✗ | ✗ | ✓ |
| VIP rozet (marketplace) | ✗ | ✗ | ✓ |
| Öncelikli destek | ✗ | ✗ | ✓ |

---

## 3. Faz 1A — Detaylı Tasarım

### 3.1 M1 · Gelişmiş Dashboard (`/dashboard`)

**Mevcut durum:** `/dashboard` sayfası var ancak içeriği çok sınırlı.

**Yeni tasarım — üç bölge:**

```
┌─────────────────────────────────────────────────────┐
│  [Hesaplama: 12]  [İlan: 3]  [Teklif: 7]  [Mesaj: 2] │  ← stat satırı (4 kart)
├──────────────────────────────┬──────────────────────┤
│  SON PROJELER & RAPORLAR     │  SON MESAJLAR        │
│  ─────────────────────────   │  ─────────────────   │
│  Kadıköy 450m²  87 puan  PDF │  Ahmet Y.            │
│  Beşiktaş 320m² 72 puan  PDF │  "Teşekkürler..."    │
│  Üsküdar 280m²  61 puan  PDF │                      │
│                              │  SON TEKLİFLER       │
│  [Tüm raporlar →]            │  2.400.000 ₺ (K.köy) │
│                              │  [Tüm teklifler →]   │
└──────────────────────────────┴──────────────────────┘
```

**Stat kartları:**
- Toplam hesaplama sayısı (Report count)
- Aktif ilan sayısı (Listing where isActive=true)
- Toplam teklif sayısı (Offer count)
- Okunmamış mesaj sayısı (Message where read=false AND receiverId=currentUser)

**Son projeler/raporlar:** Son 5 Report, her satırda başlık + fizibilite skoru + PDF indirme butonu.

**Son mesajlar:** Son 3 gelen mesaj, tıklanınca /inbox'a gider.

**Son teklifler:** Son 3 teklif (kendi ilanlarına gelen), tıklanınca listing detail'a gider.

**API:** `GET /api/user/dashboard` — mevcut route, içeriği zenginleştirilecek.

**Mobil:** Stat kartları 2×2 grid, projeler/mesajlar/teklifler dikey sıralanır.

---

### 3.2 M2 · Mesajlaşma UI (`/inbox`)

**Mevcut durum:** `/inbox` route var, `Message` modeli var, `/api/messages` var. UI tamamen boş.

**Desktop layout (≥768px) — WhatsApp Web:**

```
┌─────────────────┬───────────────────────────────────┐
│ KONUŞMALAR      │  Ahmet Yılmaz                     │
│ ─────────────── │  ─────────────────────────────── │
│ ● Ahmet Y.      │                    "Merhaba..."   │
│   "Teşekkür..." │  "Harika! Fiyat..."               │
│                 │  ┌──────────────────────────────┐ │
│   Mehmet K.     │  │ 📊 Teklif: 2.4M ₺ · 87 puan │ │
│   "Arsa fiy..." │  │ [Kabul Et]   [Reddet]        │ │
│                 │  └──────────────────────────────┘ │
│   Fatma D.      │                                   │
│   "Projeyi..."  │  [Mesaj yaz...          ] [Gönder]│
└─────────────────┴───────────────────────────────────┘
```

**Mobil layout (<768px):**
- Ekran 1: Konuşma listesi (tam ekran)
- Ekran 2: Chat (geri butonu ile liste'ye döner)
- Yeni mesaj için alt navbar'daki mesaj ikonuna uzun basma → liste açılır

**Teklif kartı:** Mesaj içinde `reportId` varsa, Report'tan fizibilite skoru + fiyat çekilerek inline kart render edilir.

**Okunmamış badge:** Konuşma listesinde ve navbar'daki mesaj ikonunda.

**API değişiklikleri:**
- `Message` modeline `read Boolean @default(false)` eklenir
- `GET /api/messages` — konuşma listesi (sender/receiver gruplandırılmış, son mesaj + okunmamış sayısı)
- `GET /api/messages/[userId]` — iki kullanıcı arasındaki tüm mesajlar
- `POST /api/messages` — yeni mesaj (mevcut, kontrol edilecek)
- `PATCH /api/messages/[id]/read` — okundu işareti

---

### 3.3 M3 · İlan Oluşturma Wizard (`/listings/new`)

**Mevcut durum:** `POST /api/listings` var. Listing modeli temel. Frontend wizard yok.

**5 adım wizard:**

```
[1 Konum] → [2 Detay] → [3 Fotoğraf] → [4 Fizibilite] → [5 Yayınla]
```

**Adım 1 — Konum:**
- Mevcut `LocationSelector` bileşeni kullanılır (il/ilçe seçimi)
- Harita pin ile tam konum (opsiyonel, Leaflet)
- Tam adres metin alanı

**Adım 2 — Arsa Detayı:**
- Arsa alanı (m²)
- İstenen fiyat (₺)
- İmar durumu: Konut / Ticari / Karma / Tarım (dropdown)
- Tapu durumu: Kat mülkiyeti / Arsa tapusu / Hisseli / Diğer (dropdown)
- Başlık (örn. "Kadıköy'de 450m² imarlı arsa")
- Açıklama (textarea, max 1000 karakter)
- İletişim telefonu

**Adım 3 — Fotoğraflar:**
- Drag-drop + tıkla yükle
- Max 10 görsel, her biri max 5MB, kabul: jpg/png/webp
- Sunucu tarafı: `POST /api/upload` → `/public/uploads/listings/[tempId]/`
- Güvenlik: MIME tipi sunucu tarafında doğrulanır (sadece image/jpeg, image/png, image/webp), dosya adı UUID ile yeniden adlandırılır (path traversal önlemi)
- Önizleme grid, sürükleyerek sıralama, silme

**Adım 4 — Fizibilite Bağla (opsiyonel):**
- Kullanıcının kayıtlı Report listesi gösterilir (son 10)
- Seçilen report'un fizibilite skoru, m² başına maliyet, arsa payı otomatik ilanla bağlanır
- "Atla" seçeneği var — fizibilite skoru olmadan da ilan yayınlanabilir

**Adım 5 — Önizle & Yayınla:**
- Marketplace'te görüneceği şekilde kart önizlemesi
- "Yayınla" → `POST /api/listings` çağrısı
- Başarı sonrası `/marketplace` veya `/listing/[id]`'ye yönlendir

**Prisma şema değişiklikleri — `Listing` modeline eklenecekler:**
```prisma
title         String?
address       String?
phone         String?
description   String?
price         Float?
landSizeSqm   Float?
zoning        String?   // "KONUT" | "TICARI" | "KARMA" | "TARIM"
titleDeed     String?   // "KAT_MULKIYETI" | "ARSA" | "HISSELI" | "DIGER"
photos        String[]  @default([])
reportId      String?   @unique  // mevcut String @unique'den String? @unique'e değişir
```

**Migration notu:** `reportId` nullable yapılırken mevcut satırlarda değer var, kırılma yok. PostgreSQL'de `UNIQUE` kısıtı NULL değerleri birbirinden bağımsız sayar — birden fazla ilanın reportId=NULL olması geçerlidir.

**API değişiklikleri:**
- `POST /api/upload` — yeni, multipart/form-data, dosyayı `/public/uploads/` altına kaydeder
- `POST /api/listings` — yeni alanları kabul edecek şekilde güncellenir; `reportId` opsiyonel
- `GET /api/listings` ve `GET /api/listings/[id]` — yeni alanları döner

---

## 4. Prisma Şema Özeti — Faz 1A Değişiklikleri

```prisma
// Message — read flag eklenir
model Message {
  // ... mevcut alanlar ...
  read      Boolean  @default(false)
}

// Listing — zenginleştirme
model Listing {
  // ... mevcut alanlar ...
  title         String?
  address       String?
  phone         String?
  description   String?
  price         Float?
  landSizeSqm   Float?
  zoning        String?
  titleDeed     String?
  photos        String[]  @default([])
  reportId      String?   @unique  // opsiyonel yapılır
}
```

**Migration:** `prisma migrate dev --name faz1a-listing-message-updates`

---

## 5. Dosya Yapısı — Yeni Dosyalar

```
src/
├── app/
│   ├── dashboard/
│   │   └── page.tsx          ← M1: Dashboard (yeniden yazılır)
│   ├── inbox/
│   │   ├── page.tsx          ← M2: Mesajlaşma (yeniden yazılır)
│   │   └── page.module.css   ← yeni
│   └── listings/
│       └── new/
│           ├── page.tsx      ← M3: Wizard ana sayfa (yeni)
│           └── page.module.css ← yeni
├── api/
│   ├── upload/
│   │   └── route.ts          ← yeni: fotoğraf yükleme
│   ├── messages/
│   │   └── [userId]/
│   │       └── route.ts      ← yeni: iki kullanıcı arası mesajlar
│   └── messages/[id]/read/
│       └── route.ts          ← yeni: okundu işareti
└── components/
    └── listing-wizard/
        ├── WizardStep1Location.tsx
        ├── WizardStep2Detail.tsx
        ├── WizardStep3Photos.tsx
        ├── WizardStep4Feasibility.tsx
        ├── WizardStep5Preview.tsx
        └── WizardProgress.tsx
```

---

## 6. Kapsam Dışı (Faz 1A)

- Gerçek zamanlı mesajlaşma (WebSocket/SSE) — polling yeterli, Faz 1B'de değerlendirilebilir
- Mesaj silme / düzenleme
- Grup mesajlaşma
- Video/döküman yükleme (sadece görsel)
- İlan düzenleme (`/listings/[id]/edit`) — wizard tamamlandıktan sonra yapılır
- Fotoğraf CDN/S3 — şimdilik `/public/uploads/` yeterli

---

## 7. Faz 1B — Kısa Özet (sonraki spec)

- **M4 Zenginleştirilmiş Profil:** Portfolyo bölümü, tamamlanan projeler, sosyal linkler, doğrulama rozeti (admin atar)
- **M5 In-App Bildirimler:** Yeni `Notification` modeli, navbar'da zil ikonu, dropdown panel, olay tipleri: TEKLIF_GELDI, MESAJ_VAR, ILAN_ONAYLANDI
- **M6 Senaryo Karşılaştırma:** Mevcut `ScenarioCompare` bileşenini genişlet, PDF export, paylaşılabilir `/compare/[token]` sayfası

---

## 8. Sonraki Adım

Bu spec onaylandıktan sonra `writing-plans` skill'i ile Faz 1A için adım adım implementation planı oluşturulacak.
