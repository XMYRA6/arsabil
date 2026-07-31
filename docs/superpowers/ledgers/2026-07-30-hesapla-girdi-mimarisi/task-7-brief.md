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

