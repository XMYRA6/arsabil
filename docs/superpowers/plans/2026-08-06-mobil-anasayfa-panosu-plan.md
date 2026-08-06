# Mobil Ana Sayfa (Giriş Yapmış Kullanıcı Panosu) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Giriş yapmış bir kullanıcı, alt navigasyondan "Ana sayfa" sekmesine dokununca — mobil viewport'ta — artık tam pazarlama sayfasını değil, sıfırdan tasarlanmış bir uygulama panosu (`HomeMobile`) görür: istatistik özeti + hızlı eylem grid'i, son hesaplamaları, son mesaj/teklif önizlemesi. Anonim ziyaretçi ve masaüstü davranışı (giriş yapmış olsa bile) **hiç değişmez**.

**Architecture:** `src/app/page.tsx`, `/hesapla/page.tsx`'in zaten kurduğu `matchMedia` tabanlı viewport-dallanma desenine bir `useSession()` ekseni ekler. Mevcut 835 satırlık pazarlama JSX'i olduğu gibi `MarketingHomePage()` adlı ayrı bir fonksiyona taşınır (davranışı değişmez); yeni bir `HomeMobile` bileşeni yalnızca giriş yapmış + mobil durumunda render edilir ve zaten var olan `/api/user/dashboard` endpoint'ini tüketir (yeni backend yok). `Navbar.tsx` bu yeni ekranda çift üst-çubuk oluşmasını önlemek için bir satırlık bir koşulla genişletilir.

**Tech Stack:** Next.js (App Router, client component), next-auth `useSession`, React `useState`/`useEffect`, Jest + Testing Library.

## Global Constraints

- Anonim ziyaretçi deneyimi (mobil ya da masaüstü) **hiç değişmez** — `MarketingHomePage` mevcut JSX'in birebir taşınmış hali, davranış/görsel fark olmamalı.
- Giriş yapmış + masaüstü deneyimi **hiç değişmez** — bu round'un kapsamı yalnızca giriş yapmış + mobil.
- Eylem grid'i rotaları `/dashboard/page.tsx:184-189`'daki mevcut `quickActions` hedefleriyle birebir aynı: Hesapla → `/hesapla`, İlan Ver → `/listings/new`, Mesajlar → `/inbox`, Pazar Yeri → `/marketplace`.
- Boş durumlar: hiç rapor yoksa "Henüz hesaplama yok. Hesapla →" (`/dashboard/page.tsx:116` metni aynen); mesaj VE teklif ikisi de yoksa `RecentActivityRows` bölümü hiç render edilmez; biri varsa bölüm görünür, boş olan alt-bölüm kendi içinde `/dashboard/page.tsx:143-144`/`:164-165`'teki aynı "Mesaj yok."/"Teklif yok." metnini gösterir.
- Görsel dil: yalnızca globals.css'te zaten tanımlı `--m-*` custom property'leri (`--m-glass-bg`, `--m-glass-border`, `--m-glass-blur`, `--m-r-card`, `--m-ink`, `--m-body`, `--m-fill`, `--m-sh-card` vb.) — yeni bir renk/blur değeri icat edilmez.
- Düzen: onaylanan "B" mockup'ı — istatistik kartları + 4'lü eylem grid'i en üstte, altında liste bölümleri. Hesapla diğer üç eylemle eşit görsel ağırlıkta bir grid kutusu, tek başına büyük bir hero kart değil.
- `DashboardData` tipi kopyalanmaz — `dashboard/page.tsx`'ten `export` edilip import edilir.
- No new dependencies. `npx tsc --noEmit` ve `npx jest --no-coverage --roots "<rootDir>/src"` (ana checkout'ta bilinen worktree-collision nedeniyle bu komut) her task'tan sonra yeşil kalmalı.

---

## File Map

| File | Change |
|---|---|
| `src/app/dashboard/page.tsx` | `interface DashboardData` → `export interface DashboardData` (tek satır) |
| `src/app/mobile/QuickActionGrid.tsx` | Yeni — istatistik kartları + 4'lü eylem grid'i |
| `src/app/mobile/QuickActionGrid.test.tsx` | Yeni |
| `src/app/mobile/RecentReportsList.tsx` | Yeni — son hesaplamalarım listesi |
| `src/app/mobile/RecentReportsList.test.tsx` | Yeni |
| `src/app/mobile/RecentActivityRows.tsx` | Yeni — son mesaj + son teklif |
| `src/app/mobile/RecentActivityRows.test.tsx` | Yeni |
| `src/app/mobile/HomeMobile.tsx` | Yeni — orkestratör (fetch + loading/error + kompozisyon) |
| `src/app/mobile/HomeMobile.test.tsx` | Yeni |
| `src/app/mobile/mobile.module.css` | Yeni — yukarıdaki 4 bileşenin stilleri |
| `src/app/page.tsx` | Mevcut JSX `MarketingHomePage()`'e taşınır; `useSession` + viewport dallanması eklenir |
| `src/app/page.module.css` | + `.viewportIskelet` (varsa mevcut bir eşdeğeri yeniden kullanılır, yoksa eklenir) |
| `src/app/page.test.tsx` | Yeni — 3 dallanma durumu |
| `src/components/layout/Navbar.tsx` | `isHiddenOnMobile`'a bir koşul eklenir (satır ~50) |

---

### Task 1: `DashboardData` tipini dışa aktar

**Files:**
- Modify: `src/app/dashboard/page.tsx`

**Interfaces:**
- Produces: `export interface DashboardData { stats: {...}, recentReports: [...], recentMessages: [...], recentOffers: [...] }` — Task 5 (`HomeMobile.tsx`) bunu import eder.

- [ ] **Step 1: Tek satırlık değişiklik**

`src/app/dashboard/page.tsx`'te (satır 9 civarı) mevcut:

```ts
interface DashboardData {
```

şuna değişir:

```ts
export interface DashboardData {
```

Dosyanın geri kalanı (içerik, kullanım) değişmez.

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: 0 hata (bir interface'i export etmek geriye dönük uyumludur, mevcut hiçbir kullanım bozulmaz).

- [ ] **Step 3: Commit**

```bash
git add src/app/dashboard/page.tsx
git commit -m "refactor(dashboard): DashboardData tipini disa aktar (mobil ana sayfa panosu icin)"
```

---

### Task 2: `RecentReportsList` bileşeni

**Files:**
- Create: `src/app/mobile/RecentReportsList.tsx`
- Create: `src/app/mobile/mobile.module.css` (bu task'ta oluşturulur; Task 3/4/5 aynı dosyaya kendi sınıflarını **ekler**, yeniden oluşturmaz)
- Test: `src/app/mobile/RecentReportsList.test.tsx`

**Interfaces:**
- Consumes: `DashboardData['recentReports']` (Task 1).
- Produces: `RecentReportsListProps = { reports: DashboardData['recentReports'] }`, `export function RecentReportsList(props: RecentReportsListProps)`.

- [ ] **Step 1: Write the failing tests**

```tsx
/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react'
import { RecentReportsList } from './RecentReportsList'

const REPORTS = [
    { id: 'r1', title: 'Kadıköy Parseli', createdAt: '2026-08-01T10:00:00.000Z', landShareRatio: 0.42, minApartmentPrice: 8900000 },
    { id: 'r2', title: 'Beşiktaş Projesi', createdAt: '2026-08-02T10:00:00.000Z', landShareRatio: 0.38, minApartmentPrice: 14200000 },
]

describe('RecentReportsList', () => {
    it('rapor listesini gösterir', () => {
        render(<RecentReportsList reports={REPORTS} />)
        expect(screen.getByText('Kadıköy Parseli')).toBeInTheDocument()
        expect(screen.getByText('Beşiktaş Projesi')).toBeInTheDocument()
    })

    it('arsa payi ve fiyati dogru bicimde gosterir', () => {
        render(<RecentReportsList reports={REPORTS} />)
        expect(screen.getByText(/Arsa payı: %42/)).toBeInTheDocument()
        expect(screen.getByText(/8.900.000/)).toBeInTheDocument()
    })

    it('her satir dogru hesapla linkine gider', () => {
        render(<RecentReportsList reports={REPORTS} />)
        expect(screen.getByRole('link', { name: /Kadıköy Parseli/ })).toHaveAttribute('href', '/hesapla?reportId=r1')
    })

    it('bos durumda "Henuz hesaplama yok" mesaji ve Hesapla linki gosterir', () => {
        render(<RecentReportsList reports={[]} />)
        expect(screen.getByText(/Henüz hesaplama yok/)).toBeInTheDocument()
        expect(screen.getByRole('link', { name: /Hesapla/ })).toHaveAttribute('href', '/hesapla')
    })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest src/app/mobile/RecentReportsList.test.tsx --no-coverage`
Expected: FAIL — module not found.

- [ ] **Step 3: Create the shared CSS module**

Create `src/app/mobile/mobile.module.css` — bu, Task 2/3/4/5'in tüm bileşenlerinin paylaştığı TEK CSS modülü (`/hesapla/mobile/mobile.module.css` ile aynı desen: orada da tüm mobil `/hesapla` bileşenleri tek dosyayı paylaşır). Bu adımda yalnızca `RecentReportsList`'in kullandığı sınıflar eklenir; Task 3/4/5 dosyanın **aynı `@media` bloğunun içine** kendi sınıflarını ekleyecek.

```css
@media (max-width: 768px) {
    .section {
        display: flex;
        flex-direction: column;
        gap: 8px;
    }

    .sectionTitle {
        font: 800 11px Inter, sans-serif;
        letter-spacing: .6px;
        text-transform: uppercase;
        color: var(--m-body);
        margin: 0 2px;
    }

    .listStack {
        display: flex;
        flex-direction: column;
        gap: 8px;
    }

    .listRow {
        display: flex;
        flex-direction: column;
        gap: 3px;
        padding: 12px 14px;
        border-radius: var(--m-r-card);
        background: var(--m-glass-bg);
        border: 1px solid var(--m-glass-border);
        backdrop-filter: var(--m-glass-blur);
        -webkit-backdrop-filter: var(--m-glass-blur);
        text-decoration: none;
        color: inherit;
    }

    .listTitle {
        font: 700 12.5px Inter, sans-serif;
        color: var(--m-ink);
    }

    .listMeta {
        font: 600 10.5px Inter, sans-serif;
        color: var(--m-body);
    }

    .emptyNote {
        margin: 0;
        padding: 12px 14px;
        border-radius: var(--m-r-card);
        background: var(--m-fill);
        font: 600 12px Inter, sans-serif;
        color: var(--m-body);
    }

    .emptyLink {
        color: var(--m-link);
        font-weight: 700;
    }
}
```

- [ ] **Step 4: Implement**

Create `src/app/mobile/RecentReportsList.tsx`:

```tsx
"use client";

import Link from 'next/link';
import type { DashboardData } from '../dashboard/page';
import styles from './mobile.module.css';

export type RecentReportsListProps = {
    reports: DashboardData['recentReports'];
};

const trFormat = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 });

/** `/dashboard` panosunun mobil karşılığı — aynı veri, sıfırdan mobil-özel görünüm. */
export function RecentReportsList({ reports }: RecentReportsListProps) {
    if (reports.length === 0) {
        return (
            <section className={styles.section}>
                <h2 className={styles.sectionTitle}>Son Hesaplamalarım</h2>
                <p className={styles.emptyNote}>
                    Henüz hesaplama yok. <Link href="/hesapla" className={styles.emptyLink}>Hesapla →</Link>
                </p>
            </section>
        );
    }

    return (
        <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Son Hesaplamalarım</h2>
            <div className={styles.listStack}>
                {reports.map(r => (
                    <Link key={r.id} href={`/hesapla?reportId=${r.id}`} className={styles.listRow}>
                        <span className={styles.listTitle}>{r.title}</span>
                        <span className={styles.listMeta}>
                            Arsa payı: %{Math.round(r.landShareRatio * 100)} · Min. daire: {trFormat.format(r.minApartmentPrice)} ₺
                        </span>
                    </Link>
                ))}
            </div>
        </section>
    );
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx jest src/app/mobile/RecentReportsList.test.tsx --no-coverage`
Expected: PASS, 4/4.

- [ ] **Step 6: Commit**

```bash
git add src/app/mobile/RecentReportsList.tsx src/app/mobile/mobile.module.css src/app/mobile/RecentReportsList.test.tsx
git commit -m "feat(mobile-home): RecentReportsList bileseni + paylasilan mobile.module.css"
```

---

### Task 3: `RecentActivityRows` bileşeni

**Files:**
- Create: `src/app/mobile/RecentActivityRows.tsx`
- Modify: `src/app/mobile/mobile.module.css` (Task 2'de oluşturuldu; bu task kendi sınıflarını aynı `@media` bloğunun içine ekler)
- Test: `src/app/mobile/RecentActivityRows.test.tsx`

**Interfaces:**
- Consumes: `DashboardData['recentMessages']`, `DashboardData['recentOffers']` (Task 1).
- Produces: `RecentActivityRowsProps = { messages: DashboardData['recentMessages']; offers: DashboardData['recentOffers'] }`, `export function RecentActivityRows(props: RecentActivityRowsProps)`.

- [ ] **Step 1: Write the failing tests**

```tsx
/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react'
import { RecentActivityRows } from './RecentActivityRows'

const MESSAGE = { id: 'm1', content: 'Teklifinizi değerlendiriyoruz...', createdAt: '2026-08-01T10:00:00.000Z', sender: { id: 'u1', name: 'Ahmet Y.', image: null } }
const OFFER = { id: 'o1', offeredShare: 33, status: 'PENDING', createdAt: '2026-08-01T10:00:00.000Z', listing: { id: 'l1', title: 'Kadıköy Arsa', city: 'İstanbul' }, bidder: { id: 'u2', name: 'Zeynep K.' } }

describe('RecentActivityRows', () => {
    it('mesaj VE teklif ikisi de bosken hic render edilmez', () => {
        const { container } = render(<RecentActivityRows messages={[]} offers={[]} />)
        expect(container).toBeEmptyDOMElement()
    })

    it('yalnizca mesaj varken mesaji gosterir, teklif alaninda "Teklif yok" yazar', () => {
        render(<RecentActivityRows messages={[MESSAGE]} offers={[]} />)
        expect(screen.getByText('Ahmet Y.')).toBeInTheDocument()
        expect(screen.getByText(/Teklifinizi değerlendiriyoruz/)).toBeInTheDocument()
        expect(screen.getByText('Teklif yok.')).toBeInTheDocument()
    })

    it('yalnizca teklif varken teklifi gosterir, mesaj alaninda "Mesaj yok" yazar', () => {
        render(<RecentActivityRows messages={[]} offers={[OFFER]} />)
        expect(screen.getByText('Mesaj yok.')).toBeInTheDocument()
        expect(screen.getByText(/%33 pay/)).toBeInTheDocument()
        expect(screen.getByText('Kadıköy Arsa')).toBeInTheDocument()
    })

    it('mesaj linki /inbox?with=gonderenId ye gider', () => {
        render(<RecentActivityRows messages={[MESSAGE]} offers={[]} />)
        expect(screen.getByRole('link', { name: /Ahmet Y\./ })).toHaveAttribute('href', '/inbox?with=u1')
    })

    it('teklif linki ilgili ilana gider', () => {
        render(<RecentActivityRows messages={[]} offers={[OFFER]} />)
        expect(screen.getByRole('link', { name: /Kadıköy Arsa/ })).toHaveAttribute('href', '/listing/l1')
    })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest src/app/mobile/RecentActivityRows.test.tsx --no-coverage`
Expected: FAIL — module not found.

- [ ] **Step 3: `mobile.module.css`'e yeni sınıfları ekle**

`src/app/mobile/mobile.module.css` Task 2'de oluşturuldu ve `.section`/`.sectionTitle`/`.listRow`/`.listTitle`/`.listMeta` sınıflarını zaten içeriyor — `RecentActivityRows` bunları aynen yeniden kullanır (mesaj/teklif satırları da birer `.listRow`). Yalnızca boş-alt-bölüm ve teklif-durumu için kullanılan **yeni** sınıflar, aynı `@media (max-width: 768px) { ... }` bloğunun İÇİNE, mevcut kuralların altına eklenir:

```css
    .activityEmptyRow {
        padding: 10px 14px;
        border-radius: var(--m-r-inner);
        background: var(--m-fill);
        font: 600 11.5px Inter, sans-serif;
        color: var(--m-body);
    }

    .statusPending { color: var(--m-body); }
    .statusAccepted { color: var(--m-success-text); }
    .statusRejected { color: var(--m-danger); }
```

- [ ] **Step 4: Implement `RecentActivityRows`**

Create `src/app/mobile/RecentActivityRows.tsx`:

```tsx
"use client";

import Link from 'next/link';
import type { DashboardData } from '../dashboard/page';
import styles from './mobile.module.css';

export type RecentActivityRowsProps = {
    messages: DashboardData['recentMessages'];
    offers: DashboardData['recentOffers'];
};

function offerStatusClass(status: string): string {
    if (status === 'PENDING') return styles.statusPending;
    if (status === 'ACCEPTED') return styles.statusAccepted;
    return styles.statusRejected;
}

function offerStatusLabel(status: string): string {
    if (status === 'PENDING') return 'Bekliyor';
    if (status === 'ACCEPTED') return 'Kabul';
    return 'Reddedildi';
}

/**
 * Son mesaj + son teklif — kompakt önizleme. İkisi de boşsa bölüm HİÇ
 * render edilmez (iki ayrı boş kutu üst üste durmasın — Simplicity ilkesi,
 * bkz. spec). Biri varsa bölüm görünür, diğeri kendi içinde "yok" notu
 * gösterir — `/dashboard/page.tsx`'teki bağımsız desenin aynısı.
 */
export function RecentActivityRows({ messages, offers }: RecentActivityRowsProps) {
    if (messages.length === 0 && offers.length === 0) {
        return null;
    }

    const message = messages[0];
    const offer = offers[0];

    return (
        <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Son Mesaj</h2>
            {message ? (
                <Link href={`/inbox?with=${message.sender.id}`} className={styles.listRow}>
                    <span className={styles.listTitle}>{message.sender.name || 'Kullanıcı'}</span>
                    <span className={styles.listMeta}>
                        {message.content.length > 55 ? message.content.slice(0, 55) + '…' : message.content}
                    </span>
                </Link>
            ) : (
                <p className={styles.activityEmptyRow}>Mesaj yok.</p>
            )}

            <h2 className={styles.sectionTitle}>Son Teklif</h2>
            {offer ? (
                <Link href={`/listing/${offer.listing.id}`} className={styles.listRow}>
                    <span className={styles.listTitle}>{offer.listing.title || offer.listing.city || 'İlan'}</span>
                    <span className={styles.listMeta}>
                        %{offer.offeredShare} pay ·{' '}
                        <span className={offerStatusClass(offer.status)}>{offerStatusLabel(offer.status)}</span>
                    </span>
                </Link>
            ) : (
                <p className={styles.activityEmptyRow}>Teklif yok.</p>
            )}
        </section>
    );
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx jest src/app/mobile/RecentActivityRows.test.tsx --no-coverage`
Expected: PASS, 5/5.

- [ ] **Step 6: Commit**

```bash
git add src/app/mobile/RecentActivityRows.tsx src/app/mobile/mobile.module.css src/app/mobile/RecentActivityRows.test.tsx
git commit -m "feat(mobile-home): RecentActivityRows bileseni + paylasilan mobile.module.css"
```

---

### Task 4: `QuickActionGrid` bileşeni

**Files:**
- Create: `src/app/mobile/QuickActionGrid.tsx`
- Modify: `src/app/mobile/mobile.module.css` (Task 2'de oluşturuldu, buraya eklenir)
- Test: `src/app/mobile/QuickActionGrid.test.tsx`

**Interfaces:**
- Consumes: `DashboardData['stats']` (Task 1).
- Produces: `QuickActionGridProps = { stats: DashboardData['stats'] }`, `export function QuickActionGrid(props: QuickActionGridProps)`.

- [ ] **Step 1: Write the failing tests**

```tsx
/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react'
import { QuickActionGrid } from './QuickActionGrid'

const STATS = { reportCount: 7, activeListingCount: 2, offerCount: 3, unreadMessageCount: 1 }

describe('QuickActionGrid', () => {
    it('istatistik sayilarini gosterir', () => {
        render(<QuickActionGrid stats={STATS} />)
        expect(screen.getByText('7')).toBeInTheDocument()
        expect(screen.getByText('2')).toBeInTheDocument()
        expect(screen.getByText('3')).toBeInTheDocument()
        expect(screen.getByText('1')).toBeInTheDocument()
    })

    it('sifir da anlamli bir sayidir, gizlenmez', () => {
        render(<QuickActionGrid stats={{ reportCount: 0, activeListingCount: 0, offerCount: 0, unreadMessageCount: 0 }} />)
        expect(screen.getAllByText('0')).toHaveLength(4)
    })

    it('4 eylem dogru rotalara gider', () => {
        render(<QuickActionGrid stats={STATS} />)
        expect(screen.getByRole('link', { name: /Hesapla/ })).toHaveAttribute('href', '/hesapla')
        expect(screen.getByRole('link', { name: /İlan Ver/ })).toHaveAttribute('href', '/listings/new')
        expect(screen.getByRole('link', { name: /Mesajlar/ })).toHaveAttribute('href', '/inbox')
        expect(screen.getByRole('link', { name: /Pazar/ })).toHaveAttribute('href', '/marketplace')
    })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest src/app/mobile/QuickActionGrid.test.tsx --no-coverage`
Expected: FAIL — module not found.

- [ ] **Step 3: Add CSS to `mobile.module.css`**

`src/app/mobile/mobile.module.css`'in `@media (max-width: 768px) { ... }` bloğunun içine, mevcut kuralların yanına ekle:

```css
    .statGrid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 6px;
        padding: 10px 8px;
        border-radius: var(--m-r-card);
        background: var(--m-glass-bg);
        border: 1px solid var(--m-glass-border);
        backdrop-filter: var(--m-glass-blur);
        -webkit-backdrop-filter: var(--m-glass-blur);
    }

    .statTile {
        text-align: center;
    }

    .statValue {
        font: 800 16px Inter, sans-serif;
        color: var(--m-ink);
    }

    .statLabel {
        font: 700 8px Inter, sans-serif;
        letter-spacing: .4px;
        text-transform: uppercase;
        color: var(--m-body);
        margin-top: 2px;
    }

    .actionGrid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 8px;
    }

    .actionTile {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 6px;
        padding: 10px 4px;
        text-decoration: none;
    }

    .actionIcon {
        width: 38px;
        height: 38px;
        border-radius: 13px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 17px;
        background: var(--m-fill);
    }

    .actionIconPrimary {
        background: var(--m-grad-btn);
        color: #fff;
    }

    .actionLabel {
        font: 700 9.5px Inter, sans-serif;
        color: var(--m-ink);
        text-align: center;
    }
```

- [ ] **Step 4: Implement**

Create `src/app/mobile/QuickActionGrid.tsx`:

```tsx
"use client";

import Link from 'next/link';
import type { DashboardData } from '../dashboard/page';
import styles from './mobile.module.css';

export type QuickActionGridProps = {
    stats: DashboardData['stats'];
};

const STAT_TILES = [
    { key: 'reportCount', label: 'HESAP' },
    { key: 'activeListingCount', label: 'İLAN' },
    { key: 'offerCount', label: 'TEKLİF' },
    { key: 'unreadMessageCount', label: 'MESAJ' },
] as const;

/** Onaylanan "B" mockup: istatistikler + 4'lü eylem grid'i en üstte (bkz. spec, görsel companion). */
export function QuickActionGrid({ stats }: QuickActionGridProps) {
    const statValues: Record<string, number> = stats;

    return (
        <>
            <div className={styles.statGrid}>
                {STAT_TILES.map(({ key, label }) => (
                    <div key={key} className={styles.statTile}>
                        <div className={styles.statValue}>{statValues[key]}</div>
                        <div className={styles.statLabel}>{label}</div>
                    </div>
                ))}
            </div>

            <div className={styles.actionGrid}>
                <Link href="/hesapla" className={styles.actionTile}>
                    <span className={`${styles.actionIcon} ${styles.actionIconPrimary}`}>＋</span>
                    <span className={styles.actionLabel}>Hesapla</span>
                </Link>
                <Link href="/listings/new" className={styles.actionTile}>
                    <span className={styles.actionIcon}>🏢</span>
                    <span className={styles.actionLabel}>İlan Ver</span>
                </Link>
                <Link href="/inbox" className={styles.actionTile}>
                    <span className={styles.actionIcon}>💬</span>
                    <span className={styles.actionLabel}>Mesajlar</span>
                </Link>
                <Link href="/marketplace" className={styles.actionTile}>
                    <span className={styles.actionIcon}>🏪</span>
                    <span className={styles.actionLabel}>Pazar Yeri</span>
                </Link>
            </div>
        </>
    );
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx jest src/app/mobile/QuickActionGrid.test.tsx --no-coverage`
Expected: PASS, 3/3.

- [ ] **Step 6: Commit**

```bash
git add src/app/mobile/QuickActionGrid.tsx src/app/mobile/mobile.module.css src/app/mobile/QuickActionGrid.test.tsx
git commit -m "feat(mobile-home): QuickActionGrid bileseni (istatistik + eylem grid'i)"
```

---

### Task 5: `HomeMobile` orkestratör bileşeni

**Files:**
- Create: `src/app/mobile/HomeMobile.tsx`
- Modify: `src/app/mobile/mobile.module.css`
- Test: `src/app/mobile/HomeMobile.test.tsx`

**Interfaces:**
- Consumes: `QuickActionGrid`, `RecentReportsList`, `RecentActivityRows` (Tasks 2-4), `DashboardData` (Task 1).
- Produces: `export function HomeMobile()` — prop almaz, kendi verisini `/api/user/dashboard`'tan çeker. Task 6 (`page.tsx`) bunu `<HomeMobile />` olarak mount eder.

- [ ] **Step 1: Write the failing tests**

```tsx
/** @jest-environment jsdom */
import { render, screen, waitFor } from '@testing-library/react'
import { HomeMobile } from './HomeMobile'

const DATA = {
    stats: { reportCount: 7, activeListingCount: 2, offerCount: 3, unreadMessageCount: 1 },
    recentReports: [{ id: 'r1', title: 'Kadıköy Parseli', createdAt: '2026-08-01T10:00:00.000Z', landShareRatio: 0.42, minApartmentPrice: 8900000 }],
    recentMessages: [],
    recentOffers: [],
}

beforeEach(() => {
    global.fetch = jest.fn(() =>
        Promise.resolve({ ok: true, json: () => Promise.resolve(DATA) }),
    ) as unknown as typeof fetch
})

afterEach(() => {
    jest.clearAllMocks()
})

describe('HomeMobile', () => {
    it('yuklenirken "Yukleniyor..." gosterir', () => {
        render(<HomeMobile />)
        expect(screen.getByText(/Yükleniyor/)).toBeInTheDocument()
    })

    it('veri gelince istatistik ve rapor listesini gosterir', async () => {
        render(<HomeMobile />)
        await waitFor(() => expect(screen.getByText('Kadıköy Parseli')).toBeInTheDocument())
        expect(screen.getByText('7')).toBeInTheDocument()
    })

    it('/api/user/dashboard basarisiz olursa hata mesaji gosterir', async () => {
        global.fetch = jest.fn(() => Promise.resolve({ ok: false, json: () => Promise.resolve({}) })) as unknown as typeof fetch
        render(<HomeMobile />)
        await waitFor(() => expect(screen.getByText(/Veriler yüklenemedi/)).toBeInTheDocument())
    })

    it('/api/user/dashboard a fetch atar', () => {
        render(<HomeMobile />)
        expect(global.fetch).toHaveBeenCalledWith('/api/user/dashboard')
    })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest src/app/mobile/HomeMobile.test.tsx --no-coverage`
Expected: FAIL — module not found.

- [ ] **Step 3: Add root wrapper CSS**

`mobile.module.css`'in `@media` bloğuna ekle:

```css
    .homeRoot {
        display: flex;
        flex-direction: column;
        gap: 14px;
        padding: 0 14px 16px;
    }

    .loading, .error {
        padding: 40px 14px;
        text-align: center;
        font: 600 13px Inter, sans-serif;
        color: var(--m-body);
    }
```

- [ ] **Step 4: Implement**

Create `src/app/mobile/HomeMobile.tsx`:

```tsx
"use client";

import { useEffect, useState } from 'react';
import { AppBar } from '@/components/mobile/AppBar';
import { MobileScreen } from '@/components/mobile/MobileScreen';
import { QuickActionGrid } from './QuickActionGrid';
import { RecentReportsList } from './RecentReportsList';
import { RecentActivityRows } from './RecentActivityRows';
import type { DashboardData } from '../dashboard/page';
import styles from './mobile.module.css';

/**
 * Giriş yapmış kullanıcının mobil ana sayfası. `/dashboard`'ın veri modelini
 * (`/api/user/dashboard`) tüketir ama ekranın kendisi sıfırdan mobil-özel —
 * bkz. spec `2026-08-06-mobil-anasayfa-panosu-design.md`.
 *
 * `hasBottomNav={false}` BİLEREK: `/hesapla` mobilin aynı gerekçesi —
 * `SiteChrome.tsx` alt-çubuk dolgusunu `--mobile-nav-pb` ile <main>'e zaten
 * veriyor, `true` bırakılsaydı dolgu iki kez uygulanırdı.
 */
export function HomeMobile() {
    const [data, setData] = useState<DashboardData | null>(null);
    const [error, setError] = useState(false);

    useEffect(() => {
        fetch('/api/user/dashboard')
            .then(res => {
                if (!res.ok) throw new Error('dashboard fetch failed');
                return res.json();
            })
            .then(setData)
            .catch(() => setError(true));
    }, []);

    return (
        <MobileScreen hasBottomNav={false}>
            <AppBar title="Ana Sayfa" />
            <div className={styles.homeRoot}>
                {error ? (
                    <p className={styles.error}>Veriler yüklenemedi. Lütfen sayfayı yenileyin.</p>
                ) : !data ? (
                    <p className={styles.loading}>Yükleniyor...</p>
                ) : (
                    <>
                        <QuickActionGrid stats={data.stats} />
                        <RecentReportsList reports={data.recentReports} />
                        <RecentActivityRows messages={data.recentMessages} offers={data.recentOffers} />
                    </>
                )}
            </div>
        </MobileScreen>
    );
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx jest src/app/mobile/HomeMobile.test.tsx --no-coverage`
Expected: PASS, 4/4.

Run: `npx tsc --noEmit`
Expected: 0 hata.

- [ ] **Step 6: Commit**

```bash
git add src/app/mobile/HomeMobile.tsx src/app/mobile/mobile.module.css src/app/mobile/HomeMobile.test.tsx
git commit -m "feat(mobile-home): HomeMobile orkestratoru — fetch + loading/error + kompozisyon"
```

---

### Task 6: `page.tsx`'i dallandır — pazarlama sayfasını taşı, `HomeMobile`'ı bağla

**Files:**
- Modify: `src/app/page.tsx`
- Modify: `src/app/page.module.css`
- Test: `src/app/page.test.tsx` (yeni)

**Interfaces:**
- Consumes: `HomeMobile` (Task 5).
- Produces: `src/app/page.tsx`'in `export default function HomePage()`'i artık auth+viewport'a göre dallanıyor.

Bu task, mevcut 835 satırlık `page.tsx`'in içeriğini **hiç değiştirmeden** yeniden adlandırır — dikkatli ol, JSX'in tek bir karakteri bile değişmemeli.

- [ ] **Step 1: Write the failing tests**

Create `src/app/page.test.tsx`:

```tsx
/** @jest-environment jsdom */
import React from 'react'
import { render, screen } from '@testing-library/react'
import HomePage from './page'

// `useSession` her testte farkli deger dondurebilsin diye jest.fn() olarak
// mock'lanir — `/hesapla/page.test.tsx`'teki sabit mock burada yetmez,
// cunku bu dosya 3 farkli auth durumunu test ediyor.
jest.mock('next-auth/react', () => ({
    useSession: jest.fn(),
}))
import { useSession } from 'next-auth/react'

// Bu sayfanin agaci framer-motion `whileInView` kullaniyor, o da jsdom'da
// olmayan IntersectionObserver'a ihtiyac duyuyor. Bu, bu sayfayi render eden
// ILK test dosyasi oldugu icin projede daha once hic karsilasilmamis bir
// ihtiyac — global jest.setup.ts'e degil, sadece burada scope'lu.
class MockIntersectionObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(global as any).IntersectionObserver = MockIntersectionObserver

// HomeMobile kendi fetch/loading/error mantigina sahip agir bir bilesen —
// bu dosyanin konusu SADECE platform/auth dallanmasi, HesaplaMobile
// deseniyle ayni gerekce: heavy children mock'lanir, kendi test dosyalari var.
jest.mock('./mobile/HomeMobile', () => ({
    HomeMobile: () => <div data-testid="home-mobile" />,
}))

function viewportKur(masaustu: boolean) {
    Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: (query: string) => ({
            matches: query.includes('max-width: 768px') ? masaustu : false,
            media: query,
            onchange: null,
            addEventListener: jest.fn(),
            removeEventListener: jest.fn(),
            addListener: jest.fn(),
            removeListener: jest.fn(),
            dispatchEvent: jest.fn(),
        }),
    })
}

describe('/ — auth x viewport dallanmasi', () => {
    it('anonim kullanici, viewport fark etmeksizin, pazarlama sayfasini gorur', async () => {
        (useSession as jest.Mock).mockReturnValue({ data: null, status: 'unauthenticated' })
        viewportKur(false)
        render(<HomePage />)
        expect(await screen.findByText(/Arsanızın Gerçek Değerini/)).toBeInTheDocument()
        expect(screen.queryByTestId('home-mobile')).toBeNull()
    })

    it('giris yapmis + masaustu: pazarlama sayfasi degismedi', async () => {
        (useSession as jest.Mock).mockReturnValue({ data: { user: { name: 'Test' } }, status: 'authenticated' })
        viewportKur(true)
        render(<HomePage />)
        expect(await screen.findByText(/Arsanızın Gerçek Değerini/)).toBeInTheDocument()
        expect(screen.queryByTestId('home-mobile')).toBeNull()
    })

    it('giris yapmis + mobil: HomeMobile render edilir, pazarlama sayfasi degil', async () => {
        (useSession as jest.Mock).mockReturnValue({ data: { user: { name: 'Test' } }, status: 'authenticated' })
        viewportKur(false)
        render(<HomePage />)
        expect(await screen.findByTestId('home-mobile')).toBeInTheDocument()
        expect(screen.queryByText(/Arsanızın Gerçek Değerini/)).toBeNull()
    })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest src/app/page.test.tsx --no-coverage`
Expected: FAIL — `page.tsx` henüz `useSession` kullanmıyor / hiç dallanmıyor, her durumda aynı pazarlama sayfası render olur.

- [ ] **Step 3: `page.module.css`'e iskelet class'ı ekle**

`page.module.css`'in başına (ilk kuraldan önce) ekle:

```css
.viewportIskelet {
    min-height: 100dvh;
}
```

(`/hesapla/page.module.css`'teki aynı class'ın birebir kopyası — amacı yer tutmak, yanlış arayüzü bir kare boyunca basmamak.)

- [ ] **Step 4: `page.tsx`'i dallandır**

`src/app/page.tsx`'in en başındaki import bloğuna ekle (satır 3-6'nın hemen altına):

```ts
import { useSession } from 'next-auth/react';
import { HomeMobile } from './mobile/HomeMobile';
```

Mevcut `export default function HomePage() {` satırını `function MarketingHomePage() {` olarak değiştir (`export default` kaldırılır, isim değişir) — fonksiyonun **gövdesi ve kapanışı hiç değişmez**.

Dosyanın en sonuna (mevcut `MarketingHomePage` fonksiyonunun kapanışından hemen sonra) ekle:

```tsx
export default function HomePage() {
  const { status } = useSession();
  const [isDesktopViewport, setIsDesktopViewport] = useState<boolean | null>(null);

  useEffect(() => {
    const mql = window.matchMedia('not all and (max-width: 768px)');
    const update = () => setIsDesktopViewport(mql.matches);
    update();
    mql.addEventListener('change', update);
    return () => mql.removeEventListener('change', update);
  }, []);

  // Viewport henuz olculmedi VEYA oturum durumu hala cozulmedi: SSR ve ilk
  // client render'i BURAYA duser (ikisi de ayni ciktiyi urettigi icin
  // hydration uyusmazligi olusmaz), sonra dogru dala gecilir. `/hesapla`
  // sadece viewport icin ayni deseni kullanir; burada oturum durumu da
  // ayni gerekceyle beklenir — aksi halde giris yapmis bir mobil kullanici
  // once pazarlama sayfasini gorup sonra HomeMobile'a "sicrardi".
  if (isDesktopViewport === null || status === 'loading') {
    return <div className={styles.viewportIskelet} aria-busy="true" aria-live="polite" />;
  }

  if (status === 'authenticated' && !isDesktopViewport) {
    return <HomeMobile />;
  }

  return <MarketingHomePage />;
}
```

`useState`, `useEffect` zaten dosyanın en üstünde import edilmiş durumda (satır 3) — yeni bir import gerekmez.

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx jest src/app/page.test.tsx --no-coverage`
Expected: PASS, 3/3.

Run: `npx tsc --noEmit`
Expected: 0 hata.

Run: `npx jest --no-coverage --roots "<rootDir>/src"` (tam suite, ana checkout worktree-collision'ı önlemek için)
Expected: her şey yeşil, önceki suite'in üstüne yalnızca bu plan'ın eklediği yeni testler.

- [ ] **Step 6: Commit**

```bash
git add src/app/page.tsx src/app/page.module.css src/app/page.test.tsx
git commit -m "feat(mobile-home): / rotasi auth+viewport'a gore dallanir, HomeMobile baglanir"
```

---

### Task 7: `Navbar` çift üst-çubuk düzeltmesi

**Files:**
- Modify: `src/components/layout/Navbar.tsx`

**Neden bu task var:** `AppBar` bileşeninin kendi sözleşmesi (`AppBar.tsx:22-27`) açık: onu kullanan bir sayfa, global `Navbar`'ı mobilde MUTLAKA gizlemelidir, aksi halde ikisi üst üste biner. `Navbar.tsx` bunu her sayfa için kendi içinde `pathname`'e bakarak karar veriyor (`isHiddenOnMobile`, satır 50) — `page.tsx`'in kendisi `Navbar`'ı render etmiyor (`SiteChrome.tsx` global olarak render ediyor), dolayısıyla bu satır dışında değiştirilecek başka bir yer yok. `Navbar.tsx` zaten `useSession()` çağırıyor (satır 12), yani auth durumuna buradan erişilebiliyor.

- [ ] **Step 1: Mevcut testleri oku, davranışı doğrula**

`src/components/layout/__tests__/AdminTopBar.test.tsx` veya varsa `Navbar` için başka bir test dosyası olup olmadığını kontrol et (`find src/components/layout -iname "Navbar.test*"`). Varsa mevcut testlerin `isHiddenOnMobile`'ı nasıl doğruladığını oku — yeni koşul bu deseni takip etmeli.

- [ ] **Step 2: Değişikliği uygula**

`src/components/layout/Navbar.tsx`'te (satır 44-50 civarı) mevcut:

```ts
    const isInbox = pathname.startsWith("/inbox");
    const isProfile = pathname.startsWith("/dashboard/profile");
    const isListingDetail = pathname.startsWith("/listing/");
    const isListingWizard = pathname.startsWith("/listings/");

    // Pages where the top navbar should be HIDDEN on mobile
    const isHiddenOnMobile = isInbox || isProfile || isListingDetail || isListingWizard;
```

şuna değişir:

```ts
    const isInbox = pathname.startsWith("/inbox");
    const isProfile = pathname.startsWith("/dashboard/profile");
    const isListingDetail = pathname.startsWith("/listing/");
    const isListingWizard = pathname.startsWith("/listings/");
    // Giris yapmis + mobil: `/` artik `HomeMobile`'i render ediyor (kendi
    // AppBar'i var), bu yuzden global Navbar orada da gizlenmeli. Anonim
    // ziyaretci icin `/` degismedi, Navbar orada GORUNMEYE devam eder —
    // bu yuzden `status` kontrolu sart, salt pathname yetmez.
    const isAuthenticatedHome = pathname === "/" && status === "authenticated";

    // Pages where the top navbar should be HIDDEN on mobile
    const isHiddenOnMobile = isInbox || isProfile || isListingDetail || isListingWizard || isAuthenticatedHome;
```

(`status`, dosyanın 12. satırında zaten `const { data: session, status } = useSession();` ile mevcut — yeni bir import gerekmez.)

- [ ] **Step 3: Typecheck + ilgili testler**

Run: `npx tsc --noEmit`
Expected: 0 hata.

Run: `npx jest --no-coverage --roots "<rootDir>/src"` (tam suite — `Navbar` birçok sayfada render edildiği için dar bir dosya seçimi risklidir)
Expected: her şey yeşil, hiçbir mevcut test kırılmadı (değişiklik yalnızca `pathname === "/" && status === "authenticated"` durumunda etki ediyor, mevcut hiçbir test bu kombinasyonu daha önce kapsamıyordu).

- [ ] **Step 4: Commit**

```bash
git add src/components/layout/Navbar.tsx
git commit -m "fix(navbar): giris yapmis mobil ana sayfada global Navbar'i gizle (HomeMobile kendi AppBar'ini kullaniyor)"
```

---

### Task 8: Canlı doğrulama (Playwright)

**Files:** yok (yalnızca doğrulama, kod değişikliği yok).

**Önemli kısıt:** bu doğrulamanın giriş yapmış + mobil dalı, gerçek bir oturum (next-auth session) ve `/api/user/dashboard`'ın gerçek veriye erişebilmesi (DB bağlantısı) gerektirir. Bu oturumda DB (Docker) kapalıydı — eğer Task 8 çalıştırıldığında da kapalıysa, adım 3-4 atlanır ve kullanıcıya açıkça bildirilir; adım 1-2 (anonim + masaüstü, DB gerektirmez çünkü bu sayfalar hiç değişmedi) yine de çalıştırılmalı.

- [ ] **Step 1: Dev server'ı başlat**

`npm run dev:next`, hazır olana kadar `http://localhost:3000` poll edilir.

- [ ] **Step 2: Anonim + regresyon kontrolü (DB gerektirmez)**

Playwright ile masaüstü VE mobil viewport'ta `/`'ye git, oturum açılmamış haldeyken:
- Pazarlama sayfası (Hero, "Arsanızın Gerçek Değerini...") görünüyor, her iki viewport'ta da.
- Konsol hatası yok (framer-motion/whileInView jsdom dışı gerçek tarayıcıda zaten çalışır, IntersectionObserver gerçek).

- [ ] **Step 3: Giriş yapmış + masaüstü regresyon kontrolü**

Gerçek bir hesapla giriş yap (varsa test kullanıcısı), masaüstü viewport'ta `/`'ye git:
- Pazarlama sayfası **hâlâ** görünüyor (değişmediği doğrulanır).

- [ ] **Step 4: Giriş yapmış + mobil — yeni ekran**

Aynı oturumla mobil viewport'a geç (veya mobil viewport'ta yeniden giriş yap), `/`'ye git:
- `HomeMobile` görünüyor: istatistik kartları + 4'lü eylem grid'i en üstte, altında son hesaplamalar, altında (varsa) son mesaj/teklif.
- Global `Navbar` görünmüyor (yalnızca `AppBar` "Ana Sayfa" başlığı var, çift çubuk yok).
- Eylem grid'indeki 4 buton doğru rotalara gidiyor.
- Boş veri durumunda (yeni bir test kullanıcısıysa) "Henüz hesaplama yok" + ilgili boş-durum metinleri doğru görünüyor.

- [ ] **Step 5: Rapor et**

Her adımın geçip geçmediğini raporla. DB erişilemezse (adım 3-4 atlandıysa) bunu açıkça belirt — bu, planın eksik bırakıldığı anlamına gelmez, yalnızca bu round'da gerçek bir DB oturumu doğrulanamadı demektir.

---

## Self-Review Notes

- **Spec kapsaması:** spec'in her bölümü bir task'a karşılık geliyor — mimari (Task 6), dosya yapısı (Task 2-5), boş durumlar (Task 3), görsel dil/`--m-*` token'ları (Task 3-5 CSS), test (her task kendi testini taşıyor + Task 6 platform dallanması), Navbar entegrasyonu (spec'te açıkça yazılmamıştı ama kod okumasıyla ortaya çıkan gerçek bir gereksinim — Task 7, gerekçesiyle birlikte).
- **Placeholder taraması:** yok — her adımda çalıştırılabilir gerçek kod var, "implementasyon planı karar verir" gibi ifadeler spec'ten planın kendisine taşınırken somutlaştırıldı (örn. `DashboardData` export kararı Task 1'de netleşti).
- **Tip tutarlılığı:** `DashboardData['stats']`/`['recentReports']`/`['recentMessages']`/`['recentOffers']` tüm bileşenlerde aynı kaynaktan (Task 1) türetiliyor, hiçbir yerde kopyalanmıyor.
- **Yeni bulunan risk (Task 6'da not düşüldü):** `MarketingHomePage`'in framer-motion `whileInView` kullanımı jsdom'da `IntersectionObserver` polyfill'i gerektiriyor — bu proje için ilk kez karşılaşılan bir ihtiyaç, testin kendi dosyasında scope'lu tutuldu, global `jest.setup.ts`'e dokunulmadı (blast radius minimum).
