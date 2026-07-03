# Mobil UI Faz 0 — Temel Katman + Primitifler Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mobil redesign'ın temelini kurmak: component test altyapısı, mobil temel token'ları ve 6 paylaşılan mobil primitif (`AppBar`, `DataCard`/`CardList`, `SegmentedTabs`, `StickyActionBar`, `BottomSheet`, `SwipeGallery`) + Playwright mobil smoke harness'i.

**Architecture:** Primitifler `src/components/mobile/` altında, her biri kendi CSS module'üyle, token tabanlı. Jest'e jsdom + React Testing Library eklenir (mevcut node-env testleri bozulmaz — component testleri dosya başı `@jest-environment jsdom` docblock'u kullanır). Playwright'a 390×844 viewport smoke spec'i eklenir.

**Tech Stack:** Next.js 16, React 19, TypeScript, CSS Modules, framer-motion 12 (yalnızca BottomSheet), Jest + ts-jest + RTL, Playwright.

**Spec:** `docs/superpowers/specs/2026-07-03-mobile-ui-redesign-design.md` (bu plan spec'in §3'ünü — Faz 0 — kapsar; Faz 1-4 için ayrı planlar yazılacak)

## Global Constraints

- Breakpoint: 768px ana mobil kesim, 480px küçük ekran — yeni breakpoint değeri icat edilmez.
- Dokunma hedefi min 44×44px (`--touch-target`), mobil form input yüksekliği 48px (`--input-height-mobile`).
- Form alanlarında font-size ≥16px (iOS input zoom'unu tetiklememek için).
- Yeni inline `style={{}}` yazılmaz; tüm stiller CSS module + token.
- Tüm animasyonlarda `prefers-reduced-motion` desteği (framer-motion `useReducedMotion`).
- Desktop görünümü değişmez; primitifler ≤768px'te görünür olacak şekilde tasarlanır (BottomSheet hariç — sayfa karar verir).
- Türkçe UI metinleri ve Türkçe commit mesajları (proje geleneği).
- Her task sonunda: ilgili testler yeşil + commit.

---

### Task 1: Component test altyapısı (jsdom + RTL)

**Files:**
- Modify: `jest.config.js`
- Create: `jest.setup.ts`
- Test: `src/components/mobile/__tests__/setup-sanity.test.tsx`

**Interfaces:**
- Produces: Sonraki task'ların tümü dosya başında `/** @jest-environment jsdom */` docblock'u ile RTL testleri yazabilir; CSS module import'ları `identity-obj-proxy` ile sınıf-adı string'ine çözülür (ör. `styles.aboveNav` → `"aboveNav"`).

- [ ] **Step 1: Bağımlılıkları kur**

```bash
npm install -D @testing-library/react @testing-library/jest-dom jest-environment-jsdom identity-obj-proxy
```

- [ ] **Step 2: jest.setup.ts oluştur**

```ts
import '@testing-library/jest-dom'
```

- [ ] **Step 3: jest.config.js'i güncelle**

Dosyanın tamamı şu hale gelir (CSS mapper, jsx ayarı ve setup dosyası eklenir; `testEnvironment: 'node'` varsayılan kalır):

```js
/** @type {import('jest').Config} */
const config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '\\.(css|scss)$': 'identity-obj-proxy',
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: {
        module: 'commonjs',
        moduleResolution: 'node',
        jsx: 'react-jsx',
      },
    }],
  },
  testPathIgnorePatterns: ['/node_modules/', '/e2e/'],
}

module.exports = config
```

- [ ] **Step 4: Sanity testini yaz**

`src/components/mobile/__tests__/setup-sanity.test.tsx`:

```tsx
/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'

test('jsdom ortamında JSX render edilebiliyor', () => {
    render(<button>Deneme</button>)
    expect(screen.getByRole('button', { name: 'Deneme' })).toBeInTheDocument()
})
```

- [ ] **Step 5: Testleri çalıştır — hem yeni sanity hem mevcut suite yeşil**

Run: `npx jest --no-coverage`
Expected: PASS — mevcut 65 test + 1 yeni sanity testi, 0 fail.

- [ ] **Step 6: Commit**

```bash
git add jest.config.js jest.setup.ts src/components/mobile/__tests__/setup-sanity.test.tsx package.json package-lock.json
git commit -m "test: jsdom + React Testing Library component test altyapisi eklendi"
```

---

### Task 2: Mobil temel token'ları (`globals.css`)

**Files:**
- Modify: `src/app/globals.css` (tema bağımsız `:root` bloğunun sonuna, ~28. satırdaki kapanıştan önce)

**Interfaces:**
- Produces: `--touch-target` (44px), `--input-height-mobile` (48px), `--safe-top`, `--safe-bottom`, `--bottomnav-height`, `--font-size-title`, `--font-size-page-title` CSS değişkenleri. Tüm sonraki task'lar ve Faz 1-4 sayfaları bunları kullanır.

- [ ] **Step 1: Token'ları ekle**

`globals.css`'te "MARKA ÇEKİRDEĞİ" `:root` bloğu içine, `--radius-xl: 1.5rem;` satırından sonra ekle:

```css
  /* ===== MOBİL TEMEL (Faz 0 — mobil UI spec §3.1) ===== */
  --touch-target: 44px;            /* Apple HIG minimum dokunma hedefi */
  --input-height-mobile: 48px;     /* mobil form input yüksekliği */
  --safe-top: env(safe-area-inset-top, 0px);
  --safe-bottom: env(safe-area-inset-bottom, 0px);
  /* BottomNavbar.module.css:12 ile senkron: 83px + safe-area */
  --bottomnav-height: calc(83px + env(safe-area-inset-bottom, 0px));
  --font-size-title: clamp(1.25rem, 4vw, 1.5rem);
  --font-size-page-title: clamp(1.5rem, 5vw, 2rem);
```

Not: `viewportFit: "cover"` zaten `src/app/layout.tsx:26`'da ayarlı — `env()` değerleri iOS'ta çalışır, layout değişikliği gerekmez.

- [ ] **Step 2: Mevcut testlerin bozulmadığını doğrula**

Run: `npx jest --no-coverage`
Expected: PASS (66 test)

- [ ] **Step 3: Commit**

```bash
git add src/app/globals.css
git commit -m "feat(mobil): mobil temel token'lari eklendi (touch-target, safe-area, bottomnav-height, akiskan tipografi)"
```

---

### Task 3: AppBar

**Files:**
- Create: `src/components/mobile/AppBar.tsx`
- Create: `src/components/mobile/AppBar.module.css`
- Test: `src/components/mobile/__tests__/AppBar.test.tsx`

**Interfaces:**
- Consumes: Task 2 token'ları (`--touch-target`, `--safe-top`, `--font-size-title`).
- Produces: `AppBar({ title: string; showBack?: boolean; backHref?: string; action?: React.ReactNode })` — mobil sayfa başlığı; ≤768px'te görünür, desktop'ta `display: none`. Faz 1-4'te detay/alt sayfalar kullanır.

- [ ] **Step 1: Failing testleri yaz**

`src/components/mobile/__tests__/AppBar.test.tsx`:

```tsx
/** @jest-environment jsdom */
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { AppBar } from '../AppBar'

const back = jest.fn()
const push = jest.fn()
jest.mock('next/navigation', () => ({ useRouter: () => ({ back, push }) }))

describe('AppBar', () => {
    beforeEach(() => { back.mockClear(); push.mockClear() })

    it('başlığı heading olarak gösterir', () => {
        render(<AppBar title="İlan Detayı" />)
        expect(screen.getByRole('heading', { name: 'İlan Detayı' })).toBeInTheDocument()
    })

    it('showBack verilmeden geri butonu render etmez', () => {
        render(<AppBar title="Başlık" />)
        expect(screen.queryByRole('button', { name: 'Geri' })).not.toBeInTheDocument()
    })

    it('geri butonu router.back() çağırır', () => {
        render(<AppBar title="Başlık" showBack />)
        fireEvent.click(screen.getByRole('button', { name: 'Geri' }))
        expect(back).toHaveBeenCalledTimes(1)
    })

    it('backHref verilirse router.push(backHref) çağırır', () => {
        render(<AppBar title="Başlık" showBack backHref="/inbox" />)
        fireEvent.click(screen.getByRole('button', { name: 'Geri' }))
        expect(push).toHaveBeenCalledWith('/inbox')
        expect(back).not.toHaveBeenCalled()
    })

    it('action slot içeriğini render eder', () => {
        render(<AppBar title="Başlık" action={<button>Paylaş</button>} />)
        expect(screen.getByRole('button', { name: 'Paylaş' })).toBeInTheDocument()
    })
})
```

- [ ] **Step 2: Testin fail ettiğini doğrula**

Run: `npx jest AppBar --no-coverage`
Expected: FAIL — "Cannot find module '../AppBar'"

- [ ] **Step 3: Bileşeni yaz**

`src/components/mobile/AppBar.tsx`:

```tsx
"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import styles from './AppBar.module.css';

interface AppBarProps {
    title: string;
    /** Geri butonunu göster; tıklanınca router.back() (backHref verilirse oraya push) */
    showBack?: boolean;
    backHref?: string;
    /** Sağ tarafta gösterilecek opsiyonel aksiyon (ikon butonu vb.) */
    action?: React.ReactNode;
}

export function AppBar({ title, showBack = false, backHref, action }: AppBarProps) {
    const router = useRouter();

    const handleBack = () => {
        if (backHref) router.push(backHref);
        else router.back();
    };

    return (
        <header className={styles.appBar}>
            {showBack && (
                <button type="button" className={styles.backBtn} onClick={handleBack} aria-label="Geri">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
                </button>
            )}
            <h1 className={styles.title}>{title}</h1>
            {action && <div className={styles.action}>{action}</div>}
        </header>
    );
}
```

`src/components/mobile/AppBar.module.css`:

```css
/* Desktop'ta gizli — mobil sayfa başlığı */
.appBar {
    display: none;
}

@media (max-width: 768px) {
    .appBar {
        display: flex;
        align-items: center;
        gap: 8px;
        position: sticky;
        top: 0;
        z-index: 50;
        min-height: calc(52px + var(--safe-top));
        padding: var(--safe-top) 12px 0 12px;
        background: var(--topbar-bg);
        border-bottom: 1px solid var(--topbar-border);
        backdrop-filter: blur(14px);
        -webkit-backdrop-filter: blur(14px);
    }

    .backBtn {
        display: flex;
        align-items: center;
        justify-content: center;
        min-width: var(--touch-target);
        min-height: var(--touch-target);
        margin-left: -8px;
        background: none;
        border: none;
        color: var(--topbar-text);
        cursor: pointer;
    }

    .title {
        flex: 1;
        margin: 0;
        font-size: var(--font-size-title);
        font-weight: 700;
        color: var(--topbar-text);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .action {
        display: flex;
        align-items: center;
    }
}
```

- [ ] **Step 4: Testlerin geçtiğini doğrula**

Run: `npx jest AppBar --no-coverage`
Expected: PASS (5 test)

- [ ] **Step 5: Commit**

```bash
git add src/components/mobile/AppBar.tsx src/components/mobile/AppBar.module.css src/components/mobile/__tests__/AppBar.test.tsx
git commit -m "feat(mobil): AppBar primitifi — mobil sayfa basligi + geri butonu"
```

---

### Task 4: DataCard + CardList

**Files:**
- Create: `src/components/mobile/DataCard.tsx`
- Create: `src/components/mobile/DataCard.module.css`
- Test: `src/components/mobile/__tests__/DataCard.test.tsx`

**Interfaces:**
- Consumes: Task 2 token'ları.
- Produces: `DataCard({ title: React.ReactNode; subtitle?: React.ReactNode; fields?: DataCardField[]; actions?: React.ReactNode; href?: string })` (bir `<li>` render eder), `DataCardField = { label: string; value: React.ReactNode }`, `CardList({ children })` (bir `<ul>` render eder). Faz 4 admin tabloları ve Faz 3 dashboard listeleri bunları kullanır. Görünürlük (yalnızca mobil vb.) kullanan sayfanın CSS'ine aittir — bileşen her genişlikte çalışır.

- [ ] **Step 1: Failing testleri yaz**

`src/components/mobile/__tests__/DataCard.test.tsx`:

```tsx
/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { DataCard, CardList } from '../DataCard'

describe('DataCard', () => {
    it('başlık ve etiket-değer çiftlerini render eder', () => {
        render(
            <CardList>
                <DataCard
                    title="Kadıköy 450m²"
                    subtitle="2 gün önce"
                    fields={[
                        { label: 'Fiyat', value: '2.400.000 ₺' },
                        { label: 'Durum', value: 'Onaylı' },
                    ]}
                />
            </CardList>
        )
        expect(screen.getByText('Kadıköy 450m²')).toBeInTheDocument()
        expect(screen.getByText('2 gün önce')).toBeInTheDocument()
        expect(screen.getByText('Fiyat')).toBeInTheDocument()
        expect(screen.getByText('2.400.000 ₺')).toBeInTheDocument()
        expect(screen.getByText('Durum')).toBeInTheDocument()
        expect(screen.getByText('Onaylı')).toBeInTheDocument()
    })

    it('href verilirse kart içeriği linke sarılır', () => {
        render(
            <CardList>
                <DataCard title="İlan A" href="/listing/abc" />
            </CardList>
        )
        expect(screen.getByRole('link')).toHaveAttribute('href', '/listing/abc')
    })

    it('href verilmezse link render etmez', () => {
        render(
            <CardList>
                <DataCard title="İlan B" />
            </CardList>
        )
        expect(screen.queryByRole('link')).not.toBeInTheDocument()
    })

    it('actions bölümünü render eder', () => {
        render(
            <CardList>
                <DataCard title="İlan C" actions={<button>Sil</button>} />
            </CardList>
        )
        expect(screen.getByRole('button', { name: 'Sil' })).toBeInTheDocument()
    })

    it('CardList bir liste, DataCard bir liste öğesidir', () => {
        render(
            <CardList>
                <DataCard title="A" />
                <DataCard title="B" />
            </CardList>
        )
        expect(screen.getByRole('list')).toBeInTheDocument()
        expect(screen.getAllByRole('listitem')).toHaveLength(2)
    })
})
```

- [ ] **Step 2: Testin fail ettiğini doğrula**

Run: `npx jest DataCard --no-coverage`
Expected: FAIL — "Cannot find module '../DataCard'"

- [ ] **Step 3: Bileşeni yaz**

`src/components/mobile/DataCard.tsx`:

```tsx
import React from 'react';
import Link from 'next/link';
import styles from './DataCard.module.css';

export interface DataCardField {
    label: string;
    value: React.ReactNode;
}

interface DataCardProps {
    title: React.ReactNode;
    subtitle?: React.ReactNode;
    fields?: DataCardField[];
    /** Kart altı buton grubu (düzenle/sil vb.) — href linkinin DIŞINDA kalır */
    actions?: React.ReactNode;
    /** Verilirse başlık+alanlar tıklanabilir linke dönüşür */
    href?: string;
}

export function DataCard({ title, subtitle, fields = [], actions, href }: DataCardProps) {
    const body = (
        <>
            <div className={styles.header}>
                <div className={styles.title}>{title}</div>
                {subtitle && <div className={styles.subtitle}>{subtitle}</div>}
            </div>
            {fields.length > 0 && (
                <dl className={styles.fields}>
                    {fields.map((f, i) => (
                        <div key={i} className={styles.field}>
                            <dt className={styles.label}>{f.label}</dt>
                            <dd className={styles.value}>{f.value}</dd>
                        </div>
                    ))}
                </dl>
            )}
        </>
    );

    return (
        <li className={styles.card}>
            {href ? <Link href={href} className={styles.link}>{body}</Link> : body}
            {actions && <div className={styles.actions}>{actions}</div>}
        </li>
    );
}

export function CardList({ children }: { children: React.ReactNode }) {
    return <ul className={styles.list}>{children}</ul>;
}
```

`src/components/mobile/DataCard.module.css`:

```css
.list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.card {
    background: var(--panel);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow2);
    padding: 14px;
}

.link {
    display: block;
    color: inherit;
    text-decoration: none;
}

.header {
    display: flex;
    flex-direction: column;
    gap: 2px;
    margin-bottom: 8px;
}

.title {
    font-weight: 700;
    color: var(--card-title);
    font-size: 0.95rem;
}

.subtitle {
    font-size: 0.8rem;
    color: var(--muted);
}

.fields {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px 12px;
    margin: 0;
}

.field {
    display: flex;
    flex-direction: column;
    gap: 1px;
    min-width: 0;
}

.label {
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--muted);
}

.value {
    margin: 0;
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--val-color);
    overflow-wrap: anywhere;
}

.actions {
    display: flex;
    gap: 8px;
    margin-top: 10px;
    padding-top: 10px;
    border-top: 1px solid var(--border);
}

/* Kart içi aksiyon butonları dokunma hedefini korur */
.actions > * {
    min-height: var(--touch-target);
}
```

- [ ] **Step 4: Testlerin geçtiğini doğrula**

Run: `npx jest DataCard --no-coverage`
Expected: PASS (5 test)

- [ ] **Step 5: Commit**

```bash
git add src/components/mobile/DataCard.tsx src/components/mobile/DataCard.module.css src/components/mobile/__tests__/DataCard.test.tsx
git commit -m "feat(mobil): DataCard/CardList primitifi — tablolarin mobil karsiligi"
```

---

### Task 5: SegmentedTabs

**Files:**
- Create: `src/components/mobile/SegmentedTabs.tsx`
- Create: `src/components/mobile/SegmentedTabs.module.css`
- Test: `src/components/mobile/__tests__/SegmentedTabs.test.tsx`

**Interfaces:**
- Consumes: Task 2 token'ları.
- Produces: `SegmentedTabs({ options: { value: string; label: string }[]; value: string; onChange: (value: string) => void; ariaLabel: string })`. Faz 1'de marketplace harita/liste geçişi kullanır.

- [ ] **Step 1: Failing testleri yaz**

`src/components/mobile/__tests__/SegmentedTabs.test.tsx`:

```tsx
/** @jest-environment jsdom */
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { SegmentedTabs } from '../SegmentedTabs'

const OPTIONS = [
    { value: 'liste', label: 'Liste' },
    { value: 'harita', label: 'Harita' },
]

describe('SegmentedTabs', () => {
    it('tüm seçenekleri tab olarak render eder', () => {
        render(<SegmentedTabs options={OPTIONS} value="liste" onChange={() => {}} ariaLabel="Görünüm" />)
        expect(screen.getAllByRole('tab')).toHaveLength(2)
        expect(screen.getByRole('tablist', { name: 'Görünüm' })).toBeInTheDocument()
    })

    it('seçili tab aria-selected=true taşır', () => {
        render(<SegmentedTabs options={OPTIONS} value="harita" onChange={() => {}} ariaLabel="Görünüm" />)
        expect(screen.getByRole('tab', { name: 'Harita' })).toHaveAttribute('aria-selected', 'true')
        expect(screen.getByRole('tab', { name: 'Liste' })).toHaveAttribute('aria-selected', 'false')
    })

    it('tıklanınca onChange değeri iletir', () => {
        const onChange = jest.fn()
        render(<SegmentedTabs options={OPTIONS} value="liste" onChange={onChange} ariaLabel="Görünüm" />)
        fireEvent.click(screen.getByRole('tab', { name: 'Harita' }))
        expect(onChange).toHaveBeenCalledWith('harita')
    })
})
```

- [ ] **Step 2: Testin fail ettiğini doğrula**

Run: `npx jest SegmentedTabs --no-coverage`
Expected: FAIL — "Cannot find module '../SegmentedTabs'"

- [ ] **Step 3: Bileşeni yaz**

`src/components/mobile/SegmentedTabs.tsx`:

```tsx
"use client";

import React from 'react';
import styles from './SegmentedTabs.module.css';

interface SegmentedTabsProps {
    options: { value: string; label: string }[];
    value: string;
    onChange: (value: string) => void;
    /** Ekran okuyucular için grup etiketi */
    ariaLabel: string;
}

export function SegmentedTabs({ options, value, onChange, ariaLabel }: SegmentedTabsProps) {
    return (
        <div role="tablist" aria-label={ariaLabel} className={styles.tabs}>
            {options.map((o) => (
                <button
                    key={o.value}
                    type="button"
                    role="tab"
                    aria-selected={value === o.value}
                    className={`${styles.tab} ${value === o.value ? styles.active : ''}`}
                    onClick={() => onChange(o.value)}
                >
                    {o.label}
                </button>
            ))}
        </div>
    );
}
```

`src/components/mobile/SegmentedTabs.module.css`:

```css
.tabs {
    display: flex;
    gap: 4px;
    padding: 4px;
    background: var(--panel-2);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
}

.tab {
    flex: 1;
    min-height: var(--touch-target);
    border: none;
    border-radius: var(--radius-sm);
    background: transparent;
    color: var(--muted);
    font-size: 0.9rem;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.15s ease, color 0.15s ease;
}

.active {
    background: var(--primary);
    color: #fff;
}
```

- [ ] **Step 4: Testlerin geçtiğini doğrula**

Run: `npx jest SegmentedTabs --no-coverage`
Expected: PASS (3 test)

- [ ] **Step 5: Commit**

```bash
git add src/components/mobile/SegmentedTabs.tsx src/components/mobile/SegmentedTabs.module.css src/components/mobile/__tests__/SegmentedTabs.test.tsx
git commit -m "feat(mobil): SegmentedTabs primitifi — yatay segment kontrolu"
```

---

### Task 6: StickyActionBar

**Files:**
- Create: `src/components/mobile/StickyActionBar.tsx`
- Create: `src/components/mobile/StickyActionBar.module.css`
- Test: `src/components/mobile/__tests__/StickyActionBar.test.tsx`

**Interfaces:**
- Consumes: Task 2 token'ları (`--safe-bottom`, `--bottomnav-height`).
- Produces: `StickyActionBar({ children: React.ReactNode; aboveBottomNav?: boolean })` — ≤768px'te ekran altına sabit CTA çubuğu, desktop'ta `display: none`. `aboveBottomNav` true ise BottomNavbar'ın (83px + safe-area) üstüne oturur. Faz 1 hesapla CTA'sı, Faz 2 wizard ileri/geri bunları kullanır.

- [ ] **Step 1: Failing testleri yaz**

`src/components/mobile/__tests__/StickyActionBar.test.tsx`:

```tsx
/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { StickyActionBar } from '../StickyActionBar'

describe('StickyActionBar', () => {
    it('çocukları render eder', () => {
        render(<StickyActionBar><button>Hesapla</button></StickyActionBar>)
        expect(screen.getByRole('button', { name: 'Hesapla' })).toBeInTheDocument()
    })

    it('varsayılanda aboveNav sınıfı yok', () => {
        const { container } = render(<StickyActionBar><span>x</span></StickyActionBar>)
        expect((container.firstChild as HTMLElement).className).not.toContain('aboveNav')
    })

    it('aboveBottomNav ile aboveNav sınıfı eklenir', () => {
        const { container } = render(<StickyActionBar aboveBottomNav><span>x</span></StickyActionBar>)
        expect((container.firstChild as HTMLElement).className).toContain('aboveNav')
    })
})
```

- [ ] **Step 2: Testin fail ettiğini doğrula**

Run: `npx jest StickyActionBar --no-coverage`
Expected: FAIL — "Cannot find module '../StickyActionBar'"

- [ ] **Step 3: Bileşeni yaz**

`src/components/mobile/StickyActionBar.tsx`:

```tsx
import React from 'react';
import styles from './StickyActionBar.module.css';

interface StickyActionBarProps {
    children: React.ReactNode;
    /** BottomNavbar'ın göründüğü sayfalarda true — çubuk navbar'ın üstüne oturur */
    aboveBottomNav?: boolean;
}

export function StickyActionBar({ children, aboveBottomNav = false }: StickyActionBarProps) {
    return (
        <div className={`${styles.bar} ${aboveBottomNav ? styles.aboveNav : ''}`}>
            {children}
        </div>
    );
}
```

`src/components/mobile/StickyActionBar.module.css`:

```css
/* Desktop'ta gizli — mobil CTA çubuğu */
.bar {
    display: none;
}

@media (max-width: 768px) {
    .bar {
        display: flex;
        gap: 10px;
        position: fixed;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 90;
        padding: 10px 14px calc(10px + var(--safe-bottom)) 14px;
        background: var(--topbar-bg);
        border-top: 1px solid var(--topbar-border);
        backdrop-filter: blur(14px);
        -webkit-backdrop-filter: blur(14px);
    }

    /* BottomNavbar görünürken navbar'ın üstüne oturur; navbar kendi
       safe-area padding'ini zaten taşıdığı için burada eklenmez */
    .aboveNav {
        bottom: var(--bottomnav-height);
        padding-bottom: 10px;
    }

    .bar > * {
        flex: 1;
        min-height: var(--touch-target);
    }
}
```

- [ ] **Step 4: Testlerin geçtiğini doğrula**

Run: `npx jest StickyActionBar --no-coverage`
Expected: PASS (3 test)

- [ ] **Step 5: Commit**

```bash
git add src/components/mobile/StickyActionBar.tsx src/components/mobile/StickyActionBar.module.css src/components/mobile/__tests__/StickyActionBar.test.tsx
git commit -m "feat(mobil): StickyActionBar primitifi — safe-area duyarli yapisan CTA cubugu"
```

---

### Task 7: BottomSheet

**Files:**
- Create: `src/components/mobile/BottomSheet.tsx`
- Create: `src/components/mobile/BottomSheet.module.css`
- Test: `src/components/mobile/__tests__/BottomSheet.test.tsx`

**Interfaces:**
- Consumes: Task 2 token'ları (`--safe-bottom`, `--radius-lg`); framer-motion 12 (kurulu).
- Produces: `BottomSheet({ open: boolean; onClose: () => void; title?: string; children: React.ReactNode })` — alttan açılan panel; backdrop tıklaması, Escape ve aşağı sürükleme kapatır; body scroll kilitlenir; `prefers-reduced-motion`'da fade'e düşer. Faz 1 marketplace filtreleri kullanır.

- [ ] **Step 1: Failing testleri yaz**

`src/components/mobile/__tests__/BottomSheet.test.tsx`:

```tsx
/** @jest-environment jsdom */
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { BottomSheet } from '../BottomSheet'

describe('BottomSheet', () => {
    it('open=false iken dialog render etmez', () => {
        render(<BottomSheet open={false} onClose={() => {}}><p>İçerik</p></BottomSheet>)
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('open=true iken dialog, başlık ve içeriği render eder', () => {
        render(<BottomSheet open onClose={() => {}} title="Filtreler"><p>İçerik</p></BottomSheet>)
        expect(screen.getByRole('dialog', { name: 'Filtreler' })).toBeInTheDocument()
        expect(screen.getByText('İçerik')).toBeInTheDocument()
    })

    it('backdrop tıklaması onClose çağırır', () => {
        const onClose = jest.fn()
        render(<BottomSheet open onClose={onClose} title="Filtreler"><p>İçerik</p></BottomSheet>)
        fireEvent.click(screen.getByTestId('bottomsheet-backdrop'))
        expect(onClose).toHaveBeenCalledTimes(1)
    })

    it('Escape tuşu onClose çağırır', () => {
        const onClose = jest.fn()
        render(<BottomSheet open onClose={onClose}><p>İçerik</p></BottomSheet>)
        fireEvent.keyDown(document, { key: 'Escape' })
        expect(onClose).toHaveBeenCalledTimes(1)
    })

    it('açıkken body scroll kilitlenir, kapanınca geri gelir', () => {
        const { rerender } = render(<BottomSheet open onClose={() => {}}><p>İçerik</p></BottomSheet>)
        expect(document.body.style.overflow).toBe('hidden')
        rerender(<BottomSheet open={false} onClose={() => {}}><p>İçerik</p></BottomSheet>)
        expect(document.body.style.overflow).toBe('')
    })
})
```

- [ ] **Step 2: Testin fail ettiğini doğrula**

Run: `npx jest BottomSheet --no-coverage`
Expected: FAIL — "Cannot find module '../BottomSheet'"

- [ ] **Step 3: Bileşeni yaz**

`src/components/mobile/BottomSheet.tsx`:

```tsx
"use client";

import React, { useEffect } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import styles from './BottomSheet.module.css';

interface BottomSheetProps {
    open: boolean;
    onClose: () => void;
    title?: string;
    children: React.ReactNode;
}

export function BottomSheet({ open, onClose, title, children }: BottomSheetProps) {
    const reduceMotion = useReducedMotion();

    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', onKey);
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.removeEventListener('keydown', onKey);
            document.body.style.overflow = prevOverflow;
        };
    }, [open, onClose]);

    return (
        <AnimatePresence>
            {open && (
                <>
                    <motion.div
                        data-testid="bottomsheet-backdrop"
                        className={styles.backdrop}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        aria-hidden="true"
                    />
                    <motion.div
                        role="dialog"
                        aria-modal="true"
                        aria-label={title}
                        className={styles.sheet}
                        initial={reduceMotion ? { opacity: 0 } : { y: '100%' }}
                        animate={reduceMotion ? { opacity: 1 } : { y: 0 }}
                        exit={reduceMotion ? { opacity: 0 } : { y: '100%' }}
                        transition={{ type: 'spring', damping: 32, stiffness: 320 }}
                        drag={reduceMotion ? false : 'y'}
                        dragConstraints={{ top: 0 }}
                        dragElastic={{ top: 0, bottom: 0.4 }}
                        onDragEnd={(_, info) => {
                            if (info.offset.y > 120 || info.velocity.y > 800) onClose();
                        }}
                    >
                        <div className={styles.grabber} aria-hidden="true" />
                        {title && <div className={styles.title}>{title}</div>}
                        <div className={styles.content}>{children}</div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
```

`src/components/mobile/BottomSheet.module.css`:

```css
.backdrop {
    position: fixed;
    inset: 0;
    z-index: 1000;
    background: rgba(0, 0, 0, 0.45);
}

.sheet {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 1001;
    display: flex;
    flex-direction: column;
    max-height: 85dvh;
    background: var(--panel);
    border-top-left-radius: var(--radius-lg);
    border-top-right-radius: var(--radius-lg);
    border-top: 1px solid var(--border);
    padding-bottom: var(--safe-bottom);
    box-shadow: var(--shadow);
}

.grabber {
    width: 40px;
    height: 4px;
    border-radius: 2px;
    background: var(--muted);
    opacity: 0.5;
    margin: 10px auto 6px auto;
    flex-shrink: 0;
}

.title {
    padding: 4px 16px 12px 16px;
    font-size: var(--font-size-title);
    font-weight: 700;
    color: var(--card-title);
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
}

.content {
    overflow-y: auto;
    padding: 12px 16px;
    -webkit-overflow-scrolling: touch;
}
```

- [ ] **Step 4: Testlerin geçtiğini doğrula**

Run: `npx jest BottomSheet --no-coverage`
Expected: PASS (5 test)

- [ ] **Step 5: Commit**

```bash
git add src/components/mobile/BottomSheet.tsx src/components/mobile/BottomSheet.module.css src/components/mobile/__tests__/BottomSheet.test.tsx
git commit -m "feat(mobil): BottomSheet primitifi — surukle-kapat, backdrop, reduced-motion destekli"
```

---

### Task 8: SwipeGallery

**Files:**
- Create: `src/components/mobile/SwipeGallery.tsx`
- Create: `src/components/mobile/SwipeGallery.module.css`
- Test: `src/components/mobile/__tests__/SwipeGallery.test.tsx`

**Interfaces:**
- Consumes: Task 2 token'ları.
- Produces: `SwipeGallery({ images: string[]; alt: string })` — CSS scroll-snap ile dokunmatik galeri + nokta göstergesi. Boş dizi ile `null` döner. Faz 1 listing detay fotoğrafları kullanır. (Not: `next/image` yerine bilinçli olarak `<img>` kullanılır — scroll-snap track içinde boyutlandırma sadeliği için; lazy-load `loading` attribute'u ile korunur.)

- [ ] **Step 1: Failing testleri yaz**

`src/components/mobile/__tests__/SwipeGallery.test.tsx`:

```tsx
/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { SwipeGallery } from '../SwipeGallery'

const IMAGES = ['/uploads/a.jpg', '/uploads/b.jpg', '/uploads/c.jpg']

describe('SwipeGallery', () => {
    it('boş dizi ile hiçbir şey render etmez', () => {
        const { container } = render(<SwipeGallery images={[]} alt="Arsa fotoğrafı" />)
        expect(container).toBeEmptyDOMElement()
    })

    it('tüm görselleri sıra bilgili alt metniyle render eder', () => {
        render(<SwipeGallery images={IMAGES} alt="Arsa fotoğrafı" />)
        expect(screen.getByAltText('Arsa fotoğrafı 1/3')).toBeInTheDocument()
        expect(screen.getByAltText('Arsa fotoğrafı 2/3')).toBeInTheDocument()
        expect(screen.getByAltText('Arsa fotoğrafı 3/3')).toBeInTheDocument()
    })

    it('birden fazla görselde nokta göstergesi, tek görselde yok', () => {
        const { container, rerender } = render(<SwipeGallery images={IMAGES} alt="Foto" />)
        expect(container.querySelectorAll('[data-dot]')).toHaveLength(3)
        rerender(<SwipeGallery images={['/uploads/a.jpg']} alt="Foto" />)
        expect(container.querySelectorAll('[data-dot]')).toHaveLength(0)
    })

    it('ilk görsel eager, sonrakiler lazy yüklenir', () => {
        render(<SwipeGallery images={IMAGES} alt="Foto" />)
        expect(screen.getByAltText('Foto 1/3')).toHaveAttribute('loading', 'eager')
        expect(screen.getByAltText('Foto 2/3')).toHaveAttribute('loading', 'lazy')
    })
})
```

- [ ] **Step 2: Testin fail ettiğini doğrula**

Run: `npx jest SwipeGallery --no-coverage`
Expected: FAIL — "Cannot find module '../SwipeGallery'"

- [ ] **Step 3: Bileşeni yaz**

`src/components/mobile/SwipeGallery.tsx`:

```tsx
"use client";

import React, { useRef, useState } from 'react';
import styles from './SwipeGallery.module.css';

interface SwipeGalleryProps {
    images: string[];
    /** Alt metin tabanı; "alt 1/3" biçiminde numaralanır */
    alt: string;
}

export function SwipeGallery({ images, alt }: SwipeGalleryProps) {
    const trackRef = useRef<HTMLDivElement>(null);
    const [index, setIndex] = useState(0);

    const onScroll = () => {
        const el = trackRef.current;
        if (!el || el.clientWidth === 0) return;
        setIndex(Math.round(el.scrollLeft / el.clientWidth));
    };

    if (images.length === 0) return null;

    return (
        <div className={styles.gallery}>
            <div className={styles.track} ref={trackRef} onScroll={onScroll}>
                {images.map((src, i) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        key={`${src}-${i}`}
                        src={src}
                        alt={`${alt} ${i + 1}/${images.length}`}
                        className={styles.slide}
                        loading={i === 0 ? 'eager' : 'lazy'}
                    />
                ))}
            </div>
            {images.length > 1 && (
                <div className={styles.dots} aria-hidden="true">
                    {images.map((_, i) => (
                        <span key={i} data-dot className={`${styles.dot} ${i === index ? styles.dotActive : ''}`} />
                    ))}
                </div>
            )}
        </div>
    );
}
```

`src/components/mobile/SwipeGallery.module.css`:

```css
.gallery {
    position: relative;
}

.track {
    display: flex;
    overflow-x: auto;
    scroll-snap-type: x mandatory;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
    border-radius: var(--radius-md);
}

.track::-webkit-scrollbar {
    display: none;
}

.slide {
    flex: 0 0 100%;
    width: 100%;
    aspect-ratio: 4 / 3;
    object-fit: cover;
    scroll-snap-align: start;
}

.dots {
    position: absolute;
    bottom: 10px;
    left: 0;
    right: 0;
    display: flex;
    justify-content: center;
    gap: 6px;
}

.dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.55);
    transition: background 0.15s ease;
}

.dotActive {
    background: #fff;
}
```

- [ ] **Step 4: Testlerin geçtiğini doğrula**

Run: `npx jest SwipeGallery --no-coverage`
Expected: PASS (4 test)

- [ ] **Step 5: Commit**

```bash
git add src/components/mobile/SwipeGallery.tsx src/components/mobile/SwipeGallery.module.css src/components/mobile/__tests__/SwipeGallery.test.tsx
git commit -m "feat(mobil): SwipeGallery primitifi — scroll-snap galeri + nokta gostergesi"
```

---

### Task 9: Playwright mobil smoke harness'i

**Files:**
- Create: `e2e/mobil-smoke.spec.ts`
- Modify: `.gitignore` (`e2e/screenshots/` eklenir)

**Interfaces:**
- Consumes: Mevcut `playwright.config.ts` (webServer, Postgres E2E DB).
- Produces: 390×844 viewport'ta sayfa başına "yatay taşma yok" assertion'ı + tam sayfa ekran görüntüsü. Faz 1-4'te her fazın sayfaları `PAGES` listesine eklenir; şu an bilinen-bozuk sayfalar `test.fixme` ile işaretlidir (envanter görevi görür).

- [ ] **Step 1: Smoke spec'ini yaz**

`e2e/mobil-smoke.spec.ts`:

```ts
import { test, expect, Page } from '@playwright/test'

// Mobil UI spec §5: her faz sonunda faz kapsamındaki sayfalar bu listeye taşınır.
// fixme'li sayfalar bilinen-bozuk envanteridir; ilgili fazda düzeltilip aktive edilir.
const MOBILE_VIEWPORT = { width: 390, height: 844 }

const PAGES: { path: string; fixme?: string }[] = [
    { path: '/' },
    { path: '/login' },
    { path: '/register' },
    { path: '/marketplace', fixme: 'Faz 1 - filtre sidebar mobilde tasiyor' },
    { path: '/hesapla', fixme: 'Faz 1 - inline stil grid tasiyor' },
]

async function assertNoHorizontalOverflow(page: Page) {
    const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    )
    expect(overflow, 'yatay taşma (px)').toBeLessThanOrEqual(0)
}

test.use({ viewport: MOBILE_VIEWPORT })

for (const { path, fixme } of PAGES) {
    test(`mobil 390px: ${path} yatay taşma yok`, async ({ page }) => {
        if (fixme) test.fixme(true, fixme)
        await page.goto(path)
        await page.waitForLoadState('networkidle')
        await assertNoHorizontalOverflow(page)
        await page.screenshot({
            path: `e2e/screenshots/mobil${path === '/' ? '_home' : path.replace(/\//g, '_')}.png`,
            fullPage: true,
        })
    })
}
```

- [ ] **Step 2: .gitignore'a screenshots klasörünü ekle**

`.gitignore` dosyasının sonuna:

```
# Playwright mobil smoke ekran görüntüleri
e2e/screenshots/
```

- [ ] **Step 3: Ortam varsa çalıştır, yoksa fixme envanterini elle doğrula**

Docker/Postgres ayaktaysa:
Run: `npx playwright test e2e/mobil-smoke.spec.ts`
Expected: `/`, `/login`, `/register` PASS; `/marketplace`, `/hesapla` fixme (skipped).

Herhangi bir "PASS beklenen" sayfa FAIL olursa: o satıra gerçek taşma nedenini açıklayan `fixme` ekle (envanter güncellenir, suite yeşil kalır) — düzeltme bu fazın işi değil.

Ortam yoksa (önceki oturumlarda Docker kapalıydı): spec'in TypeScript derlendiğini doğrula:
Run: `npx tsc --noEmit`
Expected: 0 hata. Playwright koşusu Faz 1 başında ortamla birlikte yapılır — bu durumu commit mesajında not et.

- [ ] **Step 4: Commit**

```bash
git add e2e/mobil-smoke.spec.ts .gitignore
git commit -m "test(e2e): mobil 390px smoke harness — yatay tasma assertion'i + bilinen-bozuk envanteri"
```

---

### Task 10: Faz kapanışı — tam doğrulama

**Files:**
- Modify: yok (yalnızca doğrulama; gerekirse önceki task'larda düzeltme)

**Interfaces:**
- Consumes: Task 1-9'un tamamı.
- Produces: Yeşil tam paket; Faz 1 planına hazır temel.

- [ ] **Step 1: TypeScript**

Run: `npx tsc --noEmit`
Expected: 0 hata

- [ ] **Step 2: ESLint**

Run: `npx eslint src e2e`
Expected: 0 hata, 0 uyarı (proje lint-temiz tutuluyor)

- [ ] **Step 3: Jest tam suite**

Run: `npx jest --no-coverage`
Expected: PASS — 65 mevcut + ~21 yeni component testi (sanity 1, AppBar 5, DataCard 5, SegmentedTabs 3, StickyActionBar 3, BottomSheet 5, SwipeGallery 4 = 26 yeni; toplam ~91), 0 fail

- [ ] **Step 4: Production build**

Run: `npm run build`
Expected: Başarılı build, yeni hata yok

- [ ] **Step 5: Manuel cihaz doğrulaması (spec §7 taahhüdü) — kullanıcıya raporla**

Otomatikleştirilemez; insan doğrulaması gerekir. `npm run dev` açıkken Chrome DevTools cihaz emülasyonu (iPhone 14 Pro, 390×844) ile geçici bir test sayfasında (veya Faz 1'in ilk kullanımında) şunlar elle kontrol edilir ve sonuç kullanıcıya raporlanır:
- BottomSheet: aşağı sürükleyince kapanıyor, backdrop tıklaması kapatıyor, safe-area padding'i görünüyor.
- StickyActionBar: sanal klavye açıkken CTA erişilebilir kalıyor (iOS Safari'de gerçek cihazda da denenmesi önerilir — emülasyon klavye davranışını birebir vermez; kullanıcıdan gerçek cihaz teyidi istenir).

- [ ] **Step 6: Hata varsa düzelt, temizse kapanış commit'i (yalnızca düzeltme olduysa)**

Düzeltme gerektiyse ilgili dosyalarla birlikte:

```bash
git add -A
git commit -m "fix(mobil): faz 0 kapanis duzeltmeleri"
```

Doğrulama temizse ek commit gerekmez — faz tamamlanmıştır. Sonraki adım: Faz 1 planı (`hesapla`, `marketplace`, `listing/[id]`, `dashboard`).
