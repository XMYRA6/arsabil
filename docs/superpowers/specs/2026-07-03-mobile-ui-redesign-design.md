# ArsaBil — Mobil UI Yeniden Tasarım (Yapısal Refactor) Tasarım Dokümanı

**Tarih:** 2026-07-03
**Durum:** Onaylandı (Yaklaşım B — mobile-first yapısal refactor)
**Kapsam:** 23 sayfanın tamamı (16 müşteri + 7 admin), 4 faz
**Görsel dil:** Mevcut token sistemi ve Aurora kimliği korunur; desktop görünümü değişmez.

---

## 1. Problem Teşhisi

Haziran 2026'daki "mobil premium redesign" (`2026-06-08-mobile-premium-redesign.md`) bilinçli olarak CSS-only yapıldı — renk/token düzeltmeleri uygulandı ama layout'a dokunulmadı. Mobildeki asıl sorunlar yapısal olduğu için aynen duruyor:

1. **410 adet inline `style={{...}}`** sayfa bileşenlerinde (21 dosya). Inline stiller media query'ye tepki veremez — CSS katmanından erişilemezler. En yoğun dosyalar: `listing/[id]/page.tsx` (69), `login/page.tsx` (60), `hesapla/page.tsx` (45), `board/page.tsx` (33), `admin/district-prices/page.tsx` (28).
2. **23 sayfanın ~13'ünde hiç mobil breakpoint yok:** `listing/[id]`, `profile/[userId]`, `compare/[token]`, `board`, `dashboard/projects`, `dashboard/reports` ve admin sayfalarının çoğu.
3. **Somut kırılmalar:**
   - `listing/[id]/page.tsx:123` — sabit `gridTemplateColumns: '1fr 320px'` → 390px ekranda taşma/kırılma.
   - Admin sayfalarında ham `<table>` elementleri (district-prices, users, offers, listings, analytics) → mobilde yatay taşma.
   - `board` kanban'ı 33 inline stille kurulu, responsive değil.

## 2. Değerlendirilen Yaklaşımlar

| Yaklaşım | Özet | Karar |
|---|---|---|
| A — CSS yamasına devam | Hızlı ama inline stillere kör; Haziran'da denendi, sorun çözülmedi | Reddedildi |
| **B — Mobile-first yapısal refactor** | Inline stiller → CSS module + token; paylaşılan mobil primitifler; sayfa sayfa mobile-first düzen; görsel kimlik korunur | **Seçildi** |
| C — Tam görsel yeniden tasarım | Yeni tasarım dili + yapısal refactor | Reddedildi — görsel dil zaten yeni elden geçti (renk token konsolidasyonu, framer-motion) |

## 3. Temel Katman (Faz 0)

### 3.1 Token ve konvansiyonlar (`globals.css`)

- **Breakpoint standardı:** 768px ana mobil kesim (mevcut kullanım korunur), 480px küçük ekran ayarları. Yeni breakpoint değeri icat edilmez.
- **Safe-area:** iOS çentik/home-indicator için `env(safe-area-inset-*)` — BottomNavbar, StickyActionBar ve flush (edge-to-edge) sayfalarda zorunlu.
- **Dokunma hedefi:** interaktif elemanlarda min 44×44px (Apple HIG); form inputları mobilde 48px yükseklik (mevcut spec ile uyumlu).
- **Mobil tipografi ölçeği:** başlıklar için `clamp()` tabanlı akışkan boyutlar; gövde metni min 16px (iOS input zoom'unu tetiklememek için form alanlarında da ≥16px).
- **Konvansiyon:** Yeni inline `style={{}}` yazılmaz; layout/stil CSS module + token ile ifade edilir. Mevcut inline stiller dokunulan sayfada temizlenir (boy scout kuralı — ayrı bir "büyük temizlik" fazı yok).

### 3.2 Paylaşılan mobil primitifler (`src/components/mobile/`)

| Bileşen | Amaç | Kullanım |
|---|---|---|
| `AppBar` | Mobil sayfa başlığı + geri butonu + opsiyonel aksiyon ikonu | Detay/alt sayfalar (listing, inbox chat, wizard, admin alt sayfaları) |
| `DataCard` / `CardList` | Ham tabloların mobil karşılığı: satır → kart, kolonlar → etiket-değer çiftleri | Tüm admin tabloları, dashboard listeleri |
| `BottomSheet` | Alttan açılan panel (sürükle-kapat, backdrop) | Marketplace filtreleri, seçiciler, sıralama menüleri |
| `StickyActionBar` | Ekranın altına yapışan CTA çubuğu (safe-area duyarlı, klavye açılınca görünür kalır) | Hesapla CTA, wizard ileri/geri, listing teklif/iletişim, form kaydet |
| `SegmentedTabs` | Yatay segment kontrolü | Marketplace harita/liste, dashboard sekmeleri |
| `SwipeGallery` | Dokunmatik kaydırmalı görsel galerisi (snap-scroll + nokta göstergesi) | Listing detay fotoğrafları, wizard önizleme |

Her primitif: kendi CSS module'ü, token tabanlı stiller, `prefers-reduced-motion` desteği, JSDoc ile kullanım örneği. Framer-motion yalnızca mevcut kullanım desenine uygun yerlerde (BottomSheet aç/kapa, sheet sürükleme).

## 4. Sayfa Sayfa Plan

### Faz 1 — Çekirdek müşteri sayfaları (en yüksek etki)

| Sayfa | Değişiklik |
|---|---|
| `hesapla` | Girdi bölümleri accordion'lu tek kolon; sonuç hero kartı üstte; `StickyActionBar` ile yapışkan "Hesapla" CTA; grafikler tam genişlik tek kolon; 45 inline stil CSS module'e taşınır |
| `marketplace` | `FilterSidebar` mobilde `BottomSheet` olur; harita/liste geçişi `SegmentedTabs` ile tam ekran toggle; ilan kartları tek kolon; harita araç çubuğu mobilde sadeleşir |
| `listing/[id]` | `1fr 320px` sabit grid → tek kolon akış; teklif/iletişim paneli `StickyActionBar`'a; fotoğraflar `SwipeGallery`; 69 inline stil temizlenir |
| `dashboard` | Stat kartları 2×2 grid; projeler/mesajlar/teklifler dikey sıralanır (Faz 1A spec'indeki mobil tasarım uygulanır) |

### Faz 2 — Akış sayfaları

| Sayfa | Değişiklik |
|---|---|
| `listings/new` (wizard) | Adım başına tam ekran; `WizardProgress` kompakt (nokta/çizgi göstergesi); `StickyActionBar` ile ileri/geri; foto adımında dokunmatik sıralama |
| `listings/[id]/edit` | Wizard ile aynı primitifler |
| `inbox` | Desktop iki panel → mobilde iki ekran: konuşma listesi ↔ chat (AppBar geri butonu); mesaj input'u klavye-duyarlı |
| `login` / `register` | 60+10 inline stil temizlenir; tek kolon; 48px inputlar; klavye açıkken CTA erişilebilir |

### Faz 3 — İkincil sayfalar

| Sayfa | Değişiklik |
|---|---|
| `board` | Kanban kolonları yatay snap-scroll; kolon başına tam-genişlik-eksi-peek kart |
| `compare/[token]` | Karşılaştırma tablosu → yatay kaydırmalı senaryo sütun kartları |
| `profile/[userId]` | Tek kolon; başlık kartı + bölümler dikey |
| `dashboard/projects`, `dashboard/reports` | Liste satırları `DataCard`'a; boş durumlar mobil uyumlu |
| `dashboard/profile` | Form tek kolon, 48px inputlar |
| Landing (`/`) | Denetim — zaten responsive + framer-motion yeni; sadece taşma/dokunma hedefi kontrolü |
| `BottomNavbar` | Okunmamış mesaj badge'i (roadmap M5 ile uyumlu); auth'suz kullanıcıda davranış gözden geçirilir |

### Faz 4 — Admin (7 sayfa)

| Sayfa | Değişiklik |
|---|---|
| `admin/district-prices`, `admin/users`, `admin/listings`, `admin/offers` | Ham `<table>` → ortak `DataCard`/`CardList`; satır aksiyonları kart altı buton grubuna |
| `admin/settings` | 574 satırlık form tek kolon; bölümler accordion |
| `admin/analytics` | Grafikler tam genişlik dikey; özet statlar 2×2 |
| `admin` (ana) | Navigasyon kartları tek kolon |

Desktop'ta tablolar aynen kalır — `DataCard` yalnızca ≤768px'te devreye girer (CSS ile görünürlük değişimi veya container query; implementation planında netleşir).

## 5. Doğrulama Stratejisi

- **Her faz sonunda** Playwright ile 390×844 viewport smoke testi: faz kapsamındaki her sayfa açılır, ekran görüntüsü alınır.
- **Otomatik yatay taşma denetimi:** `document.documentElement.scrollWidth > window.innerWidth` kontrolü her sayfa için assertion olarak koşulur.
- Mevcut Jest testleri her fazda yeşil kalır.
- Dokunma hedefi denetimi: faz kapsamındaki interaktif elemanlar ≥44px (spot-check).

## 6. Kapsam Dışı

- Yeni görsel dil / renk paleti değişikliği (Yaklaşım C reddedildi)
- Desktop layout değişiklikleri
- Yeni özellik ekleme (badge hariç — tek küçük istisna, roadmap M5'ten öne alındı)
- Native app / PWA geliştirmeleri
- Performans optimizasyonu (bundle, harita lazy-load) — ayrı iş

## 7. Riskler

- **`hesapla` 936 satır ve iş mantığıyla iç içe** — refactor sırasında hesaplama davranışı değişmemeli; mevcut engine testleri güvence, UI değişikliği engine'e dokunmaz.
- **Inline stil temizliği regresyon riski taşır** — sayfa başına küçük commit'ler + her sayfada desktop ekran görüntüsü karşılaştırması.
- **BottomSheet/StickyActionBar klavye etkileşimi** iOS Safari'de hassastır — Faz 0'da gerçek cihaz/emülatör doğrulaması yapılır.

## 8. Sonraki Adım

`writing-plans` skill'i ile faz faz implementation planı (`docs/superpowers/plans/`) oluşturulacak. Fazlar bağımsız teslim edilebilir; her faz sonunda çalışan, doğrulanmış bir mobil yüzey bırakılır.
