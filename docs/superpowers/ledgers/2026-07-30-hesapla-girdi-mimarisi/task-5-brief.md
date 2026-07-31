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

