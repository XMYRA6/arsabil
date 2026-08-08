# Mobil Senaryo Karşılaştırma Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mobil `/hesapla`'ya, masaüstünde zaten var olan senaryo kaydetme/karşılaştırma özelliğini (en fazla 3
senaryo, kaldırılabilir pill'ler, PDF/paylaşım) kanıtlanmış "yaprak" desenini kullanarak eklemek — backend/state
modeli değişmeden, yalnızca UI wiring.

**Architecture:** Sabit CTA çubuğuna ikincil bir "+ Karşılaştır" butonu; ana akışın sonunda kaldırılabilir
pill'ler + 2+ senaryoda bir "Karşılaştır (N) ›" çipi; bu çip yeni bir `SenaryoKarsilastirmaSekmesi` yaprağını
açar (mevcut `AnalizSekmesi`/`FiyatAciklamasi` deseniyle birebir aynı: başlık + "Kapat"). Yaprak, masaüstünün
zaten mobil-uyumlu (`@media` ile) `ScenarioCompare` bileşenini HİÇ DEĞİŞTİRMEDEN render eder. Tüm state
(`savedScenarios`, `handleAddScenario`, `handleRemoveScenario`) `page.tsx`'te zaten var — yalnızca prop olarak
akıtılıyor.

**Tech Stack:** Next.js 16 App Router, React, TypeScript, Jest + Testing Library, mevcut `--m-*` "Premium
Liquid Glass" CSS token seti (`mobile.module.css`).

## Global Constraints

- Spec: `docs/superpowers/specs/2026-08-08-mobil-senaryo-karsilastirma-design.md`.
- `ScenarioCompare.tsx` bileşeninin KENDİSİ değiştirilmiyor — yalnızca `Scenario` interface'i export ediliyor
  (Task 1). Mobil kart görünümü CSS media query ile otomatik gelir, JS/prop değişikliği yok.
- Masaüstündeki `handleAddScenario`/`handleRemoveScenario`/`savedScenarios` state'i `page.tsx`'te DEĞİŞMEDEN
  kalır — yalnızca `<HesaplaMobile>`'a prop olarak geçiliyor.
- "+ Karşılaştır" (CTA çubuğu) disabled koşulu masaüstüyle birebir aynı: `!hasResult || savedScenarios.length >= 3`.
- "Karşılaştır (N) ›" çipi yalnızca `savedScenarios.length >= 2` iken görünür.
- Test komutu: `npx jest --no-coverage --roots "src" <path>`.
- `ScenarioCompare`'ı (doğrudan ya da `SenaryoKarsilastirmaSekmesi` üzerinden dolaylı) render eden HER test
  dosyası `jspdf`/`jspdf-autotable`'ı mock'lamalı (bkz. mevcut `ScenarioCompare.test.tsx` — jsPDF jsdom'da
  canvas/DOM işlemleri yüzünden gerçek haliyle render edilemiyor).

---

## Dosya Yapısı Özeti

| Dosya | İşlem | Sorumluluk |
|---|---|---|
| `src/components/ScenarioCompare.tsx` | Değiştir (1 satır) | `Scenario` interface'i export edilir |
| `src/app/hesapla/mobile/SenaryoKarsilastirmaSekmesi.tsx` | Oluştur | Yeni yaprak: başlık+Kapat + `ScenarioCompare` |
| `src/app/hesapla/mobile/mobile.module.css` | Değiştir | Yeni CSS sınıfları (yaprak gövdesi, pill'ler, çip, ikincil CTA butonu) |
| `src/app/hesapla/mobile/HesaplaMobile.tsx` | Değiştir | Yeni prop'lar, pill satırı, çip, ikincil CTA, yeni üst-seviye dal |
| `src/app/hesapla/page.tsx` | Değiştir | `Scenario` importu, yeni state, paylaşılan `handleShareScenarios`, `<HesaplaMobile>`'a yeni prop'lar |

---

### Task 1: `SenaryoKarsilastirmaSekmesi` — yeni yaprak bileşeni

**Files:**
- Modify: `src/components/ScenarioCompare.tsx:8` (`interface Scenario` → `export interface Scenario`)
- Create: `src/app/hesapla/mobile/SenaryoKarsilastirmaSekmesi.tsx`
- Create: `src/app/hesapla/mobile/SenaryoKarsilastirmaSekmesi.test.tsx`
- Modify: `src/app/hesapla/mobile/mobile.module.css` (yeni `.karsilastirmaGovde` sınıfı, dosya sonuna eklenir)

**Interfaces:**
- Consumes: `ScenarioCompare` bileşeni ve onun (artık export edilen) `Scenario` tipi, ikisi de
  `@/components/ScenarioCompare`'den.
- Produces: `SenaryoKarsilastirmaSekmesiProps = { scenarios: Scenario[]; onKapat: () => void; onShareRequest: (ids: string[]) => Promise<string | null> }`
  — Task 2'nin `HesaplaMobile.tsx`'i bunu tüketir.

- [ ] **Step 1: `Scenario` interface'ini export et**

`src/components/ScenarioCompare.tsx:8`:
```ts
interface Scenario {
```
şu şekilde değiştir:
```ts
export interface Scenario {
```
(Dosyanın geri kalanı DEĞİŞMEZ — `Props` interface'i zaten `Scenario[]` kullanıyor, sadece görünürlük değişiyor.)

- [ ] **Step 2: Write the failing test**

`src/app/hesapla/mobile/SenaryoKarsilastirmaSekmesi.test.tsx`:
```tsx
/** @jest-environment jsdom */
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { SenaryoKarsilastirmaSekmesi } from './SenaryoKarsilastirmaSekmesi'

// ScenarioCompare (bu bilesenin icinde render edilir) jsPDF kullanir —
// jsPDF jsdom'da canvas/DOM islemleri yuzunden gercek haliyle calismaz.
// Bkz. ayni mock ScenarioCompare.test.tsx'te.
jest.mock('jspdf', () => {
    return jest.fn().mockImplementation(() => ({
        setFontSize: jest.fn(),
        text: jest.fn(),
        save: jest.fn(),
    }))
})
jest.mock('jspdf-autotable', () => jest.fn())

const SCENARIOS = [
    { id: 's1', name: 'Ekonomik', luxLevel: 1.0, apartmentSize: 100, landShareRatio: 0.3, totalApartments: 10, riskLevel: 1, builderProfit: 1.2, fdTotal: 4000000, fdPerM2: 40000, mi: 1500000, ma: 1000000, totalCost: 2500000 },
    { id: 's2', name: 'Lüks', luxLevel: 1.4, apartmentSize: 140, landShareRatio: 0.35, totalApartments: 8, riskLevel: 2, builderProfit: 1.3, fdTotal: 6000000, fdPerM2: 42857, mi: 2200000, ma: 1500000, totalCost: 3700000 },
]

describe('SenaryoKarsilastirmaSekmesi', () => {
    it('baslik + Kapat satirini gosterir, Kapat tiklaninca onKapat cagirir', () => {
        const onKapat = jest.fn()
        render(<SenaryoKarsilastirmaSekmesi scenarios={SCENARIOS} onKapat={onKapat} onShareRequest={jest.fn()} />)
        expect(screen.getByRole('heading', { name: 'Senaryo Karşılaştırması' })).toBeInTheDocument()
        fireEvent.click(screen.getByRole('button', { name: 'Kapat' }))
        expect(onKapat).toHaveBeenCalled()
    })

    it('2 senaryoyla ScenarioCompare icerigini render eder', () => {
        render(<SenaryoKarsilastirmaSekmesi scenarios={SCENARIOS} onKapat={jest.fn()} onShareRequest={jest.fn()} />)
        expect(screen.getAllByText('Ekonomik').length).toBeGreaterThan(0)
        expect(screen.getAllByText('Lüks').length).toBeGreaterThan(0)
    })

    it('1 senaryoyla ScenarioComparein kendi bos-durum mesajini gosterir (yaprak ayrica bir mesaj yazmaz)', () => {
        render(<SenaryoKarsilastirmaSekmesi scenarios={[SCENARIOS[0]]} onKapat={jest.fn()} onShareRequest={jest.fn()} />)
        expect(screen.getByText(/en az 2 senaryo gereklidir/i)).toBeInTheDocument()
    })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx jest --no-coverage --roots "src" src/app/hesapla/mobile/SenaryoKarsilastirmaSekmesi.test.tsx`
Expected: FAIL — `Cannot find module './SenaryoKarsilastirmaSekmesi'`

- [ ] **Step 4: Write minimal implementation**

`src/app/hesapla/mobile/SenaryoKarsilastirmaSekmesi.tsx`:
```tsx
"use client";

import { ScenarioCompare, type Scenario } from '@/components/ScenarioCompare';
import styles from './mobile.module.css';

export type SenaryoKarsilastirmaSekmesiProps = {
    scenarios: Scenario[];
    /** Derinlestirme yapragini kapatir — AnalizSekmesi/FiyatAciklamasi ile ayni desen. */
    onKapat: () => void;
    onShareRequest: (ids: string[]) => Promise<string | null>;
};

/**
 * Senaryo karsilastirma derinlestirme yapragi. `ScenarioCompare` HIC
 * DEGISTIRILMEDEN render edilir — mobil kart gorunumu zaten CSS media
 * query ile (bkz. ScenarioCompare.module.css:140) otomatik devreye girer.
 * Bu yaprak yalnizca baslik+Kapat cercevesini saglar (`AnalizSekmesi`/
 * `FiyatAciklamasi` ile AYNI desen — kapatma affordance'i bilesenin
 * kendisinde yasar).
 */
export function SenaryoKarsilastirmaSekmesi({ scenarios, onKapat, onShareRequest }: SenaryoKarsilastirmaSekmesiProps) {
    return (
        <>
            <header className={styles.analizKapatSatiri}>
                <h2 className={styles.aciklamaBaslikMetin}>Senaryo Karşılaştırması</h2>
                <button type="button" className={styles.aciklamaKapat} onClick={onKapat}>
                    Kapat
                </button>
            </header>
            <div className={styles.karsilastirmaGovde}>
                <ScenarioCompare scenarios={scenarios} onShareRequest={onShareRequest} />
            </div>
        </>
    );
}
```

`src/app/hesapla/mobile/mobile.module.css`'in `@media (max-width: 768px) { ... }` bloğunun İÇİNE (dosyanın
geri kalanıyla aynı yere, ör. `.analizGovde` kuralının hemen altına) ekle:
```css
    .karsilastirmaGovde {
        margin: 14px 14px 24px;
    }
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx jest --no-coverage --roots "src" src/app/hesapla/mobile/SenaryoKarsilastirmaSekmesi.test.tsx`
Expected: PASS (3 test)

- [ ] **Step 6: Commit**

```bash
git add src/components/ScenarioCompare.tsx src/app/hesapla/mobile/SenaryoKarsilastirmaSekmesi.tsx src/app/hesapla/mobile/SenaryoKarsilastirmaSekmesi.test.tsx src/app/hesapla/mobile/mobile.module.css
git commit -m "feat(hesapla-mobil): senaryo karsilastirma yapragi (SenaryoKarsilastirmaSekmesi)"
```

---

### Task 2: `HesaplaMobile` — pill'ler, "Karşılaştır" çipi, ikincil CTA, yeni dal

**Files:**
- Modify: `src/app/hesapla/mobile/HesaplaMobile.tsx`
- Modify: `src/app/hesapla/mobile/HesaplaMobile.test.tsx`
- Modify: `src/app/hesapla/mobile/mobile.module.css`

**Interfaces:**
- Consumes: Task 1'in `SenaryoKarsilastirmaSekmesi` bileşeni ve `Scenario` tipi (`@/components/ScenarioCompare`).
- Produces: `HesaplaMobileProps`'a eklenen yeni alanlar — Task 3'ün `page.tsx`'i bunları tüketir:
  `savedScenarios: Scenario[]`, `onAddScenario: () => void`, `onRemoveScenario: (id: string) => void`,
  `hasResult: boolean`, `karsilastirmaAcik: boolean`, `onKarsilastirmaAc: () => void`,
  `onKarsilastirmaKapat: () => void`, `onShareRequest: (ids: string[]) => Promise<string | null>`.

- [ ] **Step 1: Write the failing tests**

`HesaplaMobile.test.tsx`'in en üstüne (diğer importlarla) ekle:
```tsx
import type { Scenario } from '@/components/ScenarioCompare'
```
`jest.mock('./AnalizSekmesi', ...)` bloğunun altına ekle (ScenarioCompare artık dolaylı olarak render
edilebiliyor — jsPDF mock'u gerekiyor):
```tsx
jest.mock('jspdf', () => {
    return jest.fn().mockImplementation(() => ({
        setFontSize: jest.fn(),
        text: jest.fn(),
        save: jest.fn(),
    }))
})
jest.mock('jspdf-autotable', () => jest.fn())
```
Dosyanın `BASE_INPUT` sabitinin altına, senaryo fixture'larını ekle:
```tsx
const SCENARIO_1: Scenario = { id: 'sc1', name: 'Senaryo 1', luxLevel: 1.2, apartmentSize: 140, landShareRatio: 0.33, totalApartments: 20, riskLevel: 1.1, builderProfit: 1.3, fdTotal: 8964000, fdPerM2: 64028, mi: 3000000, ma: 2000000, totalCost: 5000000 }
const SCENARIO_2: Scenario = { ...SCENARIO_1, id: 'sc2', name: 'Senaryo 2', fdTotal: 9500000 }
const SCENARIO_3: Scenario = { ...SCENARIO_1, id: 'sc3', name: 'Senaryo 3', fdTotal: 8000000 }
```
`props()` fonksiyonundaki dönen nesneye (`...patch`'ten ÖNCE, diğer alanlarla birlikte) ekle:
```ts
        savedScenarios: [],
        onAddScenario: jest.fn(),
        onRemoveScenario: jest.fn(),
        hasResult: false,
        karsilastirmaAcik: false,
        onKarsilastirmaAc: jest.fn(),
        onKarsilastirmaKapat: jest.fn(),
        onShareRequest: jest.fn(),
```
`import` satırını `fireEvent` içerecek şekilde güncelle:
```tsx
import { render, screen, within, fireEvent } from '@testing-library/react'
```
Dosyanın sonuna (mevcut son `it` bloğundan sonra, `describe` kapanışından önce) ekle:
```tsx
    it('savedScenarios bosken pill satiri ve Karsilastir cipi gorunmez', () => {
        render(<HesaplaMobile {...props({ savedScenarios: [] })} />)
        expect(screen.queryByText(/Karşılaştır \(/)).toBeNull()
    })

    it('1 senaryo kaydedilince pill gorunur ama Karsilastir cipi henuz gorunmez (2 esigi)', () => {
        render(<HesaplaMobile {...props({ savedScenarios: [SCENARIO_1] })} />)
        expect(screen.getByText('Senaryo 1')).toBeInTheDocument()
        expect(screen.queryByText(/Karşılaştır \(/)).toBeNull()
    })

    it('2+ senaryo kaydedilince Karsilastir cipi gorunur, tiklaninca onKarsilastirmaAc cagirir', () => {
        const onKarsilastirmaAc = jest.fn()
        render(<HesaplaMobile {...props({ savedScenarios: [SCENARIO_1, SCENARIO_2], onKarsilastirmaAc })} />)
        fireEvent.click(screen.getByText(/Karşılaştır \(2\)/))
        expect(onKarsilastirmaAc).toHaveBeenCalled()
    })

    it('bir pill kaldirilinca onRemoveScenario dogru id ile cagirilir', () => {
        const onRemoveScenario = jest.fn()
        render(<HesaplaMobile {...props({ savedScenarios: [SCENARIO_1], onRemoveScenario })} />)
        fireEvent.click(screen.getByLabelText("Senaryo 1'i kaldır"))
        expect(onRemoveScenario).toHaveBeenCalledWith('sc1')
    })

    it('sabit CTA cubugunda "+ Karsilastir" butonu var, hasResult false veya 3 senaryo doluyken devre disi', () => {
        const { rerender } = render(<HesaplaMobile {...props({ hasResult: false, savedScenarios: [] })} />)
        expect(screen.getByRole('button', { name: '+ Karşılaştır' })).toBeDisabled()

        rerender(<HesaplaMobile {...props({ hasResult: true, savedScenarios: [SCENARIO_1, SCENARIO_2, SCENARIO_3] })} />)
        expect(screen.getByRole('button', { name: '+ Karşılaştır' })).toBeDisabled()

        rerender(<HesaplaMobile {...props({ hasResult: true, savedScenarios: [] })} />)
        expect(screen.getByRole('button', { name: '+ Karşılaştır' })).not.toBeDisabled()
    })

    it('"+ Karsilastir" tiklaninca onAddScenario cagirir', () => {
        const onAddScenario = jest.fn()
        render(<HesaplaMobile {...props({ hasResult: true, onAddScenario })} />)
        fireEvent.click(screen.getByRole('button', { name: '+ Karşılaştır' }))
        expect(onAddScenario).toHaveBeenCalled()
    })

    it('karsilastirmaAcik ile SenaryoKarsilastirmaSekmesi render edilir (sonuc karti yerine)', () => {
        render(<HesaplaMobile {...props({ karsilastirmaAcik: true, savedScenarios: [SCENARIO_1, SCENARIO_2] })} />)
        expect(screen.getByRole('heading', { name: 'Senaryo Karşılaştırması' })).toBeInTheDocument()
        expect(screen.queryByText(/Min\. daire fiyatı/)).toBeNull()
    })
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest --no-coverage --roots "src" src/app/hesapla/mobile/HesaplaMobile.test.tsx`
Expected: FAIL — TypeScript/prop-shape hataları ve yeni testler `screen.getByRole('button', { name: '+ Karşılaştır' })` bulamadığı için başarısız olur.

- [ ] **Step 3: Write implementation**

`HesaplaMobile.tsx`'in importlarına ekle:
```tsx
import { SenaryoKarsilastirmaSekmesi } from './SenaryoKarsilastirmaSekmesi';
import type { Scenario } from '@/components/ScenarioCompare';
```

`HesaplaMobileProps`'a ekle (mevcut `onCta: () => void;` satırından hemen sonra):
```tsx
    /** Masaustundeki savedScenarios ile AYNI state, page.tsx'ten prop olarak akar. */
    savedScenarios: Scenario[];
    onAddScenario: () => void;
    onRemoveScenario: (id: string) => void;
    /** `!!result` — sabit CTA cubugundaki "+ Karsilastir" butonunun etkinlik kosulu. */
    hasResult: boolean;
    /** Karsilastirma derinlestirme yapragi acik mi. Durum `page.tsx`te yasar. */
    karsilastirmaAcik: boolean;
    onKarsilastirmaAc: () => void;
    onKarsilastirmaKapat: () => void;
    onShareRequest: (ids: string[]) => Promise<string | null>;
```

Fonksiyon parametrelerine (destructuring) ekle:
```tsx
    savedScenarios,
    onAddScenario,
    onRemoveScenario,
    hasResult,
    karsilastirmaAcik,
    onKarsilastirmaAc,
    onKarsilastirmaKapat,
    onShareRequest,
```

Ana render'daki üst-seviye dallanmayı (`{analizAcik ? <AnalizSekmesi {...analiz} /> : ( ... )}`) şu şekilde
genişlet:
```tsx
                {analizAcik
                    ? <AnalizSekmesi {...analiz} />
                    : karsilastirmaAcik
                    ? <SenaryoKarsilastirmaSekmesi scenarios={savedScenarios} onKapat={onKarsilastirmaKapat} onShareRequest={onShareRequest} />
                    : (
                        <>
                            <SonucKarti {...sonuc} />
                            {fisAcik
                                ? <FiyatAciklamasi {...fiyatAciklamasi} />
                                : (
                                    <>
                                        <GirdiKarti {...girdi} onParselDogrulaAc={onParselDogrulaAc} />
                                        <button
                                            type="button"
                                            className={styles.gelismisAyarlarBtn}
                                            onClick={onAyarlarAc}
                                        >
                                            <span className={styles.gelismisAyarlarIkon}>
                                                <IconSettings size={16} strokeWidth={2.2} />
                                            </span>
                                            Gelişmiş ayarlar · risk, iksa, kâr
                                        </button>
                                        {savedScenarios.length > 0 && (
                                            <div className={styles.senaryoPillSatiri}>
                                                {savedScenarios.map(s => (
                                                    <span key={s.id} className={styles.senaryoPill}>
                                                        {s.name}
                                                        <button
                                                            type="button"
                                                            onClick={() => onRemoveScenario(s.id)}
                                                            aria-label={`${s.name}'i kaldır`}
                                                            className={styles.senaryoPillKaldir}
                                                        >×</button>
                                                    </span>
                                                ))}
                                                {savedScenarios.length >= 2 && (
                                                    <button
                                                        type="button"
                                                        className={styles.senaryoKarsilastirCip}
                                                        onClick={onKarsilastirmaAc}
                                                    >
                                                        Karşılaştır ({savedScenarios.length}) ›
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </>
                                )}
                        </>
                    )}
```
(Yalnızca `SonucKarti`/`fisAcik` dalının İÇİ ve dıştaki ternary değişiyor — `MobileScreen`/`hesaplaMobilKok`/
`header` sarmalayıcıları AYNEN kalır.)

`StickyActionBar` içindeki tek butonu iki butona çıkar:
```tsx
        <StickyActionBar aboveBottomNav>
            <button
                type="button"
                className={styles.mobilCta}
                onClick={onCta}
                disabled={ctaDevreDisi}
            >
                {ctaMetni}
            </button>
            <button
                type="button"
                className={styles.mobilKarsilastirBtn}
                onClick={onAddScenario}
                disabled={!hasResult || savedScenarios.length >= 3}
                title={savedScenarios.length >= 3 ? 'Maksimum 3 senaryo' : undefined}
            >
                + Karşılaştır
            </button>
        </StickyActionBar>
```

`mobile.module.css`'in `@media (max-width: 768px) { ... }` bloğu içinde, mevcut `.mobilCta { ... }` kuralına
`flex: 1;` ekle (StickyActionBar iki butonlu olunca birincil CTA'nın alanını korumasi için — bkz. spec'in CSS
notu):
```css
    .mobilCta {
        position: relative;
        overflow: hidden;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        flex: 1;
        min-height: 48px;
        border: 0;
        border-radius: var(--m-r-btn);
        background: var(--m-grad-btn);
        box-shadow: var(--m-sh-grad-btn);
        color: #fff;
        font: 800 14px Inter, sans-serif;
        cursor: pointer;
    }
```
(Tek değişen satır `flex: 1;` eklenmesi — `width: 100%` kaldırıldı, `flex:1` StickyActionBar'ın `.bar > * { flex:1 }`
varsayılanıyla ZATEN aynı davranışı üretirdi ama YENİ ikincil butonun `flex:0 0 auto` ile bu varsayılanı
override etmesi gerektiği için birincil CTA'nın kendi `flex:1`'i artık AÇIKÇA burada tanımlı olmalı.)

Aynı `@media` bloğu içine, `.mobilCta:disabled { ... }` kuralının altına ekle:
```css
    .mobilKarsilastirBtn {
        flex: 0 0 auto;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0 16px;
        min-height: 48px;
        border-radius: var(--m-r-btn);
        border: 1px solid var(--m-glass-border);
        background: rgba(255, 255, 255, .55);
        backdrop-filter: var(--m-glass-blur);
        -webkit-backdrop-filter: var(--m-glass-blur);
        color: var(--m-on-glass);
        font: 700 13px Inter, sans-serif;
        cursor: pointer;
        white-space: nowrap;
    }

    .mobilKarsilastirBtn:disabled {
        opacity: .5;
        cursor: default;
    }

    .senaryoPillSatiri {
        margin: 12px 14px 0;
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 8px;
    }

    .senaryoPill {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 5px 10px;
        border-radius: 999px;
        background: rgba(255, 255, 255, .55);
        border: 1px solid var(--m-glass-border);
        color: var(--m-ink);
        font: 700 11.5px Inter, sans-serif;
    }

    .senaryoPillKaldir {
        background: none;
        border: none;
        cursor: pointer;
        color: inherit;
        padding: 0;
        line-height: 1;
        font-size: 1rem;
    }

    .senaryoKarsilastirCip {
        display: inline-flex;
        align-items: center;
        padding: 5px 10px;
        border-radius: 999px;
        border: 1px solid var(--m-glass-border);
        background: var(--m-fill);
        color: var(--m-link);
        font: 800 11.5px Inter, sans-serif;
        cursor: pointer;
    }
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest --no-coverage --roots "src" src/app/hesapla/mobile/HesaplaMobile.test.tsx`
Expected: PASS (tüm testler — eskiler + yeni 7)

- [ ] **Step 5: Commit**

```bash
git add src/app/hesapla/mobile/HesaplaMobile.tsx src/app/hesapla/mobile/HesaplaMobile.test.tsx src/app/hesapla/mobile/mobile.module.css
git commit -m "feat(hesapla-mobil): senaryo pill'leri, Karsilastir cipi, ikincil CTA butonu"
```

---

### Task 3: `page.tsx` — state wiring, paylaşılan share-handler

**Files:**
- Modify: `src/app/hesapla/page.tsx`

**Interfaces:**
- Consumes: Task 2'nin genişletilmiş `HesaplaMobileProps`'u.
- Produces: Yok (bu, plan'ın SON entegrasyon adımı — page.tsx dışında başka hiçbir dosya bunu tüketmez).

- [ ] **Step 1: `ScenarioItem` yerel interface'ini kaldır, `Scenario`'yu import et**

`src/app/hesapla/page.tsx:69-85`'teki:
```ts
interface ScenarioItem {
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
```
bloğunu SİL. Dosyanın import bölümüne (`ScenarioCompare` zaten import ediliyor, satırı güncelle):
```ts
import { ScenarioCompare, type Scenario as ScenarioItem } from '@/components/ScenarioCompare';
```
(Mevcut `import { ScenarioCompare } from '@/components/ScenarioCompare';` satırının YERİNE geçer.)
Dosyanın geri kalanında `ScenarioItem` adı DEĞİŞMEDEN kullanılmaya devam eder (`useState<ScenarioItem[]>`,
`handleAddScenario`/`handleRemoveScenario` imzaları) — yalnızca tipin KAYNAĞI değişti.

- [ ] **Step 2: Yeni state ekle**

`src/app/hesapla/page.tsx:102`'deki (`mobilAnalizAcik` tanımının hemen altına) ekle:
```tsx
  // Senaryo karsilastirma derinlestirme yapragi (Task 6/7'nin AnalizSekmesi'yle
  // AYNI desen). savedScenarios/handleAddScenario/handleRemoveScenario zaten
  // var — bu state yalnizca YAPRAGIN acik/kapali gorunumunu tutar.
  const [mobilKarsilastirmaAcik, setMobilKarsilastirmaAcik] = useState<boolean>(false);
```

- [ ] **Step 3: Paylaşılan `handleShareScenarios`'ı çıkar**

`handleRemoveScenario` fonksiyonunun (satır ~391-393) hemen altına ekle:
```tsx
  const handleShareScenarios = async (ids: string[]): Promise<string | null> => {
    const res = await fetch('/api/compare/share', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scenarioIds: ids }),
    });
    if (!res.ok) return null;
    const { token } = await res.json();
    return `${window.location.origin}/compare/${token}`;
  };
```
Masaüstü `actionsSection` içindeki `<ScenarioCompare ... onShareRequest={async (ids) => { ... }}>` inline
fonksiyonunu (satır ~445-455) `onShareRequest={handleShareScenarios}` ile DEĞİŞTİR (davranış birebir aynı,
kod tekrarı kalkar).

- [ ] **Step 4: `<HesaplaMobile>` çağrısına yeni prop'ları ekle**

`src/app/hesapla/page.tsx:521` civarındaki `<HesaplaMobile ... onCta={handleSaveReport} />` çağrısına, `onCta`
satırının hemen altına ekle:
```tsx
          savedScenarios={savedScenarios}
          onAddScenario={handleAddScenario}
          onRemoveScenario={handleRemoveScenario}
          hasResult={!!result}
          karsilastirmaAcik={mobilKarsilastirmaAcik}
          onKarsilastirmaAc={() => setMobilKarsilastirmaAcik(true)}
          onKarsilastirmaKapat={() => setMobilKarsilastirmaAcik(false)}
          onShareRequest={handleShareScenarios}
```

- [ ] **Step 5: Run tsc + full suite**

Run: `npx tsc --noEmit`
Expected: 0 hata (tip uyuşmazlığı varsa `HesaplaMobileProps`'un tüm zorunlu alanlarının geçildiğinden emin ol).

Run: `npx jest --no-coverage --roots "src" src/app/hesapla`
Expected: PASS (mevcut `page.test.tsx` + `mobile/` altındaki tüm testler, hiçbiri kırılmamış).

- [ ] **Step 6: Commit**

```bash
git add src/app/hesapla/page.tsx
git commit -m "feat(hesapla-mobil): page.tsx senaryo state'ini mobil ekrana baglar"
```

---

## Final Doğrulama (tüm task'lar bittikten sonra)

- [ ] **tsc:** `npx tsc --noEmit` — 0 hata.
- [ ] **Tam jest suite:** `npx jest --no-coverage --roots "src"` — tüm suite yeşil (yeni testler dahil, hiçbir
      mevcut test kırılmamış).
- [ ] **Canlı doğrulama (Playwright, mobil viewport 390×844, spec'in "Doğrulama" bölümündeki senaryo):**
  1. `/hesapla` mobilde en az 2 senaryo kaydet ("+ Karşılaştır" sabit CTA butonuyla).
  2. "Karşılaştır (2) ›" çipi görünür, tıklanınca yaprak açılır — kart görünümünde (masaüstü tablo DEĞİL).
  3. "Kapat" ana ekrana döner, pill'ler hâlâ orada.
  4. Bir pill kaldırılır, yaprak tekrar açılınca `ScenarioCompare`'ın "en az 2 senaryo gereklidir" boş-durumu görünür.
  5. Masaüstünde (regresyon kontrolü) "+ Karşılaştır"/pill'ler/tablo davranışı hiç değişmemiş.
