# ArsaBil — Profesyonel UI Redesign Spesifikasyonu

**Tarih:** 2026-06-08  
**Durum:** Onaylandı  
**Kapsam:** Tüm sayfaların CSS modüllerini yeniden yazma (JSX dokunulmaz), design language tanımlama  
**Yaklaşım:** Approach 3 — Design Language + CSS Module Tam Yenileme  
**Stil Referansı:** Zillow / Redfin / Idealista — Property/Gayrimenkul premium tarzı

---

## Hedef

Mevcut UI'daki 3 temel sorunu gidermek:
1. **Kimlik yok** — jenerik Bootstrap/template hissi
2. **Hiyerarşi yok** — hangi bilgi önemli belli değil
3. **Tipografi kötü** — boyutlar tutarsız, güç yok

JSX'e dokunmadan yalnızca CSS modülleri ve `globals.css` değiştirilerek tüm sayfalar tutarlı, profesyonel bir görünüme kavuşacak.

---

## 1. Renk Paleti

### Light Tema — `:root` ve `[data-theme="light"]`

```css
/* Backgrounds */
--bg:        #ffffff;
--bg-body:   #f7f5f0;        /* hafif krem — Zillow imzası */
--panel:     #ffffff;
--panel-2:   #f2efe9;        /* ikincil yüzey, hover bg */

/* Typography */
--text:             #1a1a2e; /* neredeyse siyah lacivert */
--muted:            #6b7280;
--card-title:       #1a1a2e;
--label-color:      #6b7280;
--val-color:        #1a1a2e;
--page-title-color: #1a1a2e;

/* Border */
--border: #e5e0d8;           /* hafif krem-gri — mevcut codebase --border kullanıyor */

/* Topbar */
--topbar-bg:     rgba(255, 255, 255, 0.96);
--topbar-border: #e5e0d8;
--topbar-text:   #1a1a2e;
--topbar-height: 64px;

/* Brand — Güven Lacivert */
--primary:      #1a3c5e;
--primary-rgb:  26, 60, 94;
--primary-2:    #0f2942;
--primary-glow: rgba(26, 60, 94, .12);

/* Accent — Terracotta/Toprak */
--accent:   #c8845a;
--accent-2: #b5714a;

/* Semantic */
--green:  #1a7f4b;
--orange: #d97706;
--red:    #dc2626;

/* Inputs */
--input-bg:           #ffffff;
--input-solid:        #ffffff;
--stat-bg:            #ffffff;
--input-focus-border: #1a3c5e;
--input-focus-shadow: 0 0 0 3px rgba(26, 60, 94, .10);

/* Hero / CTA */
--hero-bg:     linear-gradient(135deg, #1a3c5e, #0f2942);
--hero-shadow: 0 8px 24px rgba(26, 60, 94, .30);
--hero-border: rgba(255, 255, 255, .15);

/* Shell */
--shell-bg:     #ffffff;
--shell-border: #e5e0d8;

/* Shadows — lacivert bazlı */
--shadow-sm:    0 1px 2px rgba(26, 60, 94, .06);
--shadow:       0 2px 8px rgba(26, 60, 94, .08), 0 1px 2px rgba(26, 60, 94, .04);
--shadow-md:    0 4px 16px rgba(26, 60, 94, .10), 0 2px 4px rgba(26, 60, 94, .06);
--shadow-lg:    0 8px 32px rgba(26, 60, 94, .12), 0 4px 8px rgba(26, 60, 94, .06);
--shadow-xl:    0 16px 48px rgba(26, 60, 94, .14), 0 8px 16px rgba(26, 60, 94, .08);
--shadow-hover: 0 12px 40px rgba(26, 60, 94, .14), 0 4px 8px rgba(26, 60, 94, .08);
--shadow2:      var(--shadow);

/* Radius */
--radius-sm:   6px;
--radius:      10px;
--radius-md:   14px;
--radius-lg:   20px;
--radius-xl:   28px;
--radius-full: 9999px;

/* Spacing */
--space-1: 4px;
--space-2: 8px;
--space-3: 12px;
--space-4: 16px;
--space-5: 24px;
--space-6: 32px;
--space-7: 48px;
--space-8: 64px;
--space-9: 96px;
```

### Dark Tema — `[data-theme="dark"]`

```css
--bg:        #0d1520;
--bg-body:   #0d1520;
--panel:     #162030;
--panel-2:   #1e2d3d;

--text:             #e8e4dc;
--muted:            #8b96a0;
--card-title:       #e8e4dc;
--label-color:      #8b96a0;
--val-color:        #e8e4dc;
--page-title-color: #e8e4dc;

--border: #253548;

--topbar-bg:     rgba(13, 21, 32, 0.96);
--topbar-border: #253548;
--topbar-text:   #e8e4dc;

--primary:      #4a8bc4;
--primary-rgb:  74, 139, 196;
--primary-2:    #3a7ab4;
--primary-glow: rgba(74, 139, 196, .20);

--accent:   #e09070;
--accent-2: #d07f60;

--green:  #3fb950;
--orange: #f0883e;
--red:    #f85149;

--input-bg:           #1e2d3d;
--input-solid:        #1e2d3d;
--stat-bg:            #162030;
--input-focus-border: #4a8bc4;
--input-focus-shadow: 0 0 0 3px rgba(74, 139, 196, .18);

--hero-bg:     linear-gradient(135deg, #1a3c5e, #2a1f5e);
--hero-shadow: 0 8px 24px rgba(13, 21, 32, .50);
--hero-border: rgba(255, 255, 255, .08);

--shell-bg:     #162030;
--shell-border: #253548;

--shadow-sm:    0 1px 2px rgba(0, 0, 0, .30);
--shadow:       0 2px 8px rgba(0, 0, 0, .40), 0 1px 2px rgba(0, 0, 0, .30);
--shadow-md:    0 4px 16px rgba(0, 0, 0, .40);
--shadow-lg:    0 8px 32px rgba(0, 0, 0, .50);
--shadow-xl:    0 16px 48px rgba(0, 0, 0, .60);
--shadow-hover: 0 12px 40px rgba(0, 0, 0, .50);
--shadow2:      var(--shadow);

/* Radius ve spacing aynı */
```

---

## 2. Tipografi Sistemi

```css
/* Font weight tokens */
--font-display: 800;
--font-strong:  700;
--font-medium:  500;
--font-normal:  400;

/* Line height */
--leading-tight:   1.2;
--leading-normal:  1.65;
--leading-relaxed: 1.8;

/* Letter spacing */
--tracking-tight:  -1px;
--tracking-normal: 0;
--tracking-wide:   0.6px;
```

### Uygulama Kuralları (CSS modüllerde tutulacak)

| Kullanım | font-size | font-weight | letter-spacing |
|----------|-----------|-------------|----------------|
| Display (hero) | 3.5rem | 800 | -2px |
| H1 (sayfa başlığı) | 2.25rem | 800 | -1px |
| H2 | 1.5rem | 700 | -0.5px |
| H3 | 1.125rem | 700 | 0 |
| Body | 1rem | 400 | 0 |
| Small | 0.875rem | 500 | 0 |
| Label (uppercase) | 0.75rem | 600 | 0.6px |
| Price/Value | 1.75rem | 800 | -1px |

---

## 3. Sayfa Bazında CSS Değişiklikleri

### 3.1 `src/app/globals.css`

**Değişiklik:** Token bölümünü yukarıdaki yeni palet ile tamamen yeniden yaz.
- `--border: #e5e0d8` (krem-gri — mevcut değeri güncelle)
- `--accent` / `--accent-2` yeni token ekle
- `--topbar-height: 64px` ekle
- `--shadow-xl`, `--shadow-hover` ekle
- `--space-1` … `--space-9` spacing scale ekle
- `--font-*`, `--leading-*`, `--tracking-*` tipografi token'ları ekle
- `--bg-body: #f7f5f0` (krem) — light tema
- `--primary: #1a3c5e` (lacivert) — light tema
- Base reset kısmına dokunma

---

### 3.2 `src/app/page.module.css` — Anasayfa

**Hero:**
- `background: var(--bg-body)` — krem zemin, kutu kaldır
- `text-align: left` — sol hizalı (Zillow tarzı)
- `border-radius` ve `border` kaldır
- `heroTitle`: `font-size: 3.5rem`, `letter-spacing: -2px`
- `heroTitle span`: terracotta (`var(--accent)`) gradient aksan
- `heroBadge`: lacivert border + lacivert text
- `primaryBtn`: `background: var(--primary)`, `border-radius: var(--radius-full)` pill
- `secondaryBtn`: `border: 2px solid var(--primary)`, `color: var(--primary)`, transparent bg

**Feature Cards:**
- Yatay layout: sol 48px ikon kutusu + sağ başlık/açıklama
- `border-left: 3px solid var(--primary)` sol aksan çizgisi
- Hover: `--shadow-hover`, `translateY(-3px)`
- `featureIcon`: `background: rgba(26,60,94,.08)`, `color: var(--primary)`

**Vision/Mission:**
- Sol border: `border-left: 4px solid var(--accent)`
- `visionIcon` kaldır (emoji yerine inline SVG kullanılacak)

**Blog Cards:**
- `blogImage`: `background: var(--primary)`, emoji kaldır, kategori label overlay
- `blogDate`: `color: var(--accent)`
- `blogReadMore`: `color: var(--accent)`

**CTA Section:**
- `background: var(--primary)` solid (gradient değil)
- `ctaBtn`: `background: var(--accent)`, `color: white` — terracotta CTA

---

### 3.3 `src/app/marketplace/page.module.css` — Marketplace

**Filter Bar:**
- `border-radius: var(--radius-lg)` pill hissi
- Label'lar `--label` token ile uppercase
- `filterBtn`: `background: var(--accent)` — terracotta (marketplace CTA)
- Sticky top davranışı CSS'te işaretle

**Listing Card (ListingCard component):**
- Fotoğraf alanı: `height: 220px`, `border-radius: var(--radius-md) var(--radius-md) 0 0`
- Fiyat: `font-size: 1.5rem`, `font-weight: 800`, `color: var(--primary)`
- Konum satırı: küçük pin icon + `color: var(--muted)`
- Status badge: yeşil nokta (`background: var(--green)`) + "Aktif" text
- Favori butonu: sağ üst köşe, `background: rgba(255,255,255,.9)` pill
- Hover: `--shadow-hover`, `translateY(-4px)`

**Map Panel:**
- Border: `var(--border-color)` kullan
- `border-radius: var(--radius-lg)`

**Empty State:**
- Büyük lacivert icon + başlık + açıklama

---

### 3.4 `src/app/hesapla/page.module.css` — Calculator

**Sol Panel:**
- Panel header: lacivert `border-left: 4px solid var(--primary)` aksan
- `settingsGroup h4`: `--label` token (uppercase, muted)
- `blueBox`: `--hero-bg` (lacivert gradient), `--hero-shadow`
- BlueBox içindeki değer: `font-size: 2.2rem`, `font-weight: 800`

**Stat Cards:**
- `statCard h5`: label token
- `statCardValue`: price token (`font-size: 1.75rem`, `font-weight: 800`)
- Hover: `--shadow-hover`

**Slider:**
- `sliderFill`: `var(--primary)`
- `sliderThumb`: `background: var(--primary)`, `border: 3px solid white`
- `sliderValueBox`: `background: var(--panel-2)`, lacivert border

**Action Butonlar:**
- `primaryActionBtn`: lacivert gradient → `linear-gradient(135deg, var(--primary), var(--primary-2))`
- Shadow: `--shadow-md` bazlı, lacivert renkli

**Drawer:**
- `drawerCardHeader`: `color: var(--primary)` (terracotta değil, lacivert — hesap ayarları)
- Header: `border-left: 3px solid var(--primary)`

---

### 3.5 `src/app/dashboard/dashboard.module.css` — Dashboard

**Sidebar:**
- `background: var(--bg-body)` — krem, beyaz değil (ayrışma)
- `navItemActive`: `background: rgba(26,60,94,.10)`, `color: var(--primary)`, `border-left: 3px solid var(--primary)`
- `navItem` hover: `background: var(--panel-2)`
- `avatar`: lacivert gradient kalır

**Stat Box:**
- `border-top: 3px solid var(--primary)` — üst aksan çizgisi
- `value`: price token
- `label`: label token (uppercase)

**Section Title:**
- `border-left: 3px solid var(--primary)` + `padding-left: var(--space-3)`
- `font-size: 0.75rem`, `text-transform: uppercase`, `letter-spacing: 0.6px`

**Report/Listing Cards:**
- Hover: `--shadow-hover`
- `statusActive` badge: lacivert bg yerine yeşil nokta + text
- `offerRow`: `background: var(--bg-body)` (panel-2 yerine)

**Profile Form:**
- Input height: 48px (44'ten büyütüldü)
- Focus state: lacivert border + shadow

---

### 3.6 Auth Sayfaları — `src/app/login/page.tsx` ve `src/app/register/page.tsx`

Şu an ayrı CSS modül yoksa yeni `auth.module.css` oluşturulacak. Split layout:

```
[Sol Panel — 42%]          [Sağ Panel — 58%]
Lacivert bg                Krem bg (#f7f5f0)
Logo + tagline             Form başlığı
3 feature bullet           Input'lar
                           Submit butonu
                           Alt link
```

- Sol panel: `background: var(--primary)`, beyaz metin, logo + "Türkiye'nin arsa fizibilite motoru"
- Sağ panel: `background: var(--bg-body)`, form centered

---

### 3.7 `src/app/admin/admin.module.css` — Admin Panel

- Dashboard ile aynı token sistemi
- Tablo satırları: `hover: { background: var(--panel-2) }`
- Status badge'leri: lacivert (PENDING), yeşil (APPROVED), kırmızı (REJECTED)
- Admin header: `border-bottom: 2px solid var(--primary)`

---

## 4. Navbar Güncellemesi

`src/components/layout/Navbar.tsx` için CSS değişiklikleri (token bazlı, JSX dokunulmaz):

- `--topbar-height: 64px` kullan
- Logo: lacivert renk `var(--primary)`
- Active nav link: `color: var(--primary)`, `border-bottom: 2px solid var(--primary)`
- CTA buton (varsa): `background: var(--accent)` terracotta
- ThemeToggle: mevcut kalır

---

## 5. Kapsam Dışı

- JSX / TypeScript bileşen mantığı
- API route'ları
- Prisma schema
- Harita (Leaflet) iç stilleri
- Test dosyaları
- Font değişikliği (Inter kalır)
- Animasyon/transition değerleri (mevcut kalır)
- BottomNavbar (mobile nav — ayrı faz)

---

## 6. Test Stratejisi

1. `npx tsc --noEmit` — sıfır hata beklenir (CSS değişiklikleri TypeScript'i etkilemez)
2. `npx jest --no-coverage` — tüm testler pass olmalı
3. Manuel kontrol: light/dark tema her sayfada, mobile/desktop breakpoint'ler
4. Kritik akış: anasayfa → marketplace → hesapla → dashboard

---

## 7. Uygulama Sırası

1. `globals.css` token güncellemesi (tüm sayfaları etkiler — önce bu)
2. `page.module.css` (anasayfa)
3. `marketplace/page.module.css`
4. `hesapla/page.module.css`
5. `dashboard/dashboard.module.css`
6. Auth sayfaları
7. Admin panel
8. Listing detail sayfası
9. TypeScript check + test suite
