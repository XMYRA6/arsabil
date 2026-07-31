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

