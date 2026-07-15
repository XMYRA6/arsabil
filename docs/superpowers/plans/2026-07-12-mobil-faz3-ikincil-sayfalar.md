# Mobil Faz 3 (İkincil Sayfalar) Implementasyon Planı

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/board` sayfasını sil, `ScenarioCompare` bileşenine mobil kart-kaydırma görünümü ekle, `compare/[token]`/`profile/[userId]`/`dashboard/projects`/`dashboard/reports` sayfalarına Mühür kimliği (cam panel + tabular-nums) uygula, `BottomNavbar`'a gerçek okunmamış-mesaj rozeti ekle.

**Architecture:** Kurulu desenler aynen tekrarlanır: her sayfa/bileşen kendi `--seal-*` token setini kendi mobil `@media(max-width:768px)` bloğunda tanımlar (globals.css'e sızmaz); iki farklı DOM gerektiren durumlarda (ScenarioCompare tablo/kart) her ikisi de her zaman render edilir, görünürlüğü CSS media query belirler (AppBar/StickyActionBar'daki self-gating deseni — JSX koşulu değil); dokunma hedefleri yalnızca mobil blokta ≥44px.

**Tech Stack:** Next.js 16, React 19, TypeScript, CSS Modules, Jest + ts-jest (`testEnvironment: 'node'`, RTL testleri `/** @jest-environment jsdom */` docblock gerektirir), Playwright.

## Global Constraints

- Masaüstü her dokunulan sayfada pixel/davranış olarak birebir kalır; mobil değişiklikler yalnızca `@media (max-width: 768px)` içinde.
- Her sayfa/bileşen kendi `--seal-*` token setini kendi mobil bloğunda tanımlar; `globals.css`'e asla sızmaz.
- Panel yüzeyleri → `--seal-surface` + `backdrop-filter: blur(24px)`; semantik renkli yüzeyler (durum rozetleri, risk/kâr renkleri) dokunulmaz.
- Parasal/yüzde/m² değerler → `font-variant-numeric: tabular-nums` + `font-family: 'JetBrains Mono', 'IBM Plex Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace` (repo genelinde sabit stack).
- Dokunma hedefleri (`min-height: var(--touch-target)`, 44px) yalnızca mobil media query içinde — base kuralda ASLA (masaüstü büyür, Faz 1'den beri bilinen hata deseni).
- Gerçek birincil aksiyon butonları (tek, öne çıkan CTA) mevcut renk/gradient'ini korur, dokunulmaz; yalnızca toggle/seçim göstergeleri düz `--seal-accent` alır.
- Yeni inline stil eklenmez; dokunulan mevcut inline stiller CSS module'e taşınır.
- Kullanılmayacak `--seal-*` token'ı tanımlanmaz (her sayfada yalnızca gerçekten tüketilen token'lar tanımlanır).

---

## Task 1: `/board` Sayfasını Sil

**Files:**
- Delete: `src/app/board/page.tsx`
- Modify: `src/middleware.ts:16`

**Interfaces:**
- Consumes: yok.
- Produces: yok (temizlik görevi, başka task buna bağlı değil).

- [ ] **Step 1: Repo genelinde `/board` referansını doğrula**

Çalıştır:
```bash
grep -rn "/board" --include="*.ts" --include="*.tsx" src/ e2e/ middleware.ts 2>/dev/null
```
Beklenen: yalnızca `src/middleware.ts` içinde `"/board", "/board/:path*",` satırı çıkar. Başka bir dosyada eşleşme çıkarsa DURUP raporla (bu adımdan sonrasına geçme).

- [ ] **Step 2: `src/app/board/page.tsx` dosyasını sil**

```bash
rm src/app/board/page.tsx
rmdir src/app/board 2>/dev/null || true
```

- [ ] **Step 3: `src/middleware.ts` içinden board matcher'ını kaldır**

`src/middleware.ts` şu an:
```ts
export const config = {
    matcher: [
        /*
         * Match all protected routes.
         * Add any other routes you want to restrict to authenticated users.
         */
        "/admin", "/admin/:path*",
        "/board", "/board/:path*",
        "/dashboard", "/dashboard/:path*",
        "/inbox", "/inbox/:path*",
        "/listing", "/listing/:path*",
        "/marketplace", "/marketplace/:path*",
        "/api/admin/:path*",
        "/api/messages/:path*",
        "/api/offers/:path*",
        "/api/projects/:path*",
        "/api/reports/:path*",
        "/api/user/:path*",
    ],
};
```
`"/board", "/board/:path*",` satırını kaldır — sonuç:
```ts
export const config = {
    matcher: [
        /*
         * Match all protected routes.
         * Add any other routes you want to restrict to authenticated users.
         */
        "/admin", "/admin/:path*",
        "/dashboard", "/dashboard/:path*",
        "/inbox", "/inbox/:path*",
        "/listing", "/listing/:path*",
        "/marketplace", "/marketplace/:path*",
        "/api/admin/:path*",
        "/api/messages/:path*",
        "/api/offers/:path*",
        "/api/projects/:path*",
        "/api/reports/:path*",
        "/api/user/:path*",
    ],
};
```
`withAuth` importu ve `pages: { signIn: "/login" }` kısmı DEĞİŞMEZ.

- [ ] **Step 4: Doğrula**

```bash
npx tsc --noEmit
npx jest --no-coverage
npm run build
```
Beklenen: hepsi temiz (`/board` route'unun build çıktısından kaybolduğunu `npm run build` log'unda kontrol et).

- [ ] **Step 5: Commit**

```bash
git add src/middleware.ts
git rm src/app/board/page.tsx
git commit -m "chore(board): kullanılmayan /board sayfası ve middleware kaydı kaldırıldı

marketplace zaten aynı işi (filtre, harita, favoriler, mühür kimliği) yapıyor; /board'a
uygulama içinden hiçbir link verilmiyordu."
```

---

## Task 2: ScenarioCompare — Inline Stilden CSS Module'e (Byte-Parity Refactor)

**Files:**
- Create: `src/components/ScenarioCompare.module.css`
- Create: `src/components/ScenarioCompare.test.tsx`
- Modify: `src/components/ScenarioCompare.tsx`

**Interfaces:**
- Consumes: mevcut `Props { scenarios: Scenario[]; onShareRequest?: (ids: string[]) => Promise<string | null> }` — DEĞİŞMEZ.
- Produces: `styles` (CSS module) sınıf adları — Task 3 bu dosyaya mobil kart bloğu ekleyecek: `.tableWrap`, `.table` (Task 3'te `display:none` mobilde gizlenecek).

- [ ] **Step 1: Karakterizasyon testini yaz (mevcut inline-stilli davranışı sabitler)**

`src/components/ScenarioCompare.test.tsx`:
```tsx
/** @jest-environment jsdom */
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ScenarioCompare } from './ScenarioCompare';

jest.mock('jspdf', () => {
    return jest.fn().mockImplementation(() => ({
        setFontSize: jest.fn(),
        text: jest.fn(),
        save: jest.fn(),
    }));
});
jest.mock('jspdf-autotable', () => jest.fn());

const scenarios = [
    {
        id: 's1', name: 'Ekonomik', luxLevel: 1.0, apartmentSize: 100, landShareRatio: 0.3,
        totalApartments: 10, riskLevel: 1, builderProfit: 1.2, fdTotal: 4000000, fdPerM2: 40000,
        mi: 1500000, ma: 1000000, totalCost: 2500000,
    },
    {
        id: 's2', name: 'Lüks', luxLevel: 1.4, apartmentSize: 140, landShareRatio: 0.35,
        totalApartments: 8, riskLevel: 2, builderProfit: 1.3, fdTotal: 6000000, fdPerM2: 42857,
        mi: 2200000, ma: 1500000, totalCost: 3700000,
    },
];

describe('ScenarioCompare', () => {
    beforeEach(() => {
        Object.assign(navigator, { clipboard: { writeText: jest.fn() } });
    });

    it('2\'den az senaryoda uyarı mesajı gösterir', () => {
        render(<ScenarioCompare scenarios={[scenarios[0]]} />);
        expect(screen.getByText(/en az 2 senaryo gereklidir/i)).toBeInTheDocument();
    });

    it('senaryo isimlerini tablo başlığında gösterir, en düşük maliyetliyi yıldızla işaretler', () => {
        render(<ScenarioCompare scenarios={scenarios} />);
        expect(screen.getByText(/Ekonomik/)).toBeInTheDocument();
        expect(screen.getByText(/Lüks/)).toBeInTheDocument();
        // fdTotal'i en düşük olan (Ekonomik, 4M < 6M) best — yıldız o sütunun başlığında
        const ekonomikHeader = screen.getByText(/Ekonomik/).closest('th');
        expect(ekonomikHeader?.textContent).toContain('⭐');
    });

    it('onShareRequest verilmezse Paylaş butonu render edilmez', () => {
        render(<ScenarioCompare scenarios={scenarios} />);
        expect(screen.queryByText(/Paylaş/)).not.toBeInTheDocument();
    });

    it('Paylaş tıklanınca onShareRequest çağrılır ve dönen URL gösterilir; Kopyala clipboard\'a yazar', async () => {
        const onShareRequest = jest.fn().mockResolvedValue('https://arsabil.com/compare/abc123');
        render(<ScenarioCompare scenarios={scenarios} onShareRequest={onShareRequest} />);

        screen.getByText(/🔗 Paylaş/).click();
        await waitFor(() => expect(onShareRequest).toHaveBeenCalledWith(['s1', 's2']));
        expect(await screen.findByText('https://arsabil.com/compare/abc123')).toBeInTheDocument();

        screen.getByText('Kopyala').click();
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith('https://arsabil.com/compare/abc123');
        expect(await screen.findByText('✓ Kopyalandı')).toBeInTheDocument();
    });

    it('PDF İndir tıklanınca jsPDF çağrılır', () => {
        render(<ScenarioCompare scenarios={scenarios} />);
        screen.getByText(/📄 PDF İndir/).click();
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const jsPDFMock = require('jspdf') as jest.Mock;
        expect(jsPDFMock).toHaveBeenCalled();
    });
});
```

- [ ] **Step 2: Testi çalıştır — mevcut (henüz refactor edilmemiş) koda karşı PASS etmeli**

```bash
npx jest ScenarioCompare.test.tsx --no-coverage
```
Beklenen: 6/6 PASS (bu, mevcut inline-stilli komponentin davranışını karakterize eder — henüz kod değişmedi).

- [ ] **Step 3: `ScenarioCompare.module.css` oluştur**

`src/components/ScenarioCompare.module.css`:
```css
.emptyMessage {
    text-align: center;
    padding: 1.5rem;
    color: var(--muted);
    font-size: 0.9rem;
}

.actions {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 0.875rem;
    flex-wrap: wrap;
}

.actionBtn {
    padding: 0.5rem 1rem;
    border-radius: 8px;
    background: var(--panel);
    border: 1px solid var(--border);
    color: var(--text);
    cursor: pointer;
    font-size: 0.8rem;
    font-weight: 700;
    font-family: inherit;
}

.actionBtnSharing {
    cursor: not-allowed;
    opacity: 0.6;
}

.shareBox {
    display: flex;
    gap: 8px;
    align-items: center;
    padding: 0.625rem 0.875rem;
    background: rgba(59, 130, 246, 0.07);
    border: 1px solid rgba(59, 130, 246, 0.2);
    border-radius: 10px;
    margin-bottom: 0.875rem;
}

.shareUrlText {
    font-size: 0.78rem;
    color: var(--text);
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.copyBtn {
    padding: 3px 10px;
    border-radius: 6px;
    background: var(--primary);
    border: none;
    color: white;
    font-size: 0.72rem;
    font-weight: 700;
    cursor: pointer;
    flex-shrink: 0;
    font-family: inherit;
}

.tableWrap {
    overflow-x: auto;
}

.table {
    width: 100%;
    border-collapse: separate;
    border-spacing: 0;
    border: 1px solid var(--border);
    border-radius: 16px;
    overflow: hidden;
}

.thLabel {
    padding: 0.85rem 1rem;
    background: var(--panel-2);
    font-weight: 800;
    font-size: 0.8rem;
    color: var(--muted);
    text-align: left;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.thScenario {
    padding: 0.85rem 1rem;
    background: var(--panel-2);
    font-weight: 800;
    font-size: 0.85rem;
    color: var(--card-title);
    text-align: center;
    border-left: 1px solid var(--border);
}

.thScenarioBest {
    background: rgba(var(--primary-rgb), 0.08);
    color: var(--primary);
}

.tdLabel {
    padding: 0.75rem 1rem;
    border-top: 1px solid var(--border);
    font-weight: 700;
    font-size: 0.85rem;
    color: var(--label-color);
}

.tdValue {
    padding: 0.75rem 1rem;
    border-top: 1px solid var(--border);
    border-left: 1px solid var(--border);
    font-weight: 600;
    font-size: 0.85rem;
    color: var(--text);
    text-align: center;
    background: transparent;
}

.tdValueHighlight {
    font-weight: 900;
    font-size: 1rem;
    color: var(--primary);
}

.tdValueBest {
    background: rgba(var(--primary-rgb), 0.03);
}
```

- [ ] **Step 4: `ScenarioCompare.tsx`'i module CSS'e taşı**

`src/components/ScenarioCompare.tsx` (tam dosya, mantık DEĞİŞMEDİ — sadece `style={{...}}` → `className`):
```tsx
"use client";

import React, { useState } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import styles from './ScenarioCompare.module.css';

interface Scenario {
    id: string;
    name: string;
    luxLevel: number;
    apartmentSize: number;
    landShareRatio: number;
    totalApartments?: number | null;
    riskLevel: number;
    builderProfit: number;
    fdTotal: number;
    fdPerM2: number;
    mi: number;
    ma: number;
    totalCost: number;
    fa?: number | null;
    sdx?: number | null;
}

interface Props {
    scenarios: Scenario[];
    onShareRequest?: (ids: string[]) => Promise<string | null>;
}

export const ScenarioCompare: React.FC<Props> = ({ scenarios, onShareRequest }) => {
    const [shareUrl, setShareUrl] = useState<string | null>(null);
    const [sharing, setSharing] = useState(false);
    const [copied, setCopied] = useState(false);

    if (scenarios.length < 2) {
        return (
            <div className={styles.emptyMessage}>
                Karşılaştırma için en az 2 senaryo gereklidir.
            </div>
        );
    }

    const formatTL = (v: number) => '₺' + v.toLocaleString('tr-TR', { maximumFractionDigits: 0 });
    const luxLabels: Record<number, string> = { 1.0: 'Standart', 1.2: 'Orta', 1.4: 'Lüks' };

    const rows: { label: string; values: string[]; highlight?: boolean }[] = [
        { label: 'Kalite', values: scenarios.map(s => luxLabels[s.luxLevel] || `x${s.luxLevel}`) },
        { label: 'Daire Alanı', values: scenarios.map(s => `${s.apartmentSize} m²`) },
        { label: 'Arsa Payı', values: scenarios.map(s => `%${(s.landShareRatio * 100).toFixed(0)}`) },
        { label: 'Kâr (K)', values: scenarios.map(s => `x${s.builderProfit}`) },
        { label: 'Daire Fiyatı', values: scenarios.map(s => formatTL(s.fdTotal)), highlight: true },
        { label: 'Birim Fiyat', values: scenarios.map(s => `${s.fdPerM2.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL/m²`) },
        { label: 'İnşaat', values: scenarios.map(s => formatTL(s.mi)) },
        { label: 'Arsa', values: scenarios.map(s => formatTL(s.ma)) },
        { label: 'Toplam Maliyet', values: scenarios.map(s => formatTL(s.totalCost)), highlight: true },
        { label: 'Kâr Tutarı', values: scenarios.map(s => formatTL(s.fdTotal - s.totalCost)) },
    ];

    const bestIdx = scenarios.reduce((best, s, i) =>
        s.fdTotal < scenarios[best].fdTotal ? i : best, 0
    );

    const handlePdf = () => {
        const doc = new jsPDF();
        doc.setFontSize(14);
        doc.text('ArsaBil — Senaryo Karşılaştırma', 14, 18);
        doc.setFontSize(9);
        doc.text(`Oluşturulma: ${new Date().toLocaleDateString('tr-TR')}`, 14, 25);
        autoTable(doc, {
            startY: 30,
            head: [['Parametre', ...scenarios.map(s => s.name)]],
            body: rows.map(r => [r.label, ...r.values]),
            styles: { fontSize: 8 },
            headStyles: { fillColor: [59, 130, 246] },
        });
        const dateStr = new Date().toISOString().slice(0, 10);
        doc.save(`arsabil-karsilastirma-${dateStr}.pdf`);
    };

    const handleShare = async () => {
        if (!onShareRequest) return;
        setSharing(true);
        const url = await onShareRequest(scenarios.map(s => s.id));
        setShareUrl(url);
        setSharing(false);
    };

    const handleCopy = () => {
        if (!shareUrl) return;
        navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div>
            <div className={styles.actions}>
                <button onClick={handlePdf} className={styles.actionBtn}>
                    📄 PDF İndir
                </button>
                {onShareRequest && (
                    <button
                        onClick={handleShare}
                        disabled={sharing}
                        className={`${styles.actionBtn} ${sharing ? styles.actionBtnSharing : ''}`}
                    >
                        {sharing ? 'Link oluşturuluyor...' : '🔗 Paylaş'}
                    </button>
                )}
            </div>
            {shareUrl && (
                <div className={styles.shareBox}>
                    <span className={styles.shareUrlText}>{shareUrl}</span>
                    <button onClick={handleCopy} className={styles.copyBtn}>
                        {copied ? '✓ Kopyalandı' : 'Kopyala'}
                    </button>
                </div>
            )}
            <div className={styles.tableWrap}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th className={styles.thLabel}>
                                Parametre
                            </th>
                            {scenarios.map((s, i) => (
                                <th
                                    key={s.id}
                                    className={`${styles.thScenario} ${i === bestIdx ? styles.thScenarioBest : ''}`}
                                >
                                    {s.name} {i === bestIdx && '⭐'}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row, ri) => (
                            <tr key={ri}>
                                <td className={styles.tdLabel}>
                                    {row.label}
                                </td>
                                {row.values.map((v, vi) => (
                                    <td
                                        key={vi}
                                        className={`${styles.tdValue} ${row.highlight ? styles.tdValueHighlight : ''} ${vi === bestIdx ? styles.tdValueBest : ''}`}
                                    >
                                        {v}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
```

- [ ] **Step 5: Testi tekrar çalıştır — refactor sonrası da PASS etmeli**

```bash
npx jest ScenarioCompare.test.tsx --no-coverage
npx tsc --noEmit
```
Beklenen: 6/6 PASS, tsc 0 hata. Bu, davranış paritesini kanıtlar (aynı test hem refactor öncesi hem sonrası geçti).

- [ ] **Step 6: Tam suite + hesapla/dashboard-projects tüketicilerinde masaüstü regresyon kontrolü**

```bash
npx jest --no-coverage
```
Docker + dev server açıksa (`npm run dev:next`), Playwright veya manuel tarayıcı ile `/hesapla`'da (≥2 senaryo eklenmiş halde) ve `/dashboard/projects`'te (bir projede "Karşılaştır" tıklanarak) tablo görünümünün masaüstünde pixel olarak eskisiyle aynı kaldığını doğrula (görsel + computed-style: `.table` border-radius 16px, `.thScenario` en iyi sütun arka planı rgba(var(--primary-rgb),0.08)).

- [ ] **Step 7: Commit**

```bash
git add src/components/ScenarioCompare.tsx src/components/ScenarioCompare.module.css src/components/ScenarioCompare.test.tsx
git commit -m "refactor(scenario-compare): inline stiller ScenarioCompare.module.css'e taşındı

Davranış/mantık değişmedi (byte-parity); karakterizasyon testi refactor öncesi ve
sonrası aynı 6 testin geçtiğini doğruluyor. Mobil kart görünümü için zemin hazırlar."
```

---

## Task 3: ScenarioCompare — Mobil Kart Kaydırma Görünümü

**Files:**
- Modify: `src/components/ScenarioCompare.tsx`
- Modify: `src/components/ScenarioCompare.module.css`
- Modify: `src/components/ScenarioCompare.test.tsx`
- Create: `src/components/ScenarioCompare.scope.test.ts`

**Interfaces:**
- Consumes: Task 2'nin `styles.tableWrap`/`styles.table` sınıfları (mobilde `display:none` yapılacak), `rows`/`bestIdx` mevcut hesaplamalar (değişmez).
- Produces: `.mobileCards` mobil kart sarmalayıcısı — başka task bunu tüketmiyor (sayfa-seviyesi Task 4/6 bu bileşeni değiştirmeden kullanıyor, kendi CSS'i kendi içinde kapanıyor).

- [ ] **Step 1: JSX'e mobil kart kaydırıcısını ekle (self-gating — CSS görünürlüğü belirler)**

`src/components/ScenarioCompare.tsx` içinde:
1. Root `<div>`'e className ekle: `<div className={styles.root}>` (Task 2'de className'siz düz `<div>` idi — CSS'in kart sarmalayıcısına `[data-theme]` token'ları verebilmesi için bir kök sınıf gerekiyor).
2. `useState` importunun yanına kart takip state'i ekle: `const [activeCard, setActiveCard] = useState(0);` ve `const cardTrackRef = useRef<HTMLDivElement>(null);` (`useRef`'i `react`'ten import et: `import React, { useRef, useState } from 'react';`).
3. `handleCopy` fonksiyonundan sonra, `return` öncesine ekle:
```tsx
    const onCardScroll = () => {
        const el = cardTrackRef.current;
        if (!el || el.clientWidth === 0) return;
        setActiveCard(Math.round(el.scrollLeft / el.clientWidth));
    };
```
4. `</div>` (tableWrap'ın kapanışından hemen sonra, en dıştaki `</div>`'den önce) şunu ekle:
```tsx
            <div className={styles.mobileCards}>
                <div className={styles.cardTrack} ref={cardTrackRef} onScroll={onCardScroll}>
                    {scenarios.map((s, i) => (
                        <div
                            key={s.id}
                            className={`${styles.scenarioCard} ${i === bestIdx ? styles.scenarioCardBest : ''}`}
                        >
                            <div className={styles.cardHeader}>
                                <span className={styles.cardName}>{s.name}</span>
                                {i === bestIdx && <span className={styles.cardBadge}>⭐ En Uygun</span>}
                            </div>
                            {rows.map((row, ri) => (
                                <div key={ri} className={styles.cardRow}>
                                    <span className={styles.cardLabel}>{row.label}</span>
                                    <span className={`${styles.cardValue} ${row.highlight ? styles.cardValueHighlight : ''}`}>
                                        {row.values[i]}
                                    </span>
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
                {scenarios.length > 1 && (
                    <div className={styles.cardDots} aria-hidden="true">
                        {scenarios.map((_, i) => (
                            <span key={i} className={`${styles.dot} ${i === activeCard ? styles.dotActive : ''}`} />
                        ))}
                    </div>
                )}
            </div>
```
En dıştaki root `<div>` açılışını `<div className={styles.root}>` yap (Step öncesi düz `<div>` idi).

- [ ] **Step 2: `ScenarioCompare.module.css`'e mobil blok ekle (dosyanın sonuna)**

```css
.root {
}

.mobileCards {
    display: none;
}
```
Bu iki kuralı dosyanın EN BAŞINA (`.emptyMessage`'dan önce) ekle — `.root` boş bir kapsam sınıfı (aşağıdaki media query'nin `[data-theme] .root` seçicilerinin hedefi). Ardından dosyanın SONUNA şunu ekle:
```css

@media (max-width: 768px) {
    .tableWrap {
        display: none;
    }

    .mobileCards {
        display: block;
    }

    [data-theme="dark"] .root {
        --seal-surface: linear-gradient(160deg, #0F2A43 0%, #16324F 100%);
        --seal-border-soft: rgba(43, 124, 255, 0.18);
        --seal-text: #E8EEF7;
        --seal-text-muted: rgba(232, 238, 247, 0.68);
        --seal-accent: var(--aurora-cyan);
    }

    [data-theme="light"] .root {
        --seal-surface: var(--shell-bg);
        --seal-border-soft: var(--shell-border);
        --seal-text: var(--card-title);
        --seal-text-muted: var(--muted);
        --seal-accent: var(--aurora-cyan);
    }

    .cardTrack {
        display: flex;
        gap: 12px;
        overflow-x: auto;
        scroll-snap-type: x mandatory;
        padding-bottom: 4px;
        -webkit-overflow-scrolling: touch;
    }

    .scenarioCard {
        flex: 0 0 85%;
        scroll-snap-align: start;
        background: var(--seal-surface);
        border: 1px solid var(--seal-border-soft);
        border-radius: 16px;
        padding: 1rem;
        backdrop-filter: blur(24px);
        -webkit-backdrop-filter: blur(24px);
    }

    .scenarioCardBest {
        border-color: var(--seal-accent);
    }

    .cardHeader {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 0.75rem;
        padding-bottom: 0.75rem;
        border-bottom: 1px solid var(--seal-border-soft);
    }

    .cardName {
        font-weight: 800;
        font-size: 0.95rem;
        color: var(--seal-text);
    }

    .cardBadge {
        font-size: 0.68rem;
        font-weight: 800;
        color: var(--seal-accent);
    }

    .cardRow {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0.4rem 0;
    }

    .cardLabel {
        font-size: 0.78rem;
        color: var(--seal-text-muted);
        font-weight: 600;
    }

    .cardValue {
        font-family: 'JetBrains Mono', 'IBM Plex Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
        font-variant-numeric: tabular-nums;
        font-size: 0.82rem;
        font-weight: 700;
        color: var(--seal-text);
    }

    .cardValueHighlight {
        font-size: 0.95rem;
        font-weight: 900;
        color: var(--seal-accent);
    }

    .cardDots {
        display: flex;
        justify-content: center;
        gap: 6px;
        margin-top: 10px;
    }

    .dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: var(--seal-border-soft);
        transition: background 0.2s, width 0.2s;
    }

    .dotActive {
        background: var(--seal-accent);
        width: 16px;
        border-radius: 3px;
    }
}
```

- [ ] **Step 3: Guard testi yaz — `src/components/ScenarioCompare.scope.test.ts`**

```ts
import fs from 'fs';
import path from 'path';

const css = fs.readFileSync(path.join(__dirname, 'ScenarioCompare.module.css'), 'utf8');
const globalsCss = fs.readFileSync(path.join(__dirname, '../app/globals.css'), 'utf8');

describe('ScenarioCompare mobil kart karşılaştırma token kapsamı', () => {
    it('yeni seal token\'ları globals.css içine hiç sızmamış olmalı', () => {
        expect(globalsCss).not.toMatch(/--seal-(surface|border|text|accent)/);
    });

    it('--seal-accent, diğer sayfalarla aynı Aurora cyan\'ı kullanmalı', () => {
        expect(css).toMatch(/--seal-accent:\s*var\(--aurora-cyan\)/);
    });

    it('--seal-surface hem dark hem light tema bloğunda tanımlı olmalı', () => {
        expect(css).toMatch(/\[data-theme="dark"\]\s*\.root\s*\{[^}]*--seal-surface:/);
        expect(css).toMatch(/\[data-theme="light"\]\s*\.root\s*\{[^}]*--seal-surface:/);
    });

    it('.tableWrap masaüstünde görünür/mobilde gizli, .mobileCards tam tersi olmalı', () => {
        const mediaIndex = css.indexOf('@media (max-width: 768px)');
        const desktopSection = css.slice(0, mediaIndex);
        const mobileSection = css.slice(mediaIndex);
        expect(desktopSection).toMatch(/\.mobileCards\s*\{[^}]*display:\s*none/);
        expect(mobileSection).toMatch(/\.tableWrap\s*\{[^}]*display:\s*none/);
        expect(mobileSection).toMatch(/\.mobileCards\s*\{[^}]*display:\s*block/);
    });

    it('.cardValue tabular-nums ve mono font kullanmalı', () => {
        expect(css).toMatch(/\.cardValue\s*\{[^}]*font-variant-numeric:\s*tabular-nums/);
        expect(css).toMatch(/\.cardValue\s*\{[^}]*JetBrains Mono/);
    });
});
```

- [ ] **Step 4: `ScenarioCompare.test.tsx`'e mobil kart varlığını doğrulayan test ekle**

Task 2'nin test dosyasındaki "senaryo isimlerini tablo başlığında gösterir" testinin ALTINA yeni bir `it` ekle:
```tsx
    it('mobil kart görünümünde de her iki senaryo adı bulunur (jsdom media query uygulamaz, DOM\'da ikisi de var olmalı)', () => {
        render(<ScenarioCompare scenarios={scenarios} />);
        const nameEls = screen.getAllByText('Ekonomik');
        // Biri <th> içinde (tablo), biri .cardName içinde (mobil kart) — ikisi de DOM'da
        expect(nameEls.length).toBeGreaterThanOrEqual(2);
    });
```

- [ ] **Step 5: Çalıştır ve doğrula**

```bash
npx jest ScenarioCompare --no-coverage
npx tsc --noEmit
npx eslint src/components/ScenarioCompare.tsx
```
Beklenen: tüm testler PASS, tsc 0, eslint 0.

- [ ] **Step 6: Tam suite + görsel doğrulama**

```bash
npx jest --no-coverage
```
Docker + dev server açıksa, `/hesapla` sayfasında ≥2 senaryo eklenmiş halde 390×844 viewport'ta: kartların yatay kaydığını, dot göstergesinin aktif kartı takip ettiğini, dark/light temada kart yüzeyinin doğru rengi aldığını doğrula.

- [ ] **Step 7: Commit**

```bash
git add src/components/ScenarioCompare.tsx src/components/ScenarioCompare.module.css src/components/ScenarioCompare.test.tsx src/components/ScenarioCompare.scope.test.ts
git commit -m "feat(scenario-compare): mobil yatay kart kaydırma görünümü eklendi

Self-gating CSS (AppBar/StickyActionBar deseni) — masaüstü tablo dokunulmadan kalıyor,
mobilde --seal-* Mühür Lacivert paleti + tabular-nums ile kart karuseline geçiyor."
```

---

## Task 4: `compare/[token]` Sayfası — Mühür Kimliği

**Files:**
- Modify: `src/app/compare/[token]/page.module.css`
- Create: `src/app/compare/[token]/pageStyles.scope.test.ts`

**Interfaces:**
- Consumes: Task 3'ün `ScenarioCompare` mobil kart görünümü (otomatik miras alınır, bu sayfa bileşeni değiştirmiyor).
- Produces: yok.

- [ ] **Step 1: `page.module.css`'e mobil blok ekle**

`src/app/compare/[token]/page.module.css` mevcut haliyle 47 satır, hiç `@media` bloğu yok. Dosyanın SONUNA ekle:
```css

@media (max-width: 768px) {
  .container {
    padding: 1.25rem 1rem 2rem;
  }

  [data-theme="dark"] .container {
    --seal-surface: linear-gradient(160deg, #0F2A43 0%, #16324F 100%);
    --seal-border-soft: rgba(43, 124, 255, 0.18);
  }

  [data-theme="light"] .container {
    --seal-surface: var(--shell-bg);
    --seal-border-soft: var(--shell-border);
  }

  .card {
    background: var(--seal-surface);
    border-color: var(--seal-border-soft);
    backdrop-filter: blur(24px);
    -webkit-backdrop-filter: blur(24px);
    padding: 1.25rem;
  }

  .ctaBtn {
    width: 100%;
    min-height: var(--touch-target);
    display: flex;
    align-items: center;
    justify-content: center;
  }
}
```
Not: `.ctaBtn` gerçek bir birincil CTA olduğu için `background` DOKUNULMAZ — masaüstündeki `var(--brand-gradient)` mobilde de aynen kalır (Global Constraints: gerçek CTA'lar renk değiştirmez).

- [ ] **Step 2: Guard testi yaz**

`src/app/compare/[token]/pageStyles.scope.test.ts`:
```ts
import fs from 'fs';
import path from 'path';

const pageCss = fs.readFileSync(path.join(__dirname, 'page.module.css'), 'utf8');
const globalsCss = fs.readFileSync(path.join(__dirname, '../../globals.css'), 'utf8');

describe('compare mobil mühür kimliği token kapsamı', () => {
    it('yeni seal token\'ları globals.css içine hiç sızmamış olmalı', () => {
        expect(globalsCss).not.toMatch(/--seal-(surface|border)/);
    });

    it('--seal-surface hem dark hem light tema bloğunda tanımlı olmalı', () => {
        expect(pageCss).toMatch(/\[data-theme="dark"\]\s*\.container\s*\{[^}]*--seal-surface:/);
        expect(pageCss).toMatch(/\[data-theme="light"\]\s*\.container\s*\{[^}]*--seal-surface:/);
    });

    it('.card mobilde --seal-surface kullanmalı, masaüstü tanımı hâlâ var(--panel) olmalı', () => {
        const mediaIndex = pageCss.indexOf('@media (max-width: 768px)');
        const desktopSection = pageCss.slice(0, mediaIndex);
        const mobileSection = pageCss.slice(mediaIndex);
        expect(mobileSection).toMatch(/\.card\s*\{[^}]*background:\s*var\(--seal-surface\)/);
        expect(desktopSection).toMatch(/\.card\s*\{[^}]*background:\s*var\(--panel\)/);
    });

    it('.ctaBtn mobilde renk override almamalı (gerçek birincil CTA, brand-gradient korunur)', () => {
        const mediaIndex = pageCss.indexOf('@media (max-width: 768px)');
        const mobileSection = pageCss.slice(mediaIndex);
        expect(mobileSection).not.toMatch(/\.ctaBtn\s*\{[^}]*background:/);
    });
});
```

- [ ] **Step 3: Çalıştır ve doğrula**

```bash
npx jest compare --no-coverage
npx tsc --noEmit
```
Beklenen: yeni 4 test PASS, tsc 0.

- [ ] **Step 4: Masaüstü regresyon**

Docker + dev server açıksa, bir compare token'ı ile (Task 8'de e2e için üretilecek yönteme benzer, manuel: hesapla'da ≥2 senaryo ekleyip "Paylaş" ile link üret) masaüstünde `.card`'ın hâlâ `var(--panel)` kullandığını, `.ctaBtn`'in hâlâ gradient olduğunu doğrula.

- [ ] **Step 5: Commit**

```bash
git add src/app/compare/\[token\]/page.module.css src/app/compare/\[token\]/pageStyles.scope.test.ts
git commit -m "feat(compare): mobil Mühür kimliği — cam kart paneli

.card mobilde --seal-surface+blur24px'e geçti, .ctaBtn dokunulmadı (gerçek CTA,
brand-gradient korunur). Esas görsel değişim ScenarioCompare'in mobil kart
görünümünden geliyor (Task 3)."
```

---

## Task 5: `profile/[userId]` Sayfası — Mühür Kimliği

**Files:**
- Modify: `src/app/profile/[userId]/page.module.css`
- Create: `src/app/profile/[userId]/pageStyles.scope.test.ts`

**Interfaces:**
- Consumes: yok.
- Produces: yok.

- [ ] **Step 1: `page.module.css`'e mobil blok ekle**

`src/app/profile/[userId]/page.module.css` mevcut haliyle 131 satır, hiç `@media` bloğu yok. Dosyanın SONUNA ekle:
```css

@media (max-width: 768px) {
  .container {
    padding: 1.25rem 1rem 2rem;
  }

  [data-theme="dark"] .container {
    --seal-surface: linear-gradient(160deg, #0F2A43 0%, #16324F 100%);
    --seal-border-soft: rgba(43, 124, 255, 0.18);
    --seal-recessed: rgba(0, 0, 0, 0.2);
  }

  [data-theme="light"] .container {
    --seal-surface: var(--shell-bg);
    --seal-border-soft: var(--shell-border);
    --seal-recessed: rgba(0, 0, 0, 0.03);
  }

  .section {
    background: var(--seal-surface);
    border-color: var(--seal-border-soft);
    backdrop-filter: blur(24px);
    -webkit-backdrop-filter: blur(24px);
  }

  .listRow {
    background: var(--seal-recessed);
    border-color: transparent;
    min-height: var(--touch-target);
  }

  .listMeta {
    font-family: 'JetBrains Mono', 'IBM Plex Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    font-variant-numeric: tabular-nums;
  }
}
```
Not: `.header`/`.ctaBtn`'e DOKUNULMAZ (spec kapsamı yalnızca `.section` panelleri + `.listRow` + rakamlar).

- [ ] **Step 2: Guard testi yaz**

`src/app/profile/[userId]/pageStyles.scope.test.ts`:
```ts
import fs from 'fs';
import path from 'path';

const pageCss = fs.readFileSync(path.join(__dirname, 'page.module.css'), 'utf8');
const globalsCss = fs.readFileSync(path.join(__dirname, '../../globals.css'), 'utf8');

describe('profile mobil mühür kimliği token kapsamı', () => {
    it('yeni seal token\'ları globals.css içine hiç sızmamış olmalı', () => {
        expect(globalsCss).not.toMatch(/--seal-(surface|border|recessed)/);
    });

    it('--seal-surface hem dark hem light tema bloğunda tanımlı olmalı', () => {
        expect(pageCss).toMatch(/\[data-theme="dark"\]\s*\.container\s*\{[^}]*--seal-surface:/);
        expect(pageCss).toMatch(/\[data-theme="light"\]\s*\.container\s*\{[^}]*--seal-surface:/);
    });

    it('.section mobilde --seal-surface kullanmalı, masaüstü tanımı hâlâ var(--panel) olmalı', () => {
        const mediaIndex = pageCss.indexOf('@media (max-width: 768px)');
        const desktopSection = pageCss.slice(0, mediaIndex);
        const mobileSection = pageCss.slice(mediaIndex);
        expect(mobileSection).toMatch(/\.section\s*\{[^}]*background:\s*var\(--seal-surface\)/);
        expect(desktopSection).toMatch(/\.section\s*\{[^}]*background:\s*var\(--panel\)/);
    });

    it('.listRow mobilde --seal-recessed ve dokunma hedefi kullanmalı', () => {
        const mediaIndex = pageCss.indexOf('@media (max-width: 768px)');
        const mobileSection = pageCss.slice(mediaIndex);
        expect(mobileSection).toMatch(/\.listRow\s*\{[^}]*background:\s*var\(--seal-recessed\)/);
        expect(mobileSection).toMatch(/\.listRow\s*\{[^}]*min-height:\s*var\(--touch-target\)/);
    });

    it('.listMeta mobilde tabular-nums olmalı', () => {
        const mediaIndex = pageCss.indexOf('@media (max-width: 768px)');
        const mobileSection = pageCss.slice(mediaIndex);
        expect(mobileSection).toMatch(/\.listMeta\s*\{[^}]*font-variant-numeric:\s*tabular-nums/);
    });
});
```

- [ ] **Step 3: Çalıştır ve doğrula**

```bash
npx jest profile --no-coverage
npx tsc --noEmit
```
Beklenen: yeni 5 test PASS, tsc 0.

- [ ] **Step 4: Masaüstü regresyon**

Docker + dev server açıksa, `/profile/e2e-user-1` (veya gerçek bir kullanıcı id'si) masaüstünde `.section`'ın hâlâ `var(--panel)` kullandığını doğrula.

- [ ] **Step 5: Commit**

```bash
git add src/app/profile/\[userId\]/page.module.css src/app/profile/\[userId\]/pageStyles.scope.test.ts
git commit -m "feat(profile): mobil Mühür kimliği — cam panel + recessed satırlar + tabular-nums

.section mobilde --seal-surface+blur24px, .listRow --seal-recessed+dokunma hedefi,
.listMeta tabular-nums. .header/.ctaBtn dokunulmadı (kapsam dışı)."
```

---

## Task 6: `dashboard/projects` + `dashboard/reports` — İnline Temizlik + Mühür Kimliği

**Files:**
- Modify: `src/app/dashboard/projects/page.tsx`
- Modify: `src/app/dashboard/reports/page.tsx`
- Modify: `src/app/dashboard/dashboard.module.css`
- Modify: `src/app/dashboard/dashboardStyles.scope.test.ts`

**Interfaces:**
- Consumes: `ScenarioCompare` (Task 2/3, değişmeden kullanılır — `<ScenarioCompare scenarios={...} onShareRequest={...} />`), mevcut `.reportCard`/`.listingCard`/`.statusBadge`/`.statusActive`/`.cardsGrid`/`.emptyState`/`.emptyIcon` sınıfları (dashboard.module.css'te zaten var, DEĞİŞMEZ).
- Produces: yok.

**ÖNEMLİ:** `dashboard.module.css` şu an TEK bir `@media (max-width: 768px)` bloğu içeriyor (yalnızca `.mainContent` sticky-fix kuralı, satır 412-418). Var olan `dashboardStyles.scope.test.ts` bu bloğu `css.indexOf('@media (max-width: 768px)')` ile POZİSYONEL olarak buluyor — İKİNCİ bir `@media (max-width: 768px)` bloğu AÇMA, yeni kuralları MEVCUT bloğun İÇİNE, `.mainContent` kuralının kapanışından SONRA, bloğun kendi kapanış `}`'ından ÖNCE ekle (Faz1.5 Mühür Lacivert planından bilinen kural — ikinci bir aynı-eşikli media query, pozisyonel guard testlerini kırar).

- [ ] **Step 1: `dashboard/projects/page.tsx`'teki 13 inline stil sitesini CSS module sınıflarına taşı**

Tam dosya (mantık/state/handler DEĞİŞMEDİ):
```tsx
"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/Button";
import { ScenarioCompare } from "@/components/ScenarioCompare";
import { exportToExcel } from "@/lib/export/excel";
import type { ScenarioData } from "@/lib/export/excel";
import { toast } from "react-hot-toast";
import styles from '../dashboard.module.css';

type Scenario = ScenarioData & { id: string };

interface Project {
    id: string;
    name: string;
    description?: string;
    _count?: { scenarios: number };
    scenarios?: Scenario[];
}

export default function ProjectsPage() {
    const { status } = useSession();
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedProject, setSelectedProject] = useState<Project | null>(null);

    const fetchProjects = () => {
        setLoading(true);
        fetch('/api/projects')
            .then(r => r.json())
            .then(data => { setProjects(data.projects || []); setLoading(false); })
            .catch(() => setLoading(false));
    };

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- oturum açıkken veri çekme; setState fetchProjects içinde gerçekleşiyor
        if (status === 'authenticated') fetchProjects();
    }, [status]);

    const handleExcel = (project: Project) => {
        if (!project.scenarios?.length) {
            toast.error('Bu projede henüz senaryo yok.');
            return;
        }
        exportToExcel(project.scenarios, project.name);
        toast.success('Excel dosyası indirildi.');
    };

    if (loading) return <div className={styles.loading}>Yükleniyor...</div>;

    return (
        <>
            <div className={styles.pageHeader}>
                <h1>Projelerim</h1>
                <p>Kayıtlı projeleriniz, senaryolarınız ve Excel çıktılarınız</p>
            </div>

            {projects.length === 0 ? (
                <div className={styles.emptyState}>
                    <div className={styles.emptyIcon}>📁</div>
                    <div>Henüz projeniz yok.</div>
                    <div className={styles.emptyStateHint}>
                        Hesap makinesindeki &quot;Rapor Kaydet&quot; butonu ile ilk projenizi oluşturun.
                    </div>
                </div>
            ) : (
                <div className={styles.projectsList}>
                    {projects.map(project => (
                        <div key={project.id} className={styles.listingCard}>
                            <div className={styles.listingHeader}>
                                <h4>{project.name}</h4>
                                <div className={styles.projectBadges}>
                                    <span className={`${styles.statusBadge} ${styles.statusActive}`}>
                                        {project._count?.scenarios || 0} senaryo
                                    </span>
                                </div>
                            </div>

                            {project.description && (
                                <p className={styles.projectDescription}>
                                    {project.description}
                                </p>
                            )}

                            {(project.scenarios?.length ?? 0) > 0 && (
                                <div className={styles.scenariosBlock}>
                                    <h5 className={styles.scenariosTitle}>
                                        Senaryolar
                                    </h5>
                                    <div className={styles.scenariosGrid}>
                                        {(project.scenarios ?? []).map((s: Scenario) => (
                                            <div key={s.id} className={`${styles.reportCard} ${styles.scenarioMiniCard}`}>
                                                <h4>{s.name}</h4>
                                                <div className={styles.scenarioMiniValue}>
                                                    ₺{s.fdTotal.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}
                                                </div>
                                                <div className={styles.scenarioMiniMeta}>
                                                    {s.fdPerM2.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL/m² | %{(s.landShareRatio * 100).toFixed(0)} arsa payı
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className={styles.projectActions}>
                                {(project.scenarios?.length ?? 0) >= 2 && (
                                    <Button
                                        variant="outline"
                                        onClick={() => setSelectedProject(selectedProject?.id === project.id ? null : project)}
                                    >
                                        📊 {selectedProject?.id === project.id ? 'Gizle' : 'Karşılaştır'}
                                    </Button>
                                )}
                                <Button variant="outline" onClick={() => handleExcel(project)}>
                                    📥 Excel İndir
                                </Button>
                            </div>

                            {selectedProject?.id === project.id && (
                                <div className={styles.compareWrap}>
                                    <ScenarioCompare
                                        scenarios={project.scenarios ?? []}
                                        onShareRequest={async (ids) => {
                                            const res = await fetch('/api/compare/share', {
                                                method: 'POST',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({ scenarioIds: ids }),
                                            });
                                            if (!res.ok) return null;
                                            const { token } = await res.json();
                                            return `${window.location.origin}/compare/${token}`;
                                        }}
                                    />
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </>
    );
}
```

- [ ] **Step 2: `dashboard/reports/page.tsx`'teki tek inline stil sitesini taşı + rakamları `.metaValue` ile sar**

Tam dosya:
```tsx
"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import styles from '../dashboard.module.css';

interface Report {
    id: string;
    title: string;
    totalApartments: number;
    apartmentSizeSqm: number;
    landShareRatio: number;
    luxLevelModifier: number;
    minApartmentPrice: number;
    landCost: number;
    createdAt: string;
    listing?: object;
}

export default function ReportsPage() {
    const { status } = useSession();
    const [reports, setReports] = useState<Report[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (status === "authenticated") {
            fetch("/api/user/dashboard")
                .then(r => r.json())
                .then(data => { setReports(data.reports || []); setLoading(false); })
                .catch(() => setLoading(false));
        }
    }, [status]);

    const formatDate = (d: string) => new Date(d).toLocaleDateString('tr-TR', {
        day: 'numeric', month: 'long', year: 'numeric',
    });

    if (loading) return <div className={styles.loading}>Yükleniyor...</div>;

    return (
        <>
            <div className={styles.pageHeader}>
                <h1>Raporlarım</h1>
                <p>Tüm kayıtlı hesaplama raporlarınız</p>
            </div>

            {reports.length === 0 ? (
                <div className={styles.emptyState}>
                    <div className={styles.emptyIcon}>📊</div>
                    Henüz kayıtlı raporunuz yok. Hesap makinesinden bir rapor oluşturun.
                </div>
            ) : (
                <div className={styles.cardsGrid}>
                    {reports.map(report => (
                        <div key={report.id} className={styles.reportCard}>
                            <h4>{report.title}</h4>
                            <div className={styles.reportMeta}>
                                <div><strong>Daire Sayısı:</strong> <span className={styles.metaValue}>{report.totalApartments}</span></div>
                                <div><strong>Daire Alanı:</strong> <span className={styles.metaValue}>{report.apartmentSizeSqm} m²</span></div>
                                <div><strong>Arsa Payı:</strong> <span className={styles.metaValue}>%{(report.landShareRatio * 100).toFixed(0)}</span></div>
                                <div><strong>Kalite Katsayısı:</strong> <span className={styles.metaValue}>x{report.luxLevelModifier}</span></div>
                                <div><strong>Daire Fiyatı:</strong> <span className={styles.metaValue}>₺{report.minApartmentPrice.toLocaleString("tr-TR")}</span></div>
                                <div><strong>Arsa Değeri:</strong> <span className={styles.metaValue}>₺{report.landCost.toLocaleString("tr-TR")}</span></div>
                                <div><strong>Tarih:</strong> {formatDate(report.createdAt)}</div>
                            </div>
                            {report.listing && (
                                <div className={styles.listingBadge}>
                                    ✓ Pazar Yerinde İlanda
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </>
    );
}
```

- [ ] **Step 3: `dashboard.module.css`'e yeni base sınıfları ekle**

`.offerRow .offerInfo .offerSub` kuralının hemen ALTINA (satır ~324, `.profileForm` bloğundan ÖNCE) ekle:
```css
.projectsList {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
}

.projectBadges {
    display: flex;
    gap: 0.5rem;
    align-items: center;
}

.projectDescription {
    color: var(--muted);
    font-size: 0.85rem;
    margin-bottom: 1rem;
}

.scenariosBlock {
    margin-bottom: 1rem;
}

.scenariosTitle {
    color: var(--muted);
    font-size: 0.85rem;
    font-weight: 700;
    margin-bottom: 0.75rem;
}

.scenariosGrid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 8px;
}

.scenarioMiniCard {
    padding: 0.85rem;
}

.scenarioMiniCard h4 {
    font-size: 0.85rem;
    margin-bottom: 0.5rem;
}

.scenarioMiniValue {
    font-size: 1.1rem;
    font-weight: 900;
    color: var(--primary);
}

.scenarioMiniMeta {
    font-size: 0.75rem;
    color: var(--muted);
    margin-top: 0.25rem;
}

.projectActions {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
}

.compareWrap {
    margin-top: 1.5rem;
}

.emptyStateHint {
    font-size: 0.8rem;
    margin-top: 0.5rem;
}

.listingBadge {
    padding: 0.4rem 0.75rem;
    background: rgba(var(--primary-rgb), 0.08);
    border-radius: 10px;
    color: var(--primary);
    font-weight: 700;
    font-size: 0.8rem;
    text-align: center;
}
```
**Kritik nokta:** `.scenarioMiniCard h4 { font-size: 0.85rem; margin-bottom: 0.5rem; }` selector'ı BİLEREK `.scenarioMiniCard` (class) + `h4` (element) — bu, mevcut `.reportCard h4` kuralıyla (dashboard.module.css'te zaten var, `font-weight:800; font-size:1rem; color:var(--card-title); margin-bottom:0.75rem;`) AYNI specificity'de (0,1,1). İkisi de scenario mini-card'ın `<h4>`'üne uygulanır; specificity eşit olduğu için SIRALAMA kazanır — `.scenarioMiniCard h4` dosyada `.reportCard h4`'ten SONRA geldiği için font-size/margin-bottom'u doğru override eder, font-weight/color `.reportCard h4`'ten miras kalır (orijinal inline stille birebir aynı sonuç). Sıralamayı bozma.

- [ ] **Step 4: Mevcut TEK mobil bloğa seal kuralları ekle**

`dashboard.module.css`'in SONUNDAKİ mevcut blok şu an:
```css
@media (max-width: 768px) {
  .mainContent {
    overflow: visible;
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
  }
}
```
Bunu şuna GENİŞLET (aynı blok, `.mainContent` kuralının HEMEN ALTINA, blok kapanışından ÖNCE):
```css
@media (max-width: 768px) {
  .mainContent {
    overflow: visible;
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
  }

  [data-theme="dark"] .listingCard,
  [data-theme="dark"] .reportCard {
    --seal-surface: linear-gradient(160deg, #0F2A43 0%, #16324F 100%);
    --seal-border-soft: rgba(43, 124, 255, 0.18);
  }

  [data-theme="light"] .listingCard,
  [data-theme="light"] .reportCard {
    --seal-surface: var(--shell-bg);
    --seal-border-soft: var(--shell-border);
  }

  .listingCard,
  .reportCard {
    background: var(--seal-surface);
    border-color: var(--seal-border-soft);
    backdrop-filter: blur(24px);
    -webkit-backdrop-filter: blur(24px);
  }

  .scenarioMiniValue,
  .metaValue {
    font-family: 'JetBrains Mono', 'IBM Plex Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    font-variant-numeric: tabular-nums;
  }
}
```

- [ ] **Step 5: `dashboardStyles.scope.test.ts`'e yeni describe bloğu ekle**

Dosyanın TEPESİNDEKİ `const css = ...` satırının hemen altına ekle:
```ts
const globalsCss = fs.readFileSync(path.join(__dirname, '../globals.css'), 'utf8')
```
Dosyanın SONUNA (mevcut `describe` bloğunun kapanışından SONRA) ekle:
```ts

describe('dashboard/projects + dashboard/reports mobil mühür kimliği token kapsamı', () => {
  it('yeni seal token\'ları globals.css içine hiç sızmamış olmalı', () => {
    expect(globalsCss).not.toMatch(/--seal-(surface|border)/)
  })

  it('--seal-surface hem dark hem light tema bloğunda, .listingCard/.reportCard için tanımlı olmalı', () => {
    expect(css).toMatch(/\[data-theme="dark"\]\s*\.listingCard,\s*\n?\s*\[data-theme="dark"\]\s*\.reportCard\s*\{[^}]*--seal-surface:/)
    expect(css).toMatch(/\[data-theme="light"\]\s*\.listingCard,\s*\n?\s*\[data-theme="light"\]\s*\.reportCard\s*\{[^}]*--seal-surface:/)
  })

  it('.listingCard/.reportCard mobilde --seal-surface kullanmalı, masaüstü tanımları var(--stat-bg) olarak kalmalı', () => {
    const mediaIndex = css.indexOf('@media (max-width: 768px)')
    const desktopSection = css.slice(0, mediaIndex)
    const mobileSection = css.slice(mediaIndex)
    expect(mobileSection).toMatch(/\.listingCard,\s*\n?\s*\.reportCard\s*\{[^}]*background:\s*var\(--seal-surface\)/)
    expect(desktopSection).toMatch(/\.reportCard\s*\{[^}]*background:\s*var\(--stat-bg\)/)
    expect(desktopSection).toMatch(/\.listingCard\s*\{[^}]*background:\s*var\(--stat-bg\)/)
  })

  it('.statusActive/.statusClosed mobilde seal token kullanmamalı (semantik renk korunur)', () => {
    const mediaIndex = css.indexOf('@media (max-width: 768px)')
    const mobileSection = css.slice(mediaIndex)
    expect(mobileSection).not.toMatch(/\.statusActive[^}]*seal-/)
    expect(mobileSection).not.toMatch(/\.statusClosed[^}]*seal-/)
  })

  it('.scenarioMiniValue/.metaValue mobilde tabular-nums olmalı', () => {
    const mediaIndex = css.indexOf('@media (max-width: 768px)')
    const mobileSection = css.slice(mediaIndex)
    expect(mobileSection).toMatch(/\.scenarioMiniValue,\s*\n?\s*\.metaValue\s*\{[^}]*font-variant-numeric:\s*tabular-nums/)
  })

  it('yalnızca TEK bir @media (max-width: 768px) bloğu olmalı (pozisyonel guard testlerinin varsayımı)', () => {
    const matches = css.match(/@media \(max-width: 768px\)/g) || []
    expect(matches.length).toBe(1)
  })
})
```

- [ ] **Step 6: Çalıştır ve doğrula**

```bash
npx jest dashboard --no-coverage
npx tsc --noEmit
npx eslint src/app/dashboard/projects/page.tsx src/app/dashboard/reports/page.tsx src/app/dashboard/dashboard.module.css
```
Beklenen: tüm dashboard testleri (eski + yeni 6 test) PASS, tsc 0, eslint 0.

- [ ] **Step 7: Tam suite + masaüstü/mobil görsel doğrulama**

```bash
npx jest --no-coverage
```
Docker + dev server açıksa (`manualcheck@local.test` / `Test1234!`):
- Masaüstü: `/dashboard/projects` ve `/dashboard/reports`'ta `.listingCard`/`.reportCard`'ın hâlâ `var(--stat-bg)` (eski görünüm) olduğunu, `.statusActive` yeşilinin değişmediğini doğrula (computed style ile, ekran görüntüsü yorumlamak yerine — bkz. proje hafızası: computed-style'a güven).
- Mobil (390px): her iki sayfada da kartların cam yüzeye (`--seal-surface`+blur) geçtiğini, senaryo mini-kartlarındaki/rapor meta değerlerindeki rakamların tabular-nums/mono font olduğunu, `dashboard/projects`'te "Karşılaştır" tıklanınca Task 3'ün mobil kart karuselinin göründüğünü doğrula.

- [ ] **Step 8: Commit**

```bash
git add src/app/dashboard/projects/page.tsx src/app/dashboard/reports/page.tsx src/app/dashboard/dashboard.module.css src/app/dashboard/dashboardStyles.scope.test.ts
git commit -m "feat(dashboard): projects+reports inline temizlik + mobil Mühür kimliği

13 inline stil (projects) + 1 inline stil (reports) dashboard.module.css'e taşındı.
.listingCard/.reportCard mobilde --seal-surface+blur24px, rakamlar tabular-nums.
Mevcut tek @media(max-width:768px) bloğuna eklendi (ikinci blok açılmadı — pozisyonel
guard testleri korunuyor). .statusActive/.statusClosed semantik renkleri dokunulmadı."
```

---

## Task 7: BottomNavbar — Okunmamış Mesaj Rozeti

**Files:**
- Modify: `src/components/layout/BottomNavbar.tsx`
- Modify: `src/components/layout/BottomNavbar.module.css`
- Modify: `src/components/layout/__tests__/BottomNavbar.test.tsx`

**Interfaces:**
- Consumes: `GET /api/messages` → `{ conversations: { otherUser, lastMessage, lastMessageAt, unreadCount: number }[] }` (mevcut endpoint, değişmez).
- Produces: yok.

- [ ] **Step 1: Testleri YAZ (RED — henüz component değişmedi)**

`src/components/layout/__tests__/BottomNavbar.test.tsx` — mevcut 3 testin ÜSTÜNDEKİ mock bloklarını genişlet, ALTINA yeni testler ekle:
```tsx
/** @jest-environment jsdom */
import { render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { BottomNavbar } from '../BottomNavbar'

let mockPathname = '/marketplace'
jest.mock('next/navigation', () => ({ usePathname: () => mockPathname }))

let mockStatus: 'authenticated' | 'unauthenticated' | 'loading' = 'unauthenticated'
jest.mock('next-auth/react', () => ({ useSession: () => ({ status: mockStatus }) }))

describe('BottomNavbar', () => {
  beforeEach(() => {
    mockPathname = '/marketplace'
    mockStatus = 'unauthenticated'
    global.fetch = jest.fn()
  })

  it('normal bir sayfada (marketplace) render edilir', () => {
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

  it('oturumsuz kullanıcıda mesaj API\'sine hiç istek atılmaz, rozet render edilmez', async () => {
    mockStatus = 'unauthenticated'
    render(<BottomNavbar />)
    await waitFor(() => expect(global.fetch).not.toHaveBeenCalled())
    expect(screen.queryByText(/^\d+\+?$/)).not.toBeInTheDocument()
  })

  it('okunmamış mesaj yoksa rozet render edilmez', async () => {
    mockStatus = 'authenticated'
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ conversations: [{ unreadCount: 0 }, { unreadCount: 0 }] }),
    })
    render(<BottomNavbar />)
    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith('/api/messages'))
    expect(screen.queryByText('0')).not.toBeInTheDocument()
  })

  it('okunmamış mesaj sayısı konuşmalar arasında toplanıp rozette gösterilir', async () => {
    mockStatus = 'authenticated'
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ conversations: [{ unreadCount: 2 }, { unreadCount: 3 }] }),
    })
    render(<BottomNavbar />)
    expect(await screen.findByText('5')).toBeInTheDocument()
  })

  it('okunmamış sayı 9\'dan büyükse "9+" gösterilir', async () => {
    mockStatus = 'authenticated'
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ conversations: [{ unreadCount: 12 }] }),
    })
    render(<BottomNavbar />)
    expect(await screen.findByText('9+')).toBeInTheDocument()
  })

  it('fetch hata verirse rozet sessizce gizli kalır', async () => {
    mockStatus = 'authenticated'
    ;(global.fetch as jest.Mock).mockRejectedValue(new Error('network'))
    render(<BottomNavbar />)
    await waitFor(() => expect(global.fetch).toHaveBeenCalled())
    expect(screen.queryByText(/^\d+\+?$/)).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Testi çalıştır, RED olduğunu doğrula**

```bash
npx jest BottomNavbar.test.tsx --no-coverage
```
Beklenen: 3 eski test PASS, 5 yeni test FAIL (henüz `useSession`/fetch mantığı component'te yok, `global.fetch` hiç çağrılmıyor).

- [ ] **Step 3: `BottomNavbar.tsx`'i implemente et**

Tam dosya:
```tsx
"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import styles from './BottomNavbar.module.css';

interface Conversation {
    unreadCount: number;
}

export function BottomNavbar() {
    const pathname = usePathname();
    const { status } = useSession();
    const [unreadTotal, setUnreadTotal] = useState(0);

    useEffect(() => {
        if (status !== 'authenticated') {
            setUnreadTotal(0);
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

    if (pathname === '/login' || pathname === '/register') return null;

    const unreadLabel = unreadTotal > 9 ? '9+' : String(unreadTotal);

    return (
        <nav className={styles.bottomNav}>
            <Link href="/marketplace" className={`${styles.navItem} ${pathname === '/marketplace' ? styles.active : ''}`}>
                <div className={styles.iconWrap}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
                </div>
                <span>Pazar</span>
            </Link>

            <Link href="/dashboard/reports" className={`${styles.navItem} ${pathname === '/dashboard/reports' ? styles.active : ''}`}>
                <div className={styles.iconWrap}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                </div>
                <span>Raporlar</span>
            </Link>

            {/* iOS Center Floating Action Button Style */}
            <Link href="/hesapla" className={`${styles.navItem} ${styles.fabContainer}`}>
                <div className={`${styles.fabItem} ${pathname === '/hesapla' ? styles.fabActive : ''}`}>
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
                </div>
                <span className={styles.fabText} style={{ fontWeight: pathname === '/hesapla' ? 800 : 700, color: pathname === '/hesapla' ? 'var(--primary)' : 'var(--muted)' }}>Hesapla</span>
            </Link>

            <Link href="/inbox" className={`${styles.navItem} ${pathname === '/inbox' ? styles.active : ''}`}>
                <div className={styles.iconWrap}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
                    {unreadTotal > 0 && (
                        <span className={styles.badge}>{unreadLabel}</span>
                    )}
                </div>
                <span>Mesajlar</span>
            </Link>

            <Link href="/dashboard/profile" className={`${styles.navItem} ${pathname === '/dashboard/profile' ? styles.active : ''}`}>
                <div className={styles.iconWrap}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                </div>
                <span>Profil</span>
            </Link>
        </nav>
    );
}
```
(Değişenler: `useEffect`/`useState`/`useSession` importları, `unreadTotal`/`unreadLabel` mantığı, "Mesajlar" `<Link>`'inin `.iconWrap`'ine badge `<span>`. Geri kalan JSX byte-for-byte aynı.)

- [ ] **Step 4: `BottomNavbar.module.css`'e badge sınıfını ekle**

`.fabText` kuralının ALTINA (dosyanın sonuna) ekle:
```css
.badge {
    position: absolute;
    top: -2px;
    right: -6px;
    min-width: 16px;
    height: 16px;
    border-radius: 8px;
    padding: 0 4px;
    background: var(--red);
    border: 2px solid var(--bg);
    color: white;
    font-size: 0.6rem;
    font-weight: 900;
    line-height: 1;
    display: flex;
    align-items: center;
    justify-content: center;
}
```
(`.iconWrap` zaten `position: relative` — Adım gerekmez. `var(--bg)` FAB butonunun halka tekniğiyle aynı token, `.fabItem`'ın box-shadow'unda zaten kullanılıyor.)

- [ ] **Step 5: Testi tekrar çalıştır — GREEN**

```bash
npx jest BottomNavbar.test.tsx --no-coverage
npx tsc --noEmit
npx eslint src/components/layout/BottomNavbar.tsx
```
Beklenen: 8/8 PASS, tsc 0, eslint 0.

- [ ] **Step 6: Tam suite + görsel doğrulama**

```bash
npx jest --no-coverage
```
Docker + dev server açıksa, iki e2e kullanıcısı (`user1@e2e.test`/`user2@e2e.test`) arasında `/inbox`'tan bir mesaj gönderip diğer kullanıcıyla giriş yaparak BottomNavbar'da Mesajlar ikonunda kırmızı rozetin göründüğünü, mesaj okunduktan sonra rozetin kaybolduğunu (pathname `/inbox`'a girip çıkınca tazelenerek) doğrula.

- [ ] **Step 7: Commit**

```bash
git add src/components/layout/BottomNavbar.tsx src/components/layout/BottomNavbar.module.css src/components/layout/__tests__/BottomNavbar.test.tsx
git commit -m "feat(bottom-navbar): gerçek okunmamış mesaj rozeti

/api/messages'tan unreadCount toplanır, mount+pathname değişiminde tazelenir.
Oturumsuzda hiç fetch atılmaz, hata durumunda rozet sessizce gizli kalır (best-effort
UI zenginleştirmesi, kritik veri değil). TDD: 5 yeni test RED->GREEN."
```

---

## Task 8: Final Doğrulama

**Files:**
- Modify: `e2e/mobil-smoke.spec.ts`

**Interfaces:**
- Consumes: `loginAs` (`e2e/helpers.ts`), `POST /api/projects`, `POST /api/projects/[id]/scenarios`, `POST /api/compare/share` (mevcut endpoint'ler).
- Produces: yok (planın son task'ı).

- [ ] **Step 1: `mobil-smoke.spec.ts` PAGES dizisine yeni sayfaları ekle**

`e2e/mobil-smoke.spec.ts`'teki `PAGES` dizisini güncelle:
```ts
const PAGES: { path: string; fixme?: string; auth?: boolean }[] = [
    { path: '/' },
    { path: '/login' },
    { path: '/register' },
    { path: '/listing/e2e-mock', auth: true },
    { path: '/marketplace', auth: true },
    { path: '/hesapla' },
    { path: '/profile/e2e-user-1' },
    { path: '/dashboard/projects', auth: true },
    { path: '/dashboard/reports', auth: true },
]
```

- [ ] **Step 2: `/compare/[token]` için dinamik token testi ekle**

Dosyanın SONUNA (mevcut `for` döngüsünden SONRA) ekle:
```ts
test('mobil 390px: /compare/[token] yatay taşma yok', async ({ page }) => {
    await loginAs(page)
    // page.request, page.context()'in çerezlerini (next-auth session) otomatik taşır —
    // manuel Cookie header oluşturmaya gerek yok.
    const projectRes = await page.request.post('/api/projects', {
        data: {
            name: 'E2E Karşılaştırma Projesi',
            scenario: {
                name: 'Senaryo A', luxLevel: 1.0, apartmentSize: 100, landShareRatio: 0.3,
                riskLevel: 1, builderProfit: 1.2, fdTotal: 4000000, fdPerM2: 40000,
                mi: 1500000, ma: 1000000, totalCost: 2500000,
            },
        },
    })
    const { project } = await projectRes.json()

    const scenarioRes = await page.request.post(`/api/projects/${project.id}/scenarios`, {
        data: {
            name: 'Senaryo B', luxLevel: 1.4, apartmentSize: 140, landShareRatio: 0.35,
            riskLevel: 2, builderProfit: 1.3, fdTotal: 6000000, fdPerM2: 42857,
            mi: 2200000, ma: 1500000, totalCost: 3700000,
        },
    })
    const { scenario } = await scenarioRes.json()

    const shareRes = await page.request.post('/api/compare/share', {
        data: { scenarioIds: [project.scenarios[0].id, scenario.id] },
    })
    const { token } = await shareRes.json()

    await page.goto(`/compare/${token}`)
    await page.waitForLoadState('networkidle')
    await assertNoHorizontalOverflow(page)
    await page.screenshot({ path: 'e2e/screenshots/mobil_compare_token.png', fullPage: true })
})
```

- [ ] **Step 3: Tam komut paketini çalıştır**

```bash
npx tsc --noEmit
npx eslint .
npx jest --no-coverage
npm run build
```
Beklenen: hepsi temiz (0 tsc hatası, 0 eslint ihlali, tüm jest testleri PASS, build başarılı, `/board` route'unun build çıktısında görünmediğini doğrula).

- [ ] **Step 4: Playwright — Docker + dev server gerekli**

```bash
# Docker Desktop açık değilse başlat, sonra:
docker compose -f docker-compose.dev.yml up -d
npx prisma@5.22.0 migrate deploy
npm run dev:next
# ayrı terminalde:
npx playwright test mobil-smoke
npx playwright test desktop-baseline
```
Beklenen: `mobil-smoke.spec.ts`'teki tüm testler (9 sayfa + compare token testi) PASS, yatay taşma 0. `desktop-baseline.spec.ts` (Faz1 kapsamı, bu planda dokunulan sayfaları içermiyor ama regresyon sinyali için) PASS.

- [ ] **Step 5: Masaüstü regresyon — manuel/computed-style**

Docker+login ile (`manualcheck@local.test` / `Test1234!` veya e2e kullanıcıları), masaüstü 1280px'te şu 4 sayfayı tek tek aç ve computed style ile (ekran görüntüsü YORUMLAMAK yerine — proje hafızasındaki ders) doğrula:
- `/compare/[token]`: `.card` background hâlâ `var(--panel)` çözümleniyor, `.ctaBtn` hâlâ gradient.
- `/profile/[userId]`: `.section` background hâlâ `var(--panel)`.
- `/dashboard/projects`: `.listingCard`/`.reportCard` background hâlâ `var(--stat-bg)`, "Karşılaştır" tıklanınca `ScenarioCompare` tablosu (kart değil) görünüyor.
- `/dashboard/reports`: `.reportCard` background hâlâ `var(--stat-bg)`.
- Landing (`/`): taşma yok (zaten mevcut `/` PAGES girdisiyle otomatik doğrulanıyor), yeni bir kod değişikliği yok.

- [ ] **Step 6: Mobil görsel denetim — Docker+login**

390×844'te aynı 4 sayfada + `/hesapla` + `/dashboard/projects`'in "Karşılaştır" açık haliyle: cam panel yüzeyleri, tabular-nums rakamlar, ScenarioCompare'in kart karuseli (dot göstergesiyle kaydırılabilir), BottomNavbar'da (gerçek okunmamış mesaj varsa) rozetin doğru göründüğünü doğrula. Dark VE light temada tekrarla.

- [ ] **Step 7: `.superpowers/sdd/progress.md` ledger'ını güncelle**

Faz 3'ün tüm task'larının tamamlandığını, final whole-branch review'a hazır olduğunu not düş (subagent-driven-development akışının kendi ledger deseniyle).

- [ ] **Step 8: Commit**

```bash
git add e2e/mobil-smoke.spec.ts
git commit -m "test(e2e): Faz 3 sayfaları mobil smoke kapsamına eklendi

profile/dashboard-projects/dashboard-reports PAGES dizisine, compare/[token] için
dinamik token üreten ayrı bir test eklendi (proje+2 senaryo+paylaşım API'siyle)."
```

---

## Task Sırası ve Bağımlılıklar

1. Task 1 (board silme) — bağımsız.
2. Task 2 (ScenarioCompare refactor) — bağımsız.
3. Task 3 (ScenarioCompare mobil kart) — Task 2'ye bağımlı.
4. Task 4 (compare sayfası) — Task 3'e bağımlı (görsel olarak ScenarioCompare'in mobil kartını miras alır).
5. Task 5 (profile sayfası) — bağımsız.
6. Task 6 (dashboard/projects+reports) — Task 3'e bağımlı (ScenarioCompare modalı).
7. Task 7 (BottomNavbar rozeti) — bağımsız.
8. Task 8 (final doğrulama) — hepsine bağımlı.

Sıra: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 (4/5/6/7 aralarında paralel çalışılabilir ama subagent-driven-development tek implementer akışında sıralı ilerlenecek).
