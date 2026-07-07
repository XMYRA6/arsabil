# Listing/Marketplace/Dashboard Mühür Kimliği Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend hesapla mobile'ın "Mühür Lacivert" cam kart + tabular-nums + aurora-gradient kimliğini `listing/[id]`, `marketplace` (+ `ListingCard`) ve `dashboard` sayfalarına, yalnızca mobil (`≤768px`) görünümde taşımak.

**Architecture:** Her sayfa, hesapla'daki birebir desenle kendi `--seal-*` token setini kendi `page.module.css`'inin kendi `@media (max-width: 768px)` bloğu içinde tanımlar (globals.css'e sızmaz). Panel-seviyeli yüzeyler (`.tabContent`/`.sidebar`, marketplace `.container`/`.topBar`/`.listPanel`, dashboard `.section`) `var(--seal-surface)` cam yüzeyine geçer; içindeki semantik-renksiz "hücreler" (`.detailCell`/`.fizCell`, dashboard `.reportRow`/`.offerRow`) daha koyu/hafif bir "recessed" tonuna (hesapla'nın `.luxGrid` deseniyle aynı) geçer ki panelle aynı camın içinde kaybolmasınlar; semantik renkli yüzeyler (yeşil/mavi mini-stat, dashboard statCard, offer status pilleri) hiç dokunulmaz. Para/yüzde/skor rakamları `tabular-nums` mono fonta geçer. Gerçek birincil CTA'lar (`--primary` flat mavi kullanan düğmeler) `var(--brand-gradient)`'e geçer; aktif-durum göstergeleri (filter chip, sayfa numarası) hesapla'nın segmented-control emsaliyle aynı mantıkla düz `var(--seal-accent)` alır (gradient almaz). "Canlı Mühür" animasyonu yalnızca `listing/[id]`'de, paylaşılan `FizibiliteScoreBadge` bileşenine DOKUNMADAN, sayfaya özel yeni bir `ScoreRevealBadge` sarmalayıcısıyla eklenir (aksi halde marketplace'teki `ListingCard` de bu bileşeni kullandığı için animasyon istemeden oraya da sızardı).

**Tech Stack:** Next.js 16 (App Router), React 19, CSS Modules, framer-motion (zaten kurulu), Jest + Testing Library.

## Global Constraints

- Yalnızca mobil: tüm yeni/değişen kurallar `@media (max-width: 768px)` içinde. Masaüstü hiçbir dosyada değişmez.
- `globals.css`'e yeni global token eklenmez — her sayfa kendi `--seal-*` setini kendi dosyasında tanımlar.
- Semantik durum renkleri (yeşil/turuncu/kırmızı, mini-stat/statCard/offerStatus tint'leri) dokunulmaz.
- `--seal-accent: var(--aurora-cyan)`, `--seal-accent-rgb: 43, 124, 255`, `--seal-ink: #0F2A43` — üç sayfada da aynı literal değerler (hesapla ile birebir tutarlı).
- Para/yüzde/skor rakamları: `font-family: 'JetBrains Mono', 'IBM Plex Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-variant-numeric: tabular-nums;`
- Gradient CTA: `background: var(--brand-gradient); color: white;` — yalnızca gerçek "birincil aksiyon" düğmelerinde (bkz. her task'ın gerekçesi), toggle/seçim göstergelerinde değil.
- `FizibiliteScoreBadge.tsx` (`src/components/marketplace/`) ve `ListingCard.tsx`'in mevcut inline stil/JSX yapısı — bu plan kapsamında **davranışsal** değişiklik yapılmaz, yalnızca Task 4'te salt-tipografi amaçlı küçük bir JSX sarmalama eklenir.

---

### Task 1: `listing/[id]` — Mühür token'ları + cam panel + recessed hücreler + tabular-nums + gradient CTA

**Files:**
- Modify: `src/app/listing/[id]/page.module.css`
- Test: `src/app/listing/[id]/pageStyles.scope.test.ts` (yeni)

**Interfaces:**
- Consumes: `globals.css`'teki `--aurora-cyan`, `--brand-gradient`, `--shell-bg`, `--shell-border`, `--card-title`, `--muted` (mevcut, değişmez).
- Produces: `--seal-surface`/`--seal-border(-soft)`/`--seal-text(-muted/-faint)`/`--seal-recessed` — Task 2'de `ScoreRevealBadge` bu token'lara ihtiyaç duymaz (kendi animasyonunu taşır), ama sonraki hiçbir task bu değişkenlere bağımlı değildir; bu task kendi içinde kapanır.

- [ ] **Step 1: Scope-guard testini yaz (henüz CSS değişikliği yok, test fail etmeli)**

`src/app/listing/[id]/pageStyles.scope.test.ts`:

```ts
import fs from 'fs';
import path from 'path';

const pageCss = fs.readFileSync(path.join(__dirname, 'page.module.css'), 'utf8');
const globalsCss = fs.readFileSync(path.join(__dirname, '../../globals.css'), 'utf8');

describe('listing/[id] mobil mühür kimliği token kapsamı', () => {
  it('yeni seal token\'ları globals.css içine hiç sızmamış olmalı', () => {
    expect(globalsCss).not.toMatch(/--seal-(ink|accent|surface|border|text|recessed)/);
  });

  it('--seal-accent, hesapla ile aynı Aurora cyan\'ı kullanmalı', () => {
    expect(pageCss).toMatch(/--seal-accent:\s*var\(--aurora-cyan\)/);
    expect(pageCss).toMatch(/--seal-accent-rgb:\s*43,\s*124,\s*255/);
  });

  it('--seal-ink tanımı mobil @media (max-width: 768px) bloğunun içinde olmalı', () => {
    const mediaIndex = pageCss.indexOf('@media (max-width: 768px)');
    const tokenIndex = pageCss.indexOf('--seal-ink:');
    expect(mediaIndex).toBeGreaterThan(-1);
    expect(tokenIndex).toBeGreaterThan(mediaIndex);
  });

  it('--seal-surface hem dark hem light tema bloğunda tanımlı olmalı', () => {
    expect(pageCss).toMatch(/\[data-theme="dark"\]\s*\.page\s*\{[^}]*--seal-surface:/);
    expect(pageCss).toMatch(/\[data-theme="light"\]\s*\.page\s*\{[^}]*--seal-surface:/);
  });

  it('light temada --seal-surface mevcut --shell-bg\'yi yeniden kullanmalı (yeni rgba icat edilmemeli)', () => {
    expect(pageCss).toMatch(/\[data-theme="light"\]\s*\.page\s*\{[^}]*--seal-surface:\s*var\(--shell-bg\)/);
  });

  it('.primaryBtn ve .actionPrimary mobilde brand-gradient kullanmalı, masaüstü tanımları hâlâ düz --primary olmalı', () => {
    const mediaIndex = pageCss.indexOf('@media (max-width: 768px)');
    const desktopSection = pageCss.slice(0, mediaIndex);
    const mobileSection = pageCss.slice(mediaIndex);
    expect(mobileSection).toMatch(/\.primaryBtn,\s*\n?\s*\.actionPrimary\s*\{[^}]*background:\s*var\(--brand-gradient\)/);
    expect(desktopSection).toMatch(/\.primaryBtn\s*\{[^}]*background:\s*var\(--primary\)/);
    expect(desktopSection).toMatch(/\.actionPrimary\s*\{[^}]*background:\s*var\(--primary\)/);
  });

  it('.detailCell/.fizCell mobilde --seal-recessed kullanmalı (panelle aynı seal-surface olup kaybolmamalı)', () => {
    expect(pageCss).toMatch(/\.detailCell,\s*\n?\s*\.fizCell\s*\{[^}]*background:\s*var\(--seal-recessed\)/);
  });

  it('.sidebar ve .tabContent mobilde --seal-surface cam yüzeyine geçmeli', () => {
    expect(pageCss).toMatch(/\.sidebar\s*\{[^}]*background:\s*var\(--seal-surface\)/);
    expect(pageCss).toMatch(/\.tabContent\s*\{[^}]*background:\s*var\(--seal-surface\)/);
  });
});
```

- [ ] **Step 2: Testi çalıştır, fail ettiğini doğrula**

Run: `npx jest listing/\[id\]/pageStyles.scope --no-coverage`
Expected: FAIL (yeni CSS kuralları henüz yok — `--seal-accent`, `.tabContent` seal-surface vb. eşleşmeyecek).

- [ ] **Step 3: `page.module.css`'in mobil bloğunu güncelle**

`.sidebar` seçicisini şu şekilde değiştir (mevcut `position: sticky; ...` bloğunun sonuna ekle, satır 361-371 civarı — masaüstü bloğu **değişmez**, sadece mobil `@media` içine yeni override eklenecek):

`.tabContent` seçicisi için de aynı şekilde masaüstü bloğu (satır 189-194) değişmez, mobil override eklenir.

Dosyanın **mevcut** son `@media (max-width: 768px) { ... }` bloğunu (satır 525-572) aşağıdaki içerikle **birebir değiştir**:

```css
@media (max-width: 768px) {
    .page {
        /* alt boşluk: StickyActionBar + BottomNavbar */
        padding: 12px 12px calc(var(--bottomnav-height) + 76px);

        /* Mühür kimliği — sayfa-scope'lu token'lar (bkz. hesapla/page.module.css) */
        --seal-ink: #0F2A43;
        --seal-accent: var(--aurora-cyan);
        --seal-accent-rgb: 43, 124, 255;
    }

    [data-theme="dark"] .page {
        --seal-surface: linear-gradient(160deg, #0F2A43 0%, #16324F 100%);
        --seal-border: rgba(43, 124, 255, 0.25);
        --seal-border-soft: rgba(43, 124, 255, 0.18);
        --seal-text: #F4F0E6;
        --seal-text-muted: rgba(244, 240, 230, 0.7);
        --seal-text-faint: rgba(244, 240, 230, 0.55);
        --seal-recessed: rgba(0, 0, 0, 0.2);
    }

    [data-theme="light"] .page {
        --seal-surface: var(--shell-bg);
        --seal-border: var(--shell-border);
        --seal-border-soft: var(--shell-border);
        --seal-text: var(--card-title);
        --seal-text-muted: var(--muted);
        --seal-text-faint: var(--muted);
        --seal-recessed: rgba(0, 0, 0, 0.03);
    }

    /* AppBar'ın geri butonu var; metin geri linki gizlenir */
    .backBtn {
        display: none;
    }

    .grid {
        grid-template-columns: 1fr;
        gap: 16px;
    }

    /* Grid blowout fix: min-width:auto varsayılanı, sığmayan içerik (ör.
       detailGrid/description) yüzünden tek kolonu taşırır; sıfırlanır. */
    .grid > div {
        min-width: 0;
    }

    .photoArea {
        height: 240px;
        border-radius: 14px;
    }

    .title {
        font-size: var(--font-size-title);
    }

    .fizGrid {
        grid-template-columns: 1fr;
    }

    .sidebar {
        position: static;
        background: var(--seal-surface);
        border-color: var(--seal-border-soft);
        backdrop-filter: blur(24px);
        -webkit-backdrop-filter: blur(24px);
    }

    .tabContent {
        background: var(--seal-surface);
        border-color: var(--seal-border-soft);
        backdrop-filter: blur(24px);
        -webkit-backdrop-filter: blur(24px);
    }

    .detailCell,
    .fizCell {
        background: var(--seal-recessed);
    }

    .priceValue,
    .fizValue,
    .detailValue,
    .miniStatValue,
    .progressValue,
    .offerShare,
    .changeBadge {
        font-family: 'JetBrains Mono', 'IBM Plex Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
        font-variant-numeric: tabular-nums;
    }

    .primaryBtn,
    .actionPrimary {
        background: var(--brand-gradient);
        color: white;
    }

    /* aksiyonlar StickyActionBar'a taşındı; sidebar kopyası gizlenir */
    .sidebarActions {
        display: none;
    }

    .offerTextarea {
        font-size: 16px; /* iOS zoom tetiklenmesin */
    }
}
```

- [ ] **Step 4: Testi çalıştır, geçtiğini doğrula**

Run: `npx jest listing/\[id\]/pageStyles.scope --no-coverage`
Expected: PASS (8/8 test).

- [ ] **Step 5: Commit**

```bash
git add "src/app/listing/[id]/page.module.css" "src/app/listing/[id]/pageStyles.scope.test.ts"
git commit -m "feat(listing): mobil mühür kimliği — cam panel, recessed hücreler, tabular-nums, gradient CTA"
```

---

### Task 2: `listing/[id]` — "Canlı Mühür" (ScoreRevealBadge)

**Files:**
- Create: `src/app/listing/[id]/ScoreRevealBadge.tsx`
- Create: `src/app/listing/[id]/ScoreRevealBadge.test.tsx`
- Modify: `src/app/listing/[id]/page.tsx:7` (import), `:140-142` (kullanım)

**Interfaces:**
- Consumes: `FizibiliteScoreBadge` (`src/components/marketplace/FizibiliteScoreBadge.tsx`) — mevcut `{ score: number; size?: 'sm'|'md'|'lg'; showLabel?: boolean }` props, **değişmeden**.
- Produces: `ScoreRevealBadge({ score, size, showLabel })` — aynı prop imzası, `page.tsx` bunu doğrudan `FizibiliteScoreBadge`'in yerine kullanır. `ListingCard.tsx` bu bileşeni **kullanmaz** — hâlâ doğrudan `FizibiliteScoreBadge`'i çağırır (kasıtlı, animasyon marketplace listesine sızmasın diye).

- [ ] **Step 1: Başarısız testi yaz**

`src/app/listing/[id]/ScoreRevealBadge.test.tsx`:

```tsx
/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react';
import { ScoreRevealBadge } from './ScoreRevealBadge';

describe('ScoreRevealBadge', () => {
  it('skoru ve /100 etiketini FizibiliteScoreBadge üzerinden render eder', () => {
    render(<ScoreRevealBadge score={82} size="lg" showLabel />);
    expect(screen.getByText('82')).toBeInTheDocument();
    expect(screen.getByText('/100')).toBeInTheDocument();
    expect(screen.getByText('Yüksek')).toBeInTheDocument();
  });

  it('showLabel verilmediğinde etiket metnini göstermez', () => {
    render(<ScoreRevealBadge score={45} size="md" />);
    expect(screen.queryByText('Riskli')).not.toBeInTheDocument();
  });
});

describe('ScoreRevealBadge — prefers-reduced-motion', () => {
  const setMatchMedia = (matches: boolean) => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation((query: string) => ({
        matches,
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
    });
  };

  it('prefers-reduced-motion: reduce iken de skor görünür olmalı (animasyonsuz render)', () => {
    setMatchMedia(true);
    render(<ScoreRevealBadge score={70} size="lg" showLabel />);
    expect(screen.getByText('70')).toBeInTheDocument();
  });

  it('reduced motion kapalıyken de skor görünür olmalı (animasyonlu render)', () => {
    setMatchMedia(false);
    render(<ScoreRevealBadge score={70} size="lg" showLabel />);
    expect(screen.getByText('70')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Testi çalıştır, fail ettiğini doğrula**

Run: `npx jest ScoreRevealBadge --no-coverage`
Expected: FAIL with "Cannot find module './ScoreRevealBadge'".

- [ ] **Step 3: Bileşeni yaz**

`src/app/listing/[id]/ScoreRevealBadge.tsx`:

```tsx
"use client";

import { motion, useReducedMotion } from 'framer-motion';
import { FizibiliteScoreBadge } from '@/components/marketplace/FizibiliteScoreBadge';

interface Props {
  score: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

/** "Canlı Mühür" — ilan detayında skor rozeti ilk göründüğünde tek seferlik damga-oturma animasyonu. */
export function ScoreRevealBadge({ score, size, showLabel }: Props) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={shouldReduceMotion ? false : { scale: 1.4, rotate: -6, opacity: 0 }}
      animate={{ scale: 1, rotate: 0, opacity: 1 }}
      transition={{ type: 'spring', duration: 0.18 }}
    >
      <FizibiliteScoreBadge score={score} size={size} showLabel={showLabel} />
    </motion.div>
  );
}
```

- [ ] **Step 4: Testi çalıştır, geçtiğini doğrula**

Run: `npx jest ScoreRevealBadge --no-coverage`
Expected: PASS (4/4 test).

- [ ] **Step 5: `page.tsx`'e bağla**

`src/app/listing/[id]/page.tsx:7` — import satırını değiştir:

```tsx
import { ScoreRevealBadge } from './ScoreRevealBadge';
```

(Eski `import { FizibiliteScoreBadge } from '@/components/marketplace/FizibiliteScoreBadge';` satırını sil — dosyada başka hiçbir yerde kullanılmıyor.)

`page.tsx:139-142` — kullanım:

```tsx
                        {/* Fizibilite score overlay */}
                        <div className={styles.scoreOverlay}>
                            <ScoreRevealBadge score={score} size="lg" showLabel />
                        </div>
```

- [ ] **Step 6: tsc + tam jest paketini çalıştır**

Run: `npx tsc --noEmit && npx jest --no-coverage`
Expected: tsc 0 hata; jest tüm suite'ler PASS.

- [ ] **Step 7: Commit**

```bash
git add "src/app/listing/[id]/ScoreRevealBadge.tsx" "src/app/listing/[id]/ScoreRevealBadge.test.tsx" "src/app/listing/[id]/page.tsx"
git commit -m "feat(listing): Canlı Mühür — skor rozetine ScoreRevealBadge damga animasyonu"
```

---

### Task 3: `marketplace` — Mühür token'ları + cam panel + aktif-durum vurgusu + tabular-nums

**Files:**
- Modify: `src/app/marketplace/page.module.css`
- Test: `src/app/marketplace/pageStyles.scope.test.ts` (yeni)

**Interfaces:**
- Consumes: `--aurora-cyan`, `--brand-gradient` (kullanılmıyor bu task'ta — bkz. gerekçe), `--shell-bg`, `--shell-border`, `--card-title`, `--muted` (globals.css, değişmez).
- Produces: Bu sayfaya özel `--seal-*` seti; başka hiçbir task/dosya bunlara bağımlı değil.

**Gerekçe (neden gradient değil düz accent):** `.quickChipActive`/`.pageBtnActive` birer "aktif seçim göstergesi" (toggle/pagination), hesapla'daki segmented-control seçili durumunun emsali — hesapla'da da seçili segment gradient değil düz `--seal-accent` alıyordu. Gradient yalnızca gerçek "aksiyon" CTA'larında kullanılır; bu sayfada öyle bir CTA yok (asıl "Senaryo"/"Teklif Ver" düğmeleri `ListingCard` içinde, bkz. Task 4 kapsam notu).

- [ ] **Step 1: Scope-guard testini yaz**

`src/app/marketplace/pageStyles.scope.test.ts`:

```ts
import fs from 'fs';
import path from 'path';

const pageCss = fs.readFileSync(path.join(__dirname, 'page.module.css'), 'utf8');
const globalsCss = fs.readFileSync(path.join(__dirname, '../globals.css'), 'utf8');

describe('marketplace mobil mühür kimliği token kapsamı', () => {
  it('yeni seal token\'ları globals.css içine hiç sızmamış olmalı', () => {
    expect(globalsCss).not.toMatch(/--seal-(ink|accent|surface|border|text)/);
  });

  it('--seal-accent, hesapla ile aynı Aurora cyan\'ı kullanmalı', () => {
    expect(pageCss).toMatch(/--seal-accent:\s*var\(--aurora-cyan\)/);
    expect(pageCss).toMatch(/--seal-accent-rgb:\s*43,\s*124,\s*255/);
  });

  it('--seal-surface hem dark hem light tema bloğunda tanımlı olmalı', () => {
    expect(pageCss).toMatch(/\[data-theme="dark"\]\s*\.container\s*\{[^}]*--seal-surface:/);
    expect(pageCss).toMatch(/\[data-theme="light"\]\s*\.container\s*\{[^}]*--seal-surface:/);
  });

  it('.container/.topBar/.listPanel mobilde --seal-surface kullanmalı, masaüstü tanımları var(--panel) olarak kalmalı', () => {
    const mediaIndex = pageCss.indexOf('@media (max-width: 768px)');
    const desktopSection = pageCss.slice(0, mediaIndex);
    const mobileSection = pageCss.slice(mediaIndex);
    expect(mobileSection).toMatch(/\.container\s*\{[^}]*background:\s*var\(--seal-surface\)/);
    expect(desktopSection).toMatch(/\.container\s*\{[^}]*background:\s*var\(--panel\)/);
  });

  it('.quickChipActive ve .pageBtnActive mobilde düz --seal-accent kullanmalı (gradient DEĞİL), masaüstü hâlâ --primary olmalı', () => {
    const mediaIndex = pageCss.indexOf('@media (max-width: 768px)');
    const desktopSection = pageCss.slice(0, mediaIndex);
    const mobileSection = pageCss.slice(mediaIndex);
    expect(mobileSection).toMatch(/\.quickChipActive,\s*\n?\s*\.pageBtnActive\s*\{[^}]*background:\s*var\(--seal-accent\)/);
    expect(mobileSection).not.toMatch(/\.quickChipActive[^}]*brand-gradient/);
    expect(desktopSection).toMatch(/\.quickChipActive\s*\{[^}]*background:\s*var\(--primary\)/);
  });
});
```

- [ ] **Step 2: Testi çalıştır, fail ettiğini doğrula**

Run: `npx jest marketplace/pageStyles.scope --no-coverage`
Expected: FAIL.

- [ ] **Step 3: `page.module.css`'in mobil bloğunu güncelle**

Mevcut `@media (max-width: 768px) { ... }` bloğunu (satır 237-334) aşağıdaki içerikle **birebir değiştir** (yeni token bloğu başta, `background`/`border-bottom-color` eklenen `.container`/`.topBar`, yeni `.listPanel`/`.emsalChip`/`.quickChipActive, .pageBtnActive` kuralları sonda; geri kalan tüm satırlar orijinaliyle birebir aynı):

```css
@media (max-width: 768px) {

    /* Mühür kimliği — sayfa-scope'lu token'lar (bkz. hesapla/page.module.css) */
    .container {
        --seal-ink: #0F2A43;
        --seal-accent: var(--aurora-cyan);
        --seal-accent-rgb: 43, 124, 255;
    }

    [data-theme="dark"] .container {
        --seal-surface: linear-gradient(160deg, #0F2A43 0%, #16324F 100%);
        --seal-border: rgba(43, 124, 255, 0.25);
        --seal-border-soft: rgba(43, 124, 255, 0.18);
    }

    [data-theme="light"] .container {
        --seal-surface: var(--shell-bg);
        --seal-border: var(--shell-border);
        --seal-border-soft: var(--shell-border);
    }

    .desktopOnlySpacer,
    .desktopViewToggle {
        display: none !important;
    }

    .container {
        height: calc(100dvh - 70px - var(--mobile-nav-pb, 0px));
        min-height: 0;
        border: none;
        border-radius: 0;
        max-width: 100vw;
        background: var(--seal-surface);
        border-bottom-color: var(--seal-border-soft);
    }

    .topBar {
        flex-wrap: nowrap;
        overflow-x: auto;
        -webkit-overflow-scrolling: touch;
        padding: 8px 12px;
        gap: 8px;
        min-width: 0;
        background: var(--seal-surface);
        border-bottom-color: var(--seal-border-soft);
    }

    .topBar::-webkit-scrollbar {
        display: none;
    }

    .mobileControls {
        display: flex;
        align-items: center;
        gap: 8px;
        width: 100%;
        background: var(--panel);
        border-bottom: 1px solid var(--border);
        padding: 8px 16px;
        flex-shrink: 0;
    }

    .mobileControls > :first-child {
        flex: 1;
        min-width: 0;
    }

    .listPanelSplit,
    .listPanelFull {
        width: 100% !important;
    }

    .pageBtn {
        width: var(--touch-target);
        height: var(--touch-target);
    }

    .quickChip {
        min-height: var(--touch-target);
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

    .listPanel {
        background: var(--seal-surface);
    }

    .emsalChip {
        font-family: 'JetBrains Mono', 'IBM Plex Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
        font-variant-numeric: tabular-nums;
    }

    .quickChipActive,
    .pageBtnActive {
        background: var(--seal-accent);
        border-color: var(--seal-accent);
    }
}
```

- [ ] **Step 4: Testi çalıştır, geçtiğini doğrula**

Run: `npx jest marketplace/pageStyles.scope --no-coverage`
Expected: PASS (5/5 test).

- [ ] **Step 5: Commit**

```bash
git add src/app/marketplace/page.module.css src/app/marketplace/pageStyles.scope.test.ts
git commit -m "feat(marketplace): mobil mühür kimliği — cam panel + aktif-durum vurgusu + tabular-nums"
```

---

### Task 4: `ListingCard` — tabular-nums (salt tipografi, mobil-only)

**Files:**
- Create: `src/components/marketplace/ListingCard.module.css`
- Create: `src/components/marketplace/ListingCard.scope.test.ts`
- Modify: `src/components/marketplace/ListingCard.tsx`

**Kapsam notu:** `ListingCard.tsx` şu an %100 inline stil kullanıyor, hiç CSS Module'ü yok. Bu task'ta kartın **arka planı/border'ı dokunulmaz** (zaten `.listPanel` seal-surface glass'ın içinde oturuyor — kartın da glass yapılması çifte-blur/"kaybolma" riski taşır) ve `FizibiliteScoreBadge`'in kendisi (`src/components/marketplace/FizibiliteScoreBadge.tsx`) **değiştirilmez** (Task 2'nin gerekçesiyle aynı: bu bileşen `listing/[id]` ile paylaşılıyor). Yalnızca fiyat/yüzde/skor rakamlarına mobil-only `tabular-nums` mono font eklenir — bu, inline `style` objelerindeki mevcut özelliklerle (fontSize/fontWeight/color) hiç çakışmaz, sadece yeni bir className eklenir.

**Interfaces:**
- Consumes: Yok (bağımsız, salt CSS Module + JSX className eklemesi).
- Produces: `.dataNum` className — yalnızca bu dosyada kullanılır, başka hiçbir task bağımlı değil.

- [ ] **Step 1: Scope-guard testini yaz**

`src/components/marketplace/ListingCard.scope.test.ts`:

```ts
import fs from 'fs';
import path from 'path';

const css = fs.readFileSync(path.join(__dirname, 'ListingCard.module.css'), 'utf8');

describe('ListingCard mobil tipografi kapsamı', () => {
  it('.dataNum tanımı @media (max-width: 768px) bloğunun içinde olmalı', () => {
    const mediaIndex = css.indexOf('@media (max-width: 768px)');
    const classIndex = css.indexOf('.dataNum');
    expect(mediaIndex).toBeGreaterThan(-1);
    expect(classIndex).toBeGreaterThan(mediaIndex);
  });

  it('.dataNum tabular-nums ve mono font kullanmalı', () => {
    expect(css).toMatch(/\.dataNum\s*\{[^}]*font-variant-numeric:\s*tabular-nums/);
    expect(css).toMatch(/\.dataNum\s*\{[^}]*JetBrains Mono/);
  });
});
```

- [ ] **Step 2: Testi çalıştır, fail ettiğini doğrula**

Run: `npx jest ListingCard.scope --no-coverage`
Expected: FAIL with "ENOENT" (dosya henüz yok).

- [ ] **Step 3: CSS Module'ü oluştur**

`src/components/marketplace/ListingCard.module.css`:

```css
@media (max-width: 768px) {
    .dataNum {
        font-family: 'JetBrains Mono', 'IBM Plex Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
        font-variant-numeric: tabular-nums;
    }
}
```

- [ ] **Step 4: Testi çalıştır, geçtiğini doğrula**

Run: `npx jest ListingCard.scope --no-coverage`
Expected: PASS (2/2 test).

- [ ] **Step 5: `ListingCard.tsx`'e bağla**

`ListingCard.tsx:1-5` — import ekle:

```tsx
"use client";

import Image from 'next/image';
import { FizibiliteScoreBadge } from './FizibiliteScoreBadge';
import { useRouter } from 'next/navigation';
import styles from './ListingCard.module.css';
```

**LIST VIEW** — fiyat span'ı (satır 119-122 ve 123-126, ikisi de kendi `className`'ini alır):

```tsx
                        {price > 0 ? (
                            <span className={styles.dataNum} style={{ fontSize: '1.1rem', fontWeight: 900, color: 'var(--card-title)' }}>
                                {price.toLocaleString('tr-TR')} TL
                            </span>
                        ) : (
                            <span className={styles.dataNum} style={{ fontSize: '1.1rem', fontWeight: 900, color: 'var(--card-title)' }}>
                                {payiMin.toFixed(0)}–{payiMax.toFixed(0)}%
                            </span>
                        )}
```

**LIST VIEW** — fizibilite skor çipi (satır 143-150), skor sayısını ayrı bir `<span>` içine al:

```tsx
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: 4,
                            background: `rgba(${scoreRgb},0.09)`, border: `1.5px solid rgba(${scoreRgb},0.27)`,
                            borderRadius: 8, padding: '2px 10px', fontSize: '0.72rem', fontWeight: 800, color: scoreColor,
                        }}>
                            Fizibilite Skoru <span className={styles.dataNum}>{score}</span><span className={styles.dataNum} style={{ fontSize: '0.6rem', fontWeight: 600 }}>/100</span>
                        </span>
                        <span className={styles.dataNum} style={{
                            fontSize: '0.72rem', fontWeight: 800,
                            color: change >= 0 ? 'var(--green)' : 'var(--red)',
                            display: 'inline-flex', alignItems: 'center', gap: 2,
                        }}>
                            📈 {change >= 0 ? '+' : ''}{change.toFixed(1)}%
                        </span>
                    </div>
```

**SPLIT/COLUMN VIEW** — fiyat span'ı (satır 259-268):

```tsx
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    {price > 0 ? (
                        <span className={styles.dataNum} style={{ fontSize: '0.95rem', fontWeight: 900, color: 'var(--card-title)' }}>
                            {(price / 1000000).toFixed(1)}M TL
                        </span>
                    ) : (
                        <span className={styles.dataNum} style={{ fontSize: '0.95rem', fontWeight: 900, color: 'var(--card-title)' }}>
                            {payiMin.toFixed(0)}–{payiMax.toFixed(0)}%
                        </span>
                    )}
                    <span className={styles.dataNum} style={{
                        fontSize: '0.65rem', fontWeight: 800,
                        color: change >= 0 ? 'var(--green)' : 'var(--red)',
                    }}>{change >= 0 ? '+' : ''}{change.toFixed(1)}%</span>
                </div>
```

**SPLIT/COLUMN VIEW** — skor bar sayısı (satır 278-283):

```tsx
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                    <div style={{ flex: 1, height: 3, borderRadius: 3, background: 'var(--border)', overflow: 'hidden' }}>
                        <div style={{ width: `${score}%`, height: '100%', borderRadius: 3, background: scoreColor }} />
                    </div>
                    <span className={styles.dataNum} style={{ fontSize: '0.62rem', fontWeight: 800, color: scoreColor }}>{score}</span>
                </div>
```

- [ ] **Step 6: tsc + tam jest paketini çalıştır**

Run: `npx tsc --noEmit && npx jest --no-coverage`
Expected: tsc 0 hata; jest tüm suite'ler PASS.

- [ ] **Step 7: Commit**

```bash
git add src/components/marketplace/ListingCard.module.css src/components/marketplace/ListingCard.scope.test.ts src/components/marketplace/ListingCard.tsx
git commit -m "feat(marketplace): ListingCard fiyat/yüzde/skor rakamlarına mobil tabular-nums"
```

---

### Task 5: `dashboard` — Mühür token'ları + cam panel + recessed satırlar + tabular-nums

**Files:**
- Modify: `src/app/dashboard/page.module.css`
- Test: `src/app/dashboard/pageStyles.scope.test.ts` (yeni)

**Kapsam notu:** Dashboard'da gerçek bir "birincil CTA" yok (`.qaBtn` bir navigasyon linki grid'i) — bu yüzden gradient uygulanmaz, `.qaBtn` dokunulmadan kalır. `.statCard`/`.offerStatus` metrik-başına renkli (semantik) olduğu için arka planları da dokunulmaz; yalnızca `.section` (panel) cam yüzeye geçer, `.reportRow`/`.offerRow` (semantik renksiz, flat `var(--bg)`) recessed tonuna geçer, ve `.statValue`/`.reportMeta`/`.offerAmount` tabular-nums olur.

**Interfaces:**
- Consumes: `--aurora-cyan`, `--shell-bg`, `--shell-border`, `--card-title`, `--muted` (globals.css, değişmez).
- Produces: Bu sayfaya özel `--seal-*` seti; başka hiçbir task bağımlı değil.

- [ ] **Step 1: Scope-guard testini yaz**

`src/app/dashboard/pageStyles.scope.test.ts`:

```ts
import fs from 'fs';
import path from 'path';

const pageCss = fs.readFileSync(path.join(__dirname, 'page.module.css'), 'utf8');
const globalsCss = fs.readFileSync(path.join(__dirname, '../globals.css'), 'utf8');

describe('dashboard mobil mühür kimliği token kapsamı', () => {
  it('yeni seal token\'ları globals.css içine hiç sızmamış olmalı', () => {
    expect(globalsCss).not.toMatch(/--seal-(ink|accent|surface|border|recessed)/);
  });

  it('--seal-accent, hesapla ile aynı Aurora cyan\'ı kullanmalı', () => {
    expect(pageCss).toMatch(/--seal-accent:\s*var\(--aurora-cyan\)/);
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

  it('.reportRow/.offerRow mobilde --seal-recessed kullanmalı, .statCard/.offerStatus dokunulmamalı', () => {
    const mediaIndex = pageCss.indexOf('@media (max-width: 768px)');
    const mobileSection = pageCss.slice(mediaIndex);
    expect(mobileSection).toMatch(/\.reportRow,\s*\n?\s*\.offerRow\s*\{[^}]*background:\s*var\(--seal-recessed\)/);
    expect(mobileSection).not.toMatch(/\.statCard\s*\{[^}]*seal-/);
    expect(mobileSection).not.toMatch(/\.offerStatus\s*\{[^}]*seal-/);
  });

  it('.statValue/.reportMeta/.offerAmount mobilde tabular-nums olmalı', () => {
    const mediaIndex = pageCss.indexOf('@media (max-width: 768px)');
    const mobileSection = pageCss.slice(mediaIndex);
    expect(mobileSection).toMatch(/\.statValue,[\s\S]*?font-variant-numeric:\s*tabular-nums/);
  });
});
```

- [ ] **Step 2: Testi çalıştır, fail ettiğini doğrula**

Run: `npx jest dashboard/pageStyles.scope --no-coverage`
Expected: FAIL.

- [ ] **Step 3: `page.module.css`'in mobil bloğunu güncelle**

Mevcut `@media (max-width: 768px) { ... }` bloğunu (satır 258-268) aşağıdaki içerikle **birebir değiştir**:

```css
@media (max-width: 768px) {
  /* Mühür kimliği — sayfa-scope'lu token'lar (bkz. hesapla/page.module.css) */
  .container {
    --seal-ink: #0F2A43;
    --seal-accent: var(--aurora-cyan);
    --seal-accent-rgb: 43, 124, 255;
    padding: 1.25rem 1rem calc(1.25rem + var(--bottomnav-height));
    gap: 1.25rem;
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

  .statsGrid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.75rem; }
  .statsGrid > * { min-width: 0; }
  .twoCol { grid-template-columns: 1fr; }

  .section {
    background: var(--seal-surface);
    border-color: var(--seal-border-soft);
    backdrop-filter: blur(24px);
    -webkit-backdrop-filter: blur(24px);
  }

  .reportRow,
  .offerRow {
    background: var(--seal-recessed);
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
  }

  .statValue,
  .reportMeta,
  .offerAmount {
    font-family: 'JetBrains Mono', 'IBM Plex Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    font-variant-numeric: tabular-nums;
  }

  .quickActions { display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; }
  .sectionLink { min-height: var(--touch-target); display: inline-flex; align-items: center; }
  .qaBtn { min-height: var(--touch-target); }
}
```

- [ ] **Step 4: Testi çalıştır, geçtiğini doğrula**

Run: `npx jest dashboard/pageStyles.scope --no-coverage`
Expected: PASS (5/5 test).

- [ ] **Step 5: Commit**

```bash
git add src/app/dashboard/page.module.css src/app/dashboard/pageStyles.scope.test.ts
git commit -m "feat(dashboard): mobil mühür kimliği — cam panel + recessed satırlar + tabular-nums"
```

---

### Task 6: Final doğrulama

**Files:** Yok (yalnızca doğrulama — kod değişikliği beklenmiyor, bulgu çıkarsa küçük düzeltme committir).

- [ ] **Step 1: Tam komut paketini çalıştır**

Run: `npx tsc --noEmit && npm run lint && npx jest --no-coverage`
Expected: tsc 0 hata, lint 0 ihlal, jest tüm suite'ler PASS (Task 1-5'in eklediği 5 yeni test dosyası dahil).

- [ ] **Step 2: Dev sunucusunu başlat (çalışmıyorsa)**

Run: `npm run dev:next` (arka planda)
Expected: `http://localhost:3000` üzerinde "Ready in ...ms".

- [ ] **Step 3: `listing/[id]` — gerçek Playwright ile light/dark mobil (390×844) kontrolü**

`listing/[id]` sayfası `/api/listings/{id}` çağrısı başarısız olursa (Docker/Postgres kapalıyken beklenen davranış) otomatik olarak `MOCK_LISTING` verisine düşer — bu yüzden **Docker gerekmez**, herhangi bir id ile (`/listing/test-id`) doğrudan açılabilir.

Kontrol edilecekler: `.tabContent`/`.sidebar` cam yüzeyi (light'ta beyaz buz, dark'ta lacivert gradient) her iki temada da okunaklı; "Genel Bilgiler" sekmesindeki `.detailCell` hücreleri panelden görünür şekilde ayrışıyor (kaybolmuyor); skor rozeti sayfa yüklendiğinde damga-oturma animasyonuyla beliriyor (`prefers-reduced-motion` kapalıyken); "Hesap Makinesini Aç →" ve sidebar/StickyActionBar'daki "Senaryo Oluştur"/"Senaryo" düğmeleri aurora gradient; "Teklif Ver" düğmesi hâlâ yeşil (dokunulmamış).

- [ ] **Step 4: `marketplace` — gerçek Playwright ile light/dark mobil kontrolü**

`marketplace` sayfası da `/api/listings` başarısız olursa mock veriye düşer — Docker gerekmez.

Kontrol edilecekler: `.container`/`.topBar`/`.listPanel` cam yüzeyi doğru temada; "Kat Karşılığı / Ortaklık" chip'i aktifken düz aurora-cyan (gradient DEĞİL); `ListingCard`'daki fiyat/skor/yüzde rakamları mono/tabular-nums; kartın kendi arka planı/border'ı **değişmemiş** (kasıtlı).

- [ ] **Step 5: `dashboard` — mümkünse gerçek oturumla kontrol, değilse ertele**

`dashboard` `useSession` ile korunuyor ve `unauthenticated` durumunda `/login`'e yönlendiriyor — gerçek görsel doğrulama için geçerli bir oturum (ve muhtemelen Docker/Postgres) gerekir. Eğer bu ortamda giriş yapılabiliyorsa: stat kartlarının semantik renklerini koruduğunu, `.reportRow`/`.offerRow`'un recessed tonuna geçtiğini, `.section` panellerinin cam yüzeye geçtiğini, `.qaBtn`'lerin **değişmediğini** doğrula. Giriş yapılamıyorsa bu adımı insan doğrulamasına ertele ve kullanıcıya raporla (önceki fazlarda da karşılaşılan, bilinen bir ortam kısıtı).

- [ ] **Step 6: Masaüstü regresyon kontrolü (1280px)**

Üç sayfa da 1280px genişlikte açılıp değişim öncesi görünümle (memory/önceki ekran görüntüleriyle) karşılaştırılır — cam panel/gradient/tabular-nums hiçbirinin masaüstünde görünmediği, sayfaların birebir eskisi gibi durduğu teyit edilir.

- [ ] **Step 7: Commit (yalnızca Step 1-6'da bir düzeltme gerekmişse)**

Bulgu çıkmazsa bu adım atlanır (Task 1-5'in commit'leri zaten tamamlanmış durumda). Bulgu çıkarsa küçük düzeltme yapılır ve ayrı bir commit'le kaydedilir.
