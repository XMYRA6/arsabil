# `/hesapla` Girdi Mimarisi — Implementasyon Planı

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hesabı süren değerleri (birim inşaat maliyeti, piyasa fiyatı, il/ilçe) ekranda görünür ve düzenlenebilir hale getirmek; aynı yaprağa açılan üç kapıyı teke indirmek.

**Architecture:** Konum, birim maliyet ve piyasa fiyatı üç yeni sunum bileşenine ayrılır (`KonumBlogu`, `BirimMaliyetSatiri`, `KarsilastirmaBlogu`); öncelik kuralı saf bir yardımcıya (`unitPriceSource.ts`) çıkarılır ve TDD ile sabitlenir. `page.tsx` tüm state'in tek sahibi olarak kalır. Formül parametreleri gelişmiş ayarlar yaprağından çıkarılır, böylece aynı kontrol iki yerde durmaz.

**Tech Stack:** Next.js 16, React 19, TypeScript, CSS Modules, Jest + RTL, Playwright (canlı doğrulama).

**Spec:** `docs/superpowers/specs/2026-07-29-hesapla-girdi-mimarisi-design.md`

**Başlangıç durumu:** branch `feature/mobil-liquid-glass`, HEAD `7274b1c`. A1 review'ının Critical/Important bulguları kapatıldı (`c797c7f`..`7274b1c`). Baseline: **jest 664/664**, `tsc --noEmit` 0, `eslint src` 12 problem (2 hata/10 uyarı — hepsi bu planın dokunmadığı dosyalarda), `npm run build` başarılı.

## Global Constraints

- **Yalnızca mobil kurallar `@media (max-width: 768px)` içinde.** `≥769px` masaüstü **düzeni** değişmez. (Task 8 masaüstüne kasıtlı iki değişiklik yapar: birim maliyet görünürlüğü ve piyasa fiyatının çekmeceden çıkması — bunlar yerleşim değil veri görünürlüğüdür.)
- **Dokunma hedefi `min-height` YALNIZCA mobil media query içinde.** Dışına konursa masaüstü birkaç px büyür — bu hata daha önce üç kez yaşandı.
- **`src/lib/calculator/engine_v2.ts` DEĞİŞMEZ.**
- **`--seal-*` token'ları silinmez.** Mobil ağaçta kullanılıyorlarsa **yedekli** yazılır (`var(--seal-x, var(--m-y))`) — `.container`a scope'lu oldukları için mobil ağaçta çözülmezler.
- **Emoji kullanılmaz.** İkonlar `@/components/icons`ten.
- **Tüm rakamlar** JetBrains Mono + `font-variant-numeric: tabular-nums` (`.mNum` / `--m-mono`). İstisna: satır içi rozet etiketleri (spec kararı D1).
- **Biçimlendirme:** `new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 })`; **`null` → `'—'`, asla `0`.**
- `prefers-reduced-motion: reduce` altında tüm hareket kapanır.
- Türkçe kullanıcı metinleri ve Türkçe kod yorumları; **commit mesajları ASCII**.
- RTL test dosyaları 1. satırda `/** @jest-environment jsdom */` gerektirir (repo varsayılanı `node`).
- Test komutu: `npx jest --no-coverage`. **`tsc` ve `jest` birlikte koşulur** — bu iş sırasında `tsc`, jest'in kaçırdığı üç hatayı yakaladı.
- Yeni eslint ihlali YOK (baseline 12 ile karşılaştır).

## Dosya Yapısı

| Dosya | Sorumluluk |
|---|---|
| `src/app/hesapla/mobile/unitPriceSource.ts` | **Yeni.** Birim maliyetin kaynağı ve öncelik kuralı — saf fonksiyonlar |
| `src/app/hesapla/mobile/unitPriceSource.test.ts` | **Yeni.** Öncelik kuralının testleri |
| `src/app/hesapla/mobile/KonumBlogu.tsx` | **Yeni.** İl/ilçe + birim maliyet satırı + parsel kademesi tetikleyicisi |
| `src/app/hesapla/mobile/KonumBlogu.test.tsx` | **Yeni.** |
| `src/app/hesapla/mobile/KarsilastirmaBlogu.tsx` | **Yeni.** Piyasa fiyatı + rozet, sonuç kartının altında |
| `src/app/hesapla/mobile/KarsilastirmaBlogu.test.tsx` | **Yeni.** |
| `src/app/hesapla/mobile/SonucKarti.tsx` | Karşılaştırma bloğu + "Analiz" satırı eklenir |
| `src/app/hesapla/mobile/GirdiKarti.tsx` | `KonumBlogu`u en üstte barındırır |
| `src/app/hesapla/mobile/HesaplaMobile.tsx` | Sekme şeridi ve dişli kalkar; Analiz drill-down olur |
| `src/app/hesapla/mobile/AnalizSekmesi.tsx` | Drill-down görünümü + `FinancialDashboard` |
| `src/app/hesapla/mobile/GelismisAyarlarSheet.tsx` | Formül parametreleri çıkar, arsa alanı kalır |
| `src/app/hesapla/AdvancedSettingsSections.tsx` | `FormulParamsFields` ikiye ayrılır: `ArsaAlaniFields` + `DaireSayisiFields` |
| `src/app/hesapla/page.tsx` | State ve öncelik kuralı bağlaması |
| `src/app/hesapla/mobile/mobile.module.css` | Yeni blokların stilleri |
| `src/app/dashboard/reports/page.tsx` | PDF indirme eklenir |

---

### Task 1: Birim maliyet kaynağı ve öncelik kuralı

**Files:**
- Create: `src/app/hesapla/mobile/unitPriceSource.ts`
- Test: `src/app/hesapla/mobile/unitPriceSource.test.ts`

**Interfaces:**
- Consumes: —
- Produces:
  ```ts
  export type BirimMaliyetKaynagi =
      | { tur: 'varsayilan' }
      | { tur: 'ilce'; ilce: string }
      | { tur: 'elle' }
  export function kaynakEtiketi(kaynak: BirimMaliyetKaynagi, deger: number): string
  export function ilceSecildi(entry: { ilce: string; avgUnitConstructionPrice: number; avgSalesPricePerM2: number }, apartmentSize: number): { birimMaliyet: number; piyasaFiyati: string; kaynak: BirimMaliyetKaynagi }
  export function konumTemizlendi(varsayilanBirimMaliyet: number): { birimMaliyet: number; kaynak: BirimMaliyetKaynagi }
  ```

- [ ] **Step 1: Başarısız testi yaz**

`src/app/hesapla/mobile/unitPriceSource.test.ts`:

```ts
import { ilceSecildi, kaynakEtiketi, konumTemizlendi } from './unitPriceSource'

const KADIKOY = { ilce: 'Kadıköy', avgUnitConstructionPrice: 12000, avgSalesPricePerM2: 41000 }

describe('kaynakEtiketi', () => {
    it('ilceden gelen degerin kaynagini soyler', () => {
        expect(kaynakEtiketi({ tur: 'ilce', ilce: 'Kadıköy' }, 12000))
            .toBe('Kadıköy ortalaması 12.000 TL/m²')
    })

    it('elle girilen degeri boyle isaretler', () => {
        expect(kaynakEtiketi({ tur: 'elle' }, 14500)).toBe('Elle girildi · 14.500 TL/m²')
    })

    it('varsayilan degeri boyle isaretler', () => {
        expect(kaynakEtiketi({ tur: 'varsayilan' }, 12000))
            .toBe('Varsayılan 12.000 TL/m²')
    })

    it('rakamlari ondalik basmaz', () => {
        expect(kaynakEtiketi({ tur: 'elle' }, 14500.7)).toBe('Elle girildi · 14.501 TL/m²')
    })
})

describe('ilceSecildi', () => {
    it('birim maliyeti ve piyasa fiyatini birlikte doldurur', () => {
        // Spec 4: ilce secimi IKI degeri birden ayarlar.
        const r = ilceSecildi(KADIKOY, 140)
        expect(r.birimMaliyet).toBe(12000)
        expect(r.piyasaFiyati).toBe('5.740.000') // 41000 * 140
        expect(r.kaynak).toEqual({ tur: 'ilce', ilce: 'Kadıköy' })
    })

    it('piyasa fiyatini Turkce bicimde ve tam sayi olarak verir', () => {
        const r = ilceSecildi({ ...KADIKOY, avgSalesPricePerM2: 41333.4 }, 140)
        expect(r.piyasaFiyati).toBe('5.786.676')
    })
})

describe('konumTemizlendi', () => {
    it('yonetici varsayilanina doner', () => {
        const r = konumTemizlendi(11000)
        expect(r.birimMaliyet).toBe(11000)
        expect(r.kaynak).toEqual({ tur: 'varsayilan' })
    })
})
```

- [ ] **Step 2: Testin başarısız olduğunu doğrula**

Run: `npx jest src/app/hesapla/mobile/unitPriceSource --no-coverage`
Expected: FAIL — `Cannot find module './unitPriceSource'`

- [ ] **Step 3: Yardımcıları yaz**

`src/app/hesapla/mobile/unitPriceSource.ts`:

```ts
/**
 * Birim insaat maliyetinin KAYNAGI ve oncelik kurali.
 *
 * Bu deger motora `P` olarak gider, yani hesabi suren asil sayidir. Onceden
 * hicbir ekrani yoktu ve ilce secilince sessizce degisiyordu; kullanici
 * "hangi fiyattan hesapliyor bilmiyorum" diyordu (spec 1).
 */

const trFormat = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 })

export type BirimMaliyetKaynagi =
    | { tur: 'varsayilan' }
    | { tur: 'ilce'; ilce: string }
    | { tur: 'elle' }

export type IlceFiyatGirdisi = {
    ilce: string
    avgUnitConstructionPrice: number
    avgSalesPricePerM2: number
}

/** Ekranda birim maliyetin altinda gosterilen kaynak metni. */
export function kaynakEtiketi(kaynak: BirimMaliyetKaynagi, deger: number): string {
    const bicimli = `${trFormat.format(deger)} TL/m²`
    switch (kaynak.tur) {
        case 'ilce':
            return `${kaynak.ilce} ortalaması ${bicimli}`
        case 'elle':
            return `Elle girildi · ${bicimli}`
        default:
            return `Varsayılan ${bicimli}`
    }
}

/**
 * Ilce secildiginde IKI deger birden dolar. Elle girilmis bir deger varsa
 * KORUNMAZ: ongorulebilirlik akilliliga tercih edildi (spec 4) — aksi halde
 * kullanici ilceyi degistirip fiyatin neden degismedigini anlayamaz.
 */
export function ilceSecildi(
    entry: IlceFiyatGirdisi,
    apartmentSize: number,
): { birimMaliyet: number; piyasaFiyati: string; kaynak: BirimMaliyetKaynagi } {
    return {
        birimMaliyet: entry.avgUnitConstructionPrice,
        piyasaFiyati: trFormat.format(Math.round(entry.avgSalesPricePerM2 * apartmentSize)),
        kaynak: { tur: 'ilce', ilce: entry.ilce },
    }
}

/** Konum temizlenince yonetici varsayilanina donulur. */
export function konumTemizlendi(
    varsayilanBirimMaliyet: number,
): { birimMaliyet: number; kaynak: BirimMaliyetKaynagi } {
    return { birimMaliyet: varsayilanBirimMaliyet, kaynak: { tur: 'varsayilan' } }
}
```

- [ ] **Step 4: Testlerin geçtiğini doğrula**

Run: `npx jest src/app/hesapla/mobile/unitPriceSource --no-coverage && npx tsc --noEmit`
Expected: PASS (7 test); tsc 0.

- [ ] **Step 5: Commit**

```bash
git add src/app/hesapla/mobile/unitPriceSource.ts src/app/hesapla/mobile/unitPriceSource.test.ts
git commit -m "feat(hesapla): birim maliyet kaynagi ve oncelik kurali"
```

---

### Task 2: `KonumBlogu` — il/ilçe + birim maliyet + parsel kademesi

**Files:**
- Create: `src/app/hesapla/mobile/KonumBlogu.tsx`
- Test: `src/app/hesapla/mobile/KonumBlogu.test.tsx`
- Modify: `src/app/hesapla/mobile/mobile.module.css`

**Interfaces:**
- Consumes: `BirimMaliyetKaynagi`, `kaynakEtiketi` (Task 1); `LocationSelector` + `DistrictPriceEntry` (`@/components/LocationSelector`)
- Produces:
  ```ts
  export type KonumBloguProps = {
      districtPrices: DistrictPriceEntry[]
      selectedIl: string
      selectedIlce: string
      onIlChange: (il: string) => void
      onIlceChange: (ilce: string) => void
      onClear: () => void
      birimMaliyet: number
      birimMaliyetKaynagi: BirimMaliyetKaynagi
      onBirimMaliyet: (v: number) => void
      /** Parsel kademesi: isteğe bağlı, resmi risk verisi için. */
      parselIsaretli: boolean
      onParselAc: () => void
  }
  ```

**KRİTİK:** İl/ilçe **fiyatları** getirir, parsel pini **yalnızca risk verisini** getirir. İkisi aynı blokta ama farklı kademede; parsel pini fiyatlara dokunmaz (spec K2).

- [ ] **Step 1: Başarısız testi yaz**

`src/app/hesapla/mobile/KonumBlogu.test.tsx`:

```tsx
/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { KonumBlogu } from './KonumBlogu'

const FIYATLAR = [
    { id: '1', il: 'İstanbul', ilce: 'Kadıköy', avgSalesPricePerM2: 41000, avgUnitConstructionPrice: 12000 },
    { id: '2', il: 'İstanbul', ilce: 'Beşiktaş', avgSalesPricePerM2: 62000, avgUnitConstructionPrice: 14000 },
]

function props(patch: Partial<React.ComponentProps<typeof KonumBlogu>> = {}) {
    return {
        districtPrices: FIYATLAR,
        selectedIl: 'İstanbul', selectedIlce: 'Kadıköy',
        onIlChange: jest.fn(), onIlceChange: jest.fn(), onClear: jest.fn(),
        birimMaliyet: 12000,
        birimMaliyetKaynagi: { tur: 'ilce' as const, ilce: 'Kadıköy' },
        onBirimMaliyet: jest.fn(),
        parselIsaretli: false, onParselAc: jest.fn(),
        ...patch,
    }
}

describe('KonumBlogu', () => {
    it('birim maliyeti ve KAYNAGINI gosterir', () => {
        render(<KonumBlogu {...props()} />)
        expect(screen.getByText(/Kadıköy ortalaması 12\.000 TL\/m²/)).toBeInTheDocument()
    })

    it('elle girilen deger kaynak etiketinde belirtilir', () => {
        render(<KonumBlogu {...props({ birimMaliyet: 14500, birimMaliyetKaynagi: { tur: 'elle' } })} />)
        expect(screen.getByText(/Elle girildi · 14\.500 TL\/m²/)).toBeInTheDocument()
    })

    it('degistir butonu birim maliyet girisini acar', async () => {
        render(<KonumBlogu {...props()} />)
        expect(screen.queryByRole('spinbutton', { name: /Birim inşaat maliyeti/ })).toBeNull()
        await userEvent.click(screen.getByRole('button', { name: /Birim maliyeti değiştir/ }))
        expect(screen.getByRole('spinbutton', { name: /Birim inşaat maliyeti/ })).toBeInTheDocument()
    })

    it('girilen deger onBirimMaliyet ile bildirilir', async () => {
        const onBirimMaliyet = jest.fn()
        render(<KonumBlogu {...props({ onBirimMaliyet })} />)
        await userEvent.click(screen.getByRole('button', { name: /Birim maliyeti değiştir/ }))
        const alan = screen.getByRole('spinbutton', { name: /Birim inşaat maliyeti/ })
        await userEvent.clear(alan)
        await userEvent.type(alan, '14500')
        await userEvent.tab()
        expect(onBirimMaliyet).toHaveBeenLastCalledWith(14500)
    })

    it('gecersiz giris bildirilmez', async () => {
        const onBirimMaliyet = jest.fn()
        render(<KonumBlogu {...props({ onBirimMaliyet })} />)
        await userEvent.click(screen.getByRole('button', { name: /Birim maliyeti değiştir/ }))
        const alan = screen.getByRole('spinbutton', { name: /Birim inşaat maliyeti/ })
        await userEvent.clear(alan)
        await userEvent.tab()
        expect(onBirimMaliyet).not.toHaveBeenCalled()
    })

    it('parsel kademesi ISTEGE BAGLI oldugunu soyler ve tetikler', async () => {
        const onParselAc = jest.fn()
        render(<KonumBlogu {...props({ onParselAc })} />)
        const btn = screen.getByRole('button', { name: /Parseli haritadan işaretle/ })
        expect(btn).toHaveTextContent(/isteğe bağlı/i)
        await userEvent.click(btn)
        expect(onParselAc).toHaveBeenCalledTimes(1)
    })

    it('parsel isaretliyse durumu bildirir', () => {
        render(<KonumBlogu {...props({ parselIsaretli: true })} />)
        expect(screen.getByText(/Parsel işaretli/)).toBeInTheDocument()
    })

    it('ilce fiyat verisi yoksa secici yerine aciklama gosterir', () => {
        // districtPrices bos gelebilir (yonetici hic ilce fiyati girmemis).
        // Secici bos bir dropdown olarak durmamali.
        render(<KonumBlogu {...props({ districtPrices: [], selectedIl: '', selectedIlce: '' })} />)
        expect(screen.getByText(/İlçe fiyat verisi henüz yok/)).toBeInTheDocument()
    })
})
```

- [ ] **Step 2: Testin başarısız olduğunu doğrula**

Run: `npx jest src/app/hesapla/mobile/KonumBlogu --no-coverage`
Expected: FAIL — `Cannot find module './KonumBlogu'`

- [ ] **Step 3: Bileşeni yaz**

`src/app/hesapla/mobile/KonumBlogu.tsx`:

```tsx
"use client";

import { useState } from 'react';
import { LocationSelector, type DistrictPriceEntry } from '@/components/LocationSelector';
import { IconPin, IconChevronRight, IconCheckCircle } from '@/components/icons';
import { kaynakEtiketi, type BirimMaliyetKaynagi } from './unitPriceSource';
import styles from './mobile.module.css';

export type KonumBloguProps = {
    districtPrices: DistrictPriceEntry[];
    selectedIl: string;
    selectedIlce: string;
    onIlChange: (il: string) => void;
    onIlceChange: (ilce: string) => void;
    onClear: () => void;
    birimMaliyet: number;
    birimMaliyetKaynagi: BirimMaliyetKaynagi;
    onBirimMaliyet: (v: number) => void;
    parselIsaretli: boolean;
    onParselAc: () => void;
};

/**
 * Konum blogu — spec K2: TEK blok, IKI kademe.
 *
 * 1. kademe: il/ilce. FIYATLARI getirir (birim insaat maliyeti + piyasa).
 * 2. kademe: parsel pini. YALNIZCA resmi risk verisini getirir, fiyatlara
 *    DOKUNMAZ. Onceden bu ikisi karisiyordu: baslikaki "Konum sec" cipi
 *    parsel haritasini aciyordu ama o harita il/ilceyi asla degistiremez.
 */
export function KonumBlogu({
    districtPrices,
    selectedIl,
    selectedIlce,
    onIlChange,
    onIlceChange,
    onClear,
    birimMaliyet,
    birimMaliyetKaynagi,
    onBirimMaliyet,
    parselIsaretli,
    onParselAc,
}: KonumBloguProps) {
    const [duzenleniyor, setDuzenleniyor] = useState(false);

    return (
        <div className={styles.konumBlogu}>
            <span className={styles.girdiEtiket}>Konum</span>

            {districtPrices.length > 0 ? (
                <div className={styles.konumSecici}>
                    <LocationSelector
                        districtPrices={districtPrices}
                        selectedIl={selectedIl}
                        selectedIlce={selectedIlce}
                        onIlChange={onIlChange}
                        onIlceChange={onIlceChange}
                        onClear={onClear}
                    />
                </div>
            ) : (
                <p className={styles.konumBosNot}>
                    İlçe fiyat verisi henüz yok. Birim maliyeti aşağıdan elle girebilirsiniz.
                </p>
            )}

            {/* Birim maliyet: ilceden turer ama GORUNUR ve ezilebilir (K1). */}
            <div className={styles.birimMaliyetSatiri}>
                {duzenleniyor ? (
                    <input
                        type="number"
                        className={`${styles.birimMaliyetGiris} mNum`}
                        defaultValue={birimMaliyet}
                        min={0}
                        step={100}
                        autoFocus
                        aria-label="Birim inşaat maliyeti (TL/m²)"
                        onBlur={e => {
                            const v = Number(e.target.value);
                            if (Number.isFinite(v) && v > 0) onBirimMaliyet(v);
                            setDuzenleniyor(false);
                        }}
                    />
                ) : (
                    <>
                        <span className={`${styles.birimMaliyetKaynak} mNum`}>
                            {kaynakEtiketi(birimMaliyetKaynagi, birimMaliyet)}
                        </span>
                        <button
                            type="button"
                            className={styles.birimMaliyetDegistir}
                            aria-label="Birim maliyeti değiştir"
                            onClick={() => setDuzenleniyor(true)}
                        >
                            değiştir
                        </button>
                    </>
                )}
            </div>

            {/* 2. kademe: parsel. Fiyatlara DOKUNMAZ. */}
            <button
                type="button"
                className={styles.parselKademe}
                onClick={onParselAc}
            >
                <span className={styles.parselKademeIkon}>
                    {parselIsaretli ? <IconCheckCircle size={16} /> : <IconPin size={16} />}
                </span>
                {parselIsaretli
                    ? 'Parsel işaretli · resmi risk verisi alındı'
                    : 'Parseli haritadan işaretle — resmi risk (isteğe bağlı)'}
                <IconChevronRight size={15} strokeWidth={2.4} />
            </button>
        </div>
    );
}
```

- [ ] **Step 4: CSS'i yaz**

`src/app/hesapla/mobile/mobile.module.css` — mobil media query'nin **İÇİNE**, girdi kartı bloğundan hemen sonra ekle:

```css
    /* ── Konum blogu (spec K2) ── */
    .konumBlogu {
        display: flex;
        flex-direction: column;
        gap: 7px;
        padding: 11px;
        border-radius: var(--m-r-inner);
        background: var(--m-fill);
    }

    .konumSecici {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
    }

    .konumBosNot {
        margin: 0;
        font: 600 11.5px Inter, sans-serif;
        color: var(--m-body);
    }

    /* Birim maliyet ilcenin ALTINDA ic ice: nedensellik gorunur olsun. */
    .birimMaliyetSatiri {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        min-height: 44px;
        padding-left: 10px;
        border-left: 2px solid rgba(43, 124, 255, .28);
    }

    .birimMaliyetKaynak {
        font-size: 12px;
        font-weight: 700;
        color: var(--m-on-glass);
    }

    .birimMaliyetDegistir {
        position: relative;
        flex: none;
        padding: 0 6px;
        border: 0;
        background: none;
        color: var(--m-link);
        font: 700 11.5px Inter, sans-serif;
        cursor: pointer;
    }

    .birimMaliyetDegistir::after {
        content: '';
        position: absolute;
        left: 0;
        right: 0;
        top: 50%;
        height: var(--touch-target);
        transform: translateY(-50%);
    }

    .birimMaliyetGiris {
        width: 100%;
        min-height: 44px;
        padding: 0 12px;
        border-radius: var(--m-r-input);
        border: 1px solid var(--m-glass-border);
        background: #fff;
        color: var(--m-ink);
        font-size: 16px;
        font-weight: 800;
    }

    .parselKademe {
        display: flex;
        align-items: center;
        gap: 8px;
        width: 100%;
        min-height: 44px;
        padding: 0 10px;
        border-radius: var(--m-r-btn);
        border: 1px dashed rgba(43, 124, 255, .35);
        background: transparent;
        color: var(--m-on-glass);
        font: 600 11.5px Inter, sans-serif;
        text-align: left;
        cursor: pointer;
    }

    .parselKademeIkon {
        display: flex;
        flex: none;
        color: #2b7cff;
    }

    .parselKademe > svg:last-child {
        margin-left: auto;
        flex: none;
    }
```

- [ ] **Step 5: Testlerin geçtiğini doğrula**

```bash
npx jest src/app/hesapla/mobile/KonumBlogu --no-coverage
npx jest src/app/hesapla/mobile/mobileStyles --no-coverage
npx tsc --noEmit
```
Expected: KonumBlogu 8 test PASS; kapsam guard'ı PASS (yeni kurallar mobil media query içinde); tsc 0.

- [ ] **Step 6: Commit**

```bash
git add src/app/hesapla/mobile/KonumBlogu.tsx src/app/hesapla/mobile/KonumBlogu.test.tsx src/app/hesapla/mobile/mobile.module.css
git commit -m "feat(hesapla): konum blogu - il/ilce, gorunur birim maliyet, parsel kademesi"
```

---

### Task 3: `KarsilastirmaBlogu` — piyasa fiyatı sonucun altında

**Files:**
- Create: `src/app/hesapla/mobile/KarsilastirmaBlogu.tsx`
- Test: `src/app/hesapla/mobile/KarsilastirmaBlogu.test.tsx`
- Modify: `src/app/hesapla/mobile/mobile.module.css`

**Interfaces:**
- Consumes: `piyasaFarkiYuzdesi` (`./hesaplaMobileProps`)
- Produces:
  ```ts
  export type KarsilastirmaBloguProps = {
      piyasaFiyati: string            // ham metin, '' = girilmemiş
      onPiyasaFiyati: (v: string) => void
      farkYuzde: number | null        // null → rozet render EDİLMEZ
  }
  ```

**KRİTİK:** Piyasa fiyatı **hesaba girmez**, yalnızca karşılaştırma içindir. Etiket bunu söylemeli. `farkYuzde` `null` iken rozet **elementi** hiç render edilmez (beraberlik ve yuvarlanınca sıfıra düşen farklar dahil — `piyasaFarkiYuzdesi` bunu zaten `null`a çeviriyor).

- [ ] **Step 1: Başarısız testi yaz**

`src/app/hesapla/mobile/KarsilastirmaBlogu.test.tsx`:

```tsx
/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { KarsilastirmaBlogu } from './KarsilastirmaBlogu'

function props(patch = {}) {
    return { piyasaFiyati: '5.740.000', onPiyasaFiyati: jest.fn(), farkYuzde: -14, ...patch }
}

describe('KarsilastirmaBlogu', () => {
    it('piyasa fiyatini gosterir', () => {
        render(<KarsilastirmaBlogu {...props()} />)
        expect(screen.getByDisplayValue('5.740.000')).toBeInTheDocument()
    })

    it('ucuzsa yesil rozet gosterir', () => {
        render(<KarsilastirmaBlogu {...props()} />)
        expect(screen.getByText(/%14 UCUZ/)).toBeInTheDocument()
    })

    it('pahaliysa rozet yon degistirir', () => {
        render(<KarsilastirmaBlogu {...props({ farkYuzde: 9 })} />)
        expect(screen.getByText(/%9 PAHALI/)).toBeInTheDocument()
    })

    it('fark yoksa rozet ELEMENTI render edilmez', () => {
        const { container } = render(<KarsilastirmaBlogu {...props({ farkYuzde: null })} />)
        expect(screen.queryByText(/UCUZ|PAHALI/)).toBeNull()
        expect(container.querySelector('[class*="karsRozet"]')).toBeNull()
    })

    it('piyasa fiyati bosken TESVIK gosterir', () => {
        render(<KarsilastirmaBlogu {...props({ piyasaFiyati: '', farkYuzde: null })} />)
        expect(screen.getByText(/Piyasa fiyatı girin, karşılaştıralım/)).toBeInTheDocument()
    })

    it('bu degerin hesaba GIRMEDIGINI soyler', () => {
        // Kullanici "hangi fiyattan hesapliyor" diye sormustu; bu alan
        // hesabi degil karsilastirmayi besliyor.
        render(<KarsilastirmaBlogu {...props()} />)
        expect(screen.getByLabelText(/Yaklaşık piyasa fiyatı \(yalnızca karşılaştırma\)/))
            .toBeInTheDocument()
    })

    it('girilen deger bildirilir', async () => {
        const onPiyasaFiyati = jest.fn()
        render(<KarsilastirmaBlogu {...props({ onPiyasaFiyati })} />)
        const alan = screen.getByLabelText(/Yaklaşık piyasa fiyatı/)
        await userEvent.clear(alan)
        await userEvent.type(alan, '6000000')
        expect(onPiyasaFiyati).toHaveBeenLastCalledWith('6000000')
    })
})
```

- [ ] **Step 2: Testin başarısız olduğunu doğrula**

Run: `npx jest src/app/hesapla/mobile/KarsilastirmaBlogu --no-coverage`
Expected: FAIL — `Cannot find module './KarsilastirmaBlogu'`

- [ ] **Step 3: Bileşeni yaz**

`src/app/hesapla/mobile/KarsilastirmaBlogu.tsx`:

```tsx
"use client";

import { IconCheckCircle } from '@/components/icons';
import styles from './mobile.module.css';

export type KarsilastirmaBloguProps = {
    piyasaFiyati: string;
    onPiyasaFiyati: (v: string) => void;
    farkYuzde: number | null;
};

/**
 * Sonuc kartinin altindaki karsilastirma blogu (spec K3).
 *
 * Soru nerede doguyorsa cevap orada: kullanici min. daire fiyatini gorur,
 * hemen altinda "piyasaya gore nasil" sorusunu cevaplar.
 *
 * DIKKAT: bu deger hesaba GIRMEZ — yalnizca rozet ve kirilma noktasi
 * grafigini besler. Etiket bunu acikca soyluyor.
 */
export function KarsilastirmaBlogu({
    piyasaFiyati,
    onPiyasaFiyati,
    farkYuzde,
}: KarsilastirmaBloguProps) {
    const ucuz = farkYuzde !== null && farkYuzde < 0;

    return (
        <div className={styles.karsBlok}>
            <label className={styles.karsEtiket}>
                <span className={styles.karsEtiketMetin}>Piyasa</span>
                <input
                    type="text"
                    inputMode="numeric"
                    className={`${styles.karsGiris} mNum`}
                    value={piyasaFiyati}
                    placeholder="—"
                    aria-label="Yaklaşık piyasa fiyatı (yalnızca karşılaştırma)"
                    onChange={e => onPiyasaFiyati(e.target.value)}
                />
            </label>

            {farkYuzde !== null ? (
                <span className={`${styles.karsRozet} ${ucuz ? styles.karsRozetUcuz : styles.karsRozetPahali}`}>
                    <IconCheckCircle size={12} strokeWidth={2.8} />
                    %{Math.abs(farkYuzde)} {ucuz ? 'UCUZ' : 'PAHALI'}
                </span>
            ) : (
                <span className={styles.karsTesvik}>Piyasa fiyatı girin, karşılaştıralım</span>
            )}
        </div>
    );
}
```

- [ ] **Step 4: CSS'i yaz**

`mobile.module.css`, mobil media query İÇİNE:

```css
    /* ── Karsilastirma blogu (spec K3) ── */
    .karsBlok {
        position: relative;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        padding-top: 9px;
        border-top: 1px solid rgba(255, 255, 255, .28);
    }

    .karsEtiket {
        display: flex;
        align-items: center;
        gap: 8px;
        min-width: 0;
    }

    .karsEtiketMetin {
        font: 700 10.5px Inter, sans-serif;
        letter-spacing: .5px;
        text-transform: uppercase;
        color: rgba(255, 255, 255, .82);
    }

    .karsGiris {
        min-width: 0;
        width: 120px;
        min-height: 36px;
        padding: 0 8px;
        border-radius: var(--m-r-chip);
        border: 1px solid rgba(255, 255, 255, .38);
        background: rgba(255, 255, 255, .18);
        color: #fff;
        font-size: 14px;
        font-weight: 800;
    }

    .karsGiris::placeholder {
        color: rgba(255, 255, 255, .55);
    }

    .karsRozet {
        flex: none;
        display: inline-flex;
        align-items: center;
        gap: 5px;
        padding: 6px 10px;
        border-radius: 999px;
        background: rgba(255, 255, 255, .92);
        box-shadow: 0 4px 14px rgba(6, 44, 99, .18);
        font: 800 10.5px Inter, sans-serif;
        white-space: nowrap;
    }

    .karsRozetUcuz {
        color: var(--m-success-text);
    }

    .karsRozetPahali {
        color: var(--m-danger);
    }

    .karsTesvik {
        flex: none;
        font: 600 10.5px Inter, sans-serif;
        color: rgba(255, 255, 255, .82);
        text-align: right;
    }
```

- [ ] **Step 5: Doğrula**

```bash
npx jest src/app/hesapla/mobile/KarsilastirmaBlogu --no-coverage
npx jest src/app/hesapla/mobile/mobileStyles --no-coverage
npx tsc --noEmit
```
Expected: 7 test PASS; kapsam guard'ı PASS; tsc 0.

- [ ] **Step 6: Commit**

```bash
git add src/app/hesapla/mobile/KarsilastirmaBlogu.tsx src/app/hesapla/mobile/KarsilastirmaBlogu.test.tsx src/app/hesapla/mobile/mobile.module.css
git commit -m "feat(hesapla): karsilastirma blogu - piyasa fiyati sonucun altinda"
```

---

### Task 4: `SonucKarti` — karşılaştırma bloğu ve Analiz satırı

**Files:**
- Modify: `src/app/hesapla/mobile/SonucKarti.tsx`
- Modify: `src/app/hesapla/mobile/SonucKarti.test.tsx`
- Modify: `src/app/hesapla/page.tsx` (yalnızca `sonuc={{ ... }}` nesnesi — çağrı yeri)

**Interfaces:**
- Consumes: `KarsilastirmaBlogu` (Task 3)
- Produces: `SonucKartiProps` şu hale gelir:
  ```ts
  export type SonucKartiProps = {
      minDaireFiyati: number | null
      arsaPayiYuzde: number
      birimFiyat: number | null
      karsilastirma: KarsilastirmaBloguProps   // rozet artık burada
      onFisAc: () => void
      onAnalizAc: () => void
  }
  ```
  `piyasaFarkiYuzde` prop'u **kaldırılır** — rozet `karsilastirma.farkYuzde` üzerinden gelir.

- [ ] **Step 1: Testleri güncelle (kırmızıya çevir)**

`SonucKarti.test.tsx` içinde `BASE`'i ve rozet testlerini değiştir:

```tsx
const BASE = {
    minDaireFiyati: 8964000,
    arsaPayiYuzde: 33,
    birimFiyat: 64028,
    karsilastirma: {
        piyasaFiyati: '10.000.000',
        onPiyasaFiyati: jest.fn(),
        farkYuzde: -14,
    },
    onFisAc: jest.fn(),
    onAnalizAc: jest.fn(),
}
```

Rozet testleri `karsilastirma` üzerinden geçer; ayrıca şu iki test eklenir:

```tsx
    it('Analiz satiri onAnalizAc i cagirir', async () => {
        const onAnalizAc = jest.fn()
        render(<SonucKarti {...BASE} onAnalizAc={onAnalizAc} />)
        await userEvent.click(screen.getByRole('button', { name: /Analiz/ }))
        expect(onAnalizAc).toHaveBeenCalledTimes(1)
    })

    it('karsilastirma blogu kart icinde render edilir', () => {
        render(<SonucKarti {...BASE} />)
        expect(screen.getByLabelText(/Yaklaşık piyasa fiyatı/)).toBeInTheDocument()
    })
```

Eski `piyasaFarkiYuzde={9}` / `piyasaFarkiYuzde={null}` çağrıları
`karsilastirma={{ ...BASE.karsilastirma, farkYuzde: 9 }}` biçimine çevrilir.

- [ ] **Step 2: Testin başarısız olduğunu doğrula**

Run: `npx jest src/app/hesapla/mobile/SonucKarti --no-coverage`
Expected: FAIL — `onAnalizAc` yok, `karsilastirma` prop'u tanınmıyor.

- [ ] **Step 3: Bileşeni güncelle**

`SonucKarti.tsx`:
- `piyasaFarkiYuzde` prop'unu ve kart üstündeki rozet JSX'ini **kaldır** (rozet artık karşılaştırma bloğunda).
- Metrikler bloğundan sonra `<KarsilastirmaBlogu {...karsilastirma} />` render et.
- Mevcut "Hesap fişi" butonunun **altına** aynı biçimde ikinci bir satır ekle:

```tsx
            <button type="button" className={styles.fisButonu} onClick={onAnalizAc}>
                Analiz · maliyet dağılımı, hassasiyet, kırılma
                <IconChevronRight size={15} strokeWidth={2.4} />
            </button>
```

- [ ] **Step 4: Çağrı yerini bu task'ta kapat**

`page.tsx`in mobil dalındaki `sonuc={{ ... }}` nesnesinden `piyasaFarkiYuzde`
alanını çıkar, yerine `karsilastirma` ve `onAnalizAc` koy:

```tsx
          sonuc={{
            minDaireFiyati: sonucDegeri(result?.FD_total),
            arsaPayiYuzde: Math.round(effectiveLandShareRatio),
            birimFiyat: sonucDegeri(result?.FD_per_m2),
            karsilastirma: {
              piyasaFiyati: manualMarketPrice,
              onPiyasaFiyati: setManualMarketPrice,
              farkYuzde: piyasaFarkiYuzdesi(result?.FD_total, marketPriceNum),
            },
            onFisAc: () => setMobilFisAcik(true),
            onAnalizAc: () => setMobilAnalizAcik(true),
          }}
```

`const [mobilAnalizAcik, setMobilAnalizAcik] = useState<boolean>(false);` state'ini de
bu task'ta ekle (Task 6 onu kullanacak; burada yalnızca tanımlanır ve `onAnalizAc`
tarafından yazılır).

**Bu task `tsc`yi YEŞİL bırakmalı.** Bir sonraki task'a kırık derleme devretme.

- [ ] **Step 5: Doğrula**

```bash
npx jest --no-coverage
npx tsc --noEmit
```
Expected: tüm testler PASS; tsc 0.

- [ ] **Step 6: Commit**

```bash
git add src/app/hesapla/mobile/SonucKarti.tsx src/app/hesapla/mobile/SonucKarti.test.tsx src/app/hesapla/page.tsx
git commit -m "feat(hesapla): sonuc kartina karsilastirma blogu ve analiz satiri"
```

---

### Task 5: Yapraktan formül parametrelerini çıkar (A1 I4 kapanır)

**Files:**
- Modify: `src/app/hesapla/AdvancedSettingsSections.tsx`
- Modify: `src/app/hesapla/mobile/GelismisAyarlarSheet.tsx`
- Modify: `src/app/hesapla/mobile/GelismisAyarlarSheet.test.tsx`
- Modify: `src/app/hesapla/page.tsx` (yalnızca `GelismisAyarlarSheet` çağrısı)

**Interfaces:**
- Produces: `AdvancedSettingsSections.tsx`ten iki yeni export:
  ```ts
  export interface ArsaAlaniProps { isAaEnabled: boolean; setIsAaEnabled: (v: boolean) => void; arsaAlani: number; setArsaAlani: React.Dispatch<React.SetStateAction<number>> }
  export function ArsaAlaniFields(props: ArsaAlaniProps): JSX.Element
  export interface DaireSayisiProps { isApartmentCountEnabled: boolean; setIsApartmentCountEnabled: (v: boolean) => void; totalApartments: number; setTotalApartments: React.Dispatch<React.SetStateAction<number>>; ownerApartmentShare: number; setOwnerApartmentShare: React.Dispatch<React.SetStateAction<number>> }
  export function DaireSayisiFields(props: DaireSayisiProps): JSX.Element
  ```
  `FormulParamsFields` **korunur** ve bu ikisini sırayla render eder — masaüstü çağrısı hiç değişmez.

**KRİTİK:** Masaüstü `page.tsx:725` `FormulParamsFields`i olduğu gibi kullanmaya devam eder. Bölme yalnızca mobil yaprağın **arsa alanı kısmını** ayrı kullanabilmesi için.

- [ ] **Step 1: Başarısız testi yaz**

`GelismisAyarlarSheet.test.tsx`'e ekle:

```tsx
    it('daire sayisi kontrolleri yaprakta ARTIK YOK (girdi kartina ait)', () => {
        // A1 I4: ayni uc kontrol girdi kartinda ve yaprakta iki kez, farkli
        // etiketlerle duruyordu. Kullanici birini degistirince digeri sessizce
        // yeniden yaziliyordu.
        render(<GelismisAyarlarSheet {...props()} />)
        expect(screen.queryByText('Toplam Daire Sayısı')).toBeNull()
    })

    it('arsa alani yaprakta KALIR', () => {
        render(<GelismisAyarlarSheet {...props()} />)
        expect(screen.getByText(/Arsa Alanı/)).toBeInTheDocument()
    })
```

- [ ] **Step 2: Testin başarısız olduğunu doğrula**

Run: `npx jest src/app/hesapla/mobile/GelismisAyarlarSheet --no-coverage`
Expected: FAIL — "Toplam Daire Sayısı" hâlâ render ediliyor.

- [ ] **Step 3: `FormulParamsFields`i ikiye ayır**

`AdvancedSettingsSections.tsx`: mevcut `FormulParamsFields` gövdesindeki daire-sayısı satırlarını `DaireSayisiFields`e, arsa-alanı satırlarını `ArsaAlaniFields`e taşı. Sonra:

```tsx
/** Drawer "Formül Parametreleri" kartının içeriği (kart sarmalayıcısı hariç). */
export function FormulParamsFields(props: FormulParamsProps) {
  return (
    <>
      <DaireSayisiFields
        isApartmentCountEnabled={props.isApartmentCountEnabled}
        setIsApartmentCountEnabled={props.setIsApartmentCountEnabled}
        totalApartments={props.totalApartments}
        setTotalApartments={props.setTotalApartments}
        ownerApartmentShare={props.ownerApartmentShare}
        setOwnerApartmentShare={props.setOwnerApartmentShare}
      />
      <ArsaAlaniFields
        isAaEnabled={props.isAaEnabled}
        setIsAaEnabled={props.setIsAaEnabled}
        arsaAlani={props.arsaAlani}
        setArsaAlani={props.setArsaAlani}
      />
    </>
  );
}
```

- [ ] **Step 4: Yaprakta yalnızca `ArsaAlaniFields` kullan**

`GelismisAyarlarSheet.tsx`: `FormulParamsFields` importunu `ArsaAlaniFields` ile değiştir; "Formül parametreleri" bölümünün `aria-label`ını `"Arsa alanı"` yap ve yalnızca `ArsaAlaniFields` render et. Prop tipinden `DaireSayisiProps` alanlarını çıkar (`isApartmentCountEnabled`, `setIsApartmentCountEnabled`, `totalApartments`, `setTotalApartments`, `ownerApartmentShare`, `setOwnerApartmentShare`).

Testin `props()` fikstüründen de bu altı alanı çıkar; `role="group"` adı testini `'Arsa alanı'` olarak güncelle.

- [ ] **Step 5: Çağrı yerini bu task'ta kapat**

`page.tsx`teki `<GelismisAyarlarSheet ... />` çağrısından Task 5'in prop tipinden
çıkardığı altı alanı **sil**: `isApartmentCountEnabled`, `setIsApartmentCountEnabled`,
`totalApartments`, `setTotalApartments`, `ownerApartmentShare`, `setOwnerApartmentShare`.
Masaüstü `FormulParamsFields` çağrısına (`page.tsx:725` civarı) **dokunma** — o hiç
değişmiyor.

**Bu task `tsc`yi YEŞİL bırakmalı.**

- [ ] **Step 6: Doğrula**

```bash
npx jest --no-coverage
npx tsc --noEmit
```
Expected: PASS; tsc 0 (masaüstü çağrısı değişmediği için).

- [ ] **Step 7: Commit**

```bash
git add src/app/hesapla/AdvancedSettingsSections.tsx src/app/hesapla/mobile/GelismisAyarlarSheet.tsx src/app/hesapla/mobile/GelismisAyarlarSheet.test.tsx src/app/hesapla/page.tsx
git commit -m "refactor(hesapla): formul parametreleri yapraktan cikti, arsa alani kaldi"
```

---

### Task 6: `HesaplaMobile` ve `page.tsx` bağlaması

**Files:**
- Modify: `src/app/hesapla/mobile/HesaplaMobile.tsx`
- Modify: `src/app/hesapla/mobile/GirdiKarti.tsx`
- Modify: `src/app/hesapla/page.tsx`

**Interfaces:**
- Consumes: `KonumBlogu` (Task 2), `SonucKarti` yeni props (Task 4), `AnalizSekmesi` (Task 7'de güncellenecek — bu task'ta mevcut hâli kullanılır)
- Produces: `HesaplaMobileProps` şu hale gelir — `aktifSekme`/`onSekmeDegis` **kalkar**, yerine `analizAcik`/`onAnalizAc`/`onAnalizKapat` gelir; `onKonumAc` kalkar (konum artık girdi kartında); `konumEtiketi` kalkar.

**KRİTİK — spec K4/K5:** başlıktaki dişli ve konum çipi **kaldırılır**; Hesap/Analiz sekme şeridi (`SekmeSecici` ve `.sekmeKap`) **kaldırılır**. Gelişmiş ayarlara tek kapı: girdi kartının altındaki etiketli buton.

- [ ] **Step 1: `GirdiKarti`ya konum bloğunu ekle**

`GirdiKarti.tsx`: `KonumBloguProps`u prop olarak al (`konum: KonumBloguProps`) ve kartın **en üstünde** `<KonumBlogu {...konum} />` render et. Diğer satırlar değişmez.

`GirdiKarti.test.tsx`'in `props()` fikstürüne `konum` alanını ekle (Task 2'nin test fikstürünü yeniden kullan) ve şu testi ekle:

```tsx
    it('konum blogu kartin EN USTUNDE', () => {
        const { container } = render(<GirdiKarti {...props()} />)
        const ilk = container.querySelector('section')!.firstElementChild!
        expect(ilk.className).toMatch(/konumBlogu/)
    })
```

- [ ] **Step 2: `HesaplaMobile`ı sadeleştir**

- Başlıktaki konum çipi ve dişli butonunu **sil**; başlık `logo + "Hesapla"` kalır.
- `SekmeSecici` importunu ve `.sekmeKap` sarmalayıcısını **sil**.
- `analizAcik` prop'una göre: `true` ise `<AnalizSekmesi {...analiz} />`, aksi halde `SonucKarti` + (`fisAcik ? FiyatAciklamasi : GirdiKarti`) + gelişmiş ayarlar butonu.
- `AnalizSekmesi`nin üstüne "Kapat" satırı ekle (`onAnalizKapat`), `FiyatAciklamasi`nin kapat butonuyla aynı desen.

- [ ] **Step 3: `page.tsx`i bağla**

- Yeni state: `const [birimMaliyetKaynagi, setBirimMaliyetKaynagi] = useState<BirimMaliyetKaynagi>({ tur: 'varsayilan' })`. (`mobilAnalizAcik` Task 4'te eklendi.)
- `mobilSekme` state'ini ve `MobilSekme` importunu **sil**.
- `handleIlceChange`i Task 1'in yardımcısıyla yeniden yaz:

```tsx
  const handleIlceChange = (ilce: string) => {
    setSelectedIlce(ilce);
    const entry = districtPrices.find(d => d.il === selectedIl && d.ilce === ilce);
    if (!entry) return;
    if (originalUnitPrice === null) setOriginalUnitPrice(globalUnitPrice);
    const sonuc = ilceSecildi(entry, apartmentSize);
    setGlobalUnitPrice(sonuc.birimMaliyet);
    setManualMarketPrice(sonuc.piyasaFiyati);
    // Spec 4: elle girilmis bir deger EZILDIYSE kullaniciya soylenir.
    // Sessizce degistirmek, kullanicinin "neden degisti" diye sormasina yol
    // acar. `react-hot-toast` bu dosyada zaten import edili.
    if (birimMaliyetKaynagi.tur === 'elle') {
      toast(`${entry.ilce} ortalamasına güncellendi`);
    }
    setBirimMaliyetKaynagi(sonuc.kaynak);
  };
```

Bu dalı sabitleyen testi `src/app/hesapla/mobile/unitPriceSource.test.ts`e **eklemeyin** —
saf yardımcı `toast` bilmez. Bunun yerine Task 10 Step 2'nin davranış turunda canlı
doğrulanır (elle gir → ilçe değiştir → bildirim görünür).

- `handleIlChange` ve `handleClearLocation` içindeki geri-yükleme dallarına `setBirimMaliyetKaynagi(konumTemizlendi(originalUnitPrice).kaynak)` ekle.
- `sonuc={{ ... }}` nesnesi Task 4'te güncellendi; bu task'ta ona dokunma.
- Mobil dalda `HesaplaMobile`a yeni prop'ları geçir; `konum` nesnesini kur:

```tsx
          konum={{
            districtPrices, selectedIl, selectedIlce,
            onIlChange: handleIlChange,
            onIlceChange: handleIlceChange,
            onClear: handleClearLocation,
            birimMaliyet: globalUnitPrice,
            birimMaliyetKaynagi,
            onBirimMaliyet: (v: number) => {
              setGlobalUnitPrice(v);
              setBirimMaliyetKaynagi({ tur: 'elle' });
            },
            parselIsaretli: parcelValue.lat !== null && parcelValue.lng !== null,
            onParselAc: () => { setMobilAyarBolumu('risk'); setMobilAyarlarAcik(true); },
          }}
          analizAcik={mobilAnalizAcik}
          onAnalizAc={() => setMobilAnalizAcik(true)}
          onAnalizKapat={() => setMobilAnalizAcik(false)}
```

- `GelismisAyarlarSheet` çağrısı Task 5'te güncellendi; bu task'ta ona dokunma.

- [ ] **Step 4: Doğrula**

```bash
npx tsc --noEmit
npx jest --no-coverage
npx eslint src
```
Expected: tsc 0; tüm testler PASS; eslint 12 (baseline).

- [ ] **Step 5: Commit**

```bash
git add src/app/hesapla/mobile/HesaplaMobile.tsx src/app/hesapla/mobile/GirdiKarti.tsx src/app/hesapla/mobile/GirdiKarti.test.tsx src/app/hesapla/page.tsx
git commit -m "feat(hesapla): tek kapi, sekme seridi kalkti, konum girdi kartinda"
```

---

### Task 7: Analiz drill-down + finansal panel

**Files:**
- Modify: `src/app/hesapla/mobile/AnalizSekmesi.tsx`
- Modify: `src/app/hesapla/mobile/Analiz.test.tsx`

**Interfaces:**
- Consumes: `FinancialDashboard` (`@/components/FinancialDashboard`)
- Produces: `AnalizSekmesiProps`a `onKapat: () => void` eklenir. `SekmeSecici` ve `MobilSekme` **kaldırılır** (Task 6 artık kullanmıyor).

**DİKKAT:** `onKapat` zorunlu bir prop olduğu için Task 6'nın `page.tsx`teki
`analiz={{ result, baseInput: chartBaseInput, marketPrice: marketPriceNum }}` çağrısı
bu task'ta **güncellenmelidir**: `onKapat: () => setMobilAnalizAcik(false)` eklenir.
Aksi halde `tsc` kırılır. Bu task, o çağrı yerinin sahibidir.

- [ ] **Step 1: Başarısız testi yaz**

`Analiz.test.tsx`: `SekmeSecici` testlerini **sil**, şunları ekle:

```tsx
    it('finansal ozet de gosterilir', () => {
        render(<AnalizSekmesi result={RESULT} baseInput={BASE_INPUT} marketPrice={10000000} onKapat={jest.fn()} />)
        expect(screen.getByRole('group', { name: 'Finansal özet' })).toBeInTheDocument()
    })

    it('kapat butonu onKapat i cagirir', async () => {
        const onKapat = jest.fn()
        render(<AnalizSekmesi result={RESULT} baseInput={BASE_INPUT} marketPrice={10000000} onKapat={onKapat} />)
        await userEvent.click(screen.getByRole('button', { name: /Kapat/ }))
        expect(onKapat).toHaveBeenCalledTimes(1)
    })
```

`FinancialDashboard`ı mock'la:

```tsx
jest.mock('@/components/FinancialDashboard', () => ({
    FinancialDashboard: () => <div data-testid="financial" />,
}))
```

Ayrıca `CostBreakdownChart` mock'unu prop yakalayacak şekilde güçlendir (A1 minor: prop eşlemesi doğrulanmıyordu):

```tsx
const costProps: Record<string, unknown>[] = []
jest.mock('@/components/charts/CostBreakdownChart', () => ({
    CostBreakdownChart: (p: Record<string, unknown>) => { costProps.push(p); return <div data-testid="cost-breakdown" /> },
}))
```

ve şu testi ekle:

```tsx
    it('maliyet dagilimi proplari motor alanlarindan dogru turetilir', () => {
        costProps.length = 0
        render(<AnalizSekmesi result={RESULT} baseInput={BASE_INPUT} marketPrice={0} onKapat={jest.fn()} />)
        expect(costProps[0]).toEqual({
            constructionCost: RESULT.Mi_base + RESULT.Mz,
            landValue: RESULT.Ma,
            profit: RESULT.FD_total - RESULT.M,
            risk: RESULT.Mi - RESULT.Mi_base - RESULT.Mz,
        })
    })
```

- [ ] **Step 2: Testin başarısız olduğunu doğrula**

Run: `npx jest src/app/hesapla/mobile/Analiz --no-coverage`
Expected: FAIL — `onKapat` yok, "Finansal özet" grubu yok.

- [ ] **Step 3: Bileşeni güncelle**

- `SekmeSecici`, `MobilSekme`, `SEGMENTLER` ve `SegmentedTabs` importunu **sil**.
- En üste kapat satırı ekle (`FiyatAciklamasi`nin `.aciklamaBaslik` desenini yeniden kullan; başlık "Analiz").
- Üç grafik kartından sonra dördüncü kart:

```tsx
            <section className={styles.analizKart} role="group" aria-label="Finansal özet">
                <h3 className={styles.analizBaslik}>Finansal özet</h3>
                <FinancialDashboard totalInvestment={result.M} totalRevenue={result.FD_total} />
            </section>
```

- [ ] **Step 4: Doğrula**

```bash
npx jest src/app/hesapla/mobile --no-coverage
npx tsc --noEmit
```
Expected: PASS; tsc 0.

- [ ] **Step 5: Commit**

```bash
git add src/app/hesapla/mobile/AnalizSekmesi.tsx src/app/hesapla/mobile/Analiz.test.tsx
git commit -m "feat(hesapla): analiz drill-down + finansal ozet"
```

---

### Task 8: Masaüstü — birim maliyet görünür, piyasa fiyatı çekmeceden çıkar

**Files:**
- Modify: `src/app/hesapla/page.tsx`
- Modify: `src/app/hesapla/pageStyles.scope.test.ts`

**KRİTİK:** Bu, spec K7'nin masaüstü tarafı. **Yerleşim yeniden tasarlanmaz** — yalnızca iki değer görünür kılınır.

- [ ] **Step 1: Başarısız testi yaz**

`pageStyles.scope.test.ts`'e ekle:

```ts
describe('birim maliyet ve piyasa fiyati gorunurlugu (spec 2026-07-29 K1/K7)', () => {
  it('masaustunde piyasa fiyati artik cekmece ICINDE DEGIL', () => {
    // K7: ayni sorun iki platformda da vardi; deger dislinin arkasinda
    // kalmamali.
    const pageTsx = fs.readFileSync(path.join(__dirname, 'page.tsx'), 'utf8');
    const cekmeceBas = pageTsx.indexOf('isSettingsSidebarOpen &&');
    const marketField = pageTsx.indexOf('<MarketField');
    expect(marketField).toBeGreaterThan(-1);
    expect(cekmeceBas === -1 || marketField < cekmeceBas).toBe(true);
  });

  it('masaustunde birim maliyet kaynagi ekranda gosterilir', () => {
    const pageTsx = fs.readFileSync(path.join(__dirname, 'page.tsx'), 'utf8');
    expect(pageTsx).toMatch(/kaynakEtiketi\(birimMaliyetKaynagi, globalUnitPrice\)/);
  });
});
```

- [ ] **Step 2: Testin başarısız olduğunu doğrula**

Run: `npx jest src/app/hesapla/pageStyles --no-coverage`
Expected: FAIL — iki assertion da başarısız.

- [ ] **Step 3: `MarketField`i çekmeceden çıkar**

`page.tsx`: `<MarketField ... />` çağrısını ayarlar çekmecesinden alıp `LocationSelector`ın hemen altına, `.desktopSidebar` içine taşı. Çekmecede kalan "Piyasa Analizi" başlığını da birlikte taşı.

- [ ] **Step 4: Birim maliyet satırını masaüstüne ekle**

`LocationSelector`ın altına, `MarketField`ın üstüne:

```tsx
            <div className={styles.drawerRow}>
              <span className={styles.drawerRowLabel}>Birim inşaat maliyeti</span>
              <span>{kaynakEtiketi(birimMaliyetKaynagi, globalUnitPrice)}</span>
              <input
                type="number"
                min={0}
                step={100}
                value={globalUnitPrice}
                aria-label="Birim inşaat maliyeti (TL/m²)"
                onChange={e => {
                  const v = Number(e.target.value);
                  if (Number.isFinite(v) && v > 0) {
                    setGlobalUnitPrice(v);
                    setBirimMaliyetKaynagi({ tur: 'elle' });
                  }
                }}
              />
            </div>
```

- [ ] **Step 5: Doğrula**

```bash
npx jest --no-coverage
npx tsc --noEmit
npx eslint src
```
Expected: PASS; tsc 0; eslint 12.

- [ ] **Step 6: Commit**

```bash
git add src/app/hesapla/page.tsx src/app/hesapla/pageStyles.scope.test.ts
git commit -m "feat(hesapla): masaustunde birim maliyet gorunur, piyasa fiyati cekmeceden cikti"
```

---

### Task 9: Raporlarım'a PDF indirme

**Files:**
- Modify: `src/app/dashboard/reports/page.tsx`
- Test: `src/app/dashboard/reports/__tests__/reportsPdf.test.tsx` (yeni)

**KRİTİK:** Bugün bu sayfada PDF **hiç yok** — üreteç yalnızca `/hesapla`da (`src/lib/pdf/report_generator.ts`). Bu yeni iş (spec K6).

- [ ] **Step 1: Başarısız testi yaz**

`src/app/dashboard/reports/__tests__/reportsPdf.test.tsx`:

```tsx
/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RaporPdfButonu } from '../RaporPdfButonu'

const uret = jest.fn()
jest.mock('@/lib/pdf/report_generator', () => ({ generatePdfReport: (...a: unknown[]) => uret(...a) }))

const RAPOR = { id: 'r1', name: 'Kadıköy Fizibilite', fdTotal: 8964000 }

describe('RaporPdfButonu', () => {
    beforeEach(() => uret.mockReset())

    it('tiklaninca PDF uretecini rapor verisiyle cagirir', async () => {
        render(<RaporPdfButonu rapor={RAPOR} />)
        await userEvent.click(screen.getByRole('button', { name: /PDF indir/ }))
        expect(uret).toHaveBeenCalledTimes(1)
        expect(uret.mock.calls[0][0]).toMatchObject({ name: 'Kadıköy Fizibilite' })
    })

    it('uretim sirasinda buton devre disi ve durum bildiriliyor', async () => {
        let cozumle: () => void = () => {}
        uret.mockImplementation(() => new Promise<void>(r => { cozumle = r }))
        render(<RaporPdfButonu rapor={RAPOR} />)
        const btn = screen.getByRole('button', { name: /PDF indir/ })
        await userEvent.click(btn)
        expect(screen.getByRole('button', { name: /Hazırlanıyor/ })).toBeDisabled()
        cozumle()
    })

    it('hata durumunda buton yeniden kullanilabilir olur', async () => {
        uret.mockRejectedValue(new Error('patladi'))
        render(<RaporPdfButonu rapor={RAPOR} />)
        await userEvent.click(screen.getByRole('button', { name: /PDF indir/ }))
        expect(await screen.findByRole('button', { name: /PDF indir/ })).toBeEnabled()
    })
})
```

- [ ] **Step 2: Testin başarısız olduğunu doğrula**

Run: `npx jest src/app/dashboard/reports --no-coverage`
Expected: FAIL — `Cannot find module '../RaporPdfButonu'`

- [ ] **Step 3: Bileşeni yaz**

`src/app/dashboard/reports/RaporPdfButonu.tsx`:

```tsx
"use client";

import { useState } from 'react';

/** `generatePdfReport`in ilk parametresinin tipi — kaynaktan TURETILIR,
    elle yazilmaz. `as never` gibi bir kacis KULLANILMAZ. */
type Rapor = Parameters<
    typeof import('@/lib/pdf/report_generator').generatePdfReport
>[0];

/**
 * Kayitli bir raporun PDF cikitisi (spec K6).
 *
 * PDF'in kalici yeri rapordur, onu ureten hesaplama ekrani degil. Bu sayfada
 * onceden hic PDF yolu yoktu; uretec yalnizca /hesapla'da cagriliyordu.
 */
export function RaporPdfButonu({ rapor }: { rapor: Rapor }) {
    const [uretiliyor, setUretiliyor] = useState(false);

    const indir = async () => {
        setUretiliyor(true);
        try {
            const { generatePdfReport } = await import('@/lib/pdf/report_generator');
            await generatePdfReport(rapor);
        } catch {
            // Sessiz yutma YOK: kullaniciya butonu geri veriyoruz, tekrar
            // denenebilir. Hata detayi Sentry'ye zaten global olarak gidiyor.
        } finally {
            setUretiliyor(false);
        }
    };

    return (
        <button type="button" onClick={indir} disabled={uretiliyor}>
            {uretiliyor ? 'Hazırlanıyor…' : 'PDF indir'}
        </button>
    );
}
```

- [ ] **Step 4: Rapor listesine bağla**

`src/app/dashboard/reports/page.tsx`: her rapor satırına `<RaporPdfButonu rapor={...} />` ekle.

`Rapor` tipi `Parameters<typeof generatePdfReport>[0]` ile üretecin kendisinden türetildiği
için elle bir şekil yazmaya gerek yok; `tsc` uyumsuzluğu derleme zamanında yakalar.
Rapor listesindeki kaydın alanları bu tipi karşılamıyorsa **eksik alanları listeden
tamamla** (uydurma değer koyma — hangi alanın nereden geldiği belirsizse dur ve sor).
Test fikstürü `RAPOR` de bu tipe uymalı; uymuyorsa fikstürü düzelt, tipi gevşetme.

- [ ] **Step 5: Doğrula**

```bash
npx jest src/app/dashboard/reports --no-coverage
npx tsc --noEmit
```
Expected: 3 test PASS; tsc 0.

- [ ] **Step 6: Commit**

```bash
git add src/app/dashboard/reports
git commit -m "feat(raporlar): kayitli rapordan PDF indirme"
```

---

### Task 10: Final doğrulama

**Files:** yok (bulgu çıkarsa düzeltme commit'i)

- [ ] **Step 1: Tam komut paketi**

```bash
npx tsc --noEmit
npx jest --no-coverage
npx eslint src
npm run build
```
Beklenen: tsc 0; tüm testler geçer; eslint **12 problem** (2 hata/10 uyarı — baseline, hiçbiri bu planın dosyalarında); build başarılı.

- [ ] **Step 2: Spec §8'in üç zorunlu doğrulaması (canlı, 390×844)**

Spec bu üçünü açıkça zorunlu kılıyor çünkü A1 turunda **ekran görüntüsü ve `getByRole` dört gerçek kusurun dördünü de kaçırdı**; yakalayanlar hesaplanmış stil okuması ve simüle edilmiş jest oldu.

1. **Yaprak kaydırma jesti:** `4f` açıkken içerik tekerlek/dokunmayla kaydırılıyor, `scrollTop` `maxScroll`a ulaşıyor, yaprak kapanmıyor, `Ayarları uygula ve kapat` görünür alana geliyor.
2. **Computed-style:** `HesapFişi` mobil ağaçta zemin ve ayraç alıyor — `backgroundColor` şeffaf DEĞİL, `borderTopWidth` 0 DEĞİL.
3. **Davranış:** ilçe seçilince birim maliyet **ve** piyasa fiyatı doluyor; elle ezme kaynak etiketini "Elle girildi"ye çeviriyor; ilçe değişince yeniden doluyor; konum temizlenince varsayılana dönüyor.

- [ ] **Step 3: Tek kapı ve sadeleşme kontrolü**

```bash
grep -rn "SekmeSecici\|sekmeKap\|MobilSekme" src/ || echo "sekme seridi kalintisi yok"
grep -rn "aria-label=\"Gelişmiş ayarlar\"" src/ || echo "baslikaki disli kalmadi"
```
Beklenen: ikisi de boş. Ekranda gelişmiş ayarlara **tek** giriş olmalı.

- [ ] **Step 4: Masaüstü regresyon**

1440×900'de `/hesapla`: düzen değişmemiş; `LocationSelector`, birim maliyet satırı ve `MarketField` sidebar'da görünür; `FormulParamsFields` çekmecede eskisi gibi çalışıyor (daire sayısı + arsa alanı birlikte).

- [ ] **Step 5: Erişilebilirlik**

Dokunma hedefleri ≥44px (kutu yüksekliği değil, `elementFromPoint` ile **gerçek vuruş alanı** — `NEXTJS-PORTAL` dev-only katmanını sayma); yeni girişlerin `aria-label`ı var; `prefers-reduced-motion` altında hareket kapalı.

- [ ] **Step 6: Bulgular varsa düzelt ve commit et**

```bash
git add -- src docs
git commit -m "fix(hesapla): final dogrulamada bulunan kusurlar giderildi"
```

**NOT:** `git add -A` KULLANMA — bu depoda takipsiz `hatalar/` ve ~12 MB kullanılamaz `public/images/**` PNG seti var, sessizce staging'e girer.

---

## Notlar

- **origin ölü** (`github.com/XMYRA6/arsabil.git` → "Repository not found"). Bu plan yalnızca lokal commit üretir; push denenmeyecek.
- **A1'in açık bıraktığı kalemler bu planla kapanır:** C2 (mobil özellik kaybı — Task 6/7/9) ve I4 (kontrol çoğaltması — Task 5).
- **Bu planda OLMAYAN, ayrı spec bekleyen işler:** aramalı parsel sorgu ekranı (Parça 1), masaüstü yerleşiminin yeniden tasarımı ve `HesapFişi` sunumu (Parça 3), senaryo karşılaştırma (Parça 4).
- Kalan düşük öncelikli A1 minor'ları: güvenli alan artığı, `.girdiEtiket` tipografisi, spec §7 basma geri bildirimi, memoization. `task-11-acik-kalemler.md`de kayıtlı.
