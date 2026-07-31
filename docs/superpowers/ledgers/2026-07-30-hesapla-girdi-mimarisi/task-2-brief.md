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

