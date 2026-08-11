# Pazar Yeri Veri Bütünlüğü ve Filtre Düzeltmeleri Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pazar yeri/harita özelliğindeki 5 gerçek defekti (sessizce çalışmayan filtreler, şemada olmayan alanlara güvenen kod, no-op sıralama, il/ilçe state bug'ı) düzeltmek ve sihirbazın topladığı gerçek verinin (`zoning`, yeni `type`) marketplace'te fiilen kullanılmasını sağlamak.

**Architecture:** Sekiz bağımsız TDD görevi. Backend (`schema.prisma` + POST/PATCH route'ları) ve sihirbaz formu önce; ardından paylaşılan saf filtre/sıralama mantığı yeni bir `src/lib/listing/marketplaceFilters.ts` dosyasına çıkarılıyor (component'lerden bağımsız test edilebilir); `FilterSidebar`/`ListingCard` bu paylaşılan tipleri kullanacak şekilde güncelleniyor; `marketplace/page.tsx` hepsini birbirine bağlıyor; son olarak ilan detay sayfası ve `CitySearch` bağımsız düzeltmeler alıyor.

**Tech Stack:** Next.js 16 (App Router), React, TypeScript, Prisma (PostgreSQL), Jest + React Testing Library.

## Global Constraints

- **Enum hizalaması:** `zoning`/İmar Durumu alanı her yerde `KONUT | TICARI | KARMA | TARIM` değerlerini kullanır (sihirbazın `WizardStep2Detail.tsx`'teki gerçek `zoning` enum'u) — eski `KONUT | TICARET | KONUT_TICARET | DIGER` enum'u hiçbir yerde kalmamalı.
- **`type` alanı değerleri:** `SALE | KAT_KARSILIGI | ORTAKLIK`, varsayılan her zaman `KAT_KARSILIGI` (şema `@default`, sihirbaz `emptyFormData`, tüm fallback'ler).
- **Eksik veri asla uydurulmaz:** `landSizeSqm`/`zoning` gibi alanlar `null`/`undefined` ise filtrelerden geçirilir (cezalandırılmaz) ve gösterimde `'—'` basılır — sabit bir mock değer YAZILMAZ (kod tabanının zaten uyguladığı ilke, bkz. `listing/[id]/page.tsx`'teki şehir/ilçe gösterimi).
- **Kapsam dışı:** `fizibiliteSkoru`, `arsaPayiMin/Max`, `changePercent`, `emsal` (ilan detay sayfasındaki gösterim) — bunlar zaten "Örnek veri" banner'ıyla işaretli, bu plan onlara dokunmuyor.
- Her task sonunda `npx tsc --noEmit` ve ilgili jest dosyaları/paketleri 0 hata ile geçmeli.

---

### Task 1: Prisma `type` alanı + POST/PATCH API wiring

**Files:**
- Modify: `prisma/schema.prisma` (Listing modeli)
- Modify: `src/app/api/listings/route.ts`
- Modify: `src/app/api/listings/[id]/route.ts`
- Test: `src/app/api/listings/__tests__/route.type.test.ts` (yeni)
- Test: `src/app/api/listings/[id]/__tests__/route.type.test.ts` (yeni)

**Interfaces:**
- Produces: `Listing.type: string` (DB, default `"KAT_KARSILIGI"`) — POST body'sinde `type?: string`, PATCH body'sinde `type?: string` olarak okunur, `prisma.listing.create`/`update`'e `type` alanı olarak yazılır.

- [ ] **Step 1: Şema alanını ekle**

`prisma/schema.prisma` içinde `model Listing` bloğunda `zoning` satırının hemen altına ekle:

```prisma
  zoning      String?
  type        String   @default("KAT_KARSILIGI")
```

(Mevcut `zoning      String?` satırının altına, `titleDeed` satırından önce.)

- [ ] **Step 2: Migration üret ve uygula**

Run: `npx prisma migrate dev --name add_listing_type`
Expected: yeni bir `prisma/migrations/<timestamp>_add_listing_type/migration.sql` oluşur, migration DB'ye uygulanır, Prisma Client yeniden üretilir (çıktıda "already in sync" değil, "The migration has been created and applied" benzeri bir mesaj görülür).

- [ ] **Step 3: POST route testi yaz (RED)**

Create `src/app/api/listings/__tests__/route.type.test.ts`:

```ts
const getServerSessionMock = jest.fn()
const createMock = jest.fn()
const buildParcelSnapshotMock = jest.fn()

jest.mock('next-auth/next', () => ({
    getServerSession: (...args: unknown[]) => getServerSessionMock(...args),
}))
jest.mock('@/lib/auth', () => ({ authOptions: {} }))
jest.mock('@/lib/prisma', () => ({
    prisma: {
        listing: {
            create: (...args: unknown[]) => createMock(...args),
            findUnique: jest.fn().mockResolvedValue(null),
        },
        report: { findFirst: jest.fn().mockResolvedValue(null) },
    },
}))
jest.mock('@/lib/plan', () => ({
    checkPlanLimit: jest.fn().mockResolvedValue({ allowed: true }),
}))
jest.mock('@/lib/listing/parcelSnapshot', () => ({
    buildParcelSnapshot: (...args: unknown[]) => buildParcelSnapshotMock(...args),
}))

import { POST } from '../route'

function postReq(body: unknown) {
    return new Request('http://localhost/api/listings', { method: 'POST', body: JSON.stringify(body) })
}

describe('POST /api/listings — type alanı', () => {
    beforeEach(() => {
        getServerSessionMock.mockReset().mockResolvedValue({ user: { id: 'u1' } })
        createMock.mockReset().mockResolvedValue({ id: 'l1' })
        buildParcelSnapshotMock.mockReset().mockResolvedValue({})
    })

    it('gövdedeki type değeri DB kaydına yazılır', async () => {
        await POST(postReq({ city: 'Tekirdağ', type: 'SALE' }))
        const data = createMock.mock.calls[0][0].data
        expect(data.type).toBe('SALE')
    })

    it('type gönderilmezse varsayılan KAT_KARSILIGI yazılır', async () => {
        await POST(postReq({ city: 'Tekirdağ' }))
        const data = createMock.mock.calls[0][0].data
        expect(data.type).toBe('KAT_KARSILIGI')
    })
})
```

- [ ] **Step 4: Testi çalıştır, RED olduğunu doğrula**

Run: `npx jest src/app/api/listings/__tests__/route.type.test.ts`
Expected: FAIL — `data.type` `undefined` (route henüz `type`'ı okumuyor/yazmıyor).

- [ ] **Step 5: POST route'a wiring ekle**

`src/app/api/listings/route.ts` içinde destructure satırını genişlet (satır 78-83):

```ts
        const {
            reportId, city, district, notes,
            title, address, phone, description,
            price, landSizeSqm, zoning, titleDeed, photos,
            lat, lng, type,
        } = await req.json()
```

`prisma.listing.create` çağrısındaki `data` objesine (`zoning: zoning || null,` satırının hemen altına) ekle:

```ts
                zoning: zoning || null,
                type: type || 'KAT_KARSILIGI',
```

- [ ] **Step 6: Testi çalıştır, GREEN olduğunu doğrula**

Run: `npx jest src/app/api/listings/__tests__/route.type.test.ts`
Expected: PASS (2/2).

- [ ] **Step 7: PATCH route testi yaz (RED)**

Create `src/app/api/listings/[id]/__tests__/route.type.test.ts`:

```ts
const getServerSessionMock = jest.fn()
const findUniqueMock = jest.fn()
const updateMock = jest.fn()

jest.mock('next-auth/next', () => ({
    getServerSession: (...args: unknown[]) => getServerSessionMock(...args),
}))
jest.mock('@/lib/auth', () => ({ authOptions: {} }))
jest.mock('@/lib/prisma', () => ({
    prisma: {
        listing: {
            findUnique: (...args: unknown[]) => findUniqueMock(...args),
            update: (...args: unknown[]) => updateMock(...args),
        },
    },
}))
jest.mock('@/lib/listing/parcelSnapshot', () => ({
    buildParcelSnapshot: jest.fn().mockResolvedValue({}),
}))

import { PATCH } from '../route'

function patchReq(body: unknown) {
    return new Request('http://localhost/api/listings/l1', {
        method: 'PATCH',
        body: JSON.stringify(body),
    }) as never
}

const ctx = { params: Promise.resolve({ id: 'l1' }) }

describe('PATCH /api/listings/[id] — type alanı', () => {
    beforeEach(() => {
        getServerSessionMock.mockReset().mockResolvedValue({ user: { id: 'u1' } })
        updateMock.mockReset().mockResolvedValue({ id: 'l1' })
        findUniqueMock.mockReset().mockResolvedValue({ userId: 'u1', lat: null, lng: null })
    })

    it('gövdedeki type değeri güncellemeye yazılır', async () => {
        await PATCH(patchReq({ type: 'ORTAKLIK' }), ctx)
        const data = updateMock.mock.calls[0][0].data
        expect(data.type).toBe('ORTAKLIK')
    })

    it('type gövdede yoksa güncelleme verisine hiç eklenmez (kısmi PATCH)', async () => {
        await PATCH(patchReq({ title: 'Yeni başlık' }), ctx)
        const data = updateMock.mock.calls[0][0].data
        expect(data).not.toHaveProperty('type')
    })
})
```

- [ ] **Step 8: Testi çalıştır, RED olduğunu doğrula**

Run: `npx jest "src/app/api/listings/\[id\]/__tests__/route.type.test.ts"`
Expected: FAIL — her iki test de `data.type` `undefined` olduğu için başarısız (ilk test `toBe('ORTAKLIK')` beklerken `undefined` bulur).

- [ ] **Step 9: PATCH route'a wiring ekle**

`src/app/api/listings/[id]/route.ts` satır 71'deki destructure'ı genişlet:

```ts
        const { title, address, phone, description, price, landSizeSqm, zoning, titleDeed, photos, city, district, reportId, lat, lng, type } = body
```

`prisma.listing.update` çağrısındaki `data` objesine (`...(zoning !== undefined ? { zoning } : {}),` satırının hemen altına) ekle:

```ts
                ...(zoning !== undefined ? { zoning } : {}),
                ...(type !== undefined ? { type } : {}),
```

- [ ] **Step 10: Testi çalıştır, GREEN olduğunu doğrula**

Run: `npx jest "src/app/api/listings/\[id\]/__tests__/route.type.test.ts"`
Expected: PASS (2/2).

- [ ] **Step 11: tsc kontrolü**

Run: `npx tsc --noEmit`
Expected: 0 hata.

- [ ] **Step 12: Commit**

```bash
git add prisma/schema.prisma prisma/migrations src/app/api/listings/route.ts src/app/api/listings/[id]/route.ts src/app/api/listings/__tests__/route.type.test.ts "src/app/api/listings/[id]/__tests__/route.type.test.ts"
git commit -m "feat(listing): type alanı şemaya eklendi, POST/PATCH ile yazılıyor"
```

---

### Task 2: Sihirbaz "İlan Türü" seçici + publishBody + edit sayfası wiring

**Files:**
- Modify: `src/components/listing-wizard/types.ts`
- Modify: `src/components/listing-wizard/WizardStep2Detail.tsx`
- Modify: `src/app/listings/new/publishBody.ts`
- Modify: `src/app/listings/new/publishBody.test.ts`
- Modify: `src/app/listings/[id]/edit/page.tsx`
- Test: `src/components/listing-wizard/WizardStep2Detail.test.tsx` (yeni)

**Interfaces:**
- Consumes: Task 1'in POST/PATCH route'ları — `type` alanını gövdeden okuyorlar.
- Produces: `WizardFormData.type: string` (varsayılan `'KAT_KARSILIGI'`), `buildListingPublishBody(form).type: string`.

- [ ] **Step 1: `WizardFormData`'ya `type` ekle**

`src/components/listing-wizard/types.ts`:

```ts
export interface WizardFormData {
    city: string
    district: string
    address: string
    lat: number | null
    lng: number | null
    parcel: ParcelInfo | null
    parcelStatus: ParcelPickerStatus
    title: string
    landSizeSqm: string
    price: string
    zoning: string
    titleDeed: string
    type: string
    description: string
    phone: string
    photos: { url: string; publicId: string }[]
    reportId: string
}

export const emptyFormData: WizardFormData = {
    city: '', district: '', address: '',
    lat: null, lng: null, parcel: null, parcelStatus: 'idle',
    title: '', landSizeSqm: '', price: '',
    zoning: '', titleDeed: '', type: 'KAT_KARSILIGI', description: '', phone: '',
    photos: [],
    reportId: '',
}
```

- [ ] **Step 2: Testi yaz (RED)**

Create `src/components/listing-wizard/WizardStep2Detail.test.tsx`:

```tsx
/** @jest-environment jsdom */
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { WizardStep2Detail } from './WizardStep2Detail'
import { emptyFormData } from './types'

describe('WizardStep2Detail — İlan Türü', () => {
    it('varsayılan olarak Kat Karşılığı seçili gelir', () => {
        render(<WizardStep2Detail data={emptyFormData} onChange={jest.fn()} />)
        expect(screen.getByRole('combobox', { name: 'İlan Türü' })).toHaveValue('KAT_KARSILIGI')
    })

    it('değiştirildiğinde onChange { type: değer } ile çağrılır', () => {
        const onChange = jest.fn()
        render(<WizardStep2Detail data={emptyFormData} onChange={onChange} />)
        fireEvent.change(screen.getByRole('combobox', { name: 'İlan Türü' }), { target: { value: 'SALE' } })
        expect(onChange).toHaveBeenCalledWith({ type: 'SALE' })
    })

    it('üç seçenek de mevcuttur: Kat Karşılığı, Satış, Ortaklık', () => {
        render(<WizardStep2Detail data={emptyFormData} onChange={jest.fn()} />)
        const select = screen.getByRole('combobox', { name: 'İlan Türü' })
        const values = Array.from(select.querySelectorAll('option')).map(o => (o as HTMLOptionElement).value)
        expect(values).toEqual(['KAT_KARSILIGI', 'SALE', 'ORTAKLIK'])
    })
})
```

- [ ] **Step 3: Testi çalıştır, RED olduğunu doğrula**

Run: `npx jest src/components/listing-wizard/WizardStep2Detail.test.tsx`
Expected: FAIL — `getByRole('combobox', { name: 'İlan Türü' })` bulunamaz (henüz JSX'te yok).

- [ ] **Step 4: Select'i ekle**

`src/components/listing-wizard/WizardStep2Detail.tsx` içinde, "İstenen Fiyat" alanını içeren `twoCol` div'inin kapanışından (`</div>` — mevcut satır 58) hemen sonra, "İmar Durumu"/"Tapu Durumu" `twoCol` div'inden (mevcut satır 60) önce ekle:

```tsx
      <div className={styles.fieldGroup}>
        <label className={styles.label}>İlan Türü</label>
        <select
          className={styles.select}
          aria-label="İlan Türü"
          value={data.type}
          onChange={e => onChange({ type: e.target.value })}
        >
          <option value="KAT_KARSILIGI">Kat Karşılığı</option>
          <option value="SALE">Satış</option>
          <option value="ORTAKLIK">Ortaklık</option>
        </select>
      </div>
```

- [ ] **Step 5: Testi çalıştır, GREEN olduğunu doğrula**

Run: `npx jest src/components/listing-wizard/WizardStep2Detail.test.tsx`
Expected: PASS (3/3).

- [ ] **Step 6: `publishBody.ts`'e `type` ekle**

`src/app/listings/new/publishBody.ts`, `zoning: form.zoning || null,` satırının altına:

```ts
        zoning: form.zoning || null,
        type: form.type,
```

- [ ] **Step 7: `publishBody.test.ts`'e assertion ekle (RED önce doğrulanır)**

`src/app/listings/new/publishBody.test.ts` dosyasının sonuna yeni bir `it` ekle:

```ts
    it('type alanını olduğu gibi gönderir', () => {
        const body = buildListingPublishBody(form({ lat: 41, lng: 27, type: 'SALE' }))
        expect(body.type).toBe('SALE')
    })

    it('type formda varsayılan (KAT_KARSILIGI) ise onu gönderir', () => {
        const body = buildListingPublishBody(form({ lat: 41, lng: 27 }))
        expect(body.type).toBe('KAT_KARSILIGI')
    })
```

Run: `npx jest src/app/listings/new/publishBody.test.ts`
Expected: Step 6 zaten uygulandığı için doğrudan PASS (7/7) — bu adımda RED/GREEN ayrımı yerine, testin gerçek regresyonu yakaladığını doğrulamak için `publishBody.ts`'teki `type: form.type,` satırını geçici olarak silip testin FAIL verdiğini, sonra geri ekleyip PASS verdiğini gözle doğrula.

- [ ] **Step 8: Edit sayfasına wiring ekle**

`src/app/listings/[id]/edit/page.tsx`, `setForm` içindeki `zoning: listing.zoning ?? '',` satırının altına (satır 66 civarı):

```ts
                    zoning: listing.zoning ?? '',
                    type: listing.type ?? 'KAT_KARSILIGI',
```

`handleSave`'deki PATCH gövdesinde `zoning: form.zoning || null,` satırının altına (satır 103 civarı):

```ts
                    zoning: form.zoning || null,
                    type: form.type,
```

- [ ] **Step 9: tsc kontrolü**

Run: `npx tsc --noEmit`
Expected: 0 hata.

- [ ] **Step 10: Commit**

```bash
git add src/components/listing-wizard/types.ts src/components/listing-wizard/WizardStep2Detail.tsx src/components/listing-wizard/WizardStep2Detail.test.tsx src/app/listings/new/publishBody.ts src/app/listings/new/publishBody.test.ts src/app/listings/[id]/edit/page.tsx
git commit -m "feat(wizard): İlan Türü seçici eklendi, publishBody/edit wiring'i tamam"
```

---

### Task 3: Paylaşılan filtre/sıralama saf fonksiyonları

**Files:**
- Create: `src/lib/listing/marketplaceFilters.ts`
- Test: `src/lib/listing/marketplaceFilters.test.ts`

**Interfaces:**
- Produces:
  - `interface ListingFilters { type: string[]; minSize: number; maxSize: number; imar: string[]; fizibiliteOnly: boolean; minScore: number }`
  - `interface FilterableListing { type: string; landSizeSqm?: number | null; zoning?: string | null; fizibiliteSkoru?: number }`
  - `interface SortableListing { fizibiliteSkoru?: number; price?: number; report?: { minApartmentPrice?: number }; createdAt?: string }`
  - `filterListings<T extends FilterableListing>(listings: T[], filters: ListingFilters): T[]`
  - `sortListings<T extends SortableListing>(listings: T[], sortBy: string): T[]`
  - `mergeDemoOverlay<T extends object>(real: T, overlay: Partial<T>): T` — gerçek veride VAR OLAN alanlar (null dahil) demo overlay'i EZER; yalnızca gerçek veride hiç bulunmayan alanlar overlay'den gelir. **Kritik:** `zoning` artık gerçek bir alan olduğundan, ters sırada birleştirme (`{...real, ...overlay}`) gerçek bir satıcının girdiği zoning'i sessizce mock değerle EZERDİ — tam da bu planın düzelttiği türden bir bug'ı yeniden sokardı.

- [ ] **Step 1: Testi yaz (RED)**

Create `src/lib/listing/marketplaceFilters.test.ts`:

```ts
import { filterListings, sortListings, mergeDemoOverlay, type ListingFilters } from './marketplaceFilters'

const BASE_FILTERS: ListingFilters = {
    type: [], minSize: 0, maxSize: 100000, imar: [], fizibiliteOnly: false, minScore: 10,
}

describe('filterListings', () => {
    it('type filtresi boşsa hiçbir ilanı elemez', () => {
        const listings = [{ type: 'SALE' }, { type: 'KAT_KARSILIGI' }]
        expect(filterListings(listings, BASE_FILTERS)).toHaveLength(2)
    })

    it('type filtresi doluysa yalnızca eşleşenleri döner', () => {
        const listings = [{ type: 'SALE' }, { type: 'KAT_KARSILIGI' }]
        const result = filterListings(listings, { ...BASE_FILTERS, type: ['SALE'] })
        expect(result).toEqual([{ type: 'SALE' }])
    })

    it('landSizeSqm aralık dışındaysa elenir', () => {
        const listings = [{ type: 'SALE', landSizeSqm: 50 }, { type: 'SALE', landSizeSqm: 500 }]
        const result = filterListings(listings, { ...BASE_FILTERS, minSize: 200, maxSize: 1000 })
        expect(result).toEqual([{ type: 'SALE', landSizeSqm: 500 }])
    })

    it('landSizeSqm eksikse (null/undefined) filtrelemeden geçer — eksik veri cezalandırılmaz', () => {
        const listings = [{ type: 'SALE', landSizeSqm: null }, { type: 'SALE' }]
        const result = filterListings(listings, { ...BASE_FILTERS, minSize: 200, maxSize: 1000 })
        expect(result).toHaveLength(2)
    })

    it('imar filtresi zoning alanına bakar', () => {
        const listings = [{ type: 'SALE', zoning: 'KONUT' }, { type: 'SALE', zoning: 'TARIM' }]
        const result = filterListings(listings, { ...BASE_FILTERS, imar: ['KONUT'] })
        expect(result).toEqual([{ type: 'SALE', zoning: 'KONUT' }])
    })

    it('fizibiliteOnly açıkken minScore altındaki veya skorsuz ilanlar elenir', () => {
        const listings = [
            { type: 'SALE', fizibiliteSkoru: 5 },
            { type: 'SALE', fizibiliteSkoru: 50 },
            { type: 'SALE' },
        ]
        const result = filterListings(listings, { ...BASE_FILTERS, fizibiliteOnly: true, minScore: 10 })
        expect(result).toEqual([{ type: 'SALE', fizibiliteSkoru: 50 }])
    })
})

describe('sortListings', () => {
    it('score_desc: fizibiliteSkoru büyükten küçüğe sıralar', () => {
        const listings = [{ fizibiliteSkoru: 10 }, { fizibiliteSkoru: 90 }, { fizibiliteSkoru: 50 }]
        expect(sortListings(listings, 'score_desc')).toEqual([
            { fizibiliteSkoru: 90 }, { fizibiliteSkoru: 50 }, { fizibiliteSkoru: 10 },
        ])
    })

    it('price_asc: price yoksa report.minApartmentPrice kullanır, küçükten büyüğe sıralar', () => {
        const listings = [
            { price: 500000 },
            { report: { minApartmentPrice: 100000 } },
            { price: 300000 },
        ]
        expect(sortListings(listings, 'price_asc')).toEqual([
            { report: { minApartmentPrice: 100000 } },
            { price: 300000 },
            { price: 500000 },
        ])
    })

    it('newest: createdAt büyükten küçüğe (en yeni önce) sıralar', () => {
        const listings = [
            { createdAt: '2026-01-01T00:00:00Z' },
            { createdAt: '2026-08-01T00:00:00Z' },
            { createdAt: '2026-05-01T00:00:00Z' },
        ]
        expect(sortListings(listings, 'newest')).toEqual([
            { createdAt: '2026-08-01T00:00:00Z' },
            { createdAt: '2026-05-01T00:00:00Z' },
            { createdAt: '2026-01-01T00:00:00Z' },
        ])
    })

    it('orijinal diziyi mutasyona uğratmaz', () => {
        const listings = [{ fizibiliteSkoru: 1 }, { fizibiliteSkoru: 2 }]
        const original = [...listings]
        sortListings(listings, 'score_desc')
        expect(listings).toEqual(original)
    })
})

describe('mergeDemoOverlay', () => {
    it('gerçek veride bulunan alanlar demo overlay değerini EZER (asla tersi değil)', () => {
        const real = { id: '1', zoning: 'TARIM' as string | null }
        const overlay = { zoning: 'KONUT', fizibiliteSkoru: 80 }
        expect(mergeDemoOverlay(real, overlay)).toEqual({ id: '1', zoning: 'TARIM', fizibiliteSkoru: 80 })
    })

    it('gerçek veride alan null olsa bile demo overlay onu EZMEZ — eksik veri uydurulmaz', () => {
        const real = { id: '1', zoning: null as string | null }
        const overlay = { zoning: 'KONUT' }
        expect(mergeDemoOverlay(real, overlay)).toEqual({ id: '1', zoning: null })
    })

    it('gerçek veride hiç olmayan alanlar overlay değerini alır', () => {
        const real: { id: string; fizibiliteSkoru?: number } = { id: '1' }
        const overlay = { fizibiliteSkoru: 80 }
        expect(mergeDemoOverlay(real, overlay)).toEqual({ id: '1', fizibiliteSkoru: 80 })
    })
})
```

- [ ] **Step 2: Testi çalıştır, RED olduğunu doğrula**

Run: `npx jest src/lib/listing/marketplaceFilters.test.ts`
Expected: FAIL — modül `./marketplaceFilters` bulunamadığı için derleme hatası.

- [ ] **Step 3: Implementasyonu yaz**

Create `src/lib/listing/marketplaceFilters.ts`:

```ts
export interface ListingFilters {
    type: string[]
    minSize: number
    maxSize: number
    imar: string[]
    fizibiliteOnly: boolean
    minScore: number
}

export interface FilterableListing {
    type: string
    landSizeSqm?: number | null
    zoning?: string | null
    fizibiliteSkoru?: number
}

export interface SortableListing {
    fizibiliteSkoru?: number
    price?: number
    report?: { minApartmentPrice?: number }
    createdAt?: string
}

export function filterListings<T extends FilterableListing>(listings: T[], filters: ListingFilters): T[] {
    return listings.filter(l => {
        if (filters.type.length > 0 && !filters.type.includes(l.type)) return false
        if (l.landSizeSqm != null && (l.landSizeSqm < filters.minSize || l.landSizeSqm > filters.maxSize)) return false
        if (filters.imar.length > 0 && !filters.imar.includes(l.zoning ?? '')) return false
        if (filters.fizibiliteOnly && (!l.fizibiliteSkoru || l.fizibiliteSkoru < filters.minScore)) return false
        return true
    })
}

export function sortListings<T extends SortableListing>(listings: T[], sortBy: string): T[] {
    return [...listings].sort((a, b) => {
        if (sortBy === 'score_desc') return (b.fizibiliteSkoru ?? 0) - (a.fizibiliteSkoru ?? 0)
        if (sortBy === 'price_asc') {
            return (a.price ?? a.report?.minApartmentPrice ?? 0) - (b.price ?? b.report?.minApartmentPrice ?? 0)
        }
        if (sortBy === 'newest') {
            return new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime()
        }
        return 0
    })
}

// Gerçek veride VAR OLAN alanlar (null dahil) demo overlay'i EZER — asla tersi değil.
// `zoning` gibi artık gerçek bir alan varsa, {...real, ...overlay} sırası satıcının
// girdiği veriyi sessizce mock değerle değiştirirdi.
export function mergeDemoOverlay<T extends object>(real: T, overlay: Partial<T>): T {
    return { ...overlay, ...real }
}
```

- [ ] **Step 4: Testi çalıştır, GREEN olduğunu doğrula**

Run: `npx jest src/lib/listing/marketplaceFilters.test.ts`
Expected: PASS (13/13).

- [ ] **Step 5: tsc kontrolü**

Run: `npx tsc --noEmit`
Expected: 0 hata.

- [ ] **Step 6: Commit**

```bash
git add src/lib/listing/marketplaceFilters.ts src/lib/listing/marketplaceFilters.test.ts
git commit -m "feat(marketplace): filterListings/sortListings saf fonksiyonları eklendi"
```

---

### Task 4: `FilterSidebar` — Emsal kaldırılıyor, İmar enum'u `zoning`'e hizalanıyor

**Files:**
- Modify: `src/components/marketplace/FilterSidebar.tsx`
- Modify: `src/components/marketplace/FilterSidebar.module.css` (yalnızca ölü kural varsa)
- Modify: `src/components/mobile/__tests__/FilterSidebar.test.tsx`

**Interfaces:**
- Consumes: `ListingFilters` tipi — `import type { ListingFilters } from '@/lib/listing/marketplaceFilters'` (Task 3).
- Produces: `FilterSidebar`'ın `Filters` prop tipi artık `ListingFilters` ile birebir aynı (emsal alanları yok, `imar` gerçek zoning değerleri taşıyor).

- [ ] **Step 1: Mevcut testi güncelle (RED)**

`src/components/mobile/__tests__/FilterSidebar.test.tsx` içindeki `FILTERS` sabitini güncelle:

```tsx
const FILTERS = {
    type: ['KAT_KARSILIGI'],
    minSize: 200, maxSize: 10000,
    imar: [] as string[],
    fizibiliteOnly: false, minScore: 10,
}
```

(`minEmsal: 0.8, maxEmsal: 3.0,` satırı silinir.) İmar chip testini yeni enum'a göre güncelle:

```tsx
    it('imar chip tıklaması onChange ile filtreyi ekler', () => {
        const onChange = jest.fn()
        render(<FilterSidebar filters={FILTERS} onChange={onChange} totalCount={0} />)
        fireEvent.click(screen.getByRole('button', { name: 'Konut' }))
        expect(onChange).toHaveBeenCalledWith({ ...FILTERS, imar: ['KONUT'] })
    })
```

(Bu test zaten 'Konut'→'KONUT' eşlemesini kullanıyordu, yeni enum'da da aynı kalıyor — değişiklik yalnızca `FILTERS` sabitinden emsal alanlarının çıkarılması.) Ayrıca yeni bir test ekle, EMSAL bölümünün artık render edilmediğini doğrulamak için:

```tsx
    it('EMSAL bölümü artık render edilmiyor (backing alan yok)', () => {
        render(<FilterSidebar filters={FILTERS} onChange={() => {}} totalCount={0} />)
        expect(screen.queryByText('EMSAL')).not.toBeInTheDocument()
    })

    it('Ticari imar chip tıklaması TICARI değerini gönderir (yeni enum, eski TICARET DEĞİL)', () => {
        const onChange = jest.fn()
        render(<FilterSidebar filters={FILTERS} onChange={onChange} totalCount={0} />)
        fireEvent.click(screen.getByRole('button', { name: 'Ticari' }))
        expect(onChange).toHaveBeenCalledWith({ ...FILTERS, imar: ['TICARI'] })
    })
```

- [ ] **Step 2: Testi çalıştır, RED olduğunu doğrula**

Run: `npx jest src/components/mobile/__tests__/FilterSidebar.test.tsx`
Expected: FAIL — "EMSAL bölümü artık render edilmiyor" testi henüz FAIL vermez (EMSAL hâlâ orada, bu adım aslında PASS gösterebilir çünkü assertion `not.toBeInTheDocument` — yanlış RED işareti vermemesi için önce component'i DEĞİŞTİRMEDEN "Ticari imar chip" testinin FAIL verdiğini doğrula (eski kod `TICARET` gönderiyor, `TICARI` değil) — bu gerçek RED'dir.

- [ ] **Step 3: `FilterSidebar.tsx`'i güncelle**

`src/components/marketplace/FilterSidebar.tsx` tam içeriğini şu şekilde güncelle:

```tsx
"use client";

import type { ListingFilters } from '@/lib/listing/marketplaceFilters';
import styles from './FilterSidebar.module.css';

interface Props {
    filters: ListingFilters;
    onChange: (f: ListingFilters) => void;
    totalCount: number;
    /** BottomSheet içinde tam genişlik varyantı */
    inSheet?: boolean;
    /** "Filtreleri Uygula" tıklanınca (sheet'i kapatmak için) */
    onApply?: () => void;
}

const TYPES = [
    { id: 'SALE', label: 'Satış' },
    { id: 'KAT_KARSILIGI', label: 'Kat Karşılığı / Ortaklık' },
];

const IMAR_OPTS = ['Konut', 'Ticari', 'Karma', 'Tarım'];
const IMAR_VALS = ['KONUT', 'TICARI', 'KARMA', 'TARIM'];

export function FilterSidebar({ filters, onChange, totalCount, inSheet = false, onApply }: Props) {
    const set = (partial: Partial<ListingFilters>) => onChange({ ...filters, ...partial });

    const toggleType = (id: string) => {
        const has = filters.type.includes(id);
        set({ type: has ? filters.type.filter(t => t !== id) : [...filters.type, id] });
    };

    const toggleImar = (val: string) => {
        const has = filters.imar.includes(val);
        set({ imar: has ? filters.imar.filter(v => v !== val) : [...filters.imar, val] });
    };

    const resetAll = () => onChange({
        type: ['KAT_KARSILIGI'],
        minSize: 200, maxSize: 10000,
        imar: [],
        fizibiliteOnly: false, minScore: 10,
    });

    return (
        <aside className={`${styles.sidebar} ${inSheet ? styles.inSheet : ''}`}>
            {/* Header */}
            <div className={styles.header}>
                <div className={styles.headerTitle}>Arsa İlanları</div>
                <div className={styles.headerCount}>{totalCount.toLocaleString('tr-TR')} ilan bulundu</div>
            </div>

            {/* Satış Türü */}
            <div className={styles.section}>
                <span className={styles.sectionLabel}>SATIŞ TÜRÜ</span>
                {TYPES.map(t => (
                    <label key={t.id} className={styles.checkRow}>
                        <div
                            onClick={() => toggleType(t.id)}
                            className={`${styles.checkBox} ${filters.type.includes(t.id) ? styles.checkBoxActive : ''}`}
                        >
                            {filters.type.includes(t.id) && <span className={styles.checkMark}>✓</span>}
                        </div>
                        {t.label}
                    </label>
                ))}
            </div>

            {/* Arsa Boyutu */}
            <div className={styles.section}>
                <span className={styles.sectionLabel}>ARSA BOYUTU (m²)</span>
                <div className={styles.rangeRow}>
                    <input type="number" value={filters.minSize} onChange={e => set({ minSize: +e.target.value })} className={styles.rangeInput} />
                    <span className={styles.rangeDash}>–</span>
                    <input type="number" value={filters.maxSize} onChange={e => set({ maxSize: +e.target.value })} className={styles.rangeInput} />
                </div>
            </div>

            {/* İmar Durumu */}
            <div className={styles.section}>
                <span className={styles.sectionLabel}>İMAR DURUMU</span>
                <div className={styles.chipWrap}>
                    {IMAR_OPTS.map((label, i) => {
                        const val = IMAR_VALS[i];
                        const active = filters.imar.includes(val);
                        return (
                            <button
                                key={val}
                                onClick={() => toggleImar(val)}
                                className={`${styles.chip} ${active ? styles.chipActive : ''}`}
                            >{label}</button>
                        );
                    })}
                </div>
            </div>

            {/* Fizibilite */}
            <div className={styles.section}>
                <span className={styles.sectionLabel}>FİZİBİLİTE</span>
                <label className={styles.toggleRow}>
                    <div
                        onClick={() => set({ fizibiliteOnly: !filters.fizibiliteOnly })}
                        className={`${styles.toggleTrack} ${filters.fizibiliteOnly ? styles.toggleTrackActive : ''}`}
                    >
                        <div className={`${styles.toggleThumb} ${filters.fizibiliteOnly ? styles.toggleThumbActive : ''}`} />
                    </div>
                    <span className={styles.toggleLabel}>Fizibilite Skoru Olanlar</span>
                </label>
                {filters.fizibiliteOnly && (
                    <div>
                        <div className={styles.scoreHeader}>
                            <span className={styles.scoreLabel}>Min Skor</span>
                            <span className={styles.scoreValue}>{filters.minScore}+</span>
                        </div>
                        <input type="range" min={10} max={90} value={filters.minScore} onChange={e => set({ minScore: +e.target.value })}
                            className={styles.scoreRange} />
                    </div>
                )}
            </div>

            {/* Buttons */}
            <div className={styles.footer}>
                <button className={styles.applyBtn} onClick={onApply}>Filtreleri Uygula</button>
                <button onClick={resetAll} className={styles.resetBtn}>Tümünü Sıfırla</button>
            </div>
        </aside>
    );
}
```

(Değişiklikler: `Filters` interface silindi, `ListingFilters` import edildi; `IMAR_OPTS`/`IMAR_VALS` yeni enum'a hizalandı; EMSAL `<div className={styles.section}>` bloğu tamamen kaldırıldı; `resetAll()`'dan `minEmsal`/`maxEmsal` çıkarıldı.)

- [ ] **Step 4: Testi çalıştır, GREEN olduğunu doğrula**

Run: `npx jest src/components/mobile/__tests__/FilterSidebar.test.tsx`
Expected: PASS (6/6).

- [ ] **Step 5: tsc kontrolü**

Run: `npx tsc --noEmit`
Expected: 0 hata.

- [ ] **Step 6: Commit**

```bash
git add src/components/marketplace/FilterSidebar.tsx src/components/mobile/__tests__/FilterSidebar.test.tsx
git commit -m "fix(marketplace): FilterSidebar emsal kaldırıldı, imar enum'u zoning'e hizalandı"
```

---

### Task 5: `ListingCard` — `zoning`, `landSizeSqm`, `createdAt` alanları

**Files:**
- Modify: `src/components/marketplace/ListingCard.tsx`
- Modify: `src/components/marketplace/ListingCard.photo.test.tsx` (yalnızca tip uyumu için gerekiyorsa)

**Interfaces:**
- Produces: `Listing` interface'i — `type`, `landSizeSqm?: number | null`, `zoning?: string`, `createdAt?: string` alanlarını taşır (Task 3'teki `FilterableListing`/`SortableListing`'e yapısal olarak uyumlu).

- [ ] **Step 1: Testi yaz (RED)**

`src/components/marketplace/ListingCard.photo.test.tsx` dosyasının sonuna yeni bir `describe` ekle:

```tsx
describe('ListingCard — imar durumu (zoning)', () => {
  it('list görünümde zoning gerçek enum etiketiyle gösterilir', () => {
    const listing: Listing = { id: 'z-1', title: 'Zoning Test', type: 'SALE', zoning: 'TARIM' };
    render(<ListingCard listing={listing} view="list" />);
    expect(screen.getByText(/Tarım/)).toBeInTheDocument();
  });

  it('zoning yoksa imar etiketi hiç render edilmez', () => {
    const listing: Listing = { id: 'z-2', title: 'Zoningsiz', type: 'SALE' };
    render(<ListingCard listing={listing} view="list" />);
    expect(screen.queryByText('Tarım')).not.toBeInTheDocument();
    expect(screen.queryByText('Konut')).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Testi çalıştır, RED olduğunu doğrula**

Run: `npx jest src/components/marketplace/ListingCard.photo.test.tsx`
Expected: FAIL — `Listing` tipinde `zoning` alanı yok (tsc/jest tip hatası) ve `IMAR_LABEL`/render hâlâ `imarDurumu`'na bakıyor, "Tarım" metni hiç basılmıyor.

- [ ] **Step 3: `ListingCard.tsx`'i güncelle**

`Listing` interface'inde (satır 14-31) `imarDurumu?: string;` satırını sil, yerine ve ek olarak şunları ekle:

```ts
export interface Listing {
    id: string;
    title: string;
    type: 'SALE' | 'KAT_KARSILIGI' | 'ORTAKLIK';
    city?: string;
    district?: string;
    m2?: number;
    price?: number;
    landSizeSqm?: number | null;
    arsaPayiMin?: number;
    arsaPayiMax?: number;
    fizibiliteSkoru?: number;
    emsalFiyat?: number;
    zoning?: string;
    photos?: string[];
    isNew?: boolean;
    changePercent?: number;
    createdAt?: string;
    report?: { landShareRatio?: number; minApartmentPrice?: number };
}
```

`IMAR_LABEL` sabitini (satır 48-53) güncelle:

```ts
const IMAR_LABEL: Record<string, string> = {
    KONUT: 'Konut',
    TICARI: 'Ticari',
    KARMA: 'Karma',
    TARIM: 'Tarım',
};
```

List view içindeki gösterim satırını (satır 142) güncelle:

```tsx
                        {listing.zoning && <> · {IMAR_LABEL[listing.zoning] ?? listing.zoning}</>}
```

- [ ] **Step 4: Testi çalıştır, GREEN olduğunu doğrula**

Run: `npx jest src/components/marketplace/ListingCard.photo.test.tsx`
Expected: PASS (5/5 — 3 mevcut + 2 yeni).

- [ ] **Step 5: tsc kontrolü**

Run: `npx tsc --noEmit`
Expected: 0 hata.

- [ ] **Step 6: Commit**

```bash
git add src/components/marketplace/ListingCard.tsx src/components/marketplace/ListingCard.photo.test.tsx
git commit -m "fix(marketplace): ListingCard zoning/landSizeSqm/createdAt alanlarını taşıyor"
```

---

### Task 6: `marketplace/page.tsx` — filtreleri gerçek veriye bağla, type coercion'ı kaldır, newest sıralamayı düzelt

**Files:**
- Modify: `src/app/marketplace/page.tsx`
- Modify: `src/app/marketplace/page.module.css`

**Interfaces:**
- Consumes: `filterListings`, `sortListings`, `mergeDemoOverlay`, `ListingFilters` (Task 3); `Listing` tipi (Task 5, artık `zoning`/`landSizeSqm`/`createdAt` taşıyor).

- [ ] **Step 1: `DEFAULT_FILTERS`'ı güncelle ve import ekle**

Dosyanın en üstündeki import bloğuna ekle:

```ts
import { filterListings, sortListings, mergeDemoOverlay, type ListingFilters } from '@/lib/listing/marketplaceFilters';
```

`DEFAULT_FILTERS` sabitini güncelle (satır 24-33):

```ts
const DEFAULT_FILTERS: ListingFilters = {
    type: ['KAT_KARSILIGI'],
    minSize: 200,
    maxSize: 10000,
    imar: [],
    fizibiliteOnly: false,
    minScore: 10,
};
```

- [ ] **Step 2: `MOCK_LISTINGS_EXTRA`'yı `zoning`'e taşı**

Satır 36-47'deki diziyi güncelle (eski `imarDurumu` değerleri → yeni `zoning` enum'una eşlenmiş):

```ts
const MOCK_LISTINGS_EXTRA = [
    { fizibiliteSkoru: 83, arsaPayiMin: 30, arsaPayiMax: 46, changePercent: 42.8, zoning: 'KONUT', isNew: false },
    { fizibiliteSkoru: 82, arsaPayiMin: 34, arsaPayiMax: 48, changePercent: 44.3, zoning: 'KARMA', isNew: false },
    { fizibiliteSkoru: 82, arsaPayiMin: 35, arsaPayiMax: 48, changePercent: 48.8, zoning: 'TICARI', isNew: true },
    { fizibiliteSkoru: 88, arsaPayiMin: 23, arsaPayiMax: 34, changePercent: 36.1, zoning: 'KONUT', isNew: true },
    { fizibiliteSkoru: 76, arsaPayiMin: 28, arsaPayiMax: 40, changePercent: 28.5, zoning: 'KONUT', isNew: false },
    { fizibiliteSkoru: 64, arsaPayiMin: 25, arsaPayiMax: 38, changePercent: 18.2, zoning: 'TARIM', isNew: false },
    { fizibiliteSkoru: 91, arsaPayiMin: 32, arsaPayiMax: 45, changePercent: 55.3, zoning: 'KARMA', isNew: true },
    { fizibiliteSkoru: 58, arsaPayiMin: 22, arsaPayiMax: 35, changePercent: -8.4, zoning: 'KONUT', isNew: false },
    { fizibiliteSkoru: 79, arsaPayiMin: 30, arsaPayiMax: 42, changePercent: 31.7, zoning: 'TICARI', isNew: false },
    { fizibiliteSkoru: 86, arsaPayiMin: 33, arsaPayiMax: 46, changePercent: 46.2, zoning: 'KONUT', isNew: true },
];
```

- [ ] **Step 3: `type` zorlamasını kaldır, overlay birleşimini `mergeDemoOverlay`'e taşı**

`enriched` map'indeki (satır 100-106) tüm bloğu değiştir. **Sıra önemli:** eski kod `{...l, ...mockExtra}` sırasıyla mock overlay'in gerçek veriyi EZMESİNE izin veriyordu — `zoning` artık gerçek bir alan olduğundan bu, satıcının girdiği zoning'i sessizce mock değerle değiştirirdi (Task 3'teki `mergeDemoOverlay` tam olarak bunu önlemek için yazıldı, ters sırayı kullanır):

```ts
                const enriched = (arr as Listing[]).map((l, i): Listing =>
                    mergeDemoOverlay(l, MOCK_LISTINGS_EXTRA[i % MOCK_LISTINGS_EXTRA.length] || {})
                );
```

- [ ] **Step 4: `filtered`/`sorted`'ı paylaşılan fonksiyonlara taşı**

Satır 144-158'deki mevcut `filtered`/`sorted` bloklarını sil, yerine:

```ts
    const filtered = filterListings(listings, filters);
    const sorted = sortListings(filtered, sortBy);
```

- [ ] **Step 5: Üst bardaki Emsal çipini kaldır**

Satır 192-195'teki bloğu tamamen sil:

```tsx
                {/* Emsal quick filter */}
                <span className={styles.emsalChip}>
                    Emsal: {filters.minEmsal}–{filters.maxEmsal}
                </span>
```

- [ ] **Step 6: `page.module.css`'teki ölü `.emsalChip` kurallarını sil**

`src/app/marketplace/page.module.css` içindeki iki `.emsalChip` bloğunu (satır 131-139 base, satır 380-383 mobil media query içinde) tamamen sil.

- [ ] **Step 7: tsc kontrolü**

Run: `npx tsc --noEmit`
Expected: 0 hata. (Bu, `filters.minEmsal`/`maxEmsal` referanslarının hiçbir yerde kalmadığını da doğrular — kaldıysa tip hatası verir.)

- [ ] **Step 8: Jest tam paket koşumu**

Run: `npx jest src/app/marketplace src/lib/listing/marketplaceFilters.test.ts src/components/marketplace src/components/mobile/__tests__/FilterSidebar.test.tsx`
Expected: tüm paketler PASS (page.tsx'in kendi doğrudan testi yok — mantık zaten Task 3/4/5'te test edildi; bu adım yalnızca regresyon taramasıdır).

- [ ] **Step 9: Commit**

```bash
git add src/app/marketplace/page.tsx src/app/marketplace/page.module.css
git commit -m "fix(marketplace): type zorlaması kaldırıldı, filtre/sıralama paylaşılan fonksiyonlara taşındı, emsal çipi silindi"
```

---

### Task 7: İlan detay sayfası — gerçek `zoning` gösterimi

**Files:**
- Modify: `src/lib/listing/listingDisplay.ts`
- Modify: `src/lib/listing/listingDisplay.test.ts`
- Modify: `src/app/listing/[id]/page.tsx`

**Interfaces:**
- Produces: `formatZoningLabel(zoning?: string | null): string` — `'—'` (boşsa) veya Türkçe etiket (`'Konut'|'Ticari'|'Karma'|'Tarım'`) veya bilinmeyen değeri olduğu gibi döner.

- [ ] **Step 1: Testi yaz (RED)**

`src/lib/listing/listingDisplay.test.ts` dosyasının sonuna ekle:

```ts
import { formatZoningLabel } from './listingDisplay'

describe('formatZoningLabel', () => {
    it('null/undefined ise "—" döner (uydurma değer YAZILMAZ)', () => {
        expect(formatZoningLabel(null)).toBe('—')
        expect(formatZoningLabel(undefined)).toBe('—')
    })

    it('bilinen enum değerlerini Türkçe etikete çevirir', () => {
        expect(formatZoningLabel('KONUT')).toBe('Konut')
        expect(formatZoningLabel('TICARI')).toBe('Ticari')
        expect(formatZoningLabel('KARMA')).toBe('Karma')
        expect(formatZoningLabel('TARIM')).toBe('Tarım')
    })

    it('bilinmeyen bir değer gelirse olduğu gibi gösterir (veri kaybı yok)', () => {
        expect(formatZoningLabel('BESKE_DEGER')).toBe('BESKE_DEGER')
    })
})
```

- [ ] **Step 2: Testi çalıştır, RED olduğunu doğrula**

Run: `npx jest src/lib/listing/listingDisplay.test.ts`
Expected: FAIL — `formatZoningLabel` export edilmiyor.

- [ ] **Step 3: Fonksiyonu ekle**

`src/lib/listing/listingDisplay.ts` dosyasının sonuna ekle:

```ts
const ZONING_LABEL: Record<string, string> = {
    KONUT: 'Konut',
    TICARI: 'Ticari',
    KARMA: 'Karma',
    TARIM: 'Tarım',
}

export function formatZoningLabel(zoning?: string | null): string {
    if (!zoning) return '—'
    return ZONING_LABEL[zoning] ?? zoning
}
```

- [ ] **Step 4: Testi çalıştır, GREEN olduğunu doğrula**

Run: `npx jest src/lib/listing/listingDisplay.test.ts`
Expected: PASS (tüm testler, önceki `formatParcelIdentity`/`formatAreaCells` testleri dahil).

- [ ] **Step 5: `listing/[id]/page.tsx`'i güncelle**

Import satırını güncelle (satır 12):

```ts
import { formatParcelIdentity, formatAreaCells, formatZoningLabel } from '@/lib/listing/listingDisplay';
```

`MOCK_LISTING`'de (satır 37) `imarDurumu: 'KONUT_TICARET',` satırını sil, yerine ekle:

```ts
    zoning: 'KARMA',
```

Detay grid'inde (satır 241) satırı güncelle:

```tsx
                                        ['İmar Durumu', formatZoningLabel(listing.zoning)],
```

Kod yorumunu (satır 255-257) ve demo banner metnini (satır 258-261) güncelle:

```tsx
                                {/* emsal / arsaPayi alanlari Prisma semasinda HIC yok; API
                                    onlari donduremez, dolayisiyla her ilanda ayni ornek
                                    degerler gorunur. imarDurumu artik GERCEK `zoning` alanindan
                                    okunuyor (bkz. formatZoningLabel) — bu banner artik onu kapsamaz. */}
                                <div className={styles.demoNote} role="note">
                                    <strong>Örnek veri</strong> — Emsal ve arsa payı bilgileri henüz
                                    toplanmadığı için tanıtım amaçlı örnek değerlerdir; bu ilana ait değildir.
                                </div>
```

- [ ] **Step 6: tsc kontrolü**

Run: `npx tsc --noEmit`
Expected: 0 hata.

- [ ] **Step 7: Commit**

```bash
git add src/lib/listing/listingDisplay.ts src/lib/listing/listingDisplay.test.ts src/app/listing/[id]/page.tsx
git commit -m "fix(listing): İmar Durumu artık gerçek zoning alanından okunuyor, demo banner metni güncellendi"
```

---

### Task 8: `CitySearch` — ilçe seçince il bilgisinin kaybolması düzeltiliyor

**Files:**
- Modify: `src/components/marketplace/CitySearch.tsx`
- Modify: `src/app/marketplace/page.tsx`
- Test: `src/components/marketplace/CitySearch.test.tsx` (yeni)

**Interfaces:**
- Produces: `onCitySelect: (city: { name: string; lat: number; lng: number; zoom: number; province?: string }) => void` — ilçe seçiminde `province` dolu gelir, il seçiminde gelmez.

- [ ] **Step 1: Testi yaz (RED)**

Create `src/components/marketplace/CitySearch.test.tsx`:

```tsx
/** @jest-environment jsdom */
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { useState } from 'react'
import { CitySearch } from './CitySearch'

type SelectedCity = { name: string; lat: number; lng: number; zoom: number; province?: string }

function Harness({ onSelect }: { onSelect?: (c: SelectedCity) => void }) {
    const [selectedCity, setSelectedCity] = useState('')
    return (
        <CitySearch
            selectedCity={selectedCity}
            onCitySelect={(city) => { setSelectedCity(city.name); onSelect?.(city) }}
        />
    )
}

describe('CitySearch — il/ilçe state', () => {
    it('ilçe seçildikten sonra "İlçe" butonu kaybolmaz, province bilgisi callback ile geçer', () => {
        const onSelect = jest.fn()
        render(<Harness onSelect={onSelect} />)

        fireEvent.change(screen.getByPlaceholderText('İl ara…'), { target: { value: 'İstanbul' } })
        fireEvent.click(screen.getByText('İstanbul'))

        fireEvent.click(screen.getByRole('button', { name: /İlçe/i }))
        fireEvent.click(screen.getByText('Kadıköy'))

        expect(onSelect).toHaveBeenLastCalledWith({ name: 'Kadıköy', lat: 40.9927, lng: 29.0277, zoom: 14, province: 'İstanbul' })
        expect(screen.getByRole('button', { name: /İlçe/i })).toBeInTheDocument()
    })

    it('il seçiminde province alanı gönderilmez', () => {
        const onSelect = jest.fn()
        render(<Harness onSelect={onSelect} />)

        fireEvent.change(screen.getByPlaceholderText('İl ara…'), { target: { value: 'İstanbul' } })
        fireEvent.click(screen.getByText('İstanbul'))

        expect(onSelect).toHaveBeenLastCalledWith({ name: 'İstanbul', lat: 41.015, lng: 28.979, zoom: 12 })
    })
})
```

- [ ] **Step 2: Testi çalıştır, RED olduğunu doğrula**

Run: `npx jest src/components/marketplace/CitySearch.test.tsx`
Expected: FAIL — ilk test'te ilçe seçiminden sonra "İlçe" butonu artık DOM'da yok (eski kod `DISTRICTS[selectedCity]`'e bakıyor, `selectedCity` prop'u `'Kadıköy'` olunca boş dizi döner) ve `onSelect` çağrısı `province` alanı taşımıyor.

- [ ] **Step 3: `CitySearch.tsx`'i güncelle**

`Props` interface'ini (satır 184-187) güncelle:

```ts
interface Props {
    onCitySelect: (city: { name: string; lat: number; lng: number; zoom: number; province?: string }) => void;
    selectedCity: string;
}
```

Component gövdesinde state ekle ve `districts` hesaplamasını değiştir (satır 189-195):

```ts
export function CitySearch({ onCitySelect, selectedCity }: Props) {
    const [query, setQuery] = useState('');
    const [open, setOpen] = useState(false);
    const [showDistricts, setShowDistricts] = useState(false);
    const [provinceName, setProvinceName] = useState(selectedCity);
    const wrapperRef = useRef<HTMLDivElement>(null);

    const districts = DISTRICTS[provinceName] || [];
```

İl satırı tıklama handler'ını (satır 258-263) güncelle:

```tsx
                                    onClick={() => {
                                        setProvinceName(city.name);
                                        onCitySelect(city);
                                        setQuery('');
                                        setOpen(false);
                                        setShowDistricts(false);
                                    }}
```

İlçe satırı tıklama handler'ını (satır 324-327) güncelle:

```tsx
                                    onClick={() => {
                                        onCitySelect({ name: d.name, lat: d.lat, lng: d.lng, zoom: d.zoom, province: provinceName });
                                        setShowDistricts(false);
                                    }}
```

- [ ] **Step 4: Testi çalıştır, GREEN olduğunu doğrula**

Run: `npx jest src/components/marketplace/CitySearch.test.tsx`
Expected: PASS (2/2).

- [ ] **Step 5: `marketplace/page.tsx`'teki `onCitySelect` handler'ını güncelle**

Satır 171-178'i güncelle:

```tsx
                <CitySearch
                    selectedCity={selectedCity}
                    onCitySelect={(city) => {
                        setSelectedCity(city.name);
                        mapRef.current?.flyTo(city.lat, city.lng, city.zoom);
                        mapRef.current?.showProvinceBorder(city.province ?? city.name);
                    }}
                />
```

- [ ] **Step 6: tsc kontrolü**

Run: `npx tsc --noEmit`
Expected: 0 hata.

- [ ] **Step 7: Tam jest paketi + son doğrulama**

Run: `npx jest`
Expected: tüm suite'ler PASS, önceki task'larda eklenen/değiştirilen hiçbir test kırılmamış.

- [ ] **Step 8: Commit**

```bash
git add src/components/marketplace/CitySearch.tsx src/components/marketplace/CitySearch.test.tsx src/app/marketplace/page.tsx
git commit -m "fix(marketplace): CitySearch ilçe seçiminde il/province bilgisini artık kaybetmiyor"
```

---

## Son Doğrulama (task'lar bittikten sonra, tek seferlik)

- [ ] `npx tsc --noEmit` — 0 hata (tüm proje)
- [ ] `npx jest` — tüm suite'ler yeşil
- [ ] Docker/DB açıksa: gerçek bir ilan `type: SALE` ile yayınlanıp pazar yerinde "Satış" hızlı filtresiyle gerçekten görünüp görünmediği, boyut filtresinin sonuç sayısını gerçekten değiştirip değiştirmediği, bir il seçilip ilçeye geçildikten sonra "İlçe ▾" butonunun kaybolmadığı Playwright ile canlı doğrulanır.
