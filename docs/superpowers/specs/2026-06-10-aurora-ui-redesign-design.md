# ArsaBil — Aurora UI Redesign Tasarım Dokümanı

**Tarih:** 2026-06-10
**Durum:** Onaylandı (görsel companion oturumunda mockuplarla doğrulandı)
**Kapsam:** Tüm sayfalar (müşteri + admin + login/register), web + mobil

---

## 1. Problem

- Desktop eski mavi glassmorphism'de, mobil sayfaların bir kısmı navy/terracotta diline taşınmış — **iki ayrı tasarım dili** var.
- Web'de arka plan/landing premium görünürken **container ve kartlar basit** kalıyor (düz panel, sığ gölge).
- Mobilde **yatay/dikey taşma**: marketplace, hesapla, dashboard ve inbox ekrana sığmıyor, kullanılamıyor.

## 2. Karar: Aurora Kimliği (tek dil, iki tema)

Görsel oturumda kullanıcı seçimleri:

- **Dark tema (varsayılan):** iOS tarzı derin katmanlı glassmorphism, zemin hafif mor tonlu derin lacivert (`#0d1230 → #101a3e`). Vurgular Aurora gradient.
- **Light tema:** Frost zemin (`#f4f1ff → #ebf2ff → #e7fbff`), buzlu beyaz cam paneller, mor tonlu border/gölge. (Terracotta reddedildi — cansız bulundu.)
- **Tek marka kimliği:** Her iki temada da vurgu `mor → mavi → cyan` Aurora gradient'i.

### 2.1 Marka çekirdeği (tema bağımsız)

```css
--aurora-violet: #6d5bf6;
--aurora-blue:   #3f8efc;
--aurora-cyan:   #27c4e8;
--brand-gradient: linear-gradient(135deg, var(--aurora-violet), var(--aurora-blue) 60%, var(--aurora-cyan));
```

Butonlar (primary), progress barlar, aktif sekme/pill durumları, FAB, logo vurgusu hep bu gradient'ten türer. Durum renkleri: success yeşil (`#16a34a`/`#4ade80`), warning amber, danger kırmızı — iki temada aynı tonlar.

### 2.2 Dark tema reçetesi

- Zemin: `radial` bloblar (violet/cyan, düşük opaklık) + `linear-gradient(#0d1230 → #101a3e → #0a1f3d)`
- Panel (cam): `linear-gradient(180deg, rgba(255,255,255,.09), rgba(255,255,255,.03))` + `border: 1px solid rgba(255,255,255,.13)` + `backdrop-filter: blur(10-16px)`
- **İnset highlight (iOS hissinin anahtarı):** `inset 0 1px 0 rgba(255,255,255,.12)` her cam panelin box-shadow'una eklenir
- Derinlik: `0 8px 32px rgba(0,0,0,.35)` (kart), `0 12px 40px rgba(0,0,0,.4)` (büyük panel)
- Accent panel: aurora gradient'in alpha'lı hali + `rgba(139,123,255,.4)` border + violet glow

### 2.3 Light tema reçetesi

- Zemin: `linear-gradient(160deg, #f4f1ff, #ebf2ff 45%, #e7fbff)` + yumuşak violet/cyan bloblar
- Panel (frost): `rgba(255,255,255,.78–.85)` + `blur(12px)` + `border: 1px solid rgba(109,91,246,.13–.16)` + `inset 0 1px 0 #fff`
- Gölge: `0 8px 24px rgba(90,60,180,.10)` (kart), `0 10px 32px rgba(90,60,180,.12)` (panel)
- Metin: `#171231` (ana), `#6b6394` (muted)

### 2.4 Token migrasyon stratejisi (kritik)

- Mevcut token **isimleri korunur** (`--panel`, `--panel-2`, `--border`, `--text`, `--muted`, `--primary`, `--primary-rgb`, `--shadow`, `--shadow2`, `--input-bg`, `--stat-bg`, `--hero-*`, vb.) — sadece **değerleri** Aurora'ya çevrilir. Sayfa CSS'leri kırılmadan anında yeni dile döner.
- Yeni tokenlar: `--brand-gradient`, `--glass-highlight` (inset satırı), `--accent-violet`, `--accent-cyan`, `--focus-ring`.
- `--primary` → `#6d5bf6` (violet; `--primary-2` → `#3f8efc`), `--primary-rgb` → `109, 91, 246`.
- **Silinecek:** `[data-theme="sky"]`, `[data-theme="mint"]`, `[data-theme="sand"]` blokları (ThemeToggle yalnızca dark/light sunuyor — ölü kod).

## 3. Primitive Bileşenler (`src/components/ui/` + layout)

JSX API'leri değişmez; CSS yükseltilir:

| Bileşen | Değişiklik |
|---|---|
| `Card` | Cam reçetesi (gradient zemin + blur + inset highlight + derin gölge); hover'da lift + aurora glow. Yeni varyantlar: `accent` (aurora gradient zemin — hero/stat), `flat` (blur'suz, liste içi; mobil performans) |
| `Button` | primary = `--brand-gradient` + glow; secondary = cam + ince border; ghost = saydam. Mobilde min 44px dokunma hedefi |
| `Input` / `Toggle` / `RangeSlider` | Cam zemin; odak/aktif durumlar aurora (`--focus-ring`: violet glow) |
| **Yeni: `PageShell`** | Ortak sayfa kabuğu: `max-width: 1280px`, responsive padding, `min-width: 0` disiplini. `body`'de `overflow-x: clip` güvence katmanı |
| `Navbar` / `BottomNavbar` / `Footer` | Frost cam barlar; aktif durum aurora gradient pill; FAB aurora glow. Terracotta/navy kalıntıları temizlenir |

## 4. Sayfa Migrasyonu + Mobil Overflow Çözümleri

**Standart işlem (her sayfa):** hardcoded renkler → token; kartlara cam reçetesi; 360px ve 390px'te taşma denetimi; dark + light gözle kontrol.

**Kök neden ve çözümler:**

| Sayfa | Sorun | Çözüm |
|---|---|---|
| Marketplace | `calc(100vh - 160px)` sabit hesaplar, `display: contents` hack, 240px sabit sidebar | `100dvh` tabanlı flex layout; sekme panelleri düzgün flex ile göster/gizle; filtre mobilde tam genişlik bottom-sheet; tüm flex çocuklarına `min-width: 0` |
| Hesapla (28KB CSS) | Sabit grid kolonları, geniş sonuç tabloları, uzun TR etiketler | `repeat(auto-fit, minmax(0,1fr))`; tablolar mobilde kart görünümü; `overflow-wrap`; ölü CSS budanır |
| Dashboard | Liste satırları mobilde sıkışıyor | Stat 2×2 grid; satırlar mobilde dikey kart düzeni |
| Inbox | Sabit yükseklikler, klavye input'u gizliyor | `100dvh` + flex; balonlara `max-width` + `overflow-wrap` |

**Migrasyon sırası (her adım çalışır commit):**

1. `globals.css` Aurora token sistemi
2. Primitive'ler + `PageShell` + Navbar/BottomNavbar/Footer
3. Hesapla
4. Marketplace
5. Dashboard + dashboard/profile + public profile
6. Inbox
7. Landing (bento grid, sayaçlar, spotlight **korunur** — renkler Aurora'ya bağlanır)
8. Listing detay + wizard + compare
9. Login/Register
10. Admin

## 5. Doğrulama

1. **Taşma denetimi:** Dev server'da 360 / 390 / 768 / 1280px; `document.documentElement.scrollWidth > clientWidth` kontrolü. Marketplace/hesapla/dashboard/inbox için zorunlu geçiş kriteri.
2. **Tutarlılık (grep):** Sayfa bitiminde o dosyada, iş sonunda tüm `src/`'de şu kalıntılar `globals.css` dışında sıfır olmalı: `rgba(31, 111, 235`, `#1f6feb`, `#c8845a`, `#1a3c5e`, `rgba(26, 60, 94`, `#f7f5f0`.
3. **Genel sağlık:** Her commit öncesi `npm run build` + lint temiz.

## 6. Kapsam Dışı

- JSX yapısal refactor (yaklaşım 3 reddedildi) — yalnızca varyant class'ı eklemek gibi minimal JSX dokunuşları
- Yeni özellik/işlev — bu iş yalnızca görsel dil + responsive düzeltme
- Tema sayısını artırmak — yalnızca dark + light
