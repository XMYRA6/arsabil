# SEO Mahalle Sayfaları Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Herkese açık, arama motorunda indekslenebilir il/ilçe/mahalle "Arsa Fiyatları" sayfaları üretmek (`/arsa-fiyatlari/...`), mevcut `AreaPriceStat`/`AreaPriceTrend`/`Neighborhood`/TÜİK demografi veri katmanını kullanarak.

**Architecture:** Yeni saf (DI'lı) modüller `src/lib/areaSeo/` altında veri toplama/eşik/slug/display-name mantığını taşır; bunları prisma'ya bağlayan ayrı "deps" dosyaları (`card.ts`/`anonCardDeps.ts` deseninin aynısı); dört yeni App Router server-component sayfası (`il`/`ilçe`/`mahalle` dizinleri + mahalle detay) `generateStaticParams`+ISR ile bu modülleri tüketir; `sitemap.ts` güncellenir.

**Tech Stack:** Next.js 16 (App Router, server components, `params: Promise<...>`), Prisma, Jest + `@testing-library/react`, TypeScript.

**Spec:** `docs/superpowers/specs/2026-09-16-seo-mahalle-sayfalari-design.md`

## Global Constraints

- Mahalle sayfası eşiği: `AreaPriceStat.sampleCount >= 8` (spec: valuation.ts'in "yuksek güven" eşiğiyle aynı). Altındaysa sayfa üretilmez (404).
- İlçe sayfası eşiği: `AreaPriceStat.sampleCount >= 5` (valuation.ts'in "orta güven" eşiğiyle aynı).
- İl sayfası eşiği: satırın var olması yeterli (aggregate.ts zaten `MIN_SAMPLE=3` altında satır üretmiyor).
- Tüm sayfalar tamamen açık — üyelik kilidi YOK.
- Karşılaştırma (comparables) yalnızca **sayı** gösterilir, tekil ilan item'ı asla dönmez/render edilmez.
- Şema değişikliği YOK — `MarketListing`'in doğru Türkçe casing'i (`cleanTrName`) runtime'da display-name kaynağı olarak kullanılır, yeni sütun eklenmez.
- `AreaPriceStat`/`AreaPriceTrend`/`Neighborhood`/`DistrictDemographics` anahtarları `normalizeAreaName()` (ASCII-katlanmış) key-space'inde; `MarketListing.il/ilce/mahalle` ise `cleanTrName()` (doğru Türkçe BÜYÜK harf, İ/I ayrımı korunur) key-space'inde — **iki farklı key-space**, birbirine göre sorgu yazarken bu asla karıştırılmaz (bkz. Task 5/6).
- `AreaPriceStat` okurken nullable alanlar (`ilce`/`mahalle`) yüzünden `findUnique({where:{il_ilce_mahalle:{...}}})` KULLANILMAZ — proje zaten bu yüzden `findFirst({where:{il,ilce,mahalle}})` deseninde (`persistAggregates.ts`). `Neighborhood`/`DistrictDemographics` alanları NOT NULL olduğu için `findUnique` compound-key güvenle kullanılabilir (mevcut `anonCardDeps.ts`/`card.ts` zaten böyle yapıyor).

---

## Task 1: `slug.ts` — Türkçe slugify

**Files:**
- Create: `src/lib/areaSeo/slug.ts`
- Test: `src/lib/areaSeo/slug.test.ts`

**Interfaces:**
- Produces: `slugify(input: string): string`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/areaSeo/slug.test.ts
import { slugify } from './slug'

describe('slugify', () => {
  it('Türkçe karakterleri ASCII\'ye katlar', () => {
    expect(slugify('Akçaabat')).toBe('akcaabat')
    expect(slugify('İyidere')).toBe('iyidere')
    expect(slugify('Iğdır')).toBe('igdir')
    expect(slugify('Şişli')).toBe('sisli')
    expect(slugify('Üsküdar')).toBe('uskudar')
    expect(slugify('Ördekli')).toBe('ordekli')
  })

  it('boşlukları tire yapar, birden fazla boşluğu tek tireye indirger', () => {
    expect(slugify('Durubinar Mahallesi')).toBe('durubinar-mahallesi')
    expect(slugify('Çok   Boşluklu   Ad')).toBe('cok-bosluklu-ad')
  })

  it('başta/sonda tire bırakmaz', () => {
    expect(slugify('  Trabzon  ')).toBe('trabzon')
  })

  it('zaten ASCII/küçük harf girdiyi bozmaz', () => {
    expect(slugify('ortahisar')).toBe('ortahisar')
  })

  it('ALL-CAPS girdiyi de doğru küçültür (normalizeAreaName çıktısı gibi)', () => {
    expect(slugify('AKÇAABAT')).toBe('akcaabat')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/lib/areaSeo/slug.test.ts`
Expected: FAIL — `Cannot find module './slug'`

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/areaSeo/slug.ts
/**
 * Türkçe il/ilçe/mahalle display adlarını URL-güvenli slug'a çevirir.
 * `normalizeAreaName`'den (ASCII-katlama, ama sadece İ/I) farklı olarak
 * TÜM Türkçe aksanlı harfleri (ç/ğ/ı/ö/ş/ü) katlar — SEO URL'i için gerekli.
 */
const TR_FOLD: Record<string, string> = {
  ç: 'c', Ç: 'c',
  ğ: 'g', Ğ: 'g',
  ı: 'i', I: 'i', İ: 'i',
  ö: 'o', Ö: 'o',
  ş: 's', Ş: 's',
  ü: 'u', Ü: 'u',
}

export function slugify(input: string): string {
  const folded = input
    .split('')
    .map((ch) => TR_FOLD[ch] ?? ch)
    .join('')
    .toLowerCase()
  return folded
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/lib/areaSeo/slug.test.ts`
Expected: PASS (5 test)

- [ ] **Step 5: Commit**

```bash
git add src/lib/areaSeo/slug.ts src/lib/areaSeo/slug.test.ts
git commit -m "feat(seo-mahalle): Türkçe slugify yardımcısı"
```

---

## Task 2: `displayName.ts` — proper-case display adı çözümleme

**Files:**
- Create: `src/lib/areaSeo/displayName.ts`
- Test: `src/lib/areaSeo/displayName.test.ts`

**Interfaces:**
- Consumes: yok (saf modül, DI ile dışarıdan veri alır)
- Produces:
  - `toTitleCase(s: string): string`
  - `areaLookupKey(il: string, ilce: string | null, mahalle: string | null): string`
  - `interface RawAreaName { il: string; ilce: string | null; mahalle: string | null }`
  - `interface AreaNameKey { il: string; ilce: string | null; mahalle: string | null }`
  - `interface ResolveDisplayNamesDeps { listDistinctMarketAreas: () => Promise<RawAreaName[]> }`
  - `resolveDisplayNames(keys: AreaNameKey[], deps: ResolveDisplayNamesDeps): Promise<Map<string, RawAreaName>>` — dönen Map'in anahtarı `areaLookupKey(key.il, key.ilce, key.mahalle)`.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/areaSeo/displayName.test.ts
import { toTitleCase, areaLookupKey, resolveDisplayNames } from './displayName'

describe('toTitleCase', () => {
  it('ALL-CAPS Türkçe girdiyi başlık-case yapar, İ/I ayrımını korur', () => {
    expect(toTitleCase('DURUBİNAR')).toBe('Durubinar')
    expect(toTitleCase('AKÇAABAT')).toBe('Akçaabat')
    expect(toTitleCase('IĞDIR')).toBe('Iğdır')
  })

  it('çok kelimeli adları kelime başına büyütür', () => {
    expect(toTitleCase('YENİ MAHALLE')).toBe('Yeni Mahalle')
  })
})

describe('areaLookupKey', () => {
  it('il/ilçe/mahalle bileşenlerini | ile birleştirir, null bileşeni boş bırakır', () => {
    expect(areaLookupKey('TRABZON', null, null)).toBe('TRABZON||')
    expect(areaLookupKey('TRABZON', 'AKCAABAT', null)).toBe('TRABZON|AKCAABAT|')
    expect(areaLookupKey('TRABZON', 'AKCAABAT', 'DURUBINAR')).toBe('TRABZON|AKCAABAT|DURUBINAR')
  })
})

describe('resolveDisplayNames', () => {
  const rawRows = [
    { il: 'Trabzon', ilce: 'Akçaabat', mahalle: 'Durubinar' },
    { il: 'Trabzon', ilce: 'Akçaabat', mahalle: 'Yıldızlı' },
    { il: 'Trabzon', ilce: 'Ortahisar', mahalle: 'Bulut' },
  ]
  const deps = { listDistinctMarketAreas: async () => rawRows }

  it('mahalle seviyesi: tam üçlü eşleşmeden doğru casing döner', async () => {
    // Not: normalizeAreaName YALNIZ İ/ı'yı katlar, ç/ğ/ö/ş/ü'yü DEĞİL —
    // normalizeAreaName('Akçaabat') === 'AKÇAABAT' (Ç kalır). Sorgu anahtarı
    // bu yüzden 'AKÇAABAT' (düz 'AKCAABAT' değil).
    const out = await resolveDisplayNames(
      [{ il: 'TRABZON', ilce: 'AKÇAABAT', mahalle: 'DURUBINAR' }],
      deps,
    )
    const v = out.get(areaLookupKey('TRABZON', 'AKÇAABAT', 'DURUBINAR'))
    expect(v).toEqual({ il: 'Trabzon', ilce: 'Akçaabat', mahalle: 'Durubinar' })
  })

  it('ilçe seviyesi: mahalle bilgisi olmadan da il+ilçe casing\'i bulunur', async () => {
    const out = await resolveDisplayNames(
      [{ il: 'TRABZON', ilce: 'AKÇAABAT', mahalle: null }],
      deps,
    )
    const v = out.get(areaLookupKey('TRABZON', 'AKÇAABAT', null))
    expect(v).toEqual({ il: 'Trabzon', ilce: 'Akçaabat', mahalle: null })
  })

  it('il seviyesi: yalnız il casing\'i bulunur', async () => {
    const out = await resolveDisplayNames([{ il: 'TRABZON', ilce: null, mahalle: null }], deps)
    const v = out.get(areaLookupKey('TRABZON', null, null))
    expect(v).toEqual({ il: 'Trabzon', ilce: null, mahalle: null })
  })

  it('eşleşen ham satır yoksa normalize anahtardan title-case üretir (fallback)', async () => {
    // 'KADIKOY' (ham kaynaksız, düz ASCII normalize anahtar) tr-TR ile
    // küçültülünce ASCII 'I' dotless 'ı'ya döner ('kadıkoy') — bu, eşleşen ham
    // satır yokken kaçınılmaz bir tahmin (İ/I/ı/i ayrımı normalize anahtarda
    // zaten kaybolmuş durumda; spec bunu kabul edilen kozmetik risk olarak
    // not düşmüştü). 'ISTANBUL'/'MODA' bu belirsizliğe girmiyor (normalizeAreaName
    // için gerçekçi çıktılar), o yüzden değişmedi.
    const out = await resolveDisplayNames(
      [{ il: 'ISTANBUL', ilce: 'KADIKOY', mahalle: 'MODA' }],
      deps,
    )
    const v = out.get(areaLookupKey('ISTANBUL', 'KADIKOY', 'MODA'))
    expect(v).toEqual({ il: 'Istanbul', ilce: 'Kadıkoy', mahalle: 'Moda' })
  })

  it('aynı normalize anahtara birden fazla ham satır düşerse İLK görüleni kullanır', async () => {
    const dupDeps = {
      listDistinctMarketAreas: async () => [
        { il: 'Trabzon', ilce: 'İyidere', mahalle: null },
        { il: 'Trabzon', ilce: 'Iyidere', mahalle: null },
      ],
    }
    const out = await resolveDisplayNames([{ il: 'TRABZON', ilce: 'IYIDERE', mahalle: null }], dupDeps)
    const v = out.get(areaLookupKey('TRABZON', 'IYIDERE', null))
    expect(v?.ilce).toBe('İyidere')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/lib/areaSeo/displayName.test.ts`
Expected: FAIL — `Cannot find module './displayName'`

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/areaSeo/displayName.ts
import { normalizeAreaName } from '@/lib/areaPrices/normalizeAreaName'

export interface RawAreaName {
  il: string
  ilce: string | null
  mahalle: string | null
}

export interface AreaNameKey {
  il: string
  ilce: string | null
  mahalle: string | null
}

export interface ResolveDisplayNamesDeps {
  listDistinctMarketAreas: () => Promise<RawAreaName[]>
}

/** tr-TR locale-aware başlık-case. "DURUBİNAR" -> "Durubinar" (İ/I ayrımı korunur). */
export function toTitleCase(s: string): string {
  return s
    .toLocaleLowerCase('tr-TR')
    .split(' ')
    .map((w) => (w.length === 0 ? w : w[0].toLocaleUpperCase('tr-TR') + w.slice(1)))
    .join(' ')
}

export function areaLookupKey(il: string, ilce: string | null, mahalle: string | null): string {
  return `${il}|${ilce ?? ''}|${mahalle ?? ''}`
}

/**
 * `AreaPriceStat` vb. tablolar `normalizeAreaName` (ASCII-katlanmış) anahtar
 * kullanıyor — gösterime uygun değil. `MarketListing` ise `cleanTrName` ile
 * doğru Türkçe BÜYÜK harf saklıyor (İ/I ayrımı korunur). Bu fonksiyon
 * normalize edilmiş anahtarları, `MarketListing`'in ham (distinct) satırlarından
 * kurduğu üç seviyeli bir indeksle (il / il+ilçe / il+ilçe+mahalle) eşleştirip
 * başlık-case display adı üretir. Eşleşen ham satır yoksa normalize anahtarın
 * kendisinden title-case üretir (fallback — İ/I ayrımı bu durumda kaybolmuş
 * olabilir, kabul edilen kozmetik risk, spec'te not düşüldü).
 */
export async function resolveDisplayNames(
  keys: AreaNameKey[],
  deps: ResolveDisplayNamesDeps,
): Promise<Map<string, RawAreaName>> {
  const raws = await deps.listDistinctMarketAreas()

  const ilIndex = new Map<string, RawAreaName>()
  const ilceIndex = new Map<string, RawAreaName>()
  const mahalleIndex = new Map<string, RawAreaName>()

  for (const r of raws) {
    if (!r.il) continue
    const ilK = normalizeAreaName(r.il)
    if (!ilIndex.has(ilK)) ilIndex.set(ilK, r)
    if (r.ilce) {
      const ilceK = `${ilK}|${normalizeAreaName(r.ilce)}`
      if (!ilceIndex.has(ilceK)) ilceIndex.set(ilceK, r)
      if (r.mahalle) {
        const mahalleK = `${ilceK}|${normalizeAreaName(r.mahalle)}`
        if (!mahalleIndex.has(mahalleK)) mahalleIndex.set(mahalleK, r)
      }
    }
  }

  const out = new Map<string, RawAreaName>()
  for (const key of keys) {
    const ilK = normalizeAreaName(key.il)
    const ilceK = key.ilce != null ? normalizeAreaName(key.ilce) : null
    const mahalleK = key.mahalle != null ? normalizeAreaName(key.mahalle) : null

    const ilRaw = ilIndex.get(ilK)
    const ilceRaw = ilceK != null ? ilceIndex.get(`${ilK}|${ilceK}`) : undefined
    const mahalleRaw =
      mahalleK != null && ilceK != null ? mahalleIndex.get(`${ilK}|${ilceK}|${mahalleK}`) : undefined

    const ilSource = ilRaw?.il ?? key.il
    const ilceSource = key.ilce == null ? null : ilceRaw?.ilce ?? mahalleRaw?.ilce ?? key.ilce
    const mahalleSource = key.mahalle == null ? null : mahalleRaw?.mahalle ?? key.mahalle

    out.set(areaLookupKey(key.il, key.ilce, key.mahalle), {
      il: toTitleCase(ilSource),
      ilce: ilceSource == null ? null : toTitleCase(ilceSource),
      mahalle: mahalleSource == null ? null : toTitleCase(mahalleSource),
    })
  }
  return out
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/lib/areaSeo/displayName.test.ts`
Expected: PASS (8 test)

- [ ] **Step 5: Commit**

```bash
git add src/lib/areaSeo/displayName.ts src/lib/areaSeo/displayName.test.ts
git commit -m "feat(seo-mahalle): normalize anahtardan doğru Türkçe display adı çözümleme"
```

---

## Task 3: `listSeoAreas.ts` — eşik filtresi + slug + display birleşimi

**Files:**
- Create: `src/lib/areaSeo/listSeoAreas.ts`
- Test: `src/lib/areaSeo/listSeoAreas.test.ts`

**Interfaces:**
- Consumes: `slugify` (Task 1), `resolveDisplayNames`/`areaLookupKey`/`RawAreaName` (Task 2)
- Produces:
  - `interface AreaPriceStatScopeRow { il: string; ilce: string | null; mahalle: string | null; sampleCount: number }`
  - `interface SeoAreaEntry { scope: 'il'|'ilce'|'mahalle'; ilNorm: string; ilceNorm: string|null; mahalleNorm: string|null; ilSlug: string; ilceSlug: string|null; mahalleSlug: string|null; ilDisplay: string; ilceDisplay: string|null; mahalleDisplay: string|null; sampleCount: number }`
  - `interface ListSeoAreasDeps { findAreaPriceStats: (scope: 'il'|'ilce'|'mahalle') => Promise<AreaPriceStatScopeRow[]>; listDistinctMarketAreas: () => Promise<RawAreaName[]> }`
  - `listSeoAreas(scope: 'il'|'ilce'|'mahalle', deps: ListSeoAreasDeps): Promise<SeoAreaEntry[]>`
  - `findBySlug(entries: SeoAreaEntry[], slugs: { il: string; ilce?: string; mahalle?: string }): SeoAreaEntry | undefined`
  - Not: `SeoAreaEntry`, `AreaSeoKey`'in (Task 5) tüm alanlarını (scope/ilNorm/ilceNorm/mahalleNorm) taşıdığı için sonraki tasklarda doğrudan `AreaSeoKey` beklenen yere geçirilebilir (TS yapısal tipleme, ekstra alan sorun çıkarmaz).

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/areaSeo/listSeoAreas.test.ts
import { listSeoAreas, findBySlug, type SeoAreaEntry } from './listSeoAreas'

describe('listSeoAreas', () => {
  it('mahalle seviyesinde sampleCount<8 olanları eler', async () => {
    const deps = {
      findAreaPriceStats: async () => [
        { il: 'TRABZON', ilce: 'AKCAABAT', mahalle: 'DURUBINAR', sampleCount: 8 },
        { il: 'TRABZON', ilce: 'AKCAABAT', mahalle: 'YILDIZLI', sampleCount: 3 },
      ],
      listDistinctMarketAreas: async () => [
        { il: 'Trabzon', ilce: 'Akçaabat', mahalle: 'Durubinar' },
        { il: 'Trabzon', ilce: 'Akçaabat', mahalle: 'Yıldızlı' },
      ],
    }
    const out = await listSeoAreas('mahalle', deps)
    expect(out.map((e) => e.mahalleNorm)).toEqual(['DURUBINAR'])
  })

  it('ilçe seviyesinde sampleCount<5 olanları eler', async () => {
    const deps = {
      findAreaPriceStats: async () => [
        { il: 'TRABZON', ilce: 'AKCAABAT', mahalle: null, sampleCount: 5 },
        { il: 'TRABZON', ilce: 'ORTAHISAR', mahalle: null, sampleCount: 4 },
      ],
      listDistinctMarketAreas: async () => [
        { il: 'Trabzon', ilce: 'Akçaabat', mahalle: null },
        { il: 'Trabzon', ilce: 'Ortahisar', mahalle: null },
      ],
    }
    const out = await listSeoAreas('ilce', deps)
    expect(out.map((e) => e.ilceNorm)).toEqual(['AKCAABAT'])
  })

  it('il seviyesinde eşik yok, satır varsa dahil edilir', async () => {
    const deps = {
      findAreaPriceStats: async () => [{ il: 'TRABZON', ilce: null, mahalle: null, sampleCount: 3 }],
      listDistinctMarketAreas: async () => [{ il: 'Trabzon', ilce: null, mahalle: null }],
    }
    const out = await listSeoAreas('il', deps)
    expect(out.map((e) => e.ilNorm)).toEqual(['TRABZON'])
  })

  it('slug ve display alanlarını doğru üretir', async () => {
    // Not: normalizeAreaName ç'yi katlamaz — normalizeAreaName('Akçaabat')
    // === 'AKÇAABAT', 'AKCAABAT' değil. AreaPriceStat satırı da bu yüzden
    // 'AKÇAABAT' taşır (gerçek pipeline'da bu satır normalizeAreaName'den
    // geçmiş MarketListing verisinden üretilir).
    const deps = {
      findAreaPriceStats: async () => [
        { il: 'TRABZON', ilce: 'AKÇAABAT', mahalle: 'DURUBINAR', sampleCount: 10 },
      ],
      listDistinctMarketAreas: async () => [{ il: 'Trabzon', ilce: 'Akçaabat', mahalle: 'Durubinar' }],
    }
    const [entry] = await listSeoAreas('mahalle', deps)
    expect(entry).toEqual({
      scope: 'mahalle',
      ilNorm: 'TRABZON',
      ilceNorm: 'AKÇAABAT',
      mahalleNorm: 'DURUBINAR',
      ilSlug: 'trabzon',
      ilceSlug: 'akcaabat',
      mahalleSlug: 'durubinar',
      ilDisplay: 'Trabzon',
      ilceDisplay: 'Akçaabat',
      mahalleDisplay: 'Durubinar',
      sampleCount: 10,
    })
  })

  it('iki farklı anahtar aynı slug\'a düşerse ikincisini atlar (uyarı loglar)', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
    const deps = {
      findAreaPriceStats: async () => [
        { il: 'TRABZON', ilce: 'AKCAABAT', mahalle: null, sampleCount: 10 },
        { il: 'TRABZON', ilce: 'AKÇAABAT', mahalle: null, sampleCount: 10 }, // farklı normalize anahtar, aynı slug
      ],
      listDistinctMarketAreas: async () => [
        { il: 'Trabzon', ilce: 'Akcaabat', mahalle: null },
        { il: 'Trabzon', ilce: 'Akçaabat', mahalle: null },
      ],
    }
    const out = await listSeoAreas('ilce', deps)
    expect(out).toHaveLength(1)
    expect(warnSpy).toHaveBeenCalled()
    warnSpy.mockRestore()
  })
})

describe('findBySlug', () => {
  const entries: SeoAreaEntry[] = [
    {
      scope: 'mahalle', ilNorm: 'TRABZON', ilceNorm: 'AKCAABAT', mahalleNorm: 'DURUBINAR',
      ilSlug: 'trabzon', ilceSlug: 'akcaabat', mahalleSlug: 'durubinar',
      ilDisplay: 'Trabzon', ilceDisplay: 'Akçaabat', mahalleDisplay: 'Durubinar', sampleCount: 10,
    },
    {
      scope: 'il', ilNorm: 'TRABZON', ilceNorm: null, mahalleNorm: null,
      ilSlug: 'trabzon', ilceSlug: null, mahalleSlug: null,
      ilDisplay: 'Trabzon', ilceDisplay: null, mahalleDisplay: null, sampleCount: 10,
    },
  ]

  it('tam mahalle slug eşleşmesini bulur', () => {
    const found = findBySlug(entries, { il: 'trabzon', ilce: 'akcaabat', mahalle: 'durubinar' })
    expect(found?.mahalleNorm).toBe('DURUBINAR')
  })

  it('il-only slug eşleşmesini bulur (ilçe/mahalle yok)', () => {
    const found = findBySlug(entries, { il: 'trabzon' })
    expect(found?.scope).toBe('il')
  })

  it('eşleşme yoksa undefined döner', () => {
    expect(findBySlug(entries, { il: 'istanbul' })).toBeUndefined()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/lib/areaSeo/listSeoAreas.test.ts`
Expected: FAIL — `Cannot find module './listSeoAreas'`

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/areaSeo/listSeoAreas.ts
import { slugify } from './slug'
import { resolveDisplayNames, areaLookupKey, type RawAreaName } from './displayName'

export type SeoScope = 'il' | 'ilce' | 'mahalle'

export interface AreaPriceStatScopeRow {
  il: string
  ilce: string | null
  mahalle: string | null
  sampleCount: number
}

export interface SeoAreaEntry {
  scope: SeoScope
  ilNorm: string
  ilceNorm: string | null
  mahalleNorm: string | null
  ilSlug: string
  ilceSlug: string | null
  mahalleSlug: string | null
  ilDisplay: string
  ilceDisplay: string | null
  mahalleDisplay: string | null
  sampleCount: number
}

export interface ListSeoAreasDeps {
  findAreaPriceStats: (scope: SeoScope) => Promise<AreaPriceStatScopeRow[]>
  listDistinctMarketAreas: () => Promise<RawAreaName[]>
}

const MIN_SAMPLE: Record<SeoScope, number> = { il: 0, ilce: 5, mahalle: 8 }

export async function listSeoAreas(scope: SeoScope, deps: ListSeoAreasDeps): Promise<SeoAreaEntry[]> {
  const rows = await deps.findAreaPriceStats(scope)
  const min = MIN_SAMPLE[scope]
  const eligible = rows.filter((r) => r.sampleCount >= min)

  const displayMap = await resolveDisplayNames(
    eligible.map((r) => ({ il: r.il, ilce: r.ilce, mahalle: r.mahalle })),
    deps,
  )

  const slugSeen = new Map<string, string>()
  const out: SeoAreaEntry[] = []
  for (const r of eligible) {
    const key = areaLookupKey(r.il, r.ilce, r.mahalle)
    const disp = displayMap.get(key)!
    const ilSlug = slugify(disp.il)
    const ilceSlug = disp.ilce != null ? slugify(disp.ilce) : null
    const mahalleSlug = disp.mahalle != null ? slugify(disp.mahalle) : null
    const fullSlug = [ilSlug, ilceSlug, mahalleSlug].filter(Boolean).join('/')

    const prevKey = slugSeen.get(fullSlug)
    if (prevKey && prevKey !== key) {
      console.warn(
        `[areaSeo] slug çakışması: "${fullSlug}" hem "${prevKey}" hem "${key}" için üretildi — ikincisi atlandı`,
      )
      continue
    }
    slugSeen.set(fullSlug, key)

    out.push({
      scope,
      ilNorm: r.il,
      ilceNorm: r.ilce,
      mahalleNorm: r.mahalle,
      ilSlug,
      ilceSlug,
      mahalleSlug,
      ilDisplay: disp.il,
      ilceDisplay: disp.ilce,
      mahalleDisplay: disp.mahalle,
      sampleCount: r.sampleCount,
    })
  }
  return out
}

export function findBySlug(
  entries: SeoAreaEntry[],
  slugs: { il: string; ilce?: string; mahalle?: string },
): SeoAreaEntry | undefined {
  return entries.find(
    (e) =>
      e.ilSlug === slugs.il &&
      (slugs.ilce === undefined ? e.ilceSlug == null : e.ilceSlug === slugs.ilce) &&
      (slugs.mahalle === undefined ? e.mahalleSlug == null : e.mahalleSlug === slugs.mahalle),
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/lib/areaSeo/listSeoAreas.test.ts`
Expected: PASS (8 test)

- [ ] **Step 5: Commit**

```bash
git add src/lib/areaSeo/listSeoAreas.ts src/lib/areaSeo/listSeoAreas.test.ts
git commit -m "feat(seo-mahalle): eşik filtreli il/ilçe/mahalle SEO alan listesi"
```

---

## Task 4: `seoAreaDeps.ts` — prisma bağlama (listSeoAreas için)

**Files:**
- Create: `src/lib/areaSeo/seoAreaDeps.ts`
- Test: `src/lib/areaSeo/seoAreaDeps.test.ts`

**Interfaces:**
- Consumes: `ListSeoAreasDeps`, `AreaPriceStatScopeRow`, `SeoScope`, `listSeoAreas` (Task 3), `RawAreaName` (Task 2)
- Produces:
  - `createSeoAreaDeps(): ListSeoAreasDeps`
  - `getSeoAreas(scope: SeoScope): Promise<SeoAreaEntry[]>` — `react`'in `cache()`'i ile sarılmış, aynı request içinde tekrar çağrılırsa DB'ye ikinci kez gitmez.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/areaSeo/seoAreaDeps.test.ts
const areaPriceStat = { findMany: jest.fn() }
const marketListing = { findMany: jest.fn() }
jest.mock('@/lib/prisma', () => ({ prisma: { areaPriceStat, marketListing } }))
jest.mock('react', () => ({ cache: (fn: unknown) => fn }))

import { createSeoAreaDeps } from './seoAreaDeps'

beforeEach(() => {
  areaPriceStat.findMany.mockReset()
  marketListing.findMany.mockReset()
})

describe('createSeoAreaDeps', () => {
  it('findAreaPriceStats — scope filtresiyle sorgular', async () => {
    areaPriceStat.findMany.mockResolvedValue([{ il: 'TRABZON', ilce: null, mahalle: null, sampleCount: 3 }])
    const deps = createSeoAreaDeps()
    const out = await deps.findAreaPriceStats('il')
    expect(out).toEqual([{ il: 'TRABZON', ilce: null, mahalle: null, sampleCount: 3 }])
    const arg = areaPriceStat.findMany.mock.calls[0][0]
    expect(arg.where.scope).toBe('il')
  })

  it('listDistinctMarketAreas — distinct il/ilce/mahalle çeker, il=null olanları eler', async () => {
    marketListing.findMany.mockResolvedValue([
      { il: 'Trabzon', ilce: 'Akçaabat', mahalle: 'Durubinar' },
      { il: null, ilce: null, mahalle: null },
    ])
    const deps = createSeoAreaDeps()
    const out = await deps.listDistinctMarketAreas()
    expect(out).toEqual([{ il: 'Trabzon', ilce: 'Akçaabat', mahalle: 'Durubinar' }])
    const arg = marketListing.findMany.mock.calls[0][0]
    expect(arg.distinct).toEqual(['il', 'ilce', 'mahalle'])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/lib/areaSeo/seoAreaDeps.test.ts`
Expected: FAIL — `Cannot find module './seoAreaDeps'`

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/areaSeo/seoAreaDeps.ts
import { cache } from 'react'
import { prisma } from '@/lib/prisma'
import { listSeoAreas, type ListSeoAreasDeps, type AreaPriceStatScopeRow, type SeoScope, type SeoAreaEntry } from './listSeoAreas'
import type { RawAreaName } from './displayName'

export function createSeoAreaDeps(): ListSeoAreasDeps {
  return {
    findAreaPriceStats: async (scope): Promise<AreaPriceStatScopeRow[]> => {
      const rows = await prisma.areaPriceStat.findMany({
        where: { scope },
        select: { il: true, ilce: true, mahalle: true, sampleCount: true },
      })
      return rows
    },
    listDistinctMarketAreas: async (): Promise<RawAreaName[]> => {
      const rows = await prisma.marketListing.findMany({
        where: { il: { not: null } },
        distinct: ['il', 'ilce', 'mahalle'],
        select: { il: true, ilce: true, mahalle: true },
      })
      return rows.filter((r): r is RawAreaName => r.il != null)
    },
  }
}

/**
 * Aynı request içinde birden çok kez çağrılabilir (örn. bir sayfa hem kendi
 * girdisini bulmak hem kardeş alanları listelemek için) — `cache()` ile
 * sarılı olduğundan tekrar DB'ye gitmez. `scope` primitif olduğu için
 * React'in argüman-eşitliği memoizasyonu güvenle çalışır.
 */
export const getSeoAreas = cache((scope: SeoScope): Promise<SeoAreaEntry[]> =>
  listSeoAreas(scope, createSeoAreaDeps()),
)
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/lib/areaSeo/seoAreaDeps.test.ts`
Expected: PASS (2 test)

- [ ] **Step 5: Commit**

```bash
git add src/lib/areaSeo/seoAreaDeps.ts src/lib/areaSeo/seoAreaDeps.test.ts
git commit -m "feat(seo-mahalle): listSeoAreas için prisma bağlaması + request-cache"
```

---

## Task 5: `areaSeoCard.ts` — bir alan için içerik kartı (saf, DI'lı)

**Files:**
- Create: `src/lib/areaSeo/areaSeoCard.ts`
- Test: `src/lib/areaSeo/areaSeoCard.test.ts`

**Interfaces:**
- Consumes: `priceTrend`/`TrendRow`/`PriceTrendPoint` (`@/lib/deger/priceTrend`), `polygonCentroid`/`GeoJSONGeometryLike` (`@/lib/geo/polygonCentroid`), `summarizeDemographics` (`@/lib/demografi/summarize`), `DistrictDemographicsRecord` (`@/lib/demografi/types`)
- Produces:
  - `interface AreaSeoKey { scope: 'il'|'ilce'|'mahalle'; ilNorm: string; ilceNorm: string|null; mahalleNorm: string|null }` (Task 3'ün `SeoAreaEntry`'si yapısal olarak bunu karşılar, ayrı dönüşüm gerekmez)
  - `interface AreaSeoStat { medianPricePerSqm: number; p25: number; p75: number; sampleCount: number }`
  - `interface AreaSeoCardDTO { stat: AreaSeoStat; priceTrend?: {...}; demographics?: {...}; comparableCount: number; risk?: { faultDistanceM: number|null; floodQ100: boolean|null } }`
  - `interface AreaSeoCardDeps { findOwnStat, findTrendRows, findDistrictDemographics, countComparables, findNeighborhoodGeojson, buildRiskSnapshot }`
  - `buildAreaSeoCard(key: AreaSeoKey, deps: AreaSeoCardDeps): Promise<AreaSeoCardDTO | null>` — `findOwnStat` `null` dönerse (satır bulunamadı) `null` döner.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/areaSeo/areaSeoCard.test.ts
import { buildAreaSeoCard, type AreaSeoCardDeps, type AreaSeoKey } from './areaSeoCard'

const mahalleKey: AreaSeoKey = { scope: 'mahalle', ilNorm: 'TRABZON', ilceNorm: 'AKCAABAT', mahalleNorm: 'DURUBINAR' }
const ilceKey: AreaSeoKey = { scope: 'ilce', ilNorm: 'TRABZON', ilceNorm: 'AKCAABAT', mahalleNorm: null }
const ilKey: AreaSeoKey = { scope: 'il', ilNorm: 'TRABZON', ilceNorm: null, mahalleNorm: null }

function baseDeps(overrides: Partial<AreaSeoCardDeps> = {}): AreaSeoCardDeps {
  return {
    findOwnStat: async () => ({ medianPricePerSqm: 1000, p25: 800, p75: 1300, sampleCount: 10 }),
    findTrendRows: async () => [],
    findDistrictDemographics: async () => null,
    countComparables: async () => 0,
    findNeighborhoodGeojson: async () => null,
    buildRiskSnapshot: async () => ({ faultDistanceM: null, floodQ100: null }),
    ...overrides,
  }
}

describe('buildAreaSeoCard', () => {
  it('kendi istatistik satırı yoksa null döner', async () => {
    const out = await buildAreaSeoCard(mahalleKey, baseDeps({ findOwnStat: async () => null }))
    expect(out).toBeNull()
  })

  it('stat + varsayılan (trend/demografi/risk yok) durumu doğru kurar', async () => {
    const out = await buildAreaSeoCard(ilKey, baseDeps({ countComparables: async () => 7 }))
    expect(out).toEqual({
      stat: { medianPricePerSqm: 1000, p25: 800, p75: 1300, sampleCount: 10 },
      comparableCount: 7,
    })
  })

  it('yeterli trend verisi varsa priceTrend alanını doldurur', async () => {
    const rows = [
      { scope: 'il' as const, monthBucket: new Date('2026-01-01'), medianPricePerSqm: 900, sampleCount: 10 },
      { scope: 'il' as const, monthBucket: new Date('2026-02-01'), medianPricePerSqm: 950, sampleCount: 10 },
      { scope: 'il' as const, monthBucket: new Date('2026-03-01'), medianPricePerSqm: 1000, sampleCount: 10 },
    ]
    const out = await buildAreaSeoCard(ilKey, baseDeps({ findTrendRows: async () => rows }))
    expect(out?.priceTrend?.points).toHaveLength(3)
  })

  it('ilçe seviyesinde demografi varsa demographics alanını doldurur', async () => {
    const out = await buildAreaSeoCard(
      ilceKey,
      baseDeps({
        findDistrictDemographics: async () => ({
          dataYear: 2025, population: 12000, populationGrowthPerMille: 5, medianAge: 38, avgHouseholdSize: 2.8,
        }),
      }),
    )
    expect(out?.demographics?.population).toBe(12000)
    expect(out?.demographics?.summary).not.toBeNull()
  })

  it('il seviyesinde findDistrictDemographics HİÇ çağrılmaz (ilçe bilgisi yok)', async () => {
    const spy = jest.fn(async () => null)
    await buildAreaSeoCard(ilKey, baseDeps({ findDistrictDemographics: spy }))
    expect(spy).not.toHaveBeenCalled()
  })

  it('mahalle seviyesinde geojson varsa risk snapshot çağrılır ve sonuç eklenir', async () => {
    const out = await buildAreaSeoCard(
      mahalleKey,
      baseDeps({
        findNeighborhoodGeojson: async () => ({
          type: 'Polygon',
          coordinates: [[[39.0, 41.0], [39.1, 41.0], [39.1, 41.1], [39.0, 41.0]]],
        }),
        buildRiskSnapshot: async () => ({ faultDistanceM: 1200, floodQ100: false }),
      }),
    )
    expect(out?.risk).toEqual({ faultDistanceM: 1200, floodQ100: false })
  })

  it('mahalle seviyesinde geojson yoksa risk hiç eklenmez, buildRiskSnapshot çağrılmaz', async () => {
    const spy = jest.fn(async () => ({ faultDistanceM: 1, floodQ100: false }))
    const out = await buildAreaSeoCard(mahalleKey, baseDeps({ findNeighborhoodGeojson: async () => null, buildRiskSnapshot: spy }))
    expect(out?.risk).toBeUndefined()
    expect(spy).not.toHaveBeenCalled()
  })

  it('il/ilçe seviyesinde risk hiç hesaplanmaz (findNeighborhoodGeojson çağrılmaz)', async () => {
    const spy = jest.fn(async () => null)
    await buildAreaSeoCard(ilceKey, baseDeps({ findNeighborhoodGeojson: spy }))
    expect(spy).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/lib/areaSeo/areaSeoCard.test.ts`
Expected: FAIL — `Cannot find module './areaSeoCard'`

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/areaSeo/areaSeoCard.ts
import { priceTrend, type TrendRow, type PriceTrendPoint } from '@/lib/deger/priceTrend'
import { polygonCentroid, type GeoJSONGeometryLike } from '@/lib/geo/polygonCentroid'
import { summarizeDemographics } from '@/lib/demografi/summarize'
import type { DistrictDemographicsRecord } from '@/lib/demografi/types'

export interface AreaSeoKey {
  scope: 'il' | 'ilce' | 'mahalle'
  ilNorm: string
  ilceNorm: string | null
  mahalleNorm: string | null
}

export interface AreaSeoStat {
  medianPricePerSqm: number
  p25: number
  p75: number
  sampleCount: number
}

export interface AreaSeoRiskInfo {
  faultDistanceM: number | null
  floodQ100: boolean | null
}

export interface AreaSeoCardDTO {
  stat: AreaSeoStat
  priceTrend?: { points: PriceTrendPoint[]; changePct3m: number | null; thinTrend: boolean }
  demographics?: {
    dataYear: number
    population: number | null
    populationGrowthPerMille: number | null
    medianAge: number | null
    avgHouseholdSize: number | null
    summary: string | null
  }
  comparableCount: number
  risk?: AreaSeoRiskInfo
}

export interface AreaSeoCardDeps {
  findOwnStat: (key: AreaSeoKey) => Promise<AreaSeoStat | null>
  findTrendRows: (key: AreaSeoKey) => Promise<TrendRow[]>
  findDistrictDemographics: (ilNorm: string, ilceNorm: string) => Promise<DistrictDemographicsRecord | null>
  countComparables: (key: AreaSeoKey) => Promise<number>
  findNeighborhoodGeojson: (key: AreaSeoKey) => Promise<unknown | null>
  buildRiskSnapshot: (lat: number | null, lng: number | null) => Promise<AreaSeoRiskInfo>
}

export async function buildAreaSeoCard(key: AreaSeoKey, deps: AreaSeoCardDeps): Promise<AreaSeoCardDTO | null> {
  const stat = await deps.findOwnStat(key)
  if (!stat) return null

  const [trendRows, comparableCount, demo] = await Promise.all([
    deps.findTrendRows(key),
    deps.countComparables(key),
    key.ilceNorm ? deps.findDistrictDemographics(key.ilNorm, key.ilceNorm) : Promise.resolve(null),
  ])

  const trend = priceTrend(trendRows, { now: new Date() })

  let risk: AreaSeoRiskInfo | undefined
  if (key.scope === 'mahalle') {
    const geojson = await deps.findNeighborhoodGeojson(key)
    if (geojson) {
      const center = polygonCentroid(geojson as GeoJSONGeometryLike)
      if (center) {
        const snap = await deps.buildRiskSnapshot(center.lat, center.lng)
        if (snap.faultDistanceM != null || snap.floodQ100 != null) {
          risk = snap
        }
      }
    }
  }

  return {
    stat,
    ...(trend.insufficientTrend
      ? {}
      : {
          priceTrend: {
            points: trend.points!,
            changePct3m: trend.changePct3m ?? null,
            thinTrend: trend.thinTrend ?? false,
          },
        }),
    ...(demo
      ? {
          demographics: {
            dataYear: demo.dataYear,
            population: demo.population,
            populationGrowthPerMille: demo.populationGrowthPerMille,
            medianAge: demo.medianAge,
            avgHouseholdSize: demo.avgHouseholdSize,
            summary: summarizeDemographics(demo).sentence,
          },
        }
      : {}),
    comparableCount,
    ...(risk ? { risk } : {}),
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/lib/areaSeo/areaSeoCard.test.ts`
Expected: PASS (8 test)

- [ ] **Step 5: Commit**

```bash
git add src/lib/areaSeo/areaSeoCard.ts src/lib/areaSeo/areaSeoCard.test.ts
git commit -m "feat(seo-mahalle): il/ilçe/mahalle içerik kartı oluşturucu"
```

---

## Task 6: `areaSeoCardDeps.ts` — prisma bağlama (areaSeoCard için)

**Files:**
- Create: `src/lib/areaSeo/areaSeoCardDeps.ts`
- Test: `src/lib/areaSeo/areaSeoCardDeps.test.ts`

**Interfaces:**
- Consumes: `AreaSeoCardDeps`/`AreaSeoKey`/`AreaSeoStat` (Task 5), `normalizeAreaName` (`@/lib/areaPrices/normalizeAreaName`), `ARSA_LISTING_TYPES` (`@/lib/areaPrices/aggregate`), `buildRiskSnapshot` (`@/lib/risk/riskSnapshot`), `TrendRow` (`@/lib/deger/priceTrend`)
- Produces: `createAreaSeoCardDeps(): AreaSeoCardDeps`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/areaSeo/areaSeoCardDeps.test.ts
const areaPriceStat = { findFirst: jest.fn() }
const areaPriceTrend = { findMany: jest.fn() }
const districtDemographics = { findUnique: jest.fn() }
const marketListing = { findMany: jest.fn() }
const neighborhood = { findUnique: jest.fn() }
jest.mock('@/lib/prisma', () => ({
  prisma: { areaPriceStat, areaPriceTrend, districtDemographics, marketListing, neighborhood },
}))
jest.mock('@/lib/risk/riskSnapshot', () => ({ buildRiskSnapshot: 'BRS' }))

import { createAreaSeoCardDeps } from './areaSeoCardDeps'
import type { AreaSeoKey } from './areaSeoCard'

const mahalleKey: AreaSeoKey = { scope: 'mahalle', ilNorm: 'TRABZON', ilceNorm: 'AKCAABAT', mahalleNorm: 'DURUBINAR' }
const ilceKey: AreaSeoKey = { scope: 'ilce', ilNorm: 'TRABZON', ilceNorm: 'AKCAABAT', mahalleNorm: null }
const ilKey: AreaSeoKey = { scope: 'il', ilNorm: 'TRABZON', ilceNorm: null, mahalleNorm: null }

beforeEach(() => {
  areaPriceStat.findFirst.mockReset()
  areaPriceTrend.findMany.mockReset()
  districtDemographics.findUnique.mockReset()
  marketListing.findMany.mockReset()
  neighborhood.findUnique.mockReset()
})

describe('createAreaSeoCardDeps', () => {
  it('buildRiskSnapshot olduğu gibi geçirilir', () => {
    expect(createAreaSeoCardDeps().buildRiskSnapshot).toBe('BRS')
  })

  it('findOwnStat — findFirst kullanır (findUnique DEĞİL, nullable alan riski)', async () => {
    areaPriceStat.findFirst.mockResolvedValue({ medianPricePerSqm: 1, p25: 1, p75: 1, sampleCount: 1 })
    await createAreaSeoCardDeps().findOwnStat(mahalleKey)
    const arg = areaPriceStat.findFirst.mock.calls[0][0]
    expect(arg.where).toEqual({ il: 'TRABZON', ilce: 'AKCAABAT', mahalle: 'DURUBINAR' })
  })

  it('findOwnStat — satır yoksa null döner', async () => {
    areaPriceStat.findFirst.mockResolvedValue(null)
    expect(await createAreaSeoCardDeps().findOwnStat(ilKey)).toBeNull()
  })

  it('findTrendRows — mahalle seviyesinde üç kademeli OR sorgular', async () => {
    areaPriceTrend.findMany.mockResolvedValue([])
    await createAreaSeoCardDeps().findTrendRows(mahalleKey)
    const arg = areaPriceTrend.findMany.mock.calls[0][0]
    expect(arg.where.il).toBe('TRABZON')
    expect(arg.where.OR).toEqual([
      { ilce: null, mahalle: null },
      { ilce: 'AKCAABAT', mahalle: null },
      { ilce: 'AKCAABAT', mahalle: 'DURUBINAR' },
    ])
  })

  it('findTrendRows — ilçe seviyesinde iki kademeli OR sorgular (mahalle yok)', async () => {
    areaPriceTrend.findMany.mockResolvedValue([])
    await createAreaSeoCardDeps().findTrendRows(ilceKey)
    const arg = areaPriceTrend.findMany.mock.calls[0][0]
    expect(arg.where.OR).toEqual([{ ilce: null, mahalle: null }, { ilce: 'AKCAABAT', mahalle: null }])
  })

  it('findTrendRows — il seviyesinde yalnız il satırını sorgular', async () => {
    areaPriceTrend.findMany.mockResolvedValue([])
    await createAreaSeoCardDeps().findTrendRows(ilKey)
    const arg = areaPriceTrend.findMany.mock.calls[0][0]
    expect(arg.where.OR).toEqual([{ ilce: null, mahalle: null }])
  })

  it('findDistrictDemographics — il_ilce compound key, hata olursa null', async () => {
    districtDemographics.findUnique.mockRejectedValue(new Error('migrate edilmemiş'))
    const out = await createAreaSeoCardDeps().findDistrictDemographics('TRABZON', 'AKCAABAT')
    expect(out).toBeNull()
  })

  it('countComparables — geniş aday kümesi çeker, normalizeAreaName ile uygulama katmanında filtreler', async () => {
    // Not: mahalleKey.ilceNorm = 'AKCAABAT' (düz C) — normalizeAreaName ç'yi
    // katlamadığı için burada 'Akcaabat' (cedillasız ham yazım) kullanılıyor,
    // normalizeAreaName('Akcaabat') === 'AKCAABAT' ile birebir eşleşsin diye.
    marketListing.findMany.mockResolvedValue([
      { il: 'Trabzon', ilce: 'Akcaabat', mahalle: 'Durubinar' }, // eşleşir
      { il: 'Trabzon', ilce: 'Akcaabat', mahalle: 'Yıldızlı' }, // farklı mahalle
      { il: 'Trabzon', ilce: 'Ortahisar', mahalle: 'Durubinar' }, // farklı ilçe
      { il: null, ilce: null, mahalle: null },
    ])
    const out = await createAreaSeoCardDeps().countComparables(mahalleKey)
    expect(out).toBe(1)
  })

  it('findNeighborhoodGeojson — yalnız mahalle seviyesinde sorgular, diğerlerinde null döner', async () => {
    neighborhood.findUnique.mockResolvedValue({ geojson: { type: 'Polygon' } })
    expect(await createAreaSeoCardDeps().findNeighborhoodGeojson(mahalleKey)).toEqual({ type: 'Polygon' })
    expect(await createAreaSeoCardDeps().findNeighborhoodGeojson(ilceKey)).toBeNull()
    expect(await createAreaSeoCardDeps().findNeighborhoodGeojson(ilKey)).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/lib/areaSeo/areaSeoCardDeps.test.ts`
Expected: FAIL — `Cannot find module './areaSeoCardDeps'`

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/areaSeo/areaSeoCardDeps.ts
import { prisma } from '@/lib/prisma'
import { normalizeAreaName } from '@/lib/areaPrices/normalizeAreaName'
import { ARSA_LISTING_TYPES } from '@/lib/areaPrices/aggregate'
import { buildRiskSnapshot } from '@/lib/risk/riskSnapshot'
import type { TrendRow } from '@/lib/deger/priceTrend'
import type { AreaSeoCardDeps, AreaSeoKey, AreaSeoStat } from './areaSeoCard'

function trendScopeFilters(key: AreaSeoKey) {
  if (key.scope === 'mahalle') {
    return [
      { ilce: null, mahalle: null },
      { ilce: key.ilceNorm, mahalle: null },
      { ilce: key.ilceNorm, mahalle: key.mahalleNorm },
    ]
  }
  if (key.scope === 'ilce') {
    return [{ ilce: null, mahalle: null }, { ilce: key.ilceNorm, mahalle: null }]
  }
  return [{ ilce: null, mahalle: null }]
}

export function createAreaSeoCardDeps(): AreaSeoCardDeps {
  return {
    buildRiskSnapshot,

    findOwnStat: async (key): Promise<AreaSeoStat | null> => {
      // findUnique(il_ilce_mahalle) KULLANILMAZ: ilce/mahalle nullable —
      // proje zaten bu yüzden findFirst kullanıyor (persistAggregates.ts).
      const row = await prisma.areaPriceStat.findFirst({
        where: { il: key.ilNorm, ilce: key.ilceNorm, mahalle: key.mahalleNorm },
        select: { medianPricePerSqm: true, p25: true, p75: true, sampleCount: true },
      })
      return row
    },

    findTrendRows: async (key): Promise<TrendRow[]> => {
      const windowStart = new Date()
      windowStart.setUTCMonth(windowStart.getUTCMonth() - 11, 1)
      windowStart.setUTCHours(0, 0, 0, 0)
      const rows = await prisma.areaPriceTrend.findMany({
        where: { il: key.ilNorm, monthBucket: { gte: windowStart }, OR: trendScopeFilters(key) },
        select: { scope: true, monthBucket: true, medianPricePerSqm: true, sampleCount: true },
      })
      return rows as TrendRow[]
    },

    findDistrictDemographics: async (ilNorm, ilceNorm) => {
      try {
        return await prisma.districtDemographics.findUnique({
          where: { il_ilce: { il: ilNorm, ilce: ilceNorm } },
          select: { dataYear: true, population: true, populationGrowthPerMille: true, medianAge: true, avgHouseholdSize: true },
        })
      } catch {
        return null // DistrictDemographics henüz migrate edilmemişse sayfayı düşürme
      }
    },

    /**
     * MarketListing `normalizeAreaName` DEĞİL `cleanTrName` (doğru Türkçe
     * BÜYÜK harf, İ/I ayrımı korunur) key-space'inde — DB eşitliği bizim
     * normalize anahtarımızla birebir tutmayabilir. Geniş bir aday kümesi
     * çekilip uygulama katmanında `normalizeAreaName` ile filtrelenir
     * (aynı desen: anonCardDeps.ts:findListingsNear).
     */
    countComparables: async (key): Promise<number> => {
      const rows = await prisma.marketListing.findMany({
        where: { status: 'active', listingType: { in: [...ARSA_LISTING_TYPES] }, il: { not: null } },
        select: { il: true, ilce: true, mahalle: true },
        take: 5000,
      })
      return rows.filter((r) => {
        if (r.il == null || normalizeAreaName(r.il) !== key.ilNorm) return false
        if (key.ilceNorm != null && (r.ilce == null || normalizeAreaName(r.ilce) !== key.ilceNorm)) return false
        if (key.mahalleNorm != null && (r.mahalle == null || normalizeAreaName(r.mahalle) !== key.mahalleNorm)) return false
        return true
      }).length
    },

    findNeighborhoodGeojson: async (key): Promise<unknown | null> => {
      if (key.scope !== 'mahalle' || key.ilceNorm == null || key.mahalleNorm == null) return null
      const row = await prisma.neighborhood.findUnique({
        where: { il_ilce_mahalle: { il: key.ilNorm, ilce: key.ilceNorm, mahalle: key.mahalleNorm } },
        select: { geojson: true },
      })
      return row?.geojson ?? null
    },
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/lib/areaSeo/areaSeoCardDeps.test.ts`
Expected: PASS (9 test)

- [ ] **Step 5: Commit**

```bash
git add src/lib/areaSeo/areaSeoCardDeps.ts src/lib/areaSeo/areaSeoCardDeps.test.ts
git commit -m "feat(seo-mahalle): areaSeoCard için prisma bağlaması"
```

---

## Task 7: `Breadcrumb` bileşeni

**Files:**
- Create: `src/components/ui/Breadcrumb.tsx`
- Create: `src/components/ui/Breadcrumb.module.css`
- Test: `src/components/ui/__tests__/Breadcrumb.test.tsx`

**Interfaces:**
- Produces: `interface BreadcrumbItem { label: string; href?: string }`, `Breadcrumb({ items }: { items: BreadcrumbItem[] })` — son item asla link olmaz (mevcut sayfa), `href` olmayan itemlar düz metin render eder.

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/ui/__tests__/Breadcrumb.test.tsx
/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react'
import { Breadcrumb } from '../Breadcrumb'

describe('Breadcrumb', () => {
  it('ara öğeleri link, son öğeyi düz metin render eder', () => {
    render(
      <Breadcrumb
        items={[
          { label: 'Anasayfa', href: '/' },
          { label: 'Arsa Fiyatları', href: '/arsa-fiyatlari' },
          { label: 'Trabzon', href: '/arsa-fiyatlari/trabzon' },
          { label: 'Akçaabat' },
        ]}
      />,
    )
    expect(screen.getByRole('link', { name: 'Anasayfa' })).toHaveAttribute('href', '/')
    expect(screen.getByRole('link', { name: 'Trabzon' })).toHaveAttribute('href', '/arsa-fiyatlari/trabzon')
    expect(screen.queryByRole('link', { name: 'Akçaabat' })).not.toBeInTheDocument()
    expect(screen.getByText('Akçaabat')).toBeInTheDocument()
  })

  it('nav elementi aria-label taşır', () => {
    render(<Breadcrumb items={[{ label: 'Anasayfa', href: '/' }, { label: 'X' }]} />)
    expect(screen.getByRole('navigation', { name: 'Sayfa yolu' })).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/components/ui/__tests__/Breadcrumb.test.tsx`
Expected: FAIL — `Cannot find module '../Breadcrumb'`

- [ ] **Step 3: Write minimal implementation**

```tsx
// src/components/ui/Breadcrumb.tsx
import Link from 'next/link'
import styles from './Breadcrumb.module.css'

export interface BreadcrumbItem {
  label: string
  href?: string
}

export function Breadcrumb({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav aria-label="Sayfa yolu" className={styles.wrap}>
      <ol className={styles.list}>
        {items.map((item, i) => {
          const isLast = i === items.length - 1
          return (
            <li key={`${item.label}-${i}`} className={styles.item}>
              {item.href && !isLast ? (
                <Link href={item.href} className={styles.link}>
                  {item.label}
                </Link>
              ) : (
                <span className={styles.current}>{item.label}</span>
              )}
              {!isLast && <span className={styles.sep}>›</span>}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
```

```css
/* src/components/ui/Breadcrumb.module.css */
.wrap {
  margin-bottom: var(--space-4, 1rem);
}
.list {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
  list-style: none;
  margin: 0;
  padding: 0;
  font-size: 13px;
}
.item {
  display: flex;
  align-items: center;
  gap: 4px;
}
.link {
  color: var(--muted, #6e6e73);
  text-decoration: none;
}
.link:hover {
  color: var(--text, #1d1d1f);
  text-decoration: underline;
}
.current {
  color: var(--text, #1d1d1f);
  font-weight: 600;
}
.sep {
  color: var(--muted, #6e6e73);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/components/ui/__tests__/Breadcrumb.test.tsx`
Expected: PASS (2 test)

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/Breadcrumb.tsx src/components/ui/Breadcrumb.module.css src/components/ui/__tests__/Breadcrumb.test.tsx
git commit -m "feat(seo-mahalle): paylaşılan Breadcrumb bileşeni"
```

---

## Task 8: Mahalle detay sayfası + paylaşılan stil modülü

**Files:**
- Create: `src/app/arsa-fiyatlari/areaSeo.module.css`
- Create: `src/app/arsa-fiyatlari/[il]/[ilce]/[mahalle]/page.tsx`
- Test: `src/app/arsa-fiyatlari/[il]/[ilce]/[mahalle]/page.test.tsx`

**Interfaces:**
- Consumes: `getSeoAreas`/`findBySlug` (Task 4/3), `buildAreaSeoCard`/`createAreaSeoCardDeps` (Task 5/6), `Breadcrumb` (Task 7), `PriceTrendChart` (`@/components/charts/PriceTrendChart`, mevcut)
- Produces: `generateStaticParams`, `generateMetadata`, default `MahallePage` server component.

- [ ] **Step 1: Write the failing test**

Bu proje App Router server-component sayfaları için ayrı bir render-test deseni kullanmıyor (mevcut sayfalar ya `'use client'` ya da doğrudan entegrasyon/Playwright ile doğrulanıyor). Bu görevde **saf render mantığını** test edilebilir tutmak için sayfa dosyasından ayrı, dışa aktarılan bir `renderMahalleContent` yardımcı bileşeni YOK — bunun yerine metadata üretimini kapsayan küçük bir birim test yazıyoruz (generateMetadata saf bir fonksiyon, DOM gerektirmez):

```tsx
// src/app/arsa-fiyatlari/[il]/[ilce]/[mahalle]/page.test.tsx
jest.mock('@/lib/areaSeo/seoAreaDeps', () => ({ getSeoAreas: jest.fn() }))
jest.mock('@/lib/areaSeo/areaSeoCardDeps', () => ({ createAreaSeoCardDeps: jest.fn(() => ({})) }))
jest.mock('@/lib/areaSeo/areaSeoCard', () => ({ buildAreaSeoCard: jest.fn() }))

import { getSeoAreas } from '@/lib/areaSeo/seoAreaDeps'
import { generateMetadata } from './page'

const entry = {
  scope: 'mahalle' as const,
  ilNorm: 'TRABZON', ilceNorm: 'AKCAABAT', mahalleNorm: 'DURUBINAR',
  ilSlug: 'trabzon', ilceSlug: 'akcaabat', mahalleSlug: 'durubinar-mahallesi',
  ilDisplay: 'Trabzon', ilceDisplay: 'Akçaabat', mahalleDisplay: 'Durubinar',
  sampleCount: 12,
}

beforeEach(() => {
  ;(getSeoAreas as jest.Mock).mockReset()
})

describe('generateMetadata', () => {
  it('eşleşen mahalle için başlık/açıklama üretir', async () => {
    ;(getSeoAreas as jest.Mock).mockResolvedValue([entry])
    const meta = await generateMetadata({
      params: Promise.resolve({ il: 'trabzon', ilce: 'akcaabat', mahalle: 'durubinar-mahallesi' }),
    })
    expect(meta.title).toContain('Durubinar')
    expect(meta.title).toContain('Akçaabat')
    expect(meta.description).toContain('Durubinar')
  })

  it('eşleşme yoksa jenerik başlık döner (404 sayfa bileşeninde tetiklenir)', async () => {
    ;(getSeoAreas as jest.Mock).mockResolvedValue([])
    const meta = await generateMetadata({
      params: Promise.resolve({ il: 'x', ilce: 'y', mahalle: 'z' }),
    })
    expect(meta.title).toBe('Arsa Fiyatları | ArsaBil')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/app/arsa-fiyatlari/\[il\]/\[ilce\]/\[mahalle\]/page.test.tsx`
Expected: FAIL — `Cannot find module './page'`

- [ ] **Step 3: Write minimal implementation**

```css
/* src/app/arsa-fiyatlari/areaSeo.module.css */
.wrap {
  max-width: 960px;
  margin: 0 auto;
  padding: 32px 20px 64px;
}
.title {
  font-size: clamp(1.5rem, 4vw, 2rem);
  font-weight: 700;
  margin: 0 0 8px;
  color: var(--text, #1d1d1f);
}
.subtitle {
  font-size: 15px;
  color: var(--muted, #6e6e73);
  margin: 0 0 24px;
}
.statCard {
  display: flex;
  flex-wrap: wrap;
  gap: 24px;
  padding: 20px;
  border-radius: var(--radius-lg, 1rem);
  background: var(--panel, #f5f5f7);
  border: 1px solid var(--border, rgba(0, 0, 0, .08));
  margin-bottom: 24px;
}
.statItem {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 120px;
}
.statLabel {
  font-size: 12px;
  color: var(--muted, #6e6e73);
  text-transform: uppercase;
  letter-spacing: 0.03em;
}
.statValue {
  font-size: 20px;
  font-weight: 600;
  color: var(--text, #1d1d1f);
}
.section {
  margin-bottom: 32px;
}
.sectionTitle {
  font-size: 18px;
  font-weight: 600;
  margin: 0 0 12px;
  color: var(--text, #1d1d1f);
}
.note {
  font-size: 13px;
  color: var(--muted, #6e6e73);
}
.linkGrid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 8px;
}
.linkCard {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  padding: 12px 14px;
  border-radius: var(--radius-md, 0.75rem);
  background: var(--panel, #f5f5f7);
  border: 1px solid var(--border, rgba(0, 0, 0, .08));
  text-decoration: none;
  color: var(--text, #1d1d1f);
}
.linkCard:hover {
  filter: brightness(0.97);
}
.linkCardPrice {
  color: var(--muted, #6e6e73);
  font-size: 13px;
}
.ctaRow {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 24px;
}
.ctaButton {
  display: inline-block;
  padding: 12px 20px;
  border-radius: var(--radius-md, 0.75rem);
  background: var(--accent-violet, #1f6feb);
  color: #fff;
  text-decoration: none;
  font-weight: 600;
  font-size: 14px;
}
.ctaButtonSecondary {
  display: inline-block;
  padding: 12px 20px;
  border-radius: var(--radius-md, 0.75rem);
  background: var(--panel, #f5f5f7);
  border: 1px solid var(--border, rgba(0, 0, 0, .08));
  color: var(--text, #1d1d1f);
  text-decoration: none;
  font-weight: 600;
  font-size: 14px;
}
.table {
  width: 100%;
  border-collapse: collapse;
}
.table th,
.table td {
  text-align: left;
  padding: 10px 12px;
  border-bottom: 1px solid var(--border, rgba(0, 0, 0, .08));
  font-size: 14px;
}
```

```tsx
// src/app/arsa-fiyatlari/[il]/[ilce]/[mahalle]/page.tsx
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getSeoAreas } from '@/lib/areaSeo/seoAreaDeps'
import { findBySlug } from '@/lib/areaSeo/listSeoAreas'
import { buildAreaSeoCard } from '@/lib/areaSeo/areaSeoCard'
import { createAreaSeoCardDeps } from '@/lib/areaSeo/areaSeoCardDeps'
import { Breadcrumb } from '@/components/ui/Breadcrumb'
import { PriceTrendChart } from '@/components/charts/PriceTrendChart'
import styles from '../../../areaSeo.module.css'

type Params = { il: string; ilce: string; mahalle: string }

export async function generateStaticParams(): Promise<Params[]> {
  const entries = await getSeoAreas('mahalle')
  return entries.map((e) => ({ il: e.ilSlug, ilce: e.ilceSlug!, mahalle: e.mahalleSlug! }))
}

export const dynamicParams = true
export const revalidate = 86400

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { il, ilce, mahalle } = await params
  const entries = await getSeoAreas('mahalle')
  const entry = findBySlug(entries, { il, ilce, mahalle })
  if (!entry) return { title: 'Arsa Fiyatları | ArsaBil' }

  const year = new Date().getFullYear()
  const title = `${entry.mahalleDisplay} Mahallesi Arsa Fiyatları ${year} — ${entry.ilceDisplay}, ${entry.ilDisplay} | ArsaBil`
  const description = `${entry.mahalleDisplay} Mahallesi (${entry.ilceDisplay}, ${entry.ilDisplay}) güncel arsa m² fiyatları, 12 aylık fiyat trendi ve risk bilgisi.`
  return { title, description }
}

export default async function MahallePage({ params }: { params: Promise<Params> }) {
  const { il, ilce, mahalle } = await params
  const entries = await getSeoAreas('mahalle')
  const entry = findBySlug(entries, { il, ilce, mahalle })
  if (!entry) notFound()

  const card = await buildAreaSeoCard(entry, createAreaSeoCardDeps())
  if (!card) notFound()

  // il de kontrol edilir — Türkiye'de birden çok ilde aynı adı taşıyan ilçeler
  // var (ör. "Merkez"), yalnız ilceNorm eşleşmesi çapraz-il karışıklığına yol açar.
  const siblings = entries.filter(
    (e) => e.ilNorm === entry.ilNorm && e.ilceNorm === entry.ilceNorm && e.mahalleNorm !== entry.mahalleNorm,
  )

  return (
    <div className={styles.wrap}>
      <Breadcrumb
        items={[
          { label: 'Anasayfa', href: '/' },
          { label: 'Arsa Fiyatları', href: '/arsa-fiyatlari' },
          { label: entry.ilDisplay, href: `/arsa-fiyatlari/${entry.ilSlug}` },
          { label: entry.ilceDisplay!, href: `/arsa-fiyatlari/${entry.ilSlug}/${entry.ilceSlug}` },
          { label: `${entry.mahalleDisplay} Mahallesi` },
        ]}
      />
      <h1 className={styles.title}>{entry.mahalleDisplay} Mahallesi Arsa Fiyatları</h1>
      <p className={styles.subtitle}>
        {entry.ilceDisplay}, {entry.ilDisplay} — {entry.sampleCount} ilan verisine dayanıyor.
      </p>

      <div className={styles.statCard}>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>Medyan ₺/m²</span>
          <span className={styles.statValue}>{Math.round(card.stat.medianPricePerSqm).toLocaleString('tr-TR')} ₺</span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>Aralık (p25–p75)</span>
          <span className={styles.statValue}>
            {Math.round(card.stat.p25).toLocaleString('tr-TR')} – {Math.round(card.stat.p75).toLocaleString('tr-TR')} ₺
          </span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>Örnek sayısı</span>
          <span className={styles.statValue}>{card.stat.sampleCount}</span>
        </div>
      </div>

      {card.priceTrend && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>12 Aylık Fiyat Trendi</h2>
          <PriceTrendChart
            points={card.priceTrend.points}
            changePct3m={card.priceTrend.changePct3m}
            thinTrend={card.priceTrend.thinTrend}
          />
          {card.priceTrend.thinTrend && (
            <p className={styles.note}>Bu mahallede trend verisi henüz sınırlı — yaklaşık bir gösterge olarak değerlendirin.</p>
          )}
        </div>
      )}

      {card.risk && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Deprem ve Taşkın Riski</h2>
          <p>
            {card.risk.faultDistanceM != null
              ? `Bu mahallenin merkezine en yakın diri fay hattı: ${(card.risk.faultDistanceM / 1000).toFixed(1)} km.`
              : 'Fay hattı mesafesi bu mahalle için hesaplanamadı.'}
            {' '}
            {card.risk.floodQ100 != null
              ? card.risk.floodQ100
                ? 'Bu bölge 100 yıllık taşkın (Q100) risk alanı içinde.'
                : 'Bu bölge 100 yıllık taşkın (Q100) risk alanı dışında.'
              : ''}
          </p>
        </div>
      )}

      {card.demographics && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>{entry.ilceDisplay} İlçesi Demografi (ilçe geneli)</h2>
          <p>{card.demographics.summary}</p>
        </div>
      )}

      <div className={styles.section}>
        <p>Son dönemde bu mahallede {card.comparableCount} satılık arsa ilanı gözlemlendi.</p>
      </div>

      {siblings.length > 0 && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>{entry.ilceDisplay} İlçesindeki Diğer Mahalleler</h2>
          <div className={styles.linkGrid}>
            {siblings.map((s) => (
              <Link
                key={s.mahalleSlug}
                href={`/arsa-fiyatlari/${s.ilSlug}/${s.ilceSlug}/${s.mahalleSlug}`}
                className={styles.linkCard}
              >
                {s.mahalleDisplay}
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className={styles.ctaRow}>
        <Link href="/deger" className={styles.ctaButton}>
          Bu mahallede kendi parselini değerlendir
        </Link>
        <Link href="/hesapla" className={styles.ctaButtonSecondary}>
          Kat karşılığı fizibilite hesapla
        </Link>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/app/arsa-fiyatlari/\[il\]/\[ilce\]/\[mahalle\]/page.test.tsx`
Expected: PASS (2 test)

- [ ] **Step 5: Commit**

```bash
git add src/app/arsa-fiyatlari/areaSeo.module.css "src/app/arsa-fiyatlari/[il]/[ilce]/[mahalle]/page.tsx" "src/app/arsa-fiyatlari/[il]/[ilce]/[mahalle]/page.test.tsx"
git commit -m "feat(seo-mahalle): mahalle detay sayfası"
```

---

## Task 9: İlçe dizin sayfası

**Files:**
- Create: `src/app/arsa-fiyatlari/[il]/[ilce]/page.tsx`
- Test: `src/app/arsa-fiyatlari/[il]/[ilce]/page.test.tsx`

**Interfaces:**
- Consumes: aynı Task 8 bağımlılıkları (`getSeoAreas`, `findBySlug`, `buildAreaSeoCard`, `createAreaSeoCardDeps`, `Breadcrumb`, `PriceTrendChart`, `styles`)

- [ ] **Step 1: Write the failing test**

```tsx
// src/app/arsa-fiyatlari/[il]/[ilce]/page.test.tsx
jest.mock('@/lib/areaSeo/seoAreaDeps', () => ({ getSeoAreas: jest.fn() }))

import { getSeoAreas } from '@/lib/areaSeo/seoAreaDeps'
import { generateMetadata } from './page'

const entry = {
  scope: 'ilce' as const,
  ilNorm: 'TRABZON', ilceNorm: 'AKCAABAT', mahalleNorm: null,
  ilSlug: 'trabzon', ilceSlug: 'akcaabat', mahalleSlug: null,
  ilDisplay: 'Trabzon', ilceDisplay: 'Akçaabat', mahalleDisplay: null,
  sampleCount: 40,
}

beforeEach(() => {
  ;(getSeoAreas as jest.Mock).mockReset()
})

describe('generateMetadata (ilçe)', () => {
  it('eşleşen ilçe için başlık üretir', async () => {
    ;(getSeoAreas as jest.Mock).mockResolvedValue([entry])
    const meta = await generateMetadata({ params: Promise.resolve({ il: 'trabzon', ilce: 'akcaabat' }) })
    expect(meta.title).toContain('Akçaabat')
    expect(meta.title).toContain('Trabzon')
  })

  it('eşleşme yoksa jenerik başlık döner', async () => {
    ;(getSeoAreas as jest.Mock).mockResolvedValue([])
    const meta = await generateMetadata({ params: Promise.resolve({ il: 'x', ilce: 'y' }) })
    expect(meta.title).toBe('Arsa Fiyatları | ArsaBil')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/app/arsa-fiyatlari/\[il\]/\[ilce\]/page.test.tsx`
Expected: FAIL — `Cannot find module './page'`

- [ ] **Step 3: Write minimal implementation**

```tsx
// src/app/arsa-fiyatlari/[il]/[ilce]/page.tsx
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getSeoAreas } from '@/lib/areaSeo/seoAreaDeps'
import { findBySlug } from '@/lib/areaSeo/listSeoAreas'
import { buildAreaSeoCard } from '@/lib/areaSeo/areaSeoCard'
import { createAreaSeoCardDeps } from '@/lib/areaSeo/areaSeoCardDeps'
import { Breadcrumb } from '@/components/ui/Breadcrumb'
import { PriceTrendChart } from '@/components/charts/PriceTrendChart'
import styles from '../../areaSeo.module.css'

type Params = { il: string; ilce: string }

export async function generateStaticParams(): Promise<Params[]> {
  const entries = await getSeoAreas('ilce')
  return entries.map((e) => ({ il: e.ilSlug, ilce: e.ilceSlug! }))
}

export const dynamicParams = true
export const revalidate = 86400

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { il, ilce } = await params
  const entries = await getSeoAreas('ilce')
  const entry = findBySlug(entries, { il, ilce })
  if (!entry) return { title: 'Arsa Fiyatları | ArsaBil' }

  const year = new Date().getFullYear()
  return {
    title: `${entry.ilceDisplay} Arsa Fiyatları ${year} — ${entry.ilDisplay} | ArsaBil`,
    description: `${entry.ilceDisplay} (${entry.ilDisplay}) ilçesindeki mahallelerin güncel arsa m² fiyatları ve 12 aylık fiyat trendi.`,
  }
}

export default async function IlcePage({ params }: { params: Promise<Params> }) {
  const { il, ilce } = await params
  const [ilceEntries, mahalleEntries] = await Promise.all([getSeoAreas('ilce'), getSeoAreas('mahalle')])
  const entry = findBySlug(ilceEntries, { il, ilce })
  if (!entry) notFound()

  const card = await buildAreaSeoCard(entry, createAreaSeoCardDeps())
  if (!card) notFound()

  // il de kontrol edilir — Task 8'deki aynı çapraz-il karışıklığı riski
  // (birden çok ilde aynı adı taşıyan ilçeler, ör. "Merkez") burada da geçerli.
  const mahalleler = mahalleEntries
    .filter((e) => e.ilNorm === entry.ilNorm && e.ilceNorm === entry.ilceNorm)
    .sort((a, b) => b.sampleCount - a.sampleCount)

  return (
    <div className={styles.wrap}>
      <Breadcrumb
        items={[
          { label: 'Anasayfa', href: '/' },
          { label: 'Arsa Fiyatları', href: '/arsa-fiyatlari' },
          { label: entry.ilDisplay, href: `/arsa-fiyatlari/${entry.ilSlug}` },
          { label: entry.ilceDisplay! },
        ]}
      />
      <h1 className={styles.title}>{entry.ilceDisplay} Arsa Fiyatları</h1>
      <p className={styles.subtitle}>
        {entry.ilDisplay} — {entry.sampleCount} ilan verisine dayanıyor.
      </p>

      <div className={styles.statCard}>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>Medyan ₺/m²</span>
          <span className={styles.statValue}>{Math.round(card.stat.medianPricePerSqm).toLocaleString('tr-TR')} ₺</span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>Aralık (p25–p75)</span>
          <span className={styles.statValue}>
            {Math.round(card.stat.p25).toLocaleString('tr-TR')} – {Math.round(card.stat.p75).toLocaleString('tr-TR')} ₺
          </span>
        </div>
      </div>

      {card.priceTrend && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>12 Aylık Fiyat Trendi</h2>
          <PriceTrendChart
            points={card.priceTrend.points}
            changePct3m={card.priceTrend.changePct3m}
            thinTrend={card.priceTrend.thinTrend}
          />
        </div>
      )}

      {card.demographics && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Demografi</h2>
          <p>{card.demographics.summary}</p>
        </div>
      )}

      {mahalleler.length > 0 && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>{entry.ilceDisplay} İlçesindeki Mahalleler</h2>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Mahalle</th>
                <th>Örnek Sayısı</th>
              </tr>
            </thead>
            <tbody>
              {mahalleler.map((m) => (
                <tr key={m.mahalleSlug}>
                  <td>
                    <Link href={`/arsa-fiyatlari/${m.ilSlug}/${m.ilceSlug}/${m.mahalleSlug}`}>
                      {m.mahalleDisplay} Mahallesi
                    </Link>
                  </td>
                  <td>{m.sampleCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className={styles.ctaRow}>
        <Link href="/deger" className={styles.ctaButton}>
          Bu ilçede kendi parselini değerlendir
        </Link>
      </div>
    </div>
  )
}
```

Not: tablo sütunu bilinçli olarak "Örnek Sayısı" (`m.sampleCount`) gösterir, medyan ₺/m² değil — `mahalleEntries` (Task 3'ün `SeoAreaEntry`'si) fiyat değeri taşımıyor. Tam medyan değeri için her mahalle için ayrı `buildAreaSeoCard` çağrısı gerekirdi (N+1 sorgu) — bilinçli v1 kısıtı, bu görevin kapsamı dışında bırakıldı.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/app/arsa-fiyatlari/\[il\]/\[ilce\]/page.test.tsx`
Expected: PASS (2 test)

- [ ] **Step 5: Commit**

```bash
git add "src/app/arsa-fiyatlari/[il]/[ilce]/page.tsx" "src/app/arsa-fiyatlari/[il]/[ilce]/page.test.tsx"
git commit -m "feat(seo-mahalle): ilçe dizin sayfası"
```

---

## Task 10: İl dizin sayfası

**Files:**
- Create: `src/app/arsa-fiyatlari/[il]/page.tsx`
- Test: `src/app/arsa-fiyatlari/[il]/page.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// src/app/arsa-fiyatlari/[il]/page.test.tsx
jest.mock('@/lib/areaSeo/seoAreaDeps', () => ({ getSeoAreas: jest.fn() }))

import { getSeoAreas } from '@/lib/areaSeo/seoAreaDeps'
import { generateMetadata } from './page'

const entry = {
  scope: 'il' as const,
  ilNorm: 'TRABZON', ilceNorm: null, mahalleNorm: null,
  ilSlug: 'trabzon', ilceSlug: null, mahalleSlug: null,
  ilDisplay: 'Trabzon', ilceDisplay: null, mahalleDisplay: null,
  sampleCount: 100,
}

beforeEach(() => {
  ;(getSeoAreas as jest.Mock).mockReset()
})

describe('generateMetadata (il)', () => {
  it('eşleşen il için başlık üretir', async () => {
    ;(getSeoAreas as jest.Mock).mockResolvedValue([entry])
    const meta = await generateMetadata({ params: Promise.resolve({ il: 'trabzon' }) })
    expect(meta.title).toContain('Trabzon')
  })

  it('eşleşme yoksa jenerik başlık döner', async () => {
    ;(getSeoAreas as jest.Mock).mockResolvedValue([])
    const meta = await generateMetadata({ params: Promise.resolve({ il: 'x' }) })
    expect(meta.title).toBe('Arsa Fiyatları | ArsaBil')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/app/arsa-fiyatlari/\[il\]/page.test.tsx`
Expected: FAIL — `Cannot find module './page'`

- [ ] **Step 3: Write minimal implementation**

```tsx
// src/app/arsa-fiyatlari/[il]/page.tsx
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getSeoAreas } from '@/lib/areaSeo/seoAreaDeps'
import { findBySlug } from '@/lib/areaSeo/listSeoAreas'
import { buildAreaSeoCard } from '@/lib/areaSeo/areaSeoCard'
import { createAreaSeoCardDeps } from '@/lib/areaSeo/areaSeoCardDeps'
import { Breadcrumb } from '@/components/ui/Breadcrumb'
import { PriceTrendChart } from '@/components/charts/PriceTrendChart'
import styles from '../areaSeo.module.css'

type Params = { il: string }

export async function generateStaticParams(): Promise<Params[]> {
  const entries = await getSeoAreas('il')
  return entries.map((e) => ({ il: e.ilSlug }))
}

export const dynamicParams = true
export const revalidate = 86400

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { il } = await params
  const entries = await getSeoAreas('il')
  const entry = findBySlug(entries, { il })
  if (!entry) return { title: 'Arsa Fiyatları | ArsaBil' }

  const year = new Date().getFullYear()
  return {
    title: `${entry.ilDisplay} Arsa Fiyatları ${year} | ArsaBil`,
    description: `${entry.ilDisplay} ilindeki ilçelerin güncel arsa m² fiyatları ve 12 aylık fiyat trendi.`,
  }
}

export default async function IlPage({ params }: { params: Promise<Params> }) {
  const { il } = await params
  const [ilEntries, ilceEntries] = await Promise.all([getSeoAreas('il'), getSeoAreas('ilce')])
  const entry = findBySlug(ilEntries, { il })
  if (!entry) notFound()

  const card = await buildAreaSeoCard(entry, createAreaSeoCardDeps())
  if (!card) notFound()

  const ilceler = ilceEntries.filter((e) => e.ilNorm === entry.ilNorm).sort((a, b) => b.sampleCount - a.sampleCount)

  return (
    <div className={styles.wrap}>
      <Breadcrumb
        items={[
          { label: 'Anasayfa', href: '/' },
          { label: 'Arsa Fiyatları', href: '/arsa-fiyatlari' },
          { label: entry.ilDisplay },
        ]}
      />
      <h1 className={styles.title}>{entry.ilDisplay} Arsa Fiyatları</h1>
      <p className={styles.subtitle}>{entry.sampleCount} ilan verisine dayanıyor.</p>

      <div className={styles.statCard}>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>Medyan ₺/m²</span>
          <span className={styles.statValue}>{Math.round(card.stat.medianPricePerSqm).toLocaleString('tr-TR')} ₺</span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>Aralık (p25–p75)</span>
          <span className={styles.statValue}>
            {Math.round(card.stat.p25).toLocaleString('tr-TR')} – {Math.round(card.stat.p75).toLocaleString('tr-TR')} ₺
          </span>
        </div>
      </div>

      {card.priceTrend && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>12 Aylık Fiyat Trendi</h2>
          <PriceTrendChart
            points={card.priceTrend.points}
            changePct3m={card.priceTrend.changePct3m}
            thinTrend={card.priceTrend.thinTrend}
          />
        </div>
      )}

      {ilceler.length > 0 && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>{entry.ilDisplay} İlindeki İlçeler</h2>
          <div className={styles.linkGrid}>
            {ilceler.map((e) => (
              <Link key={e.ilceSlug} href={`/arsa-fiyatlari/${e.ilSlug}/${e.ilceSlug}`} className={styles.linkCard}>
                {e.ilceDisplay}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/app/arsa-fiyatlari/\[il\]/page.test.tsx`
Expected: PASS (2 test)

- [ ] **Step 5: Commit**

```bash
git add "src/app/arsa-fiyatlari/[il]/page.tsx" "src/app/arsa-fiyatlari/[il]/page.test.tsx"
git commit -m "feat(seo-mahalle): il dizin sayfası"
```

---

## Task 11: Kök dizin sayfası (`/arsa-fiyatlari`)

**Files:**
- Create: `src/app/arsa-fiyatlari/page.tsx`
- Test: `src/app/arsa-fiyatlari/page.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// src/app/arsa-fiyatlari/page.test.tsx
/** @jest-environment jsdom */
jest.mock('@/lib/areaSeo/seoAreaDeps', () => ({ getSeoAreas: jest.fn() }))

import { render, screen } from '@testing-library/react'
import { getSeoAreas } from '@/lib/areaSeo/seoAreaDeps'
import ArsaFiyatlariPage, { metadata } from './page'

beforeEach(() => {
  ;(getSeoAreas as jest.Mock).mockReset()
})

describe('ArsaFiyatlariPage', () => {
  it('veri olan illeri listeler', async () => {
    ;(getSeoAreas as jest.Mock).mockResolvedValue([
      { ilSlug: 'trabzon', ilDisplay: 'Trabzon', sampleCount: 100, scope: 'il', ilNorm: 'TRABZON', ilceNorm: null, mahalleNorm: null, ilceSlug: null, mahalleSlug: null, ilceDisplay: null, mahalleDisplay: null },
    ])
    const ui = await ArsaFiyatlariPage()
    render(ui)
    expect(screen.getByRole('link', { name: /Trabzon/ })).toHaveAttribute('href', '/arsa-fiyatlari/trabzon')
  })
})

describe('metadata', () => {
  it('sabit başlık/açıklama taşır', () => {
    expect(metadata.title).toBe('Arsa Fiyatları | ArsaBil')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/app/arsa-fiyatlari/page.test.tsx`
Expected: FAIL — `Cannot find module './page'`

- [ ] **Step 3: Write minimal implementation**

```tsx
// src/app/arsa-fiyatlari/page.tsx
import type { Metadata } from 'next'
import Link from 'next/link'
import { getSeoAreas } from '@/lib/areaSeo/seoAreaDeps'
import { Breadcrumb } from '@/components/ui/Breadcrumb'
import styles from './areaSeo.module.css'

export const revalidate = 86400

export const metadata: Metadata = {
  title: 'Arsa Fiyatları | ArsaBil',
  description: 'Türkiye genelinde il, ilçe ve mahalle bazında güncel arsa m² fiyatları, fiyat trendi ve risk bilgisi.',
}

export default async function ArsaFiyatlariPage() {
  const iller = await getSeoAreas('il')
  const sorted = [...iller].sort((a, b) => b.sampleCount - a.sampleCount)

  return (
    <div className={styles.wrap}>
      <Breadcrumb items={[{ label: 'Anasayfa', href: '/' }, { label: 'Arsa Fiyatları' }]} />
      <h1 className={styles.title}>Arsa Fiyatları</h1>
      <p className={styles.subtitle}>
        İl, ilçe ve mahalle bazında güncel arsa m² fiyatlarını, fiyat trendini ve risk bilgisini inceleyin.
      </p>

      {sorted.length === 0 ? (
        <p className={styles.note}>Şu an gösterilecek veri yok — veri kapsamı genişledikçe burada listelenecek.</p>
      ) : (
        <div className={styles.linkGrid}>
          {sorted.map((e) => (
            <Link key={e.ilSlug} href={`/arsa-fiyatlari/${e.ilSlug}`} className={styles.linkCard}>
              {e.ilDisplay}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/app/arsa-fiyatlari/page.test.tsx`
Expected: PASS (2 test)

- [ ] **Step 5: Commit**

```bash
git add src/app/arsa-fiyatlari/page.tsx src/app/arsa-fiyatlari/page.test.tsx
git commit -m "feat(seo-mahalle): arsa-fiyatlari kök dizin sayfası"
```

---

## Task 12: Sitemap entegrasyonu

**Files:**
- Modify: `src/app/sitemap.ts`
- Test: `src/app/sitemap.test.ts` (proje bu dosya için henüz test taşımıyor — yeni oluşturulacak)

**Interfaces:**
- Consumes: `getSeoAreas` (Task 4)

- [ ] **Step 1: Write the failing test**

```ts
// src/app/sitemap.test.ts
jest.mock('@/lib/prisma', () => ({ prisma: { listing: { findMany: jest.fn(async () => []) } } }))
jest.mock('@/lib/areaSeo/seoAreaDeps', () => ({
  getSeoAreas: jest.fn(async (scope: string) => {
    if (scope === 'il') return [{ ilSlug: 'trabzon', ilceSlug: null, mahalleSlug: null }]
    if (scope === 'ilce') return [{ ilSlug: 'trabzon', ilceSlug: 'akcaabat', mahalleSlug: null }]
    return [{ ilSlug: 'trabzon', ilceSlug: 'akcaabat', mahalleSlug: 'durubinar-mahallesi' }]
  }),
}))

import sitemap from './sitemap'

describe('sitemap', () => {
  it('arsa-fiyatlari üç seviyesini de içerir', async () => {
    const urls = (await sitemap()).map((r) => r.url)
    expect(urls).toContain('http://localhost:3000/arsa-fiyatlari/trabzon')
    expect(urls).toContain('http://localhost:3000/arsa-fiyatlari/trabzon/akcaabat')
    expect(urls).toContain('http://localhost:3000/arsa-fiyatlari/trabzon/akcaabat/durubinar-mahallesi')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/app/sitemap.test.ts`
Expected: FAIL — `arsa-fiyatlari` URL'leri listede yok

- [ ] **Step 3: Write minimal implementation**

`src/app/sitemap.ts`'in mevcut hâlini şu şekilde genişlet (yalnız eklenen kısımlar, mevcut `listings` bloğu AYNEN kalır):

```ts
import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { getSeoAreas } from "@/lib/areaSeo/seoAreaDeps";

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

    const staticRoutes: MetadataRoute.Sitemap = [
        { url: `${baseUrl}/`, changeFrequency: "daily", priority: 1 },
        { url: `${baseUrl}/hesapla`, changeFrequency: "weekly", priority: 0.9 },
        { url: `${baseUrl}/deger`, changeFrequency: "weekly", priority: 0.9 },
        { url: `${baseUrl}/marketplace`, changeFrequency: "daily", priority: 0.9 },
        { url: `${baseUrl}/arsa-fiyatlari`, changeFrequency: "weekly", priority: 0.8 },
        { url: `${baseUrl}/akif`, changeFrequency: "weekly", priority: 0.7 },
        { url: `${baseUrl}/contact`, changeFrequency: "yearly", priority: 0.3 },
        { url: `${baseUrl}/terms`, changeFrequency: "yearly", priority: 0.3 },
        { url: `${baseUrl}/privacy`, changeFrequency: "yearly", priority: 0.3 },
    ];

    const listings = await prisma.listing.findMany({
        where: { isActive: true },
        select: { id: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 1000,
    });

    const listingRoutes: MetadataRoute.Sitemap = listings.map((l) => ({
        url: `${baseUrl}/listing/${l.id}`,
        lastModified: l.createdAt,
        changeFrequency: "weekly",
        priority: 0.7,
    }));

    const [ilAreas, ilceAreas, mahalleAreas] = await Promise.all([
        getSeoAreas('il'),
        getSeoAreas('ilce'),
        getSeoAreas('mahalle'),
    ]);

    const areaSeoRoutes: MetadataRoute.Sitemap = [
        ...ilAreas.map((e) => ({
            url: `${baseUrl}/arsa-fiyatlari/${e.ilSlug}`,
            changeFrequency: "weekly" as const,
            priority: 0.6,
        })),
        ...ilceAreas.map((e) => ({
            url: `${baseUrl}/arsa-fiyatlari/${e.ilSlug}/${e.ilceSlug}`,
            changeFrequency: "weekly" as const,
            priority: 0.6,
        })),
        ...mahalleAreas.map((e) => ({
            url: `${baseUrl}/arsa-fiyatlari/${e.ilSlug}/${e.ilceSlug}/${e.mahalleSlug}`,
            changeFrequency: "weekly" as const,
            priority: 0.65,
        })),
    ];

    return [...staticRoutes, ...listingRoutes, ...areaSeoRoutes];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/app/sitemap.test.ts`
Expected: PASS (1 test)

- [ ] **Step 5: Commit**

```bash
git add src/app/sitemap.ts src/app/sitemap.test.ts
git commit -m "feat(seo-mahalle): sitemap.ts'e il/ilçe/mahalle route'ları eklendi"
```

---

## Task 13: Tam proje regresyonu + tsc doğrulaması

**Files:** yok (yalnız doğrulama)

- [ ] **Step 1: TypeScript derlemesini çalıştır**

Run: `npx tsc --noEmit`
Expected: 0 hata. Hata çıkarsa (özellikle Prisma tip uyuşmazlıkları — `AreaPriceStat.select` dönüş tipleri, `MetadataRoute.Sitemap` `changeFrequency` literal tipi vb.) ilgili task dosyasında düzelt, bu adımı tekrar çalıştır.

- [ ] **Step 2: Tam jest suite'ini çalıştır**

Run: `npx jest`
Expected: tüm suite yeşil (yeni ~13 test dosyası dahil, mevcut hiçbir test kırılmamış).

- [ ] **Step 3: Next.js production build ile doğrula**

Run: `npm run build`
Expected: build hatasız tamamlanır; çıktıda `/arsa-fiyatlari`, `/arsa-fiyatlari/[il]`, `/arsa-fiyatlari/[il]/[ilce]`, `/arsa-fiyatlari/[il]/[ilce]/[mahalle]` route'ları listelenir (mahalle-seviyesi statik sayfa sayısı, dev DB'deki mevcut Trabzon `AreaPriceStat` satırlarına göre değişebilir — `DATABASE_URL` build ortamında erişilebilir olmalı, değilse `generateStaticParams` boş döner ve tüm sayfalar ISR fallback'e düşer, bu da build'i kırmaz).

**Not:** `npm run build` sırasında Prisma'ya bağlanamıyorsa (yerel DB kapalıysa) `generateStaticParams` boş liste döner — bu bir hata değildir, `dynamicParams: true` sayesinde sayfalar ilk istekte JIT üretilir. Build'in kendisi yine de hatasız tamamlanmalı.

- [ ] **Step 4: Commit (yalnız Step 1-3 sırasında bir düzeltme yapıldıysa)**

```bash
git add -A
git commit -m "fix(seo-mahalle): tsc/build regresyon düzeltmeleri"
```

(Düzeltme gerekmediyse bu adım atlanır — commit oluşturulmaz.)

---

## Kapsam dışı (spec'te zaten belirtildi, bu planda yeniden ele alınmadı)

- Ulusal veri toplama (Proxy Faz 1/2).
- `/deger` deep-link prefill (mahalle sayfasından parsel sorgusuna otomatik geçiş).
- Performans/caching tuning ulusal ölçekte (binlerce sayfa) — `getSeoAreas`'ın `cache()` sarmalayıcısı yalnızca TEK request içi tekrar-çağrıları önler, build-time toplam süre optimizasyonu bu planın kapsamı dışında.
