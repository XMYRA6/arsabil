# Hesapla Girdi Kartı — Alan Sırası + Birim Maliyet'in Ana Karta Taşınması Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mobil `/hesapla` girdi kartının alan sırasını (Konum→Arsa Alanı→Yapı
Standardı→Daire Büyüklüğü→Birim İnşaat Maliyeti→Arsa Payı→Deprem Riski) bir
müteahhitin gerçek karar akışıyla eşleştirmek, ve zorunlu-ama-gizli
`globalUnitPrice` alanını "Gelişmiş Ayarlar"dan ana karta taşımak —
davranış/motor/masaüstü değişmeden.

**Architecture:** `SmartContextCard` üç bağımsız alt-bileşene ayrılır
(`LocationHeader`/`RiskSection`/`AreaSection`, yeni dosya
`SmartContextCardSections.tsx`); `SmartContextCard.tsx` bunları ORİJİNAL
sırayla birleştiren ince bir sarmalayıcıya döner (masaüstü hiç değişmez).
`GirdiKarti.tsx` bu üç alt-bileşeni YENİ sırada kullanır ve aralarına yeni bir
Birim İnşaat Maliyeti alanı ekler — bu alanın tamponlu-input mantığı
(`useBufferedNumberInput`, yeni hook) `BirimMaliyetField`'dan (masaüstü,
`AdvancedSettingsSections.tsx`) çıkarılıp paylaşılır, ama mobil kendi Liquid
Glass görselini kullanır.

**Tech Stack:** Next.js 16 App Router, React, CSS Modules, Jest + React
Testing Library.

## Global Constraints

- Masaüstü (`page.tsx:696` `<SmartContextCard>` çağrısı, `page.tsx:712-763`
  desktop sidebar) **HİÇ değişmemeli** — çıktı piksel-eşdeğer kalmalı.
- `SmartContextCard.test.tsx` (mevcut 10 test) ve
  `AdvancedSettingsSections.test.tsx`'teki mevcut 5 `BirimMaliyetField` testi
  **DEĞİŞMEDEN geçmeli** — bunlar regresyon guard'ı.
- Yeni mobil CSS kuralları `mobile.module.css`'in TEK büyük
  `@media (max-width:768px)` bloğunun İÇİNDE kalmalı
  (`mobileStyles.scope.test.ts` guard'ı zorunlu kılıyor). `var(--fg)`/
  `var(--label-color)`/`var(--muted)` KULLANILMAMALI.
- Motor/hesaplama mantığı birebir korunuyor — yalnızca render/prop akışı
  değişiyor.
- Spec: `docs/superpowers/specs/2026-08-13-hesapla-girdi-karti-sira-design.md`.
  Mockup: https://claude.ai/code/artifact/22ee1af1-3af6-4514-89a8-df5d12a4601c

---

## Dosya Yapısı Özeti

| Dosya | İşlem | Sorumluluk |
|---|---|---|
| `src/app/hesapla/useBufferedNumberInput.ts` | Oluştur | Paylaşılan tamponlu-input hook'u (Task 1) |
| `src/app/hesapla/useBufferedNumberInput.test.ts` | Oluştur | Hook testleri (Task 1) |
| `src/app/hesapla/AdvancedSettingsSections.tsx` | Değiştir | `BirimMaliyetField` hook'u kullanır, `RiskCostFields` sırası değişir (Task 1) |
| `src/app/hesapla/AdvancedSettingsSections.test.tsx` | Değiştir | `RiskCostFields` sıra testi eklenir (Task 1) |
| `src/app/hesapla/SmartContextCardSections.tsx` | Oluştur | `LocationHeader`/`RiskSection`/`AreaSection` (Task 2) |
| `src/app/hesapla/SmartContextCardSections.test.tsx` | Oluştur | Üç alt-bileşenin testleri (Task 2) |
| `src/app/hesapla/SmartContextCard.tsx` | Değiştir | İnce sarmalayıcıya döner (Task 2) |
| `src/app/hesapla/mobile/GirdiKarti.tsx` | Değiştir | Yeni sıra + yeni Birim Maliyet alanı (Task 3) |
| `src/app/hesapla/mobile/mobile.module.css` | Değiştir | Yeni Birim Maliyet stilleri (Task 3) |
| `src/app/hesapla/mobile/GirdiKarti.test.tsx` | Değiştir | Yeni prop'lar + sıra testi + Birim Maliyet testleri (Task 3) |
| `src/app/hesapla/mobile/GelismisAyarlarSheet.tsx` | Değiştir | `BirimMaliyetField` çıkar, aria-label yenilenir (Task 4) |
| `src/app/hesapla/mobile/GelismisAyarlarSheet.test.tsx` | Değiştir | Prop/aria-label güncellemeleri (Task 4) |
| `src/app/hesapla/page.tsx` | Değiştir | `girdi={{...}}` genişler, `<GelismisAyarlarSheet>` çağrısı daralır (Task 5) |

---

### Task 1: `AdvancedSettingsSections.tsx` — paylaşılan hook + `RiskCostFields` sırası

**Files:**
- Create: `src/app/hesapla/useBufferedNumberInput.ts`
- Create: `src/app/hesapla/useBufferedNumberInput.test.ts`
- Modify: `src/app/hesapla/AdvancedSettingsSections.tsx`
- Modify: `src/app/hesapla/AdvancedSettingsSections.test.tsx`

**Interfaces:**
- Consumes: yok (bağımsız ilk task).
- Produces: `useBufferedNumberInput(value: number | null, onChange: (v: number) => void): { girdi: string; handleChange: (raw: string) => void }` — Task 3 bunu import edip mobil Birim Maliyet alanında kullanacak.

- [ ] **Step 1: Write the failing tests**

Yeni dosya `src/app/hesapla/useBufferedNumberInput.test.ts`:

```tsx
/** @jest-environment jsdom */
import { render, screen, fireEvent } from '@testing-library/react'
import { useBufferedNumberInput } from './useBufferedNumberInput'

function TestWrapper({ value, onChange }: { value: number | null; onChange: (v: number) => void }) {
    const { girdi, handleChange } = useBufferedNumberInput(value, onChange)
    return <input type="number" aria-label="test-girdi" value={girdi} onChange={e => handleChange(e.target.value)} />
}

describe('useBufferedNumberInput', () => {
    it('baslangic degerini gosterir', () => {
        render(<TestWrapper value={12000} onChange={jest.fn()} />)
        expect(screen.getByLabelText('test-girdi')).toHaveValue(12000)
    })

    it('null baslangicta bos gorunur', () => {
        render(<TestWrapper value={null} onChange={jest.fn()} />)
        expect(screen.getByLabelText('test-girdi')).toHaveValue(null)
    })

    it('gecerli (>0) deger yazilinca onChange cagrilir', () => {
        const onChange = jest.fn()
        render(<TestWrapper value={12000} onChange={onChange} />)
        fireEvent.change(screen.getByLabelText('test-girdi'), { target: { value: '15500' } })
        expect(onChange).toHaveBeenCalledWith(15500)
    })

    it('alan silindiginde bos kalir, eski degere geri sicramaz', () => {
        const onChange = jest.fn()
        render(<TestWrapper value={12000} onChange={onChange} />)
        fireEvent.change(screen.getByLabelText('test-girdi'), { target: { value: '' } })
        expect(screen.getByLabelText('test-girdi')).toHaveValue(null)
        expect(onChange).not.toHaveBeenCalled()
    })

    it('gecersiz "0" ara degeri commit edilmez ama alanda gorunmeye devam eder', () => {
        const onChange = jest.fn()
        render(<TestWrapper value={12000} onChange={onChange} />)
        fireEvent.change(screen.getByLabelText('test-girdi'), { target: { value: '0' } })
        expect(screen.getByLabelText('test-girdi')).toHaveValue(0)
        expect(onChange).not.toHaveBeenCalled()
    })
})
```

`src/app/hesapla/AdvancedSettingsSections.test.tsx`'in sonuna (dosyanın son
satırı `});`'den hemen SONRA) ekle:

```tsx

describe('RiskCostFields sirasi', () => {
    function riskCostProps(patch: Partial<React.ComponentProps<typeof RiskCostFields>> = {}) {
        return {
            iksaMode: 'off' as const, setIksaMode: jest.fn(),
            iksaPercentage: 5, setIksaPercentage: jest.fn(),
            iksaManualTL: 0, setIksaManualTL: jest.fn(),
            builderProfit: 1.3, setBuilderProfit: jest.fn(),
            profitLevels: [
                { id: '1', label: 'Düşük', value: 1.15, sortOrder: 0, isDefault: false },
                { id: '2', label: 'Orta', value: 1.30, sortOrder: 1, isDefault: true },
            ],
            ...patch,
        };
    }

    it('İksa Masrafı, Müteahhit Kazancı\'ndan ÖNCE render olur', () => {
        const { container } = render(<RiskCostFields {...riskCostProps()} />)
        const metin = container.textContent ?? ''
        expect(metin.indexOf('İksa Masrafı')).toBeGreaterThan(-1)
        expect(metin.indexOf('Müteahhit Kazancı')).toBeGreaterThan(-1)
        expect(metin.indexOf('İksa Masrafı')).toBeLessThan(metin.indexOf('Müteahhit Kazancı'))
    })
})
```

Dosyanın import satırına `RiskCostFields` eklenir. Ara (`AdvancedSettingsSections.test.tsx:5`):

```tsx
import { BirimMaliyetField, type BirimMaliyetFieldProps } from './AdvancedSettingsSections';
```

Yeni:

```tsx
import { BirimMaliyetField, RiskCostFields, type BirimMaliyetFieldProps } from './AdvancedSettingsSections';
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest --no-coverage src/app/hesapla/useBufferedNumberInput.test.ts src/app/hesapla/AdvancedSettingsSections.test.tsx`
Expected: `useBufferedNumberInput.test.ts` tamamı FAIL (dosya/export henüz
yok). `RiskCostFields sirasi` testi FAIL (Müteahhit Kazancı hâlâ İksa
Masrafı'ndan önce geliyor, `indexOf` karşılaştırması ters çıkar).

- [ ] **Step 3: Write minimal implementation**

**3a. Yeni dosya `src/app/hesapla/useBufferedNumberInput.ts`:**

```ts
"use client";

import { useState } from 'react';

/**
 * Bir `number | null` degeri kontrollu bir metin input'u olarak tamponlar.
 * `value`e dogrudan baglanmak (`String(value)`) kullaniciyi alani SILEMEZ
 * hale getirir: `Number('') === 0` guard'i gecemedigi icin commit hic
 * olmaz, React input'u HEMEN eski degere geri yazar (review Finding 2,
 * 2026-07-30, BirimMaliyetField'ta bulunmustu). Yerel `girdi` string
 * state'i bu sicramayi onler: ham metin HER ZAMAN gosterilir, yalnizca
 * gecerli (>0) bir sayi girildiginde `onChange`e commit edilir. Dis
 * kaynakli deger degisiklikleri (parent'tan geri akan prop) render
 * SIRASINDA yakalanir.
 */
export function useBufferedNumberInput(
    value: number | null,
    onChange: (v: number) => void,
) {
    const [girdi, setGirdi] = useState<string>(value === null ? '' : String(value));
    const [oncekiDeger, setOncekiDeger] = useState<number | null>(value);
    if (value !== oncekiDeger) {
        setOncekiDeger(value);
        setGirdi(value === null ? '' : String(value));
    }

    const handleChange = (raw: string) => {
        setGirdi(raw);
        const v = Number(raw);
        if (Number.isFinite(v) && v > 0) {
            onChange(v);
        }
    };

    return { girdi, handleChange };
}
```

**3b. `AdvancedSettingsSections.tsx` — import satırı.** Ara (`AdvancedSettingsSections.tsx:3`):

```tsx
import React, { useState } from 'react';
```

Yeni:

```tsx
import React from 'react';
import { useBufferedNumberInput } from './useBufferedNumberInput';
```

**3c. `BirimMaliyetField` gövdesi.** Ara (bul ve TAMAMINI değiştir):

```tsx
export function BirimMaliyetField({ globalUnitPrice, birimMaliyetKaynagi, onBirimMaliyet }: BirimMaliyetFieldProps) {
  const [girdi, setGirdi] = useState<string>(globalUnitPrice === null ? '' : String(globalUnitPrice));
  const [oncekiFiyat, setOncekiFiyat] = useState<number | null>(globalUnitPrice);
  if (globalUnitPrice !== oncekiFiyat) {
    setOncekiFiyat(globalUnitPrice);
    setGirdi(globalUnitPrice === null ? '' : String(globalUnitPrice));
  }

  return (
    <div className={`${styles.drawerRow} ${styles.column}`}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--label-color)' }}>Birim inşaat maliyeti</span>
        <span style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 600 }}>{kaynakEtiketi(birimMaliyetKaynagi, globalUnitPrice)}</span>
      </div>
      <div className={styles.stepperInput}>
        <input
          type="number"
          min={0}
          step={100}
          value={girdi}
          aria-label="Birim inşaat maliyeti (TL/m²)"
          onChange={e => {
            const raw = e.target.value;
            setGirdi(raw);
            const v = Number(raw);
            if (Number.isFinite(v) && v > 0) {
              onBirimMaliyet(v);
            }
          }}
        />
        <div className={styles.stepperRight}>
          <span>TL/m²</span>
        </div>
      </div>
    </div>
  );
}
```

Yeni:

```tsx
export function BirimMaliyetField({ globalUnitPrice, birimMaliyetKaynagi, onBirimMaliyet }: BirimMaliyetFieldProps) {
  const { girdi, handleChange } = useBufferedNumberInput(globalUnitPrice, onBirimMaliyet);

  return (
    <div className={`${styles.drawerRow} ${styles.column}`}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--label-color)' }}>Birim inşaat maliyeti</span>
        <span style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 600 }}>{kaynakEtiketi(birimMaliyetKaynagi, globalUnitPrice)}</span>
      </div>
      <div className={styles.stepperInput}>
        <input
          type="number"
          min={0}
          step={100}
          value={girdi}
          aria-label="Birim inşaat maliyeti (TL/m²)"
          onChange={e => handleChange(e.target.value)}
        />
        <div className={styles.stepperRight}>
          <span>TL/m²</span>
        </div>
      </div>
    </div>
  );
}
```

**3d. `RiskCostFields` — İksa Masrafı ve Müteahhit Kazancı blokları yer değiştirir.** Ara (bul ve TAMAMINI değiştir):

```tsx
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
```

Yeni:

```tsx
  return (
    <>
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
    </>
  );
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest --no-coverage src/app/hesapla/useBufferedNumberInput.test.ts src/app/hesapla/AdvancedSettingsSections.test.tsx`
Expected: tüm testler PASS — yeni hook testleri, yeni `RiskCostFields sirasi`
testi, VE mevcut 5 `BirimMaliyetField` testi (değişmeden, hook'un davranışı
birebir aynı olduğu için).

- [ ] **Step 5: Commit**

```bash
git add src/app/hesapla/useBufferedNumberInput.ts src/app/hesapla/useBufferedNumberInput.test.ts src/app/hesapla/AdvancedSettingsSections.tsx src/app/hesapla/AdvancedSettingsSections.test.tsx
git commit -m "feat(hesapla): tamponlu-input hook'u cikarilir, RiskCostFields sirasi degisir"
```

---

### Task 2: `SmartContextCard` üç alt-bileşene ayrılır

**Files:**
- Create: `src/app/hesapla/SmartContextCardSections.tsx`
- Create: `src/app/hesapla/SmartContextCardSections.test.tsx`
- Modify: `src/app/hesapla/SmartContextCard.tsx`

**Interfaces:**
- Consumes: yok (Task 1'den bağımsız, farklı dosyalar).
- Produces: `LocationHeader(props: LocationHeaderProps)`, `RiskSection(props: RiskSectionProps)`, `AreaSection(props: AreaSectionProps)` — Task 3 bunları doğrudan import edip `GirdiKarti`'de kullanacak. Her birinin kök elemanı `data-girdi-blok` attribute'u taşıyor (`konum`/`deprem-riski`/`arsa-alani`) — Task 3'ün DOM-sıra testi buna dayanıyor.

- [ ] **Step 1: Write the failing tests**

Yeni dosya `src/app/hesapla/SmartContextCardSections.test.tsx`:

```tsx
/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LocationHeader, RiskSection, AreaSection } from './SmartContextCardSections'

const RISK_LEVELS = [
    { id: 'r0', label: 'Yok', value: 0, sortOrder: 0, isDefault: true },
    { id: 'r1', label: 'Düşük', value: 5, sortOrder: 1, isDefault: false },
    { id: 'r2', label: 'Orta', value: 10, sortOrder: 2, isDefault: false },
    { id: 'r3', label: 'Yüksek', value: 15, sortOrder: 3, isDefault: false },
]

describe('LocationHeader', () => {
    it('parcelContext yokken "Haritadan parsel seç" gösterir', () => {
        render(<LocationHeader parcelContext={null} onOpenMap={jest.fn()} />)
        expect(screen.getByRole('button', { name: /Haritadan parsel seç/ })).toBeInTheDocument()
    })

    it('kök eleman data-girdi-blok="konum" taşır', () => {
        const { container } = render(<LocationHeader parcelContext={null} onOpenMap={jest.fn()} />)
        expect(container.querySelector('[data-girdi-blok="konum"]')).toBeInTheDocument()
    })

    it('parcelContext varken adres ve "Değiştir" gösterir', () => {
        const parcelContext = {
            lat: 41.0, lng: 29.0, status: 'verified' as const,
            parcel: { il: 'İstanbul', ilce: 'Kadıköy', mahalle: 'Fenerbahçe', adaNo: '1', parselNo: '2', areaSqm: 620, quality: 'Arsa', geometry: { type: 'Polygon' as const, coordinates: [] } },
        }
        render(<LocationHeader parcelContext={parcelContext} onOpenMap={jest.fn()} />)
        expect(screen.getByText(/Kadıköy, Fenerbahçe/)).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Değiştir' })).toBeInTheDocument()
    })
})

describe('RiskSection', () => {
    it('kök eleman data-girdi-blok="deprem-riski" taşır', () => {
        const { container } = render(
            <RiskSection riskLevel={10} riskLevels={RISK_LEVELS} onRiskLevel={jest.fn()} riskKaynagi={{ tur: 'varsayilan' }} />
        )
        expect(container.querySelector('[data-girdi-blok="deprem-riski"]')).toBeInTheDocument()
    })

    it('risk pilleri gorunur ve tiklanabilir', async () => {
        const onRiskLevel = jest.fn()
        render(<RiskSection riskLevel={10} riskLevels={RISK_LEVELS} onRiskLevel={onRiskLevel} riskKaynagi={{ tur: 'varsayilan' }} />)
        await userEvent.click(screen.getByRole('button', { name: 'Yüksek' }))
        expect(onRiskLevel).toHaveBeenCalledWith(15)
    })

    it('secili risk pili aktif isaretlenir', () => {
        render(<RiskSection riskLevel={10} riskLevels={RISK_LEVELS} onRiskLevel={jest.fn()} riskKaynagi={{ tur: 'varsayilan' }} />)
        expect(screen.getByRole('button', { name: 'Orta' })).toHaveAttribute('aria-pressed', 'true')
    })
})

describe('AreaSection', () => {
    it('kök eleman data-girdi-blok="arsa-alani" taşır', () => {
        const { container } = render(
            <AreaSection parcelContext={null} arsaAlani={500} onArsaAlani={jest.fn()} isAaEnabled={false} onIsAaEnabled={jest.fn()} />
        )
        expect(container.querySelector('[data-girdi-blok="arsa-alani"]')).toBeInTheDocument()
    })

    it('isAaEnabled kapaliyken alan input satırı görünmez', () => {
        render(<AreaSection parcelContext={null} arsaAlani={500} onArsaAlani={jest.fn()} isAaEnabled={false} onIsAaEnabled={jest.fn()} />)
        expect(screen.queryByPlaceholderText('Alanı girin')).toBeNull()
    })

    it('isAaEnabled açıkken alan input satırı görünür ve anahtar çalışır', async () => {
        const onIsAaEnabled = jest.fn()
        render(<AreaSection parcelContext={null} arsaAlani={500} onArsaAlani={jest.fn()} isAaEnabled={true} onIsAaEnabled={onIsAaEnabled} />)
        expect(screen.getByPlaceholderText('Alanı girin')).toBeInTheDocument()
        await userEvent.click(screen.getByRole('checkbox', { name: 'Arsa alanını hesaba kat' }))
        expect(onIsAaEnabled).toHaveBeenCalledWith(false)
    })

    it('TKGM onaylı parselde durum metni doğru gösterilir', () => {
        const parcelContext = {
            lat: 41.0, lng: 29.0, status: 'verified' as const,
            parcel: { il: 'İstanbul', ilce: 'Kadıköy', mahalle: 'Fenerbahçe', adaNo: '1', parselNo: '2', areaSqm: 620, quality: 'Arsa', geometry: { type: 'Polygon' as const, coordinates: [] } },
        }
        render(<AreaSection parcelContext={parcelContext} arsaAlani={500} onArsaAlani={jest.fn()} isAaEnabled={true} onIsAaEnabled={jest.fn()} />)
        expect(screen.getByText('✓ TKGM Onaylı')).toBeInTheDocument()
    })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest --no-coverage src/app/hesapla/SmartContextCardSections.test.tsx`
Expected: tüm testler FAIL — `./SmartContextCardSections` dosyası henüz yok.

- [ ] **Step 3: Write minimal implementation**

**3a. Yeni dosya `src/app/hesapla/SmartContextCardSections.tsx`:**

```tsx
"use client";

import type { ParcelPickerValue } from '@/components/listing-wizard/ParcelPicker';
import { Toggle } from '@/components/ui/Toggle';
import type { RiskLevel } from './riskSuggestionHelpers';
import { riskKaynakEtiketi, type RiskKaynagi } from './mobile/riskSource';
import styles from './SmartContextCard.module.css';

export type LocationHeaderProps = {
    parcelContext: ParcelPickerValue | null;
    onOpenMap: () => void;
};

export function LocationHeader({ parcelContext, onOpenMap }: LocationHeaderProps) {
    const address = parcelContext?.parcel?.mahalle
        ? `${parcelContext.parcel.ilce}, ${parcelContext.parcel.mahalle}`
        : parcelContext
            ? 'Haritadan seçilen nokta'
            : null;

    return (
        <div className={styles.header} data-girdi-blok="konum">
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
    );
}

export type RiskSectionProps = {
    riskLevel: number;
    riskLevels: RiskLevel[];
    onRiskLevel: (v: number) => void;
    riskKaynagi: RiskKaynagi;
};

/**
 * Risk yuzdesinin maliyete etkisi. Motor risk payini (`isRiskEnabled`/`R`)
 * ve iksa masrafini (`isExcavationEnabled`/`Z`/`MzOriginal`) BAGIMSIZ girdiler
 * olarak isler; iksanin kendi ayri kontrolu var. Bu yuzden metin "iksa
 * maliyeti" degil "risk payi" der.
 */
function riskNotu(level: number): string {
    if (level >= 15) return '+%15 risk payı maliyete eklendi';
    if (level >= 10) return '+%10 risk payı maliyete eklendi';
    if (level >= 5) return '+%5 risk payı maliyete eklendi';
    return 'Ek risk payı yok';
}

export function RiskSection({ riskLevel, riskLevels, onRiskLevel, riskKaynagi }: RiskSectionProps) {
    return (
        <div className={styles.riskSection} data-girdi-blok="deprem-riski">
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
    );
}

export type AreaSectionProps = {
    parcelContext: ParcelPickerValue | null;
    arsaAlani: number;
    onArsaAlani: (v: number) => void;
    isAaEnabled: boolean;
    onIsAaEnabled: (v: boolean) => void;
};

export function AreaSection({ parcelContext, arsaAlani, onArsaAlani, isAaEnabled, onIsAaEnabled }: AreaSectionProps) {
    const isAreaVerified = parcelContext?.status === 'verified' && !!parcelContext.parcel?.areaSqm;

    return (
        <div className={styles.areaSection} data-girdi-blok="arsa-alani">
            <div className={styles.areaHeader}>
                <span>Arsa Alanı</span>
                <Toggle
                    className={styles.aaToggle}
                    checked={isAaEnabled}
                    aria-label="Arsa alanını hesaba kat"
                    onChange={(e) => onIsAaEnabled(e.target.checked)}
                />
            </div>
            {isAaEnabled && (
                <p className={`${styles.areaStatus} ${isAreaVerified ? styles.areaStatusOk : ''}`}>
                    {isAreaVerified ? '✓ TKGM Onaylı' : 'Elle girilmesi gerekiyor'}
                </p>
            )}
            {isAaEnabled && (
                <div className={styles.areaInputRow}>
                    <input
                        type="number"
                        value={arsaAlani || ''}
                        onChange={(e) => onArsaAlani(Number(e.target.value))}
                        placeholder="Alanı girin"
                    />
                    <span>m²</span>
                </div>
            )}
        </div>
    );
}
```

**3b. `SmartContextCard.tsx` — TAMAMI şu hâle gelir:**

```tsx
import type { ParcelPickerValue } from '@/components/listing-wizard/ParcelPicker';
import type { RiskLevel } from './riskSuggestionHelpers';
import type { RiskKaynagi } from './mobile/riskSource';
import { LocationHeader, RiskSection, AreaSection } from './SmartContextCardSections';
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
    onIsAaEnabled: (v: boolean) => void;
};

/**
 * Masaustu (ve "orijinal sira" gereken her yer) icin konum+risk+alan ucunu
 * TEK bir kart olarak birlestiren ince sarmalayici. Mobil ekran (GirdiKarti)
 * artik bu ucunu AYRI AYRI, kendi sirasinda kullaniyor — bkz.
 * SmartContextCardSections.tsx. Bu dosyanin cikardigi HTML masaustu icin
 * BIREBIR ONCEKI GIBI kalir.
 */
export function SmartContextCard({
    parcelContext, onOpenMap, arsaAlani, onArsaAlani,
    riskLevel, riskLevels, onRiskLevel, riskKaynagi,
    isAaEnabled, onIsAaEnabled,
}: SmartContextCardProps) {
    return (
        <div className={styles.container}>
            <LocationHeader parcelContext={parcelContext} onOpenMap={onOpenMap} />
            <RiskSection riskLevel={riskLevel} riskLevels={riskLevels} onRiskLevel={onRiskLevel} riskKaynagi={riskKaynagi} />
            <AreaSection parcelContext={parcelContext} arsaAlani={arsaAlani} onArsaAlani={onArsaAlani} isAaEnabled={isAaEnabled} onIsAaEnabled={onIsAaEnabled} />
        </div>
    );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest --no-coverage src/app/hesapla/SmartContextCardSections.test.tsx src/app/hesapla/SmartContextCard.test.tsx`
Expected: tüm yeni testler PASS. `SmartContextCard.test.tsx`'in mevcut 10
testi DEĞİŞMEDEN PASS (çıktı birebir aynı kaldığı için).

- [ ] **Step 5: Commit**

```bash
git add src/app/hesapla/SmartContextCardSections.tsx src/app/hesapla/SmartContextCardSections.test.tsx src/app/hesapla/SmartContextCard.tsx
git commit -m "feat(hesapla): SmartContextCard uc alt-bilesene ayrilir (masaustu degismez)"
```

---

### Task 3: `GirdiKarti.tsx` — yeni sıra + Birim İnşaat Maliyeti alanı

**Files:**
- Modify: `src/app/hesapla/mobile/GirdiKarti.tsx`
- Modify: `src/app/hesapla/mobile/mobile.module.css`
- Modify: `src/app/hesapla/mobile/GirdiKarti.test.tsx`

**Interfaces:**
- Consumes: Task 1'in `useBufferedNumberInput` (`../useBufferedNumberInput`), Task 2'nin `LocationHeader`/`RiskSection`/`AreaSection` (`../SmartContextCardSections`).
- Produces: `GirdiKartiProps` üç yeni alan kazanır: `globalUnitPrice: number | null`, `birimMaliyetKaynagi: BirimMaliyetKaynagi`, `onBirimMaliyet: (v: number) => void` — Task 5 bunları `page.tsx`'ten besleyecek.

- [ ] **Step 1: Write the failing tests**

`src/app/hesapla/mobile/GirdiKarti.test.tsx`'in `props()` yardımcısına yeni
alanlar eklenir. Ara:

```ts
function props(patch: Partial<React.ComponentProps<typeof GirdiKarti>> = {}) {
    return {
        parcelContext: null,
        arsaAlani: 500, onArsaAlani: jest.fn(),
        riskLevel: 10,
        riskLevels: [
            { id: 'r0', label: 'Yok', value: 0, sortOrder: 0, isDefault: true },
            { id: 'r1', label: 'Düşük', value: 5, sortOrder: 1, isDefault: false },
            { id: 'r2', label: 'Orta', value: 10, sortOrder: 2, isDefault: false },
            { id: 'r3', label: 'Yüksek', value: 15, sortOrder: 3, isDefault: false },
        ],
        onRiskLevel: jest.fn(),
        riskKaynagi: { tur: 'varsayilan' as const },
        isAaEnabled: false,
        onIsAaEnabled: jest.fn(),
        onParselDogrulaAc: jest.fn(),
        luxLevel: 1.2, onLuxLevel: jest.fn(),
        apartmentSize: 140, onApartmentSize: jest.fn(),
        landShareRatio: 33, onLandShareRatio: jest.fn(),
        isApartmentCountEnabled: false, onApartmentCountEnabled: jest.fn(),
        totalApartments: 20, onTotalApartments: jest.fn(),
        ownerApartmentShare: 6, onOwnerApartmentShare: jest.fn(),
        ...patch,
    }
}
```

Yeni:

```ts
function props(patch: Partial<React.ComponentProps<typeof GirdiKarti>> = {}) {
    return {
        parcelContext: null,
        arsaAlani: 500, onArsaAlani: jest.fn(),
        riskLevel: 10,
        riskLevels: [
            { id: 'r0', label: 'Yok', value: 0, sortOrder: 0, isDefault: true },
            { id: 'r1', label: 'Düşük', value: 5, sortOrder: 1, isDefault: false },
            { id: 'r2', label: 'Orta', value: 10, sortOrder: 2, isDefault: false },
            { id: 'r3', label: 'Yüksek', value: 15, sortOrder: 3, isDefault: false },
        ],
        onRiskLevel: jest.fn(),
        riskKaynagi: { tur: 'varsayilan' as const },
        isAaEnabled: false,
        onIsAaEnabled: jest.fn(),
        onParselDogrulaAc: jest.fn(),
        luxLevel: 1.2, onLuxLevel: jest.fn(),
        apartmentSize: 140, onApartmentSize: jest.fn(),
        globalUnitPrice: 12000, birimMaliyetKaynagi: { tur: 'varsayilan' as const }, onBirimMaliyet: jest.fn(),
        landShareRatio: 33, onLandShareRatio: jest.fn(),
        isApartmentCountEnabled: false, onApartmentCountEnabled: jest.fn(),
        totalApartments: 20, onTotalApartments: jest.fn(),
        ownerApartmentShare: 6, onOwnerApartmentShare: jest.fn(),
        ...patch,
    }
}
```

Dosyanın sonundaki `})` satırından (describe bloğunun kapanışı) hemen ÖNCE ekle:

```ts

    it('Birim insaat maliyeti alani dogru degeri ve kaynak etiketini gosterir', () => {
        render(<GirdiKarti {...props({ globalUnitPrice: 18500, birimMaliyetKaynagi: { tur: 'elle' } })} />)
        const input = screen.getByRole('spinbutton', { name: 'Birim inşaat maliyeti, TL/m²' })
        expect(input).toHaveValue(18500)
        expect(screen.getByText(/Elle girildi/)).toBeInTheDocument()
    })

    it('Birim insaat maliyetine elle yazilan deger onBirimMaliyet\'e iletilir', () => {
        const onBirimMaliyet = jest.fn()
        render(<GirdiKarti {...props({ globalUnitPrice: 12000, onBirimMaliyet })} />)
        const input = screen.getByRole('spinbutton', { name: 'Birim inşaat maliyeti, TL/m²' })
        fireEvent.change(input, { target: { value: '21000' } })
        expect(onBirimMaliyet).toHaveBeenCalledWith(21000)
    })

    it('kartin alan sirasi: konum, arsa alani, yapi standardi, daire buyuklugu, birim maliyet, arsa payi, deprem riski', () => {
        const { container } = render(<GirdiKarti {...props()} />)
        const bloklar = Array.from(container.querySelectorAll('[data-girdi-blok]'))
        expect(bloklar.map(el => el.getAttribute('data-girdi-blok'))).toEqual([
            'konum', 'arsa-alani', 'yapi-standardi', 'daire-buyuklugu', 'birim-maliyet', 'arsa-payi', 'deprem-riski',
        ])
    })
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest --no-coverage src/app/hesapla/mobile/GirdiKarti.test.tsx`
Expected: yeni 3 test FAIL (Birim Maliyet alanı henüz yok, `data-girdi-blok`
attribute'ları henüz yok). Mevcut testler de muhtemelen FAIL (prop tipi
değişmedi ama `props()`'a eklenen üç yeni alan `GirdiKartiProps`'ta henüz
tanımlı değil — TypeScript hata verecek, `--no-coverage` bunu engellemez;
implementasyon adımına geç).

- [ ] **Step 3: Write minimal implementation**

**3a. `mobile.module.css` — yeni Birim Maliyet stilleri.** `.stepperBirim`
bloğundan hemen sonra (mevcut tek büyük `@media (max-width:768px)` bloğunun
İÇİNDE) ekle:

```css
    /* ── Birim insaat maliyeti ── */
    .girdiEtiketKaynak {
        margin-left: 6px;
        font-weight: 600;
        text-transform: none;
        letter-spacing: normal;
        color: var(--m-body);
        opacity: .8;
    }

    .birimMaliyetSatir {
        display: flex;
        align-items: center;
        height: 44px;
        padding: 3px 13px;
        border-radius: 16px;
        background: rgba(11, 32, 54, .055);
        border: 1px solid rgba(11, 32, 54, .07);
    }

    .birimMaliyetInput {
        flex: 1;
        min-width: 0;
        font-size: 16px;
        font-weight: 800;
        color: var(--m-ink);
        background: transparent;
        border: none;
        outline: none;
    }
    .birimMaliyetInput::-webkit-outer-spin-button,
    .birimMaliyetInput::-webkit-inner-spin-button {
        -webkit-appearance: none;
        margin: 0;
    }

    .birimMaliyetBirim {
        flex: none;
        font-size: 12px;
        font-weight: 700;
        color: var(--m-body);
    }
```

**3b. `GirdiKarti.tsx` — import'lar ve prop tipi.** Ara:

```tsx
import { computeEffectiveLandShareX, ORNEK_APARTMENT_SIZE } from '../calculatorUiHelpers';
import { SmartContextCard } from '../SmartContextCard';
import type { ParcelPickerValue } from '@/components/listing-wizard/ParcelPicker';
import type { RiskLevel } from '../riskSuggestionHelpers';
import type { RiskKaynagi } from './riskSource';
import styles from './mobile.module.css';

export type GirdiKartiProps = {
    parcelContext: ParcelPickerValue | null;
    arsaAlani: number;
    onArsaAlani: (v: number) => void;
    riskLevel: number;
    riskLevels: RiskLevel[];
    onRiskLevel: (v: number) => void;
    riskKaynagi: RiskKaynagi;
    isAaEnabled: boolean;
    onIsAaEnabled: (v: boolean) => void;
    /** Parsel doğrulama modalını açar */
    onParselDogrulaAc: () => void;
    luxLevel: number;
    onLuxLevel: (v: number) => void;
    apartmentSize: number | null;
    onApartmentSize: (v: number | null) => void;
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

Yeni:

```tsx
import { computeEffectiveLandShareX, ORNEK_APARTMENT_SIZE } from '../calculatorUiHelpers';
import { LocationHeader, RiskSection, AreaSection } from '../SmartContextCardSections';
import { useBufferedNumberInput } from '../useBufferedNumberInput';
import { kaynakEtiketi, type BirimMaliyetKaynagi } from './unitPriceSource';
import type { ParcelPickerValue } from '@/components/listing-wizard/ParcelPicker';
import type { RiskLevel } from '../riskSuggestionHelpers';
import type { RiskKaynagi } from './riskSource';
import styles from './mobile.module.css';

export type GirdiKartiProps = {
    parcelContext: ParcelPickerValue | null;
    arsaAlani: number;
    onArsaAlani: (v: number) => void;
    riskLevel: number;
    riskLevels: RiskLevel[];
    onRiskLevel: (v: number) => void;
    riskKaynagi: RiskKaynagi;
    isAaEnabled: boolean;
    onIsAaEnabled: (v: boolean) => void;
    /** Parsel doğrulama modalını açar */
    onParselDogrulaAc: () => void;
    luxLevel: number;
    onLuxLevel: (v: number) => void;
    apartmentSize: number | null;
    onApartmentSize: (v: number | null) => void;
    globalUnitPrice: number | null;
    birimMaliyetKaynagi: BirimMaliyetKaynagi;
    onBirimMaliyet: (v: number) => void;
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

**3c. Fonksiyon gövdesi.** Ara:

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
    onIsAaEnabled,
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
    // Sd acikken gosterilen yuzde TURETILMISTIR, ayri bir state degildir.
    // Formul KOPYALANMAZ: motora giden deger de ayni yardimcidan gelir
    // (page.tsx), satir ici bir kopya zamanla ayrisirdi (A1 minor).
    const turetilmisYuzde = Math.round(computeEffectiveLandShareX({
        isApartmentCountEnabled: true,
        ownerApartmentShare,
        totalApartments,
        landShareRatio,
    }) * 100);
```

Yeni:

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
    onIsAaEnabled,
    luxLevel,
    onLuxLevel,
    apartmentSize,
    onApartmentSize,
    globalUnitPrice,
    birimMaliyetKaynagi,
    onBirimMaliyet,
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
    // Sd acikken gosterilen yuzde TURETILMISTIR, ayri bir state degildir.
    // Formul KOPYALANMAZ: motora giden deger de ayni yardimcidan gelir
    // (page.tsx), satir ici bir kopya zamanla ayrisirdi (A1 minor).
    const turetilmisYuzde = Math.round(computeEffectiveLandShareX({
        isApartmentCountEnabled: true,
        ownerApartmentShare,
        totalApartments,
        landShareRatio,
    }) * 100);

    const { girdi: birimMaliyetGirdi, handleChange: handleBirimMaliyetChange } =
        useBufferedNumberInput(globalUnitPrice, onBirimMaliyet);
```

**3d. JSX — yeni sıra.** Ara (bul ve TAMAMINI değiştir, `<SmartContextCard>`
çağrısından `</section>`'a kadar olan HER ŞEY):

```tsx
    return (
        <section className={styles.girdiKarti} aria-label="Proje girdileri">
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
                onIsAaEnabled={onIsAaEnabled}
            />

            <div className={styles.girdiSatir}>
                <span className={styles.girdiEtiket}>Yapı standardı</span>
                <div className={styles.segmentKap} role="tablist" aria-label="Yapı standardı">
                    {YAPI_STANDARTLARI.map(({ etiket, deger }) => {
                        const secili = luxLevel === deger;
                        return (
                            <button
                                key={etiket}
                                type="button"
                                role="tab"
                                aria-selected={secili}
                                className={`${styles.segment} ${secili ? styles.segmentAktif : ''}`}
                                onClick={() => onLuxLevel(deger)}
                            >
                                <svg width="21" height="21" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                                    <path d={GLIF[etiket]} />
                                </svg>
                                {etiket}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* ── Daire buyuklugu ── */}
            <div className={styles.girdiSatir}>
                <span className={styles.girdiEtiket}>Daire büyüklüğü</span>
                <div className={styles.stepperSatir}>
                    <input
                        type="number"
                        inputMode="numeric"
                        className={`${styles.stepperInput} mNum`}
                        value={apartmentSize ?? ''}
                        placeholder="—"
                        aria-label="Daire büyüklüğü, m²"
                        onChange={(e) => onApartmentSize(e.target.value === '' ? null : Number(e.target.value))}
                    />
                    <span className={styles.stepperBirim}>m²</span>
                    <button
                        type="button"
                        className={styles.stepperAzalt}
                        aria-label="Metrekareyi azalt"
                        onClick={() => {
                            if (apartmentSize === null) return;
                            const yeni = apartmentSize - M2_ADIM;
                            if (yeni >= M2_MIN) onApartmentSize(yeni);
                        }}
                    >
                        −
                    </button>
                    <button
                        type="button"
                        className={styles.stepperArtir}
                        aria-label="Metrekareyi artır"
                        onClick={() => {
                            if (apartmentSize === null) { onApartmentSize(ORNEK_APARTMENT_SIZE); return; }
                            const yeni = apartmentSize + M2_ADIM;
                            if (yeni <= M2_MAX) onApartmentSize(yeni);
                        }}
                    >
                        +
                    </button>
                </div>
            </div>

            {/* ── Arsa payi modu ── */}
            <div className={styles.girdiSatir}>
                <div className={styles.modSatir}>
                    <span className={styles.modEtiket}>
                        Daire sayısıyla gir{' '}
                        <span className={styles.modIpucu}>
                            ({totalApartments}&rsquo;de {ownerApartmentShare})
                        </span>
                    </span>
                    <button
                        type="button"
                        role="switch"
                        aria-checked={isApartmentCountEnabled}
                        aria-label="Toplam daire sayısı üzerinden hesapla"
                        className={`${styles.anahtar} ${isApartmentCountEnabled ? styles.anahtarAcik : ''}`}
                        onClick={() => onApartmentCountEnabled(!isApartmentCountEnabled)}
                    >
                        <span className={styles.anahtarTopu} />
                    </button>
                </div>

                {isApartmentCountEnabled ? (
                    <>
                        <div className={styles.sliderBasligi}>
                            <span className={styles.girdiEtiket}>Toplam daire</span>
                            <span className={`${styles.sliderDeger} mNum`}>{totalApartments}</span>
                        </div>
                        <input
                            type="range"
                            className={styles.slider}
                            min={1}
                            max={80}
                            step={1}
                            value={totalApartments}
                            style={ilerleme(totalApartments, 1, 80)}
                            aria-label="Toplam daire sayısı"
                            onChange={e => onTotalApartments(Number(e.target.value))}
                        />

                        <div className={styles.sliderBasligi}>
                            <span className={styles.girdiEtiket}>Arsa sahibinin daire sayısı</span>
                            <span className={`${styles.sliderDeger} mNum`}>{ownerApartmentShare}</span>
                        </div>
                        <input
                            type="range"
                            className={styles.slider}
                            min={0}
                            max={totalApartments}
                            step={1}
                            value={ownerApartmentShare}
                            style={ilerleme(ownerApartmentShare, 0, totalApartments)}
                            aria-label="Arsa sahibinin daire sayısı"
                            onChange={e => onOwnerApartmentShare(Number(e.target.value))}
                        />

                        {/* Salt-okunur: bu mod acikken yuzde TURETILIR, girilmez. */}
                        <p className={styles.turetilmisNot}>
                            Arsa payı <span className={`${styles.turetilmisYuzde} mNum`}>%{turetilmisYuzde}</span>
                            {' '}olarak hesaplanıyor.
                        </p>
                    </>
                ) : (
                    <>
                        <div className={styles.sliderBasligi}>
                            <span className={styles.girdiEtiket}>Arsa payı</span>
                            <span className={`${styles.sliderDeger} mNum`}>%{landShareRatio}</span>
                        </div>
                        <input
                            type="range"
                            className={styles.slider}
                            min={0}
                            max={100}
                            step={1}
                            value={landShareRatio}
                            style={ilerleme(landShareRatio, 0, 100)}
                            aria-label="Arsa payı yüzdesi"
                            onChange={e => onLandShareRatio(Number(e.target.value))}
                        />
                    </>
                )}
            </div>
        </section>
    );
}
```

Yeni:

```tsx
    return (
        <section className={styles.girdiKarti} aria-label="Proje girdileri">
            <LocationHeader parcelContext={parcelContext} onOpenMap={onParselDogrulaAc} />

            <AreaSection
                parcelContext={parcelContext}
                arsaAlani={arsaAlani}
                onArsaAlani={onArsaAlani}
                isAaEnabled={isAaEnabled}
                onIsAaEnabled={onIsAaEnabled}
            />

            <div className={styles.girdiSatir} data-girdi-blok="yapi-standardi">
                <span className={styles.girdiEtiket}>Yapı standardı</span>
                <div className={styles.segmentKap} role="tablist" aria-label="Yapı standardı">
                    {YAPI_STANDARTLARI.map(({ etiket, deger }) => {
                        const secili = luxLevel === deger;
                        return (
                            <button
                                key={etiket}
                                type="button"
                                role="tab"
                                aria-selected={secili}
                                className={`${styles.segment} ${secili ? styles.segmentAktif : ''}`}
                                onClick={() => onLuxLevel(deger)}
                            >
                                <svg width="21" height="21" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                                    <path d={GLIF[etiket]} />
                                </svg>
                                {etiket}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* ── Daire buyuklugu ── */}
            <div className={styles.girdiSatir} data-girdi-blok="daire-buyuklugu">
                <span className={styles.girdiEtiket}>Daire büyüklüğü</span>
                <div className={styles.stepperSatir}>
                    <input
                        type="number"
                        inputMode="numeric"
                        className={`${styles.stepperInput} mNum`}
                        value={apartmentSize ?? ''}
                        placeholder="—"
                        aria-label="Daire büyüklüğü, m²"
                        onChange={(e) => onApartmentSize(e.target.value === '' ? null : Number(e.target.value))}
                    />
                    <span className={styles.stepperBirim}>m²</span>
                    <button
                        type="button"
                        className={styles.stepperAzalt}
                        aria-label="Metrekareyi azalt"
                        onClick={() => {
                            if (apartmentSize === null) return;
                            const yeni = apartmentSize - M2_ADIM;
                            if (yeni >= M2_MIN) onApartmentSize(yeni);
                        }}
                    >
                        −
                    </button>
                    <button
                        type="button"
                        className={styles.stepperArtir}
                        aria-label="Metrekareyi artır"
                        onClick={() => {
                            if (apartmentSize === null) { onApartmentSize(ORNEK_APARTMENT_SIZE); return; }
                            const yeni = apartmentSize + M2_ADIM;
                            if (yeni <= M2_MAX) onApartmentSize(yeni);
                        }}
                    >
                        +
                    </button>
                </div>
            </div>

            {/* ── Birim insaat maliyeti — YENI, ana karta tasindi ── */}
            <div className={styles.girdiSatir} data-girdi-blok="birim-maliyet">
                <span className={styles.girdiEtiket}>
                    Birim inşaat maliyeti
                    <span className={styles.girdiEtiketKaynak}>{kaynakEtiketi(birimMaliyetKaynagi, globalUnitPrice)}</span>
                </span>
                <div className={styles.birimMaliyetSatir}>
                    <input
                        type="number"
                        inputMode="decimal"
                        className={`${styles.birimMaliyetInput} mNum`}
                        value={birimMaliyetGirdi}
                        placeholder="—"
                        aria-label="Birim inşaat maliyeti, TL/m²"
                        onChange={(e) => handleBirimMaliyetChange(e.target.value)}
                    />
                    <span className={styles.birimMaliyetBirim}>TL/m²</span>
                </div>
            </div>

            {/* ── Arsa payi modu ── */}
            <div className={styles.girdiSatir} data-girdi-blok="arsa-payi">
                <div className={styles.modSatir}>
                    <span className={styles.modEtiket}>
                        Daire sayısıyla gir{' '}
                        <span className={styles.modIpucu}>
                            ({totalApartments}&rsquo;de {ownerApartmentShare})
                        </span>
                    </span>
                    <button
                        type="button"
                        role="switch"
                        aria-checked={isApartmentCountEnabled}
                        aria-label="Toplam daire sayısı üzerinden hesapla"
                        className={`${styles.anahtar} ${isApartmentCountEnabled ? styles.anahtarAcik : ''}`}
                        onClick={() => onApartmentCountEnabled(!isApartmentCountEnabled)}
                    >
                        <span className={styles.anahtarTopu} />
                    </button>
                </div>

                {isApartmentCountEnabled ? (
                    <>
                        <div className={styles.sliderBasligi}>
                            <span className={styles.girdiEtiket}>Toplam daire</span>
                            <span className={`${styles.sliderDeger} mNum`}>{totalApartments}</span>
                        </div>
                        <input
                            type="range"
                            className={styles.slider}
                            min={1}
                            max={80}
                            step={1}
                            value={totalApartments}
                            style={ilerleme(totalApartments, 1, 80)}
                            aria-label="Toplam daire sayısı"
                            onChange={e => onTotalApartments(Number(e.target.value))}
                        />

                        <div className={styles.sliderBasligi}>
                            <span className={styles.girdiEtiket}>Arsa sahibinin daire sayısı</span>
                            <span className={`${styles.sliderDeger} mNum`}>{ownerApartmentShare}</span>
                        </div>
                        <input
                            type="range"
                            className={styles.slider}
                            min={0}
                            max={totalApartments}
                            step={1}
                            value={ownerApartmentShare}
                            style={ilerleme(ownerApartmentShare, 0, totalApartments)}
                            aria-label="Arsa sahibinin daire sayısı"
                            onChange={e => onOwnerApartmentShare(Number(e.target.value))}
                        />

                        {/* Salt-okunur: bu mod acikken yuzde TURETILIR, girilmez. */}
                        <p className={styles.turetilmisNot}>
                            Arsa payı <span className={`${styles.turetilmisYuzde} mNum`}>%{turetilmisYuzde}</span>
                            {' '}olarak hesaplanıyor.
                        </p>
                    </>
                ) : (
                    <>
                        <div className={styles.sliderBasligi}>
                            <span className={styles.girdiEtiket}>Arsa payı</span>
                            <span className={`${styles.sliderDeger} mNum`}>%{landShareRatio}</span>
                        </div>
                        <input
                            type="range"
                            className={styles.slider}
                            min={0}
                            max={100}
                            step={1}
                            value={landShareRatio}
                            style={ilerleme(landShareRatio, 0, 100)}
                            aria-label="Arsa payı yüzdesi"
                            onChange={e => onLandShareRatio(Number(e.target.value))}
                        />
                    </>
                )}
            </div>

            <RiskSection
                riskLevel={riskLevel}
                riskLevels={riskLevels}
                onRiskLevel={onRiskLevel}
                riskKaynagi={riskKaynagi}
            />
        </section>
    );
}
```

(`GirdiKarti.test.tsx`'in üst importu zaten `import { render, screen, fireEvent }
from '@testing-library/react'` — `fireEvent` önceki bir turdan hâlâ orada,
ekstra bir import değişikliği gerekmiyor.)

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx tsc --noEmit && npx jest --no-coverage src/app/hesapla/mobile/GirdiKarti.test.tsx src/app/hesapla/mobile/mobileStyles.scope.test.ts`
Expected: 0 tsc hatası. Tüm testler PASS — yeni 3 test dahil, mevcut ±5
stepper/Yapı Standardı/Arsa Payı testleri değişmeden geçer (JSX'in o kısımları
metin/davranış olarak aynı kaldı, yalnızca konumu değişti).
`mobileStyles.scope.test.ts`'in "TÜM kurallar medya sorgusu içinde" guard'ı
geçer (yeni kurallar zaten mevcut tek büyük `@media` bloğunun içine eklendi).

- [ ] **Step 5: Commit**

```bash
git add src/app/hesapla/mobile/GirdiKarti.tsx src/app/hesapla/mobile/mobile.module.css src/app/hesapla/mobile/GirdiKarti.test.tsx
git commit -m "feat(hesapla-mobil): girdi karti yeni sira + Birim Insaat Maliyeti alani"
```

---

### Task 4: `GelismisAyarlarSheet.tsx` — Birim Maliyet çıkar

**Files:**
- Modify: `src/app/hesapla/mobile/GelismisAyarlarSheet.tsx`
- Modify: `src/app/hesapla/mobile/GelismisAyarlarSheet.test.tsx`

**Interfaces:**
- Consumes: yok (Task 1-3'ten bağımsız, farklı dosyalar — `BirimMaliyetField`in
  kendisine dokunmuyor, yalnızca bu dosyadaki ÇAĞRISINI kaldırıyor).
- Produces: `GelismisAyarlarSheetProps` artık `globalUnitPrice`/
  `birimMaliyetKaynagi`/`onBirimMaliyet` İÇERMİYOR — Task 5 `page.tsx`'teki
  çağrı sitesini buna göre güncelleyecek.

- [ ] **Step 1: Write the failing tests**

`GelismisAyarlarSheet.test.tsx`'in `props()` yardımcısından üç alan
kaldırılır. Ara:

```ts
function props(patch = {}) {
    return {
        open: true,
        onClose: jest.fn(),
        onUygula: jest.fn(),
        onSifirla: jest.fn(),

        builderProfit: 1.3, setBuilderProfit: jest.fn(),
        profitLevels: [
            { id: '1', label: 'Düşük', value: 1.15, sortOrder: 0, isDefault: false },
            { id: '2', label: 'Orta', value: 1.30, sortOrder: 1, isDefault: true },
            { id: '3', label: 'Yüksek', value: 1.50, sortOrder: 2, isDefault: false },
        ],
        iksaMode: 'off' as const, setIksaMode: jest.fn(),
        iksaPercentage: 5, setIksaPercentage: jest.fn(),
        iksaManualTL: 0, setIksaManualTL: jest.fn(),

        manualMarketPrice: '', setManualMarketPrice: jest.fn(),

        globalUnitPrice: 12000, birimMaliyetKaynagi: { tur: 'varsayilan' as const }, onBirimMaliyet: jest.fn(),

        ...patch,
    }
}
```

Yeni:

```ts
function props(patch = {}) {
    return {
        open: true,
        onClose: jest.fn(),
        onUygula: jest.fn(),
        onSifirla: jest.fn(),

        builderProfit: 1.3, setBuilderProfit: jest.fn(),
        profitLevels: [
            { id: '1', label: 'Düşük', value: 1.15, sortOrder: 0, isDefault: false },
            { id: '2', label: 'Orta', value: 1.30, sortOrder: 1, isDefault: true },
            { id: '3', label: 'Yüksek', value: 1.50, sortOrder: 2, isDefault: false },
        ],
        iksaMode: 'off' as const, setIksaMode: jest.fn(),
        iksaPercentage: 5, setIksaPercentage: jest.fn(),
        iksaManualTL: 0, setIksaManualTL: jest.fn(),

        manualMarketPrice: '', setManualMarketPrice: jest.fn(),

        ...patch,
    }
}
```

Üç mevcut `getByRole('group', { name: 'Piyasa fiyatı' })` çağrısı (37-41,
52-57, 60-63. satırlar civarı) "Piyasa karşılaştırması"na güncellenir. Ara
(dosyada 3 kez geçiyor, HER ÜÇÜNÜ de değiştir):

```ts
screen.getByRole('group', { name: 'Piyasa fiyatı' })
```

Yeni (her geçtiği yerde):

```ts
screen.getByRole('group', { name: 'Piyasa karşılaştırması' })
```

Dosyanın sonuna (son `})`'den hemen ÖNCE) yeni bir test ekle:

```ts

    it('Birim insaat maliyeti yapraktan KALKTI (ana karta tasindi)', () => {
        render(<GelismisAyarlarSheet {...props()} />)
        expect(screen.queryByText('Birim inşaat maliyeti')).toBeNull()
    })
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest --no-coverage src/app/hesapla/mobile/GelismisAyarlarSheet.test.tsx`
Expected: "Piyasa karşılaştırması" adlı grup henüz yok (hâlâ "Piyasa
fiyatı") — ilgili testler FAIL. Yeni "Birim insaat maliyeti yapraktan KALKTI"
testi FAIL (alan hâlâ orada). Ayrıca `npx tsc --noEmit` bu noktada BEKLENEN
bir hata verir: `props()`'tan kaldırılan `globalUnitPrice`/
`birimMaliyetKaynagi`/`onBirimMaliyet` alanları `GelismisAyarlarSheetProps`
(henüz `BirimMaliyetFieldProps`'u içeriyor) tarafından hâlâ ZORUNLU
tutuluyor — `{...props()}` spread'i eksik-prop hatası verir. Bu, Step 3'ün
tip tanımını da daraltmasıyla kapanan, TDD'nin bu task için "RED" aşamasının
bir parçasıdır.

- [ ] **Step 3: Write minimal implementation**

**3a. Import satırı.** Ara:

```tsx
import {
    MarketField,
    RiskCostFields,
    BirimMaliyetField,
    type MarketFieldProps,
    type RiskCostProps,
    type BirimMaliyetFieldProps,
} from '../AdvancedSettingsSections';
```

Yeni:

```tsx
import {
    MarketField,
    RiskCostFields,
    type MarketFieldProps,
    type RiskCostProps,
} from '../AdvancedSettingsSections';
```

**3b. Prop tipi.** Ara:

```tsx
export type GelismisAyarlarSheetProps =
    & RiskCostProps
    & MarketFieldProps
    & BirimMaliyetFieldProps
    & {
```

Yeni:

```tsx
export type GelismisAyarlarSheetProps =
    & RiskCostProps
    & MarketFieldProps
    & {
```

**3c. "Piyasa fiyatı" bölümü.** Ara:

```tsx
                <section
                    ref={piyasaRef}
                    className={styles.ayarBolum}
                    role="group"
                    aria-label="Piyasa fiyatı"
                    data-acilis={bolum('piyasa')}
                >
                    <BirimMaliyetField
                        globalUnitPrice={alanlar.globalUnitPrice}
                        birimMaliyetKaynagi={alanlar.birimMaliyetKaynagi}
                        onBirimMaliyet={alanlar.onBirimMaliyet}
                    />
                    <MarketField
                        manualMarketPrice={alanlar.manualMarketPrice}
                        setManualMarketPrice={alanlar.setManualMarketPrice}
                    />
                </section>
```

Yeni:

```tsx
                <section
                    ref={piyasaRef}
                    className={styles.ayarBolum}
                    role="group"
                    aria-label="Piyasa karşılaştırması"
                    data-acilis={bolum('piyasa')}
                >
                    <MarketField
                        manualMarketPrice={alanlar.manualMarketPrice}
                        setManualMarketPrice={alanlar.setManualMarketPrice}
                    />
                </section>
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx tsc --noEmit && npx jest --no-coverage src/app/hesapla/mobile/GelismisAyarlarSheet.test.tsx`
Expected: 0 tsc hatası (bu adımdan sonra `page.tsx`'in Task 5'e kadar hâlâ
eski prop'ları geçmesi YENİ bir tip hatası doğurur — bu BEKLENEN bir ara
durumdur, Task 5'te kapanır; bu task'ın kendi test dosyası ve kendi
komponenti izole çalıştırıldığında hatasız). Tüm testler PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/hesapla/mobile/GelismisAyarlarSheet.tsx src/app/hesapla/mobile/GelismisAyarlarSheet.test.tsx
git commit -m "feat(hesapla-mobil): Birim Maliyet Gelismis Ayarlar'dan kalkar, Piyasa bolumu yeniden adlandirilir"
```

---

### Task 5: `page.tsx` — prop akışını bağla

**Files:**
- Modify: `src/app/hesapla/page.tsx`

**Interfaces:**
- Consumes: Task 3'ün genişlemiş `GirdiKartiProps`'u, Task 4'ün daralmış
  `GelismisAyarlarSheetProps`'u.
- Produces: yok (bu, zincirin son entegrasyon adımı — tüm önceki task'ların
  arayüzlerini gerçek çalışan uygulamaya bağlar).

**Not:** Bu task'tan ÖNCE (Task 1-4 tamamlandıktan, Task 5 başlamadan)
`npx tsc --noEmit` GERÇEKTEN İKİ hata verir: `girdi={{...}}` nesnesi
`GirdiKartiProps`'un yeni zorunlu üç alanını içermiyor, VE
`<GelismisAyarlarSheet>` çağrısı artık var olmayan üç prop'u geçiyor. Bu
BEKLENEN bir ara durumdur — Task 5 ikisini birden kapatır.

- [ ] **Step 1: Confirm the expected pre-fix tsc errors**

Run: `npx tsc --noEmit`
Expected: `page.tsx`'te iki hata — (1) `girdi={{...}}` nesnesinde eksik
`globalUnitPrice`/`birimMaliyetKaynagi`/`onBirimMaliyet` alanları, (2)
`<GelismisAyarlarSheet>` çağrısında fazladan `globalUnitPrice`/
`birimMaliyetKaynagi`/`onBirimMaliyet` prop'ları. Bu adım TDD'nin "RED"
aşamasının bu task için karşılığı — birim testi yerine tip kontrolü kullanılıyor,
çünkü değişikliğin kendisi salt prop-akışı (davranış testi Task 3/4'te zaten
yazıldı).

- [ ] **Step 2: Write minimal implementation**

**2a. `girdi={{...}}` nesnesine üç alan eklenir.** Ara
(`page.tsx:549-565` civarı):

```tsx
          girdi={{
            parcelContext,
            arsaAlani, onArsaAlani: setArsaAlani,
            isAaEnabled,
            onIsAaEnabled: setIsAaEnabled,
            riskLevel,
            riskLevels,
            onRiskLevel: handleRiskLevel,
            riskKaynagi,
            onParselDogrulaAc: () => setIsParcelModalOpen(true),
            luxLevel, onLuxLevel: setLuxLevel,
            apartmentSize, onApartmentSize: handleApartmentSizeChange,
            landShareRatio, onLandShareRatio: setLandShareRatio,
            isApartmentCountEnabled, onApartmentCountEnabled: setIsApartmentCountEnabled,
            totalApartments, onTotalApartments: setTotalApartments,
            ownerApartmentShare, onOwnerApartmentShare: setOwnerApartmentShare,
          }}
```

Yeni:

```tsx
          girdi={{
            parcelContext,
            arsaAlani, onArsaAlani: setArsaAlani,
            isAaEnabled,
            onIsAaEnabled: setIsAaEnabled,
            riskLevel,
            riskLevels,
            onRiskLevel: handleRiskLevel,
            riskKaynagi,
            onParselDogrulaAc: () => setIsParcelModalOpen(true),
            luxLevel, onLuxLevel: setLuxLevel,
            apartmentSize, onApartmentSize: handleApartmentSizeChange,
            globalUnitPrice, birimMaliyetKaynagi, onBirimMaliyet: handleGlobalUnitPriceChange,
            landShareRatio, onLandShareRatio: setLandShareRatio,
            isApartmentCountEnabled, onApartmentCountEnabled: setIsApartmentCountEnabled,
            totalApartments, onTotalApartments: setTotalApartments,
            ownerApartmentShare, onOwnerApartmentShare: setOwnerApartmentShare,
          }}
```

**2b. `<GelismisAyarlarSheet>` çağrısından üç prop kalkar.** Ara
(`page.tsx:605-608` civarı):

```tsx
          acilisBolumu={mobilAyarBolumu}
          globalUnitPrice={globalUnitPrice}
          birimMaliyetKaynagi={birimMaliyetKaynagi}
          onBirimMaliyet={handleGlobalUnitPriceChange}
          iksaMode={iksaMode} setIksaMode={setIksaMode}
```

Yeni:

```tsx
          acilisBolumu={mobilAyarBolumu}
          iksaMode={iksaMode} setIksaMode={setIksaMode}
```

(Masaüstü `<BirimMaliyetField>` çağrısı — `page.tsx:712-720` civarı, desktop
sidebar içinde — bu task'ta DOKUNULMUYOR, `globalUnitPrice`/
`birimMaliyetKaynagi`/`handleGlobalUnitPriceChange`'i orada ayrıca kullanmaya
devam ediyor.)

- [ ] **Step 3: Run full verification**

Run: `npx tsc --noEmit`
Expected: 0 hata (her iki ara-durum hatası da kapandı).

Run: `npx jest --no-coverage --roots "src"`
Expected: tüm suite yeşil — Task 1-4'ün testleri dahil, hiçbir mevcut test
kırılmamış.

- [ ] **Step 4: Commit**

```bash
git add src/app/hesapla/page.tsx
git commit -m "feat(hesapla): girdi karti + Gelismis Ayarlar prop akisi page.tsx'e baglanir"
```

---

## Final Doğrulama (tüm task'lar bittikten sonra)

- [ ] **tsc:** `npx tsc --noEmit` — 0 hata.
- [ ] **Tam jest suite:** `npx jest --no-coverage --roots "src"` — tüm suite
  yeşil (yeni testler dahil, hiçbir mevcut test kırılmamış — özellikle
  `SmartContextCard.test.tsx`'in 10 testi ve `AdvancedSettingsSections.test.tsx`'teki
  5 `BirimMaliyetField` testi).
- [ ] **Canlı doğrulama (Playwright, mobil viewport 390×844, gerçek mobil UA
  — dev sunucu veya `https://www.arsabil.com/hesapla`):**
  1. Ana kartın yeni sırasının (Konum→Arsa Alanı→Yapı Standardı→Daire
     Büyüklüğü→Birim İnşaat Maliyeti→Arsa Payı→Deprem Riski) göründüğünü
     doğrula.
  2. Birim İnşaat Maliyeti alanının Liquid Glass stilinde (masaüstü
     `page.module.css` DEĞİL, `mobile.module.css`'in `--m-*` token'ları)
     render olduğunu `getComputedStyle` ile doğrula.
  3. Birim İnşaat Maliyeti'ne elle bir değer yazıp "Min. Daire Fiyatı"
     sonucunun doğru güncellendiğini doğrula.
  4. "Gelişmiş Ayarlar"ı aç: Birim Maliyet'in ARTIK orada olmadığını, İksa
     Masrafı'nın Müteahhit Kazancı'ndan ÖNCE göründüğünü doğrula.
  5. **Masaüstü genişlikte (>768px):** `SmartContextCard`'ın (konum→risk→alan
     sırası), desktop sidebar'daki `BirimMaliyetField`'ın ve "Piyasa
     Analizi"/"Maliyet ve Riskler" bölümlerinin BİREBİR ÖNCEKİ GİBİ kaldığını
     doğrula — bu planın en kritik regresyon riski.
  6. Doğrulama sonrası `git push origin main` + Coolify redeploy tetikle (bu
     oturumda kurulan akış: geçici API token üret → `GET /api/v1/deploy?uuid=g1478ljmts8umt4xvf0wyugv` →
     deploy `finished` olana kadar bekle → yeni commit'in deploy edildiğini
     doğrula → token'ı sil).
