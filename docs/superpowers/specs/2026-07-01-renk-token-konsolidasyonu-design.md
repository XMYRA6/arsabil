# Site Geneli Renk Token Konsolidasyonu + Framer Motion Mikro-Etkileşimler — Tasarım

**Tarih:** 2026-07-01
**Durum:** Onaylandı, implementasyon bekliyor
**Tetikleyen:** Tema restorasyonu sonrası landing page'de algılanan görsel tutarsızlık şikayeti — kök neden araştırması, sorunun hero bölümüyle sınırlı olmadığını, site genelinde ~50 dağınık renk hex'i olduğunu ortaya çıkardı.

---

## 1. Bağlam ve Problem

Tema restorasyonu (bkz. `docs/case-study-tema-restorasyonu-2026-06-30.md`) sonrası kullanıcı, landing page'in hero bölümü ile geri kalanı arasında bir "bütünlük eksikliği" hissettiğini bildirdi. İlk teşhis (Playwright `fullPage` ekran görüntüsü) yanıltıcı bir bulgu üretti — Stats Strip ve Bento Grid bölümleri tamamen boş görünüyordu. Gerçek scroll ile yeniden test edildiğinde bunun bir **ekran görüntüsü artefaktı** olduğu doğrulandı (IntersectionObserver tabanlı reveal animasyonları, viewport'u yeniden boyutlandıran `fullPage` modunda hiç tetiklenmiyor) — gerçek bir render hatası değil.

Asıl inceleme, kod tabanında `grep -roh "#[0-9a-fA-F]{6}"` ile ~50 farklı renk hex değeri ortaya çıkardı:
- 7 farklı yeşil tonu (`#10b981`, `#2fbf71`, `#10a34a`, `#059669`, `#4ade80`, `#34d399`, `#229954`)
- 5 farklı turuncu (`#f59e0b`, `#fb923c`, `#ff9f2f`, `#d97706`)
- 5 farklı kırmızı (`#ef4444`, `#ff5a5f`, `#dc2626`)
- Marka mavisi (`#1f6feb`) dışında 4 "yabancı" mavi (`#3b82f6`, `#38bdf8`, `#2563eb`, ve `#2b7cff` zaten `--accent-cyan` ile çakışıyor)

`globals.css` zaten `--green`/`--orange`/`--red` token'larını tanımlıyor ve bunlar 13 dosyada 49 yerde kullanılıyor — yani kısmi bir konvansiyon var, eksiksiz uygulanmamış. Problem yeni bir sistem icat etmek değil, **var olan sistemi tamamlamak**.

---

## 2. Renk Token Stratejisi

Mevcut token değerleri, en yaygın kullanılan tona hizalanır (görsel sürprizi en aza indirmek için):

| Token | Mevcut değer | Yeni değer | Gerekçe |
|---|---|---|---|
| `--green` | `#2fbf71` | `#10b981` | 35 kullanım ile baskın (ListingCard skor renkleri, durum rozetleri) |
| `--orange` | `#ff9f2f` | `#f59e0b` | 27 kullanım ile baskın |
| `--red` | `#ff5a5f` | **değişmiyor** | Hem eski (main) temadan hem yeni kullanımdan beklenen ana kırmızı; `#ef4444` (16 kullanım) görsel olarak çok yakın, `--red`'e eşlenir |
| `--primary` / `--accent-cyan` | mevcut | **değişmiyor** | "Yabancı" maviler (`#3b82f6`, `#38bdf8`, `#2563eb`) bunlara yönlendirilir |

### Konsolidasyon Kuralı
Her dağınık hex değeri, en yakın semantik token'a `var(--green)` / `var(--orange)` / `var(--red)` / `var(--primary)` / `var(--accent-cyan)` şeklinde değiştirilir. Tailwind-tarzı `rgba(16,185,129,.1)` gibi opacity varyantları `rgba(var(--green-rgb), .1)` formuna taşınır — bunun için `--green-rgb`, `--orange-rgb` rgb-tuple token'ları da eklenir (mevcut `--primary-rgb` pattern'iyle tutarlı).

---

## 3. Migrasyon Sırası (her biri ayrı commit)

1. **Landing page** (`page.tsx`, `page.module.css`) — bento grid accent renkleri, hero gradient (mevcut "kontrollü çeşitlilik" kararına göre bilinçli renkler korunur, sadece token'a bağlanır)
2. **Marketplace / ListingCard** (`ListingCard.tsx`, `MapView.tsx`, `MiniMap.tsx`, `FilterSidebar.tsx`) — skor renkleri (`#10b981`/`#f59e0b`/`#ff5a5f` zaten bu üçlü, doğrudan token'a bağlanır)
3. **Dashboard** (`dashboard.module.css`, `dashboard/page.tsx` STAT_CONFIG) — `STAT_CONFIG`'deki 4 renk (`#3b82f6`, `#10a34a`, `#f59e0b`, `#8b5cf6`) token'a bağlanır; `#8b5cf6` (mor) kasıtlı 4. vurgu rengi olduğu için **yeni bir `--accent-violet-stat` token'ı olarak ayrıca tanımlanır**, `--accent-violet`'ten (zaten aurora-violet'e eşit, marka rengiyle çakışır) farklı tutulur — karışıklığı önlemek için.
4. **Admin paneli** (`admin.module.css`, `admin/listings`, `admin/users` vb.) — durum rozetleri (Bekliyor/Aktif/Pasif/Reddedildi)
5. **Kalan dosyalar** (hesapla, charts, FinancialDashboard, login/register, Input/Button module'leri) — tarama ile bulunan son sapan değerler

Her adımdan sonra: `npx tsc --noEmit`, `npx eslint .`, ve Playwright ile **gerçek scroll** screenshot karşılaştırması (önce/sonra, aynı sayfa).

---

## 4. Framer Motion (sınırlı pilot kapsamı)

- `npm install framer-motion` (yeni bağımlılık, `package.json`'a eklenir)
- **Kapsam: yalnızca landing page'in reveal animasyonları.** Şu an `page.tsx` içinde elle yazılmış `IntersectionObserver` + `setTimeout` tabanlı stagger mantığı (`StatsStrip`, `FeaturesGrid` bileşenleri), `motion.div` + `whileInView` + `variants` (staggerChildren) ile değiştirilir.
  - Kazanç: ~60 satırlık elle yazılmış observer/timer kodu kalkar, `prefers-reduced-motion` Framer Motion tarafından otomatik solunur (şu an elle desteklenmiyor — gerçek bir a11y iyileştirmesi).
- Birincil CTA butonlarına (`Hemen Hesapla`, `Pazar Yerine Git`, hero butonları) `whileHover={{ scale: 1.02 }}` / `whileTap={{ scale: 0.98 }}` spring-physics geri bildirimi eklenir.
- **Kapsam dışı (bu spec'te değil):** Modal/toast geçişleri (`AuthModal` vb.), sayfa-arası route geçişleri, dashboard/admin/marketplace'teki animasyonlar. Pilot landing page'le sınırlı; sonuç olumlu değerlendirilirse ayrı bir spec ile genişletilir.

---

## 5. Test Planı

- Her migrasyon adımından sonra `tsc --noEmit` + `eslint .` temiz olmalı.
- Landing page için: Framer Motion entegrasyonu sonrası gerçek scroll ile Playwright screenshot (önce/sonra karşılaştırma), ayrıca `page.emulateMedia({ reducedMotion: 'reduce' })` ile test edilip içeriğin animasyonsuz da tam göründüğü doğrulanmalı.
- `engine_v2.test.ts` ve diğer mevcut testler regresyon kontrolü için tekrar çalıştırılmalı (bu değişiklikler yalnızca CSS/UI katmanını etkiliyor, hesaplama motoruna dokunmuyor — ama yine de doğrulanmalı).

---

## 6. Kapsam Dışı (YAGNI)

- Yeni bir tasarım sistemi / component library (örn. shadcn/ui geçişi) kapsam dışı.
- Light tema için ayrı bir renk denetimi bu spec'in parçası değil (mevcut dark/light token yapısı korunur, sadece semantik renkler — green/orange/red/mavi — her iki temada da aynı token isimleriyle çalışır).
- Framer Motion'ın modal/sayfa-geçiş kullanım alanlarına genişletilmesi kapsam dışı (bkz. §4).
