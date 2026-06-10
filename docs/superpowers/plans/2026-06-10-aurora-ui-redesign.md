# Aurora UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tüm ArsaBil sayfalarını (web + mobil) tek Aurora kimliğine (mor→mavi→cyan gradient, iOS katmanlı glassmorphism) taşımak ve 4 sayfadaki mobil overflow sorunlarını kökten çözmek.

**Architecture:** Token isimleri korunarak `globals.css` değerleri Aurora'ya çevrilir (sayfalar anında yeni dile döner), ardından hardcoded eski-mavi değerler mekanik sweep ile token'a bağlanır, primitive'ler cam reçetesine yükseltilir ve sayfalar sırayla migre edilirken mobil overflow yapısal olarak düzeltilir (`100dvh`, `min-width: 0`, `minmax(0,1fr)`).

**Tech Stack:** Next.js 16, CSS Modules, CSS custom properties. Test altyapısı yok (CSS işi) — doğrulama: build + grep + tarayıcıda scrollWidth denetimi.

**Spec:** `docs/superpowers/specs/2026-06-10-aurora-ui-redesign-design.md`

---

## Ortak Doğrulama Araçları (her sayfa task'ında kullanılır)

**Taşma denetimi:** `npm run dev` çalışırken sayfayı Chrome DevTools device mode'da 360, 390, 768, 1280px genişlikte aç; konsolda:

```js
document.documentElement.scrollWidth > document.documentElement.clientWidth
// false olmalı. true ise taşan elemanı bul:
[...document.querySelectorAll('*')].filter(e => e.scrollWidth > document.documentElement.clientWidth + 1)
```

**Kalıntı denetimi (dosya başına):**

```bash
grep -nE 'rgba\(31, ?111, ?235|#1f6feb|#134ea5|#1e3a8a' <dosya>
# Beklenen: eşleşme yok
```

**Build denetimi:** `npm run build` — hatasız bitmeli.

---

### Task 1: Aurora Token Sistemi — `globals.css` Yeniden Yazımı

**Files:**
- Modify: `src/app/globals.css` (tüm dosya değişir)

- [ ] **Step 1: globals.css'i aşağıdaki içerikle tamamen değiştir**

```css
/* =========================================================================
   ARSABIL — AURORA DESIGN SYSTEM (Dark / Light, tek marka kimliği)
   Spec: docs/superpowers/specs/2026-06-10-aurora-ui-redesign-design.md
   ========================================================================= */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');

/* ===== MARKA ÇEKİRDEĞİ (tema bağımsız) ===== */
:root {
  --aurora-violet: #6d5bf6;
  --aurora-blue: #3f8efc;
  --aurora-cyan: #27c4e8;
  --brand-gradient: linear-gradient(135deg, var(--aurora-violet), var(--aurora-blue) 60%, var(--aurora-cyan));

  --green: #16a34a;
  --orange: #f59e0b;
  --red: #ef4444;

  --radius: 16px;
  --radius-sm: 0.5rem;
  --radius-md: 0.75rem;
  --radius-lg: 1rem;
  --radius-xl: 1.5rem;
}

/* ===== DARK THEME (Varsayılan) — derin mor-lacivert, katmanlı cam ===== */
[data-theme="dark"],
:root {
  --bg: #0d1230;
  --bg-body:
    radial-gradient(1200px 600px at 20% 0%, rgba(109, 91, 246, .28), transparent 60%),
    radial-gradient(900px 600px at 80% 10%, rgba(39, 196, 232, .16), transparent 55%),
    linear-gradient(180deg, #0d1230 0%, #101a3e 45%, #0a1f3d 100%);

  --panel: linear-gradient(180deg, rgba(255, 255, 255, .09), rgba(255, 255, 255, .03));
  --panel-2: rgba(255, 255, 255, .06);
  --text: #e6e8f5;
  --muted: #9aa6c8;
  --border: rgba(255, 255, 255, .12);

  --glass-highlight: inset 0 1px 0 rgba(255, 255, 255, .12);
  --shell-bg: rgba(255, 255, 255, .07);
  --shell-border: rgba(255, 255, 255, .14);
  --topbar-bg: linear-gradient(180deg, rgba(255, 255, 255, .10), rgba(255, 255, 255, .05));
  --topbar-border: rgba(255, 255, 255, .10);
  --topbar-text: white;

  --shadow: 0 12px 40px rgba(0, 0, 0, .40), var(--glass-highlight);
  --shadow2: 0 8px 32px rgba(0, 0, 0, .35), var(--glass-highlight);

  --primary: var(--aurora-violet);
  --primary-rgb: 109, 91, 246;
  --primary-2: var(--aurora-blue);
  --primary-glow: rgba(109, 91, 246, .30);
  --accent-violet: var(--aurora-violet);
  --accent-cyan: var(--aurora-cyan);
  --green: #4ade80;

  --input-bg: linear-gradient(180deg, rgba(255, 255, 255, .08), rgba(255, 255, 255, .04));
  --input-focus-border: rgba(109, 91, 246, .55);
  --input-focus-shadow: 0 0 0 4px rgba(109, 91, 246, .18);
  --focus-ring: 0 0 0 4px rgba(109, 91, 246, .18);

  --stat-bg: linear-gradient(180deg, rgba(255, 255, 255, .06), rgba(255, 255, 255, .03));
  --card-title: #f0f2fa;
  --label-color: #c9cfe8;
  --val-color: #f0f2fa;

  --hero-bg: linear-gradient(135deg, rgba(109, 91, 246, .45) 0%, rgba(63, 142, 252, .40) 60%, rgba(39, 196, 232, .35) 100%);
  --hero-shadow: 0 10px 32px rgba(109, 91, 246, .30), inset 0 1px 0 rgba(255, 255, 255, .20);
  --hero-border: rgba(139, 123, 255, .40);

  --page-title-color: white;
}

/* ===== LIGHT THEME — Aurora frost ===== */
[data-theme="light"] {
  --bg: #f4f1ff;
  --bg-body:
    radial-gradient(900px 600px at 18% 8%, rgba(109, 91, 246, .14), transparent 62%),
    radial-gradient(750px 500px at 84% 14%, rgba(39, 196, 232, .12), transparent 58%),
    radial-gradient(700px 550px at 48% 82%, rgba(63, 142, 252, .10), transparent 60%),
    linear-gradient(160deg, #f4f1ff 0%, #ebf2ff 45%, #e7fbff 100%);

  --panel: linear-gradient(180deg, rgba(255, 255, 255, .85), rgba(255, 255, 255, .72));
  --panel-2: rgba(255, 255, 255, .75);
  --text: #171231;
  --muted: #6b6394;
  --border: rgba(109, 91, 246, .14);

  --glass-highlight: inset 0 1px 0 #fff;
  --shell-bg: rgba(255, 255, 255, .72);
  --shell-border: rgba(109, 91, 246, .18);
  --topbar-bg: linear-gradient(180deg, rgba(255, 255, 255, .90), rgba(255, 255, 255, .76));
  --topbar-border: rgba(109, 91, 246, .13);
  --topbar-text: #171231;

  --shadow: 0 10px 32px rgba(90, 60, 180, .12), var(--glass-highlight);
  --shadow2: 0 8px 24px rgba(90, 60, 180, .10), var(--glass-highlight);

  --primary: var(--aurora-violet);
  --primary-rgb: 109, 91, 246;
  --primary-2: var(--aurora-blue);
  --primary-glow: rgba(109, 91, 246, .22);
  --accent-violet: var(--aurora-violet);
  --accent-cyan: var(--aurora-cyan);

  --input-bg: linear-gradient(180deg, rgba(255, 255, 255, .95), rgba(255, 255, 255, .82));
  --input-focus-border: rgba(109, 91, 246, .55);
  --input-focus-shadow: 0 0 0 4px rgba(109, 91, 246, .15);
  --focus-ring: 0 0 0 4px rgba(109, 91, 246, .15);

  --stat-bg: linear-gradient(180deg, rgba(255, 255, 255, .90), rgba(255, 255, 255, .72));
  --card-title: #1d1640;
  --label-color: #2a2155;
  --val-color: #171231;

  --hero-bg: var(--brand-gradient);
  --hero-shadow: 0 12px 35px -5px rgba(109, 91, 246, .38);
  --hero-border: rgba(255, 255, 255, .22);

  --page-title-color: #171231;
}

/* ===== GLASS CARD STANDARD ===== */
[data-theme="light"] .glass-card {
  background: var(--panel);
  border: 1px solid var(--border);
  box-shadow: var(--shadow2);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
}

/* ===== BASE RESET ===== */
* {
  box-sizing: border-box;
  padding: 0;
  margin: 0;
}

html,
body {
  max-width: 100vw;
  overflow-x: clip;
  background: var(--bg-body);
  background-color: var(--bg);
  color: var(--text);
  font-family: 'Inter', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif;
  min-height: 100vh;
}

a {
  color: inherit;
  text-decoration: none;
}

/* ===== GLOBAL RESPONSIVE ===== */
.page-container {
  padding: 3rem;
  max-width: 1280px;
  margin: 0 auto;
}

@media (max-width: 768px) {
  :root {
    --mobile-nav-pb: calc(85px + env(safe-area-inset-bottom, 0px));
  }

  .page-container {
    padding: 1.5rem;
  }

  .desktop-footer {
    display: none;
  }

  h1 {
    font-size: 1.75rem !important;
  }

  h2 {
    font-size: 1.25rem !important;
  }
}
```

Notlar:
- `sky`, `mint`, `sand` blokları **silindi** (ThemeToggle yalnızca dark/light sunuyor).
- Token isimleri korundu — mevcut sayfa CSS'leri kırılmaz.
- `overflow-x: hidden` → `overflow-x: clip` (sticky/scroll davranışını bozmadan taşma güvencesi).
- `--radius` 18px → 16px (mockup'larda onaylanan kart yuvarlaklığı).

- [ ] **Step 2: sky/mint/sand kalıntısı kalmadığını doğrula**

Run: `grep -rnE 'data-theme="(sky|mint|sand)"' src/ --include="*.css" --include="*.tsx"`
Beklenen: `BottomNavbar.module.css` ve diğer modüllerde `:global([data-theme="sky"])` benzeri seçiciler ÇIKABİLİR — bunlar Task 5+'ta sayfa sayfa temizlenecek, şimdilik zararsız (eşleşmeyen seçici). `globals.css`'te sıfır eşleşme olmalı.

- [ ] **Step 3: Build + görsel kontrol**

Run: `npm run build` → hatasız.
Run: `npm run dev` → `/` ve `/hesapla` sayfalarını dark ve light temada aç; uygulamanın genel renk dilinin mor-mavi Aurora'ya döndüğünü gözle doğrula (eski mavi kalıntılar normal — Task 2'de temizlenecek).

- [ ] **Step 4: Commit**

```bash
git add src/app/globals.css
git commit -m "feat(design): Aurora token system - dark/light tek marka kimligi, sky/mint/sand silindi"
```

---

### Task 2: Eski-Mavi Hardcode Sweep (27 dosya, ~105 eşleşme)

**Files (Modify):** `grep -rlE 'rgba\(31, ?111, ?235|#1f6feb|#134ea5|#1e3a8a' src/` çıktısındaki tüm dosyalar. Bilinen liste: `FinancialDashboard.tsx`, `email.ts`, `Navbar.tsx`, `Navbar.module.css`, `AuthModal.tsx`, `InstallPrompt.tsx`, `FilterSidebar.tsx`, `BreakEvenChart.tsx`, `MiniMap.tsx`, `CitySearch.tsx`, `ListingCard.tsx`, `MapView.tsx`, `ScenarioCompare.tsx`, `Button.module.css`, `admin.module.css`, `page.module.css` (landing), `ThemeToggle.tsx`, `admin/listings/page.tsx`, `layout.tsx`, `dashboard.module.css`, `hesapla/page.module.css`, `hesapla/page.tsx`, `inbox/inbox.module.css`, `listing/[id]/page.tsx`, `dashboard/profile/page.tsx`, `dashboard/reports/page.tsx`

- [ ] **Step 1: Mekanik değişim — kural tablosu**

Her dosyada şu dönüşümleri uygula (Edit `replace_all` kullan):

| Eski | Yeni | Bağlam |
|---|---|---|
| `rgba(31,111,235,` ve `rgba(31, 111, 235,` | `rgba(var(--primary-rgb), ` | CSS dosyaları + TSX inline style'lar (DOM'da var() çözülür) |
| `#1f6feb` | `var(--primary)` | CSS ve DOM inline style |
| `#1f6feb` | `#6d5bf6` | **var() çözülemeyen yerler:** Leaflet path/marker opsiyonları (`MapView.tsx` L.circleMarker/L.polyline `color`/`fillColor`, `MiniMap.tsx` aynı şekilde), `layout.tsx` `themeColor`, `ThemeToggle.tsx`/`dashboard/profile/page.tsx` tema swatch dizileri, `email.ts` (e-posta HTML'i CSS var göremez) |
| `#134ea5` | `var(--primary-2)` (DOM) / `#3f8efc` (var() çözülmeyen yerler) | |
| `linear-gradient(135deg, #1e3a8a 0%, #1f6feb 55%, #3b9eff 100%)` | `var(--brand-gradient)` | `page.module.css:404` |
| `linear-gradient(135deg, #0f172a 0%, #1e3a8a 50%, #1f6feb 100%)` | `var(--brand-gradient)` | `page.module.css:517` |

Leaflet ayrımının nedeni: Leaflet renkleri SVG attribute olarak basar, CSS custom property çözülmez. E-posta HTML'inde de stylesheet yoktur.

- [ ] **Step 2: MapView popup butonları**

`MapView.tsx:283` ve `MapView.tsx:385`'teki popup HTML string'lerinde `background:#1f6feb` → `background:#6d5bf6` (popup DOM'a basılır ama string template içinde sadelik için literal kullan).

- [ ] **Step 3: Kalıntı denetimi**

Run: `grep -rnE 'rgba\(31, ?111, ?235|#1f6feb|#134ea5|#1e3a8a' src/`
Beklenen: 0 eşleşme.

- [ ] **Step 4: Build + görsel kontrol**

Run: `npm run build` → hatasız. Dev server'da `/marketplace` haritası açılıp marker/çizgi renklerinin violet olduğu doğrulanır.

- [ ] **Step 5: Commit**

```bash
git add -A src/
git commit -m "refactor(design): eski mavi hardcode'lar Aurora token/hex degerlere cevrildi"
```

---

### Task 3: Primitive'ler — Card (varyantlı), Button, Input

**Files:**
- Modify: `src/components/ui/Card.tsx`
- Modify: `src/components/ui/Card.module.css`
- Modify: `src/components/ui/Button.module.css`
- Modify: `src/components/ui/Input.module.css:29-35`

- [ ] **Step 1: Card.tsx — variant prop ekle**

```tsx
import React from 'react';
import styles from './Card.module.css';

interface CardProps {
    children: React.ReactNode;
    className?: string;
    title?: string;
    variant?: 'glass' | 'accent' | 'flat';
}

export const Card: React.FC<CardProps> = ({ children, className = '', title, variant = 'glass' }) => {
    return (
        <div className={`${styles.card} ${styles[variant]} ${className}`}>
            {title && <h3 className={styles.cardTitle}>{title}</h3>}
            <div className={styles.cardContent}>
                {children}
            </div>
        </div>
    );
};
```

- [ ] **Step 2: Card.module.css — cam reçetesi + varyantlar (tüm dosya)**

```css
.card {
    border: 1px solid var(--border);
    border-radius: var(--radius);
    overflow: hidden;
    transition: transform 0.25s ease, box-shadow 0.25s ease;
    color: var(--text);
    min-width: 0;
}

.glass {
    background: var(--panel);
    box-shadow: var(--shadow2);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
}

.glass:hover {
    box-shadow: 0 14px 44px var(--primary-glow), var(--glass-highlight);
    transform: translateY(-2px);
}

.accent {
    background: var(--hero-bg);
    border-color: var(--hero-border);
    box-shadow: var(--hero-shadow);
    color: #fff;
}

.accent .cardTitle {
    color: #fff;
}

.flat {
    background: var(--panel-2);
    box-shadow: none;
}

.cardTitle {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 16px 10px;
    font-weight: 800;
    color: var(--card-title);
    font-size: 1.1rem;
}

.cardContent {
    padding: 0 16px 16px;
    display: flex;
    flex-direction: column;
    gap: 1rem;
}
```

- [ ] **Step 3: Button.module.css — primary'yi aurora gradient yap + dokunma hedefi**

`.primary` bloğunu değiştir (Task 2 sweep'i rgba'ları zaten çevirdi; şimdi gradient):

```css
.primary {
    background: var(--brand-gradient);
    color: white;
    box-shadow: 0 8px 24px var(--primary-glow), inset 0 1px 0 rgba(255, 255, 255, .25);
}

.primary:hover:not(:disabled) {
    box-shadow: 0 12px 32px var(--primary-glow), inset 0 1px 0 rgba(255, 255, 255, .25);
    filter: brightness(1.05);
}
```

Dosya sonuna ekle:

```css
@media (max-width: 768px) {
    .button {
        min-height: 44px;
    }
}
```

- [ ] **Step 4: Input.module.css — token'lara bağla**

20-35. satırlardaki `.input` ve `.input:focus` bloklarını değiştir:

```css
.input {
    width: 100%;
    padding: 0.75rem 1rem;
    font-size: 1rem;
    font-family: inherit;
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    outline: none;
    transition: all 0.2s;
    background: var(--input-bg);
    color: var(--text);
}

.input:focus {
    border-color: var(--input-focus-border);
    box-shadow: var(--focus-ring);
}
```

Ayrıca dosyadaki tanımsız token'ları düzelt: `var(--text-main)` → `var(--label-color)`, `var(--border-color)` → `var(--border)`, `var(--primary-color)` → `var(--primary)`, `var(--bg-color)` → `var(--panel-2)`, `var(--text-muted)` → `var(--muted)` (replace_all).

- [ ] **Step 5: Toggle + RangeSlider doğrulaması**

Run: `grep -nE '#[0-9a-fA-F]{6}|rgba\([0-9]' src/components/ui/Toggle.module.css src/components/ui/RangeSlider.module.css`
Aktif/dolgu renkleri `var(--primary)` veya `var(--primary-rgb)` kullanıyorsa dokunma (token swap zaten aurora yaptı). Renk anlamı taşıyan literal varsa `var(--primary)` / `rgba(var(--primary-rgb), X)` yap; aktif track dolgusu varsa `background: var(--brand-gradient);` kullan.

- [ ] **Step 6: Build + görsel kontrol + commit**

Run: `npm run build` → hatasız. Dev'de `/login` (Input/Button kullanır) dark+light kontrol.

```bash
git add src/components/ui/
git commit -m "feat(ui): Card varyantlari (glass/accent/flat), aurora Button, token'li Input"
```

---

### Task 4: PageShell Bileşeni

**Files:**
- Create: `src/components/layout/PageShell.tsx`
- Create: `src/components/layout/PageShell.module.css`

- [ ] **Step 1: PageShell.tsx**

```tsx
import React from 'react';
import styles from './PageShell.module.css';

interface PageShellProps {
    children: React.ReactNode;
    className?: string;
    /** true: yatay padding'siz tam genişlik (harita/chat gibi edge-to-edge sayfalar) */
    flush?: boolean;
}

export const PageShell: React.FC<PageShellProps> = ({ children, className = '', flush = false }) => {
    return (
        <div className={`${styles.shell} ${flush ? styles.flush : ''} ${className}`}>
            {children}
        </div>
    );
};
```

- [ ] **Step 2: PageShell.module.css**

```css
.shell {
    max-width: 1280px;
    margin: 0 auto;
    width: 100%;
    min-width: 0;
    padding: 2rem 1.5rem;
}

.flush {
    padding: 0;
}

@media (max-width: 768px) {
    .shell {
        padding: 1rem;
        padding-bottom: var(--mobile-nav-pb, 1rem);
    }

    .flush {
        padding: 0;
    }
}
```

Not: Mevcut sayfaların kendi container'ları var; PageShell **yeni düzenlenen** sayfalarda container'ı sadeleştirmek için kullanılacak (Task 6+). Zorunlu adaptasyon yok — YAGNI.

- [ ] **Step 3: Build + commit**

Run: `npm run build` → hatasız.

```bash
git add src/components/layout/PageShell.tsx src/components/layout/PageShell.module.css
git commit -m "feat(layout): PageShell ortak sayfa kabugu"
```

---

### Task 5: Navbar + BottomNavbar + Footer — Frost Bar & Aurora Aktif Durumlar

**Files:**
- Modify: `src/components/layout/Navbar.module.css`
- Modify: `src/components/layout/BottomNavbar.module.css`
- Modify: `src/components/layout/Footer.module.css`

Task 2 sweep'i renkleri çevirdi; bu task aktif durumları gradient'e bağlar ve ölü tema seçicilerini temizler.

- [ ] **Step 1: Ölü tema seçicilerini temizle**

Üç dosyada `grep -n 'data-theme="\(sky\|mint\|sand\)"'` çalıştır. Çıkan her seçici grubundan `sky/mint/sand` satırlarını sil, `light` satırını koru. Örnek — BottomNavbar'da:

```css
/* ÖNCE */
:global([data-theme="light"]) .bottomNav,
:global([data-theme="sky"]) .bottomNav,
:global([data-theme="mint"]) .bottomNav,
:global([data-theme="sand"]) .bottomNav { ... }

/* SONRA */
:global([data-theme="light"]) .bottomNav { ... }
```

- [ ] **Step 2: BottomNavbar aktif durum + FAB aurora**

`BottomNavbar.module.css`'te `.active .iconWrap` background'ını ve FAB gölgelerini bul (`grep -n 'active .iconWrap\|fab' BottomNavbar.module.css`); şu değerlere çevir:

```css
.active .iconWrap {
    background: rgba(var(--primary-rgb), 0.14);
}
```

FAB (`.fabItem` veya benzeri ana buton seçicisi):

```css
background: var(--brand-gradient);
box-shadow: 0 8px 24px var(--primary-glow), inset 0 1px 0 rgba(255, 255, 255, .25);
```

(Seçici adları dosyadaki mevcut adlardır — yeniden adlandırma yapma, yalnızca `background`/`box-shadow` değerlerini değiştir.)

- [ ] **Step 3: Navbar aktif link pill**

`Navbar.module.css:353` civarındaki aktif link background'ı Task 2'de `rgba(var(--primary-rgb), 0.08)` olmuştur — dokunma. Navbar'ın bar background'ının `var(--topbar-bg)` + `backdrop-filter: blur` kullandığını doğrula; kullanmıyorsa bar seçicisine ekle:

```css
background: var(--topbar-bg);
border-bottom: 1px solid var(--topbar-border);
backdrop-filter: blur(14px);
-webkit-backdrop-filter: blur(14px);
```

- [ ] **Step 4: Doğrulama + commit**

Dev'de dark+light, 390px + 1280px: üst bar frost cam, alt navbar aktif sekme aurora, FAB gradient + glow.
Run: `grep -rn 'data-theme="\(sky\|mint\|sand\)"' src/components/layout/` → 0 eşleşme.

```bash
git add src/components/layout/
git commit -m "feat(layout): frost navbar/bottomnav, aurora aktif durumlar, olu tema secicileri temizlendi"
```

---

### Task 6: Hesapla — Token Temizliği + Mobil Overflow

**Files:**
- Modify: `src/app/hesapla/page.module.css` (bilinen sorun satırları: 135, 434, 663, 672, 727, 755, 919, 937-939, 1067)
- Modify: `src/app/hesapla/page.tsx:26` (Task 2'de çevrildi — doğrula)

- [ ] **Step 1: `100vh` → `100dvh`**

`grep -n '100vh' src/app/hesapla/page.module.css` çıktısındaki her değeri `100dvh` yap (919, 939, 1067 ve varsa diğerleri). `min-height: calc(100vh - 120px)` (satır 16) → `min-height: calc(100dvh - 120px)`.

- [ ] **Step 2: Sabit grid/width'leri esnet**

- Satır 135: `grid-template-columns: repeat(3, 1fr);` → `grid-template-columns: repeat(3, minmax(0, 1fr));`
- Satır 51: `grid-template-columns: 360px 1fr;` → `grid-template-columns: minmax(0, 360px) minmax(0, 1fr);`
- Satır 727: `grid-template-columns: 1.15fr .85fr;` → `grid-template-columns: minmax(0, 1.15fr) minmax(0, .85fr);`
- Satır 937: `width: 360px;` → `width: min(360px, 100vw);`
- Satır 434: `width: 200px;` → `width: min(200px, 100%);`

- [ ] **Step 3: Uzun etiket taşması**

768px media bloğunun (satır 1061+) içine ekle:

```css
    .container :global(*) {
        overflow-wrap: anywhere;
    }
```

Eğer `.container` sınıfı yoksa dosyanın kök sayfa sınıfını kullan (`grep -n '^\.' page.module.css | head -1` ile bul).

- [ ] **Step 4: Hero/buton glow'larını aurora'ya bağla**

Satır 755 civarı (Task 2 sonrası): `box-shadow: 0 16px 40px rgba(var(--primary-rgb), 0.35), inset 0 1px 2px rgba(255, 255, 255, 0.4);` — bu zaten doğru; dosyada `--hero-bg` kullanan hero kartının `background: var(--hero-bg)` olduğunu doğrula.

- [ ] **Step 5: Taşma + görsel doğrulama**

360 / 390 / 768 / 1280px'te `/hesapla`: scrollWidth denetimi `false`; carousel kaydırma çalışıyor; dark+light kontrol. `grep -nE 'rgba\(31, ?111, ?235|#1f6feb' src/app/hesapla/` → 0.

- [ ] **Step 6: Commit**

```bash
git add src/app/hesapla/
git commit -m "fix(hesapla): mobil overflow (dvh, minmax(0), overflow-wrap) + aurora baglari"
```

---

### Task 7: Marketplace — Layout Yeniden Yapımı + Mobil Overflow

**Files:**
- Modify: `src/app/marketplace/page.module.css` (tüm mobil blok değişir)

- [ ] **Step 1: Desktop container'ı dvh'a al ve cam derinliği ver**

`.container` (satır 1-15) içinde `height: calc(100vh - 106px);` → `height: calc(100dvh - 106px);` ve `box-shadow: var(--shadow2);` ekle.

- [ ] **Step 2: 768px media bloğunu tamamen değiştir**

Satır 79-179 arasındaki `@media (max-width: 768px)` bloğunu şununla değiştir (`display: contents` hack'i kaldırılıyor; her panel kendi flex alanını alıyor):

```css
@media (max-width: 768px) {

    .desktopOnlySpacer,
    .desktopViewToggle {
        display: none !important;
    }

    .container {
        height: calc(100dvh - 70px);
        min-height: 0;
        border: none;
        border-radius: 0;
        max-width: 100vw;
    }

    .topBar {
        flex-wrap: nowrap;
        overflow-x: auto;
        -webkit-overflow-scrolling: touch;
        padding: 8px 12px;
        gap: 8px;
        min-width: 0;
    }

    .topBar::-webkit-scrollbar {
        display: none;
    }

    .mobileTabs {
        display: flex;
        align-items: center;
        width: 100%;
        background: var(--panel);
        border-bottom: 1px solid var(--border);
        padding: 8px 16px;
        gap: 8px;
        flex-shrink: 0;
    }

    .mobileTabs button {
        flex: 1;
        min-width: 0;
        padding: 10px 0;
        background: var(--panel-2);
        border: 1px solid var(--border);
        color: var(--muted);
        border-radius: 10px;
        font-family: inherit;
        font-size: 0.8rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
    }

    .mobileTabs button.activeTab {
        background: var(--brand-gradient);
        color: white;
        border-color: transparent;
        box-shadow: 0 4px 14px var(--primary-glow);
    }

    .bodyContainer {
        flex-direction: column;
        flex: 1;
        min-height: 0;
        overflow: hidden;
    }

    .sidebarWrapper,
    .listPanel,
    .mapPanel {
        display: none !important;
        width: 100% !important;
        max-width: 100vw;
        min-width: 0;
        border-right: none !important;
        border-bottom: none !important;
    }

    .bodyContainer[data-mobile-tab="filter"] .sidebarWrapper {
        display: flex !important;
        flex: 1;
        min-height: 0;
        overflow-y: auto;
    }

    .sidebarWrapper > aside {
        width: 100% !important;
        border-right: none !important;
        height: auto;
        min-height: 100%;
    }

    .bodyContainer[data-mobile-tab="list"] .listPanel {
        display: flex !important;
        flex: 1;
        min-height: 0;
        overflow-y: auto;
    }

    .bodyContainer[data-mobile-tab="map"] .mapPanel {
        display: block !important;
        position: relative;
        flex: 1;
        min-height: 0;
        height: auto !important;
    }
}
```

Önemli değişiklikler: `height: calc(100vh - 160px)` sabiti yerine `flex: 1` + `min-height: 0`; `display: contents` yerine `display: flex`; tüm panellere `min-width: 0` + `max-width: 100vw`; aktif sekme `--brand-gradient`.

- [ ] **Step 3: Desktop sidebar ve listPanel'e min-width disiplini**

Satır 36-56: `.sidebar`'a `min-width: 0;`, `.listPanel`'e `min-width: 0; max-width: 100%;` ekle.

- [ ] **Step 4: Taşma + görsel doğrulama**

360 / 390px'te `/marketplace`: üç sekme (Filtre/Liste/Harita) tek tek açılır, scrollWidth denetimi `false`, harita sekmesinde harita tam yükseklik alır, liste kartları ekrana sığar. 768 / 1280px: split görünüm bozulmamış. Dark+light kontrol.

- [ ] **Step 5: Commit**

```bash
git add src/app/marketplace/
git commit -m "fix(marketplace): mobil layout yeniden yapildi - dvh+flex, display:contents kaldirildi, aurora sekmeler"
```

---

### Task 8: Dashboard + Profil Sayfaları

**Files:**
- Modify: `src/app/dashboard/page.module.css` (satır 32, 61, 251-253)
- Modify: `src/app/dashboard/dashboard.module.css` (satır 14-16, 55, 99, 387-389)
- Modify: `src/app/dashboard/profile/profile.module.css` (satır 17)
- Modify: `src/app/profile/[userId]/page.module.css`

- [ ] **Step 1: dashboard/page.module.css grid'leri esnet**

- Satır 32: `grid-template-columns: repeat(4, 1fr);` → `grid-template-columns: repeat(4, minmax(0, 1fr));`
- Satır 61: `grid-template-columns: 1.4fr 1fr;` → `grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr);`
- Satır 252: `.statsGrid { grid-template-columns: repeat(2, 1fr); }` → `.statsGrid { grid-template-columns: repeat(2, minmax(0, 1fr)); }`
- 768px bloğuna ekle:

```css
  .statsGrid > * { min-width: 0; }
```

- [ ] **Step 2: dashboard.module.css yapısı**

- Satır 14: `grid-template-columns: 280px 1fr;` → `grid-template-columns: 280px minmax(0, 1fr);`
- Satır 15: `min-height: calc(100vh - 100px);` → `min-height: calc(100dvh - 100px);`
- 900px bloğunda (387-389) `grid-template-columns: 1fr` zaten var — bloğa şunu ekle:

```css
    .sidebar {
        position: static;
        width: 100%;
    }
```

(sidebar seçici adını `grep -n 'sidebar' dashboard.module.css` ile doğrula; farklıysa o adı kullan.)

- [ ] **Step 3: Liste satırları mobilde dikey karta dönsün**

`dashboard/page.module.css` 768px bloğuna ekle (satır seçicilerini `grep -n 'Row\|listItem' page.module.css` ile bul; bulunamazsa sayfadaki satır container'ının gerçek sınıf adını kullan):

```css
  .projectRow,
  .messageRow,
  .offerRow {
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
  }
```

- [ ] **Step 4: profile grid'leri**

`profile.module.css:17`: `grid-template-columns: 240px 1fr;` → `grid-template-columns: 240px minmax(0, 1fr);` ve mevcut mobil media bloğunda `1fr`'a düştüğünü doğrula; düşmüyorsa ekle:

```css
@media (max-width: 768px) {
  .layout {
    grid-template-columns: 1fr;
  }
}
```

(`.layout` = 17. satırdaki grid'in gerçek sınıf adı.)

- [ ] **Step 5: Taşma + görsel doğrulama + commit**

360/390/768/1280px'te `/dashboard`, `/dashboard/profile`, herhangi bir `/profile/[id]`: scrollWidth `false`, stat kartları 2×2, satırlar dikey. Dark+light.

```bash
git add src/app/dashboard/ "src/app/profile/"
git commit -m "fix(dashboard,profile): mobil grid esnekligi (minmax(0)) ve dikey satir duzeni"
```

---

### Task 9: Inbox — dvh + Klavye Güvenli Chat

**Files:**
- Modify: `src/app/inbox/inbox.module.css` (satır 7-22, 120-121, 247, 389-391)

- [ ] **Step 1: Yükseklikler**

- Satır 10: `height: calc(100vh - 106px);` → `height: calc(100dvh - 106px);`
- Satır 391: `height: calc(100vh - 75px - env(safe-area-inset-bottom, 0px));` → `height: calc(100dvh - 75px - env(safe-area-inset-bottom, 0px));`

- [ ] **Step 2: Konuşma listesi ve balonlar**

- Satır 22: `width: 350px;` → `width: 350px; min-width: 0;` ve aynı seçiciye `flex-shrink: 0;` yoksa ekle.
- Mesaj balonu seçicisini bul (`grep -n 'bubble\|message' inbox.module.css`); balon sınıfına ekle:

```css
    max-width: 78%;
    overflow-wrap: anywhere;
```

- [ ] **Step 3: Aktif konuşma aurora**

Satır 120-121 (Task 2 sonrası `rgba(var(--primary-rgb), 0.08)`) — doğru. Gönderilen mesaj balonunun background'ını bul; düz renkse:

```css
    background: var(--brand-gradient);
    color: #fff;
```

- [ ] **Step 4: Taşma + görsel doğrulama + commit**

390px'te `/inbox`: liste→chat geçişi, input klavye açıkken görünür (DevTools'ta yükseklik küçülterek simüle et), uzun mesaj taşmıyor. scrollWidth `false`. Dark+light.

```bash
git add src/app/inbox/
git commit -m "fix(inbox): dvh tabanli chat, balon max-width, aurora gonderilen balon"
```

---

### Task 10: Landing — Aurora Bağları (premium işler korunur)

**Files:**
- Modify: `src/app/page.module.css` (satır 37, 54-55, 117-129, 404-410, 493, 517-540)

- [ ] **Step 1: Kalıntı denetimi**

Task 2 sweep'i sonrası: `grep -nE 'rgba\(31, ?111, ?235|#1f6feb|#1e3a8a|#3b9eff|#0f172a' src/app/page.module.css`
Kalan her eşleşmeyi şu kurala göre çevir: gradient'ler → `var(--brand-gradient)`, glow/gölge rgba'ları → `var(--primary-glow)` veya `rgba(var(--primary-rgb), X)`, düz renk → `var(--primary)`.

- [ ] **Step 2: Bento/stat/spotlight korunma kontrolü**

`bentoGrid`, `statsStrip`, spotlight ve sayaç animasyonlarına **dokunma** — yalnızca renk değerleri değişir. 640px bloğunda `bentoGrid { grid-template-columns: 1fr }` zaten var (satır 582) — koru.

- [ ] **Step 3: Taşma + görsel doğrulama + commit**

360/390/1280px'te `/`: bento grid, sayaçlar, spotlight çalışıyor; renkler aurora; scrollWidth `false`. Dark+light.

```bash
git add src/app/page.module.css
git commit -m "feat(landing): aurora renk baglari - bento/sayac/spotlight korunarak"
```

---

### Task 11: Listing Detay + Wizard + Compare + Login/Register

**Files:**
- Modify: `src/app/listing/[id]/page.tsx` (Task 2'de çevrildi — görsel doğrula)
- Modify: `src/app/listings/new/page.module.css`
- Modify: `src/components/listing-wizard/wizard.module.css`
- Modify: `src/app/compare/[token]/page.module.css`
- Modify: `src/app/login/`, `src/app/register/` (stil dosyalarını `ls` ile bul)

- [ ] **Step 1: Wizard ilerleme çubuğu aurora**

`wizard.module.css`'te progress bar dolgu seçicisini bul (`grep -n 'progress\|fill\|step' wizard.module.css`); dolgu background'ı:

```css
    background: var(--brand-gradient);
```

Aktif adım dairesi: `background: var(--primary);` → `background: var(--brand-gradient);`

- [ ] **Step 2: Dört sayfada token doğrulaması**

Her dosyada: `grep -nE '#[0-9a-fA-F]{6}|rgba\([0-9]' <dosya>` çıktısını incele. Renk anlamı taşıyan her literal değeri uygun token'a çevir (`var(--panel)`, `var(--border)`, `var(--muted)`, `var(--primary)`, `rgba(var(--primary-rgb), X)`). Beyaz/siyah/şeffaf literal'leri (`#fff`, `rgba(0,0,0,.2)` gölgeler) kalabilir.

- [ ] **Step 3: Taşma + görsel doğrulama + commit**

390px'te `/listings/new` (5 adım gezilir), `/listing/[id]`, `/compare/[token]`, `/login`, `/register`: scrollWidth `false`, dark+light.

```bash
git add src/app/listings/ src/components/listing-wizard/ src/app/compare/ src/app/login/ src/app/register/ src/app/listing/
git commit -m "feat(ui): wizard/compare/auth sayfalari aurora dile baglandi"
```

---

### Task 12: Admin Panel

**Files:**
- Modify: `src/app/admin/admin.module.css` (satır 14-16, 445, 476, 415-417 + Task 2 kalanları)

- [ ] **Step 1: Yapı**

- Satır 14: `grid-template-columns: 280px 1fr;` → `grid-template-columns: 280px minmax(0, 1fr);`
- Satır 15: `100vh` → `100dvh`
- Satır 445 ve 476: `grid-template-columns: 1fr 100px 60px 60px 80px;` → `grid-template-columns: minmax(0, 1fr) 100px 60px 60px 80px;`
- 900px bloğuna (415-417) tablo satırları için ekle:

```css
    .tableHeader,
    .tableRow {
        grid-template-columns: minmax(0, 1fr) 80px 50px;
        font-size: 0.75rem;
    }
```

(Seçici adlarını `grep -n 'grid-template-columns: 1fr 100px' admin.module.css` çıktısındaki gerçek sınıflardan al; 5 kolonun mobilde hangi 3'e ineceğini sayfadaki içerik belirler — durum + işlem kolonu kalmalı.)

- [ ] **Step 2: Görsel doğrulama + commit**

768/1280px'te `/admin` (admin hesabıyla): tablolar taşmıyor, kartlar cam. Dark+light.

```bash
git add src/app/admin/
git commit -m "fix(admin): grid esnekligi + aurora cam paneller"
```

---

### Task 13: Final Doğrulama Süpürmesi

- [ ] **Step 1: Kalıntı grep (tüm src)**

```bash
grep -rnE 'rgba\(31, ?111, ?235|#1f6feb|#134ea5|#1e3a8a|#c8845a|#1a3c5e|rgba\(26, ?60, ?94|#f7f5f0' src/
```
Beklenen: 0 eşleşme.

```bash
grep -rn 'data-theme="\(sky\|mint\|sand\)"' src/
```
Beklenen: 0 eşleşme.

- [ ] **Step 2: Build + lint**

Run: `npm run build && npm run lint` → ikisi de temiz.

- [ ] **Step 3: Dört kritik sayfa son tur**

360 ve 390px'te `/marketplace`, `/hesapla`, `/dashboard`, `/inbox`: scrollWidth denetimi `false`. Dark+light tema toggle her sayfada test.

- [ ] **Step 4: Commit (kalan düzeltmeler varsa)**

```bash
git add -A src/
git commit -m "chore(design): aurora redesign final dogrulama duzeltmeleri"
```
