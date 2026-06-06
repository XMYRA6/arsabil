# ArsaBil — Mobile UI Premium Redesign

**Tarih:** 2026-06-07  
**Kapsam:** Tüm mobile UI — Light default (Premium Minimal) + Dark optional (Dark Fintech)

---

## Hedef

Mevcut mobile UI'yı, hem light hem dark temada tutarlı, Apple-kalitesinde profesyonel bir görünüme kavuşturmak. Light tema varsayılan olacak (Premium Minimal); dark tema opsiyonel olarak korunacak (Dark Fintech, mevcut).

---

## Kararlar

| Konu | Karar |
|------|-------|
| Default tema | `light` → Premium Minimal (şu an dark) |
| Dark tema | Mevcut Dark Fintech korunur, `--primary-rgb` düzeltmesi zaten yapıldı |
| Sky / Mint / Sand | Dokunulmaz, light tabanlı renk varyantları olarak kalır |
| Desktop layout | Değişmez — yalnızca `@media (max-width: 768px)` |
| Kapsam | `globals.css`, `page.module.css`, `BottomNavbar.module.css`, `LocationSelector.tsx` |

---

## Bölüm 1: Tema Mimarisi — `globals.css`

### `:root` default değişikliği
Şu an `:root` = dark tema. Yeni düzende:
- `[data-theme="dark"]` ve `:root` dark tokenleri **sadece** `[data-theme="dark"]` selector'ına taşınır
- `[data-theme="light"]` veya `:root` → **Premium Minimal** tokenleri

### Premium Minimal Light Token'ları
```css
[data-theme="light"], :root {
  --bg: #f8fafc;
  --bg-body: linear-gradient(180deg, #f8fafc 0%, #f1f5fb 100%);
  --panel: #ffffff;
  --panel-2: #f3f6fb;
  --text: #0b1b2b;
  --muted: #6b7a90;
  --border: #e6edf6;
  --card-title: #10243c;
  --label-color: #19324f;
  --val-color: #0f2a4a;

  --shell-bg: rgba(255, 255, 255, .65);
  --shell-border: rgba(0, 0, 0, .06);
  --topbar-bg: rgba(248, 250, 252, 0.92);
  --topbar-border: #e6edf6;
  --topbar-text: #0b1b2b;

  --shadow: 0 4px 20px rgba(0, 0, 0, .06);
  --shadow2: 0 2px 10px rgba(0, 0, 0, .04);

  --primary: #1f6feb;
  --primary-rgb: 31, 111, 235;
  --primary-2: #134ea5;
  --primary-glow: rgba(31, 111, 235, .20);
  --green: #16a34a;
  --orange: #d97706;
  --red: #dc2626;

  --input-bg: #ffffff;
  --input-solid: #ffffff;
  --stat-bg: #ffffff;
  --input-focus-border: rgba(31, 111, 235, .50);
  --input-focus-shadow: 0 0 0 3px rgba(31, 111, 235, .12);

  --hero-bg: linear-gradient(145deg, #1f6feb, #134ea5);
  --hero-shadow: 0 12px 30px rgba(31, 111, 235, .25);
  --hero-border: rgba(255, 255, 255, .15);
  --page-title-color: #0b1b2b;

  --radius: 16px;
  --radius-sm: 0.5rem;
  --radius-md: 0.75rem;
  --radius-lg: 1rem;
  --radius-xl: 1.5rem;
}
```

**Not:** Eski `[data-theme="light"]` bloku tamamen silinir, yerini yukarıdaki alır. Dark tema `[data-theme="dark"]` altında kalır, `:root` paylaşımı kaldırılır.

---

## Bölüm 2: Hesapla Sayfası Mobile Layout — `page.module.css`

`@media (max-width: 768px)` bloğu aşağıdaki şekilde yeniden yazılır.

### Sticky Header

```css
.mobileHeader {
    position: sticky;
    top: env(safe-area-inset-top, 0px);
    z-index: 200;
    background: var(--topbar-bg);
    backdrop-filter: blur(28px);
    -webkit-backdrop-filter: blur(28px);
    border-bottom: 1px solid var(--border);
    padding: calc(env(safe-area-inset-top, 0px) + 14px) 16px 10px;
}
```

TSX'te: `<div className={styles.mobileHeader}>` — logo + settings buton + page dots

### Page Dots (pill-shaped)

```css
.mobilePageControl {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 5px;
    margin-top: 10px;
}

.pageDot {
    width: 5px;
    height: 5px;
    border-radius: 3px;
    background: var(--border);
    transition: all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.pageDotActive {
    width: 22px;
    background: var(--primary);
}
```

### Input Card (her girdi satırı için)

```css
.inputCard {
    background: var(--panel);
    border: 1px solid var(--border);
    border-radius: 14px;
    padding: 12px 14px;
}

.inputCardLabel {
    font-size: 0.56rem;
    font-weight: 700;
    color: var(--muted);
    text-transform: uppercase;
    letter-spacing: 0.7px;
    margin-bottom: 2px;
}

.inputCardValue {
    font-size: 1.2rem;
    font-weight: 900;
    color: var(--text);
    letter-spacing: -0.5px;
    line-height: 1.2;
}
```

### Stepper Butonları (− / +)

```css
.stepperMinus {
    width: 32px;
    height: 32px;
    border-radius: 10px;
    border: 1.5px solid var(--border);
    background: transparent;
    color: var(--muted);
    font-size: 1.1rem;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
}

.stepperPlus {
    width: 32px;
    height: 32px;
    border-radius: 10px;
    border: none;
    background: var(--primary);
    color: white;
    font-size: 1.1rem;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    box-shadow: 0 4px 12px var(--primary-glow);
}
```

### Hero Sonuç Kartı

```css
.heroResultCard {
    background: var(--hero-bg);
    border-radius: 18px;
    padding: 16px;
    box-shadow: var(--hero-shadow);
    position: relative;
    overflow: hidden;
}

.heroResultCard::after {
    content: '';
    position: absolute;
    top: -20px;
    right: -20px;
    width: 80px;
    height: 80px;
    background: rgba(255, 255, 255, .08);
    border-radius: 50%;
}

.heroAmount {
    font-size: 1.75rem;
    font-weight: 900;
    color: white;
    letter-spacing: -1px;
    line-height: 1;
}

.heroAmountUnit {
    font-size: 0.75rem;
    opacity: 0.7;
    font-weight: 600;
}

.heroDivider {
    height: 1px;
    background: rgba(255, 255, 255, .15);
    margin: 10px 0;
}
```

### 2×2 Stat Grid

```css
.statGrid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
}

.statGridCard {
    background: var(--panel);
    border: 1px solid var(--border);
    border-radius: 14px;
    padding: 12px;
}

.statGridCard.green {
    background: rgba(22, 163, 74, .06);
    border-color: rgba(22, 163, 74, .25);
}

.statGridLabel {
    font-size: 0.5rem;
    font-weight: 700;
    color: var(--muted);
    text-transform: uppercase;
    letter-spacing: 0.6px;
    margin-bottom: 4px;
}

.statGridValue {
    font-size: 0.92rem;
    font-weight: 900;
    color: var(--text);
    letter-spacing: -0.3px;
}

.statGridCard.green .statGridLabel { color: rgba(22, 163, 74, .7); }
.statGridCard.green .statGridValue { color: #16a34a; }
```

### Mobile Action Butonları

```css
.mobileActions {
    display: flex;
    gap: 8px;
    align-items: center;
}

.mobileActionIcon {
    width: 44px;
    height: 44px;
    border-radius: 12px;
    border: 1.5px solid var(--border);
    background: var(--panel);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
}

.mobileActionIcon.green {
    background: rgba(22, 163, 74, .08);
    border-color: rgba(22, 163, 74, .30);
}

.mobileActionPrimary {
    flex: 1;
    height: 44px;
    border-radius: 12px;
    background: var(--primary);
    color: white;
    font-weight: 800;
    font-size: 0.85rem;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 6px 18px var(--primary-glow);
    border: none;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
}
```

### LocationSelector Mobile Stili

`LocationSelector.tsx` inline stillerindeki renk değerleri CSS variable'larıyla güncellenecek; ayrıca Premium Minimal'a uygun ikon container (beyaz kart, mavi bg ikon) eklenecek.

Seçim yapılmadığında:
```
┌─────────────────────────────────────────┐
│  [📍 mavi bg]  İl / İlçe seçin →        │
└─────────────────────────────────────────┘
```

Seçim yapıldığında (yeşil state — mevcut ile aynı):
```
┌──────────────────────────────────────── ✕ ┐
│  📍  İstanbul / Kadıköy                    │
│      Piyasa: X TL/m² · Birim: Y TL/m²    │
└──────────────────────────────────────────┘
```

---

## Bölüm 3: BottomNavbar Light Theme — `BottomNavbar.module.css`

Mevcut light theme override'ı (`[data-theme="sky"] .bottomNav` vb.) güncellenir:

```css
:global([data-theme="light"]) .bottomNav,
:global([data-theme="sky"]) .bottomNav,
:global([data-theme="mint"]) .bottomNav,
:global([data-theme="sand"]) .bottomNav {
    background: rgba(248, 250, 252, 0.92);
    border-top: 0.5px solid #e6edf6;
    box-shadow:
        0 -0.5px 0 rgba(0, 0, 0, .04),
        0 -8px 24px rgba(0, 0, 0, .05),
        inset 0 1px 0 rgba(255, 255, 255, .80);
}
```

Active pill zaten `rgba(var(--primary-rgb), 0.13)` kullanıyor — light temada primary-rgb artık doğru set ediliyor (Bölüm 1'den). Ek değişiklik gerekmez.

---

## Kapsam Dışı

- Desktop layout değişikliği
- Sky / mint / sand tema token'ları (sadece light/dark)
- Marketplace ve dashboard sayfaları (theme değişikliğinden otomatik faydalanır)
- Animasyon / geçiş efektleri (swipe carousel mekanizması aynı kalır)
- Yeni SVG ikonlar

---

## Etkilenen Dosyalar

```
src/app/globals.css                          ← :root token swap (dark→light), light blok yeniden yaz
src/app/hesapla/page.module.css              ← @media mobile bölüm, yeni CSS class'lar
src/app/hesapla/page.tsx                     ← mobileHeader div + yeni class isimleri
src/components/LocationSelector.tsx          ← icon container + renk güncellemesi
src/components/layout/BottomNavbar.module.css ← light theme override genişletme
```
