# /hesapla — TKGM Bağlamı Konsolidasyonu Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Risk seviyesi ve arsa alanı için `/hesapla`'da tek, tutarlı bir gösterim/düzenleme yeri (`SmartContextCard`) kurmak; masaüstündeki tekrar eden ayarlar çekmecesini ve mobildeki tekrar eden "Gelişmiş ayarlar" alanlarını kaldırmak; erişilemez ölü kodu silmek.

**Architecture:** `SmartContextCard`, `BirimMaliyetField`'in kanıtlanmış kaynak-etiketi desenini (`{tur: 'varsayilan'|'tkgm'|'elle'}`) risk seviyesine de uygulayarak tek kaynak hâline gelir; parsel seçili olmasa bile risk/alan her zaman düzenlenebilir kalır. Bu değerleri başka hiçbir yerde (masaüstü çekmece, mobil sheet, mobil ölü kod bloğu) tekrar render eden kod kaldırılır.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Jest + Testing Library, CSS Modules.

## Global Constraints

- Görsel tasarım (renk/spacing/tipografi) bu planın kapsamı dışında — mevcut görsel dil (Liquid Glass, `--aurora-cyan`) korunur, yalnızca yapısal/bilgi mimarisi değişir.
- Birim maliyet, piyasa fiyatı, müteahhit kazancı, iksa masrafı akışlarına dokunulmaz.
- Parsel SEÇİLMEDEN de risk seviyesi ve arsa alanı elle girilebilmeye devam etmeli — hiçbir adım bunu TKGM'ye bağımlı hale getirmemeli.
- Her task'ın sonunda `npx tsc --noEmit` ve ilgili jest suite'i çalıştırılır; her iki de temiz olmadan bir sonraki task'a geçilmez.
- Ana checkout'ta jest komutu: `npx jest --no-coverage --roots "<rootDir>/src"` (worktree'ler açıksa düz `npx jest` onların kopyalarını da toplar).
- Commit mesajları Türkçe, bu branch'in (`feature/masaustu-parsel-redesign`) önceki commit'leriyle aynı üslupta (`fix(...)`, `refactor(...)`, `test(...)`, `chore(...)`).

---

## Task 1: `riskSource.ts` — kaynak-etiketi tipi ve yardımcı fonksiyon

**Files:**
- Create: `src/app/hesapla/mobile/riskSource.ts`
- Test: `src/app/hesapla/mobile/riskSource.test.ts`

**Interfaces:**
- Consumes: yok (bağımsız).
- Produces: `RiskKaynagi` tipi (`{ tur: 'varsayilan' } | { tur: 'tkgm' } | { tur: 'elle' }`), `riskKaynakEtiketi(kaynak: RiskKaynagi): string` fonksiyonu — Task 2, 4, 6 bunları import edecek.

- [ ] **Step 1: Yazı testi**

`src/app/hesapla/mobile/riskSource.test.ts` dosyasını oluştur:

```ts
import { riskKaynakEtiketi } from './riskSource'

describe('riskKaynakEtiketi', () => {
    it('TKGM kaynaklı riski boyle isaretler', () => {
        expect(riskKaynakEtiketi({ tur: 'tkgm' })).toBe('TKGM Onaylı')
    })

    it('elle girilen riski boyle isaretler', () => {
        expect(riskKaynakEtiketi({ tur: 'elle' })).toBe('Elle girildi')
    })

    it('varsayilan riski boyle isaretler', () => {
        expect(riskKaynakEtiketi({ tur: 'varsayilan' })).toBe('Varsayılan')
    })
})
```

- [ ] **Step 2: Testin başarısız olduğunu doğrula**

Run: `npx jest --no-coverage --roots "<rootDir>/src" --testPathPatterns "riskSource"`
Expected: FAIL — `Cannot find module './riskSource'`

- [ ] **Step 3: Minimal implementasyon**

`src/app/hesapla/mobile/riskSource.ts` dosyasını oluştur:

```ts
/**
 * Risk seviyesinin KAYNAGI. `unitPriceSource.ts`teki `BirimMaliyetKaynagi`
 * deseninin risk seviyesine genislemesi (bkz. 2026-08-04 spec) — o degerin
 * de TKGM'den mi geldigini yoksa elle mi girildigini gostermenin hicbir
 * yolu yoktu, ayni "sessiz ezilme" riski risk seviyesinde de vardi.
 */
export type RiskKaynagi =
    | { tur: 'varsayilan' }
    | { tur: 'tkgm' }
    | { tur: 'elle' }

/** SmartContextCard'da risk pillerinin yanında gösterilen kaynak metni. */
export function riskKaynakEtiketi(kaynak: RiskKaynagi): string {
    switch (kaynak.tur) {
        case 'tkgm':
            return 'TKGM Onaylı'
        case 'elle':
            return 'Elle girildi'
        case 'varsayilan':
            return 'Varsayılan'
        default: {
            const _tuketilmedi: never = kaynak
            return _tuketilmedi
        }
    }
}
```

- [ ] **Step 4: Testin geçtiğini doğrula**

Run: `npx jest --no-coverage --roots "<rootDir>/src" --testPathPatterns "riskSource"`
Expected: PASS (3/3)

- [ ] **Step 5: Commit**

```bash
git add src/app/hesapla/mobile/riskSource.ts src/app/hesapla/mobile/riskSource.test.ts
git commit -m "feat(hesapla): risk seviyesi icin kaynak-etiketi tipi ekle"
```

---

## Task 2: `SmartContextCard` — risk pilleri + parselsiz de her zaman düzenlenebilir

**Files:**
- Modify: `src/app/hesapla/SmartContextCard.tsx`
- Modify: `src/app/hesapla/SmartContextCard.module.css`
- Test: `src/app/hesapla/SmartContextCard.test.tsx` (yeni dosya — bu bileşenin daha önce hiç testi yoktu)

**Interfaces:**
- Consumes: Task 1'in `RiskKaynagi`/`riskKaynakEtiketi`'i; `RiskLevel` tipi `src/app/hesapla/riskSuggestionHelpers.ts`'ten (`{id, label, value, sortOrder, isDefault}`).
- Produces: yeni `SmartContextCardProps` alanları — `riskLevels: RiskLevel[]`, `onRiskLevel: (v: number) => void`, `riskKaynagi: RiskKaynagi`. Task 3 (GirdiKarti) ve Task 6 (page.tsx) bu üç alanı geçirecek.

**Mevcut davranış (değişecek):** `parcelContext` yoksa bileşen SADECE "📍 Haritadan parsel seç" butonunu render ediyor, risk/alan hiç görünmüyor — TKGM'yi zorunlu kılan regresyon riski. Yeni davranış: adres satırı ve "TKGM Onaylı" rozeti `parcelContext`'e bağlı kalır, risk pilleri ve alan bölümü HER ZAMAN render edilir.

- [ ] **Step 1: Yazı testi**

`src/app/hesapla/SmartContextCard.test.tsx` dosyasını oluştur:

```tsx
/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SmartContextCard } from './SmartContextCard'

const RISK_LEVELS = [
    { id: 'r0', label: 'Yok', value: 0, sortOrder: 0, isDefault: true },
    { id: 'r1', label: 'Düşük', value: 5, sortOrder: 1, isDefault: false },
    { id: 'r2', label: 'Orta', value: 10, sortOrder: 2, isDefault: false },
    { id: 'r3', label: 'Yüksek', value: 15, sortOrder: 3, isDefault: false },
]

function props(patch: Partial<React.ComponentProps<typeof SmartContextCard>> = {}) {
    return {
        parcelContext: null,
        onOpenMap: jest.fn(),
        arsaAlani: 500,
        onArsaAlani: jest.fn(),
        riskLevel: 10,
        riskLevels: RISK_LEVELS,
        onRiskLevel: jest.fn(),
        riskKaynagi: { tur: 'varsayilan' as const },
        isAaEnabled: true,
        ...patch,
    }
}

describe('SmartContextCard', () => {
    it('parsel SECILMEDEN de risk pilleri gorunur ve tiklanabilir', async () => {
        const onRiskLevel = jest.fn()
        render(<SmartContextCard {...props({ parcelContext: null, onRiskLevel })} />)
        expect(screen.getByRole('button', { name: 'Yüksek' })).toBeInTheDocument()
        await userEvent.click(screen.getByRole('button', { name: 'Yüksek' }))
        expect(onRiskLevel).toHaveBeenCalledWith(15)
    })

    it('parsel SECILMEDEN de arsa alani girilebilir (isAaEnabled acikken)', () => {
        render(<SmartContextCard {...props({ parcelContext: null, isAaEnabled: true })} />)
        expect(screen.getByPlaceholderText('Alanı girin')).toBeInTheDocument()
    })

    it('isAaEnabled kapaliyken alan bolumu gorunmez (parsel olsa bile)', () => {
        render(<SmartContextCard {...props({ isAaEnabled: false })} />)
        expect(screen.queryByPlaceholderText('Alanı girin')).toBeNull()
    })

    it('parsel yokken "Haritadan parsel sec" satiri gorunur', () => {
        render(<SmartContextCard {...props({ parcelContext: null })} />)
        expect(screen.getByRole('button', { name: /Haritadan parsel seç/ })).toBeInTheDocument()
    })

    it('parsel varken adres ve TKGM onay rozeti gorunur', () => {
        const parcelContext = {
            lat: 41.0, lng: 29.0, status: 'verified' as const,
            parcel: { il: 'İstanbul', ilce: 'Kadıköy', mahalle: 'Fenerbahçe', adaNo: '1', parselNo: '2', areaSqm: 620, quality: 'Arsa', geometry: { type: 'Polygon' as const, coordinates: [] } },
        }
        render(<SmartContextCard {...props({ parcelContext })} />)
        expect(screen.getByText(/Kadıköy, Fenerbahçe/)).toBeInTheDocument()
        expect(screen.getByText('✓ TKGM Onaylı')).toBeInTheDocument()
    })

    it('secili risk pili aktif isaretlenir', () => {
        render(<SmartContextCard {...props({ riskLevel: 10 })} />)
        expect(screen.getByRole('button', { name: 'Orta' })).toHaveAttribute('aria-pressed', 'true')
        expect(screen.getByRole('button', { name: 'Yüksek' })).toHaveAttribute('aria-pressed', 'false')
    })

    it('risk kaynak etiketi gosterilir', () => {
        render(<SmartContextCard {...props({ riskKaynagi: { tur: 'tkgm' } })} />)
        expect(screen.getByText('TKGM Onaylı')).toBeInTheDocument()
    })
})
```

- [ ] **Step 2: Testin başarısız olduğunu doğrula**

Run: `npx jest --no-coverage --roots "<rootDir>/src" --testPathPatterns "SmartContextCard"`
Expected: FAIL — `parcelContext: null` iken risk pilleri/alan bölümü render edilmiyor (erken `return` yüzünden), `onRiskLevel`/`riskLevels`/`riskKaynagi` prop'ları tip hatası verir.

- [ ] **Step 3: `SmartContextCard.tsx`'i yeniden yaz**

`src/app/hesapla/SmartContextCard.tsx` dosyasının TAMAMINI şununla değiştir:

```tsx
import React from 'react';
import type { ParcelPickerValue } from '@/components/listing-wizard/ParcelPicker';
import type { RiskLevel } from './riskSuggestionHelpers';
import { riskKaynakEtiketi, type RiskKaynagi } from './mobile/riskSource';
import styles from './SmartContextCard.module.css';

export type SmartContextCardProps = {
    parcelContext: ParcelPickerValue | null;
    onOpenMap: () => void;
    arsaAlani: number;
    onArsaAlani: (v: number) => void;
    riskLevel: number;
    riskLevels: RiskLevel[];
    onRiskLevel: (v: number) => void;
    riskKaynagi: RiskKaynagi;
    isAaEnabled: boolean;
};

function riskNotu(level: number): string {
    if (level >= 15) return '+%15 iksa maliyeti eklendi';
    if (level >= 10) return '+%10 iksa maliyeti eklendi';
    if (level >= 5) return '+%5 iksa maliyeti eklendi';
    return 'Ek iksa maliyeti yok';
}

export function SmartContextCard({
    parcelContext,
    onOpenMap,
    arsaAlani,
    onArsaAlani,
    riskLevel,
    riskLevels,
    onRiskLevel,
    riskKaynagi,
    isAaEnabled,
}: SmartContextCardProps) {
    const isAreaVerified = parcelContext?.status === 'verified' && !!parcelContext.parcel?.areaSqm;
    const address = parcelContext?.parcel?.mahalle
        ? `${parcelContext.parcel.ilce}, ${parcelContext.parcel.mahalle}`
        : parcelContext
            ? 'Haritadan seçilen nokta'
            : null;

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                {address ? (
                    <div className={styles.address}>📍 {address}</div>
                ) : (
                    <button type="button" className={styles.unselectedBtn} onClick={onOpenMap}>
                        📍 Haritadan parsel seç
                    </button>
                )}
                {address && (
                    <button type="button" className={styles.editBtn} onClick={onOpenMap}>
                        Değiştir
                    </button>
                )}
            </div>

            <div className={styles.riskSection}>
                <div className={styles.riskHeader}>
                    <span>Deprem Riski</span>
                    <span className={styles.riskKaynakEtiket}>{riskKaynakEtiketi(riskKaynagi)}</span>
                </div>
                <div className={styles.riskPills}>
                    {riskLevels.map(opt => (
                        <button
                            key={opt.id}
                            type="button"
                            aria-pressed={riskLevel === opt.value}
                            className={`${styles.riskPill} ${riskLevel === opt.value ? styles.riskPillActive : ''}`}
                            onClick={() => onRiskLevel(opt.value)}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
                <p className={styles.riskNote}>{riskNotu(riskLevel)}</p>
            </div>

            {isAaEnabled && (
                <div className={styles.areaSection}>
                    <div className={styles.areaHeader}>
                        <span>Arsa Alanı</span>
                        <span className={isAreaVerified ? styles.areaStatusOk : styles.areaStatus}>
                            {isAreaVerified ? '✓ TKGM Onaylı' : 'Elle girilmesi gerekiyor'}
                        </span>
                    </div>
                    <div className={styles.areaInputRow}>
                        <input
                            type="number"
                            value={arsaAlani || ''}
                            onChange={(e) => onArsaAlani(Number(e.target.value))}
                            placeholder="Alanı girin"
                        />
                        <span>m²</span>
                    </div>
                </div>
            )}
        </div>
    );
}
```

- [ ] **Step 4: CSS ekle**

`src/app/hesapla/SmartContextCard.module.css` dosyasının SONUNA ekle (mevcut `.riskBadge`/`.riskHigh`/`.riskMedium`/`.riskLow`/`.riskNote` kuralları artık kullanılmıyor — onları SİL, yerine aşağıdakileri ekle):

Önce dosyadan şu bloğu SİL:
```css
.riskBadge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 10px;
    border-radius: 8px;
    font-size: 0.85rem;
    font-weight: 600;
    margin-top: 4px;
}

.riskHigh {
    background: rgba(239, 68, 68, 0.1);
    color: #ef4444;
}

.riskMedium {
    background: rgba(245, 158, 11, 0.1);
    color: #f59e0b;
}

.riskLow {
    background: rgba(16, 185, 129, 0.1);
    color: #10b981;
}

.riskNote {
    font-size: 0.75rem;
    opacity: 0.8;
    font-weight: 400;
}
```

Yerine ekle:

```css
.riskSection {
    background: var(--input-bg);
    border-radius: 12px;
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.riskHeader {
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--label-color);
    display: flex;
    justify-content: space-between;
}

.riskKaynakEtiket {
    font-size: 0.75rem;
    color: var(--muted);
    font-weight: 600;
}

.riskPills {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
}

.riskPill {
    flex: 1;
    min-width: 64px;
    background: var(--card-bg);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 6px 8px;
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--fg);
    cursor: pointer;
}

.riskPillActive {
    background: rgba(59, 130, 246, 0.12);
    border-color: #3b82f6;
    color: #3b82f6;
}

.riskNote {
    font-size: 0.75rem;
    opacity: 0.8;
    font-weight: 400;
    margin: 0;
}
```

- [ ] **Step 5: Testin geçtiğini doğrula**

Run: `npx jest --no-coverage --roots "<rootDir>/src" --testPathPatterns "SmartContextCard"`
Expected: PASS (7/7)

- [ ] **Step 6: tsc kontrolü**

Run: `npx tsc --noEmit`
Expected: `SmartContextCard.tsx` ile ilgili hata YOK (çağıranlar — `GirdiKarti.tsx`, `page.tsx` — henüz güncellenmediği için ORADA hata beklenir, Task 3/6'da kapanacak; bu adımda sadece `SmartContextCard.tsx`'in kendi hata vermediğini gözle doğrula: `npx tsc --noEmit 2>&1 | grep SmartContextCard.tsx` boş dönmeli, `GirdiKarti.tsx`/`page.tsx` satırları normal).

- [ ] **Step 7: Commit**

```bash
git add src/app/hesapla/SmartContextCard.tsx src/app/hesapla/SmartContextCard.module.css src/app/hesapla/SmartContextCard.test.tsx
git commit -m "feat(hesapla): SmartContextCard risk+alan icin tek kaynak olsun, parselsiz de calissin"
```

---

## Task 3: `GirdiKarti` — yeni prop'ları `SmartContextCard`'a ilet

**Files:**
- Modify: `src/app/hesapla/mobile/GirdiKarti.tsx`
- Modify: `src/app/hesapla/mobile/GirdiKarti.test.tsx`
- Modify: `src/app/hesapla/mobile/HesaplaMobile.test.tsx`

**Interfaces:**
- Consumes: Task 2'nin `SmartContextCardProps` (`riskLevels`, `onRiskLevel`, `riskKaynagi`), Task 1'in `RiskKaynagi`.
- Produces: `GirdiKartiProps`'a eklenen `riskLevels: RiskLevel[]`, `onRiskLevel: (v: number) => void`, `riskKaynagi: RiskKaynagi`. Task 6 (`page.tsx`'in `girdi={{...}}` nesnesi) bunları sağlayacak.

- [ ] **Step 1: `GirdiKarti.tsx`'i güncelle**

`src/app/hesapla/mobile/GirdiKarti.tsx` içinde importları güncelle:

```tsx
import { computeEffectiveLandShareX } from '../calculatorUiHelpers';
import { SmartContextCard } from '../SmartContextCard';
import type { ParcelPickerValue } from '@/components/listing-wizard/ParcelPicker';
import type { RiskLevel } from '../riskSuggestionHelpers';
import type { RiskKaynagi } from './riskSource';
import styles from './mobile.module.css';
```

`GirdiKartiProps` tipine ekle (`riskLevel: number;` satırından hemen sonra):

```tsx
export type GirdiKartiProps = {
    parcelContext: ParcelPickerValue | null;
    arsaAlani: number;
    onArsaAlani: (v: number) => void;
    riskLevel: number;
    riskLevels: RiskLevel[];
    onRiskLevel: (v: number) => void;
    riskKaynagi: RiskKaynagi;
    isAaEnabled: boolean;
    /** Parsel doğrulama modalını açar */
    onParselDogrulaAc: () => void;
    luxLevel: number;
    onLuxLevel: (v: number) => void;
    apartmentSize: number;
    onApartmentSize: (v: number) => void;
    landShareRatio: number;
    onLandShareRatio: (v: number) => void;
    isApartmentCountEnabled: boolean;
    onApartmentCountEnabled: (v: boolean) => void;
    totalApartments: number;
    onTotalApartments: (v: number) => void;
    ownerApartmentShare: number;
    onOwnerApartmentShare: (v: number) => void;
};
```

Fonksiyon parametrelerine ekle (`riskLevel,` satırından hemen sonra):

```tsx
export function GirdiKarti({
    parcelContext,
    arsaAlani,
    onArsaAlani,
    riskLevel,
    riskLevels,
    onRiskLevel,
    riskKaynagi,
    isAaEnabled,
    luxLevel,
    onLuxLevel,
    apartmentSize,
    onApartmentSize,
    landShareRatio,
    onLandShareRatio,
    isApartmentCountEnabled,
    onApartmentCountEnabled,
    totalApartments,
    onTotalApartments,
    ownerApartmentShare,
    onOwnerApartmentShare,
    onParselDogrulaAc,
}: GirdiKartiProps) {
```

`<SmartContextCard>` render'ını güncelle:

```tsx
            <SmartContextCard
                parcelContext={parcelContext}
                onOpenMap={onParselDogrulaAc}
                arsaAlani={arsaAlani}
                onArsaAlani={onArsaAlani}
                riskLevel={riskLevel}
                riskLevels={riskLevels}
                onRiskLevel={onRiskLevel}
                riskKaynagi={riskKaynagi}
                isAaEnabled={isAaEnabled}
            />
```

- [ ] **Step 2: `GirdiKarti.test.tsx`'in `props()` yardımcısına yeni alanları ekle**

`function props(...)` içindeki `riskLevel: 10,` satırını şununla değiştir:

```tsx
        riskLevel: 10,
        riskLevels: [
            { id: 'r0', label: 'Yok', value: 0, sortOrder: 0, isDefault: true },
            { id: 'r1', label: 'Düşük', value: 5, sortOrder: 1, isDefault: false },
            { id: 'r2', label: 'Orta', value: 10, sortOrder: 2, isDefault: false },
            { id: 'r3', label: 'Yüksek', value: 15, sortOrder: 3, isDefault: false },
        ],
        onRiskLevel: jest.fn(),
        riskKaynagi: { tur: 'varsayilan' as const },
```

- [ ] **Step 3: `HesaplaMobile.test.tsx`'in `girdi` nesnesine yeni alanları ekle**

`function props(...)` içindeki `girdi: { ... riskLevel, ... }` bloğundaki `riskLevel,` satırını şununla değiştir:

```tsx
            riskLevel,
            riskLevels: [
                { id: 'r0', label: 'Yok', value: 0, sortOrder: 0, isDefault: true },
                { id: 'r1', label: 'Düşük', value: 5, sortOrder: 1, isDefault: false },
                { id: 'r2', label: 'Orta', value: 10, sortOrder: 2, isDefault: false },
                { id: 'r3', label: 'Yüksek', value: 15, sortOrder: 3, isDefault: false },
            ],
            onRiskLevel: jest.fn(),
            riskKaynagi: { tur: 'varsayilan' as const },
```

(`riskLevel,` zaten `girdi: { konum yerine parcelContext, arsaAlani, onArsaAlani, isAaEnabled, riskLevel, onParselDogrulaAc, luxLevel, ... }` şeklinde tanımlıydı — burada sadece `riskLevel,`'den hemen sonrasına ekleme yapılıyor.)

- [ ] **Step 4: tsc ve testleri çalıştır**

Run: `npx tsc --noEmit`
Expected: `GirdiKarti.tsx` ve ilgili test dosyalarıyla ilgili hata YOK. (`page.tsx`'in `girdi={{...}}` nesnesi Task 6'ya kadar hâlâ eksik olacağı için `page.tsx` satırında hata beklenir.)

Run: `npx jest --no-coverage --roots "<rootDir>/src" --testPathPatterns "GirdiKarti|HesaplaMobile"`
Expected: PASS (tüm testler)

- [ ] **Step 5: Commit**

```bash
git add src/app/hesapla/mobile/GirdiKarti.tsx src/app/hesapla/mobile/GirdiKarti.test.tsx src/app/hesapla/mobile/HesaplaMobile.test.tsx
git commit -m "feat(hesapla): GirdiKarti risk kaynak-etiketini SmartContextCard'a iletir"
```

---

## Task 4: `RiskCostFields`'ten risk seviyesini çıkar

**Files:**
- Modify: `src/app/hesapla/AdvancedSettingsSections.tsx`

**Interfaces:**
- Consumes: yok (bu dosyanın kendi mevcut yapısı).
- Produces: `RiskCostProps` artık `riskLevel`/`setRiskLevel`/`riskLevels` İÇERMEZ. Task 5 (`GelismisAyarlarSheet`) ve Task 7 (`page.tsx`) bu daralmış tipe göre güncellenir.

- [ ] **Step 1: Yerel `RiskLevel` arayüzünü ve risk grid JSX'ini sil**

`src/app/hesapla/AdvancedSettingsSections.tsx` içinde şu bloğu (satır ~17-23):

```tsx
interface RiskLevel {
  id: string;
  label: string;
  value: number;
  sortOrder: number;
  isDefault: boolean;
}

```

TAMAMEN SİL (yalnızca `ProfitLevel` arayüzü kalsın).

`RiskCostProps`'u güncelle — şu haliyle:

```tsx
export interface RiskCostProps {
  iksaMode: 'off' | 'percentage' | 'manual';
  setIksaMode: (v: 'off' | 'percentage' | 'manual') => void;
  iksaPercentage: number;
  setIksaPercentage: (v: number) => void;
  iksaManualTL: number;
  setIksaManualTL: (v: number) => void;
  builderProfit: number;
  setBuilderProfit: (v: number) => void;
  profitLevels: ProfitLevel[];
}
```

(`riskLevel`, `setRiskLevel`, `riskLevels` satırları çıkarıldı.)

`RiskCostFields` fonksiyonunu güncelle:

```tsx
/** Drawer "Proje Maliyet ve Riskleri" kartının içeriği. */
export function RiskCostFields({
  iksaMode, setIksaMode, iksaPercentage, setIksaPercentage,
  iksaManualTL, setIksaManualTL,
  builderProfit, setBuilderProfit, profitLevels,
}: RiskCostProps) {
  return (
    <>
      <div className={`${styles.drawerRow} ${styles.column}`}>
        <div className={styles.drawerRowLabel}>Müteahhit Kazancı</div>
        <div className={styles.luxGrid}>
          {profitLevels.map(opt => (
            <div key={opt.id} className={`${styles.luxBox} ${builderProfit === opt.value ? styles.luxBoxActive : ''}`} onClick={() => setBuilderProfit(opt.value)}>
              <span>{opt.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className={`${styles.drawerRow} ${styles.column}`}>
        <div className={styles.drawerRowLabel}>İksa Masrafı</div>
        <div className={styles.luxGrid}>
          {[
            { label: 'Yok', value: 'off' as const },
            { label: 'Yüzde', value: 'percentage' as const },
            { label: 'Elle', value: 'manual' as const },
          ].map(opt => (
            <div key={opt.label} className={`${styles.luxBox} ${iksaMode === opt.value ? styles.luxBoxActive : ''}`} onClick={() => setIksaMode(opt.value)}>
              <span>{opt.label}</span>
            </div>
          ))}
        </div>
        {iksaMode === 'percentage' && (
          <div className={`${styles.stepperInput} ${styles.stepperFixed}`}>
            <input type="number" value={iksaPercentage} min={0} max={100} onChange={(e) => setIksaPercentage(Number(e.target.value))} />
            <div className={styles.stepperRight}>
              <span className={styles.stepperUnitCenter}>%</span>
            </div>
          </div>
        )}
        {iksaMode === 'manual' && (
          <div className={`${styles.stepperInput} ${styles.stepperFixed}`}>
            <input type="number" value={iksaManualTL} min={0} onChange={(e) => setIksaManualTL(Number(e.target.value))} />
            <div className={styles.stepperRight}>
              <span className={styles.stepperUnitCenter}>TL</span>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
```

("Risk Payı" `drawerRow` bloğu tamamen çıkarıldı.)

- [ ] **Step 2: tsc kontrolü**

Run: `npx tsc --noEmit`
Expected: `AdvancedSettingsSections.tsx`'in kendisinde hata YOK. `GelismisAyarlarSheet.tsx` ve `page.tsx`'in `RiskCostFields`'e hâlâ `riskLevel`/`setRiskLevel`/`riskLevels` geçtiği satırlarda tip hatası BEKLENİR (Task 5/7'de kapanacak).

- [ ] **Step 3: `AdvancedSettingsSections.test.tsx`'i çalıştır (regresyon yok mu?)**

Run: `npx jest --no-coverage --roots "<rootDir>/src" --testPathPatterns "AdvancedSettingsSections"`
Expected: PASS (bu dosya yalnızca `BirimMaliyetField`'i test ediyor, dokunulmadı — değişmemeli)

- [ ] **Step 4: Commit**

```bash
git add src/app/hesapla/AdvancedSettingsSections.tsx
git commit -m "refactor(hesapla): RiskCostFields'ten risk seviyesini cikar (SmartContextCard'a tasindi)"
```

---

## Task 5: `GelismisAyarlarSheet` — arsa alanı bölümünü kaldır, risk prop'larını güncelle

**Files:**
- Modify: `src/app/hesapla/mobile/GelismisAyarlarSheet.tsx`
- Modify: `src/app/hesapla/mobile/GelismisAyarlarSheet.test.tsx`

**Interfaces:**
- Consumes: Task 4'ün daraltılmış `RiskCostProps`.
- Produces: `GelismisAyarlarSheetProps` artık `ArsaAlaniProps`'u intersect ETMİYOR; `AyarBolumu` union'ından `'risk'` çıkarıldı. Task 6 (`page.tsx`) bu bileşeni bu yeni sözleşmeyle çağıracak.

- [ ] **Step 1: `GelismisAyarlarSheet.tsx`'i güncelle**

İmport bloğunu güncelle — `ArsaAlaniFields`/`ArsaAlaniProps` kaldırılıyor:

```tsx
import { useEffect, useRef } from 'react';
import { BottomSheet } from '@/components/mobile/BottomSheet';
import {
    MarketField,
    RiskCostFields,
    BirimMaliyetField,
    type MarketFieldProps,
    type RiskCostProps,
    type BirimMaliyetFieldProps,
} from '../AdvancedSettingsSections';
import styles from './mobile.module.css';
```

`AyarBolumu` tipini güncelle:

```tsx
export type AyarBolumu = 'kar' | 'iksa' | 'piyasa';
```

`GelismisAyarlarSheetProps`'tan `& ArsaAlaniProps` satırını çıkar:

```tsx
export type GelismisAyarlarSheetProps =
    & RiskCostProps
    & MarketFieldProps
    & BirimMaliyetFieldProps
    & {
        open: boolean;
        onClose: () => void;
        onUygula: () => void;
        onSifirla: () => void;
        acilisBolumu?: AyarBolumu;
    };
```

Bileşen gövdesinde `arsaRef` ve "Arsa alanı" `<section>`'ını sil. Şu satırları:

```tsx
    const maliyetRef = useRef<HTMLElement | null>(null);
    const piyasaRef = useRef<HTMLElement | null>(null);
    const arsaRef = useRef<HTMLElement | null>(null);

    useEffect(() => {
        if (!open || acilisBolumu === undefined) return;
        const hedefRef =
            acilisBolumu === 'piyasa' ? piyasaRef :
            maliyetRef; // 'kar' | 'risk' | 'iksa' ayni bolume dusuyor
```

şununla değiştir:

```tsx
    const maliyetRef = useRef<HTMLElement | null>(null);
    const piyasaRef = useRef<HTMLElement | null>(null);

    useEffect(() => {
        if (!open || acilisBolumu === undefined) return;
        const hedefRef =
            acilisBolumu === 'piyasa' ? piyasaRef :
            maliyetRef; // 'kar' | 'iksa' ayni bolume dusuyor
```

JSX gövdesinde `<div className={styles.ayarlarGovde}>`'nin İÇİNDEKİ ilk `<section ref={arsaRef} ... aria-label="Arsa alanı" ...>...</section>` bloğunu (ArsaAlaniFields çağrısı dahil) TAMAMEN SİL. `RiskCostFields` çağrısından `riskLevel`/`setRiskLevel`/`riskLevels` prop'larını çıkar:

```tsx
                <section
                    ref={maliyetRef}
                    className={styles.ayarBolum}
                    role="group"
                    aria-label="Maliyet ve riskler"
                    data-acilis={bolum('kar', 'iksa')}
                >
                    <RiskCostFields
                        iksaMode={alanlar.iksaMode}
                        setIksaMode={alanlar.setIksaMode}
                        iksaPercentage={alanlar.iksaPercentage}
                        setIksaPercentage={alanlar.setIksaPercentage}
                        iksaManualTL={alanlar.iksaManualTL}
                        setIksaManualTL={alanlar.setIksaManualTL}
                        builderProfit={alanlar.builderProfit}
                        setBuilderProfit={alanlar.setBuilderProfit}
                        profitLevels={alanlar.profitLevels}
                    />
                </section>
```

- [ ] **Step 2: `GelismisAyarlarSheet.test.tsx`'i güncelle**

`props()` yardımcısından `isAaEnabled: false, setIsAaEnabled: jest.fn(),` ve `arsaAlani: 500, setArsaAlani: jest.fn(),` satırlarını sil (artık `GelismisAyarlarSheetProps`'ta yok). `riskLevel: 10, setRiskLevel: jest.fn(), riskLevels: [...]` satırlarını da sil (artık `RiskCostProps`'ta yok).

`'acikken modal diyalog ve uc bolum gosterir'` testini güncelle — artık İKİ bölüm var:

```tsx
    it('acikken modal diyalog ve iki bolum gosterir', () => {
        render(<GelismisAyarlarSheet {...props()} />)
        expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true')
        expect(screen.getByRole('group', { name: 'Maliyet ve riskler' })).toBeInTheDocument()
        expect(screen.getByRole('group', { name: 'Piyasa fiyatı' })).toBeInTheDocument()
        expect(screen.queryByRole('group', { name: 'Arsa alanı' })).toBeNull()
    })
```

`'arsa alani yaprakta KALIR'` testini SİL, yerine ekle:

```tsx
    it('arsa alani yapraktan KALKTI (SmartContextCard tek kaynak)', () => {
        render(<GelismisAyarlarSheet {...props()} />)
        expect(screen.queryByText(/Arsa Alanı/)).toBeNull()
    })

    it('risk secimi yapraktan KALKTI (SmartContextCard tek kaynak)', () => {
        render(<GelismisAyarlarSheet {...props()} />)
        expect(screen.queryByText('Risk Payı')).toBeNull()
    })
```

- [ ] **Step 3: Testleri çalıştır**

Run: `npx jest --no-coverage --roots "<rootDir>/src" --testPathPatterns "GelismisAyarlarSheet"`
Expected: PASS (tüm testler)

Run: `npx tsc --noEmit`
Expected: `GelismisAyarlarSheet.tsx`/`.test.tsx`'te hata YOK. `page.tsx`'te hâlâ eski prop'ları geçtiği için hata BEKLENİR (Task 6/7'de kapanacak).

- [ ] **Step 4: Commit**

```bash
git add src/app/hesapla/mobile/GelismisAyarlarSheet.tsx src/app/hesapla/mobile/GelismisAyarlarSheet.test.tsx
git commit -m "refactor(hesapla): GelismisAyarlarSheet'ten arsa alani ve risk secimini kaldir"
```

---

## Task 6: `page.tsx` — `riskKaynagi` state'i, `handleParcelConfirm`, `SmartContextCard`/`GirdiKarti`/`GelismisAyarlarSheet` çağrılarını güncelle

**Files:**
- Modify: `src/app/hesapla/page.tsx`

**Interfaces:**
- Consumes: Task 1 (`RiskKaynagi`), Task 2 (`SmartContextCardProps`), Task 3 (`GirdiKartiProps`), Task 4/5 (daraltılmış `RiskCostProps`/`GelismisAyarlarSheetProps`).
- Produces: yok (bu, ağacın en üstü — sonraki task yok, bu ekranın kendisi).

- [ ] **Step 1: `RiskKaynagi` import et ve `riskKaynagi` state'i ekle**

`import { type BirimMaliyetKaynagi } from './mobile/unitPriceSource';` satırının hemen altına ekle:

```tsx
import { type RiskKaynagi } from './mobile/riskSource';
```

`const [riskLevels, setRiskLevels] = useState<RiskLevel[]>([...]);` bloğunun HEMEN ALTINA ekle:

```tsx
  const [riskKaynagi, setRiskKaynagi] = useState<RiskKaynagi>({ tur: 'varsayilan' });
```

- [ ] **Step 2: `handleParcelConfirm`'i güncelle**

Mevcut:

```tsx
  const handleParcelConfirm = (payload: { parcelValue: ParcelPickerValue, risk: RiskMeasurement | null, suggestedRiskPercent: number | null }) => {
    setParcelContext(payload.parcelValue);
    if (payload.parcelValue.parcel?.areaSqm) {
      setIsAaEnabled(true);
      setArsaAlani(payload.parcelValue.parcel.areaSqm);
    }
    if (payload.suggestedRiskPercent !== null) {
      setRiskLevel(payload.suggestedRiskPercent);
    }
  };
```

şununla değiştir:

```tsx
  const handleParcelConfirm = (payload: { parcelValue: ParcelPickerValue, risk: RiskMeasurement | null, suggestedRiskPercent: number | null }) => {
    setParcelContext(payload.parcelValue);
    if (payload.parcelValue.parcel?.areaSqm) {
      setIsAaEnabled(true);
      setArsaAlani(payload.parcelValue.parcel.areaSqm);
    }
    if (payload.suggestedRiskPercent !== null) {
      setRiskLevel(payload.suggestedRiskPercent);
      setRiskKaynagi({ tur: 'tkgm' });
    }
  };
```

- [ ] **Step 3: Elle risk seçimi için ortak handler ekle**

`handleParcelConfirm`'in hemen altına ekle:

```tsx
  const handleRiskLevel = (v: number) => {
    setRiskLevel(v);
    setRiskKaynagi({ tur: 'elle' });
  };
```

- [ ] **Step 4: Mobil `girdi={{...}}` nesnesini güncelle**

`girdi={{` bloğu içindeki `riskLevel,` satırını şununla değiştir:

```tsx
          girdi={{
            parcelContext,
            arsaAlani, onArsaAlani: setArsaAlani,
            isAaEnabled,
            riskLevel,
            riskLevels,
            onRiskLevel: handleRiskLevel,
            riskKaynagi,
            onParselDogrulaAc: () => setIsParcelModalOpen(true),
            luxLevel, onLuxLevel: setLuxLevel,
            apartmentSize, onApartmentSize: setApartmentSize,
            landShareRatio, onLandShareRatio: setLandShareRatio,
            isApartmentCountEnabled, onApartmentCountEnabled: setIsApartmentCountEnabled,
            totalApartments, onTotalApartments: setTotalApartments,
            ownerApartmentShare, onOwnerApartmentShare: setOwnerApartmentShare,
          }}
```

- [ ] **Step 5: Mobil `<GelismisAyarlarSheet>` çağrısını güncelle**

`onSifirla={() => {...}}` gövdesinde `setRiskLevel(AYAR_VARSAYILANLARI.riskLevel);` satırının hemen altına ekle:

```tsx
            setRiskLevel(AYAR_VARSAYILANLARI.riskLevel);
            setRiskKaynagi({ tur: 'varsayilan' });
```

`<GelismisAyarlarSheet ... />` prop listesinden `riskLevel={riskLevel} setRiskLevel={setRiskLevel} riskLevels={riskLevels}` satırını SİL, ve `isAaEnabled={isAaEnabled} setIsAaEnabled={setIsAaEnabled}` ile `arsaAlani={arsaAlani} setArsaAlani={setArsaAlani}` satırlarını SİL (bu iki prop grubu artık `GelismisAyarlarSheetProps`'ta yok — Task 5).

- [ ] **Step 6: Masaüstü `<SmartContextCard>` çağrısını güncelle**

```tsx
              <SmartContextCard
                parcelContext={parcelContext}
                onOpenMap={() => setIsParcelModalOpen(true)}
                arsaAlani={arsaAlani}
                onArsaAlani={setArsaAlani}
                riskLevel={riskLevel}
                riskLevels={riskLevels}
                onRiskLevel={handleRiskLevel}
                riskKaynagi={riskKaynagi}
                isAaEnabled={isAaEnabled}
              />
```

- [ ] **Step 7: tsc kontrolü**

Run: `npx tsc --noEmit`
Expected: `SmartContextCard`/`GirdiKarti`/`GelismisAyarlarSheet` çağrılarıyla ilgili hata YOK. Masaüstü çekmecedeki (`settingsDrawer`, satır ~823-871) `RiskCostFields` çağrısı hâlâ `riskLevel`/`setRiskLevel`/`riskLevels` geçiyor olacağı için hata BEKLENİR — bu Task 7'de o blok komple silinince kapanacak. Standalone "Risk Payı" grubu (satır ~670-679) de aynı şekilde hâlâ duruyor, ona dokunulmuyor (Task 7).

- [ ] **Step 8: Commit**

```bash
git add src/app/hesapla/page.tsx
git commit -m "feat(hesapla): riskKaynagi state'i ekle, parsel/elle secimde dogru isaretle"
```

---

## Task 7: Masaüstü çekmeceyi ve bağımsız "Risk Payı" grubunu kaldır

**Files:**
- Modify: `src/app/hesapla/page.tsx`
- Modify: `src/app/hesapla/pageStyles.scope.test.ts`

**Interfaces:**
- Consumes: Task 6'nın tamamlanmış `page.tsx` durumu.
- Produces: yok.

- [ ] **Step 1: `isSettingsSidebarOpen` state'ini sil**

```tsx
  const [isSettingsSidebarOpen, setIsSettingsSidebarOpen] = useState(false);
```

satırını TAMAMEN SİL.

- [ ] **Step 2: ⚙ ikonunu sil**

```tsx
            <div className={styles.sidebarTitle}>Proje Bilgileri <span className={styles.settingsGear} onClick={() => setIsSettingsSidebarOpen(true)}>⚙</span></div>
```

satırını şununla değiştir:

```tsx
            <div className={styles.sidebarTitle}>Proje Bilgileri</div>
```

- [ ] **Step 3: Bağımsız "Risk Payı" `settingsGroup`'unu sil**

```tsx
            <div className={styles.settingsGroup}>
              <h4>Risk Payı</h4>
              <div className={`${styles.luxGrid} ${styles.luxGridDynamic}`} style={{ '--lux-cols': riskLevels.length } as React.CSSProperties}>
                {riskLevels.map(opt => (
                  <div key={opt.id} className={`${styles.luxBox} ${riskLevel === opt.value ? styles.luxBoxActive : ''}`} onClick={() => setRiskLevel(opt.value)}>
                    <span>{opt.label}</span>
                  </div>
                ))}
              </div>
            </div>

```

Bu bloğu TAMAMEN SİL ("Müteahhit Kazancı" grubu ile "İksa Masrafı" grubu arasındaki blok).

- [ ] **Step 4: Çekmece JSX'ini komple sil**

Dosyada şu ilk satırı bul: `        {/* Drawer Overlay for Advanced Settings */}` (tek başına bir yorum satırı).
Bu satırdan başlayarak, hemen ardından gelen `        <div className={\`${styles.settingsDrawerOverlay} ...`  ile açılan bloğun kapanışı olan üçüncü `</div>` satırına kadar (yani `<div settingsDrawerOverlay>` → `<div settingsDrawer>` → `<div drawerContent>` iç içe açılışlarının hepsini kapatan, art arda gelen `</div></div></div>` üçlüsünün SONUNCU `</div>`'ine kadar) TÜM satırları sil. Ardından gelen iki boş satırı da sil. Bir sonraki satır `        {/* Right Grid: Hesap Sonuçları + Hesap Özeti */}` olmalı — bu yorum ve devamı DOKUNULMADAN kalır.

İçeriden emin olmak için: silinen blok içinde `Gelişmiş Ayarlar` başlığı, `closeDrawerBtn`, iki adet `drawerCard` (`Formül Parametreleri` → `FormulParamsFields`, `Proje Maliyet ve Riskleri` → `RiskCostFields`) bulunmalı — silme sonrası `grep -n "settingsDrawerOverlay\|drawerCardHeader" src/app/hesapla/page.tsx` boş dönmeli.

- [ ] **Step 5: tsc kontrolü**

Run: `npx tsc --noEmit`
Expected: `FormulParamsFields` importu artık HİÇBİR yerde kullanılmıyor olabilir (Task 8'de `.mobileSidebar` bloğu da silinene kadar hâlâ orada kullanılıyor olacak — bu adımda `FormulParamsFields` importunu SİLME, Task 8'e kadar hâlâ gerekli). `RiskCostFields`'in hâlâ kullanıldığı tek yer `.mobileAccordions` içindeki kopya kalmalı (Task 8'de o da silinecek). `page.tsx`'te başka hata OLMAMALI.

- [ ] **Step 6: `pageStyles.scope.test.ts`'i güncelle**

`describe('birim maliyet ve piyasa fiyati gorunurlugu (spec 2026-07-29 K1/K7)', ...)` bloğundaki `'masaustunde piyasa fiyati artik cekmece ICINDE DEGIL'` testini bul ve TAMAMEN SİL — bu test `styles.settingsDrawerOverlay`'in var olduğunu ÖN KOŞUL olarak kullanıyordu (`expect(cekmeceBas).toBeGreaterThan(-1)`), çekmece artık kodda hiç yok.

Aynı describe bloğunun İÇİNE (başka bir testin yanına) ekle:

```ts
  it('masaustu cekmece (settingsDrawer) artik kodda yok', () => {
    const pageTsx = fs.readFileSync(path.join(__dirname, 'page.tsx'), 'utf8');
    expect(pageTsx).not.toMatch(/settingsDrawerOverlay/);
    expect(pageTsx).not.toMatch(/isSettingsSidebarOpen/);
    expect(pageTsx).not.toMatch(/settingsGear/);
  });

  it('bagimsiz "Risk Payi" grubu artik kodda yok — risk SmartContextCard icinde', () => {
    const pageTsx = fs.readFileSync(path.join(__dirname, 'page.tsx'), 'utf8');
    expect(pageTsx).not.toMatch(/<h4>Risk Payı<\/h4>/);
  });
```

- [ ] **Step 7: Testleri çalıştır**

Run: `npx jest --no-coverage --roots "<rootDir>/src" --testPathPatterns "pageStyles"`
Expected: PASS (`src/app/hesapla/pageStyles.scope.test.ts` dahil tüm `pageStyles` suite'leri)

- [ ] **Step 8: Commit**

```bash
git add src/app/hesapla/page.tsx src/app/hesapla/pageStyles.scope.test.ts
git commit -m "refactor(hesapla): masaustu ayarlar cekmecesini ve bagimsiz Risk Payi grubunu kaldir"
```

---

## Task 8: Erişilemez `.mobileSidebar`/`.mobileAccordions` bloğunu ve ilgili CSS/testi sil

**Files:**
- Modify: `src/app/hesapla/page.tsx`
- Modify: `src/app/hesapla/page.module.css`
- Modify: `src/app/hesapla/pageStyles.scope.test.ts`

**Interfaces:**
- Consumes: Task 7'nin tamamlanmış `page.tsx` durumu.
- Produces: yok.

**Neden güvenli:** `page.tsx:466`'daki `if (!isDesktopViewport) return <HesaplaMobile ... />;` bu return path'ine hiç girmeden döner; `.mobileSidebar`/`.mobileAccordions` JSX'i yalnızca bu `if`'ten SONRAKI (masaüstü) `return`'ün içinde yaşıyor, yani gerçek mobil viewport'ta ASLA render edilmiyor.

- [ ] **Step 1: JSX bloğunu sil**

Dosyada şu satırı bul: `          {/* ===== MOBILE SIDEBAR: Simplified card layout (visible on mobile only) ===== */}`.
Bu yorum satırından başlayarak, ondan hemen sonra gelen tüm blok — `.mobileSidebar` sarmalayıcısı (`Yapı Standardı`/`Daire Metrekaresi`/`Arsa Payı` kartlarını içeren `.unifiedGlassPanel`), ardından `{/* ── Gelişmiş ayarlar: mobilde accordion (drawer ile aynı bileşenler) ── */}` yorumu ve `.mobileAccordions` içindeki üç `<details className={styles.accordion}>` bloğu (Formül Parametreleri → `FormulParamsFields`, Proje Maliyet ve Riskleri → `RiskCostFields`, Piyasa Analizi → `MarketField`) — TÜMÜ dahil olmak üzere, `.mobileSidebar`'ı açan `<div>`'i kapatan son `</div>` satırına kadar sil. Bu son `</div>`'den hemen sonra `        </aside>` satırı gelmeli — o satıra DOKUNMA.

Silme sonrası doğrulama: `grep -n "mobileSidebar\|mobileAccordions" src/app/hesapla/page.tsx` boş dönmeli, `grep -n "</aside>" src/app/hesapla/page.tsx` hâlâ tek bir sonuç vermeli.

- [ ] **Step 2: Artık kullanılmayan importu sil**

`FormulParamsFields` importunu kontrol et:

Run: `grep -n "FormulParamsFields" src/app/hesapla/page.tsx`
Expected: yalnızca import satırı kalmış olmalı (`import { FormulParamsFields, RiskCostFields, MarketField, BirimMaliyetField } from './AdvancedSettingsSections';`) — JSX kullanımı yok.

Bu satırı şununla değiştir (`FormulParamsFields` ve `RiskCostFields` çıkar, `MarketField`/`BirimMaliyetField` kalır — ikisi hâlâ "Piyasa Analizi" grubunda kullanılıyor):

```tsx
import { MarketField, BirimMaliyetField } from './AdvancedSettingsSections';
```

Run: `grep -n "RiskCostFields" src/app/hesapla/page.tsx`
Expected: HİÇBİR sonuç (import satırından da çıkarıldı, yukarıdaki değişiklik bunu zaten kapsıyor).

- [ ] **Step 3: tsc kontrolü**

Run: `npx tsc --noEmit`
Expected: 0 hata (`page.tsx` artık `FormulParamsFields`/`RiskCostFields`'i hiç import etmiyor).

- [ ] **Step 4: `page.module.css`'ten ölü kuralları sil**

Aşağıdaki sınıfların `page.tsx`'te ARTIK kullanılmadığını doğrula:

Run: `for c in mobileSidebar mobileAccordions accordion accordionSummary accordionBody swipeCardPadded unifiedGlassPanel; do echo "$c:"; grep -c "styles\.$c\b" src/app/hesapla/page.tsx; done`
Expected: hepsi `0`.

`page.module.css` içinde bu sınıflara ait TÜM kuralları (`.mobileSidebar { ... }`, `.mobileAccordions { ... }`, `.accordion { ... }`, `.accordionSummary { ... }`, `.accordionBody { ... }`, `.swipeCardPadded { ... }`, `.unifiedGlassPanel { ... }`, ve bunların `@media` blokları içindeki tekrarları — `grep -n` ile her birinin TÜM geçtiği satırları bul, ilgili kural bloklarını sil) ve `.mobileAccordions .drawerRow::before` kuralını sil.

Run: `grep -n "mobileSidebar\|mobileAccordions\|\.accordion\b\|accordionSummary\|accordionBody\|swipeCardPadded\|unifiedGlassPanel" src/app/hesapla/page.module.css`

Her eşleşen kural bloğunu (`.className { ... }` açılış-kapanışıyla) dosyadan sil.

- [ ] **Step 5: "kat dilimi şeridi kapsamı" testini sil**

`src/app/hesapla/pageStyles.scope.test.ts` içindeki şu bloğu:

```ts
describe('kat dilimi şeridi kapsamı', () => {
  it('.mobileAccordions .drawerRow::before selektörü tanımlı olmalı', () => {
    expect(pageCss).toMatch(/\.mobileAccordions\s+\.drawerRow::before/);
  });

  it('çıplak .drawerRow::before (mobileAccordions olmadan) TANIMLI OLMAMALI', () => {
    // .mobileAccordions .drawerRow::before dışında hiçbir yerde bare .drawerRow::before olmamalı
    const bareRulePattern = /(?<!\.mobileAccordions\s)\.drawerRow::before/g;
    const matches = pageCss.match(bareRulePattern) ?? [];
    expect(matches.length).toBe(0);
  });
});

```

TAMAMEN SİL — `.mobileAccordions` artık kodda yok, bu testin koruduğu CSS kuralı da Step 4'te silindi.

- [ ] **Step 6: Yeni guard testi ekle**

`describe('hesapla mobil cam kart + aurora mavi vurgu token kapsamı', ...)` bloğundan hemen SONRA (Step 5'te sildiğin `describe` bloğunun olduğu yere) ekle:

```ts
describe('erisilemez mobil ölü kod kapsami', () => {
  it('.mobileSidebar/.mobileAccordions artik page.tsx JSX\'inde yok (isDesktopViewport===false erken donuyor, hic render edilmiyordu)', () => {
    const pageTsx = fs.readFileSync(path.join(__dirname, 'page.tsx'), 'utf8');
    expect(pageTsx).not.toMatch(/styles\.mobileSidebar/);
    expect(pageTsx).not.toMatch(/styles\.mobileAccordions/);
  });
});
```

- [ ] **Step 7: Tüm testleri çalıştır**

Run: `npx jest --no-coverage --roots "<rootDir>/src" --testPathPatterns "pageStyles|page\\.test"`
Expected: PASS (tüm suite'ler)

- [ ] **Step 8: Commit**

```bash
git add src/app/hesapla/page.tsx src/app/hesapla/page.module.css src/app/hesapla/pageStyles.scope.test.ts
git commit -m "chore(hesapla): erisilemez .mobileSidebar/.mobileAccordions blogunu ve olu CSS'i sil"
```

---

## Task 9: Artık dead code olan `FormulParamsFields`/`DaireSayisiFields`/`ArsaAlaniFields`'i sil

**Files:**
- Modify: `src/app/hesapla/AdvancedSettingsSections.tsx`

**Interfaces:**
- Consumes: Task 5, 8'in tamamlanmış durumu (bu üç bileşenin son çağıranları kaldırıldı).
- Produces: yok.

**Neden güvenli:** Task 5 `GelismisAyarlarSheet`'ten `ArsaAlaniFields`'i, Task 8 `page.tsx`'ten `FormulParamsFields`'i kaldırdı. `DaireSayisiFields` yalnızca `FormulParamsFields`'in içinden çağrılıyordu. Üçü de artık HİÇBİR yerden çağrılmıyor.

- [ ] **Step 1: Doğrula**

Run: `grep -rn "FormulParamsFields\|DaireSayisiFields\|ArsaAlaniFields" src --include="*.tsx" --include="*.ts" | grep -v "AdvancedSettingsSections.tsx"`
Expected: HİÇBİR sonuç (hiçbir dosya bu üç ismi artık import/kullanmıyor).

- [ ] **Step 2: `AdvancedSettingsSections.tsx`'ten sil**

`DaireSayisiProps` arayüzünü, `DaireSayisiFields` fonksiyonunu, `ArsaAlaniProps` arayüzünü, `ArsaAlaniFields` fonksiyonunu, `FormulParamsProps` arayüzünü ve `FormulParamsFields` fonksiyonunu TAMAMEN SİL (bu dört export ve iki tip tanımı — `export interface DaireSayisiProps`'tan `export function FormulParamsFields(props: FormulParamsProps) { ... }`'in kapanışına kadarki TÜM blok).

`RiskCostProps`/`RiskCostFields` bloğu (bir önceki, Task 4'te düzenlenen) ve ondan sonrası (`BirimMaliyetFieldProps`/`BirimMaliyetField`, `MarketFieldProps`/`MarketField`) DOKUNULMADAN kalsın.

`Toggle`/`RangeSlider` importlarının hâlâ kullanılıp kullanılmadığını kontrol et:

Run: `grep -n "<Toggle\|<RangeSlider" src/app/hesapla/AdvancedSettingsSections.tsx`
Expected: eğer ikisi de sonuç vermiyorsa, dosyanın en üstündeki `import { Toggle } from '@/components/ui/Toggle';` ve/veya `import { RangeSlider } from '@/components/ui/RangeSlider';` satırlarını da sil (kullanılmayan import eslint hatası verir).

- [ ] **Step 3: tsc ve eslint kontrolü**

Run: `npx tsc --noEmit`
Expected: 0 hata

Run: `npx eslint src/app/hesapla/AdvancedSettingsSections.tsx`
Expected: 0 hata/uyarı (kullanılmayan import kalmamış olmalı)

- [ ] **Step 4: Testleri çalıştır**

Run: `npx jest --no-coverage --roots "<rootDir>/src" --testPathPatterns "AdvancedSettingsSections"`
Expected: PASS (bu dosya `BirimMaliyetField`'i test ediyor, o dokunulmadı)

- [ ] **Step 5: Commit**

```bash
git add src/app/hesapla/AdvancedSettingsSections.tsx
git commit -m "chore(hesapla): cagirani kalmayan FormulParamsFields/DaireSayisiFields/ArsaAlaniFields'i sil"
```

---

## Task 10: Masaüstü çekmece CSS'inin geri kalanını sil

**Files:**
- Modify: `src/app/hesapla/page.module.css`

**Interfaces:**
- Consumes: Task 7'nin tamamlanmış durumu (`settingsDrawer`/`settingsDrawerOverlay`/`settingsGear`/`drawerHeader`/`drawerContent`/`drawerCard`/`closeDrawerBtn` JSX'i zaten silindi).
- Produces: yok.

- [ ] **Step 1: Doğrula**

Run: `for c in settingsDrawer settingsDrawerOverlay settingsGear drawerHeader drawerContent drawerCard closeDrawerBtn drawerCardHeader; do echo "$c:"; grep -c "styles\.$c\b" src/app/hesapla/page.tsx; done`
Expected: hepsi `0`.

**DİKKAT:** `.drawerRow`, `.drawerRowLabel`, `.drawerRowHead`, `.drawerToggleWrap`, `.drawerRiskGrid` gibi sınıflar `AdvancedSettingsSections.tsx`'te (Task 4/9'dan sağ kalan `RiskCostFields`/`BirimMaliyetField`/`MarketField` içinde) HÂLÂ kullanılıyor olabilir — bunlar `page.module.css`'i import ediyor (`import styles from './page.module.css'`, satır 4). Yalnızca yukarıdaki grep'te `0` çıkan, `page.tsx`'e ÖZGÜ sınıfları (`settingsDrawer*`, `settingsGear`, `drawerHeader`, `drawerContent`, `drawerCard*`, `closeDrawerBtn`) sil — `.drawerRow` ailesine DOKUNMA.

- [ ] **Step 2: `page.module.css`'ten sil**

`grep -n "settingsDrawer\|settingsGear\|drawerHeader\|drawerContent\|\.drawerCard\|closeDrawerBtn" src/app/hesapla/page.module.css` ile TÜM eşleşen kural bloklarını (ve varsa `@media` içindeki tekrarlarını) bul ve sil.

- [ ] **Step 3: Doğrulama derlemesi**

Run: `npm run build`
Expected: başarılı (silinen CSS sınıflarının hiçbiri artık hiçbir JSX'te referans edilmiyor, build kırılmaz — CSS Modules kullanılmayan sınıf için hata vermez ama biz zaten JSX tarafında da temizledik).

- [ ] **Step 4: Commit**

```bash
git add src/app/hesapla/page.module.css
git commit -m "chore(hesapla): cekmeceye ait geri kalan olu CSS'i sil"
```

---

## Task 11: Tam doğrulama ve regresyon kontrolü

**Files:** yok (yalnızca doğrulama).

- [ ] **Step 1: Tam tsc**

Run: `npx tsc --noEmit`
Expected: 0 hata

- [ ] **Step 2: Tam jest**

Run: `npx jest --no-coverage --roots "<rootDir>/src"`
Expected: tüm suite'ler PASS, 0 fail

- [ ] **Step 3: eslint**

Run: `npx eslint src --ext .ts,.tsx`
Expected: branch'in başındaki baseline'a eşit veya daha az hata/uyarı (bu plana başlarken: 2 hata/11 uyarı — bkz. proje hafızası) — YENİ hata/uyarı varsa kaynağını bul ve düzelt.

- [ ] **Step 4: build**

Run: `npm run build`
Expected: başarılı

- [ ] **Step 5: Kritik regresyon — parselsiz risk/alan kontrolü canlı doğrulama**

Bu, Task 2'de birim testle zaten kapatıldı (`'parsel SECILMEDEN de risk pilleri gorunur ve tiklanabilir'`, `'parsel SECILMEDEN de arsa alani girilebilir'`) — burada sadece o testlerin hâlâ suite'te olduğunu ve geçtiğini teyit et:

Run: `npx jest --no-coverage --roots "<rootDir>/src" --testPathPatterns "SmartContextCard" -t "SECILMEDEN"`
Expected: PASS (2/2)

- [ ] **Step 6: Ledger/özet notu**

Tüm task'lar tamamlandıktan sonra `git log --oneline` ile bu planın ürettiği commit zincirini gözden geçir, insan onayına sun.

