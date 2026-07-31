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

