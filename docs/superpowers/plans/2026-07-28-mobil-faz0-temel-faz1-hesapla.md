# Mobil "Premium Liquid Glass" — Faz 0 (Temel) + Faz 1 (Hesapla) Implementasyon Planı

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mobil tasarım dilinin temelini kurmak (token/cam/mesh/mono/ikon/alt çubuk/layout) ve `/hesapla` ekranını üç alt görünümüyle birlikte yeni dile geçirmek.

**Architecture:** Yeni token'lar `--m-*` ön ekiyle `globals.css`'e eklenir ve yalnızca `@media (max-width: 768px)` içinde uygulanır; mevcut `--seal-*` token'ları silinmez (masaüstü onları kullanıyor). `hesapla/page.tsx` 1004 satır ve masaüstü/mobil JSX'i iç içe; bu dosyanın içinde cerrahi düzenleme yapmak yerine **mobil ekran kendi bileşen ağacında** (`src/app/hesapla/mobile/`) kurulur. `page.tsx` tüm state'in tek sahibi olarak kalır ve mobil ağaca prop olarak geçer — böylece masaüstü JSX'ine hiç dokunulmaz.

**Tech Stack:** Next.js 16, React 19, TypeScript, CSS Modules, Jest + RTL, framer-motion (kurulu).

**Tasarım kaynağı:** `docs/tasarim/mobil-2026-07-28/kartlar/*.html` — kesin sayılar (renk, yarıçap, gölge, blur, padding, font) oradan alınır, tahmin edilmez.

**Spec:** `docs/superpowers/specs/2026-07-28-mobil-premium-liquid-glass-design.md` (commit `f671edd`)

## Global Constraints

- **Yalnızca mobil (`max-width: 768px`). `≥769px` masaüstü düzeni DEĞİŞMEZ.** Her CSS kuralı mobil media query içinde olmalı.
- **Dokunma hedefi `min-height` YALNIZCA mobil media query içinde tanımlanır.** Dışına konursa masaüstü birkaç px büyür — bu hata Faz 1'de üç kez yaşandı.
- **`src/lib/calculator/engine_v2.ts` DEĞİŞMEZ.**
- **`--seal-*` token'ları SİLİNMEZ**, yalnızca mobilde kullanılmaz.
- **Emoji kullanılmaz** — tüm emoji çizgi ikona çevrilir. İkonlar 24×24 viewBox, `stroke="currentColor"`, `stroke-width:2`, yuvarlak uçlar.
- **Tüm rakamlar** JetBrains Mono + `font-variant-numeric: tabular-nums`.
- **`prefers-reduced-motion: reduce`** altında tüm hareket kapanır.
- Türkçe kullanıcı metinleri ve kod yorumları; commit mesajları ASCII.
- Test komutu: `npx jest --no-coverage --roots "<rootDir>/src"`. RTL testleri `/** @jest-environment jsdom */` pragma'sı gerektirir (repo varsayılanı `node`).
- **Leaflet kullanan her yeni bileşende `mapReady` bayrağı + doğru bağımlılık dizisi zorunlu** — bu oturumda async harita kurulumuyla yarışan effect hatası üç kez çıktı.
- Baseline: main `9bf3c23`, **jest 552/552**, `tsc --noEmit` 0, eslint 12 problem (2 hata/10 uyarı, hepsi önceden var), `npm run build` başarılı.

## Dosya Yapısı

| Dosya | Sorumluluk |
|---|---|
| `src/app/globals.css` | `--m-*` token katmanı + JetBrains Mono import (mevcut dosyaya ekleme) |
| `src/app/globalsMobile.scope.test.ts` | Token'ların mobil media query dışına sızmadığını doğrular |
| `src/components/icons/index.tsx` | Çizgi ikon seti — tek dosya, adlandırılmış export'lar |
| `src/components/layout/BottomNavbar.tsx(+.module.css)` | 5 düz sekme, FAB yok (mevcut dosya değişir) |
| `src/components/mobile/MobileScreen.tsx(+.module.css)` | Alt çubuk/CTA dolgusunu TEK yerde çözen kaydırma kabı |
| `src/app/hesapla/mobile/HesaplaMobile.tsx` | Mobil ekranın kökü — state prop olarak gelir, sahiplenmez |
| `src/app/hesapla/mobile/SonucKarti.tsx` | `2a` degrade sonuç kartı |
| `src/app/hesapla/mobile/GirdiKarti.tsx` | `2a` cam girdi kartı |
| `src/app/hesapla/mobile/FiyatAciklamasi.tsx` | `4a` "Bu fiyat nereden geliyor?" |
| `src/app/hesapla/mobile/GelismisAyarlarSheet.tsx` | `4f` alt yaprak |
| `src/app/hesapla/mobile/mobile.module.css` | Yukarıdakilerin ortak CSS modülü |

---

### Task 1: Token katmanı + JetBrains Mono

**Files:**
- Modify: `src/app/globals.css` (satır 4 import bloğu; satır 186 `@media (max-width: 768px)` bloğu)
- Test: `src/app/globalsMobile.scope.test.ts`

**Interfaces:**
- Consumes: —
- Produces: CSS değişkenleri — `--m-bg`, `--m-mesh`, `--m-grad-accent`, `--m-grad-btn`, `--m-ink`, `--m-body`, `--m-glass-bg`, `--m-glass-border`, `--m-glass-blur`, `--m-glass-shadow`, `--m-success`, `--m-warn`, `--m-danger`, `--m-r-chip`, `--m-r-btn`, `--m-r-card`, `--m-r-sheet`, `--m-sh-card`, `--m-sh-grad-card`, `--m-sh-grad-btn`, `--m-sh-sheet`, `--m-sh-bottombar`, `--m-mono`; yardımcı sınıf `.mGlass`

- [ ] **Step 1: Başarısız testi yaz**

`src/app/globalsMobile.scope.test.ts`:

```ts
import { readFileSync } from 'fs'
import { join } from 'path'

const css = readFileSync(join(process.cwd(), 'src/app/globals.css'), 'utf8')

/** `@media (max-width: 768px)` bloğunun gövdesini döndürür. */
function mobileBlock(): string {
    const start = css.indexOf('@media (max-width: 768px)')
    expect(start).toBeGreaterThan(-1)
    const open = css.indexOf('{', start)
    let depth = 0
    for (let i = open; i < css.length; i++) {
        if (css[i] === '{') depth++
        else if (css[i] === '}') {
            depth--
            if (depth === 0) return css.slice(open + 1, i)
        }
    }
    throw new Error('mobil media query blogu kapanmamis')
}

describe('mobil token katmani', () => {
    it('JetBrains Mono import edilmis', () => {
        expect(css).toMatch(/fonts\.googleapis\.com[^'"]*JetBrains\+Mono/)
    })

    it('--m-* token tanimlarinin TAMAMI mobil media query icinde', () => {
        // Masaüstü düzeni değişmemeli: bir --m-* tanımı bloğun dışına
        // kaçarsa >=769px'te de uygulanır.
        const inside = mobileBlock()
        const allDefs = css.match(/--m-[a-z0-9-]+\s*:/g) ?? []
        const insideDefs = inside.match(/--m-[a-z0-9-]+\s*:/g) ?? []
        expect(allDefs.length).toBeGreaterThan(10)
        expect(insideDefs.length).toBe(allDefs.length)
    })

    it('cam yardimci sinifi mobil blok icinde ve dogru recete', () => {
        const inside = mobileBlock()
        expect(inside).toMatch(/\.mGlass\s*\{/)
        expect(inside).toMatch(/backdrop-filter:\s*blur\(30px\)\s+saturate\(190%\)/)
        expect(inside).toMatch(/-webkit-backdrop-filter/)
    })

    it('mevcut --seal-* token'lari SILINMEMIS', () => {
        expect(css).toMatch(/--seal-accent\s*:/)
    })

    it('mono token JetBrains Mono ve tabular-nums iceriyor', () => {
        const inside = mobileBlock()
        expect(inside).toMatch(/--m-mono:[^;]*JetBrains Mono/)
        expect(inside).toMatch(/font-variant-numeric:\s*tabular-nums/)
    })
})
```

- [ ] **Step 2: Testin başarısız olduğunu doğrula**

Run: `npx jest src/app/globalsMobile.scope.test.ts --no-coverage --roots "<rootDir>/src"`
Expected: FAIL — JetBrains Mono import yok, `--m-*` tanımı yok.

- [ ] **Step 3: Font import'unu genişlet**

`src/app/globals.css` satır 4'teki mevcut import satırını şununla değiştir:

```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;700;800&display=swap');
```

- [ ] **Step 4: Token'ları mobil media query'ye ekle**

`src/app/globals.css` içindeki mevcut `@media (max-width: 768px) {` bloğunun İÇİNE, en başa ekle. Değerler tasarım handoff'undan birebir alınmıştır — değiştirme:

```css
  /* ── Mobil tasarim dili: "Premium Liquid Glass" (2026-07-28) ──
     TUM --m-* tanimlari BU BLOGUN ICINDE kalmali; disari kacan bir tanim
     masaustu duzenini de degistirir. globalsMobile.scope.test.ts bunu
     dogruluyor. Mevcut --seal-* token'lari silinmez, mobilde kullanilmaz. */
  :root {
    --m-bg: #f7faff;
    --m-mesh:
      radial-gradient(680px 420px at 12% -6%, rgba(43,124,255,.42), transparent 62%),
      radial-gradient(560px 420px at 96% 8%,  rgba(34,211,238,.38), transparent 60%),
      radial-gradient(620px 520px at 78% 96%, rgba(124,58,237,.24), transparent 62%),
      radial-gradient(520px 380px at 4% 86%,  rgba(16,185,129,.22), transparent 60%);

    --m-grad-accent: linear-gradient(135deg, #3b8bff 0%, #1f6feb 46%, #22d3ee 118%);
    --m-grad-btn: linear-gradient(135deg, #3b8bff, #1f6feb 60%, #22d3ee);

    --m-ink: #0b2036;
    --m-body: #5c6b82;
    --m-on-glass: #173b63;
    --m-link: #1560d0;

    --m-glass-bg: rgba(255,255,255,.66);
    --m-glass-border: rgba(255,255,255,.92);
    --m-glass-blur: blur(30px) saturate(190%);
    --m-fill: rgba(11,32,54,.05);
    --m-divider: rgba(11,32,54,.07);

    --m-success: #10b981;
    --m-success-text: #0a8a63;
    --m-warn: #f59e0b;
    --m-danger: #ff2d55;

    --m-r-chip: 11px;
    --m-r-btn: 13px;
    --m-r-input: 16px;
    --m-r-inner: 20px;
    --m-r-card: 26px;
    --m-r-sheet: 30px;

    --m-sh-card: 0 14px 36px rgba(20,70,150,.12);
    --m-sh-card-sm: 0 6px 18px rgba(20,70,150,.10);
    --m-sh-grad-card: 0 18px 40px rgba(43,124,255,.34);
    --m-sh-grad-btn: 0 12px 28px rgba(43,124,255,.38);
    --m-sh-sheet: 0 -18px 50px rgba(11,32,54,.22);
    --m-sh-bottombar: 0 -8px 30px rgba(20,70,150,.08);

    --m-mono: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace;
  }

  /* Cam yuzey TEK kaynak. Varyantlar bunu override eder (sheet .84 + blur 34,
     kucuk buton .55 + blur 24, alt cubuk .72). */
  .mGlass {
    background: var(--m-glass-bg);
    border: 1px solid var(--m-glass-border);
    backdrop-filter: var(--m-glass-blur);
    -webkit-backdrop-filter: var(--m-glass-blur);
    box-shadow: var(--m-sh-card), inset 0 1px 0 #fff;
  }

  /* Tum rakamlar mono + tabular. Sayilarin siralar arasi kaymamasi icin. */
  .mNum {
    font-family: var(--m-mono);
    font-variant-numeric: tabular-nums;
  }
```

- [ ] **Step 5: Testlerin geçtiğini doğrula**

Run: `npx jest src/app/globalsMobile.scope.test.ts --no-coverage --roots "<rootDir>/src"`
Expected: PASS (5 test)

- [ ] **Step 6: Tam paket**

Run: `npx tsc --noEmit && npx jest --no-coverage --roots "<rootDir>/src"`
Expected: tsc 0; jest 557/557 (552 + 5).

- [ ] **Step 7: Commit**

```bash
git add src/app/globals.css src/app/globalsMobile.scope.test.ts
git commit -m "feat(mobil): premium liquid glass token katmani + JetBrains Mono"
```

---

### Task 2: Çizgi ikon seti

**Files:**
- Create: `src/components/icons/index.tsx`
- Test: `src/components/icons/index.test.tsx`

**Interfaces:**
- Consumes: —
- Produces: `IconProps = { size?: number; className?: string; strokeWidth?: number }` ve şu bileşenler: `IconBox`, `IconFile`, `IconHome`, `IconMessage`, `IconUser`, `IconCalculator`, `IconPin`, `IconSettings`, `IconChevronRight`, `IconCheckCircle`, `IconHeart`, `IconHeartFilled`, `IconEdit`, `IconMap`, `IconChart`, `IconMoney`, `IconRuler`, `IconFlame`

- [ ] **Step 1: Başarısız testi yaz**

`src/components/icons/index.test.tsx`:

```tsx
/** @jest-environment jsdom */
import { render } from '@testing-library/react'
import * as Icons from './index'

const NAMES = [
    'IconBox', 'IconFile', 'IconHome', 'IconMessage', 'IconUser',
    'IconCalculator', 'IconPin', 'IconSettings', 'IconChevronRight',
    'IconCheckCircle', 'IconHeart', 'IconHeartFilled', 'IconEdit',
    'IconMap', 'IconChart', 'IconMoney', 'IconRuler', 'IconFlame',
] as const

describe('ikon seti', () => {
    it.each(NAMES)('%s cizgi ikon sozlesmesine uyar', (name) => {
        const Icon = Icons[name] as React.ComponentType<Icons.IconProps>
        const { container } = render(<Icon />)
        const svg = container.querySelector('svg')!
        expect(svg).toBeInTheDocument()
        expect(svg.getAttribute('viewBox')).toBe('0 0 24 24')
        expect(svg.getAttribute('stroke')).toBe('currentColor')
        expect(svg.getAttribute('fill')).toBe('none')
        expect(svg.getAttribute('stroke-linecap')).toBe('round')
        expect(svg.getAttribute('stroke-linejoin')).toBe('round')
    })

    it('size prop u genislik ve yukseklige uygulanir', () => {
        const { container } = render(<Icons.IconHome size={19} />)
        const svg = container.querySelector('svg')!
        expect(svg.getAttribute('width')).toBe('19')
        expect(svg.getAttribute('height')).toBe('19')
    })

    it('strokeWidth override edilebilir (aktif sekme 2.4 kullanir)', () => {
        const { container } = render(<Icons.IconHome strokeWidth={2.4} />)
        expect(container.querySelector('svg')!.getAttribute('stroke-width')).toBe('2.4')
    })

    it('varsayilan stroke-width 2', () => {
        const { container } = render(<Icons.IconHome />)
        expect(container.querySelector('svg')!.getAttribute('stroke-width')).toBe('2')
    })

    it('className disari gecirilir', () => {
        const { container } = render(<Icons.IconHome className="x" />)
        expect(container.querySelector('svg')!.getAttribute('class')).toBe('x')
    })
})
```

- [ ] **Step 2: Testin başarısız olduğunu doğrula**

Run: `npx jest src/components/icons --no-coverage --roots "<rootDir>/src"`
Expected: FAIL — `Cannot find module './index'`

- [ ] **Step 3: İkon setini yaz**

`src/components/icons/index.tsx`. Alt navigasyon ikonlarının (`IconBox`, `IconFile`, `IconMessage`, `IconUser`) path'leri **mevcut `BottomNavbar.tsx`'ten korunur** — tasarım bunu açıkça söylüyor. Diğerleri Feather/Lucide tarzıdır.

```tsx
import type { ReactNode } from 'react'

export type IconProps = { size?: number; className?: string; strokeWidth?: number }

function Svg({ size = 24, className, strokeWidth = 2, children }: IconProps & { children: ReactNode }) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
            aria-hidden="true"
        >
            {children}
        </svg>
    )
}

/* ── Alt navigasyon: path'ler mevcut BottomNavbar.tsx'ten korundu ── */
export const IconBox = (p: IconProps) => (
    <Svg {...p}>
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
        <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
        <line x1="12" y1="22.08" x2="12" y2="12" />
    </Svg>
)
export const IconFile = (p: IconProps) => (
    <Svg {...p}>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
    </Svg>
)
export const IconMessage = (p: IconProps) => (
    <Svg {...p}>
        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </Svg>
)
export const IconUser = (p: IconProps) => (
    <Svg {...p}>
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
    </Svg>
)
export const IconHome = (p: IconProps) => (
    <Svg {...p}>
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
    </Svg>
)

/* ── Genel ── */
export const IconCalculator = (p: IconProps) => (
    <Svg {...p}>
        <rect x="4" y="2" width="16" height="20" rx="2" />
        <line x1="8" y1="6" x2="16" y2="6" />
        <line x1="8" y1="11" x2="8" y2="11" />
        <line x1="12" y1="11" x2="12" y2="11" />
        <line x1="16" y1="11" x2="16" y2="11" />
        <line x1="8" y1="15" x2="8" y2="15" />
        <line x1="12" y1="15" x2="12" y2="15" />
        <line x1="16" y1="15" x2="16" y2="18" />
    </Svg>
)
export const IconPin = (p: IconProps) => (
    <Svg {...p}>
        <path d="M12 21s-7-4.35-7-10a7 7 0 1114 0c0 5.65-7 10-7 10z" />
        <circle cx="12" cy="11" r="2.5" />
    </Svg>
)
export const IconSettings = (p: IconProps) => (
    <Svg {...p}>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9v.09a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </Svg>
)
export const IconChevronRight = (p: IconProps) => (<Svg {...p}><path d="M9 6l6 6-6 6" /></Svg>)
export const IconCheckCircle = (p: IconProps) => (
    <Svg {...p}><circle cx="12" cy="12" r="9" /><path d="M8 12.5l2.5 2.5L16 9" /></Svg>
)
export const IconHeart = (p: IconProps) => (
    <Svg {...p}><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1L12 21l7.7-7.6 1.1-1a5.5 5.5 0 0 0 0-7.8z" /></Svg>
)
export const IconHeartFilled = (p: IconProps) => (
    <svg
        width={p.size ?? 24} height={p.size ?? 24} viewBox="0 0 24 24"
        fill="none" stroke="currentColor" strokeWidth={p.strokeWidth ?? 2}
        strokeLinecap="round" strokeLinejoin="round" className={p.className} aria-hidden="true"
    >
        {/* Dolu varyant: govde currentColor ile boyanir, sozlesme geregi
            svg'nin kendi fill'i "none" kalir. */}
        <path
            d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1L12 21l7.7-7.6 1.1-1a5.5 5.5 0 0 0 0-7.8z"
            fill="currentColor"
        />
    </svg>
)
export const IconEdit = (p: IconProps) => (
    <Svg {...p}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4z" /></Svg>
)
export const IconMap = (p: IconProps) => (
    <Svg {...p}><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" /><line x1="8" y1="2" x2="8" y2="18" /><line x1="16" y1="6" x2="16" y2="22" /></Svg>
)
export const IconChart = (p: IconProps) => (
    <Svg {...p}><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></Svg>
)
export const IconMoney = (p: IconProps) => (
    <Svg {...p}><rect x="2" y="6" width="20" height="12" rx="2" /><circle cx="12" cy="12" r="2.5" /><line x1="6" y1="12" x2="6" y2="12" /><line x1="18" y1="12" x2="18" y2="12" /></Svg>
)
export const IconRuler = (p: IconProps) => (
    <Svg {...p}><path d="M16 2l6 6L8 22l-6-6z" /><line x1="12" y1="6" x2="14" y2="8" /><line x1="9" y1="9" x2="11" y2="11" /><line x1="6" y1="12" x2="8" y2="14" /></Svg>
)
export const IconFlame = (p: IconProps) => (
    <Svg {...p}><path d="M12 2s5 5 5 9a5 5 0 0 1-10 0c0-1.5.7-2.8 1.5-3.8C9 8.5 12 6 12 2z" /></Svg>
)
```

- [ ] **Step 4: Testlerin geçtiğini doğrula**

Run: `npx jest src/components/icons --no-coverage --roots "<rootDir>/src"`
Expected: PASS (22 test — 18 ikon parametrik + 4)

- [ ] **Step 5: Commit**

```bash
git add src/components/icons
git commit -m "feat(mobil): cizgi ikon seti (emoji yerine)"
```

---

### Task 3: Yeni alt navigasyon (5 düz sekme, FAB yok)

**Files:**
- Modify: `src/components/layout/BottomNavbar.tsx` (tamamı yeniden yazılır)
- Modify: `src/components/layout/BottomNavbar.module.css`
- Test: `src/components/layout/BottomNavbar.test.tsx`

**Interfaces:**
- Consumes: `IconBox`, `IconFile`, `IconHome`, `IconMessage`, `IconUser` (Task 2)
- Produces: `BOTTOMNAV_HIDDEN_PATHS: readonly string[]` — alt çubuğun gizlendiği yollar

**KRİTİK:** Sekme sırası `Pazar · Raporlar · Ana sayfa · Mesajlar · Profil`. Ortadaki FAB (`fabContainer`/`fabItem`/`fabActive`/`fabText`, mevcut satır 70-76) **tamamen kaldırılır** — içeriği kesiyordu. "Hesapla" artık alt çubukta değil; ortadaki sekme **Ana sayfa**dır.

Mevcut okunmamış mesaj sayacı mantığı (satır 16-52) **aynen korunur** — `status` geçişinde render sırasında sıfırlama dahil, bu kasıtlı bir çözümdür.

- [ ] **Step 1: Başarısız testi yaz**

`src/components/layout/BottomNavbar.test.tsx`:

```tsx
/** @jest-environment jsdom */
const mockPathname = jest.fn()
jest.mock('next/navigation', () => ({ usePathname: () => mockPathname() }))
jest.mock('next-auth/react', () => ({ useSession: () => ({ status: 'unauthenticated' }) }))
jest.mock('next/link', () => ({
    __esModule: true,
    default: ({ href, children, ...r }: { href: string; children: React.ReactNode }) =>
        <a href={href} {...r}>{children}</a>,
}))

import { render, screen } from '@testing-library/react'
import { BottomNavbar, BOTTOMNAV_HIDDEN_PATHS } from './BottomNavbar'

beforeEach(() => { mockPathname.mockReturnValue('/marketplace') })

describe('BottomNavbar', () => {
    it('bes sekme, tasarimdaki sirayla', () => {
        render(<BottomNavbar />)
        const links = screen.getAllByRole('link')
        expect(links.map(a => a.textContent)).toEqual(
            ['Pazar', 'Raporlar', 'Ana sayfa', 'Mesajlar', 'Profil'],
        )
    })

    it('ortadaki sekme Ana sayfa; FAB kaldirildi', () => {
        render(<BottomNavbar />)
        const links = screen.getAllByRole('link')
        expect(links[2]).toHaveAttribute('href', '/')
        // "Hesapla" artik alt cubukta degil.
        expect(screen.queryByText('Hesapla')).toBeNull()
    })

    it('aktif sekme aria-current tasir', () => {
        render(<BottomNavbar />)
        expect(screen.getByRole('link', { name: 'Pazar' })).toHaveAttribute('aria-current', 'page')
        expect(screen.getByRole('link', { name: 'Profil' })).not.toHaveAttribute('aria-current')
    })

    it.each(BOTTOMNAV_HIDDEN_PATHS)('%s yolunda hic render edilmez', (path) => {
        mockPathname.mockReturnValue(path)
        const { container } = render(<BottomNavbar />)
        expect(container).toBeEmptyDOMElement()
    })

    it('sohbet ve wizard alt yollarinda da gizlenir', () => {
        for (const p of ['/inbox/abc123', '/listings/new']) {
            mockPathname.mockReturnValue(p)
            const { container } = render(<BottomNavbar />)
            expect(container).toBeEmptyDOMElement()
        }
    })
})
```

- [ ] **Step 2: Testin başarısız olduğunu doğrula**

Run: `npx jest src/components/layout/BottomNavbar --no-coverage --roots "<rootDir>/src"`
Expected: FAIL — `BOTTOMNAV_HIDDEN_PATHS` export edilmemiş; sekme metinleri eşleşmiyor.

- [ ] **Step 3: Bileşeni yeniden yaz**

`src/components/layout/BottomNavbar.tsx` — okunmamış sayaç mantığını (mevcut satır 16-52) aynen koru, yalnızca gizleme kuralını ve `<nav>` içeriğini değiştir:

```tsx
"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { IconBox, IconFile, IconHome, IconMessage, IconUser, type IconProps } from '@/components/icons';
import styles from './BottomNavbar.module.css';

interface Conversation {
    unreadCount: number;
}

/** Alt cubugun HIC gosterilmedigi yollar (tam eslesme). */
export const BOTTOMNAV_HIDDEN_PATHS = ['/login', '/register'] as const;

/** Alt cubugun gizlendigi yol onekleri: sohbet, wizard, ilan detay. */
const HIDDEN_PREFIXES = ['/inbox/', '/listings/new', '/listing/'] as const;

const TABS: { href: string; label: string; Icon: React.ComponentType<IconProps> }[] = [
    { href: '/marketplace', label: 'Pazar', Icon: IconBox },
    { href: '/dashboard/reports', label: 'Raporlar', Icon: IconFile },
    { href: '/', label: 'Ana sayfa', Icon: IconHome },
    { href: '/inbox', label: 'Mesajlar', Icon: IconMessage },
    { href: '/dashboard/profile', label: 'Profil', Icon: IconUser },
];

export function BottomNavbar() {
    const pathname = usePathname();
    const { status } = useSession();
    const [unreadTotal, setUnreadTotal] = useState(0);

    // Render-time reset (NOT inside useEffect, so react-hooks/set-state-in-effect
    // does not apply): when the session transitions away from 'authenticated'
    // (e.g. client-side logout in the same tab), unreadTotal must be zeroed
    // immediately so that a later re-authentication in the same tab can never
    // briefly display a stale count left over from the previous session.
    const [prevStatus, setPrevStatus] = useState(status);
    if (status !== prevStatus) {
        setPrevStatus(status);
        if (status !== 'authenticated') {
            setUnreadTotal(0);
        }
    }

    useEffect(() => {
        if (status !== 'authenticated') {
            return;
        }
        let cancelled = false;
        fetch('/api/messages')
            .then(res => (res.ok ? res.json() : null))
            .then(data => {
                if (cancelled || !data?.conversations) return;
                const total = (data.conversations as Conversation[]).reduce(
                    (sum, c) => sum + c.unreadCount, 0
                );
                setUnreadTotal(total);
            })
            .catch(() => {});
        return () => { cancelled = true; };
    }, [status, pathname]);

    const hidden =
        (BOTTOMNAV_HIDDEN_PATHS as readonly string[]).includes(pathname ?? '') ||
        HIDDEN_PREFIXES.some(p => (pathname ?? '').startsWith(p));
    if (hidden) return null;

    const showBadge = status === 'authenticated' && unreadTotal > 0;
    const unreadLabel = unreadTotal > 9 ? '9+' : String(unreadTotal);

    return (
        <nav className={styles.bottomNav}>
            {TABS.map(({ href, label, Icon }) => {
                const active = pathname === href;
                return (
                    <Link
                        key={href}
                        href={href}
                        className={`${styles.navItem} ${active ? styles.active : ''}`}
                        aria-current={active ? 'page' : undefined}
                    >
                        <span className={styles.iconWrap}>
                            <Icon size={21} strokeWidth={active ? 2.4 : 2} />
                            {href === '/inbox' && showBadge && (
                                <span className={styles.badge}>{unreadLabel}</span>
                            )}
                        </span>
                        <span className={styles.label}>{label}</span>
                    </Link>
                );
            })}
        </nav>
    );
}
```

- [ ] **Step 4: CSS'i yaz**

`src/components/layout/BottomNavbar.module.css` — FAB sınıflarını (`.fabContainer`, `.fabItem`, `.fabActive`, `.fabText`) **sil**. Tasarım değerleri:

```css
.bottomNav {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: var(--z-bottomnav);
    display: flex;
    height: calc(74px + 22px + var(--safe-bottom));
    padding: 9px 0 calc(22px + var(--safe-bottom));
    background: rgba(255, 255, 255, .72);
    border-top: 1px solid rgba(255, 255, 255, .9);
    backdrop-filter: blur(30px) saturate(190%);
    -webkit-backdrop-filter: blur(30px) saturate(190%);
    box-shadow: var(--m-sh-bottombar);
}

.navItem {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    text-decoration: none;
    color: var(--m-body);
}

.iconWrap {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 46px;
    height: 28px;
    border-radius: var(--m-r-chip);
    transition: background .22s cubic-bezier(.34, 1.56, .64, 1);
}

.active .iconWrap {
    background: linear-gradient(135deg, rgba(59, 139, 255, .18), rgba(34, 211, 238, .22));
}

.active {
    color: #1f6feb;
}

.label {
    font-size: 9.8px;
    font-weight: 600;
    letter-spacing: -.1px;
}

.active .label {
    font-weight: 800;
}

.badge {
    position: absolute;
    top: -3px;
    right: 4px;
    min-width: 16px;
    height: 16px;
    padding: 0 3px;
    border-radius: 8px;
    border: 2px solid #fff;
    background: linear-gradient(135deg, #ff6b6f, #ff2d55);
    color: #fff;
    font-family: var(--m-mono);
    font-variant-numeric: tabular-nums;
    font-size: 9px;
    font-weight: 800;
    line-height: 12px;
    text-align: center;
}

/* Alt cubuk yalnizca mobilde. Masaustunde global Navbar kullanilir. */
@media (min-width: 769px) {
    .bottomNav {
        display: none;
    }
}

@media (prefers-reduced-motion: reduce) {
    .iconWrap {
        transition: none;
    }
}
```

- [ ] **Step 5: Testlerin geçtiğini doğrula**

Run: `npx jest src/components/layout/BottomNavbar --no-coverage --roots "<rootDir>/src"`
Expected: PASS (9 test)

- [ ] **Step 6: Tam paket + eski FAB referansı kalmadığını doğrula**

```bash
npx tsc --noEmit
npx jest --no-coverage --roots "<rootDir>/src"
grep -rn "fabContainer\|fabItem\|fabActive\|fabText" src/ || echo "FAB referansi kalmadi"
```

Expected: tsc 0; jest hepsi geçer; grep boş.

- [ ] **Step 7: Commit**

```bash
git add src/components/layout/BottomNavbar.tsx src/components/layout/BottomNavbar.module.css src/components/layout/BottomNavbar.test.tsx
git commit -m "feat(mobil): 5 duz sekmeli alt navigasyon, FAB kaldirildi"
```

---

### Task 4: `MobileScreen` layout kabı

**Files:**
- Create: `src/components/mobile/MobileScreen.tsx`
- Create: `src/components/mobile/MobileScreen.module.css`
- Test: `src/components/mobile/__tests__/MobileScreen.test.tsx`

**Interfaces:**
- Consumes: —
- Produces: `MobileScreen({ children, hasBottomNav = true, hasStickyCta = false, mesh = true, className })`

**Neden var:** tasarım handoff'u içerik alanının alt çubuğun altında kalmaması gerektiğini söylüyor ve "prototipte bu hata üç kez tekrarlandı; üretimde tek bir layout bileşeninde çözülmesi önerilir" diyor. Bu bileşen o tek yerdir; sayfalar dolguyu elle tekrarlamaz.

- [ ] **Step 1: Başarısız testi yaz**

`src/components/mobile/__tests__/MobileScreen.test.tsx`:

```tsx
/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react'
import { MobileScreen } from '../MobileScreen'

describe('MobileScreen', () => {
    it('cocuklari render eder', () => {
        render(<MobileScreen><p>icerik</p></MobileScreen>)
        expect(screen.getByText('icerik')).toBeInTheDocument()
    })

    it('varsayilan olarak alt navigasyon dolgusu uygular', () => {
        const { container } = render(<MobileScreen>x</MobileScreen>)
        const el = container.firstElementChild as HTMLElement
        expect(el.dataset.bottomnav).toBe('true')
        expect(el.dataset.cta).toBe('false')
    })

    it('sticky CTA varsa ek dolgu isaretlenir', () => {
        const { container } = render(<MobileScreen hasStickyCta>x</MobileScreen>)
        expect((container.firstElementChild as HTMLElement).dataset.cta).toBe('true')
    })

    it('alt navigasyon olmayan ekranlarda dolgu istenmez', () => {
        const { container } = render(<MobileScreen hasBottomNav={false}>x</MobileScreen>)
        expect((container.firstElementChild as HTMLElement).dataset.bottomnav).toBe('false')
    })

    it('mesh zemin varsayilan acik, kapatilabilir', () => {
        const { container: on } = render(<MobileScreen>x</MobileScreen>)
        expect((on.firstElementChild as HTMLElement).dataset.mesh).toBe('true')
        const { container: off } = render(<MobileScreen mesh={false}>x</MobileScreen>)
        expect((off.firstElementChild as HTMLElement).dataset.mesh).toBe('false')
    })

    it('disaridan gelen className korunur', () => {
        const { container } = render(<MobileScreen className="ekstra">x</MobileScreen>)
        expect((container.firstElementChild as HTMLElement).className).toContain('ekstra')
    })
})
```

- [ ] **Step 2: Testin başarısız olduğunu doğrula**

Run: `npx jest src/components/mobile/__tests__/MobileScreen --no-coverage --roots "<rootDir>/src"`
Expected: FAIL — `Cannot find module '../MobileScreen'`

- [ ] **Step 3: Bileşeni yaz**

`src/components/mobile/MobileScreen.tsx`:

```tsx
'use client'

import type { ReactNode } from 'react'
import styles from './MobileScreen.module.css'

interface Props {
    children: ReactNode
    /** Sayfada sabit alt navigasyon var mi (dolgu buna gore verilir). */
    hasBottomNav?: boolean
    /** Alt navigasyonun USTUNDE ayrica sabit bir CTA var mi. */
    hasStickyCta?: boolean
    /** Canli mesh zemin. Alt ekranlarda kapatilabilir. */
    mesh?: boolean
    className?: string
}

/**
 * Mobil ekranlarin kaydirilabilir kabi.
 *
 * Alt cubuk/CTA dolgusu TEK yerde burada cozulur. Tasarim handoff'u bu
 * hatanin prototipte uc kez tekrarlandigini soyluyor; sayfalar dolguyu elle
 * tekrarlamamali.
 */
export function MobileScreen({
    children,
    hasBottomNav = true,
    hasStickyCta = false,
    mesh = true,
    className,
}: Props) {
    return (
        <div
            className={`${styles.screen} ${className ?? ''}`.trim()}
            data-bottomnav={String(hasBottomNav)}
            data-cta={String(hasStickyCta)}
            data-mesh={String(mesh)}
        >
            {children}
        </div>
    )
}
```

`src/components/mobile/MobileScreen.module.css`:

```css
/* Bu kap YALNIZCA mobilde is yapar; masaustunde saydam bir sarmalayicidir. */
@media (max-width: 768px) {
    .screen {
        position: relative;
        min-height: 100dvh;
        background: var(--m-bg);
        color: var(--m-ink);
        padding-top: var(--safe-top);
    }

    .screen[data-mesh='true']::before {
        content: '';
        position: fixed;
        inset: 0;
        background: var(--m-mesh);
        pointer-events: none;
        z-index: 0;
    }

    /* Icerik mesh'in ustunde kalmali. */
    .screen > * {
        position: relative;
        z-index: 1;
    }

    /* 74px cubuk + 22px home indicator + guvenli alan. */
    .screen[data-bottomnav='true'] {
        padding-bottom: calc(74px + 22px + var(--safe-bottom));
    }

    /* Sabit CTA varsa onun yuksekligi de eklenir. */
    .screen[data-bottomnav='true'][data-cta='true'] {
        padding-bottom: calc(74px + 22px + 72px + var(--safe-bottom));
    }

    .screen[data-bottomnav='false'][data-cta='true'] {
        padding-bottom: calc(72px + var(--safe-bottom));
    }
}
```

- [ ] **Step 4: Testlerin geçtiğini doğrula**

Run: `npx jest src/components/mobile/__tests__/MobileScreen --no-coverage --roots "<rootDir>/src"`
Expected: PASS (6 test)

- [ ] **Step 5: Kapsam guard testi ekle**

`src/components/mobile/__tests__/MobileScreen.test.tsx` dosyasının sonuna ekle:

```tsx
import { readFileSync } from 'fs'
import { join } from 'path'

it('TUM kurallar mobil media query icinde (masaustu duzeni degismemeli)', () => {
    const css = readFileSync(
        join(process.cwd(), 'src/components/mobile/MobileScreen.module.css'), 'utf8',
    )
    const outside = css.replace(/@media \(max-width: 768px\)\s*\{[\s\S]*\n\}/, '')
    expect(outside.replace(/\/\*[\s\S]*?\*\//g, '').trim()).toBe('')
})
```

Run: `npx jest src/components/mobile/__tests__/MobileScreen --no-coverage --roots "<rootDir>/src"`
Expected: PASS (7 test)

- [ ] **Step 6: Commit**

```bash
git add src/components/mobile/MobileScreen.tsx src/components/mobile/MobileScreen.module.css src/components/mobile/__tests__/MobileScreen.test.tsx
git commit -m "feat(mobil): MobileScreen kabi - alt cubuk dolgusu tek yerde"
```

---

### Task 5: `isResultsRevealed` kaldırılması

**Files:**
- Modify: `src/app/hesapla/page.tsx` (state tanımı + 3 kullanım)
- Modify: `src/app/hesapla/page.module.css` (4 `data-revealed` kuralı)
- Modify: `src/app/hesapla/pageStyles.scope.test.ts` (4 test)

**Interfaces:**
- Consumes: —
- Produces: `/hesapla` mobilde sonuç her zaman görünür; `data-revealed` attribute'u ve `isResultsRevealed` state'i artık yok.

**Bağlam:** bu, 2026-07-06'da kullanıcının açık talebiyle yapılmış "İki Fazlı Görünürlük" tasarımının geri alınmasıdır. Karar gerekçesiyle sunuldu ve **insan tarafından onaylandı** (spec §2a). Masaüstü davranışı değişmez — orada sonuç zaten koşulsuz gösteriliyordu.

- [ ] **Step 1: Mevcut testleri güncelle (kırmızıya çevir)**

`src/app/hesapla/pageStyles.scope.test.ts` içinde `data-revealed` geçen **dört testi sil** ve yerlerine şunu koy:

```ts
    it('data-revealed gate i tamamen kaldirilmis olmali', () => {
        // Iki fazli gorunurluk kaldirildi (spec 2026-07-28 §2a): sonuc mobilde
        // her zaman gorunur ve canli. Geriye kalan bir data-revealed kurali
        // sonucu sessizce gizlerdi.
        expect(css).not.toMatch(/data-revealed/)
    })
```

- [ ] **Step 2: Testin başarısız olduğunu doğrula**

Run: `npx jest src/app/hesapla/pageStyles --no-coverage --roots "<rootDir>/src"`
Expected: FAIL — CSS'te hâlâ `data-revealed` var.

- [ ] **Step 3: CSS'ten gate'i kaldır**

`src/app/hesapla/page.module.css` içinde `data-revealed` geçen dört kuralı sil. `.mainPanelResults`, `.summaryPanel`, `.mainPanel` artık mobilde koşulsuz görünür; `.mobileActionsSlot` koşulsuz `display: contents` olur. Sonuç ile ilgili açıklama yorumunu da güncelle.

- [ ] **Step 4: JSX'ten state'i kaldır**

`src/app/hesapla/page.tsx`:
- `const [isResultsRevealed, setIsResultsRevealed] = useState(false);` satırını sil.
- `data-revealed={isResultsRevealed}` attribute'unu kapsayıcıdan sil.
- `{isResultsRevealed && ( ... )}` şeklindeki iki mobil dalın koşulunu kaldır, içeriği koşulsuz render et.
- "Sonuçları Göster" butonunu ve varsa ona ait CSS sınıflarını sil.

- [ ] **Step 5: Testlerin geçtiğini doğrula**

```bash
npx jest src/app/hesapla --no-coverage --roots "<rootDir>/src"
npx tsc --noEmit
grep -rn "isResultsRevealed\|data-revealed" src/ || echo "kalinti yok"
```

Expected: hesapla testleri geçer; tsc 0; grep boş.

- [ ] **Step 6: Tam paket**

Run: `npx jest --no-coverage --roots "<rootDir>/src"`
Expected: tüm testler geçer.

- [ ] **Step 7: Commit**

```bash
git add src/app/hesapla/page.tsx src/app/hesapla/page.module.css src/app/hesapla/pageStyles.scope.test.ts
git commit -m "refactor(hesapla): iki fazli gorunurluk kaldirildi, sonuc her zaman canli"
```

---

### Task 6: Mobil kabuk + sonuç kartı (`2a` üst)

**Files:**
- Create: `src/app/hesapla/mobile/HesaplaMobile.tsx`
- Create: `src/app/hesapla/mobile/SonucKarti.tsx`
- Create: `src/app/hesapla/mobile/mobile.module.css`
- Test: `src/app/hesapla/mobile/SonucKarti.test.tsx`
- Modify: `src/app/hesapla/page.tsx` (mobil dalı `<HesaplaMobile>`e devreder)

**Interfaces:**
- Consumes: `MobileScreen` (Task 4), `IconPin`/`IconSettings`/`IconChevronRight`/`IconCheckCircle` (Task 2), `--m-*` token'ları (Task 1)
- Produces:
  ```ts
  export type SonucKartiProps = {
      minDaireFiyati: number | null
      arsaPayiYuzde: number
      birimFiyat: number | null
      skor: number | null
      piyasaFarkiYuzde: number | null   // null → rozet RENDER EDILMEZ
      onFisAc: () => void
  }
  ```

**Tasarım kaynağı:** `docs/tasarim/mobil-2026-07-28/kartlar/2a.html` — degrade kart bloğu. Kesin değerler oradan alınır.

- [ ] **Step 1: Başarısız testi yaz**

`src/app/hesapla/mobile/SonucKarti.test.tsx`:

```tsx
/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SonucKarti } from './SonucKarti'

const BASE = {
    minDaireFiyati: 8964000,
    arsaPayiYuzde: 33,
    birimFiyat: 64028,
    skor: 78,
    piyasaFarkiYuzde: -14,
    onFisAc: jest.fn(),
}

describe('SonucKarti', () => {
    it('min daire fiyatini Turkce bicimde gosterir', () => {
        render(<SonucKarti {...BASE} />)
        expect(screen.getByText('8.964.000')).toBeInTheDocument()
    })

    it('arsa payi, birim fiyat ve skoru gosterir', () => {
        render(<SonucKarti {...BASE} />)
        expect(screen.getByText('%33')).toBeInTheDocument()
        expect(screen.getByText('64.028')).toBeInTheDocument()
        expect(screen.getByText('78')).toBeInTheDocument()
    })

    it('piyasadan ucuzsa yesil rozet gosterir', () => {
        render(<SonucKarti {...BASE} />)
        expect(screen.getByText(/%14 UCUZ/)).toBeInTheDocument()
    })

    it('piyasadan pahaliysa rozet yon degistirir', () => {
        render(<SonucKarti {...BASE} piyasaFarkiYuzde={9} />)
        expect(screen.getByText(/%9 PAHALI/)).toBeInTheDocument()
    })

    it('piyasa farki yoksa rozet HIC render edilmez', () => {
        // Mevcut SealBadge `show` kosuluyla ayni: piyasa fiyati bos ise
        // karsilastirma iddiasi edilmez.
        render(<SonucKarti {...BASE} piyasaFarkiYuzde={null} />)
        expect(screen.queryByText(/UCUZ|PAHALI/)).toBeNull()
    })

    it('sonuc yoksa rakam yerine tire basar, sifir DEGIL', () => {
        render(<SonucKarti {...BASE} minDaireFiyati={null} birimFiyat={null} skor={null} />)
        expect(screen.queryByText('0')).toBeNull()
        expect(screen.getAllByText('—').length).toBeGreaterThan(0)
    })

    it('fis butonu onFisAc i cagirir', async () => {
        const onFisAc = jest.fn()
        render(<SonucKarti {...BASE} onFisAc={onFisAc} />)
        await userEvent.click(screen.getByRole('button', { name: /Hesap fişi/ }))
        expect(onFisAc).toHaveBeenCalledTimes(1)
    })
})
```

- [ ] **Step 2: Testin başarısız olduğunu doğrula**

Run: `npx jest src/app/hesapla/mobile --no-coverage --roots "<rootDir>/src"`
Expected: FAIL — `Cannot find module './SonucKarti'`

- [ ] **Step 3: `SonucKarti` bileşenini yaz**

`src/app/hesapla/mobile/SonucKarti.tsx`. Değerleri `2a.html`'deki degrade kart bloğundan al: kap `border-radius:26px`, `padding:13px 14px 11px`, `background: var(--m-grad-accent)`, `box-shadow: var(--m-sh-grad-card), inset 0 1px 0 rgba(255,255,255,.45)`, `overflow:hidden`; dekoratif ışık `top:-60px; right:-30px; width/height:180px; border-radius:50%; background: radial-gradient(circle,rgba(255,255,255,.34),transparent 66%)`; etiket Inter 700 10.5px `letter-spacing:.8px` `rgba(255,255,255,.82)`; rakam mono 800 31px `text-shadow:0 2px 10px rgba(9,50,110,.28)`; üç metrik kutusu `rgba(255,255,255,.20)` + `1px solid rgba(255,255,255,.38)` radius 16, üçüncüsü beyaz `rgba(255,255,255,.94)` + `#0a8a63`.

Biçimlendirme kuralı: `new Intl.NumberFormat('tr-TR').format(n)`; `null` → `'—'`.

- [ ] **Step 4: `HesaplaMobile` kabuğunu yaz**

`src/app/hesapla/mobile/HesaplaMobile.tsx` — **state sahiplenmez**, `page.tsx`'ten prop alır. Bu turda yalnızca başlık satırı + `SonucKarti` render eder; girdi kartı Task 7'de eklenir.

- [ ] **Step 5: `page.tsx`'i bağla**

`src/app/hesapla/page.tsx` içinde, T2'de eklenen `isDesktopViewport` bayrağını kullanarak mobilde mevcut mobil JSX yerine `<HesaplaMobile ... />` render et. **Masaüstü JSX'ine dokunma.**

- [ ] **Step 6: Testlerin geçtiğini doğrula**

```bash
npx jest src/app/hesapla --no-coverage --roots "<rootDir>/src"
npx tsc --noEmit
```

Expected: PASS (7 yeni test); tsc 0.

- [ ] **Step 7: Commit**

```bash
git add src/app/hesapla/mobile src/app/hesapla/page.tsx
git commit -m "feat(hesapla): mobil kabuk ve degrade sonuc karti"
```

---

### Task 7: Girdi kartı (`2a` alt)

**Files:**
- Create: `src/app/hesapla/mobile/GirdiKarti.tsx`
- Test: `src/app/hesapla/mobile/GirdiKarti.test.tsx`
- Modify: `src/app/hesapla/mobile/HesaplaMobile.tsx`, `src/app/hesapla/mobile/mobile.module.css`

**Interfaces:**
- Consumes: `--m-*` token'ları
- Produces:
  ```ts
  export type GirdiKartiProps = {
      luxLevel: number
      onLuxLevel: (v: number) => void
      apartmentSize: number
      onApartmentSize: (v: number) => void
      landShareRatio: number
      onLandShareRatio: (v: number) => void
      isApartmentCountEnabled: boolean
      onApartmentCountEnabled: (v: boolean) => void
      totalApartments: number
      onTotalApartments: (v: number) => void
      ownerApartmentShare: number
      onOwnerApartmentShare: (v: number) => void
  }
  ```

**KRİTİK — korunacak davranış:** `isApartmentCountEnabled` açıkken yüzde **salt-okunur** olur ve `ownerApartmentShare` (0..`totalApartments`) tek gerçek kaynak olur. Bu, 2026-07-24'te kapatılan gerçek bir bug'ın (arsa payının sessizce 8/N'de donması) çözümüdür; tasarım bunu bozmaz. Mevcut saf yardımcılar `src/app/hesapla/calculatorUiHelpers.ts` (`computeEffectiveLandShareX`, `clampOwnerApartmentShare`) **yeniden kullanılır**, kopyalanmaz.

- [ ] **Step 1: Başarısız testi yaz**

`src/app/hesapla/mobile/GirdiKarti.test.tsx`:

```tsx
/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { GirdiKarti } from './GirdiKarti'

function props(patch: Partial<React.ComponentProps<typeof GirdiKarti>> = {}) {
    return {
        luxLevel: 1.2, onLuxLevel: jest.fn(),
        apartmentSize: 140, onApartmentSize: jest.fn(),
        landShareRatio: 33, onLandShareRatio: jest.fn(),
        isApartmentCountEnabled: false, onApartmentCountEnabled: jest.fn(),
        totalApartments: 20, onTotalApartments: jest.fn(),
        ownerApartmentShare: 6, onOwnerApartmentShare: jest.fn(),
        ...patch,
    }
}

describe('GirdiKarti', () => {
    it('yapi standardi uc segment sunar ve secili olani isaretler', () => {
        render(<GirdiKarti {...props()} />)
        const tabs = screen.getAllByRole('tab')
        expect(tabs.map(t => t.textContent)).toEqual(['Standart', 'Orta', 'Lüks'])
        expect(screen.getByRole('tab', { name: 'Orta' })).toHaveAttribute('aria-selected', 'true')
    })

    it('segment tiklaninca luxLevel degeri bildirilir', async () => {
        const onLuxLevel = jest.fn()
        render(<GirdiKarti {...props({ onLuxLevel })} />)
        await userEvent.click(screen.getByRole('tab', { name: 'Lüks' }))
        expect(onLuxLevel).toHaveBeenCalledWith(1.4)
    })

    it('metrekare artir/azalt 5 adimla calisir', async () => {
        const onApartmentSize = jest.fn()
        render(<GirdiKarti {...props({ onApartmentSize })} />)
        await userEvent.click(screen.getByRole('button', { name: 'Metrekareyi artır' }))
        expect(onApartmentSize).toHaveBeenCalledWith(145)
        await userEvent.click(screen.getByRole('button', { name: 'Metrekareyi azalt' }))
        expect(onApartmentSize).toHaveBeenCalledWith(135)
    })

    it('metrekare minimum 50 nin altina inmez', async () => {
        const onApartmentSize = jest.fn()
        render(<GirdiKarti {...props({ apartmentSize: 50, onApartmentSize })} />)
        await userEvent.click(screen.getByRole('button', { name: 'Metrekareyi azalt' }))
        expect(onApartmentSize).not.toHaveBeenCalled()
    })

    it('arsa payi slider i erisilebilir', () => {
        render(<GirdiKarti {...props()} />)
        const slider = screen.getByRole('slider', { name: /Arsa payı/ })
        expect(slider).toHaveAttribute('aria-valuenow', '33')
    })

    it('daire sayisi modu ACIKKEN yuzde salt-okunur olur', () => {
        render(<GirdiKarti {...props({ isApartmentCountEnabled: true })} />)
        // ownerApartmentShare tek gercek kaynak; yuzde slider i duzenlenemez.
        expect(screen.queryByRole('slider', { name: /Arsa payı/ })).toBeNull()
        expect(screen.getByRole('slider', { name: /Arsa sahibinin daire sayısı/ }))
            .toHaveAttribute('aria-valuenow', '6')
    })

    it('daire sayisi slider i 0..totalApartments araliginda', () => {
        render(<GirdiKarti {...props({ isApartmentCountEnabled: true, totalApartments: 20 })} />)
        const s = screen.getByRole('slider', { name: /Arsa sahibinin daire sayısı/ })
        expect(s).toHaveAttribute('aria-valuemin', '0')
        expect(s).toHaveAttribute('aria-valuemax', '20')
    })
})
```

- [ ] **Step 2: Testin başarısız olduğunu doğrula**

Run: `npx jest src/app/hesapla/mobile/GirdiKarti --no-coverage --roots "<rootDir>/src"`
Expected: FAIL — `Cannot find module './GirdiKarti'`

- [ ] **Step 3: Bileşeni yaz**

`src/app/hesapla/mobile/GirdiKarti.tsx`. Değerler `2a.html`'deki cam girdi kartından: kap `rgba(255,255,255,.62)` + `1px solid rgba(255,255,255,.9)` + `blur(30px) saturate(190%)` radius 26 padding 13 gap 9; segment kapsayıcı `rgba(11,32,54,.05)` radius 17 padding 4, aktif segment `var(--m-grad-btn)` + `0 6px 16px rgba(43,124,255,.38)`; metrekare satırı 44px, `−` beyaz cam 38×38 radius 13, `+` degrade 38×38; slider track 8px radius 6 `rgba(11,32,54,.08)`, dolgu `linear-gradient(90deg,#1f6feb,#22d3ee)`, thumb 26px beyaz + `inset 0 0 0 3px #2b7cff`.

Segment `role="tablist"`, her segment `role="tab"` + `aria-selected`. Slider `role="slider"` + `aria-valuenow/min/max` + `aria-label`.

- [ ] **Step 4: `HesaplaMobile`'a bağla**

`GirdiKarti`'yi `SonucKarti`'nın altına yerleştir; prop'ları `page.tsx`'ten gelen state'e bağla.

- [ ] **Step 5: Testlerin geçtiğini doğrula**

```bash
npx jest src/app/hesapla --no-coverage --roots "<rootDir>/src"
npx tsc --noEmit
```

Expected: PASS (7 yeni test); tsc 0.

- [ ] **Step 6: Commit**

```bash
git add src/app/hesapla/mobile
git commit -m "feat(hesapla): mobil girdi karti - segment, metrekare, arsa payi"
```

---

### Task 8: `4a` "Bu fiyat nereden geliyor?"

**Files:**
- Create: `src/app/hesapla/mobile/FiyatAciklamasi.tsx`
- Test: `src/app/hesapla/mobile/FiyatAciklamasi.test.tsx`
- Modify: `src/app/hesapla/mobile/HesaplaMobile.tsx`

**Interfaces:**
- Consumes: `CalculationOutput` (`src/lib/calculator/engine_v2.ts` — **değiştirilmez**), mevcut `HesapFisi` bileşeni
- Produces:
  ```ts
  export type FiyatAciklamasiProps = {
      result: CalculationOutput
      apartmentSize: number
      unitPrice: number
      landSharePercent: number
      profitLabel: string          // "Orta"
      profitMultiplier: number     // 1.30
      onKapat: () => void
      onKarDegistir: () => void    // 4f yapragini kar bolumunde acar
  }
  ```

**Kaynak eşlemesi (README'den, motor değişmez):**

| Satır | Kaynak |
|---|---|
| "Daireyi inşa etmek" | `result.Mi` |
| "Arsa sahibinin payı" | `result.Ma` |
| "Müteahhidin kazancı" | `result.FD_total - result.M` |
| "Toplam · satış fiyatı" | `result.FD_total` |

- [ ] **Step 1: Başarısız testi yaz**

`src/app/hesapla/mobile/FiyatAciklamasi.test.tsx`:

```tsx
/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FiyatAciklamasi } from './FiyatAciklamasi'
import type { CalculationOutput } from '@/lib/calculator/engine_v2'

const RESULT = {
    Mi: 1680000, Ma: 4216000, M: 5896000, FD_total: 8964000,
} as unknown as CalculationOutput

function props(patch = {}) {
    return {
        result: RESULT, apartmentSize: 140, unitPrice: 12000,
        landSharePercent: 33, profitLabel: 'Orta', profitMultiplier: 1.3,
        onKapat: jest.fn(), onKarDegistir: jest.fn(), ...patch,
    }
}

describe('FiyatAciklamasi', () => {
    it('uc satiri motor alanlarindan turetir', () => {
        render(<FiyatAciklamasi {...props()} />)
        expect(screen.getByText('1.680.000')).toBeInTheDocument()   // Mi
        expect(screen.getByText('4.216.000')).toBeInTheDocument()   // Ma
        expect(screen.getByText('3.068.000')).toBeInTheDocument()   // FD_total - M
        expect(screen.getByText('8.964.000')).toBeInTheDocument()   // FD_total
    })

    it('insaat satirinda metrekare ve birim fiyati aciklar', () => {
        render(<FiyatAciklamasi {...props()} />)
        expect(screen.getByText(/140 m² × 12\.000 TL\/m²/)).toBeInTheDocument()
    })

    it('arsa payi satirinda anlasilan yuzdeyi soyler', () => {
        render(<FiyatAciklamasi {...props()} />)
        expect(screen.getByText(/%33/)).toBeInTheDocument()
    })

    it('kar satirinda seviye ve carpan yazili', () => {
        render(<FiyatAciklamasi {...props()} />)
        expect(screen.getByText(/‘Orta’ kazanç seviyesi · maliyetin 1,30 katı/)).toBeInTheDocument()
    })

    it('muhendis gorunumu VARSAYILAN KAPALI', () => {
        render(<FiyatAciklamasi {...props()} />)
        expect(screen.getByRole('switch', { name: /Mühendis görünümü/ }))
            .toHaveAttribute('aria-checked', 'false')
    })

    it('muhendis gorunumu acilinca sembolik gosterim gelir ve tercih saklanir', async () => {
        render(<FiyatAciklamasi {...props()} />)
        await userEvent.click(screen.getByRole('switch', { name: /Mühendis görünümü/ }))
        expect(screen.getByRole('switch', { name: /Mühendis görünümü/ }))
            .toHaveAttribute('aria-checked', 'true')
        expect(localStorage.getItem('arsabil-engineer-view')).toBe('true')
    })

    it('kar satirindaki degistir baglantisi onKarDegistir i cagirir', async () => {
        const onKarDegistir = jest.fn()
        render(<FiyatAciklamasi {...props({ onKarDegistir })} />)
        await userEvent.click(screen.getByRole('button', { name: /değiştir/ }))
        expect(onKarDegistir).toHaveBeenCalledTimes(1)
    })
})
```

- [ ] **Step 2: Testin başarısız olduğunu doğrula**

Run: `npx jest src/app/hesapla/mobile/FiyatAciklamasi --no-coverage --roots "<rootDir>/src"`
Expected: FAIL — `Cannot find module './FiyatAciklamasi'`

- [ ] **Step 3: Bileşeni yaz**

Değerler `docs/tasarim/mobil-2026-07-28/kartlar/4a.html`'den: üstte degrade kart + 12px yüksek oran çubuğu (üç segment, aralarında `1px rgba(6,44,99,.25)` ayırıcı); her satır 38×38 degrade ikon kutusu (mavi/camgöbeği/yeşil), başlık Inter 800 13px, sağda mono 800 13.5px.

`localStorage` anahtarı: `arsabil-engineer-view`. Açıkken mevcut `HesapFisi` bileşeni render edilir — **kopyalanmaz**.

- [ ] **Step 4: `HesaplaMobile`'a bağla**

`SonucKarti`'nın "Hesap fişi" butonu bu görünümü açar.

- [ ] **Step 5: Testlerin geçtiğini doğrula**

```bash
npx jest src/app/hesapla --no-coverage --roots "<rootDir>/src"
npx tsc --noEmit
```

Expected: PASS (7 yeni test); tsc 0.

- [ ] **Step 6: Commit**

```bash
git add src/app/hesapla/mobile
git commit -m "feat(hesapla): 'Bu fiyat nereden geliyor?' ekrani + muhendis gorunumu"
```

---

### Task 9: `4f` Gelişmiş ayarlar yaprağı

**Files:**
- Create: `src/app/hesapla/mobile/GelismisAyarlarSheet.tsx`
- Test: `src/app/hesapla/mobile/GelismisAyarlarSheet.test.tsx`
- Modify: `src/app/hesapla/mobile/HesaplaMobile.tsx`, `src/app/hesapla/page.tsx`

**Interfaces:**
- Consumes: mevcut `BottomSheet` primitifi (`src/components/mobile/BottomSheet.tsx` — `aria-modal`, `--z-sheet`, odak yönetimi zaten var), `RiskSuggestionCard` ve `ParcelPicker` (T2)
- Produces: `GelismisAyarlarSheet({ open, onClose, acilisBolumu?: 'kar' | 'risk' | 'iksa' | 'piyasa', ...state prop'lari })`

**Bu task ayrıca T2'nin açık kalemini kapatır:** `RiskSuggestionCard` + `ParcelPicker` masaüstü-only idi (`isDesktopViewport`). Artık mobilde bu yaprağın "Risk payı" bölümünde yer alır — spec §6.1.

- [ ] **Step 1: Başarısız testi yaz**

`src/app/hesapla/mobile/GelismisAyarlarSheet.test.tsx`:

```tsx
/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { GelismisAyarlarSheet } from './GelismisAyarlarSheet'

function props(patch = {}) {
    return {
        open: true, onClose: jest.fn(), onUygula: jest.fn(), onSifirla: jest.fn(),
        builderProfit: 1.3, onBuilderProfit: jest.fn(),
        riskLevel: 10, onRiskLevel: jest.fn(),
        iksaMode: 'none' as const, onIksaMode: jest.fn(),
        manualMarketPrice: '', onManualMarketPrice: jest.fn(),
        isAaEnabled: false, onAaEnabled: jest.fn(),
        ...patch,
    }
}

describe('GelismisAyarlarSheet', () => {
    it('kapaliyken hicbir sey render etmez', () => {
        render(<GelismisAyarlarSheet {...props({ open: false })} />)
        expect(screen.queryByRole('dialog')).toBeNull()
    })

    it('acikken dialog ve dort bolum gosterir', () => {
        render(<GelismisAyarlarSheet {...props()} />)
        expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true')
        expect(screen.getByText('Müteahhit kazancı')).toBeInTheDocument()
        expect(screen.getByText('Risk payı')).toBeInTheDocument()
        expect(screen.getByText(/İksa/)).toBeInTheDocument()
        expect(screen.getByText('Piyasa fiyatı')).toBeInTheDocument()
    })

    it('kar segmenti uc secenek sunar ve degeri bildirir', async () => {
        const onBuilderProfit = jest.fn()
        render(<GelismisAyarlarSheet {...props({ onBuilderProfit })} />)
        await userEvent.click(screen.getByRole('tab', { name: /Yüksek/ }))
        expect(onBuilderProfit).toHaveBeenCalledWith(1.5)
    })

    it('risk segmenti dort secenek sunar', async () => {
        const onRiskLevel = jest.fn()
        render(<GelismisAyarlarSheet {...props({ onRiskLevel })} />)
        await userEvent.click(screen.getByRole('tab', { name: '%15' }))
        expect(onRiskLevel).toHaveBeenCalledWith(15)
    })

    it('iksa bilmeyene yardim metni gosterir', () => {
        render(<GelismisAyarlarSheet {...props()} />)
        expect(screen.getByText(/Bilmiyorsan ‘Yok’ bırak/)).toBeInTheDocument()
    })

    it('acilisBolumu kar ise kar bolumune odaklanir', () => {
        render(<GelismisAyarlarSheet {...props({ acilisBolumu: 'kar' })} />)
        expect(screen.getByRole('group', { name: 'Müteahhit kazancı' }))
            .toHaveAttribute('data-acilis', 'true')
    })

    it('Uygula ve Sifirla butonlari calisir', async () => {
        const onUygula = jest.fn(); const onSifirla = jest.fn()
        render(<GelismisAyarlarSheet {...props({ onUygula, onSifirla })} />)
        await userEvent.click(screen.getByRole('button', { name: 'Sıfırla' }))
        expect(onSifirla).toHaveBeenCalledTimes(1)
        await userEvent.click(screen.getByRole('button', { name: 'Uygula' }))
        expect(onUygula).toHaveBeenCalledTimes(1)
    })
})
```

- [ ] **Step 2: Testin başarısız olduğunu doğrula**

Run: `npx jest src/app/hesapla/mobile/GelismisAyarlar --no-coverage --roots "<rootDir>/src"`
Expected: FAIL — `Cannot find module './GelismisAyarlarSheet'`

- [ ] **Step 3: Bileşeni yaz**

Mevcut `BottomSheet` primitifini kullan. Değerler `4f.html`'den: yükseklik ~640px, `border-radius: 30px 30px 0 0`, `rgba(255,255,255,.82)` + `blur(34px) saturate(195%)`, arka plan `rgba(11,32,54,.34)` + `blur(3px)`, üstte 42×5 tutamaç.

İçerik mevcut `FormulParamsFields` / `RiskCostFields` / `MarketField` bileşenlerinden gelir — mantık **kopyalanmaz**, yeniden kullanılır. Risk bölümüne T2'nin `RiskSuggestionCard`'ı ve `ParcelPicker`'ı yerleştirilir.

- [ ] **Step 4: `HesaplaMobile` ve `page.tsx`'i bağla**

"Gelişmiş ayarlar · risk, iksa, kâr" butonu yaprağı açar. `FiyatAciklamasi`'ndaki "· değiştir" bağlantısı `acilisBolumu="kar"` ile açar. `page.tsx`'te `isDesktopViewport` koşulu artık `ParcelPicker`'ı mobilde de render etmeli (yaprak içinden).

- [ ] **Step 5: Testlerin geçtiğini doğrula**

```bash
npx jest src/app/hesapla --no-coverage --roots "<rootDir>/src"
npx tsc --noEmit
```

Expected: PASS (7 yeni test); tsc 0.

- [ ] **Step 6: Commit**

```bash
git add src/app/hesapla/mobile src/app/hesapla/page.tsx
git commit -m "feat(hesapla): gelismis ayarlar yapragi + risk onerisi mobile tasindi"
```

---

### Task 10: `4n` Analiz sekmesi

**Files:**
- Modify: `src/app/hesapla/mobile/HesaplaMobile.tsx`
- Modify: `src/app/hesapla/mobile/mobile.module.css`
- Test: `src/app/hesapla/mobile/Analiz.test.tsx`

**Interfaces:**
- Consumes: mevcut `src/components/charts/*`, `SegmentedTabs` primitifi
- Produces: `HesaplaMobile` içinde "Hesap" / "Analiz" sekmesi

**Regresyon kontrolü:** grafikler `globalUnitPrice` kullanmalı; sabit `P: 10000` kalmamalı. Bu 2026-07-24'te düzeltildi, test bunu sabitler.

- [ ] **Step 1: Başarısız testi yaz**

`src/app/hesapla/mobile/Analiz.test.tsx`:

```tsx
/** @jest-environment jsdom */
import { readFileSync } from 'fs'
import { join } from 'path'

describe('analiz grafikleri', () => {
    it('sabit P: 10000 kalintisi YOK', () => {
        // 2026-07-24'te duzeltilen gercek bir bug: SensitivityChart ve
        // BreakEvenChart sabit P:10000 kullanip gercek globalUnitPrice ile
        // tutarsiz sonuc gosteriyordu.
        const dir = join(process.cwd(), 'src/components/charts')
        const { readdirSync } = require('fs') as typeof import('fs')
        const files = readdirSync(dir).filter(f => f.endsWith('.tsx'))
        expect(files.length).toBeGreaterThan(0)
        for (const f of files) {
            const src = readFileSync(join(dir, f), 'utf8')
            expect(src).not.toMatch(/P:\s*10000/)
        }
    })
})
```

- [ ] **Step 2: Testi koştur**

Run: `npx jest src/app/hesapla/mobile/Analiz --no-coverage --roots "<rootDir>/src"`
Expected: PASS — bu bir regresyon çitidir, hâlihazırda yeşil olmalı. **Kırmızıysa** düzeltme geri gelmiş demektir; önce onu düzelt.

- [ ] **Step 3: Sekmeyi ekle**

`HesaplaMobile`'a `SegmentedTabs` ile "Hesap" / "Analiz" sekmesi ekle. Analiz sekmesi mevcut grafik bileşenlerini cam kart içinde render eder; değerler `4n.html`'den.

- [ ] **Step 4: Doğrula ve commit**

```bash
npx tsc --noEmit && npx jest --no-coverage --roots "<rootDir>/src"
git add src/app/hesapla/mobile
git commit -m "feat(hesapla): mobil analiz sekmesi"
```

---

### Task 11: Final doğrulama

**Files:** yok (yalnızca doğrulama; bulgu çıkarsa düzeltme commit'i)

- [ ] **Step 1: Tam komut paketi**

```bash
npx tsc --noEmit
npx jest --no-coverage --roots "<rootDir>/src"
npx eslint src
npm run build
```

Beklenen: tsc 0; tüm testler geçer; eslint'te **bu plandan kaynaklanan YENİ ihlal yok** (baseline 12 problem — 2 hata/10 uyarı; `git stash -u` ile önce/sonra karşılaştır); build başarılı.

- [ ] **Step 2: Masaüstü regresyon kontrolü**

`≥769px`'te `/hesapla` düzeni değişmemeli. Playwright ile 1440×900'de aç, ekran görüntüsü al ve mevcut düzenle karşılaştır. Özellikle: sonuç kartı, `HesapOzetiSeridi`, aksiyon butonları, drawer.

- [ ] **Step 3: Mobil canlı tur (390×844)**

1. `/hesapla` açılır açılmaz **sonuç görünür** (buton yok, "Sonuçları Göster" hiçbir yerde yok).
2. Her girdi değişiminde sonuç kartı **canlı** güncelleniyor.
3. "Hesap fişi" → `4a` açılıyor; "Mühendis görünümü" kapalı geliyor, açılınca sembolik gösterim geliyor ve sayfa yenilendiğinde tercih korunuyor.
4. "Gelişmiş ayarlar" → yaprak açılıyor, `aria-modal`, tutamaçtan sürüklenerek kapanıyor, kapanışta odak açan butona dönüyor.
5. Alt navigasyon: 5 sekme, FAB yok, ortadaki "Ana sayfa", içerik alt çubuğun altında kalmıyor.
6. `/inbox/[id]` ve `/listings/new` yollarında alt çubuk gizli.

- [ ] **Step 4: Erişilebilirlik kontrolü**

Dokunma hedefleri ≥44px; slider'lar `role="slider"` + `aria-valuenow/min/max`; segmentler `role="tablist"`; `prefers-reduced-motion: reduce` altında hareket kapalı.

- [ ] **Step 5: Bulgular varsa düzelt ve commit et**

```bash
git add -- src docs
git commit -m "fix(mobil): final dogrulamada bulunan kusurlar giderildi"
```

**NOT:** `git add -A` KULLANMA — bu depoda takipsiz `hatalar/` ve ~12 MB kullanılamaz `public/images/**` PNG seti var, sessizce staging'e girer.

---

## Notlar

- **origin ölü** (`github.com/XMYRA6/arsabil.git` → "Repository not found"). Bu plan yalnızca lokal commit üretir; push denenmeyecek.
- **Worktree kullanılırsa:** merge sonrası ana checkout'ta `npm install` **ve** `npx prisma generate` — ikisi de "kod hatası" gibi görünen bayat-artefakt hatası üretir.
- **Faz 2.5 worktree'si kapatılacak** (spec §2b): `.claude/worktrees/faz2-5-muhur-kimlik` + branch `worktree-faz2-5-muhur-kimlik`. Bu plan onu silmez; ayrı bir temizlik adımıdır.
