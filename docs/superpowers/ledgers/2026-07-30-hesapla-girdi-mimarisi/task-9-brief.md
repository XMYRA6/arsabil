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

