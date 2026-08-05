# Parsel Doğrulama Sheet — Derin Cam Implementasyon Planı

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/hesapla` ve ilan sihirbazının (`/listings/new`) parsel doğrulama akışlarını, mockup'ta
onaylanan tek bir Derin Cam bileşeninde (`ParcelVerificationSheet`) birleştirmek.

**Architecture:** `ParcelModal.tsx` + `ManualParcelEntryModal.tsx` birleşip yeni paylaşılan
`ParcelVerificationSheet.tsx`'e taşınır. Masaüstünde mevcut ortalanmış-modal kabuğu aynen kalır;
mobilde zaten var olan `BottomSheet` bileşeni (sürükle-kapat, reduced-motion çözülmüş) yeniden
kullanılır. `ParcelPicker` haritayı/pin/TKGM-doğrulamayı sahiplenmeye devam eder ama
"Konumumu Bul"/"Elle Gir" giriş satırını kaybeder — geolocation harita köşesinde bir ikona
taşınır, elle giriş ise `ManualParcelEntryModal`'dan çıkarılan saf bir form bileşeni
(`ManualParcelEntryForm`) olarak sheet'in toggle'ına bağlanır.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Leaflet, Jest + RTL, framer-motion
(zaten `BottomSheet` üzerinden).

**Spec:** `docs/superpowers/specs/2026-08-05-parsel-dogrulama-sheet-derin-cam-design.md`

## Global Constraints

- **Baseline:** `main` `b72536d` — tsc 0 hata, jest **108 suite / 815 test** geçiyor.
- **Test komutu:** `npx jest --no-coverage --roots "<rootDir>/src"` (ana checkout'ta düz
  `npx jest` başka worktree kopyalarını da toplayıp sahte hata verebilir).
- **Görsel token değişikliği (Derin Cam `--seal-*`) yalnızca `@media (max-width: 768px)` içinde.**
  Masaüstünde renk/yüzey token'ı DEĞİŞMEZ. Yapısal değişiklikler (toggle, geolocation ikonu,
  sheet↔modal seçimi) her iki genişlikte de geçerlidir — bunlar renk değil düzen kararı.
- **Kanonik aksan:** `--seal-accent: var(--aurora-cyan)`, `--seal-accent-rgb: 43, 124, 255`.
  Literal hex YAZILMAYACAK.
- **Beyaz metin taşıyan hiçbir yeni accent-dolgu buton düz `--seal-accent` KULLANMAYACAK.**
  Bu oturumda ölçülüp onaylanan `color-mix(in srgb, var(--seal-accent) 82%, #0F2A43)` (canlı
  ölçümde 4.855:1, WCAG AA üstü) kullanılacak. Her yeni accent-dolgu buton canlı ölçümle
  doğrulanacak — "final review'da bulunur" değil, task içinde.
- **Specificity: kaynak sırasına güvenilmeyecek.** `BottomSheet`'e `className` ile eklenen
  ekstra sınıf, `BottomSheet.module.css`'in kendi `.sheet` kuralıyla AYNI dosyada değil — CSS
  modüllerinin paket sırası garanti değil. Bu yüzden `ParcelVerificationSheet`'in sheet
  arka planı `!important` taşıyacak (Task 4/5'te `.sidebar`/`.convItemActive`'de öğrenilen
  ders: iki ayrı dosyadaki eşit-specificity kural arasında kazananı kaynak sırası belirler,
  buna güvenilmez).
- **`globals.css` ve `src/components/ui/{Card,Input,Button}` değiştirilmeyecek.**
- **`BottomSheet.tsx`/`BottomSheet.module.css`'in MEVCUT davranışı hiçbir tüketici için
  değişmeyecek.** Yeni `className` prop'u opsiyonel ve varsayılan boş — `GelismisAyarlarSheet`
  gibi diğer tüketiciler etkilenmeyecek.
- Türkçe kullanıcı metinleri; commit mesajları ASCII (mevcut repo deseni).

## Dosya Yapısı

| Dosya | Sorumluluk | Task |
|---|---|---|
| `src/components/mobile/BottomSheet.tsx` | opsiyonel `className` prop'u | 1 |
| `src/components/listing-wizard/ManualParcelEntryForm.tsx` | **yeni** — saf form, modal kabuğu yok | 2 |
| `src/components/listing-wizard/ManualParcelEntryForm.module.css` | **yeni** | 2 |
| `src/components/listing-wizard/ParcelPicker.tsx` | entryRow kaldırılır, geolocation ikona taşınır, `forwardRef` eklenir | 3 |
| `src/components/listing-wizard/ParcelPicker.module.css` | entryRow stilleri kaldırılır, locate-ikonu eklenir | 3 |
| `src/components/risk/RiskSuggestionCard.tsx` | `hideApply` prop'u | 4 |
| `src/components/listing-wizard/ParcelVerificationSheet.tsx` | **yeni** — paylaşılan sheet | 5 |
| `src/components/listing-wizard/ParcelVerificationSheet.module.css` | **yeni** | 5, 8 |
| `src/app/hesapla/page.tsx` | `ParcelModal` → `ParcelVerificationSheet` | 6 |
| `src/components/listing-wizard/WizardStep1Location.tsx` | gömülü `ParcelPicker` → tetikleyici + özet | 7 |

**Silinecekler (ilgili task içinde):** `src/app/hesapla/ParcelModal.tsx`,
`src/app/hesapla/ParcelModal.module.css`, `src/components/listing-wizard/ManualParcelEntryModal.tsx`,
`src/components/listing-wizard/ManualParcelEntryModal.module.css`,
`src/components/listing-wizard/ManualParcelEntryModal.test.tsx`.

---

### Task 1: `BottomSheet`'e opsiyonel `className` prop'u

**Files:**
- Modify: `src/components/mobile/BottomSheet.tsx`
- Test: `src/components/mobile/__tests__/BottomSheet.test.tsx` (mevcut dosyaya ekleme)

**Interfaces:**
- Consumes: —
- Produces: `BottomSheetProps.className?: string` — verilirse `.sheet` elemanına eklenir.

- [ ] **Step 1: Failing test'i yaz**

`src/components/mobile/__tests__/BottomSheet.test.tsx` sonuna ekle (mevcut testleri değiştirme):

```tsx
it('className verilirse .sheet elemanina eklenir, verilmezse davranis degismez', () => {
    const { rerender, getByRole } = render(
        <BottomSheet open onClose={jest.fn()} title="Test">
            <p>icerik</p>
        </BottomSheet>,
    )
    expect(getByRole('dialog').className).not.toMatch(/custom-glass/)

    rerender(
        <BottomSheet open onClose={jest.fn()} title="Test" className="custom-glass">
            <p>icerik</p>
        </BottomSheet>,
    )
    expect(getByRole('dialog').className).toMatch(/custom-glass/)
})
```

- [ ] **Step 2: Test'i çalıştır, başarısız olduğunu gör**

Run: `npx jest --no-coverage --roots "<rootDir>/src" BottomSheet`
Expected: FAIL — `className` prop'u yok, ikinci `expect` başarısız.

- [ ] **Step 3: Prop'u ekle**

`src/components/mobile/BottomSheet.tsx`:

```tsx
interface BottomSheetProps {
    open: boolean;
    onClose: () => void;
    title?: string;
    /** Ek CSS sinifi — `.sheet` elemanina eklenir. Varsayilan davranis degismez. */
    className?: string;
    children: React.ReactNode;
}
```

```tsx
export function BottomSheet({ open, onClose, title, className, children }: BottomSheetProps) {
```

`className={styles.sheet}` olan satırı bul ve değiştir:

```tsx
                        className={`${styles.sheet} ${className || ''}`}
```

- [ ] **Step 4: Test'i çalıştır, geçtiğini gör**

Run: `npx jest --no-coverage --roots "<rootDir>/src" BottomSheet`
Expected: PASS — bu dosyanın tüm testleri (yeni + mevcut).

- [ ] **Step 5: Tam suite**

Run: `npx jest --no-coverage --roots "<rootDir>/src"`
Expected: 816/816 PASS (815 baseline + 1 yeni).

- [ ] **Step 6: Commit**

```bash
git add src/components/mobile/BottomSheet.tsx src/components/mobile/__tests__/BottomSheet.test.tsx
git commit -m "feat(mobile): BottomSheet'e opsiyonel className prop'u ekle"
```

---

### Task 2: `ManualParcelEntryForm` — saf form bileşeni

**Files:**
- Create: `src/components/listing-wizard/ManualParcelEntryForm.tsx`
- Create: `src/components/listing-wizard/ManualParcelEntryForm.module.css`
- Test: `src/components/listing-wizard/ManualParcelEntryForm.test.tsx`

**Interfaces:**
- Consumes: —
- Produces: `ManualParcelReference` tipi (mevcut `ManualParcelEntryModal`'daki ile AYNI şekil:
  `{ il, ilce, mahalle, ada, parsel }`), `ManualParcelEntryFormProps { onLocationFound: (lat: number, lng: number, reference: ManualParcelReference) => void }`.

**Not:** `ManualParcelEntryModal.tsx` bu task'ta HENÜZ silinmiyor — `ParcelPicker.tsx` ona hâlâ
bağımlı (Task 3'te kaldırılacak). Bu task yalnızca yeni, modal-kabuğu-olmayan halini yaratır.

- [ ] **Step 1: Failing test'i yaz**

`src/components/listing-wizard/ManualParcelEntryForm.test.tsx`:

```tsx
/** @jest-environment jsdom */
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { ManualParcelEntryForm } from './ManualParcelEntryForm'

function mockNominatim(body: unknown) {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => body }) as unknown as typeof fetch
}

describe('ManualParcelEntryForm', () => {
    afterEach(() => { jest.restoreAllMocks() })

    it('il/ilce doldurulmadan Sorgula devre disidir', () => {
        render(<ManualParcelEntryForm onLocationFound={jest.fn()} />)
        expect(screen.getByRole('button', { name: /Sorgula/i })).toBeDisabled()
    })

    it('il ve ilce girilince buton etkinlesir, aramada bulunan konum onLocationFound ile bildirilir', async () => {
        mockNominatim([{ lat: '41.167877', lon: '27.583458' }])
        const onLocationFound = jest.fn()
        render(<ManualParcelEntryForm onLocationFound={onLocationFound} />)

        fireEvent.change(screen.getByLabelText('İl *'), { target: { value: 'Tekirdağ' } })
        fireEvent.change(screen.getByLabelText('İlçe *'), { target: { value: 'Muratlı' } })
        fireEvent.change(screen.getByLabelText('Mahalle'), { target: { value: 'Kırkkepenekli' } })
        fireEvent.change(screen.getByLabelText('Ada No'), { target: { value: '0' } })
        fireEvent.change(screen.getByLabelText('Parsel No'), { target: { value: '1871' } })

        fireEvent.click(screen.getByRole('button', { name: /Sorgula/i }))

        await waitFor(() => {
            expect(onLocationFound).toHaveBeenCalledWith(41.167877, 27.583458, {
                il: 'Tekirdağ', ilce: 'Muratlı', mahalle: 'Kırkkepenekli', ada: '0', parsel: '1871',
            })
        })
    })

    it('sonuc bulunamazsa hata gosterir', async () => {
        mockNominatim([])
        const onLocationFound = jest.fn()
        render(<ManualParcelEntryForm onLocationFound={onLocationFound} />)

        fireEvent.change(screen.getByLabelText('İl *'), { target: { value: 'Bilinmeyen' } })
        fireEvent.change(screen.getByLabelText('İlçe *'), { target: { value: 'Yer' } })
        fireEvent.click(screen.getByRole('button', { name: /Sorgula/i }))

        await waitFor(() => {
            expect(screen.getByText(/konum bulunamadı/i)).toBeInTheDocument()
        })
        expect(onLocationFound).not.toHaveBeenCalled()
    })

    it('ag hatasinda hata mesaji gosterir', async () => {
        global.fetch = jest.fn().mockRejectedValue(new Error('network')) as unknown as typeof fetch
        render(<ManualParcelEntryForm onLocationFound={jest.fn()} />)

        fireEvent.change(screen.getByLabelText('İl *'), { target: { value: 'Tekirdağ' } })
        fireEvent.change(screen.getByLabelText('İlçe *'), { target: { value: 'Muratlı' } })
        fireEvent.click(screen.getByRole('button', { name: /Sorgula/i }))

        await waitFor(() => {
            expect(screen.getByText(/konum aranırken bir sorun oluştu/i)).toBeInTheDocument()
        })
    })
})
```

- [ ] **Step 2: Test'i çalıştır, başarısız olduğunu gör**

Run: `npx jest --no-coverage --roots "<rootDir>/src" ManualParcelEntryForm`
Expected: FAIL — modül bulunamıyor.

- [ ] **Step 3: Bileşeni yaz**

`ManualParcelEntryModal.tsx`'in state/handleSearch mantığı BİREBİR taşınır; overlay/header/footer
(isOpen, onClose, Vazgeç butonu, X kapat) kalkar — bunlar artık `ParcelVerificationSheet`'in
sheet kabuğuna ait. Buton metni mockup'a uyacak şekilde **"Haritada Göster" → "Sorgula"** olarak
değişir.

`src/components/listing-wizard/ManualParcelEntryForm.tsx`:

```tsx
'use client'

import { useState } from 'react'
import styles from './ManualParcelEntryForm.module.css'

export type ManualParcelReference = {
    il: string
    ilce: string
    mahalle: string
    ada: string
    parsel: string
}

interface Props {
    onLocationFound: (lat: number, lng: number, reference: ManualParcelReference) => void
}

export function ManualParcelEntryForm({ onLocationFound }: Props) {
    const [il, setIl] = useState('')
    const [ilce, setIlce] = useState('')
    const [mahalle, setMahalle] = useState('')
    const [ada, setAda] = useState('')
    const [parsel, setParsel] = useState('')
    const [searching, setSearching] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const canSearch = il.trim() !== '' && ilce.trim() !== '' && !searching

    const handleSearch = async () => {
        if (!canSearch) return
        setSearching(true)
        setError(null)
        try {
            // TKGM'in il/ilce/mahalle/ada/parsel ile sorgulanabilecegi bir uc
            // noktasi yok (sadece nokta-tabanli lookup var, bkz. ParcelPicker).
            // Bu yuzden burada yalnizca YAKLASIK bir konuma gidiyoruz; gercek
            // TKGM dogrulamasi kullanicinin haritada pini ayarlayip "Parseli
            // Dogrula"ya basmasiyla calisan mevcut nokta-tabanli akista olur.
            const query = [mahalle, ilce, il, 'Türkiye'].filter(Boolean).join(', ')
            const res = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=tr&q=${encodeURIComponent(query)}`,
            )
            const data = await res.json()
            if (!Array.isArray(data) || data.length === 0) {
                setError('Bu adres için konum bulunamadı. Daha genel yazmayı deneyin veya haritadan elle işaretleyin.')
                return
            }
            const { lat, lon } = data[0]
            onLocationFound(parseFloat(lat), parseFloat(lon), { il, ilce, mahalle, ada, parsel })
        } catch {
            setError('Konum aranırken bir sorun oluştu. Lütfen tekrar deneyin.')
        } finally {
            setSearching(false)
        }
    }

    return (
        <div className={styles.form}>
            <p className={styles.instructions}>
                Tapu veya senette yazan bilgileri girin.
            </p>

            <div className={styles.row}>
                <div className={styles.field}>
                    <label className={styles.label} htmlFor="manual-il">İl *</label>
                    <input
                        id="manual-il"
                        className={styles.input}
                        value={il}
                        onChange={e => setIl(e.target.value)}
                        placeholder="Örn. Tekirdağ"
                    />
                </div>
                <div className={styles.field}>
                    <label className={styles.label} htmlFor="manual-ilce">İlçe *</label>
                    <input
                        id="manual-ilce"
                        className={styles.input}
                        value={ilce}
                        onChange={e => setIlce(e.target.value)}
                        placeholder="Örn. Muratlı"
                    />
                </div>
            </div>

            <div className={styles.field}>
                <label className={styles.label} htmlFor="manual-mahalle">Mahalle</label>
                <input
                    id="manual-mahalle"
                    className={styles.input}
                    value={mahalle}
                    onChange={e => setMahalle(e.target.value)}
                    placeholder="Örn. Kırkkepenekli"
                />
            </div>

            <div className={styles.row}>
                <div className={styles.field}>
                    <label className={styles.label} htmlFor="manual-ada">Ada No</label>
                    <input
                        id="manual-ada"
                        className={styles.input}
                        value={ada}
                        onChange={e => setAda(e.target.value)}
                        placeholder="örn. 1521"
                    />
                </div>
                <div className={styles.field}>
                    <label className={styles.label} htmlFor="manual-parsel">Parsel No</label>
                    <input
                        id="manual-parsel"
                        className={styles.input}
                        value={parsel}
                        onChange={e => setParsel(e.target.value)}
                        placeholder="örn. 7"
                    />
                </div>
            </div>

            {error && <div className={styles.errorNote}>{error}</div>}

            <button type="button" className={styles.searchBtn} onClick={handleSearch} disabled={!canSearch}>
                {searching ? 'Aranıyor…' : 'Sorgula'}
            </button>
        </div>
    )
}
```

- [ ] **Step 4: CSS'i yaz**

`ManualParcelEntryModal.module.css`'ten yalnızca form-alanı kurallarını taşı (overlay/modal/
header/footer/cancelBtn KALMAZ):

`src/components/listing-wizard/ManualParcelEntryForm.module.css`:

```css
.form {
    display: flex;
    flex-direction: column;
    gap: 14px;
}

.instructions {
    margin: 0;
    font-size: 0.85rem;
    line-height: 1.5;
    color: var(--label-color);
}

.row {
    display: flex;
    gap: 12px;
}

.field {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 6px;
}

.label {
    font-size: 0.8rem;
    font-weight: 700;
    color: var(--label-color);
}

.input {
    padding: 10px 12px;
    border-radius: 10px;
    border: 1px solid var(--border);
    background: var(--input-bg);
    color: var(--text);
    font-size: 0.9rem;
}

.errorNote {
    padding: 10px 14px;
    border-radius: 12px;
    border: 1px solid rgba(var(--orange-rgb), 0.35);
    background: rgba(var(--orange-rgb), 0.07);
    font-size: 0.82rem;
    color: var(--label-color);
}

.searchBtn {
    padding: 10px 16px;
    border-radius: 10px;
    border: none;
    background: var(--brand-gradient);
    color: #fff;
    font-weight: 800;
    font-size: 0.85rem;
    cursor: pointer;
}

.searchBtn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

@media (max-width: 768px) {
    .row {
        flex-direction: column;
        gap: 14px;
    }

    .searchBtn {
        min-height: 44px;
    }
}
```

- [ ] **Step 5: Test'i çalıştır, geçtiğini gör**

Run: `npx jest --no-coverage --roots "<rootDir>/src" ManualParcelEntryForm`
Expected: 4/4 PASS.

- [ ] **Step 6: Tam suite**

Run: `npx jest --no-coverage --roots "<rootDir>/src"`
Expected: 820/820 PASS (816 + 4 yeni). `npx tsc --noEmit` → 0.

- [ ] **Step 7: Commit**

```bash
git add src/components/listing-wizard/ManualParcelEntryForm.tsx src/components/listing-wizard/ManualParcelEntryForm.module.css src/components/listing-wizard/ManualParcelEntryForm.test.tsx
git commit -m "feat(listing-wizard): ManualParcelEntryForm ekle — modal kabugu olmayan saf form"
```

---

### Task 3: `ParcelPicker` — entryRow kaldır, geolocation ikona taşı, `forwardRef` ekle

**Files:**
- Modify: `src/components/listing-wizard/ParcelPicker.tsx`
- Modify: `src/components/listing-wizard/ParcelPicker.module.css`
- Modify: `src/components/listing-wizard/ParcelPicker.test.tsx` (yeni test ekleme)
- Delete: `src/components/listing-wizard/ManualParcelEntryModal.tsx`
- Delete: `src/components/listing-wizard/ManualParcelEntryModal.module.css`
- Delete: `src/components/listing-wizard/ManualParcelEntryModal.test.tsx`

**Interfaces:**
- Consumes: Task 2'nin `ManualParcelEntryForm` (ARTIK BURADAN İMPORT EDİLMİYOR — sheet'e taşındı,
  bu task'ta `ParcelPicker`'dan tüm elle-giriş bağımlılığı kaldırılıyor).
- Produces: `ParcelPickerHandle { placePin(lat: number, lng: number): void }`, `ParcelPicker`
  artık `forwardRef<ParcelPickerHandle, Props>` — Task 5'te sheet bu ref'i kullanacak.

**Mevcut değerler (dokunmadan önce, `ParcelPicker.tsx`):** `entryRow` div'i `handleUseMyLocation`
ve `() => setManualModalOpen(true)` butonlarını içeriyor; `manualModalOpen`/`manualRef` state'i
ve `<ManualParcelEntryModal>` render'ı, `manualNote` gösterimi var. Bunların HEPSİ kalkıyor —
`manualRef`/`manualNote` artık `ParcelVerificationSheet`'in sorumluluğu (Task 5).

- [ ] **Step 1: Failing test'i yaz**

`src/components/listing-wizard/ParcelPicker.test.tsx` sonuna ekle:

```tsx
describe('ParcelPicker — geolocation ikonu ve disaridan pin koyma', () => {
    afterEach(() => { jest.restoreAllMocks() })

    it('konumumu-bul ikonu tiklaninca geolocation cagirir ve pin koyar', async () => {
        const getCurrentPosition = jest.fn((success: PositionCallback) => {
            success({ coords: { latitude: 41.0, longitude: 29.0 } } as GeolocationPosition)
        })
        Object.defineProperty(global.navigator, 'geolocation', {
            value: { getCurrentPosition },
            configurable: true,
        })
        const onChange = jest.fn()
        render(<ParcelPicker value={EMPTY} onChange={onChange} />)

        fireEvent.click(screen.getByRole('button', { name: /konumumu bul/i }))

        await waitFor(() => {
            expect(onChange).toHaveBeenCalledWith(
                expect.objectContaining({ lat: 41.0, lng: 29.0, status: 'idle' }),
            )
        })
    })

    it('disaridan ref.placePin cagirilinca onChange tetiklenir', async () => {
        const onChange = jest.fn()
        const ref = React.createRef<ParcelPickerHandle>()
        render(<ParcelPicker ref={ref} value={EMPTY} onChange={onChange} />)

        // Harita async kuruluyor (dinamik leaflet import'u) — hazir olana kadar bekle.
        await waitFor(() => expect(ref.current).not.toBeNull())
        ref.current!.placePin(40.0, 28.0)

        await waitFor(() => {
            expect(onChange).toHaveBeenCalledWith(
                expect.objectContaining({ lat: 40.0, lng: 28.0, status: 'idle' }),
            )
        })
    })

    it('entryRow butonlari artik render edilmiyor (Elle Gir sheet seviyesine tasindi)', () => {
        render(<ParcelPicker value={EMPTY} onChange={jest.fn()} />)
        expect(screen.queryByRole('button', { name: /Elle Gir/i })).not.toBeInTheDocument()
    })
})
```

Dosyanın başına `React` import'u ekle (henüz yoksa): `import React from 'react'`.

- [ ] **Step 2: Test'i çalıştır, başarısız olduğunu gör**

Run: `npx jest --no-coverage --roots "<rootDir>/src" ParcelPicker`
Expected: FAIL — `ParcelPickerHandle` yok, `ref` prop'u `forwardRef` olmadığı için React uyarısı
verir, "konumumu bul" aria-name'i henüz eşleşmiyor (buton hâlâ düz metin içeriyor).

- [ ] **Step 3: Bileşeni güncelle**

`src/components/listing-wizard/ParcelPicker.tsx`'te:

1. `import { useEffect, useRef, useState } from 'react'` → `import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'` yap.
2. `import { ManualParcelEntryModal, type ManualParcelReference } from './ManualParcelEntryModal'` satırını SİL.
3. `export type ParcelPickerStatus = ...` altına ekle:

```tsx
export interface ParcelPickerHandle {
    placePin: (lat: number, lng: number) => void
}
```

4. Fonksiyon imzasını değiştir:

```tsx
export const ParcelPicker = forwardRef<ParcelPickerHandle, Props>(function ParcelPicker({
    value,
    onChange,
    hint = DEFAULT_HINT,
    notFoundText = DEFAULT_NOT_FOUND_TEXT,
    unavailableText = DEFAULT_UNAVAILABLE_TEXT,
    className,
    mapClassName,
}, ref) {
```

(Fonksiyon gövdesinin SONUNDAKİ `}` bir fazladan `)` alır — `forwardRef` çağrısını kapatmak için:
dosyanın en sonunda `}` yerine `})` olacak.)

5. `manualModalOpen`/`manualRef` state satırlarını SİL:

```tsx
    const [manualModalOpen, setManualModalOpen] = useState(false)
    const [manualRef, setManualRef] = useState<ManualParcelReference | null>(null)
```

6. `placePinRef` tanımının hemen altına `useImperativeHandle` ekle:

```tsx
    useImperativeHandle(ref, () => ({
        placePin: (lat: number, lng: number) => placePinRef.current?.(lat, lng),
    }), [])
```

7. `handleManualLocationFound` fonksiyonunu SİL (artık `ParcelVerificationSheet`'in işi).

8. JSX'te `entryRow` bloğunu (iki buton) SİL, yerine haritanın İÇİNE (mapBox wrapper'ı `<div>`
   ile sarmalanarak) tek bir ikon-buton koy:

```tsx
    return (
        <div className={`${styles.wrapper} ${className || ''}`}>
            <div className={styles.mapWrapper}>
                <div
                    ref={containerRef}
                    className={`${styles.mapBox} ${mapClassName || ''}`}
                    style={{ cursor: verifying ? 'wait' : 'crosshair' }}
                />
                <button
                    type="button"
                    className={styles.locateBtn}
                    onClick={handleUseMyLocation}
                    disabled={locating}
                    aria-label={locating ? 'Konum bulunuyor' : 'Konumumu bul'}
                >
                    {locating ? (
                        <span className={styles.locateSpinner} aria-hidden="true" />
                    ) : (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="3" />
                            <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
                        </svg>
                    )}
                </button>
            </div>

            {geoError && <div className={styles.warnCard}>{geoError}</div>}

            <p className={styles.hint}>{hint}</p>

            <div className={styles.coordRow}>
```

(Buradan sonrası — `coordRow` içeriği, `resultCard`, `not_found`/`unavailable`/`unauthorized`
blokları — AYNEN kalır, silinmez.)

9. `manualRef && (...)` bloğunu (dosyanın sonuna doğru, `manualNote` gösterimi) SİL.
10. `<ManualParcelEntryModal ... />` render'ını SİL.
11. Dosyanın en son satırı `}` yerine `})` olur (forwardRef kapanışı).

- [ ] **Step 4: CSS'i güncelle**

`src/components/listing-wizard/ParcelPicker.module.css`'te `.entryRow`/`.entryBtn` kurallarını
SİL, yerine ekle:

```css
.mapWrapper {
    position: relative;
}

.locateBtn {
    position: absolute;
    bottom: 12px;
    right: 12px;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    border: 1px solid var(--border);
    background: var(--card-bg);
    color: var(--text);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    z-index: 400;
}

.locateBtn:hover:not(:disabled) {
    background: var(--panel);
}

.locateBtn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

.locateSpinner {
    width: 14px;
    height: 14px;
    border: 2px solid var(--border);
    border-top-color: var(--text);
    border-radius: 50%;
    animation: parcelPickerSpin 0.7s linear infinite;
}

@keyframes parcelPickerSpin {
    to { transform: rotate(360deg); }
}
```

`@media (max-width: 768px)` bloğundaki `.entryBtn { min-height: 44px; flex: 1; }` kuralını SİL
(artık `.entryBtn` yok); `.locateBtn`'in kendisi zaten 36px — dokunma hedefi haritanın üstünde
yüzen ikincil bir kontrol olduğu için 44px şartı buraya uygulanmıyor (birincil eylem
`.verifyBtn`'de kalıyor, o zaten 44px).

- [ ] **Step 5: Testleri çalıştır, geçtiğini gör**

Run: `npx jest --no-coverage --roots "<rootDir>/src" ParcelPicker`
Expected: tüm `ParcelPicker.test.tsx` testleri PASS (mevcut + yeni 3).

- [ ] **Step 6: Artık kullanılmayan `ManualParcelEntryModal`'ı sil**

```bash
git rm src/components/listing-wizard/ManualParcelEntryModal.tsx
git rm src/components/listing-wizard/ManualParcelEntryModal.module.css
git rm src/components/listing-wizard/ManualParcelEntryModal.test.tsx
```

- [ ] **Step 7: Tam suite + tsc**

Run: `npx jest --no-coverage --roots "<rootDir>/src"` → beklenen: 820 + 3 yeni - 5 silinen
(`ManualParcelEntryModal.test.tsx`'in 6 testi) = **817/817 PASS**. Bu sayı yalnızca bir
sanity-check — gerçek sayı `npx jest`'in kendi çıktısında görünür, farklıysa fark araştırılır
(brief'teki tahmine değil gerçek çıktıya güvenilir).
Run: `npx tsc --noEmit` → 0. (`ManualParcelEntryModal` import eden başka dosya kalmadığını
derleme hatasızlığı doğrular.)

- [ ] **Step 8: Commit**

```bash
git add src/components/listing-wizard/ParcelPicker.tsx src/components/listing-wizard/ParcelPicker.module.css src/components/listing-wizard/ParcelPicker.test.tsx
git commit -m "refactor(listing-wizard): ParcelPicker'dan elle-giris kaldirildi, geolocation ikona tasindi, forwardRef eklendi"
```

---

### Task 4: `RiskSuggestionCard` — `hideApply` prop'u

**Files:**
- Modify: `src/components/risk/RiskSuggestionCard.tsx`
- Test: `src/components/risk/RiskSuggestionCard.test.tsx` (mevcut dosyaya ekleme)

**Interfaces:**
- Consumes: —
- Produces: `RiskSuggestionCardProps.hideApply?: boolean` (varsayılan `false` — mevcut davranış
  korunur).

- [ ] **Step 1: Failing test'i yaz**

`RiskSuggestionCard.test.tsx` sonuna ekle:

```tsx
it('hideApply true iken Uygula butonu hic render edilmez (wizard baglaminda uygulanacak yer yok)', () => {
    render(<RiskSuggestionCard risk={RISK} onApply={jest.fn()} hideApply />)
    expect(screen.queryByRole('button', { name: /uygula/i })).not.toBeInTheDocument()
})

it('hideApply verilmezse (varsayilan false) mevcut davranis korunur', () => {
    render(<RiskSuggestionCard risk={RISK} onApply={jest.fn()} />)
    expect(screen.getByRole('button', { name: /uygula/i })).toBeInTheDocument()
})
```

- [ ] **Step 2: Test'i çalıştır, başarısız olduğunu gör**

Run: `npx jest --no-coverage --roots "<rootDir>/src" RiskSuggestionCard`
Expected: FAIL — ilk yeni test başarısız (buton `hideApply` olmadan da render ediliyor).

- [ ] **Step 3: Prop'u ekle**

`src/components/risk/RiskSuggestionCard.tsx`:

```tsx
interface Props {
    risk: RiskMeasurement
    /** Yüzde cinsinden risk seviyesi — /hesapla `riskLevel` state'i bu birimde. */
    onApply: (riskLevelPercent: number) => void
    /** True iken Uygula butonu render edilmez (wizard baglaminda uygulanacak riskLevel yok). */
    hideApply?: boolean
}
```

```tsx
export function RiskSuggestionCard({ risk, onApply, hideApply = false }: Props) {
```

```tsx
            {percent > 0 && !hideApply && (
                <button type="button" className={styles.applyBtn} onClick={() => onApply(percent)}>
                    Uygula
                </button>
            )}
```

- [ ] **Step 4: Test'i çalıştır, geçtiğini gör**

Run: `npx jest --no-coverage --roots "<rootDir>/src" RiskSuggestionCard`
Expected: tüm testler (mevcut 9 + yeni 2 = 11) PASS.

- [ ] **Step 5: Tam suite**

Run: `npx jest --no-coverage --roots "<rootDir>/src"` → **819/819 PASS** (sanity-check tahmini;
gerçek sayıya güvenilir). `npx tsc --noEmit` → 0.

- [ ] **Step 6: Commit**

```bash
git add src/components/risk/RiskSuggestionCard.tsx src/components/risk/RiskSuggestionCard.test.tsx
git commit -m "feat(risk): RiskSuggestionCard'a hideApply prop'u ekle"
```

---

### Task 5: `ParcelVerificationSheet` — paylaşılan bileşen

**Files:**
- Create: `src/components/listing-wizard/ParcelVerificationSheet.tsx`
- Create: `src/components/listing-wizard/ParcelVerificationSheet.module.css`
- Test: `src/components/listing-wizard/ParcelVerificationSheet.test.tsx`
- Delete: `src/app/hesapla/ParcelModal.tsx`
- Delete: `src/app/hesapla/ParcelModal.module.css`

**Interfaces:**
- Consumes: Task 1'in `BottomSheet` `className` prop'u, Task 2'nin `ManualParcelEntryForm`,
  Task 3'ün `ParcelPicker` + `ParcelPickerHandle`, Task 4'ün `RiskSuggestionCard` `hideApply`.
- Produces: `ParcelVerificationSheetProps { isOpen: boolean; onClose: () => void; onConfirm: (payload: { parcelValue: ParcelPickerValue; risk: RiskMeasurement | null; suggestedRiskPercent: number | null }) => void; hideApply?: boolean }`
  — `onConfirm` sözleşmesi `ParcelModal`'ın eski `onConfirm`'üyle BİREBİR AYNI (Task 6'da
  `/hesapla/page.tsx`'in `handleParcelConfirm`'ü değişmeden çalışsın diye).

Bu task'ın CSS'i BU AŞAMADA yalnızca yapısal (toggle/layout) — Derin Cam token'ları Task 8'de
eklenecek. Önce fonksiyonel doğruluk, sonra görsel.

- [ ] **Step 1: Failing test'i yaz**

`src/components/listing-wizard/ParcelVerificationSheet.test.tsx`:

```tsx
/** @jest-environment jsdom */
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { ParcelVerificationSheet } from './ParcelVerificationSheet'

const VERIFIED_PARCEL = {
    il: 'Tekirdağ', ilce: 'Muratlı', mahalle: 'Kırkkepenekli',
    adaNo: '0', parselNo: '1871', areaSqm: 830, quality: 'Arsa',
    geometry: { type: 'Polygon' as const, coordinates: [] },
}

jest.mock('./ParcelPicker', () => ({
    // Leaflet jsdom'da mount edilemez — burada haritanin kendisi degil sheet'in
    // ParcelPicker'i DOGRU MODDA render ettigi ve onChange'i dogru isledigi
    // test ediliyor. "simulate-verify" butonu, gercek ParcelPicker'in
    // "Parseli Dogrula" basarili donusunu taklit eder — boylece risk-fetch
    // effect'ini (parcelValue.lat/lng + parcelValue.parcel'a bagli) testler
    // GERCEKTEN tetikleyebilir; onChange hic cagrilmazsa risk state'i asla
    // null'dan cikmaz ve hideApply testleri sessizce yanlis-pozitif verir.
    ParcelPicker: ({ onChange }: { onChange: (patch: Record<string, unknown>) => void }) => (
        <div data-testid="parcel-picker">
            <button onClick={() => onChange({ lat: 41.16, lng: 27.58, parcel: VERIFIED_PARCEL, status: 'verified' })}>
                simulate-verify
            </button>
        </div>
    ),
}))

function viewportKur(masaustu: boolean) {
    Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: (query: string) => ({
            matches: query.includes('max-width: 768px') ? masaustu : false,
            media: query,
            onchange: null,
            addEventListener: jest.fn(),
            removeEventListener: jest.fn(),
            addListener: jest.fn(),
            removeListener: jest.fn(),
            dispatchEvent: jest.fn(),
        }),
    })
}

beforeEach(() => {
    viewportKur(true) // varsayilan: masaustu
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ status: 'ok', risk: null }) }) as unknown as typeof fetch
})
afterEach(() => { jest.restoreAllMocks() })

describe('ParcelVerificationSheet', () => {
    it('isOpen false iken hicbir sey render etmez', () => {
        render(<ParcelVerificationSheet isOpen={false} onClose={jest.fn()} onConfirm={jest.fn()} />)
        expect(screen.queryByText('Haritadan Parsel Doğrula')).not.toBeInTheDocument()
    })

    it('varsayilan mod Haritadan — ParcelPicker render edilir, form edilmez', async () => {
        render(<ParcelVerificationSheet isOpen onClose={jest.fn()} onConfirm={jest.fn()} />)
        await waitFor(() => expect(screen.getByTestId('parcel-picker')).toBeInTheDocument())
        expect(screen.queryByLabelText('İl *')).not.toBeInTheDocument()
    })

    it('Elle gir tiklaninca form gorunur, ParcelPicker kalkar', async () => {
        render(<ParcelVerificationSheet isOpen onClose={jest.fn()} onConfirm={jest.fn()} />)
        await waitFor(() => expect(screen.getByTestId('parcel-picker')).toBeInTheDocument())

        fireEvent.click(screen.getByRole('button', { name: 'Elle gir' }))

        expect(screen.getByLabelText('İl *')).toBeInTheDocument()
        expect(screen.queryByTestId('parcel-picker')).not.toBeInTheDocument()
    })

    it('Vazgec/kapat onClose cagirir', async () => {
        const onClose = jest.fn()
        render(<ParcelVerificationSheet isOpen onClose={onClose} onConfirm={jest.fn()} />)
        await waitFor(() => expect(screen.getByTestId('parcel-picker')).toBeInTheDocument())
        fireEvent.click(screen.getByRole('button', { name: 'Vazgeç' }))
        expect(onClose).toHaveBeenCalled()
    })

    it('parcel status verified degilken Aktar butonu devre disi', async () => {
        render(<ParcelVerificationSheet isOpen onClose={jest.fn()} onConfirm={jest.fn()} />)
        await waitFor(() => expect(screen.getByTestId('parcel-picker')).toBeInTheDocument())
        expect(screen.getByRole('button', { name: /Hesaplamaya Aktar/i })).toBeDisabled()
    })

    it('parcel dogrulanip risk verisi gelince hideApply=false (varsayilan) Uygula gosterir', async () => {
        global.fetch = jest.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ status: 'ok', risk: { faultDistanceM: 500, gammaF: 1.2, floodQ100: false, suggestedR: 1.1 } }),
        }) as unknown as typeof fetch
        render(<ParcelVerificationSheet isOpen onClose={jest.fn()} onConfirm={jest.fn()} />)
        await waitFor(() => expect(screen.getByTestId('parcel-picker')).toBeInTheDocument())

        fireEvent.click(screen.getByText('simulate-verify'))

        await waitFor(() => {
            expect(screen.getByRole('button', { name: /uygula/i })).toBeInTheDocument()
        })
    })

    it('hideApply true iken ayni senaryoda Uygula gostermez', async () => {
        global.fetch = jest.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ status: 'ok', risk: { faultDistanceM: 500, gammaF: 1.2, floodQ100: false, suggestedR: 1.1 } }),
        }) as unknown as typeof fetch
        render(<ParcelVerificationSheet isOpen onClose={jest.fn()} onConfirm={jest.fn()} hideApply />)
        await waitFor(() => expect(screen.getByTestId('parcel-picker')).toBeInTheDocument())

        fireEvent.click(screen.getByText('simulate-verify'))

        // Risk kartinin KENDISI (fay mesafesi gibi bilgi metni) hala gorunur olmali —
        // yalnizca Uygula butonu gizlenir, kart tamamen kaybolmaz.
        await waitFor(() => {
            expect(screen.getByText(/500 m/)).toBeInTheDocument()
        })
        expect(screen.queryByRole('button', { name: /uygula/i })).not.toBeInTheDocument()
    })

    it('Aktar tiklaninca onConfirm dogrulanan parcelValue ile cagirilir ve sheet kapanir', async () => {
        global.fetch = jest.fn().mockResolvedValue({
            ok: true, json: async () => ({ status: 'ok', risk: null }),
        }) as unknown as typeof fetch
        const onConfirm = jest.fn()
        const onClose = jest.fn()
        render(<ParcelVerificationSheet isOpen onClose={onClose} onConfirm={onConfirm} />)
        await waitFor(() => expect(screen.getByTestId('parcel-picker')).toBeInTheDocument())

        fireEvent.click(screen.getByText('simulate-verify'))
        await waitFor(() => expect(screen.getByRole('button', { name: /Hesaplamaya Aktar/i })).toBeEnabled())

        fireEvent.click(screen.getByRole('button', { name: /Hesaplamaya Aktar/i }))

        expect(onConfirm).toHaveBeenCalledWith(
            expect.objectContaining({
                parcelValue: expect.objectContaining({ lat: 41.16, lng: 27.58, status: 'verified' }),
            }),
        )
        expect(onClose).toHaveBeenCalled()
    })

    it('masaustunde ortalanmis modal kabugu render edilir (BottomSheet degil)', async () => {
        viewportKur(true)
        render(<ParcelVerificationSheet isOpen onClose={jest.fn()} onConfirm={jest.fn()} />)
        await waitFor(() => expect(screen.getByTestId('parcel-picker')).toBeInTheDocument())
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument() // BottomSheet role="dialog" kullanir
    })

    it('mobilde BottomSheet (role=dialog) render edilir', async () => {
        viewportKur(false)
        render(<ParcelVerificationSheet isOpen onClose={jest.fn()} onConfirm={jest.fn()} />)
        await waitFor(() => expect(screen.getByTestId('parcel-picker')).toBeInTheDocument())
        expect(screen.getByRole('dialog')).toBeInTheDocument()
    })
})
```

- [ ] **Step 2: Test'i çalıştır, başarısız olduğunu gör**

Run: `npx jest --no-coverage --roots "<rootDir>/src" ParcelVerificationSheet`
Expected: FAIL — modül bulunamıyor.

- [ ] **Step 3: Bileşeni yaz**

`src/components/listing-wizard/ParcelVerificationSheet.tsx`:

```tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import { ParcelPicker, type ParcelPickerValue, type ParcelPickerHandle } from './ParcelPicker'
import { ManualParcelEntryForm, type ManualParcelReference } from './ManualParcelEntryForm'
import { RiskSuggestionCard } from '@/components/risk/RiskSuggestionCard'
import { BottomSheet } from '@/components/mobile/BottomSheet'
import type { RiskMeasurement } from '@/lib/risk/types'
import styles from './ParcelVerificationSheet.module.css'

export type ParcelVerificationSheetProps = {
    isOpen: boolean
    onClose: () => void
    onConfirm: (payload: {
        parcelValue: ParcelPickerValue
        risk: RiskMeasurement | null
        suggestedRiskPercent: number | null
    }) => void
    /** True ise RiskSuggestionCard'in Uygula butonu gizlenir (bkz. RiskSuggestionCard). */
    hideApply?: boolean
}

type Mode = 'map' | 'manual'

export function ParcelVerificationSheet({ isOpen, onClose, onConfirm, hideApply = false }: ParcelVerificationSheetProps) {
    const [mode, setMode] = useState<Mode>('map')
    const [parcelValue, setParcelValue] = useState<ParcelPickerValue>({
        lat: null,
        lng: null,
        parcel: null,
        status: 'idle',
    })
    const [risk, setRisk] = useState<RiskMeasurement | null>(null)
    const [suggestedRiskPercent, setSuggestedRiskPercent] = useState<number | null>(null)
    const [isFetchingRisk, setIsFetchingRisk] = useState(false)
    const [manualRef, setManualRef] = useState<ManualParcelReference | null>(null)
    const pickerRef = useRef<ParcelPickerHandle>(null)

    // `/hesapla/page.tsx`teki ayni desen: SSR'de ve ilk client render'de null,
    // ardindan gercek viewport'a gore true/false. Iki kabugu (masaustu modal +
    // mobil BottomSheet) AYNI ANDA render etmek Leaflet haritasini iki kez
    // mount eder — bu yuzden viewport cozulene kadar hicbir sey render edilmez.
    const [isDesktopViewport, setIsDesktopViewport] = useState<boolean | null>(null)
    useEffect(() => {
        const mql = window.matchMedia('not all and (max-width: 768px)')
        const update = () => setIsDesktopViewport(mql.matches)
        update()
        mql.addEventListener('change', update)
        return () => mql.removeEventListener('change', update)
    }, [])

    useEffect(() => {
        const fetchRisk = async () => {
            if (parcelValue.lat && parcelValue.lng) {
                setIsFetchingRisk(true)
                try {
                    const res = await fetch(`/api/risk/lookup?lat=${parcelValue.lat}&lng=${parcelValue.lng}`)
                    const data = await res.json()
                    setRisk(data.status === 'ok' ? data.risk : null)
                } catch {
                    setRisk(null)
                } finally {
                    setIsFetchingRisk(false)
                }
            } else {
                setRisk(null)
            }
        }
        fetchRisk()
    }, [parcelValue.parcel])

    if (!isOpen || isDesktopViewport === null) return null

    const handleManualFound = (lat: number, lng: number, reference: ManualParcelReference) => {
        setManualRef(reference)
        pickerRef.current?.placePin(lat, lng)
        setMode('map')
    }

    const handleApply = () => {
        onConfirm({ parcelValue, risk, suggestedRiskPercent })
        onClose()
    }

    const body = (
        <div className={styles.content}>
            <p className={styles.instructions}>
                Arsanızın konumunu harita üzerinden işaretleyin. Sistem, Tapu ve Kadastro
                Genel Müdürlüğü (TKGM) kayıtlarından gerçek alan (m²) ve nitelik bilgisini,
                ayrıca deprem ve fay hattı risk durumunu otomatik sorgulayacaktır.
            </p>

            <div className={styles.toggleRow}>
                <button
                    type="button"
                    className={`${styles.modeBtn} ${mode === 'map' ? styles.modeBtnOn : ''}`}
                    onClick={() => setMode('map')}
                >
                    Haritadan
                </button>
                <button
                    type="button"
                    className={`${styles.modeBtn} ${mode === 'manual' ? styles.modeBtnOn : ''}`}
                    onClick={() => setMode('manual')}
                >
                    Elle gir
                </button>
            </div>

            {mode === 'map' ? (
                <ParcelPicker
                    ref={pickerRef}
                    value={parcelValue}
                    onChange={patch => setParcelValue(v => ({ ...v, ...patch }))}
                    mapClassName={styles.largeMap}
                    hint="Arsanızın bulunduğu noktaya haritadan tıklayın."
                />
            ) : (
                <ManualParcelEntryForm onLocationFound={handleManualFound} />
            )}

            {manualRef && (
                <div className={styles.manualNote}>
                    Kullanıcı beyanı: {[
                        manualRef.mahalle && `${manualRef.mahalle} Mah.`,
                        manualRef.ada && `Ada ${manualRef.ada}`,
                        manualRef.parsel && `Parsel ${manualRef.parsel}`,
                    ].filter(Boolean).join(', ') || `${manualRef.ilce}, ${manualRef.il}`} — TKGM sonucuyla karşılaştırın.
                </div>
            )}

            {isFetchingRisk && (
                <div className={styles.loadingRisk}>Risk verileri hesaplanıyor...</div>
            )}

            {risk && (
                <div className={styles.riskSection}>
                    <RiskSuggestionCard
                        risk={risk}
                        hideApply={hideApply}
                        onApply={(percent) => setSuggestedRiskPercent(percent)}
                    />
                    {!hideApply && suggestedRiskPercent !== null && (
                        <div className={styles.riskAppliedNote}>
                            ✓ {suggestedRiskPercent}% risk payı seçildi. Aktarmaya hazır.
                        </div>
                    )}
                </div>
            )}
        </div>
    )

    const applyBtn = (
        <button
            className={styles.applyBtn}
            onClick={handleApply}
            disabled={parcelValue.status !== 'verified'}
        >
            Hesaplamaya Aktar
        </button>
    )

    if (!isDesktopViewport) {
        return (
            <BottomSheet open onClose={onClose} title="Haritadan Parsel Doğrula" className={styles.sheet}>
                {body}
                <div className={styles.mobileFooter}>{applyBtn}</div>
            </BottomSheet>
        )
    }

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
                <header className={styles.header}>
                    <h2>Haritadan Parsel Doğrula</h2>
                    <button className={styles.closeBtn} onClick={onClose} aria-label="Kapat">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </header>
                {body}
                <footer className={styles.footer}>
                    <button className={styles.cancelBtn} onClick={onClose}>Vazgeç</button>
                    {applyBtn}
                </footer>
            </div>
        </div>
    )
}
```

- [ ] **Step 4: CSS'i yaz (yalnızca yapısal — Derin Cam Task 8'de)**

`src/components/listing-wizard/ParcelVerificationSheet.module.css` — `ParcelModal.module.css`'in
masaüstü kısmı BİREBİR taşınır (`.largeMap`'in mobil `768px` alt-kuralı KALKAR, çünkü artık o
genişlikte `ParcelModal`'ın kendi mobil-CSS dalı değil gerçek `BottomSheet` devrede), artı yeni
toggle/mobileFooter kuralları:

```css
.overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.4);
    backdrop-filter: blur(8px);
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
}

.modal {
    background: var(--card-bg);
    border: 1px solid var(--border);
    border-radius: 20px;
    width: 100%;
    max-width: 800px;
    max-height: 90vh;
    display: flex;
    flex-direction: column;
    box-shadow: 0 20px 40px rgba(0,0,0,0.2);
    overflow: hidden;
}

.header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px 24px;
    border-bottom: 1px solid var(--border);
}

.header h2 {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 700;
    color: var(--fg);
}

.closeBtn {
    background: none;
    border: none;
    color: var(--label-color);
    cursor: pointer;
    padding: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    transition: background 0.2s;
}

.closeBtn:hover {
    background: var(--input-bg);
    color: var(--fg);
}

.content {
    flex: 1;
    overflow-y: auto;
    padding: 24px;
    display: flex;
    flex-direction: column;
    gap: 20px;
}

.instructions {
    margin: 0;
    font-size: 0.95rem;
    line-height: 1.5;
    color: var(--label-color);
}

.toggleRow {
    display: flex;
    gap: 8px;
}

.modeBtn {
    flex: 1;
    padding: 10px;
    border-radius: 10px;
    border: 1px solid var(--border);
    background: var(--input-bg);
    color: var(--text);
    font-weight: 700;
    font-size: 0.85rem;
    cursor: pointer;
}

.modeBtnOn {
    background: var(--brand-gradient);
    color: #fff;
    border-color: transparent;
}

.largeMap {
    height: 450px !important;
}

.loadingRisk {
    font-size: 0.9rem;
    color: var(--label-color);
    text-align: center;
    padding: 10px;
}

.riskSection {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.riskAppliedNote {
    color: #10b981;
    font-size: 0.9rem;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 6px;
}

.manualNote {
    padding: 10px 14px;
    border-radius: 12px;
    border: 1px dashed var(--border);
    background: var(--input-bg);
    font-size: 0.78rem;
    color: var(--label-color);
}

.footer {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    padding: 20px 24px;
    border-top: 1px solid var(--border);
    background: var(--input-bg);
}

.cancelBtn {
    padding: 10px 20px;
    background: transparent;
    border: 1px solid var(--border);
    color: var(--fg);
    border-radius: 10px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.2s;
}

.cancelBtn:hover {
    background: rgba(0,0,0,0.05);
}

.applyBtn {
    padding: 10px 24px;
    background: var(--brand-gradient, linear-gradient(135deg, #1f6feb, #3b82f6));
    color: white;
    border: none;
    border-radius: 10px;
    font-weight: 600;
    cursor: pointer;
    transition: opacity 0.2s;
}

.applyBtn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.applyBtn:not(:disabled):hover {
    opacity: 0.9;
}

.mobileFooter {
    padding-top: 12px;
}

.mobileFooter .applyBtn {
    width: 100%;
}
```

(`.sheet` sınıfı — `BottomSheet`'e `className` olarak geçilen — kasıtlı olarak bu adımda BOŞ
bırakılmıyor, sadece Derin Cam token'ları Task 8'e erteleniyor; şimdilik CSS modülünde
tanımlanmamış bir sınıf adı kullanmak derleme hatası vermez, yalnızca stilsiz kalır. Task 8
bu sınıfı dolduracak.)

- [ ] **Step 5: Testleri çalıştır, geçtiğini gör**

Run: `npx jest --no-coverage --roots "<rootDir>/src" ParcelVerificationSheet`
Expected: 10/10 PASS.

- [ ] **Step 6: `ParcelModal`'ı sil**

```bash
git rm src/app/hesapla/ParcelModal.tsx
git rm src/app/hesapla/ParcelModal.module.css
```

(Bu adımda `hesapla/page.tsx` hâlâ `ParcelModal`'ı import ediyor — Task 6'da düzelecek. `tsc`
bu ara adımda hata verecek, bu BEKLENEN; Task 6 bitene kadar ara commit atılmaz.)

- [ ] **Step 7: Commit**

```bash
git add src/components/listing-wizard/ParcelVerificationSheet.tsx src/components/listing-wizard/ParcelVerificationSheet.module.css src/components/listing-wizard/ParcelVerificationSheet.test.tsx
git add -u src/app/hesapla/ParcelModal.tsx src/app/hesapla/ParcelModal.module.css
git commit -m "feat(listing-wizard): ParcelVerificationSheet ekle, ParcelModal'in yerini alir"
```

---

### Task 6: `/hesapla` — `ParcelVerificationSheet`'e geçiş

**Files:**
- Modify: `src/app/hesapla/page.tsx`
- Modify: `src/app/hesapla/page.test.tsx` (mock güncelleme)

**Interfaces:**
- Consumes: Task 5'in `ParcelVerificationSheet` (props Task 5'te `ParcelModal` ile birebir
  uyumlu tasarlandığı için `handleParcelConfirm` DEĞİŞMİYOR).

- [ ] **Step 1: `page.tsx`'i güncelle**

`import { ParcelModal } from './ParcelModal';` satırını:

```tsx
import { ParcelVerificationSheet } from '@/components/listing-wizard/ParcelVerificationSheet';
```

`<ParcelModal ... />` render'ını:

```tsx
      <ParcelVerificationSheet
        key={isParcelModalOpen ? 'open' : 'closed'}
        isOpen={isParcelModalOpen}
        onClose={() => setIsParcelModalOpen(false)}
        onConfirm={handleParcelConfirm}
      />
```

(`hideApply` verilmiyor → varsayılan `false` → `/hesapla` mevcut "Uygula" davranışını KORUR.)

- [ ] **Step 2: Test mock'unu güncelle**

`src/app/hesapla/page.test.tsx`'teki `jest.mock('@/components/listing-wizard/ParcelPicker', ...)`
bloğunu bul; `forwardRef` uyumlu hale getir (`ParcelVerificationSheet` artık `ref={pickerRef}`
geçiyor):

```tsx
jest.mock('@/components/listing-wizard/ParcelPicker', () => ({
    // Leaflet jsdom'da mount edilemez; burada haritanin kendisi degil
    // ParcelVerificationSheet'in VARLIGI test ediliyor.
    ParcelPicker: React.forwardRef((_props: unknown, _ref: unknown) => <div data-testid="parcel-picker" />),
}))
```

Dosyanın başında `React` import'u yoksa ekle: `import React from 'react'`.

- [ ] **Step 3: Tam suite**

Run: `npx jest --no-coverage --roots "<rootDir>/src"`
Expected: PASS, `npx tsc --noEmit` → 0 (Task 5'te bırakılan hata burada kapanır).

- [ ] **Step 4: Canlı doğrulama**

`/hesapla`, masaüstü (1440px) ve mobil (390px), light+dark: "Haritadan Parsel Seç" (veya mevcut
tetikleyici) tıklanır, sheet açılır, "Haritadan"/"Elle gir" toggle'ı çalışır, bir parsel
doğrulanır, risk kartı görünür, "Uygula" tıklanınca `riskLevel` state'inin güncellendiği
(sayfanın ilgili input'unda görünür değer değişimiyle) doğrulanır, "Hesaplamaya Aktar" tıklanınca
sheet kapanır ve `arsaAlani`/`riskLevel` formda güncellenmiş olur.

- [ ] **Step 5: Commit**

```bash
git add src/app/hesapla/page.tsx src/app/hesapla/page.test.tsx
git commit -m "refactor(hesapla): ParcelModal yerine paylasilan ParcelVerificationSheet kullan"
```

---

### Task 7: İlan sihirbazı — tetikleyici + özet satırı

**Files:**
- Modify: `src/components/listing-wizard/WizardStep1Location.tsx`
- Modify: `src/components/listing-wizard/wizard.module.css` (mevcut dosya zaten
  `WizardStep1Location.tsx`'in `styles` kaynağı — `WizardStep1Location`'ın kendi ayrı bir
  `.module.css`'i yok)
- Modify: `src/components/listing-wizard/WizardStep1Location.test.tsx`

**Interfaces:**
- Consumes: Task 5'in `ParcelVerificationSheet` (`hideApply` **true** verilir — bkz. spec:
  wizard'ın uygulanacak `riskLevel` girdisi yok).

- [ ] **Step 1: Failing test'i yaz**

`src/components/listing-wizard/WizardStep1Location.test.tsx`'i BAŞTAN yaz (mevcut `ParcelPicker`
mock'u artık geçersiz):

```tsx
/** @jest-environment jsdom */
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { WizardStep1Location } from './WizardStep1Location'
import { emptyFormData } from './types'

jest.mock('./ParcelVerificationSheet', () => ({
    ParcelVerificationSheet: ({ isOpen }: { isOpen: boolean }) => (
        isOpen ? <div data-testid="parcel-sheet" /> : null
    ),
}))

describe('WizardStep1Location', () => {
    it('mevcut il/ilçe/adres alanları korunur', () => {
        render(<WizardStep1Location data={emptyFormData} onChange={jest.fn()} />)
        expect(screen.getByText('İl *')).toBeInTheDocument()
        expect(screen.getByText('İlçe')).toBeInTheDocument()
        expect(screen.getByText('Tam Adres')).toBeInTheDocument()
    })

    it('parsel secilmemisken tetikleyici buton gorunur, sheet kapali', () => {
        render(<WizardStep1Location data={emptyFormData} onChange={jest.fn()} />)
        expect(screen.getByRole('button', { name: /Konumu Haritadan Seç/i })).toBeInTheDocument()
        expect(screen.queryByTestId('parcel-sheet')).not.toBeInTheDocument()
    })

    it('tetikleyiciye tiklaninca sheet acilir', () => {
        render(<WizardStep1Location data={emptyFormData} onChange={jest.fn()} />)
        fireEvent.click(screen.getByRole('button', { name: /Konumu Haritadan Seç/i }))
        expect(screen.getByTestId('parcel-sheet')).toBeInTheDocument()
    })

    it('parsel dogrulanmissa ozet satiri gorunur, tetikleyici "Degistir"e doner', () => {
        render(
            <WizardStep1Location
                data={{
                    ...emptyFormData,
                    lat: 41.16, lng: 27.58, parcelStatus: 'verified',
                    parcel: { il: 'Tekirdağ', ilce: 'Muratlı', mahalle: 'Kırkkepenekli', adaNo: '0', parselNo: '1871', areaSqm: 830, quality: 'Arsa', geometry: { type: 'Polygon', coordinates: [] } },
                }}
                onChange={jest.fn()}
            />,
        )
        expect(screen.getByText(/Kırkkepenekli/)).toBeInTheDocument()
        expect(screen.getByText(/830 m²/)).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /Değiştir/i })).toBeInTheDocument()
        expect(screen.queryByRole('button', { name: /Konumu Haritadan Seç/i })).not.toBeInTheDocument()
    })
})
```

- [ ] **Step 2: Test'i çalıştır, başarısız olduğunu gör**

Run: `npx jest --no-coverage --roots "<rootDir>/src" WizardStep1Location`
Expected: FAIL — `./ParcelVerificationSheet` modülü `WizardStep1Location.tsx` içinden henüz
import edilmiyor, tetikleyici buton yok.

- [ ] **Step 3: Bileşeni güncelle**

`src/components/listing-wizard/WizardStep1Location.tsx`:

```tsx
'use client'

import { useState } from 'react'
import styles from './wizard.module.css'
import { WizardFormData } from './types'
import { ParcelVerificationSheet } from './ParcelVerificationSheet'
import { formatParcelIdentity } from '@/lib/listing/listingDisplay'

const CITIES = ['Adana','Adıyaman','Afyonkarahisar','Ağrı','Amasya','Ankara','Antalya','Artvin','Aydın','Balıkesir','Bilecik','Bingöl','Bitlis','Bolu','Burdur','Bursa','Çanakkale','Çankırı','Çorum','Denizli','Diyarbakır','Edirne','Elazığ','Erzincan','Erzurum','Eskişehir','Gaziantep','Giresun','Gümüşhane','Hakkari','Hatay','Isparta','İçel','İstanbul','İzmir','Kars','Kastamonu','Kayseri','Kırklareli','Kırşehir','Kocaeli','Konya','Kütahya','Malatya','Manisa','Kahramanmaraş','Mardin','Muğla','Muş','Nevşehir','Niğde','Ordu','Rize','Sakarya','Samsun','Siirt','Sinop','Sivas','Tekirdağ','Tokat','Trabzon','Tunceli','Şanlıurfa','Uşak','Van','Yozgat','Zonguldak','Aksaray','Bayburt','Karaman','Kırıkkale','Batman','Şırnak','Bartın','Ardahan','Iğdır','Yalova','Karabük','Kilis','Osmaniye','Düzce']

interface Props {
  data: WizardFormData
  onChange: (patch: Partial<WizardFormData>) => void
}

export function WizardStep1Location({ data, onChange }: Props) {
  const [sheetOpen, setSheetOpen] = useState(false)
  const isVerified = data.parcelStatus === 'verified' && data.parcel

  return (
    <div className={styles.stepContainer}>
      <div className={styles.twoCol}>
        <div className={styles.fieldGroup}>
          <label className={styles.label}>İl *</label>
          <select
            className={styles.select}
            value={data.city}
            onChange={e => onChange({ city: e.target.value, district: '' })}
          >
            <option value="">Seçiniz</option>
            {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className={styles.fieldGroup}>
          <label className={styles.label}>İlçe</label>
          <input
            className={styles.input}
            placeholder="İlçe adı"
            value={data.district}
            onChange={e => onChange({ district: e.target.value })}
          />
        </div>
      </div>
      <div className={styles.fieldGroup}>
        <label className={styles.label}>Tam Adres</label>
        <input
          className={styles.input}
          placeholder="Mahalle, cadde, sokak..."
          value={data.address}
          onChange={e => onChange({ address: e.target.value })}
        />
      </div>
      <div className={styles.fieldGroup}>
        <label className={styles.label}>Parsel Konumu *</label>
        {isVerified ? (
          <div className={styles.parcelSummary}>
            <div className={styles.parcelSummaryText}>
              <strong>{formatParcelIdentity({ adaNo: data.parcel!.adaNo, parselNo: data.parcel!.parselNo, neighborhood: null })}</strong>
              <span>{data.parcel!.mahalle} · {data.parcel!.quality} · {data.parcel!.areaSqm.toLocaleString('tr-TR')} m²</span>
            </div>
            <button type="button" className={styles.parcelChangeBtn} onClick={() => setSheetOpen(true)}>
              Değiştir
            </button>
          </div>
        ) : (
          <button type="button" className={styles.parcelTriggerBtn} onClick={() => setSheetOpen(true)}>
            📍 Konumu Haritadan Seç
          </button>
        )}
      </div>

      <ParcelVerificationSheet
        key={sheetOpen ? 'open' : 'closed'}
        isOpen={sheetOpen}
        onClose={() => setSheetOpen(false)}
        hideApply
        onConfirm={({ parcelValue }) => {
          onChange({
            lat: parcelValue.lat,
            lng: parcelValue.lng,
            parcel: parcelValue.parcel,
            parcelStatus: parcelValue.status,
          })
        }}
      />
    </div>
  )
}
```

- [ ] **Step 4: CSS ekle**

`src/components/listing-wizard/wizard.module.css` sonuna ekle:

```css
.parcelTriggerBtn {
    padding: 12px 16px;
    border-radius: 10px;
    border: 1px dashed var(--border);
    background: var(--input-bg);
    color: var(--text);
    font-weight: 700;
    font-size: 0.9rem;
    cursor: pointer;
    text-align: left;
}

.parcelTriggerBtn:hover {
    background: var(--panel);
}

.parcelSummary {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 12px 16px;
    border-radius: 10px;
    border: 1px solid rgba(var(--green-rgb), 0.35);
    background: rgba(var(--green-rgb), 0.06);
}

.parcelSummaryText {
    display: flex;
    flex-direction: column;
    gap: 2px;
    font-size: 0.85rem;
    color: var(--label-color);
}

.parcelSummaryText strong {
    color: var(--card-title);
    font-size: 0.9rem;
}

.parcelChangeBtn {
    padding: 6px 12px;
    border-radius: 8px;
    border: 1px solid var(--border);
    background: var(--card-bg);
    color: var(--text);
    font-weight: 700;
    font-size: 0.78rem;
    cursor: pointer;
    white-space: nowrap;
}

@media (max-width: 768px) {
    .parcelTriggerBtn {
        min-height: 44px;
    }
}
```

(`wizard.module.css` zaten `WizardStep1Location`'ın kullandığı `styles` kaynağı — `import styles
from './wizard.module.css'` mevcut satırda zaten var, değişmiyor.)

- [ ] **Step 5: Testleri çalıştır, geçtiğini gör**

Run: `npx jest --no-coverage --roots "<rootDir>/src" WizardStep1Location`
Expected: 4/4 PASS.

- [ ] **Step 6: Tam suite + tsc**

Run: `npx jest --no-coverage --roots "<rootDir>/src"` → tümü PASS.
Run: `npx tsc --noEmit` → 0.

- [ ] **Step 7: Canlı doğrulama**

`/listings/new`, Adım 1, masaüstü + mobil (390px), light+dark: "📍 Konumu Haritadan Seç"
tıklanır, sheet açılır (masaüstünde ortalanmış modal, mobilde `BottomSheet`), bir parsel
doğrulanır, risk kartı **Uygula butonu OLMADAN** görünür (`hideApply` doğrulaması), "Hesaplamaya
Aktar"a basılır, sheet kapanır, Adım 1'de artık özet satırı (mahalle/ada/parsel/alan + "Değiştir")
görünür.

- [ ] **Step 8: Commit**

```bash
git add src/components/listing-wizard/WizardStep1Location.tsx src/components/listing-wizard/WizardStep1Location.test.tsx src/components/listing-wizard/wizard.module.css
git commit -m "feat(wizard): Adim 1'e parsel dogrulama tetikleyicisi + ozet satiri ekle"
```

---

### Task 8: Derin Cam görsel katmanı (yalnızca mobil)

**Files:**
- Modify: `src/components/listing-wizard/ParcelVerificationSheet.module.css`
- Test: `src/components/listing-wizard/ParcelVerificationSheet.scope.test.ts` (**yeni**)

**Interfaces:**
- Consumes: Task 3'ün `--seal-accent`/`--seal-accent-rgb` kanonik değerleri, bu oturumda
  doğrulanan `color-mix(in srgb, var(--seal-accent) 82%, #0F2A43)` kontrast deseni.

- [ ] **Step 1: Failing test'i yaz**

`src/components/listing-wizard/ParcelVerificationSheet.scope.test.ts`:

```ts
import fs from 'fs'
import path from 'path'

const css = fs.readFileSync(path.join(__dirname, 'ParcelVerificationSheet.module.css'), 'utf8')
const globalsCss = fs.readFileSync(path.join(__dirname, '../../app/globals.css'), 'utf8')
const mobile = () => css.slice(css.indexOf('@media (max-width: 768px)'))

describe('ParcelVerificationSheet mobil mühür kimliği', () => {
    it('seal tokenlari globals.css icine sizmamis olmali', () => {
        expect(globalsCss).not.toMatch(/--seal-(accent|surface|border|text|recessed)/)
    })

    it('--seal-accent kanonik Aurora cyan olmali', () => {
        expect(css).toMatch(/--seal-accent:\s*var\(--aurora-cyan\)/)
        expect(css).not.toMatch(/#4C8DFF/i)
    })

    it('token tanimlari mobil media query icinde olmali', () => {
        const mediaIndex = css.indexOf('@media (max-width: 768px)')
        expect(mediaIndex).toBeGreaterThan(-1)
        expect(css.indexOf('--seal-surface:')).toBeGreaterThan(mediaIndex)
    })

    it('.sheet arkaplani !important tasimali — BottomSheet.module.css ayri dosya, kaynak sirasina guvenilmez', () => {
        expect(mobile()).toMatch(/\.sheet\s*\{[^}]*background:\s*var\(--seal-surface\)\s*!important/)
    })

    it('aktif toggle segmenti koyultulmus ton tasimali (beyaz metin kontrasti icin)', () => {
        expect(mobile()).toMatch(/\.modeBtnOn\s*\{[^}]*background:\s*color-mix\(in srgb,\s*var\(--seal-accent\)\s*82%,\s*#0F2A43\)/)
    })

    it('mobil Aktar butonu koyultulmus ton tasimali', () => {
        expect(mobile()).toMatch(/\.mobileFooter \.applyBtn\s*\{[^}]*background:\s*color-mix\(in srgb,\s*var\(--seal-accent\)\s*82%,\s*#0F2A43\)/)
    })

    it('masaustu (media query disi) .modal/.overlay/.applyBtn hicbir seal token tuketmemeli', () => {
        const desktop = css.slice(0, css.indexOf('@media (max-width: 768px)'))
        expect(desktop).not.toMatch(/--seal-/)
    })
})
```

- [ ] **Step 2: Test'i çalıştır, başarısız olduğunu gör**

Run: `npx jest --no-coverage --roots "<rootDir>/src" ParcelVerificationSheet.scope`
Expected: FAIL — `--seal-*` hiçbir yerde tanımlı değil.

- [ ] **Step 3: CSS'i ekle**

`ParcelVerificationSheet.module.css`'in EN SONUNA (mevcut kuralları silme):

```css
@media (max-width: 768px) {
    [data-theme="dark"] {
        --seal-accent: var(--aurora-cyan);
        --seal-accent-rgb: 43, 124, 255;
        --seal-surface: linear-gradient(160deg, #0F2A43 0%, #16324F 100%);
        --seal-border: rgba(43, 124, 255, 0.25);
    }

    [data-theme="light"] {
        --seal-accent: var(--aurora-cyan);
        --seal-accent-rgb: 43, 124, 255;
        --seal-surface: var(--shell-bg);
        --seal-border: var(--shell-border);
    }

    .sheet {
        background: var(--seal-surface) !important;
        border-top-color: var(--seal-border);
    }

    .modeBtn {
        background: rgba(var(--seal-accent-rgb), 0.08);
        border-color: var(--seal-border);
        color: var(--seal-accent);
    }

    .modeBtnOn {
        background: color-mix(in srgb, var(--seal-accent) 82%, #0F2A43);
        color: #fff;
        border-color: transparent;
    }

    .mobileFooter .applyBtn {
        background: color-mix(in srgb, var(--seal-accent) 82%, #0F2A43);
    }

    .manualNote {
        background: rgba(var(--seal-accent-rgb), 0.05);
        border-color: var(--seal-border);
    }
}
```

**Not — `!important` gerekçesi:** `.sheet` sınıfı `BottomSheet`'e `className` olarak geçiliyor
ve `BottomSheet.module.css`'in KENDİ `.sheet` kuralıyla (farklı dosya, farklı CSS-module hash)
aynı elemanda birleşiyor. İki ayrı dosyanın CSS çıktısının paket-sırası garanti değil — Global
Constraints'te belirtilen "kaynak sırasına güvenilmez" kuralı burada tam olarak geçerli, bu
yüzden `!important` zorunlu (Task 4/5'teki `.sidebar`/`.convItemActive` ile aynı sınıf sorun).
`.modeBtn`/`.modeBtnOn`/`.mobileFooter .applyBtn`/`.manualNote` için `!important` GEREKMİYOR —
bunlar aynı dosya (`ParcelVerificationSheet.module.css`) içinde tanımlı, rakip bir kural yok.

- [ ] **Step 4: Testleri çalıştır, geçtiğini gör**

Run: `npx jest --no-coverage --roots "<rootDir>/src" ParcelVerificationSheet.scope`
Expected: 7/7 PASS.

- [ ] **Step 5: Tam suite**

Run: `npx jest --no-coverage --roots "<rootDir>/src"` → tümü PASS. `npx tsc --noEmit` → 0.

- [ ] **Step 6: Canlı doğrulama — kontrast dahil**

`/hesapla` VE `/listings/new`, 390px, light+dark: sheet açılır, `getComputedStyle` ile:
(a) `.sheet` arka planının gerçekten `--seal-surface`'e çözüldüğü (BottomSheet'in kendi
`var(--panel)`'i DEĞİL), (b) aktif toggle segmentinin `color-mix(...)` sonucunu taşıdığı,
(c) beyaz metin üzerindeki kontrastın (`.modeBtnOn`, mobil `.applyBtn`) canlı ölçümde ≥4.5:1
olduğu (Task 5'teki `color-mix` ölçüm scriptiyle aynı yöntem — beklenen: 4.855:1). 1440px'te
`.modal`/`.overlay`/`.applyBtn`'in hiçbir seal-token tüketmediği (masaüstü değişmedi) doğrulanır.

- [ ] **Step 7: Commit**

```bash
git add src/components/listing-wizard/ParcelVerificationSheet.module.css src/components/listing-wizard/ParcelVerificationSheet.scope.test.ts
git commit -m "feat(listing-wizard): ParcelVerificationSheet'e Derin Cam (mobil) uygula, kontrast dogrulandi"
```

---

### Task 9: Final doğrulama

**Files:** yok (yalnızca doğrulama; bulgu çıkarsa ilgili task'ın dosyası)

- [ ] **Step 1: Tam komut paketi**

```bash
npx tsc --noEmit
npx jest --no-coverage --roots "<rootDir>/src"
npx eslint .
npm run build
```

Hepsi temiz olmalı. `eslint`'te bu plandan bağımsız önceden var olan bulgular varsa (bkz.
Faz 2.5'in Task 7'sinde bulunan `scripts/download_images.js`, `page.tsx` `<img>` uyarıları gibi)
raporla ama düzeltme.

- [ ] **Step 2: Playwright — iki sayfa × iki tema × iki kırılım**

`/hesapla`, `/listings/new` — 390×844 ve 1440×900'de, light+dark: sheet'in açılıp kapandığını,
toggle'ın çalıştığını, `getComputedStyle` ile en az bir seal yüzeyinin gerçekten çözüldüğünü,
1440px'te görünümün DEĞİŞMEDİĞİNİ doğrula.

- [ ] **Step 3: Yatay taşma kontrolü**

İki sayfanın her birinde 390px'te, sheet açıkken, `document.documentElement.scrollWidth <=
clientWidth` olduğunu doğrula.

- [ ] **Step 4: `BottomSheet` diğer tüketicileri bozulmadı**

`GelismisAyarlarSheet`'in (veya `BottomSheet` kullanan başka bir bileşenin) `className`
VERMEDEN eskisi gibi çalıştığını — canlı, `/hesapla` mobil "Gelişmiş ayarlar" panelini açarak —
doğrula. Bu, Task 1'in "mevcut davranış değişmez" iddiasının gerçek regresyon kanıtı.

- [ ] **Step 5: Reduced-motion**

Playwright `reducedMotion: 'reduce'` context'iyle sheet'in açılış/kapanışının anında (geçişsiz)
olduğunu doğrula — `BottomSheet` bunu zaten çözmüştü, bu adım yalnızca yeni `className`
eklentisinin o davranışı BOZMADIĞINI kanıtlıyor.

- [ ] **Step 6: `globals.css` ve paylaşılan bileşen dokunulmazlığı**

```bash
git diff main --stat -- src/app/globals.css
git diff main --stat -- src/components/ui/
```

Her ikisi de boş olmalı.

- [ ] **Step 7: Bulguları raporla**

Bulunan her kusuru ilgili task'a geri besle ve düzelt; düzeltme sonrası ilgili guard testini de
güçlendir.
