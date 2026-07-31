# İlçe Fiyat Verisi + Mobil Konum Seçici Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `DistrictPrice` tablosunu seed'lenebilir hale getirmek ve mobil il/ilçe seçicisini, aranabilir bir cam BottomSheet olarak mobil tasarım sistemine oturtmak.

**Architecture:** İki bağımsız parça. (A) `src/lib/districtPrices/` altında versiyonlanmış veri + saf doğrulayıcı, bunları kullanan `prisma/seed-district-prices.ts` upsert scripti. (B) `src/app/hesapla/mobile/KonumSecici.tsx` — mevcut `BottomSheet` üzerine kurulu, Türkçe-duyarlı arama yapan yeni bir mobil bileşen; `KonumBlogu` masaüstü `LocationSelector` yerine bunu render eder. Aradaki köprü `page.tsx`e eklenen `handleKonumSec(il, ilce)` atomik seçim fonksiyonudur.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Prisma, CSS Modules, framer-motion, Jest + React Testing Library, Playwright (canlı ölçüm).

**Spec:** `docs/superpowers/specs/2026-08-01-ilce-fiyat-verisi-ve-mobil-konum-secici-design.md`

## Global Constraints

- **Masaüstü değişmez.** `src/components/LocationSelector.tsx`, `src/app/hesapla/page.module.css`in masaüstü (media query DIŞI) kuralları ve **masaüstü JSX yerleşimi** hiç değiştirilmez. `page.tsx` bu planda iki kez değişir ve ikisi de masaüstü çıktısını etkilemez: Task 3 (atomik seçim refactor'ü — `handleIlceChange` aynı davranışı delege ederek korur) ve Task 6 (yalnızca **mobil dalın** `girdi.konum` prop bloğu). Masaüstü render çıktısı ikisinde de birebir aynı kalmalı.
- **Dokunma hedefi:** yeni eklenen her etkileşimli eleman **≥44px** (`--touch-target`). Görsel olarak daha kısa olması gereken kontrollerde mevcut `::after` deseni kullanılır (bkz. `mobile.module.css` `.birimMaliyetDegistir::after`).
- **Tüm yeni mobil CSS**, `src/app/hesapla/mobile/mobile.module.css` içindeki mevcut `@media (max-width: 768px)` bloğunun İÇİNDE kalır.
- **Renk/ölçü token'ları:** `var(--m-fill)`, `var(--m-glass-border)`, `var(--m-on-glass)`, `var(--m-ink)`, `var(--m-link)`, `var(--m-body)`, `var(--m-r-btn)`, `var(--m-r-input)`, `var(--m-r-inner)`. Aksan `#2b7cff`. Yeni token icat edilmez.
- **Emoji kullanılmaz.** İkonlar `@/components/icons` içindeki stroke ikonlardan gelir (`IconPin`, `IconChevronRight`, `IconCheckCircle`).
- **Sayı biçimlendirme:** `Intl.NumberFormat('tr-TR')`. Ham `${sayi}` interpolasyonu yasak.
- **TDD zorunlu:** her test önce kırmızı görülecek. Kaynak-metin regex'i tek başına kabul edilebilir kanıt değildir (whole-branch review bulgusu I5).
- **`git add -A` KULLANILMAZ.** Bu repoda takipsiz `hatalar/` ve `public/images/**` dosyaları var; her commit'te dosyalar tek tek sayılır.
- **Doğrulama komutları:** `npx jest --no-coverage` · `npx tsc --noEmit` · `npx eslint src` (baseline **12**: 2 hata / 10 uyarı — bu sayı artmamalı).

---

### Task 1: Türkçe-duyarlı arama (saf fonksiyon)

**Files:**
- Create: `src/app/hesapla/mobile/konumArama.ts`
- Test: `src/app/hesapla/mobile/konumArama.test.ts`

**Interfaces:**
- Consumes: yok (ilk task).
- Produces:
  - `trNormalize(metin: string): string`
  - `konumAra<T extends { il: string; ilce: string }>(kayitlar: T[], sorgu: string, sinir?: number): { sonuclar: T[]; kesildi: boolean }` — `sinir` varsayılanı **60**.

- [ ] **Step 1: Write the failing test**

`src/app/hesapla/mobile/konumArama.test.ts`:

```ts
import { trNormalize, konumAra } from './konumArama'

const KAYITLAR = [
    { il: 'İstanbul', ilce: 'Kadıköy' },
    { il: 'İstanbul', ilce: 'Beşiktaş' },
    { il: 'Ankara', ilce: 'Çankaya' },
    { il: 'Şanlıurfa', ilce: 'Merkez' },
    { il: 'Iğdır', ilce: 'Merkez' },
]

describe('trNormalize', () => {
    it('Turkce harfleri ASCII karsiligina indirger', () => {
        expect(trNormalize('Kadıköy')).toBe('kadikoy')
        expect(trNormalize('Beşiktaş')).toBe('besiktas')
        expect(trNormalize('Çankaya')).toBe('cankaya')
        expect(trNormalize('Iğdır')).toBe('igdir')
    })

    // Noktali-I tuzagi: 'İ'.toLowerCase() ingilizce kurallarda 'i̇' (birlesik
    // nokta) uretir, 'I'.toLocaleLowerCase('tr') ise 'ı' uretir. Ikisi de
    // duz 'i' vermezse "istanbul" yazan kullanici Istanbul'u bulamaz.
    it('noktali ve noktasiz I harflerinin ikisini de duz i yapar', () => {
        expect(trNormalize('İstanbul')).toBe('istanbul')
        expect(trNormalize('ISTANBUL')).toBe('istanbul')
        expect(trNormalize('istanbul')).toBe('istanbul')
    })

    it('bastaki ve sondaki bosluklari atar', () => {
        expect(trNormalize('  Kadıköy  ')).toBe('kadikoy')
    })
})

describe('konumAra', () => {
    it('bos sorguda tum kayitlari doner', () => {
        const r = konumAra(KAYITLAR, '')
        expect(r.sonuclar).toHaveLength(5)
        expect(r.kesildi).toBe(false)
    })

    it('ASCII yazimla Turkce kaydi bulur', () => {
        expect(konumAra(KAYITLAR, 'kadikoy').sonuclar).toEqual([
            { il: 'İstanbul', ilce: 'Kadıköy' },
        ])
    })

    it('il adiyla arar', () => {
        expect(konumAra(KAYITLAR, 'istanbul').sonuclar).toHaveLength(2)
    })

    it('il ve ilceyi birlikte yazmaya izin verir', () => {
        expect(konumAra(KAYITLAR, 'ankara can').sonuclar).toEqual([
            { il: 'Ankara', ilce: 'Çankaya' },
        ])
    })

    // "Merkez" onlarca ilde tekrar eder; arama ikisini de dondurmeli ki
    // arayuz "Il / Ilce" olarak ayirt edebilsin.
    it('tekrar eden ilce adinda tum illeri doner', () => {
        expect(konumAra(KAYITLAR, 'merkez').sonuclar).toHaveLength(2)
    })

    it('eslesme yoksa bos doner', () => {
        expect(konumAra(KAYITLAR, 'zzz').sonuclar).toEqual([])
    })

    it('siniri asinca keser ve kesildi bayragini kaldirir', () => {
        const r = konumAra(KAYITLAR, '', 2)
        expect(r.sonuclar).toHaveLength(2)
        expect(r.kesildi).toBe(true)
    })

    it('sinir tam sayida kayitta kesildi DEMEZ', () => {
        const r = konumAra(KAYITLAR, '', 5)
        expect(r.kesildi).toBe(false)
    })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/app/hesapla/mobile/konumArama.test.ts --no-coverage`
Expected: FAIL — `Cannot find module './konumArama'`

- [ ] **Step 3: Write minimal implementation**

`src/app/hesapla/mobile/konumArama.ts`:

```ts
/**
 * Konum aramasi — Turkce-duyarli eslestirme.
 *
 * Neden ozel bir normalizasyon: kullanici klavyesinde Turkce harf olmadan
 * yazar ("kadikoy"), veri ise tam yazimla durur ("Kadıköy"). Duz
 * `toLowerCase()` yetmez; noktali-I tuzagi da var (bkz. testler).
 */

const HARF_ESLEME: Record<string, string> = {
    ı: 'i', İ: 'i', ş: 's', Ş: 's', ğ: 'g', Ğ: 'g',
    ü: 'u', Ü: 'u', ö: 'o', Ö: 'o', ç: 'c', Ç: 'c',
}

export function trNormalize(metin: string): string {
    return metin
        .trim()
        .replace(/[ıİşŞğĞüÜöÖçÇ]/g, h => HARF_ESLEME[h])
        .toLowerCase()
}

export function konumAra<T extends { il: string; ilce: string }>(
    kayitlar: T[],
    sorgu: string,
    sinir = 60,
): { sonuclar: T[]; kesildi: boolean } {
    const q = trNormalize(sorgu)
    const eslesenler = q
        ? kayitlar.filter(k => trNormalize(`${k.il} ${k.ilce}`).includes(q))
        : kayitlar
    return {
        sonuclar: eslesenler.slice(0, sinir),
        kesildi: eslesenler.length > sinir,
    }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/app/hesapla/mobile/konumArama.test.ts --no-coverage`
Expected: PASS (14 test)

- [ ] **Step 5: Commit**

```bash
git add src/app/hesapla/mobile/konumArama.ts src/app/hesapla/mobile/konumArama.test.ts
git commit -m "feat(konum): Turkce-duyarli konum arama fonksiyonu"
```

---

### Task 2: İlçe fiyat verisi, doğrulayıcı ve seed scripti

**Files:**
- Create: `src/lib/districtPrices/data.ts`
- Create: `src/lib/districtPrices/validate.ts`
- Create: `src/lib/districtPrices/__tests__/validate.test.ts`
- Create: `prisma/seed-district-prices.ts`
- Modify: `package.json` (yalnızca `scripts` bölümüne bir satır)

**Interfaces:**
- Consumes: yok.
- Produces:
  - `type IlceFiyatKaydi = { il: string; ilce: string; avgSalesPricePerM2: number; avgUnitConstructionPrice: number }`
  - `const ILCE_FIYATLARI: IlceFiyatKaydi[]`
  - `type DogrulamaHatasi = { indeks: number; mesaj: string }`
  - `dogrulaIlceFiyatlari(kayitlar: IlceFiyatKaydi[]): DogrulamaHatasi[]` — boş dizi = geçerli.

**NOT:** Gerçek rakamlar insandan gelecek. Bu task veri dosyasını **boş dizi** ile oluşturur; mekanizma ve testler veriyi beklemeden tamamlanır. Rakamlar geldiğinde yalnızca `ILCE_FIYATLARI` dizisi doldurulur, başka hiçbir dosya değişmez.

- [ ] **Step 1: Write the failing test**

`src/lib/districtPrices/__tests__/validate.test.ts`:

```ts
import { dogrulaIlceFiyatlari } from '../validate'
import { ILCE_FIYATLARI } from '../data'

const GECERLI = { il: 'İstanbul', ilce: 'Kadıköy', avgSalesPricePerM2: 118000, avgUnitConstructionPrice: 24500 }

describe('dogrulaIlceFiyatlari', () => {
    it('gecerli kayitta hata dondurmez', () => {
        expect(dogrulaIlceFiyatlari([GECERLI])).toEqual([])
    })

    it('bos dizi gecerlidir (veri henuz girilmemis olabilir)', () => {
        expect(dogrulaIlceFiyatlari([])).toEqual([])
    })

    it('ayni il/ilce cifti iki kez varsa hata verir', () => {
        const hatalar = dogrulaIlceFiyatlari([GECERLI, { ...GECERLI }])
        expect(hatalar).toHaveLength(1)
        expect(hatalar[0].indeks).toBe(1)
        expect(hatalar[0].mesaj).toMatch(/tekrar/i)
    })

    it('farkli ildeki ayni ilce adi hata DEGILDIR', () => {
        expect(dogrulaIlceFiyatlari([
            { ...GECERLI, il: 'Şanlıurfa', ilce: 'Merkez' },
            { ...GECERLI, il: 'Iğdır', ilce: 'Merkez' },
        ])).toEqual([])
    })

    it('sifir veya negatif fiyat hata verir', () => {
        expect(dogrulaIlceFiyatlari([{ ...GECERLI, avgSalesPricePerM2: 0 }])).toHaveLength(1)
        expect(dogrulaIlceFiyatlari([{ ...GECERLI, avgUnitConstructionPrice: -5 }])).toHaveLength(1)
    })

    it('sonlu olmayan fiyat hata verir', () => {
        expect(dogrulaIlceFiyatlari([{ ...GECERLI, avgSalesPricePerM2: NaN }])).toHaveLength(1)
    })

    it('bos veya bosluklu isim hata verir', () => {
        expect(dogrulaIlceFiyatlari([{ ...GECERLI, ilce: '' }])).toHaveLength(1)
        expect(dogrulaIlceFiyatlari([{ ...GECERLI, il: ' İstanbul' }])).toHaveLength(1)
    })
})

// Bu test, bozuk verinin commit'lenmesini engeller: veri dosyasi
// buyudukce (900+ ilce) elle gozden gecirmek imkansizlasir.
describe('ILCE_FIYATLARI veri dosyasi', () => {
    it('dogrulamadan gecer', () => {
        expect(dogrulaIlceFiyatlari(ILCE_FIYATLARI)).toEqual([])
    })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/lib/districtPrices --no-coverage`
Expected: FAIL — `Cannot find module '../validate'`

- [ ] **Step 3: Write minimal implementation**

`src/lib/districtPrices/data.ts`:

```ts
/**
 * Ilce fiyat verisi — TEK kaynak.
 *
 * Rakamlar INSANDAN gelir; burada uretilmis/tahmini deger BULUNMAZ. Bu
 * sayilar dogrudan fizibilite motorunu suruyor ve bu projede daha once
 * "uydurma veri gercek gibi gorundu" sinifindan iki bug yasandi.
 *
 * Guncelleme: yalnizca asagidaki diziyi duzenleyin, sonra
 * `npm run db:seed:district-prices` calistirin. Seed UPSERT yapar ve
 * hicbir satiri SILMEZ — admin panelinden yapilmis duzeltmeler korunur.
 */
export type IlceFiyatKaydi = {
    il: string
    ilce: string
    /** Ortalama satis fiyati, TL/m² */
    avgSalesPricePerM2: number
    /** Ortalama birim insaat maliyeti, TL/m² */
    avgUnitConstructionPrice: number
}

export const ILCE_FIYATLARI: IlceFiyatKaydi[] = []
```

`src/lib/districtPrices/validate.ts`:

```ts
import type { IlceFiyatKaydi } from './data'

export type DogrulamaHatasi = { indeks: number; mesaj: string }

function isimGecerli(s: string): boolean {
    return typeof s === 'string' && s.length > 0 && s === s.trim()
}

function fiyatGecerli(n: number): boolean {
    return Number.isFinite(n) && n > 0
}

/**
 * Veri dosyasini YAZMADAN ONCE dogrular. Bos dizi = gecerli.
 *
 * Yarim yazilmis bir fiyat tablosu, hic yazilmamisindan kotudur: kullanici
 * bazi ilcelerde dogru, bazilarinda sessizce yanlis hesap gorur.
 */
export function dogrulaIlceFiyatlari(kayitlar: IlceFiyatKaydi[]): DogrulamaHatasi[] {
    const hatalar: DogrulamaHatasi[] = []
    const gorulen = new Set<string>()

    kayitlar.forEach((k, indeks) => {
        if (!isimGecerli(k.il)) hatalar.push({ indeks, mesaj: `il adi gecersiz: "${k.il}"` })
        if (!isimGecerli(k.ilce)) hatalar.push({ indeks, mesaj: `ilce adi gecersiz: "${k.ilce}"` })
        if (!fiyatGecerli(k.avgSalesPricePerM2)) {
            hatalar.push({ indeks, mesaj: `avgSalesPricePerM2 pozitif olmali: ${k.avgSalesPricePerM2}` })
        }
        if (!fiyatGecerli(k.avgUnitConstructionPrice)) {
            hatalar.push({ indeks, mesaj: `avgUnitConstructionPrice pozitif olmali: ${k.avgUnitConstructionPrice}` })
        }
        const anahtar = `${k.il} ${k.ilce}`
        if (gorulen.has(anahtar)) {
            hatalar.push({ indeks, mesaj: `tekrar eden kayit: ${k.il} / ${k.ilce}` })
        }
        gorulen.add(anahtar)
    })

    return hatalar
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/lib/districtPrices --no-coverage`
Expected: PASS (9 test)

- [ ] **Step 5: Write the seed script**

`prisma/seed-district-prices.ts` — mevcut `prisma/seed-profit-levels.ts` ve `prisma/seed-users.ts` desenine uyar (bagimsiz script, `main()` + `catch` + `$disconnect`):

```ts
import { PrismaClient } from '@prisma/client';
import { ILCE_FIYATLARI } from '../src/lib/districtPrices/data';
import { dogrulaIlceFiyatlari } from '../src/lib/districtPrices/validate';

const prisma = new PrismaClient();

async function main() {
  const hatalar = dogrulaIlceFiyatlari(ILCE_FIYATLARI);
  if (hatalar.length > 0) {
    // HICBIR SEY YAZMADAN cik: yarim yazilmis fiyat tablosu, hic
    // yazilmamisindan kotudur.
    console.error(`❌ Veri dosyasinda ${hatalar.length} sorun bulundu, hicbir kayit yazilmadi:`);
    for (const h of hatalar) console.error(`   [${h.indeks}] ${h.mesaj}`);
    process.exitCode = 1;
    return;
  }

  if (ILCE_FIYATLARI.length === 0) {
    console.log('ℹ️ Veri dosyasi bos, yazilacak kayit yok.');
    return;
  }

  let yazilan = 0;
  for (const k of ILCE_FIYATLARI) {
    // UPSERT + SILME YOK: admin panelinden elle duzeltilmis satirlar
    // korunur; yalnizca veri dosyasindaki ciftler guncellenir.
    await prisma.districtPrice.upsert({
      where: { il_ilce: { il: k.il, ilce: k.ilce } },
      create: k,
      update: {
        avgSalesPricePerM2: k.avgSalesPricePerM2,
        avgUnitConstructionPrice: k.avgUnitConstructionPrice,
      },
    });
    yazilan++;
  }

  const toplam = await prisma.districtPrice.count();
  console.log(`✅ ${yazilan} ilce fiyati yazildi/guncellendi. Tabloda toplam ${toplam} kayit var.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

- [ ] **Step 6: Add the npm script**

`package.json` içindeki `scripts` bölümüne (mevcut satırlara dokunmadan) ekle:

```json
"db:seed:district-prices": "ts-node --compiler-options {\"module\":\"commonjs\"} prisma/seed-district-prices.ts"
```

- [ ] **Step 7: Run the seed to verify it works end-to-end**

Run: `npm run db:seed:district-prices`
Expected: `ℹ️ Veri dosyasi bos, yazilacak kayit yok.` (veri henüz girilmedi; script hatasız çalışmalı)

Sonra doğrulamanın gerçekten çalıştığını kanıtla: `data.ts`e geçici olarak `{ il: 'X', ilce: 'Y', avgSalesPricePerM2: 0, avgUnitConstructionPrice: 1 }` ekle, scripti tekrar koş, `❌ ... avgSalesPricePerM2 pozitif olmali: 0` çıktısını gör, satırı geri al.

**UYARI:** Bu geri almayı `git checkout -- <dosya>` ile YAPMA — o komut dosyadaki tüm commit'lenmemiş çalışmayı siler. Eklediğin satırı elle sil.

- [ ] **Step 8: Commit**

```bash
git add src/lib/districtPrices/data.ts src/lib/districtPrices/validate.ts src/lib/districtPrices/__tests__/validate.test.ts prisma/seed-district-prices.ts package.json
git commit -m "feat(veri): ilce fiyat seed mekanizmasi (upsert, silme yok, on dogrulama)"
```

---

### Task 3: Atomik konum seçimi (`handleKonumSec`)

**Files:**
- Modify: `src/app/hesapla/mobile/unitPriceSource.ts`
- Modify: `src/app/hesapla/mobile/unitPriceSource.test.ts`
- Modify: `src/app/hesapla/page.tsx:456-478`
- Modify: `src/app/hesapla/pageStyles.scope.test.ts`

**Interfaces:**
- Consumes: mevcut `ilceSecildi(entry, apartmentSize)` (DEĞİŞTİRİLMEZ).
- Produces: `ilceKaydiBul<T extends { il: string; ilce: string }>(kayitlar: T[], il: string, ilce: string): T | undefined` ve `page.tsx` içinde `handleKonumSec(il: string, ilce: string): void`.

**Neden:** Mevcut `handleIlceChange` ilçeyi bulmak için `selectedIl`'i **state'ten** okuyor. Mobil seçici il+ilçeyi aynı anda verecek; `handleIlChange` → `handleIlceChange` sırayla çağrılırsa ikincisi closure'daki **eski** `selectedIl`'i görür, `find` başarısız olur ve `if (!entry) return;` yüzünden fiyatlar sessizce güncellenmez.

- [ ] **Step 1: Write the failing test**

`src/app/hesapla/mobile/unitPriceSource.test.ts` sonuna ekle:

```ts
import { ilceKaydiBul } from './unitPriceSource'

describe('ilceKaydiBul', () => {
    const KAYITLAR = [
        { il: 'İstanbul', ilce: 'Kadıköy', avgUnitConstructionPrice: 24500, avgSalesPricePerM2: 118000 },
        { il: 'Ankara', ilce: 'Çankaya', avgUnitConstructionPrice: 19500, avgSalesPricePerM2: 62000 },
        { il: 'Şanlıurfa', ilce: 'Merkez', avgUnitConstructionPrice: 11000, avgSalesPricePerM2: 21000 },
        { il: 'Iğdır', ilce: 'Merkez', avgUnitConstructionPrice: 10000, avgSalesPricePerM2: 18000 },
    ]

    it('il ve ilceyi BIRLIKTE verilen degerlerle esler', () => {
        expect(ilceKaydiBul(KAYITLAR, 'Ankara', 'Çankaya')?.avgSalesPricePerM2).toBe(62000)
    })

    // Asil koruma: ayni ilce adi birden cok ilde var. Yanlis il ile
    // eslesirse kullanici bambaska bir sehrin fiyatiyla hesap yapar.
    it('tekrar eden ilce adinda DOGRU ili secer', () => {
        expect(ilceKaydiBul(KAYITLAR, 'Iğdır', 'Merkez')?.avgSalesPricePerM2).toBe(18000)
        expect(ilceKaydiBul(KAYITLAR, 'Şanlıurfa', 'Merkez')?.avgSalesPricePerM2).toBe(21000)
    })

    it('eslesme yoksa undefined doner', () => {
        expect(ilceKaydiBul(KAYITLAR, 'İzmir', 'Kadıköy')).toBeUndefined()
    })
})
```

`src/app/hesapla/pageStyles.scope.test.ts` içindeki `birim maliyet ve piyasa fiyati gorunurlugu` describe bloğuna ekle:

```ts
  // Whole-branch review I5: page.tsx'i render eden davranis testi yok, bu
  // yuzden buradaki garanti kaynak metinden okunuyor. Kirilabilirligi
  // kanitlanacak: delegasyonu geri alinca test kirmiziya donmeli.
  it('handleIlceChange artik selectedIl state\'ini KENDI okumaz, handleKonumSec\'e delege eder', () => {
    const pageTsx = fs.readFileSync(path.join(__dirname, 'page.tsx'), 'utf8');
    expect(pageTsx).toMatch(/const handleKonumSec\s*=\s*\(il: string, ilce: string\)/);
    expect(pageTsx).toMatch(/const handleIlceChange\s*=\s*\(ilce: string\)\s*=>\s*handleKonumSec\(selectedIl, ilce\)/);
    // Eski, state'ten okuyan arama tamamen kalkmis olmali.
    expect(pageTsx).not.toMatch(/d\.il === selectedIl/);
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest src/app/hesapla/mobile/unitPriceSource.test.ts src/app/hesapla/pageStyles.scope.test.ts --no-coverage`
Expected: FAIL — `ilceKaydiBul is not a function` ve scope testinde `handleKonumSec` bulunamadı

- [ ] **Step 3: Add the pure helper**

`src/app/hesapla/mobile/unitPriceSource.ts` içine, `ilceSecildi`in ÜSTÜNE ekle:

```ts
/**
 * Il + ilce ciftinden kaydi bulur.
 *
 * Ikisini de PARAMETRE olarak alir; cagiranin state'inden okumaz. Mobil
 * secici il ve ilceyi ayni anda veriyor ve React setState senkron olmadigi
 * icin, `setSelectedIl(il)` sonrasi ayni handler icinde `selectedIl` hala
 * ESKI degeri tasir. Arama o eski il ile yapilirsa eslesme bulunamaz ve
 * fiyatlar sessizce guncellenmez (whole-branch review sonrasi tasarim
 * karari, bkz. 2026-08-01 spec).
 */
export function ilceKaydiBul<T extends { il: string; ilce: string }>(
    kayitlar: T[],
    il: string,
    ilce: string,
): T | undefined {
    return kayitlar.find(k => k.il === il && k.ilce === ilce)
}
```

- [ ] **Step 4: Rewire `page.tsx`**

`src/app/hesapla/page.tsx:33` import satırına `ilceKaydiBul` ekle:

```ts
import { ilceSecildi, ilceKaydiBul, konumTemizlendi, metrekareDegisti, type BirimMaliyetKaynagi } from './mobile/unitPriceSource';
```

`src/app/hesapla/page.tsx:456-478` arasındaki `handleIlceChange`i tamamen şununla değiştir:

```ts
  /**
   * Konum secimi — il ve ilce BIRLIKTE. Mobil secici ikisini ayni anda
   * verir; masaustu `handleIlceChange` uzerinden delege eder.
   */
  const handleKonumSec = (il: string, ilce: string) => {
    setSelectedIl(il);
    setSelectedIlce(ilce);
    const entry = ilceKaydiBul(districtPrices, il, ilce);
    if (!entry) return;
    if (originalUnitPrice === null) {
      setOriginalUnitPrice(globalUnitPrice);
      setOriginalUnitPriceKaynagi(birimMaliyetKaynagi);
      setOriginalMarketPrice(manualMarketPrice);
      setOriginalPiyasaFiyatiElle(piyasaFiyatiElle);
    }
    const sonuc = ilceSecildi(entry, apartmentSize);
    setGlobalUnitPrice(sonuc.birimMaliyet);
    setManualMarketPrice(sonuc.piyasaFiyati);
    // Piyasa fiyati da ilceden geldi, artik elle girilmis degil.
    setPiyasaFiyatiElle(false);
    // Spec 4: elle girilmis bir deger EZILDIYSE kullaniciya soylenir — birim
    // maliyet VEYA piyasa fiyati, ilce ikisini birden doldurur. Sessizce
    // degistirmek, kullanicinin "neden degisti" diye sormasina yol acar.
    if (birimMaliyetKaynagi.tur === 'elle' || piyasaFiyatiElle) {
      toast(`${entry.ilce} ortalamasına güncellendi`, { position: 'top-right' });
    }
    setBirimMaliyetKaynagi(sonuc.kaynak);
  };

  const handleIlceChange = (ilce: string) => handleKonumSec(selectedIl, ilce);
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx jest src/app/hesapla --no-coverage && npx tsc --noEmit`
Expected: tüm testler PASS, tsc 0 hata

- [ ] **Step 6: Prove the scope test can actually fail**

`handleIlceChange`i geçici olarak eski haline (state'ten okuyan `find`) çevir, `npx jest src/app/hesapla/pageStyles.scope.test.ts --no-coverage` koş, yeni testin KIRMIZI olduğunu gör, sonra değişikliği **elle** geri al (`git checkout --` KULLANMA — commit'lenmemiş diğer işi siler). Kanıtı commit mesajına yaz.

- [ ] **Step 7: Commit**

```bash
git add src/app/hesapla/mobile/unitPriceSource.ts src/app/hesapla/mobile/unitPriceSource.test.ts src/app/hesapla/page.tsx src/app/hesapla/pageStyles.scope.test.ts
git commit -m "refactor(hesapla): konum secimini atomik hale getir (handleKonumSec)"
```

---

### Task 4: `KonumSecici` — kapalı hal

**Files:**
- Create: `src/app/hesapla/mobile/KonumSecici.tsx`
- Create: `src/app/hesapla/mobile/KonumSecici.test.tsx`
- Modify: `src/app/hesapla/mobile/mobile.module.css` (mevcut `@media (max-width: 768px)` bloğunun içine)

**Interfaces:**
- Consumes: `konumAra`, `trNormalize` (Task 1); `DistrictPriceEntry` (`@/components/LocationSelector`).
- Produces:

```ts
export type KonumSeciciProps = {
    districtPrices: DistrictPriceEntry[]
    selectedIl: string
    selectedIlce: string
    onSecim: (il: string, ilce: string) => void
    onClear: () => void
}
export function KonumSecici(props: KonumSeciciProps): JSX.Element
```

Bu task yalnızca **kapalı hali** yapar; dokununca açılan sheet Task 5'te gelir. Bu task sonunda buton `aria-expanded={false}` ile durur ve tıklama iç state'i açar ama sheet henüz render edilmez.

- [ ] **Step 1: Write the failing test**

`src/app/hesapla/mobile/KonumSecici.test.tsx`:

```tsx
/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { KonumSecici } from './KonumSecici'

const KAYITLAR = [
    { id: '1', il: 'İstanbul', ilce: 'Kadıköy', avgSalesPricePerM2: 118000, avgUnitConstructionPrice: 24500 },
    { id: '2', il: 'Ankara', ilce: 'Çankaya', avgSalesPricePerM2: 62000, avgUnitConstructionPrice: 19500 },
]

const varsayilan = {
    districtPrices: KAYITLAR,
    selectedIl: '',
    selectedIlce: '',
    onSecim: jest.fn(),
    onClear: jest.fn(),
}

describe('KonumSecici — kapali hal', () => {
    it('secim yokken davet metnini gosterir', () => {
        render(<KonumSecici {...varsayilan} />)
        expect(screen.getByRole('button', { name: /il \/ ilçe seçin/i })).toBeInTheDocument()
    })

    it('secim varken il/ilce ve iki fiyati gosterir', () => {
        render(<KonumSecici {...varsayilan} selectedIl="İstanbul" selectedIlce="Kadıköy" />)
        const btn = screen.getByRole('button', { name: /İstanbul \/ Kadıköy/ })
        expect(btn).toBeInTheDocument()
        // Fiyatlar tr-TR bicimli olmali (ham sayi degil).
        expect(btn).toHaveTextContent('118.000')
        expect(btn).toHaveTextContent('24.500')
    })

    it('secim yokken temizle butonu YOKTUR', () => {
        render(<KonumSecici {...varsayilan} />)
        expect(screen.queryByRole('button', { name: 'Konumu temizle' })).not.toBeInTheDocument()
    })

    it('secim varken temizle butonu onClear cagirir', async () => {
        const onClear = jest.fn()
        render(<KonumSecici {...varsayilan} selectedIl="İstanbul" selectedIlce="Kadıköy" onClear={onClear} />)
        await userEvent.click(screen.getByRole('button', { name: 'Konumu temizle' }))
        expect(onClear).toHaveBeenCalledTimes(1)
    })

    // Admin kaydi silmis olabilir: isimler duruyor ama fiyat yok. Cokmemeli.
    it('secili kayit veride yoksa isimleri gosterir, cokmez', () => {
        render(<KonumSecici {...varsayilan} selectedIl="İzmir" selectedIlce="Karşıyaka" />)
        expect(screen.getByRole('button', { name: /İzmir \/ Karşıyaka/ })).toBeInTheDocument()
    })

    it('acma butonu aria-expanded tasir', () => {
        render(<KonumSecici {...varsayilan} />)
        expect(screen.getByRole('button', { name: /il \/ ilçe seçin/i })).toHaveAttribute('aria-expanded', 'false')
    })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/app/hesapla/mobile/KonumSecici.test.tsx --no-coverage`
Expected: FAIL — `Cannot find module './KonumSecici'`

- [ ] **Step 3: Write minimal implementation**

`src/app/hesapla/mobile/KonumSecici.tsx`:

```tsx
"use client";

import { useState } from 'react';
import type { DistrictPriceEntry } from '@/components/LocationSelector';
import { IconPin, IconChevronRight } from '@/components/icons';
import { ilceKaydiBul } from './unitPriceSource';
import styles from './mobile.module.css';

const nf = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 });

export type KonumSeciciProps = {
    districtPrices: DistrictPriceEntry[];
    selectedIl: string;
    selectedIlce: string;
    /** Il ve ilce BIRLIKTE — bkz. `handleKonumSec` gerekcesi. */
    onSecim: (il: string, ilce: string) => void;
    onClear: () => void;
};

/**
 * Mobil konum secici (spec 2026-08-01).
 *
 * Masaustu `LocationSelector` mobilde birebir render ediliyordu: satir ici
 * sabit stiller, 28px `<select>`ler (projenin kendi `--touch-target`i 44px)
 * ve emoji. Bu bilesen onun yerini alir; masaustu bileseni DEGISMEDI.
 */
export function KonumSecici({
    districtPrices,
    selectedIl,
    selectedIlce,
    onSecim,
    onClear,
}: KonumSeciciProps) {
    const [acik, setAcik] = useState(false);
    const secili = Boolean(selectedIl && selectedIlce);
    const kayit = secili ? ilceKaydiBul(districtPrices, selectedIl, selectedIlce) : undefined;

    return (
        <div className={styles.konumSeciciKok}>
            <button
                type="button"
                className={styles.konumSeciciAc}
                aria-expanded={acik}
                onClick={() => setAcik(true)}
            >
                <span className={styles.konumSeciciIkon}>
                    <IconPin size={16} />
                </span>
                <span className={styles.konumSeciciMetin}>
                    <span className={styles.konumSeciciBaslik}>
                        {secili ? `${selectedIl} / ${selectedIlce}` : 'İl / ilçe seçin'}
                    </span>
                    {kayit && (
                        <span className={styles.konumSeciciAlt}>
                            {`Piyasa ${nf.format(kayit.avgSalesPricePerM2)} · Birim ${nf.format(kayit.avgUnitConstructionPrice)} TL/m²`}
                        </span>
                    )}
                </span>
                <IconChevronRight size={15} strokeWidth={2.4} />
            </button>

            {secili && (
                <button
                    type="button"
                    className={styles.konumSeciciTemizle}
                    aria-label="Konumu temizle"
                    onClick={onClear}
                >
                    Temizle
                </button>
            )}
        </div>
    );
}
```

- [ ] **Step 4: Add the CSS**

`src/app/hesapla/mobile/mobile.module.css` — mevcut `.konumBosNot` kuralının HEMEN ALTINA, aynı `@media (max-width: 768px)` bloğunun içinde:

```css
    /* ── Konum secici (spec 2026-08-01) ──
       Masaustu LocationSelector'in 28px native select'lerinin yerini alir.
       Her iki kontrol de >=44px: --touch-target ihlali canli olcumle
       yakalanmisti. */
    .konumSeciciKok {
        display: flex;
        align-items: stretch;
        gap: 6px;
    }

    .konumSeciciAc {
        display: flex;
        align-items: center;
        gap: 8px;
        flex: 1;
        min-height: 44px;
        padding: 6px 10px;
        border-radius: var(--m-r-btn);
        border: 1px solid var(--m-glass-border);
        background: #fff;
        color: var(--m-on-glass);
        text-align: left;
        cursor: pointer;
    }

    .konumSeciciIkon {
        display: flex;
        flex: none;
        color: #2b7cff;
    }

    .konumSeciciMetin {
        display: flex;
        flex-direction: column;
        gap: 2px;
        min-width: 0;
        flex: 1;
    }

    .konumSeciciBaslik {
        font: 700 12px Inter, sans-serif;
        color: var(--m-ink);
    }

    .konumSeciciAlt {
        font: 600 11px Inter, sans-serif;
        color: var(--m-body);
    }

    .konumSeciciTemizle {
        flex: none;
        min-height: 44px;
        padding: 0 12px;
        border-radius: var(--m-r-btn);
        border: 1px solid var(--m-glass-border);
        background: transparent;
        color: var(--m-link);
        font: 700 11.5px Inter, sans-serif;
        cursor: pointer;
    }
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx jest src/app/hesapla/mobile/KonumSecici.test.tsx --no-coverage && npx tsc --noEmit`
Expected: PASS (6 test), tsc 0

- [ ] **Step 6: Commit**

```bash
git add src/app/hesapla/mobile/KonumSecici.tsx src/app/hesapla/mobile/KonumSecici.test.tsx src/app/hesapla/mobile/mobile.module.css
git commit -m "feat(konum): mobil konum secici kapali hal (>=44px, cam yuzey)"
```

---

### Task 5: `KonumSecici` — arama sheet'i

**Files:**
- Modify: `src/app/hesapla/mobile/KonumSecici.tsx`
- Modify: `src/app/hesapla/mobile/KonumSecici.test.tsx`
- Modify: `src/app/hesapla/mobile/mobile.module.css`

**Interfaces:**
- Consumes: `BottomSheet` (`@/components/mobile/BottomSheet`, props `{ open, onClose, title, children }`); `konumAra` (Task 1).
- Produces: yeni dışa açık API yok — `KonumSeciciProps` değişmez.

**Davranış:** Boş sorguda **il listesi**; bir ile dokununca o ilin **ilçe listesi** (geri dönüş bağlantısıyla); sorgu yazılınca liste düzleşir ve "İl / İlçe" çiftlerinde arar. Sonuç sınırı **60**.

- [ ] **Step 1: Write the failing test**

`src/app/hesapla/mobile/KonumSecici.test.tsx` sonuna ekle:

```tsx
describe('KonumSecici — arama sheet\'i', () => {
    const COK_KAYIT = [
        ...KAYITLAR,
        { id: '3', il: 'İstanbul', ilce: 'Beşiktaş', avgSalesPricePerM2: 152000, avgUnitConstructionPrice: 26000 },
        { id: '4', il: 'Şanlıurfa', ilce: 'Merkez', avgSalesPricePerM2: 21000, avgUnitConstructionPrice: 11000 },
        { id: '5', il: 'Iğdır', ilce: 'Merkez', avgSalesPricePerM2: 18000, avgUnitConstructionPrice: 10000 },
    ]

    const ac = async () => {
        render(<KonumSecici {...varsayilan} districtPrices={COK_KAYIT} />)
        await userEvent.click(screen.getByRole('button', { name: /il \/ ilçe seçin/i }))
    }

    it('acilinca il listesini gosterir, ilceleri DEGIL', async () => {
        await ac()
        expect(screen.getByRole('button', { name: 'İstanbul' })).toBeInTheDocument()
        expect(screen.queryByRole('button', { name: /Kadıköy/ })).not.toBeInTheDocument()
    })

    it('bir ile dokununca o ilin ilcelerine iner', async () => {
        await ac()
        await userEvent.click(screen.getByRole('button', { name: 'İstanbul' }))
        expect(screen.getByRole('button', { name: /Kadıköy/ })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /Beşiktaş/ })).toBeInTheDocument()
        expect(screen.queryByRole('button', { name: /Çankaya/ })).not.toBeInTheDocument()
    })

    it('ilce secilince onSecim il ve ilce ile BIRLIKTE cagrilir', async () => {
        const onSecim = jest.fn()
        render(<KonumSecici {...varsayilan} districtPrices={COK_KAYIT} onSecim={onSecim} />)
        await userEvent.click(screen.getByRole('button', { name: /il \/ ilçe seçin/i }))
        await userEvent.click(screen.getByRole('button', { name: 'İstanbul' }))
        await userEvent.click(screen.getByRole('button', { name: /Kadıköy/ }))
        expect(onSecim).toHaveBeenCalledWith('İstanbul', 'Kadıköy')
    })

    it('ASCII yazimla arayinca duz sonuc listesi verir', async () => {
        await ac()
        await userEvent.type(screen.getByRole('searchbox', { name: /ara/i }), 'kadikoy')
        expect(screen.getByRole('button', { name: /İstanbul \/ Kadıköy/ })).toBeInTheDocument()
    })

    // "Merkez" birden cok ilde var: sonuclar il adini TASIMALI, yoksa
    // kullanici hangisini sectigini bilemez.
    it('tekrar eden ilce adinda sonuclari il adiyla ayirt eder', async () => {
        await ac()
        await userEvent.type(screen.getByRole('searchbox', { name: /ara/i }), 'merkez')
        expect(screen.getByRole('button', { name: /Şanlıurfa \/ Merkez/ })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /Iğdır \/ Merkez/ })).toBeInTheDocument()
    })

    it('sonuc yoksa bunu soyler', async () => {
        await ac()
        await userEvent.type(screen.getByRole('searchbox', { name: /ara/i }), 'zzzz')
        expect(screen.getByText(/sonuç yok/i)).toBeInTheDocument()
    })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/app/hesapla/mobile/KonumSecici.test.tsx --no-coverage`
Expected: FAIL — sheet render edilmediği için `İstanbul` butonu bulunamaz

- [ ] **Step 3: Write minimal implementation**

`src/app/hesapla/mobile/KonumSecici.tsx` — import satırlarına ekle:

```tsx
import { BottomSheet } from '@/components/mobile/BottomSheet';
import { konumAra } from './konumArama';
```

Bileşenin içine, `const [acik, setAcik] = useState(false);` satırının ALTINA ekle:

```tsx
    const [sorgu, setSorgu] = useState('');
    const [acilanIl, setAcilanIl] = useState<string | null>(null);

    const kapat = () => { setAcik(false); setSorgu(''); setAcilanIl(null); };

    const iller = [...new Set(districtPrices.map(d => d.il))].sort((a, b) => a.localeCompare(b, 'tr'));
    const { sonuclar, kesildi } = konumAra(districtPrices, sorgu);
    const ilceler = acilanIl
        ? districtPrices.filter(d => d.il === acilanIl).sort((a, b) => a.ilce.localeCompare(b.ilce, 'tr'))
        : [];

    const sec = (il: string, ilce: string) => { onSecim(il, ilce); kapat(); };
```

`return`daki en dış `</div>`den HEMEN ÖNCE ekle:

```tsx
            <BottomSheet open={acik} onClose={kapat} title="Konum seç">
                <input
                    type="search"
                    className={styles.konumAramaGiris}
                    aria-label="İl veya ilçe ara"
                    placeholder="İl veya ilçe ara…"
                    value={sorgu}
                    onChange={e => setSorgu(e.target.value)}
                />

                {sorgu ? (
                    sonuclar.length === 0 ? (
                        <p className={styles.konumBosNot}>
                            Sonuç yok. Birim maliyeti aşağıdan elle girebilirsiniz.
                        </p>
                    ) : (
                        <>
                            <ul className={styles.konumListe}>
                                {sonuclar.map(k => (
                                    <li key={`${k.il}-${k.ilce}`}>
                                        <button
                                            type="button"
                                            className={styles.konumListeSatir}
                                            onClick={() => sec(k.il, k.ilce)}
                                        >
                                            <span className={styles.konumSeciciBaslik}>{`${k.il} / ${k.ilce}`}</span>
                                            <span className={styles.konumSeciciAlt}>
                                                {`Piyasa ${nf.format(k.avgSalesPricePerM2)} · Birim ${nf.format(k.avgUnitConstructionPrice)} TL/m²`}
                                            </span>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                            {kesildi && (
                                <p className={styles.konumBosNot}>
                                    Çok fazla sonuç var, aramayı daraltın.
                                </p>
                            )}
                        </>
                    )
                ) : acilanIl ? (
                    <>
                        <button
                            type="button"
                            className={styles.konumGeri}
                            onClick={() => setAcilanIl(null)}
                        >
                            ← İl listesi
                        </button>
                        <ul className={styles.konumListe}>
                            {ilceler.map(k => (
                                <li key={`${k.il}-${k.ilce}`}>
                                    <button
                                        type="button"
                                        className={styles.konumListeSatir}
                                        onClick={() => sec(k.il, k.ilce)}
                                    >
                                        <span className={styles.konumSeciciBaslik}>{k.ilce}</span>
                                        <span className={styles.konumSeciciAlt}>
                                            {`Piyasa ${nf.format(k.avgSalesPricePerM2)} · Birim ${nf.format(k.avgUnitConstructionPrice)} TL/m²`}
                                        </span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </>
                ) : (
                    <ul className={styles.konumListe}>
                        {iller.map(il => (
                            <li key={il}>
                                <button
                                    type="button"
                                    className={styles.konumListeSatir}
                                    onClick={() => setAcilanIl(il)}
                                >
                                    <span className={styles.konumSeciciBaslik}>{il}</span>
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </BottomSheet>
```

- [ ] **Step 4: Add the CSS**

`mobile.module.css` — Task 4'te eklenen `.konumSeciciTemizle` kuralının ALTINA:

```css
    .konumAramaGiris {
        width: 100%;
        min-height: 44px;
        margin-bottom: 8px;
        padding: 0 12px;
        border-radius: var(--m-r-input);
        border: 1px solid var(--m-glass-border);
        background: #fff;
        color: var(--m-ink);
        /* 16px SART: daha kucuk font-size'da iOS Safari odaklanmada
           sayfayi otomatik yakinlastirir. */
        font-size: 16px;
        font-weight: 700;
    }

    .konumListe {
        list-style: none;
        margin: 0;
        padding: 0;
    }

    .konumListeSatir {
        display: flex;
        flex-direction: column;
        gap: 2px;
        width: 100%;
        min-height: 44px;
        padding: 6px 10px;
        border: 0;
        border-bottom: 1px solid var(--m-glass-border);
        border-radius: 0;
        background: transparent;
        text-align: left;
        cursor: pointer;
    }

    .konumGeri {
        min-height: 44px;
        padding: 0 4px;
        border: 0;
        background: none;
        color: var(--m-link);
        font: 700 11.5px Inter, sans-serif;
        cursor: pointer;
    }
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx jest src/app/hesapla/mobile/KonumSecici.test.tsx --no-coverage && npx tsc --noEmit`
Expected: PASS (12 test toplam), tsc 0

- [ ] **Step 6: Commit**

```bash
git add src/app/hesapla/mobile/KonumSecici.tsx src/app/hesapla/mobile/KonumSecici.test.tsx src/app/hesapla/mobile/mobile.module.css
git commit -m "feat(konum): aranabilir konum sheet'i (il listesi + drill-down + TR arama)"
```

---

### Task 6: `KonumBlogu` entegrasyonu

**Files:**
- Modify: `src/app/hesapla/mobile/KonumBlogu.tsx`
- Modify: `src/app/hesapla/mobile/KonumBlogu.test.tsx`
- Modify: `src/app/hesapla/page.tsx` (mobil `girdi.konum` prop bloğu, ~satır 623)

**`GirdiKarti.tsx` DEĞİŞMEZ.** Doğrulandı: `GirdiKarti.tsx:9` prop tipini `konum: KonumBloguProps` olarak alıyor ve `:90`da `{...konum}` diye yayıyor. `KonumBloguProps` değişince tip zinciri kendiliğinden akar. Bu dosyayı commit'e ekleme.

**Interfaces:**
- Consumes: `KonumSecici` (Task 4-5), `handleKonumSec` (Task 3).
- Produces: `KonumBloguProps`ta `onIlChange` + `onIlceChange` yerine tek `onSecim: (il: string, ilce: string) => void`.

- [ ] **Step 1: Write the failing test**

`src/app/hesapla/mobile/KonumBlogu.test.tsx` içine ekle:

**DİKKAT — mevcut fixture:** bu dosya `varsayilanProps` diye bir sabit değil, `props(patch)`
diye bir **fonksiyon** kullanıyor (`KonumBlogu.test.tsx:12`), fiyat sabiti de `FIYATLAR`.
Aynı deseni koru. Ayrıca `props()` içindeki `onIlChange: jest.fn(), onIlceChange: jest.fn()`
satırını `onSecim: jest.fn(),` ile değiştirmen gerekiyor — yoksa tsc yeni prop tipinde patlar.

```tsx
it('masaustu LocationSelector\'i ARTIK render etmez', () => {
    render(<KonumBlogu {...props()} />)
    // Masaustu bileseni native <select> kullaniyordu; mobilde artik
    // BottomSheet'li KonumSecici var.
    expect(document.querySelectorAll('select')).toHaveLength(0)
})

it('secim yokken acma butonunu gosterir', () => {
    render(<KonumBlogu {...props({ selectedIl: '', selectedIlce: '' })} />)
    expect(screen.getByRole('button', { name: /il \/ ilçe seçin/i })).toBeInTheDocument()
})

it('veri bosken bilgi notunu gosterir', () => {
    render(<KonumBlogu {...props({ districtPrices: [] })} />)
    expect(screen.getByText(/İlçe fiyat verisi henüz yok/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /il \/ ilçe seçin/i })).not.toBeInTheDocument()
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/app/hesapla/mobile/KonumBlogu.test.tsx --no-coverage`
Expected: FAIL — `select` sayısı 2 (hâlâ `LocationSelector` render ediliyor)

- [ ] **Step 3: Rewire `KonumBlogu`**

`src/app/hesapla/mobile/KonumBlogu.tsx`:

- `import { LocationSelector, type DistrictPriceEntry } from '@/components/LocationSelector';` satırını şununla değiştir:

```tsx
import type { DistrictPriceEntry } from '@/components/LocationSelector';
import { KonumSecici } from './KonumSecici';
```

- `KonumBloguProps` içindeki `onIlChange` ve `onIlceChange` alanlarını tek alanla değiştir:

```tsx
    /** Il ve ilce BIRLIKTE — React setState senkron olmadigi icin ikisi
        ayri ayri gonderilemez (bkz. `handleKonumSec`). */
    onSecim: (il: string, ilce: string) => void;
```

- Destructuring listesinde `onIlChange, onIlceChange,` yerine `onSecim,` yaz.
- `districtPrices.length > 0` dalındaki JSX'i şununla değiştir:

```tsx
                <div className={styles.konumSecici}>
                    <KonumSecici
                        districtPrices={districtPrices}
                        selectedIl={selectedIl}
                        selectedIlce={selectedIlce}
                        onSecim={onSecim}
                        onClear={onClear}
                    />
                </div>
```

- [ ] **Step 4: Rewire `page.tsx`**

`src/app/hesapla/page.tsx` mobil `girdi.konum` bloğunda (~623):

```tsx
              districtPrices, selectedIl, selectedIlce,
              onSecim: handleKonumSec,
              onClear: handleClearLocation,
```

(`onIlChange` ve `onIlceChange` satırları silinir. `handleIlChange` masaüstünde hâlâ kullanıldığı için **kalır** — silme.)

- [ ] **Step 5: Run the full suite**

Run: `npx jest --no-coverage && npx tsc --noEmit && npx eslint src`
Expected: tüm testler PASS, tsc 0, eslint **12** (baseline artmamış)

- [ ] **Step 6: Commit**

```bash
git add src/app/hesapla/mobile/KonumBlogu.tsx src/app/hesapla/mobile/KonumBlogu.test.tsx src/app/hesapla/page.tsx
git commit -m "feat(konum): KonumBlogu artik mobil KonumSecici kullaniyor"
```

---

### Task 7: Canlı doğrulama turu

**Files:**
- Create: `.superpowers/konum-secici-olcum.mjs` (gitignored, commit EDİLMEZ)
- Modify: yok (bulgu çıkarsa ilgili dosya)

**Interfaces:**
- Consumes: Task 1-6'nın tamamı.
- Produces: ölçüm raporu (task report'a yazılır).

**Ön koşul:** Docker DB ayakta (`npm run dev:db`), dev server açık (`npm run dev:next`), ve DB'de en az 3 ilçe kaydı var. Kayıt yoksa geçici satır ekle ve tur sonunda **sil**.

- [ ] **Step 1: Write the measurement script**

`.superpowers/konum-secici-olcum.mjs`:

```js
import { chromium } from 'playwright';

const b = await chromium.launch();
const c = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
const p = await c.newPage();
await p.goto('http://localhost:3000/hesapla', { waitUntil: 'networkidle' });
// Sabit timeout DEGIL: ilk derlemede fetch gec cozulur ve sahte sonuc verir.
await p.waitForSelector('text=/İl \\/ ilçe seçin/', { timeout: 30000 });

const olc = async (etiket) => {
    const r = await p.evaluate(() => {
        const sel = 'button, input, select, textarea, a[href], [role="button"]';
        const out = [];
        for (const el of document.querySelectorAll(sel)) {
            const rect = el.getBoundingClientRect();
            if (rect.width < 2 || rect.height < 2) continue;
            if (rect.bottom <= 0 || rect.top >= innerHeight) continue;
            const cx = Math.min(Math.max(rect.left + rect.width / 2, 1), innerWidth - 1);
            const cy = Math.min(Math.max(rect.top + rect.height / 2, 1), innerHeight - 1);
            const hit = document.elementFromPoint(cx, cy);
            const kendisi = hit === el || el.contains(hit) || (hit && hit.contains(el));
            out.push({
                ad: (el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 40),
                h: +rect.height.toFixed(1),
                kucuk: rect.height < 44,
                isabet: kendisi,
                portal: hit ? hit.tagName === 'NEXTJS-PORTAL' : false,
            });
        }
        return out;
    });
    const kotu = r.filter(x => (x.kucuk || !x.isabet) && !x.portal);
    console.log(`\n[${etiket}] toplam ${r.length} eleman · sorunlu ${kotu.length}`);
    for (const k of kotu) console.log(`   h=${k.h} isabet=${k.isabet} "${k.ad}"`);
};

await olc('kapali hal');
await p.click('text=/İl \\/ ilçe seçin/');
await p.waitForSelector('[role="dialog"]');
await olc('sheet acik — il listesi');
await p.fill('input[aria-label="İl veya ilçe ara"]', 'kadikoy');
await p.waitForTimeout(300);
await olc('sheet acik — arama sonucu');
await p.screenshot({ path: '.superpowers/konum-secici.png' });
await b.close();
```

- [ ] **Step 2: Run it and confirm zero problems**

Run: `node .superpowers/konum-secici-olcum.mjs`
Expected: üç ölçümün üçünde de **sorunlu 0**. Sorun çıkarsa düzelt ve tekrar koş — bu turun amacı tam olarak bu.

- [ ] **Step 3: Verify the selection actually works end to end**

Sheet'ten Kadıköy'ü seç ve şunları gözle doğrula: kapalı hal "İstanbul / Kadıköy" + iki fiyatı gösteriyor, birim maliyet satırı "Kadıköy ortalaması … TL/m²" oldu, piyasa fiyatı `satisFiyati × apartmentSize` değerine eşit, "Temizle" varsayılana döndürüyor.

- [ ] **Step 4: Verify desktop is unchanged**

Run: `git diff main --stat -- src/components/LocationSelector.tsx src/app/hesapla/page.module.css`
Expected: **çıktı boş** (iki dosya da hiç değişmemiş).

Ayrıca 1440×900'de `/hesapla` açıp il/ilçe seçimini elle dene: native `<select>`ler hâlâ orada ve çalışıyor.

- [ ] **Step 5: Clean up test data**

DB'ye geçici satır eklediysen sil. Ölçüm scripti ve PNG `.superpowers/` altında (gitignored) — commit edilmez.

- [ ] **Step 6: Final verification and commit**

Run: `npx jest --no-coverage && npx tsc --noEmit && npx eslint src && npm run build`
Expected: tüm testler PASS · tsc 0 · eslint 12 · build başarılı

Bulgu çıkıp düzelttiysen:

```bash
git add <yalnizca degistirdigin dosyalar>
git commit -m "fix(konum): canli turda bulunan <kusur> duzeltildi"
```

---

## Plan Self-Review

**Spec kapsamı:** A.1 veri dosyası → Task 2 · A.2 seed scripti → Task 2 · A.3 doğrulama → Task 2 · B.1 entegrasyon kısıtı → Task 3 · B.2 bileşen (kapalı hal) → Task 4 · B.2 (açık hal) → Task 5 · B.3 Türkçe arama → Task 1 · B.4 veri akışı → Task 6 · Sınır durumlar → Task 4 (silinmiş kayıt), Task 5 (sonuç yok, sınır aşımı), Task 6 (boş veri) · Test stratejisi 1-5 → sırasıyla Task 1, 2, 3, 4-5-6, 7. **Karşılıksız spec maddesi yok.**

**Bilinen boşluk (kasıtlı):** Gerçek ilçe rakamları insandan gelecek; Task 2 veri dosyasını boş dizi ile bırakır. Rakamlar geldiğinde yalnızca `ILCE_FIYATLARI` doldurulur ve `npm run db:seed:district-prices` koşulur — başka hiçbir dosya değişmez. `validate.test.ts`teki bütünlük testi o anda otomatik olarak gerçek veriyi denetler.

**Tip tutarlılığı:** `IlceFiyatKaydi` (Task 2) yalnızca seed tarafında; UI tarafı `DistrictPriceEntry` kullanır (`id` alanı var). `konumAra` ve `ilceKaydiBul` generic (`T extends { il: string; ilce: string }`) olduğu için ikisiyle de çalışır — bilinçli. `onSecim` imzası Task 4, 5, 6 ve `page.tsx`te aynı: `(il: string, ilce: string) => void`.
