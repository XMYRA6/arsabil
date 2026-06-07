# ArsaBil UI Design System — Faz 4

**Tarih:** 2026-06-08  
**Durum:** Onaylandı  
**Kapsam:** globals.css tam yenileme (2 tema), tema toggle, anti-flash script

---

## Hedef

"Web UI çok kötü" şikayetini gidermek için tüm CSS token'larını sıfırdan tasarlanmış bir design system'e taşı. 5 tema → 2 tema. Kullanıcı seçimi `localStorage`'da saklanır; SSR flash önlenir.

---

## Yaklaşım

`globals.css`'teki CSS değişkenlerini tamamen yeniden yaz. Tüm bileşenler zaten `var(--*)` kullandığından, sadece bu dosyayı değiştirmek tüm sayfaları otomatik günceller — her sayfanın CSS modülüne dokunmak gerekmez.

**Kaldırılanlar:** `[data-theme="sky"]`, `[data-theme="mint"]`, `[data-theme="sand"]`, `.glass-card` multi-theme kuralları, `--bg-a/b/c`, `--blob-*` değişkenleri.

**Eklenenler:** `--shadow-sm`, `--shadow-md`, `--shadow-lg`, `--radius-full` token'ları.

---

## File Map

| Dosya | İşlem |
|-------|-------|
| `src/app/globals.css` | Tam yenileme — 2 tema |
| `src/app/layout.tsx` | Anti-flash `<script>` ekle |
| `src/components/layout/Navbar.tsx` | Tema toggle (☀️/🌙) butonu ekle |

---

## 1. CSS Token'ları

### Light Tema — `:root` ve `[data-theme="light"]`

```css
[data-theme="light"], :root {
  /* Backgrounds */
  --bg:          #ffffff;
  --bg-body:     #f8fafc;
  --panel:       #ffffff;
  --panel-2:     #f8fafc;

  /* Typography */
  --text:              #0f172a;
  --muted:             #64748b;
  --card-title:        #0f172a;
  --label-color:       #64748b;
  --val-color:         #0f172a;
  --page-title-color:  #0f172a;

  /* Border */
  --border: #e2e8f0;

  /* Topbar */
  --topbar-bg:     rgba(255, 255, 255, 0.95);
  --topbar-border: #e2e8f0;
  --topbar-text:   #0f172a;

  /* Shadows */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, .05);
  --shadow:    0 1px 3px rgba(0, 0, 0, .1), 0 1px 2px rgba(0, 0, 0, .06);
  --shadow-md: 0 4px 12px rgba(0, 0, 0, .1);
  --shadow-lg: 0 8px 24px rgba(0, 0, 0, .12);
  --shadow2:   var(--shadow);   /* compat alias */

  /* Brand */
  --primary:      #2563eb;
  --primary-rgb:  37, 99, 235;
  --primary-2:    #1d4ed8;
  --primary-glow: rgba(37, 99, 235, .12);

  /* Semantic */
  --green:  #16a34a;
  --orange: #d97706;
  --red:    #dc2626;

  /* Inputs */
  --input-bg:           #ffffff;
  --input-solid:        #ffffff;
  --stat-bg:            #ffffff;
  --input-focus-border: #2563eb;
  --input-focus-shadow: 0 0 0 3px rgba(37, 99, 235, .12);

  /* Hero / CTA */
  --hero-bg:     linear-gradient(135deg, #2563eb, #1d4ed8);
  --hero-shadow: 0 8px 24px rgba(37, 99, 235, .25);
  --hero-border: rgba(255, 255, 255, .20);

  /* Shell (glass overlay panels) */
  --shell-bg:     #ffffff;
  --shell-border: #e2e8f0;

  /* Radius */
  --radius-sm:  4px;
  --radius:     8px;
  --radius-md:  12px;
  --radius-lg:  16px;
  --radius-xl:  24px;
  --radius-full: 9999px;
}
```

### Dark Tema — `[data-theme="dark"]`

```css
[data-theme="dark"] {
  /* Backgrounds */
  --bg:      #0d1117;
  --bg-body: #0d1117;
  --panel:   #161b22;
  --panel-2: #21262d;

  /* Typography */
  --text:              #e6edf3;
  --muted:             #8b949e;
  --card-title:        #e6edf3;
  --label-color:       #8b949e;
  --val-color:         #e6edf3;
  --page-title-color:  #e6edf3;

  /* Border */
  --border: #30363d;

  /* Topbar */
  --topbar-bg:     rgba(22, 27, 34, 0.95);
  --topbar-border: #30363d;
  --topbar-text:   #e6edf3;

  /* Shadows */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, .30);
  --shadow:    0 1px 3px rgba(0, 0, 0, .40), 0 1px 2px rgba(0, 0, 0, .30);
  --shadow-md: 0 4px 12px rgba(0, 0, 0, .40);
  --shadow-lg: 0 8px 24px rgba(0, 0, 0, .50);
  --shadow2:   var(--shadow);

  /* Brand */
  --primary:      #3b82f6;
  --primary-rgb:  59, 130, 246;
  --primary-2:    #2563eb;
  --primary-glow: rgba(59, 130, 246, .20);

  /* Semantic */
  --green:  #3fb950;
  --orange: #f0883e;
  --red:    #f85149;

  /* Inputs */
  --input-bg:           #21262d;
  --input-solid:        #21262d;
  --stat-bg:            #161b22;
  --input-focus-border: #3b82f6;
  --input-focus-shadow: 0 0 0 3px rgba(59, 130, 246, .20);

  /* Hero / CTA */
  --hero-bg:     linear-gradient(135deg, #1f6feb, #7c3aed);
  --hero-shadow: 0 8px 24px rgba(31, 111, 235, .30);
  --hero-border: rgba(255, 255, 255, .08);

  /* Shell */
  --shell-bg:     #161b22;
  --shell-border: #30363d;

  /* Radius (same as light) */
  --radius-sm:  4px;
  --radius:     8px;
  --radius-md:  12px;
  --radius-lg:  16px;
  --radius-xl:  24px;
  --radius-full: 9999px;
}
```

---

## 2. Anti-Flash Script — `src/app/layout.tsx`

Sayfa yüklenirken React hydrate olmadan önce temayı `localStorage`'dan uygular. Bu olmadan dark tema seçmiş kullanıcılar kısa bir beyaz flash görür.

`<head>` içine, font `<link>`'inden **önce** ekle:

```tsx
<script
  dangerouslySetInnerHTML={{
    __html: `(function(){try{var t=localStorage.getItem('arsabil-theme');if(t==='dark')document.documentElement.setAttribute('data-theme','dark');}catch(e){}})()`,
  }}
/>
```

localStorage key: `'arsabil-theme'`  
Değerler: `'light'` | `'dark'`  
Varsayılan (key yoksa): light (`:root` kuralı devreye girer, `data-theme` attribute'u boş bırakılır)

---

## 3. Tema Toggle — `src/components/layout/Navbar.tsx`

Mevcut Navbar'a tema geçiş butonu ekle. Kullanıcı tıkladığında:
1. `document.documentElement`'in `data-theme` attribute'u değişir
2. `localStorage.setItem('arsabil-theme', newTheme)` çağrılır
3. React state güncellenir (buton ikonunu değiştirmek için)

### Implementasyon detayı

Mevcut Navbar zaten client component (`'use client'`). Eklenecek:

```tsx
const [theme, setTheme] = useState<'light' | 'dark'>('light')

useEffect(() => {
  const saved = localStorage.getItem('arsabil-theme') as 'light' | 'dark' | null
  if (saved) setTheme(saved)
}, [])

const toggleTheme = () => {
  const next = theme === 'light' ? 'dark' : 'light'
  setTheme(next)
  if (next === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark')
  } else {
    document.documentElement.removeAttribute('data-theme')
  }
  localStorage.setItem('arsabil-theme', next)
}
```

Buton JSX (mevcut nav item'larının yanına):
```tsx
<button onClick={toggleTheme} aria-label="Tema değiştir" style={{
  background: 'none', border: 'none', cursor: 'pointer',
  fontSize: '1.1rem', padding: '4px 8px', color: 'var(--topbar-text)',
}}>
  {theme === 'dark' ? '☀️' : '🌙'}
</button>
```

---

## 4. Kapsam Dışı

- Bireysel sayfa CSS modüllerine dokunmak (zaten CSS değişkenlerini kullanıyorlar)
- Font değişikliği (Inter kalır)
- Animasyon/transition token'ları
- Responsive breakpoint değişikliği
- Admin panel'e ayrı tema (admin aynı sistemi kullanır)

---

## Test Stratejisi

- TypeScript: `npx tsc --noEmit`
- Jest: `npx jest --no-coverage` (52 test — CSS değişmez, pass olmalı)
- Manuel: light/dark toggle, localStorage persistans (sayfayı yenile → tema korunuyor), tüm sayfalarda görsel kontrol
