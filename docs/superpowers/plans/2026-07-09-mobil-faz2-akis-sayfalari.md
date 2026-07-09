# Mobil UI Faz 2 — Akış Sayfaları Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `listings/new` (wizard), `listings/[id]/edit`, `inbox`, `login`/`register` sayfalarını mobil-first yapısal refactor'a tabi tutmak — inline stiller CSS module'e taşınır, mevcut mobil primitifler (`AppBar`, `StickyActionBar`) uygulanır, görsel dil ve masaüstü davranışı değişmez.

**Architecture:** `listings/new` ve `listings/[id]/edit` neredeyse birebir kopya olduğu için ortak bir `WizardShell` bileşeninde birleştirilir (mobil AppBar+kompakt progress+StickyActionBar, masaüstü mevcut kart+nav birebir). Inbox zaten çalışan bir mobil panel-geçiş deseni taşıyor, dokunulmadan sadece inline stilleri temizlenir. Login tamamen yeniden CSS module'e taşınır (JS ile simüle edilen `:focus`/`:hover` ve attribute-selector medya sorgusu hack'i kaldırılır). Register hafif bir dönüşüm alır (zaten `Card`/`Input`/`Button` kullanıyor). Tüm mobil-only elemanlar mevcut Faz 1 deseniyle (base `display` değişmez, `@media (max-width:768px)` içinde `display:none`/primitif açılır) uygulanır — hiçbir sayfa render'ı koşullu JSX'e geçmez, CSS ile görünürlük değişir.

**Tech Stack:** Next.js 16 (App Router, client component), CSS Modules, Jest (fs+regex CSS kapsam guard testleri + React Testing Library render testleri), Playwright.

## Global Constraints

- Masaüstü davranışı/görünümü hiçbir sayfada değişmez (piksel-parite).
- Breakpoint 768px (proje standardı) — login'in mevcut 900px hack'i bu değere düşürülür.
- Dokunma hedefi ≥44px, form input yüksekliği mobilde 48px (`var(--input-height-mobile)`), font-size ≥16px (iOS zoom önleme) — SADECE dokunulan/yeni yazılan CSS'te, mevcut `@media (max-width:768px)` bloğu İÇİNDE (Faz 1'in tekrar eden dersi: base rule'a min-height/height koymak masaüstü boyutunu büyütür).
- Yeni inline `style={{}}` yazılmaz (mevcutlar temizlenir); Next.js `Image fill` bileşeninin `objectFit` stili ve native `<input type="file">`'ın `display:none` gizlemesi gibi zaten var olan, kapsam dışı, davranışsal-zorunlu inline stillere dokunulmaz.
- Fotoğraf sıralama/kapak seçimi bu fazın kapsamı DIŞINDA.
- `WizardShell` sadece bu iki sayfa (`listings/new`, `listings/[id]/edit`) arasındaki mevcut tekrarı gideriyor — genel amaçlı bir "her wizard için" çerçevesi kurulmuyor.
- `Card`/`Input`/`Button` paylaşılan UI bileşenlerine (register'ın kullandığı) dokunulmuyor.
- Inbox'ta `AppBar` bileşeni KULLANILMIYOR (deviation, kullanıcı onaylı — bkz. Task 5 açıklaması): `AppBar`'ın `title` prop'u salt metin, inbox'ın chat başlığında avatar+isim birlikte var; paylaşılan bileşeni genişletmek yerine mevcut `.backButton`'a sadece görsel/erişilebilirlik tutarlılığı (aynı ikon boyutu+`aria-label`) kazandırılıyor.

---

## Dosya Yapısı

- Create: `src/components/listing-wizard/WizardProgress.module.css`, `WizardProgress.scope.test.ts`, `WizardProgress.test.tsx`
- Modify: `src/components/listing-wizard/WizardProgress.tsx`
- Create: `src/components/listing-wizard/WizardShell.tsx`, `WizardShell.module.css`, `WizardShell.scope.test.ts`, `WizardShell.test.tsx`
- Modify: `src/app/listings/new/page.tsx`, `src/app/listings/[id]/edit/page.tsx`, `src/components/layout/Navbar.tsx`, `src/components/listing-wizard/wizard.module.css`
- Delete: `src/app/listings/new/page.module.css` (Task 4'te, son tüketici taşındıktan sonra)
- Modify: `src/app/inbox/page.tsx`, `src/app/inbox/inbox.module.css`
- Create: `src/app/login/login.module.css`
- Modify: `src/app/login/page.tsx`
- Create: `src/app/register/register.module.css`
- Modify: `src/app/register/page.tsx`
- Modify: `src/components/layout/BottomNavbar.tsx`
- Create: `src/components/layout/__tests__/BottomNavbar.test.tsx`

---

### Task 1: WizardProgress — CSS module + mobil kompakt varyant

**Files:**
- Modify: `src/components/listing-wizard/WizardProgress.tsx`
- Create: `src/components/listing-wizard/WizardProgress.module.css`
- Create: `src/components/listing-wizard/WizardProgress.scope.test.ts`
- Create: `src/components/listing-wizard/WizardProgress.test.tsx`

**Interfaces:**
- Consumes: yok (bağımsız bileşen, mevcut `{ currentStep: number }` prop arayüzü DEĞİŞMİYOR).
- Produces: `WizardProgress` bileşeni, Task 2'de `WizardShell` tarafından aynen tüketilecek.

- [ ] **Step 1: Yeni CSS module dosyasını oluştur**

`src/components/listing-wizard/WizardProgress.module.css`:

```css
.progress {
  display: flex;
  align-items: center;
  margin-bottom: 2rem;
}

.node {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  flex: 1;
}

.circle {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  flex-shrink: 0;
  background: var(--panel);
  border: 2px solid var(--border);
  color: var(--muted);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8rem;
  font-weight: 800;
}

.circleActive {
  background: var(--brand-gradient);
  border-color: var(--primary);
  color: white;
}

.circleDone {
  background: var(--primary);
  border-color: var(--primary);
  color: white;
}

.label {
  font-size: 0.6rem;
  white-space: nowrap;
  font-weight: 600;
  color: var(--muted);
}

.labelActive {
  font-weight: 800;
  color: var(--primary);
}

.labelDone {
  color: var(--text);
}

.connector {
  height: 2px;
  flex: 1;
  margin-bottom: 20px;
  background: var(--border);
}

.connectorDone {
  background: var(--primary);
}

.connectorActive {
  background: var(--brand-gradient);
}

@media (max-width: 768px) {
  .circle {
    width: 22px;
    height: 22px;
    font-size: 0.65rem;
  }

  .label {
    display: none;
  }

  .connector {
    margin-bottom: 0;
  }
}
```

- [ ] **Step 2: `WizardProgress.tsx`'i inline stillerden CSS module'e taşı**

`src/components/listing-wizard/WizardProgress.tsx`'in TAMAMINI şununla DEĞİŞTİR:

```tsx
import React from 'react'
import styles from './WizardProgress.module.css'

const STEP_LABELS = ['Konum', 'Detay', 'Fotoğraf', 'Fizibilite', 'Yayınla']

interface Props {
  currentStep: number
}

export function WizardProgress({ currentStep }: Props) {
  return (
    <div className={styles.progress}>
      {STEP_LABELS.map((label, i) => {
        const step = i + 1
        const done = step < currentStep
        const active = step === currentStep
        return (
          <React.Fragment key={step}>
            <div className={styles.node}>
              <div className={`${styles.circle} ${active ? styles.circleActive : ''} ${done ? styles.circleDone : ''}`}>
                {done ? '✓' : step}
              </div>
              <span className={`${styles.label} ${active ? styles.labelActive : ''} ${done ? styles.labelDone : ''}`}>
                {label}
              </span>
            </div>
            {i < STEP_LABELS.length - 1 && (
              <div className={`${styles.connector} ${done ? styles.connectorDone : ''} ${active ? styles.connectorActive : ''}`} />
            )}
          </React.Fragment>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 3: RTL render testini yaz**

`src/components/listing-wizard/WizardProgress.test.tsx`:

```tsx
/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { WizardProgress } from './WizardProgress'

describe('WizardProgress', () => {
  it('5 adım etiketini render eder', () => {
    render(<WizardProgress currentStep={1} />)
    expect(screen.getByText('Konum')).toBeInTheDocument()
    expect(screen.getByText('Detay')).toBeInTheDocument()
    expect(screen.getByText('Fotoğraf')).toBeInTheDocument()
    expect(screen.getByText('Fizibilite')).toBeInTheDocument()
    expect(screen.getByText('Yayınla')).toBeInTheDocument()
  })

  it('mevcut adımdan önceki adımlar tamamlanmış (✓) gösterilir', () => {
    render(<WizardProgress currentStep={3} />)
    expect(screen.getAllByText('✓')).toHaveLength(2)
  })

  it('mevcut adım numarasını gösterir (tamamlanmamış adım metni ✓ değil)', () => {
    render(<WizardProgress currentStep={3} />)
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('ilk adımda hiçbir adım tamamlanmamış olmalı', () => {
    render(<WizardProgress currentStep={1} />)
    expect(screen.queryByText('✓')).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 4: CSS kapsam guard testini yaz**

`src/components/listing-wizard/WizardProgress.scope.test.ts`:

```ts
import fs from 'fs'
import path from 'path'

const css = fs.readFileSync(path.join(__dirname, 'WizardProgress.module.css'), 'utf8')

describe('WizardProgress mobil kompakt CSS kapsam guard', () => {
  const mediaIndex = css.indexOf('@media (max-width: 768px)')

  it('mobil media query en az bir kez tanımlı olmalı', () => {
    expect(mediaIndex).toBeGreaterThan(-1)
  })

  it('.circle masaüstünde 32px, mobilde kompakt (22px) olmalı', () => {
    const baseIndex = css.indexOf('.circle {')
    expect(baseIndex).toBeGreaterThan(-1)
    expect(baseIndex).toBeLessThan(mediaIndex)
    const baseBlock = css.slice(baseIndex, css.indexOf('}', baseIndex))
    expect(baseBlock).toMatch(/width:\s*32px/)
    const mobileBlock = css.slice(mediaIndex)
    expect(mobileBlock).toMatch(/\.circle\s*\{[^}]*width:\s*22px/)
  })

  it('.label masaüstünde görünür, mobilde gizli olmalı (kompakt nokta/çizgi göstergesi)', () => {
    const baseIndex = css.indexOf('.label {')
    expect(baseIndex).toBeGreaterThan(-1)
    expect(baseIndex).toBeLessThan(mediaIndex)
    const baseBlock = css.slice(baseIndex, css.indexOf('}', baseIndex))
    expect(baseBlock).not.toMatch(/display:\s*none/)
    const mobileBlock = css.slice(mediaIndex)
    expect(mobileBlock).toMatch(/\.label\s*\{[^}]*display:\s*none/)
  })
})
```

- [ ] **Step 5: Testleri çalıştır**

Run: `npx jest src/components/listing-wizard/WizardProgress --no-coverage`
Expected: PASS — 7 test (4 RTL + 3 scope).

- [ ] **Step 6: Statik doğrulama**

Run: `npx tsc --noEmit` → 0 hata.
Run: `npx eslint src/components/listing-wizard --quiet` → 0 ihlal.

- [ ] **Step 7: Commit**

```bash
git add src/components/listing-wizard/WizardProgress.tsx src/components/listing-wizard/WizardProgress.module.css src/components/listing-wizard/WizardProgress.scope.test.ts src/components/listing-wizard/WizardProgress.test.tsx
git commit -m "refactor(wizard): WizardProgress inline stilden CSS module'e taşındı, mobil kompakt nokta göstergesi eklendi"
```

---

### Task 2: `WizardShell` — ortak wizard sayfa iskeleti

**Files:**
- Create: `src/components/listing-wizard/WizardShell.tsx`
- Create: `src/components/listing-wizard/WizardShell.module.css`
- Create: `src/components/listing-wizard/WizardShell.scope.test.ts`
- Create: `src/components/listing-wizard/WizardShell.test.tsx`

**Interfaces:**
- Consumes: `WizardProgress` (Task 1'den, `{ currentStep: number }`), `AppBar` (`src/components/mobile/AppBar`, `{ title, showBack, onBack }`), `StickyActionBar` (`src/components/mobile/StickyActionBar`, `{ children, aboveBottomNav }`).
- Produces: `WizardShell` bileşeni — `{ pageTitle: string; stepTitle: string; step: number; onBack?: () => void; onNext?: () => void; nextDisabled?: boolean; children: React.ReactNode }`. `onBack` verilmezse geri butonu (ne masaüstü ne mobil) render edilmez. `onNext` verilmezse ileri butonu render edilmez (5. adımda kullanılacak — o adımda yayınla/kaydet butonu `children` içindeki step bileşeninin kendi sorumluluğunda kalır, shell'in nav'ı sadece geri gösterir). Task 3/4 bu bileşeni tüketecek.

- [ ] **Step 1: `WizardShell.module.css`'i oluştur**

Mevcut `src/app/listings/new/page.module.css`'in TÜM masaüstü kurallarını (byte-for-byte aynı değerler) buraya taşı, artı yeni mobil bölüm ekle:

```css
.container {
  max-width: 720px;
  margin: 0 auto;
  padding: 2rem 1rem 6rem;
}

.pageTitle {
  font-size: 2rem;
  font-weight: 900;
  color: var(--page-title-color);
  letter-spacing: -1px;
  margin-bottom: 2rem;
}

.card {
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 20px;
  padding: 2rem;
}

.stepTitle {
  font-size: 1.25rem;
  font-weight: 800;
  color: var(--text);
  margin-bottom: 1.5rem;
}

.nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 2rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--border);
}

.backBtn {
  padding: 0.75rem 1.5rem;
  border-radius: 12px;
  background: var(--panel);
  border: 1px solid var(--border);
  color: var(--text);
  font-weight: 700;
  cursor: pointer;
  font-size: 0.9rem;
  transition: border-color 0.15s;
}

.backBtn:hover { border-color: var(--primary); }

.nextBtn {
  padding: 0.75rem 2rem;
  border-radius: 12px;
  background: var(--brand-gradient);
  border: none;
  color: white;
  font-weight: 800;
  cursor: pointer;
  font-size: 0.9rem;
  transition: opacity 0.15s;
}

.nextBtn:disabled { opacity: 0.5; cursor: not-allowed; }

.stickyBackBtn {
  padding: 0.75rem 1rem;
  border-radius: 12px;
  background: var(--panel);
  border: 1px solid var(--border);
  color: var(--text);
  font-weight: 700;
  cursor: pointer;
  font-size: 0.9rem;
}

.stickyNextBtn {
  padding: 0.75rem 1rem;
  border-radius: 12px;
  background: var(--brand-gradient);
  border: none;
  color: white;
  font-weight: 800;
  cursor: pointer;
  font-size: 0.9rem;
}

.stickyNextBtn:disabled { opacity: 0.5; cursor: not-allowed; }

@media (max-width: 768px) {
  .container {
    padding: 1rem 1rem calc(var(--bottomnav-height) + 76px);
  }

  .card { padding: 1.25rem; }

  .pageTitle {
    display: none;
  }

  .stepTitle {
    display: none;
  }

  .nav {
    display: none;
  }
}
```

(Not: `calc(var(--bottomnav-height) + 76px)` alt boşluk formülü `hesapla` sayfasının StickyActionBar+BottomNavbar için kullandığı aynı kalıp — `src/app/hesapla/page.module.css:1372`.)

- [ ] **Step 2: `WizardShell.tsx`'i oluştur**

```tsx
import React from 'react'
import styles from './WizardShell.module.css'
import { WizardProgress } from './WizardProgress'
import { AppBar } from '@/components/mobile/AppBar'
import { StickyActionBar } from '@/components/mobile/StickyActionBar'

interface WizardShellProps {
  pageTitle: string
  stepTitle: string
  step: number
  onBack?: () => void
  onNext?: () => void
  nextDisabled?: boolean
  children: React.ReactNode
}

export function WizardShell({ pageTitle, stepTitle, step, onBack, onNext, nextDisabled, children }: WizardShellProps) {
  return (
    <div className={styles.container}>
      <h1 className={styles.pageTitle}>{pageTitle}</h1>
      <AppBar title={stepTitle} showBack={!!onBack} onBack={onBack} />

      <div className={styles.card}>
        <WizardProgress currentStep={step} />
        <h2 className={styles.stepTitle}>{stepTitle}</h2>

        {children}

        {onNext && (
          <div className={styles.nav}>
            {onBack
              ? <button className={styles.backBtn} onClick={onBack}>← Geri</button>
              : <div />
            }
            <button className={styles.nextBtn} onClick={onNext} disabled={nextDisabled}>
              İleri →
            </button>
          </div>
        )}

        {!onNext && onBack && (
          <div className={styles.nav}>
            <button className={styles.backBtn} onClick={onBack}>← Geri</button>
            <div />
          </div>
        )}
      </div>

      <StickyActionBar aboveBottomNav>
        {onBack && <button className={styles.stickyBackBtn} onClick={onBack}>← Geri</button>}
        {onNext && <button className={styles.stickyNextBtn} onClick={onNext} disabled={nextDisabled}>İleri →</button>}
      </StickyActionBar>
    </div>
  )
}
```

- [ ] **Step 3: RTL wiring testini yaz**

`src/components/listing-wizard/WizardShell.test.tsx`:

```tsx
/** @jest-environment jsdom */
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { WizardShell } from './WizardShell'

const back = jest.fn()
const push = jest.fn()
jest.mock('next/navigation', () => ({ useRouter: () => ({ back, push }) }))

describe('WizardShell', () => {
  beforeEach(() => { back.mockClear(); push.mockClear() })

  it('stepTitle metnini render eder (AppBar başlığı + kart h2)', () => {
    render(
      <WizardShell pageTitle="Yeni İlan Oluştur" stepTitle="Konum Bilgisi" step={1} onNext={() => {}} nextDisabled={false}>
        <div>STEP-CONTENT</div>
      </WizardShell>
    )
    expect(screen.getAllByText('Konum Bilgisi').length).toBeGreaterThan(0)
  })

  it('children içeriğini render eder', () => {
    render(
      <WizardShell pageTitle="X" stepTitle="Y" step={1} onNext={() => {}} nextDisabled={false}>
        <div>STEP-CONTENT</div>
      </WizardShell>
    )
    expect(screen.getByText('STEP-CONTENT')).toBeInTheDocument()
  })

  it('onBack verilmezse hiçbir geri butonu render etmez (1. adım)', () => {
    render(
      <WizardShell pageTitle="X" stepTitle="Y" step={1} onNext={() => {}} nextDisabled={false}>
        {null}
      </WizardShell>
    )
    expect(screen.queryByRole('button', { name: '← Geri' })).not.toBeInTheDocument()
  })

  it('onBack verilirse tıklanınca çağırır (masaüstü VE mobil sticky butonu)', () => {
    const onBack = jest.fn()
    render(
      <WizardShell pageTitle="X" stepTitle="Y" step={2} onBack={onBack} onNext={() => {}} nextDisabled={false}>
        {null}
      </WizardShell>
    )
    const btns = screen.getAllByRole('button', { name: '← Geri' })
    expect(btns.length).toBeGreaterThanOrEqual(2)
    fireEvent.click(btns[0])
    expect(onBack).toHaveBeenCalledTimes(1)
  })

  it('onNext verilmezse ileri butonu render etmez (son adım)', () => {
    render(
      <WizardShell pageTitle="X" stepTitle="Y" step={5} onBack={() => {}}>
        {null}
      </WizardShell>
    )
    expect(screen.queryByRole('button', { name: 'İleri →' })).not.toBeInTheDocument()
  })

  it('nextDisabled true iken ileri butonları disabled olur', () => {
    render(
      <WizardShell pageTitle="X" stepTitle="Y" step={1} onNext={() => {}} nextDisabled>
        {null}
      </WizardShell>
    )
    const btns = screen.getAllByRole('button', { name: 'İleri →' })
    expect(btns.length).toBeGreaterThan(0)
    btns.forEach(btn => expect(btn).toBeDisabled())
  })
})
```

- [ ] **Step 4: CSS kapsam guard testini yaz**

`src/components/listing-wizard/WizardShell.scope.test.ts`:

```ts
import fs from 'fs'
import path from 'path'

const css = fs.readFileSync(path.join(__dirname, 'WizardShell.module.css'), 'utf8')

describe('WizardShell mobil CSS kapsam guard', () => {
  const mediaIndex = css.indexOf('@media (max-width: 768px)')

  it('mobil media query en az bir kez tanımlı olmalı', () => {
    expect(mediaIndex).toBeGreaterThan(-1)
  })

  it('.pageTitle masaüstünde görünür, mobilde gizli olmalı (AppBar zaten başlığı gösteriyor)', () => {
    const baseIndex = css.indexOf('.pageTitle {')
    expect(baseIndex).toBeGreaterThan(-1)
    expect(baseIndex).toBeLessThan(mediaIndex)
    const baseBlock = css.slice(baseIndex, css.indexOf('}', baseIndex))
    expect(baseBlock).not.toMatch(/display:\s*none/)
    const mobileBlock = css.slice(mediaIndex)
    expect(mobileBlock).toMatch(/\.pageTitle\s*\{[^}]*display:\s*none/)
  })

  it('.stepTitle masaüstünde görünür, mobilde gizli olmalı (AppBar aynı metni gösteriyor, çift başlık önlenir)', () => {
    const baseIndex = css.indexOf('.stepTitle {')
    expect(baseIndex).toBeGreaterThan(-1)
    expect(baseIndex).toBeLessThan(mediaIndex)
    const baseBlock = css.slice(baseIndex, css.indexOf('}', baseIndex))
    expect(baseBlock).not.toMatch(/display:\s*none/)
    const mobileBlock = css.slice(mediaIndex)
    expect(mobileBlock).toMatch(/\.stepTitle\s*\{[^}]*display:\s*none/)
  })

  it('.nav masaüstünde görünür, mobilde gizli olmalı (StickyActionBar yerini alıyor)', () => {
    const baseIndex = css.indexOf('.nav {')
    expect(baseIndex).toBeGreaterThan(-1)
    expect(baseIndex).toBeLessThan(mediaIndex)
    const baseBlock = css.slice(baseIndex, css.indexOf('}', baseIndex))
    expect(baseBlock).not.toMatch(/display:\s*none/)
    const mobileBlock = css.slice(mediaIndex)
    expect(mobileBlock).toMatch(/\.nav\s*\{[^}]*display:\s*none/)
  })

  it('.container mobilde StickyActionBar+BottomNavbar için alt boşluk bırakmalı', () => {
    const mobileBlock = css.slice(mediaIndex)
    expect(mobileBlock).toMatch(/\.container\s*\{[^}]*calc\(var\(--bottomnav-height\)\s*\+\s*76px\)/)
  })
})
```

- [ ] **Step 5: Testleri çalıştır**

Run: `npx jest src/components/listing-wizard/WizardShell --no-coverage`
Expected: PASS — 10 test (6 RTL + 4 scope).

- [ ] **Step 6: Statik doğrulama**

Run: `npx tsc --noEmit` → 0 hata.
Run: `npx eslint src/components/listing-wizard --quiet` → 0 ihlal.

- [ ] **Step 7: Commit**

```bash
git add src/components/listing-wizard/WizardShell.tsx src/components/listing-wizard/WizardShell.module.css src/components/listing-wizard/WizardShell.scope.test.ts src/components/listing-wizard/WizardShell.test.tsx
git commit -m "feat(wizard): ortak WizardShell bileşeni — mobilde AppBar+StickyActionBar, masaüstünde mevcut kart+nav birebir"
```

---

### Task 3: `listings/new` sayfasını `WizardShell`'e taşı

**Files:**
- Modify: `src/app/listings/new/page.tsx`
- Modify: `src/components/layout/Navbar.tsx`
- Modify: `src/components/listing-wizard/wizard.module.css`

**Interfaces:**
- Consumes: `WizardShell` (Task 2'den, `{ pageTitle, stepTitle, step, onBack?, onNext?, nextDisabled?, children }`).
- Produces: yok (sayfa seviyesi entegrasyon).

- [ ] **Step 1: `page.tsx`'i `WizardShell` kullanacak şekilde değiştir**

`src/app/listings/new/page.tsx`'in TAMAMINI şununla DEĞİŞTİR:

```tsx
'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { WizardShell } from '@/components/listing-wizard/WizardShell'
import { WizardStep1Location } from '@/components/listing-wizard/WizardStep1Location'
import { WizardStep2Detail } from '@/components/listing-wizard/WizardStep2Detail'
import { WizardStep3Photos } from '@/components/listing-wizard/WizardStep3Photos'
import { WizardStep4Feasibility } from '@/components/listing-wizard/WizardStep4Feasibility'
import { WizardStep5Preview } from '@/components/listing-wizard/WizardStep5Preview'
import { WizardFormData, emptyFormData } from '@/components/listing-wizard/types'

const STEP_TITLES = [
  'Konum Bilgisi',
  'Arsa Detayları',
  'Fotoğraflar',
  'Fizibilite Bağla',
  'Önizle & Yayınla',
]

export default function NewListingPage() {
  const { status } = useSession()
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [form, setForm] = useState<WizardFormData>(emptyFormData)
  const [publishing, setPublishing] = useState(false)
  const [tempId] = useState(() => `temp-${crypto.randomUUID()}`)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
  }, [status, router])

  const update = (patch: Partial<WizardFormData>) => setForm(prev => ({ ...prev, ...patch }))

  const canGoNext = (): boolean => {
    if (step === 1) return !!form.city
    if (step === 2) return !!form.title && !!form.landSizeSqm
    return true
  }

  const handlePublish = async () => {
    setPublishing(true)
    try {
      const res = await fetch('/api/listings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          city: form.city,
          district: form.district || null,
          address: form.address || null,
          title: form.title,
          landSizeSqm: form.landSizeSqm ? Number(form.landSizeSqm) : null,
          price: form.price ? Number(form.price) : null,
          zoning: form.zoning || null,
          titleDeed: form.titleDeed || null,
          description: form.description || null,
          phone: form.phone || null,
          photos: form.photos.map(p => p.url),
          reportId: form.reportId || null,
        }),
      })
      if (res.ok) {
        const listing = await res.json()
        router.push(`/listing/${listing.id}`)
      } else {
        const err = await res.json()
        alert(err.message || 'İlan yayınlanırken bir hata oluştu.')
        setPublishing(false)
      }
    } catch {
      alert('Bir hata oluştu.')
      setPublishing(false)
    }
  }

  if (status === 'loading') return null

  return (
    <WizardShell
      pageTitle="Yeni İlan Oluştur"
      stepTitle={STEP_TITLES[step - 1]}
      step={step}
      onBack={step > 1 ? () => setStep(s => s - 1) : undefined}
      onNext={step < 5 ? () => setStep(s => s + 1) : undefined}
      nextDisabled={!canGoNext()}
    >
      {step === 1 && <WizardStep1Location data={form} onChange={update} />}
      {step === 2 && <WizardStep2Detail data={form} onChange={update} />}
      {step === 3 && <WizardStep3Photos data={form} onChange={update} tempListingId={tempId} />}
      {step === 4 && <WizardStep4Feasibility data={form} onChange={update} />}
      {step === 5 && <WizardStep5Preview data={form} publishing={publishing} onPublish={handlePublish} />}
    </WizardShell>
  )
}
```

- [ ] **Step 2: `Navbar.tsx`'te wizard route'larını mobilde gizle**

`src/components/layout/Navbar.tsx` içinde (satır ~44-49):

```tsx
    const isInbox = pathname.startsWith("/inbox");
    const isProfile = pathname.startsWith("/dashboard/profile");
    const isListingDetail = pathname.startsWith("/listing/");

    // Pages where the top navbar should be HIDDEN on mobile
    const isHiddenOnMobile = isInbox || isProfile || isListingDetail;
```

Şununla DEĞİŞTİR:

```tsx
    const isInbox = pathname.startsWith("/inbox");
    const isProfile = pathname.startsWith("/dashboard/profile");
    const isListingDetail = pathname.startsWith("/listing/");
    const isListingWizard = pathname.startsWith("/listings/");

    // Pages where the top navbar should be HIDDEN on mobile
    const isHiddenOnMobile = isInbox || isProfile || isListingDetail || isListingWizard;
```

(Not: `/listings/` çoğul — hem `/listings/new` hem `/listings/[id]/edit` bu kontrolle eşleşir, `/listing/` tekil — mevcut ilan detay sayfası — ayrı ve dokunulmuyor.)

- [ ] **Step 3: `WizardStep3Photos`'un kaldırma butonuna mobil dokunma hedefi ekle**

`src/components/listing-wizard/wizard.module.css`'in EN SONUNA ekle (mevcut `@media (max-width: 600px)` bloğundan sonra, ayrı yeni bir blok):

```css
@media (max-width: 768px) {
  .photoRemove {
    width: 44px;
    height: 44px;
  }
}
```

- [ ] **Step 4: Testleri çalıştır**

Run: `npx jest --no-coverage`
Expected: mevcut tüm testler PASS (yeni test eklenmedi bu task'ta — sayfa entegrasyonu, davranış değişmedi).

- [ ] **Step 5: Statik doğrulama**

Run: `npx tsc --noEmit` → 0 hata.
Run: `npx eslint src/app/listings src/components/layout/Navbar.tsx --quiet` → 0 ihlal.

- [ ] **Step 6: Masaüstü piksel-parite kontrolü**

Dev server açıksa (`npm run dev:next`), Playwright ile `http://localhost:3000/listings/new` 1440×900'de eski davranışla (kart+alt nav, AppBar/StickyActionBar hiç görünmüyor) karşılaştır. Docker/dev server bu ortamda kapalıysa bu adım Task 9'a (final doğrulama) ertelenir.

- [ ] **Step 7: Commit**

```bash
git add src/app/listings/new/page.tsx src/components/layout/Navbar.tsx src/components/listing-wizard/wizard.module.css
git commit -m "feat(listings/new): mobilde WizardShell'e geçiş (AppBar+kompakt progress+StickyActionBar), masaüstü değişmedi"
```

---

### Task 4: `listings/[id]/edit` sayfasını `WizardShell`'e taşı, ölü CSS'i temizle

**Files:**
- Modify: `src/app/listings/[id]/edit/page.tsx`
- Delete: `src/app/listings/new/page.module.css`

**Interfaces:**
- Consumes: `WizardShell` (Task 2'den, aynen Task 3'teki gibi).
- Produces: yok.

- [ ] **Step 1: `page.tsx`'i `WizardShell` kullanacak şekilde değiştir**

`src/app/listings/[id]/edit/page.tsx`'in TAMAMINI şununla DEĞİŞTİR:

```tsx
'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useParams, useRouter } from 'next/navigation'
import { WizardShell } from '@/components/listing-wizard/WizardShell'
import { WizardStep1Location } from '@/components/listing-wizard/WizardStep1Location'
import { WizardStep2Detail } from '@/components/listing-wizard/WizardStep2Detail'
import { WizardStep3Photos } from '@/components/listing-wizard/WizardStep3Photos'
import { WizardStep4Feasibility } from '@/components/listing-wizard/WizardStep4Feasibility'
import { WizardFormData, emptyFormData } from '@/components/listing-wizard/types'
import wizardStyles from '@/components/listing-wizard/wizard.module.css'

const STEP_TITLES = [
    'Konum Bilgisi',
    'Arsa Detayları',
    'Fotoğraflar',
    'Fizibilite Bağla',
    'Önizle & Kaydet',
]

export default function EditListingPage() {
    const { status } = useSession()
    const router = useRouter()
    const params = useParams()
    const id = params?.id as string
    const [step, setStep] = useState(1)
    const [form, setForm] = useState<WizardFormData>(emptyFormData)
    const [loadingData, setLoadingData] = useState(true)
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        if (status === 'unauthenticated') router.push('/login')
    }, [status, router])

    useEffect(() => {
        if (status !== 'authenticated' || !id) return
        fetch(`/api/listings/${id}`)
            .then(r => r.json())
            .then(listing => {
                if (!listing?.id) { router.push('/marketplace'); return }
                setForm({
                    city: listing.city ?? '',
                    district: listing.district ?? '',
                    address: listing.address ?? '',
                    title: listing.title ?? '',
                    landSizeSqm: listing.landSizeSqm ? String(listing.landSizeSqm) : '',
                    price: listing.price ? String(listing.price) : '',
                    zoning: listing.zoning ?? '',
                    titleDeed: listing.titleDeed ?? '',
                    description: listing.description ?? '',
                    phone: listing.phone ?? '',
                    photos: (listing.photos ?? []).map((url: string) => ({ url, publicId: '' })),
                    reportId: listing.reportId ?? '',
                })
            })
            .catch(() => router.push('/marketplace'))
            .finally(() => setLoadingData(false))
    }, [status, id, router])

    const update = (patch: Partial<WizardFormData>) => setForm(prev => ({ ...prev, ...patch }))

    const canGoNext = (): boolean => {
        if (step === 1) return !!form.city
        if (step === 2) return !!form.title && !!form.landSizeSqm
        return true
    }

    const handleSave = async () => {
        setSaving(true)
        try {
            const res = await fetch(`/api/listings/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    city: form.city,
                    district: form.district || null,
                    address: form.address || null,
                    title: form.title,
                    landSizeSqm: form.landSizeSqm ? Number(form.landSizeSqm) : null,
                    price: form.price ? Number(form.price) : null,
                    zoning: form.zoning || null,
                    titleDeed: form.titleDeed || null,
                    description: form.description || null,
                    phone: form.phone || null,
                    photos: form.photos.map(p => p.url),
                    reportId: form.reportId || null,
                }),
            })
            if (res.ok) {
                router.push(`/listing/${id}`)
            } else {
                const err = await res.json()
                alert(err.message || err.error || 'İlan güncellenirken bir hata oluştu.')
                setSaving(false)
            }
        } catch {
            alert('Bir hata oluştu.')
            setSaving(false)
        }
    }

    if (status === 'loading' || loadingData) return null

    return (
        <WizardShell
            pageTitle="İlanı Düzenle"
            stepTitle={STEP_TITLES[step - 1]}
            step={step}
            onBack={step > 1 ? () => setStep(s => s - 1) : undefined}
            onNext={step < 5 ? () => setStep(s => s + 1) : undefined}
            nextDisabled={!canGoNext()}
        >
            {step === 1 && <WizardStep1Location data={form} onChange={update} />}
            {step === 2 && <WizardStep2Detail data={form} onChange={update} />}
            {step === 3 && <WizardStep3Photos data={form} onChange={update} tempListingId={id} />}
            {step === 4 && <WizardStep4Feasibility data={form} onChange={update} />}
            {step === 5 && (
                <div className={wizardStyles.stepContainer}>
                    <p className={wizardStyles.dropZoneText}>
                        İlanı kaydetmek, tekrar admin onayına gönderecek. Onay sonrası marketplace&apos;te görünür.
                    </p>
                    <button
                        onClick={handleSave}
                        disabled={saving || !form.title || !form.city}
                        className={wizardStyles.editSaveBtn}
                    >
                        {saving ? 'Kaydediliyor...' : '💾 İlanı Kaydet'}
                    </button>
                </div>
            )}
        </WizardShell>
    )
}
```

(Not: eski `style={{padding:'1rem 0'}}`/`<p style={{...}}>` `wizardStyles.stepContainer`/`.dropZoneText`'e taşındı — `dropZoneText` zaten `wizard.module.css`'te var [rengi/boyutu `color:var(--muted)`, `font-size:0.875rem` eski inline stille birebir aynı], yeni sınıf icat edilmedi. **Kasıtlı küçük fark:** eski inline stilde paragrafın `marginBottom:'1.5rem'`'i vardı, `dropZoneText`'te bu yok — ama `stepContainer`'ın `gap:1.25rem`'i [flexbox gap, children'ın kendi margin'inden bağımsız çalışır] paragraf ile buton arasına otomatik boşluk koyuyor, bu yüzden görsel spacing 1.5rem yerine 1.25rem olacak [4px'lik kozmetik fark, yeni bir tek-seferlik değer icat etmek yerine mevcut token'ın kabul edilmesi — implementer/reviewer için bilgi amaçlı not, düzeltilmesi gereken bir hata değil]. Kaydet butonu için `WizardStep5Preview`'un `.publishBtn`'i BİLEREK reuse EDİLMEDİ — `.publishBtn` gradient arkaplan+14px radius kullanıyor, eski buton solid `var(--primary)`+8px radius'tu; ikisini birleştirmek masaüstünde görünür bir renk/şekil değişikliği yaratırdı [Global Constraint: "masaüstü görünümü hiçbir sayfada değişmez"]. Bunun yerine aşağıda piksel-özdeş yeni bir `.editSaveBtn` sınıfı tanımlanıyor.)

- [ ] **Step 2: `wizard.module.css`'e piksel-özdeş `.editSaveBtn` sınıfını ekle**

`src/components/listing-wizard/wizard.module.css`'in EN SONUNA ekle (Task 3'te eklenen `@media (max-width: 768px) { .photoRemove {...} }` bloğundan SONRA):

```css
.editSaveBtn {
  padding: 0.75rem 2rem;
  background: var(--primary);
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 700;
  font-size: 1rem;
  cursor: pointer;
}

.editSaveBtn:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}
```

(Not: değerler eski inline stille birebir aynı — `padding:'0.75rem 2rem'`, `background:'var(--primary)'`, `borderRadius:'8px'`, `fontWeight:700`, `fontSize:'1rem'`. **Disclosed kasıtlı davranış farkı:** eski kodda `cursor` sadece `saving` durumuna bağlıydı [`cursor: saving ? 'not-allowed' : 'pointer'`], `opacity` ise TÜM disabled koşuluna [`saving||!title||!city`] bağlıydı — yani "kaydediliyor değil ama başlık/il eksik" durumunda eski buton `opacity:0.6` [soluk] ama `cursor:'pointer'` gösteriyordu [tutarsız bir orijinal davranış]. `:disabled` pseudo-class'ı native `disabled` attribute'una bakar [`disabled={saving||!form.title||!form.city}`, DEĞİŞMEDİ], bu yüzden yeni CSS bu durumda `cursor:not-allowed` da uygulayacak — eski küçük tutarsızlığı sessizce "düzeltiyor" [buton gerçekten tıklanamazken imleç de bunu yansıtıyor]. Davranışsal fonksiyonellik [hangi durumda tıklanabilir olduğu] AYNI kalıyor, sadece imleç görseli bu kenar durumunda değişiyor — düzeltilmesi gerekmeyen, bilgi amaçlı bir not.)

- [ ] **Step 3: Artık ölü olan `page.module.css`'i sil**

İki sayfa da (`new`, `edit`) artık `WizardShell.module.css` kullanıyor, `src/app/listings/new/page.module.css`'e hiçbir referans kalmadı. Doğrula ve sil:

```bash
grep -rn "listings/new/page.module.css" src/ || echo "REFERANS YOK — silinebilir"
rm src/app/listings/new/page.module.css
```

- [ ] **Step 4: Testleri çalıştır**

Run: `npx jest --no-coverage`
Expected: mevcut tüm testler PASS.

- [ ] **Step 5: Statik doğrulama**

Run: `npx tsc --noEmit` → 0 hata.
Run: `npx eslint "src/app/listings/[id]/edit" --quiet` → 0 ihlal.

- [ ] **Step 6: Masaüstü piksel-parite kontrolü**

Dev server açıksa, Playwright ile `http://localhost:3000/listings/[gerçek-id]/edit` 1440×900'de eski davranışla karşılaştır — Step5'in özel kaydet butonu `.editSaveBtn` ile eski inline stille piksel-özdeş olmalı (solid `var(--primary)` mavi, 8px radius — `WizardStep5Preview`'un gradient `.publishBtn`'i ile KARIŞTIRILMAMALI, bilerek ayrı tutuldu). Docker/dev server kapalıysa Task 9'a ertelenir.

- [ ] **Step 7: Commit**

```bash
git add "src/app/listings/[id]/edit/page.tsx"
git rm src/app/listings/new/page.module.css
git commit -m "feat(listings/edit): mobilde WizardShell'e geçiş, ölü page.module.css silindi (iki tüketici de WizardShell.module.css'e taşındı)"
```

---

### Task 5: Inbox — inline stil temizliği + geri butonu tutarlılığı

**Files:**
- Modify: `src/app/inbox/page.tsx`
- Modify: `src/app/inbox/inbox.module.css`

**Interfaces:**
- Consumes: yok.
- Produces: yok. `AppBar` KULLANILMIYOR (bkz. Global Constraints — `AppBar.title` salt metin, chat başlığındaki avatar+isim düzenini kaybettirir; sadece `.backButton`'a görsel/erişilebilirlik tutarlılığı kazandırılıyor).

- [ ] **Step 1: `inbox.module.css`'e yeni sınıfları ekle**

`src/app/inbox/inbox.module.css`'in `.sendBtn:not(:disabled):hover {...}` kuralından SONRA, `/* Mobile Breakpoints */` yorumundan ÖNCE ekle:

```css
.avatarSidebar {
    width: 56px;
    height: 56px;
    background: var(--primary);
}

.avatarChatHeader {
    width: 36px;
    height: 36px;
    font-size: 0.75rem;
    background: var(--primary);
}

.unreadCountBadge {
    width: 20px;
    height: 20px;
    background: var(--primary);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-size: 0.65rem;
    font-weight: 800;
    margin-left: auto;
    flex-shrink: 0;
}

.emptyConvList {
    padding: 1.5rem;
    color: var(--muted);
    font-size: 0.85rem;
}

.msgTimestamp {
    font-size: 0.6rem;
}

.sendLink {
    color: var(--primary);
    font-weight: 800;
    cursor: pointer;
    padding: 0 8px;
    font-size: 0.95rem;
}

.sendLinkDisabled {
    cursor: not-allowed;
    opacity: 0.5;
}

.emptyChatState {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: var(--muted);
    opacity: 0.6;
}

.emptyChatIcon {
    width: 96px;
    height: 96px;
    border-radius: 50%;
    border: 2px solid currentColor;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 20px;
}

.emptyChatTitle {
    font-size: 1.25rem;
    font-weight: 800;
    color: var(--card-title);
    letter-spacing: -0.5px;
}

.emptyChatText {
    margin-top: 8px;
    font-size: 0.9rem;
    text-align: center;
    max-width: 260px;
}
```

- [ ] **Step 2: `page.tsx`'teki 11 inline stili sınıflarla değiştir**

Aşağıdaki 7 bloğu (11 inline stil sitesi) sırayla değiştir.

**(a) Boş konuşma listesi mesajı** — şunu:
```tsx
                    {filtered.length === 0 && (
                        <div style={{ padding: '1.5rem', color: 'var(--muted)', fontSize: '0.85rem' }}>
                            Henüz mesaj yok.
                        </div>
                    )}
```
şununla DEĞİŞTİR:
```tsx
                    {filtered.length === 0 && (
                        <div className={styles.emptyConvList}>
                            Henüz mesaj yok.
                        </div>
                    )}
```

**(b) Konuşma listesi avatar'ı** — şunu:
```tsx
                            <div className={styles.avatar} style={{ width: 56, height: 56, background: 'var(--primary)' }}>
                                <div style={{ width: '100%', height: '100%', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--primary)', color: 'white', fontWeight: 800 }}>
                                    {avatarInitials(c.otherUser.name)}
                                </div>
                            </div>
```
şununla DEĞİŞTİR:
```tsx
                            <div className={`${styles.avatar} ${styles.avatarSidebar}`}>
                                {avatarInitials(c.otherUser.name)}
                            </div>
```

**(c) Okunmamış rozet** — şunu:
```tsx
                            {c.unreadCount > 0 && (
                                <div style={{ width: 20, height: 20, background: 'var(--primary)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '0.65rem', fontWeight: 800, marginLeft: 'auto', flexShrink: 0 }}>
                                    {c.unreadCount}
                                </div>
                            )}
```
şununla DEĞİŞTİR:
```tsx
                            {c.unreadCount > 0 && (
                                <div className={styles.unreadCountBadge}>
                                    {c.unreadCount}
                                </div>
                            )}
```

**(d) Geri butonu (aria-label + ikon boyutu AppBar ile tutarlı)** — şunu:
```tsx
                            <button className={styles.backButton} onClick={() => setIsMobileChatActive(false)}>
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="15 18 9 12 15 6" />
                                </svg>
                            </button>
```
şununla DEĞİŞTİR:
```tsx
                            <button className={styles.backButton} onClick={() => setIsMobileChatActive(false)} aria-label="Geri">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="15 18 9 12 15 6" />
                                </svg>
                            </button>
```

**(e) Chat başlığı avatar'ı** — şunu:
```tsx
                            <div className={styles.avatar} style={{ width: 36, height: 36, fontSize: '0.75rem', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 800, borderRadius: '50%' }}>
                                {avatarInitials(activeConv.otherUser.name)}
                            </div>
```
şununla DEĞİŞTİR:
```tsx
                            <div className={`${styles.avatar} ${styles.avatarChatHeader}`}>
                                {avatarInitials(activeConv.otherUser.name)}
                            </div>
```

**(f) Mesaj zaman damgası + Gönder linki** — şunu:
```tsx
                                            <div className={styles.msgMeta}>
                                                <span style={{ fontSize: '0.6rem' }}>
                                                    {new Date(msg.createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
```
şununla DEĞİŞTİR:
```tsx
                                            <div className={styles.msgMeta}>
                                                <span className={styles.msgTimestamp}>
                                                    {new Date(msg.createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
```

Ve şunu:
```tsx
                                {draft.trim() && (
                                    <span
                                        onClick={sendMessage}
                                        style={{ color: 'var(--primary)', fontWeight: 800, cursor: sending ? 'not-allowed' : 'pointer', padding: '0 8px', fontSize: '0.95rem', opacity: sending ? 0.5 : 1 }}
                                    >
                                        Gönder
                                    </span>
                                )}
```
şununla DEĞİŞTİR:
```tsx
                                {draft.trim() && (
                                    <span
                                        onClick={sendMessage}
                                        className={`${styles.sendLink} ${sending ? styles.sendLinkDisabled : ''}`}
                                    >
                                        Gönder
                                    </span>
                                )}
```

**(g) Boş sohbet durumu** — şunu:
```tsx
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', opacity: 0.6 }}>
                        <div style={{ width: 96, height: 96, borderRadius: '50%', border: '2px solid currentColor', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                            </svg>
                        </div>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--card-title)', letterSpacing: '-0.5px' }}>Mesajların</h3>
                        <p style={{ marginTop: 8, fontSize: '0.9rem', textAlign: 'center', maxWidth: 260 }}>Soldaki listeden bir konuşma seç.</p>
                    </div>
```
şununla DEĞİŞTİR:
```tsx
                    <div className={styles.emptyChatState}>
                        <div className={styles.emptyChatIcon}>
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                            </svg>
                        </div>
                        <h3 className={styles.emptyChatTitle}>Mesajların</h3>
                        <p className={styles.emptyChatText}>Soldaki listeden bir konuşma seç.</p>
                    </div>
```

- [ ] **Step 3: Doğrula — hiç inline `style={{` kalmadı**

```bash
grep -c "style={{" src/app/inbox/page.tsx
```

Expected: `0`.

- [ ] **Step 4: Testleri çalıştır**

Run: `npx jest --no-coverage`
Expected: mevcut tüm testler PASS.

- [ ] **Step 5: Statik doğrulama**

Run: `npx tsc --noEmit` → 0 hata.
Run: `npx eslint src/app/inbox --quiet` → 0 ihlal.

- [ ] **Step 6: Masaüstü VE mobil görsel kontrol**

Dev server açıksa, Playwright ile `http://localhost:3000/inbox` hem 1440×900 hem 390×844'te eski davranışla (avatar boyutları/renkleri, geri butonu artık 24px+aria-label ama aynı konumda, boş durum bloğu) karşılaştır. Docker/dev server kapalıysa Task 9'a ertelenir.

- [ ] **Step 7: Commit**

```bash
git add src/app/inbox/page.tsx src/app/inbox/inbox.module.css
git commit -m "refactor(inbox): 11 inline stil CSS module'e taşındı, geri butonuna aria-label ve AppBar ile tutarlı ikon boyutu eklendi"
```

---

### Task 6: Login — tam CSS module dönüşümü (JS hack'leri kaldırma)

**Files:**
- Create: `src/app/login/login.module.css`
- Modify: `src/app/login/page.tsx`

**Interfaces:**
- Consumes: yok.
- Produces: yok. `view`/`name`/`email`/`password`/`error`/`loading` state'i ve `handleLogin`/`handleRegister`/`handleForgot` mantığı BİREBİR korunur — sadece stil teslimatı değişiyor.

- [ ] **Step 1: `login.module.css`'i oluştur**

```css
.page {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    overflow: hidden;
    background: var(--bg-body);
    font-family: 'Inter', sans-serif;
}

.orbTop {
    position: absolute;
    top: -10%;
    left: -10%;
    width: 50%;
    height: 50%;
    background: radial-gradient(circle, var(--primary-glow) 0%, transparent 70%);
    filter: blur(80px);
    animation: float 10s ease-in-out infinite;
    z-index: 0;
}

.orbBottom {
    position: absolute;
    bottom: -10%;
    right: -10%;
    width: 60%;
    height: 60%;
    background: radial-gradient(circle, rgba(47, 191, 113, 0.15) 0%, transparent 70%);
    filter: blur(100px);
    animation: float 14s ease-in-out infinite reverse;
    z-index: 0;
}

@keyframes float {
    0% { transform: translateY(0) scale(1); }
    50% { transform: translateY(-30px) scale(1.05); }
    100% { transform: translateY(0) scale(1); }
}

.panel {
    width: 100%;
    max-width: 1000px;
    margin: 0 20px;
    display: grid;
    grid-template-columns: 1fr 1fr;
    background: var(--panel);
    border-radius: 24px;
    box-shadow: var(--shadow);
    border: 1px solid var(--border);
    overflow: hidden;
    z-index: 10;
    position: relative;
    backdrop-filter: blur(20px);
}

.brandSide {
    padding: 4rem;
    display: flex;
    flex-direction: column;
    justify-content: center;
    background: var(--hero-bg);
    color: white;
    position: relative;
    overflow: hidden;
}

.brandPattern {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjIiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wNykiLz48L3N2Zz4=') repeat;
    opacity: 0.5;
}

.brandContent {
    position: relative;
    z-index: 1;
}

.brandLogoRow {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 2rem;
}

.brandLogoText {
    font-size: 2rem;
    font-weight: 800;
    letter-spacing: -1px;
}

.brandHeading {
    font-size: 2.5rem;
    font-weight: 700;
    line-height: 1.2;
    margin-bottom: 1.5rem;
}

.brandHeadingMuted {
    color: rgba(255, 255, 255, 0.8);
}

.brandParagraph {
    font-size: 1rem;
    line-height: 1.6;
    opacity: 0.8;
    max-width: 80%;
}

.formSide {
    padding: 4rem 3rem;
    display: flex;
    flex-direction: column;
    justify-content: center;
    position: relative;
}

.formView {
    animation: fadeSlide 0.4s ease forwards;
}

@keyframes fadeSlide {
    0% { opacity: 0; transform: translateX(15px); }
    100% { opacity: 1; transform: translateX(0); }
}

.formHeader {
    margin-bottom: 2.5rem;
}

.formTitle {
    font-size: 1.8rem;
    font-weight: 800;
    color: var(--card-title);
    margin-bottom: 0.5rem;
}

.formSubtitle {
    color: var(--muted);
    font-size: 0.95rem;
}

.form {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
}

.formCompact {
    gap: 1.2rem;
}

.errorBanner {
    background-color: rgba(var(--red-rgb), 0.1);
    color: var(--red);
    padding: 1rem;
    border-radius: 12px;
    font-size: 0.9rem;
    font-weight: 500;
    border: 1px solid rgba(var(--red-rgb), 0.2);
}

.errorBannerSuccess {
    background-color: rgba(var(--green-rgb), 0.1);
    color: var(--primary);
    border: 1px solid rgba(var(--green-rgb), 0.2);
}

.fieldGroup {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.fieldRow {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.label {
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--label-color);
}

.forgotLink {
    font-size: 0.8rem;
    color: var(--primary);
    font-weight: 600;
    background: none;
    border: none;
    cursor: pointer;
}

.input {
    width: 100%;
    padding: 14px 16px;
    border-radius: 12px;
    border: 1px solid var(--border);
    background: var(--input-bg);
    color: var(--text);
    font-size: 0.95rem;
    outline: none;
    transition: all 0.2s;
}

.input:focus {
    border-color: var(--primary);
    box-shadow: var(--input-focus-shadow);
}

.submitBtn {
    width: 100%;
    padding: 16px;
    margin-top: 0.5rem;
    border-radius: 12px;
    background: var(--primary);
    color: white;
    font-size: 1rem;
    font-weight: 700;
    border: none;
    cursor: pointer;
    transition: all 0.2s;
    box-shadow: 0 4px 14px var(--primary-glow);
}

.submitBtn:disabled {
    background: var(--muted);
    cursor: not-allowed;
    box-shadow: none;
}

.submitBtn:not(:disabled):hover {
    transform: translateY(-2px);
}

.footerText {
    margin-top: 2rem;
    text-align: center;
    font-size: 0.9rem;
    color: var(--muted);
}

.footerLink {
    color: var(--primary);
    font-weight: 700;
    background: none;
    border: none;
    cursor: pointer;
    font-size: 0.9rem;
}

@media (max-width: 768px) {
    .panel {
        grid-template-columns: 1fr;
        max-width: 500px;
    }

    .brandSide {
        padding: 2.5rem;
    }

    .formSide {
        padding: 2.5rem 2rem;
    }

    .input {
        height: var(--input-height-mobile);
        font-size: 16px; /* iOS zoom tetiklenmesin */
        box-sizing: border-box;
    }

    .submitBtn {
        min-height: var(--touch-target);
    }
}
```

(Not: `.panel`'in mobilde `grid-template-columns:1fr`'a düşmesi mevcut davranışı [branding paneli üstte, form altta, ikisi de dikey yığılmış görünür] korur — eski hack'in yaptığı gibi branding paneli GİZLENMİYOR, sadece breakpoint 900px→768px'e düzeltiliyor ve padding değerleri [`2.5rem`/`2.5rem 2rem`] eski `div[style*="padding: 4rem"]`/`div[style*="padding: 4rem 3rem"]` kurallarındaki BİREBİR AYNI değerlerle taşınıyor.)

- [ ] **Step 2: `page.tsx`'i CSS module kullanacak şekilde yeniden yaz**

`src/app/login/page.tsx`'in TAMAMINI şununla DEĞİŞTİR:

```tsx
"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import styles from "./login.module.css";

export default function LoginPage() {
    const [view, setView] = useState<"login" | "register" | "forgot">("login");
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        const res = await signIn("credentials", {
            redirect: false,
            email,
            password,
        });

        if (res?.error) {
            setError(res.error);
            setLoading(false);
        } else {
            window.location.href = "/";
        }
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const res = await fetch("/api/auth/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, email, password, role: "USER" }),
            });

            const data = await res.json();

            if (res.ok) {
                setError("");
                setPassword("");
                setView("login");
            } else {
                setError(data.message || "Kayıt sırasında bir hata oluştu.");
            }
        } catch {
            setError("Bağlantı hatası.");
        } finally {
            setLoading(false);
        }
    };

    const handleForgot = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        // Simüle edilmiş şifre hatırlatma işlemi
        setTimeout(() => {
            setError("Şifre sıfırlama talimatları e-posta adresinize gönderildi.");
            setLoading(false);
            setTimeout(() => {
                setError("");
                setView("login");
            }, 3000);
        }, 1500);
    };

    return (
        <div className={styles.page}>
            <div className={styles.orbTop} />
            <div className={styles.orbBottom} />

            <div className={styles.panel}>
                {/* Left Side: Branding / Intro */}
                <div className={styles.brandSide}>
                    <div className={styles.brandPattern} />

                    <div className={styles.brandContent}>
                        <div className={styles.brandLogoRow}>
                            <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <rect width="40" height="40" rx="12" fill="white" />
                                <circle cx="20" cy="20" r="8" fill="var(--primary)" />
                            </svg>
                            <h2 className={styles.brandLogoText}>ArsaBil</h2>
                        </div>
                        <h1 className={styles.brandHeading}>
                            Geleceğinize <br />
                            <span className={styles.brandHeadingMuted}>Zemin Hazırlayın</span>
                        </h1>
                        <p className={styles.brandParagraph}>
                            Arsanızın gerçek değerini tahmin etmeyin, bilimsel verilerle hesaplayın. Arsa sahipleri ve müteahhitlerin güven noktasına hoş geldiniz.
                        </p>
                    </div>
                </div>

                {/* Right Side: Auth Forms */}
                <div className={styles.formSide}>

                    {/* VIEW: LOGIN */}
                    {view === "login" && (
                        <div className={styles.formView}>
                            <div className={styles.formHeader}>
                                <h2 className={styles.formTitle}>Tekrar Hoş Geldiniz</h2>
                                <p className={styles.formSubtitle}>Lütfen hesabınıza giriş yapın.</p>
                            </div>

                            <form onSubmit={handleLogin} className={styles.form}>
                                {error && (
                                    <div className={`${styles.errorBanner} ${error.includes("gönderildi") ? styles.errorBannerSuccess : ''}`}>
                                        {error}
                                    </div>
                                )}

                                <div className={styles.fieldGroup}>
                                    <label className={styles.label}>E-Posta Adresi</label>
                                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="ornek@mail.com" className={styles.input} />
                                </div>

                                <div className={styles.fieldGroup}>
                                    <div className={styles.fieldRow}>
                                        <label className={styles.label}>Şifre</label>
                                        <button type="button" onClick={() => { setError(""); setView("forgot"); }} className={styles.forgotLink}>Şifremi Unuttum</button>
                                    </div>
                                    <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••" className={styles.input} />
                                </div>

                                <button type="submit" disabled={loading} className={styles.submitBtn}>
                                    {loading ? "Giriş Yapılıyor..." : "Giriş Yap"}
                                </button>
                            </form>

                            <div className={styles.footerText}>
                                Hesabınız yok mu?{" "}
                                <button onClick={() => { setError(""); setView("register"); }} className={styles.footerLink}>Hemen Kayıt Olun</button>
                            </div>
                        </div>
                    )}

                    {/* VIEW: REGISTER */}
                    {view === "register" && (
                        <div className={styles.formView}>
                            <div className={styles.formHeader}>
                                <h2 className={styles.formTitle}>Aramıza Katılın</h2>
                                <p className={styles.formSubtitle}>Sistemi hemen kullanmak için kayıt olun.</p>
                            </div>

                            <form onSubmit={handleRegister} className={`${styles.form} ${styles.formCompact}`}>
                                {error && (
                                    <div className={styles.errorBanner}>
                                        {error}
                                    </div>
                                )}

                                <div className={styles.fieldGroup}>
                                    <label className={styles.label}>Ad Soyad</label>
                                    <input type="text" value={name} onChange={(e) => setName(e.target.value)} required placeholder="Örn: Ahmet Yılmaz" className={styles.input} />
                                </div>

                                <div className={styles.fieldGroup}>
                                    <label className={styles.label}>E-Posta Adresi</label>
                                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="ornek@mail.com" className={styles.input} />
                                </div>

                                <div className={styles.fieldGroup}>
                                    <label className={styles.label}>Şifre</label>
                                    <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••" className={styles.input} />
                                </div>

                                <button type="submit" disabled={loading} className={styles.submitBtn}>
                                    {loading ? "Kayıt Yapılıyor..." : "Kayıt Ol"}
                                </button>
                            </form>

                            <div className={styles.footerText}>
                                Zaten hesabınız var mı?{" "}
                                <button onClick={() => { setError(""); setView("login"); }} className={styles.footerLink}>Giriş Yapın</button>
                            </div>
                        </div>
                    )}

                    {/* VIEW: FORGOT PASSWORD */}
                    {view === "forgot" && (
                        <div className={styles.formView}>
                            <div className={styles.formHeader}>
                                <h2 className={styles.formTitle}>Şifremi Unuttum</h2>
                                <p className={styles.formSubtitle}>E-posta adresinizi girin, sıfırlama talimatlarını gönderelim.</p>
                            </div>

                            <form onSubmit={handleForgot} className={styles.form}>
                                {error && (
                                    <div className={`${styles.errorBanner} ${error.includes("gönderildi") ? styles.errorBannerSuccess : ''}`}>
                                        {error}
                                    </div>
                                )}

                                <div className={styles.fieldGroup}>
                                    <label className={styles.label}>E-Posta Adresi</label>
                                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="ornek@mail.com" className={styles.input} />
                                </div>

                                <button type="submit" disabled={loading} className={styles.submitBtn}>
                                    {loading ? "Gönderiliyor..." : "Bağlantı Gönder"}
                                </button>
                            </form>

                            <div className={styles.footerText}>
                                <button onClick={() => { setError(""); setView("login"); }} className={styles.footerLink}>← Giriş Ekranına Dön</button>
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
}
```

- [ ] **Step 3: CSS + statik kapsam guard testini yaz**

`src/app/login/login.scope.test.ts`:

```ts
import fs from 'fs'
import path from 'path'

const css = fs.readFileSync(path.join(__dirname, 'login.module.css'), 'utf8')
const tsx = fs.readFileSync(path.join(__dirname, 'page.tsx'), 'utf8')

describe('login sayfası mobil CSS kapsam guard', () => {
  const mediaIndex = css.indexOf('@media (max-width: 768px)')

  it('mobil media query en az bir kez tanımlı olmalı', () => {
    expect(mediaIndex).toBeGreaterThan(-1)
  })

  it('.panel masaüstünde 2 kolon, mobilde 1 kolon olmalı', () => {
    const baseIndex = css.indexOf('.panel {')
    expect(baseIndex).toBeGreaterThan(-1)
    expect(baseIndex).toBeLessThan(mediaIndex)
    const baseBlock = css.slice(baseIndex, css.indexOf('}', baseIndex))
    expect(baseBlock).toMatch(/grid-template-columns:\s*1fr 1fr/)
    const mobileBlock = css.slice(mediaIndex)
    expect(mobileBlock).toMatch(/\.panel\s*\{[^}]*grid-template-columns:\s*1fr;/)
  })

  it('.input mobilde --input-height-mobile ve 16px font-size kullanmalı (iOS zoom önleme)', () => {
    const mobileBlock = css.slice(mediaIndex)
    expect(mobileBlock).toMatch(/\.input\s*\{[^}]*height:\s*var\(--input-height-mobile\)/)
    expect(mobileBlock).toMatch(/\.input\s*\{[^}]*font-size:\s*16px/)
  })

  it('page.tsx artık dangerouslySetInnerHTML kullanmamalı (stil enjeksiyon hack\'i kaldırıldı)', () => {
    expect(tsx).not.toMatch(/dangerouslySetInnerHTML/)
  })

  it('page.tsx artık JS ile stil mutasyonu yapmamalı (gerçek :focus/:hover CSS\'e taşındı)', () => {
    expect(tsx).not.toMatch(/\.target\.style/)
    expect(tsx).not.toMatch(/currentTarget\.style/)
  })

  it('page.tsx artık inline style={{}} kullanmamalı', () => {
    expect(tsx).not.toMatch(/style=\{\{/)
  })
})
```

- [ ] **Step 4: Testleri çalıştır (RED önce beklenmiyor — bu bir dönüşüm task'ı, testler dönüşüm SONRASI dosya durumunu doğruluyor)**

Run: `npx jest src/app/login --no-coverage`
Expected: PASS — 6 test.

- [ ] **Step 5: Statik doğrulama**

Run: `npx tsc --noEmit` → 0 hata.
Run: `npx eslint src/app/login --quiet` → 0 ihlal.

- [ ] **Step 6: Tam test paketi**

Run: `npx jest --no-coverage`
Expected: mevcut tüm testler PASS (login'e özel yeni davranış eklenmedi, sadece stil teslimatı değişti).

- [ ] **Step 7: Masaüstü VE mobil görsel kontrol**

Dev server açıksa, Playwright ile `http://localhost:3000/login` hem 1440×900 (2 kolon, branding paneli solda, form sağda — eskiyle piksel-benzer) hem 390×844'te (1 kolon, branding üstte form altta, gerçek `:focus` halkası input'a tıklanınca görünüyor mu, input yüksekliği 48px) doğrula. `view` state geçişlerini (login→register→forgot→login) test et. Docker/dev server kapalıysa Task 9'a ertelenir.

- [ ] **Step 8: Commit**

```bash
git add src/app/login/page.tsx src/app/login/login.module.css src/app/login/login.scope.test.ts
git commit -m "refactor(login): tüm inline stiller + JS focus/blur simülasyonu + dangerouslySetInnerHTML hack'i kaldırıldı, login.module.css'e taşındı, breakpoint 900px→768px düzeltildi"
```

---

### Task 7: Register — CSS module dönüşümü

**Files:**
- Create: `src/app/register/register.module.css`
- Modify: `src/app/register/page.tsx`

**Interfaces:**
- Consumes: `Card`/`Input`/`Button` (`@/components/ui/*`, DEĞİŞMİYOR).
- Produces: yok.

- [ ] **Step 1: `register.module.css`'i oluştur**

```css
.page {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--panel);
}

.column {
    width: 100%;
    max-width: 450px;
}

.header {
    text-align: center;
    margin-bottom: 2rem;
}

.logo {
    color: var(--primary);
    font-weight: 700;
    letter-spacing: -0.5px;
}

.subtitle {
    color: var(--muted);
    margin-top: 0.5rem;
}

.form {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.errorBanner {
    background-color: rgba(239, 68, 68, 0.1);
    color: var(--red);
    padding: 0.75rem;
    border-radius: var(--radius-md);
    font-size: 0.9rem;
}

.submitRow {
    margin-top: 1rem;
}

.footerText {
    margin-top: 1.5rem;
    text-align: center;
    font-size: 0.9rem;
    color: var(--muted);
}

.footerLink {
    color: var(--primary);
    font-weight: 600;
}

@media (max-width: 768px) {
    .page {
        padding: 0 1rem;
    }

    .header {
        margin-bottom: 1.5rem;
    }
}
```

(Not: `Input` bileşeni [`Input.module.css`] zaten `font-size:1rem` [=16px, iOS zoom eşiğini geçiyor] kullanıyor — Global Constraint gereği `Card`/`Input`/`Button`'a dokunulmadığı için mobil input yüksekliği burada zorlanmıyor, paylaşılan bileşenin mevcut değeri kabul ediliyor.)

- [ ] **Step 2: `page.tsx`'i CSS module kullanacak şekilde yeniden yaz**

`src/app/register/page.tsx`'in TAMAMINI şununla DEĞİŞTİR:

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import styles from "./register.module.css";

export default function RegisterPage() {
    const router = useRouter();
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const res = await fetch("/api/auth/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, email, password, role: "USER" }),
            });

            const data = await res.json();

            if (res.ok) {
                router.push("/login"); // Kayıt başarılıysa girişe yönlendir
            } else {
                setError(data.message || "Kayıt sırasında bir hata oluştu.");
                setLoading(false);
            }
        } catch {
            setError("Bağlantı hatası.");
            setLoading(false);
        }
    };

    return (
        <div className={styles.page}>
            <div className={styles.column}>
                <div className={styles.header}>
                    <h1 className={styles.logo}>ARSABİL</h1>
                    <p className={styles.subtitle}>Sisteme Kayıt Olun</p>
                </div>

                <Card>
                    <form onSubmit={handleSubmit} className={styles.form}>
                        {error && (
                            <div className={styles.errorBanner}>
                                {error}
                            </div>
                        )}

                        <Input
                            label="Ad Soyad"
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                        />

                        <Input
                            label="E-Posta Adresi"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />

                        <Input
                            label="Şifre"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />

                        <div className={styles.submitRow}>
                            <Button type="submit" variant="primary" fullWidth disabled={loading}>
                                {loading ? "Kayıt Yapılıyor..." : "Kayıt Ol"}
                            </Button>
                        </div>
                    </form>

                    <div className={styles.footerText}>
                        Zaten hesabınız var mı?{" "}
                        <Link href="/login" className={styles.footerLink}>
                            Giriş Yapın
                        </Link>
                    </div>
                </Card>
            </div>
        </div>
    );
}
```

- [ ] **Step 3: CSS + statik kapsam guard testini yaz**

`src/app/register/register.scope.test.ts`:

```ts
import fs from 'fs'
import path from 'path'

const css = fs.readFileSync(path.join(__dirname, 'register.module.css'), 'utf8')
const tsx = fs.readFileSync(path.join(__dirname, 'page.tsx'), 'utf8')

describe('register sayfası mobil CSS kapsam guard', () => {
  it('mobil media query en az bir kez tanımlı olmalı', () => {
    expect(css.indexOf('@media (max-width: 768px)')).toBeGreaterThan(-1)
  })

  it('page.tsx artık inline style={{}} kullanmamalı', () => {
    expect(tsx).not.toMatch(/style=\{\{/)
  })

  it('page.tsx Card/Input/Button bileşenlerini hâlâ import ediyor olmalı (paylaşılan bileşenlere dokunulmadı)', () => {
    expect(tsx).toMatch(/from "@\/components\/ui\/Card"/)
    expect(tsx).toMatch(/from "@\/components\/ui\/Input"/)
    expect(tsx).toMatch(/from "@\/components\/ui\/Button"/)
  })
})
```

- [ ] **Step 4: Testleri çalıştır**

Run: `npx jest src/app/register --no-coverage`
Expected: PASS — 3 test.

- [ ] **Step 5: Statik doğrulama**

Run: `npx tsc --noEmit` → 0 hata.
Run: `npx eslint src/app/register --quiet` → 0 ihlal.

- [ ] **Step 6: Tam test paketi**

Run: `npx jest --no-coverage`
Expected: mevcut tüm testler PASS.

- [ ] **Step 7: Masaüstü VE mobil görsel kontrol**

Dev server açıksa, Playwright ile `http://localhost:3000/register` hem 1440×900 hem 390×844'te eski davranışla karşılaştır. Docker/dev server kapalıysa Task 9'a ertelenir.

- [ ] **Step 8: Commit**

```bash
git add src/app/register/page.tsx src/app/register/register.module.css src/app/register/register.scope.test.ts
git commit -m "refactor(register): kalan 10 inline stil register.module.css'e taşındı, mobil padding ayarlandı, Card/Input/Button dokunulmadı"
```

---

### Task 8: BottomNavbar — login/register'da gizle

**Files:**
- Modify: `src/components/layout/BottomNavbar.tsx`
- Create: `src/components/layout/__tests__/BottomNavbar.test.tsx`

**Interfaces:**
- Consumes: `usePathname` (`next/navigation`, zaten kullanılıyor).
- Produces: yok.

- [ ] **Step 1: Failing testi yaz**

`src/components/layout/__tests__/BottomNavbar.test.tsx`:

```tsx
/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { BottomNavbar } from '../BottomNavbar'

let mockPathname = '/marketplace'
jest.mock('next/navigation', () => ({ usePathname: () => mockPathname }))

describe('BottomNavbar', () => {
  it('normal bir sayfada (marketplace) render edilir', () => {
    mockPathname = '/marketplace'
    render(<BottomNavbar />)
    expect(screen.getByRole('navigation')).toBeInTheDocument()
  })

  it('/login sayfasında render edilmez (auth öncesi, oturum gerektiren sekmeler anlamsız)', () => {
    mockPathname = '/login'
    render(<BottomNavbar />)
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument()
  })

  it('/register sayfasında render edilmez', () => {
    mockPathname = '/register'
    render(<BottomNavbar />)
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Testi çalıştır, başarısız olduğunu doğrula**

Run: `npx jest src/components/layout/__tests__/BottomNavbar.test.tsx --no-coverage`
Expected: FAIL — ilk 2 test geçer (BottomNavbar şu an her zaman render ediyor), son 2 test ("render edilmez") başarısız olur.

- [ ] **Step 3: `BottomNavbar.tsx`'e pathname kontrolü ekle**

`src/components/layout/BottomNavbar.tsx` içinde (satır 8-11):

```tsx
export function BottomNavbar() {
    const pathname = usePathname();

    return (
```

Şununla DEĞİŞTİR:

```tsx
export function BottomNavbar() {
    const pathname = usePathname();

    if (pathname === '/login' || pathname === '/register') return null;

    return (
```

- [ ] **Step 4: Testi çalıştır, geçtiğini doğrula**

Run: `npx jest src/components/layout/__tests__/BottomNavbar.test.tsx --no-coverage`
Expected: PASS — 3/3.

- [ ] **Step 5: Tam test paketi + statik doğrulama**

Run: `npx jest --no-coverage` → tüm testler PASS.
Run: `npx tsc --noEmit` → 0 hata.
Run: `npx eslint src/components/layout --quiet` → 0 ihlal.

- [ ] **Step 6: Commit**

```bash
git add src/components/layout/BottomNavbar.tsx src/components/layout/__tests__/BottomNavbar.test.tsx
git commit -m "fix(layout): BottomNavbar login/register sayfalarında gizlenir (auth öncesi oturum gerektiren sekmeleri göstermek yanıltıcıydı)"
```

---

### Task 9: Final doğrulama — tam komut paketi + Playwright (4 akış × mobil/masaüstü)

**Files:** Yok (doğrulama task'ı).

**Interfaces:** Yok.

- [ ] **Step 1: Dev ortamının ayakta olduğunu doğrula**

Docker Desktop kapalıysa başlat, `docker compose -f docker-compose.dev.yml up -d`, `npm run dev:next`. `http://localhost:3000/login` HTTP 200 dönmeli.

- [ ] **Step 2: Tam komut paketi**

Run: `npx tsc --noEmit && npx eslint src --quiet && npx jest --no-coverage && npm run build`
Expected: tsc 0, eslint 0, jest tüm testler PASS, build başarılı.

- [ ] **Step 3: Wizard akışı — mobil (390×844) ve masaüstü (1440×900)**

Playwright ile giriş yap (`manualcheck@local.test`/`Test1234!`), `/listings/new`'e git:
- Mobil: AppBar başlığı ("Konum Bilgisi" vb.) görünüyor mu, kompakt progress (nokta, etiket yok) görünüyor mu, StickyActionBar'da Geri/İleri çalışıyor mu, 5. adımda sadece Geri + yayınla butonu (step içeriğinde) görünüyor mu, yatay taşma yok mu?
- Masaüstü: eski görünüm birebir (kart+numaralı progress+alt nav), AppBar/StickyActionBar hiç görünmüyor mu?
- Aynı kontrolleri gerçek bir ilanla `/listings/[id]/edit`'te tekrarla (Step5'in özel kaydet butonu dahil).

- [ ] **Step 4: Inbox akışı — mobil ve masaüstü**

- Mobil: konuşma listesi→chat geçişi (translateX animasyonu) hâlâ çalışıyor mu, geri butonu (24px, aria-label) doğru konumda mı, avatar boyutları/renkleri değişmedi mi?
- Masaüstü: iki panel yan yana, hiçbir fark yok.

- [ ] **Step 5: Login/Register akışı — oturumsuz, mobil ve masaüstü**

- `/login`'e git (oturum açmadan): mobilde 1 kolon (branding üstte, form altta), gerçek `:focus` halkası (input'a tıkla, kenarlık rengi değişiyor mu), input yüksekliği 48px, `view` geçişleri (Şifremi Unuttum→Giriş Ekranına Dön, Hemen Kayıt Olun) çalışıyor mu.
- Masaüstünde 2 kolon (branding solda, form sağda), eski görünümle piksel-benzer.
- `/register`'e git, mobilde/masaüstünde form + Card görünümü doğru mu.
- **Her iki sayfada da BottomNavbar GÖRÜNMÜYOR mu (mobilde)?**

- [ ] **Step 6: Yatay taşma kontrolü**

Her 6 URL'de (`/listings/new`, `/listings/[id]/edit`, `/inbox`, `/login`, `/register`, + zaten test edilmiş sayfalardan biri referans) 390×844'te `document.documentElement.scrollWidth <= window.innerWidth` doğrula.

- [ ] **Step 7: Sorun bulunursa düzelt + commit; yoksa final rapor**

Sorun yoksa atlanır. Bulunursa küçük düzeltme + ayrı commit + tekrar doğrulama.
