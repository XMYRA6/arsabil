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

