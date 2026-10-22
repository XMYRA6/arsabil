# Görev 4 — Sahne seçici (scene.ts, autoSelect.ts, SceneSelector)

Sen bir kıdemli React/TypeScript geliştiricisisin. Next.js 16 + React 19, CSS Modules. Aşağıdaki testlerin TAMAMI geçmeli. Testleri değiştirme.

## Kurallar
- Her bileşen `src/components/ui/` altında `X.tsx` + `X.module.css`. Named export (`export const X` ya da `export function X`). `React.FC` kullanma.
- Renkleri ASLA hex yazma; yalnızca bu CSS değişkenleri: `--ink --ink-secondary --line --surface --surface-2 --canvas --amber --amber-text --amber-soft --blue --blue-on --blue-soft --ok --bad --radius-pill --radius-card --radius-field --shadow-card --ease-out --ease-in-out --dur-press --dur-ui --focus-ring`. Siyah (#000) yok, gradient yok, `transition: all` yok.
- Hareket: yalnız `transform`/`opacity`/`background-color`/`color`/`border-color` geçişi; süre `var(--dur-press)` (basma) ve `var(--dur-ui)`; eğri `var(--ease-out)`. Basma: `:active { transform: scale(0.97) }`.
- Hover yalnız `@media (hover: hover) and (pointer: fine)` içinde.
- `@media (prefers-reduced-motion: reduce)` içinde `transition: none; transform: none`.
- Odak: `:focus-visible { outline: none; box-shadow: var(--focus-ring) }`.
- Mobilde (`max-width: 768px`) dokunma hedefi min 44px yükseklik (Button ve Chip, SegmentedControl öğeleri).
- Sınıf adı testleri regex ile bakıyor: CSS Modules `identity-obj-proxy` ile anahtar adını aynen döndürür. Bu yüzden sınıflara tam bu adları ver: Button → `primary secondary tertiary amber sizeS sizeM sizeL fullWidth`, Badge → `badge neutral ok bad amber blue`, Chip → `chip selected`.


## Mevcut yardımcılar
- `src/lib/dioramas/manifest.json` hazır (yapı: `{types: {arsa: {label, variants: string[], items: [{id, varyant, egim, zaman, aspect, files: {"800": {file,width,height,bytes}, "1600": {...}}}]}, ...}}`). `egim` değerleri `duz | yamac | yamac2`, `zaman` `gunduz | gece`. Görseller `/dioramas/<file>` altında servis edilir (`public/dioramas/`).
- UI bileşenleri: `import { Chip } from '@/components/ui/Chip'` (props: `selected`, `onClick`, children), `import { SegmentedControl } from '@/components/ui/SegmentedControl'` (props: `ariaLabel, items:{value,label}[], value, onChange`), `import { Badge } from '@/components/ui/Badge'` (props: `tone`, children). Bunları kullan, yeniden yazma.
- JSON importu için `import manifest from './manifest.json'` (tsconfig `resolveJsonModule` açık).

## Yazılacak dosyalar
1. `src/lib/dioramas/scene.ts` — saf fonksiyonlar, React yok. Export: `type Tur = 'arsa'|'tarla'|'villa'|'ticari'|'bag'|'kat'`, `type Egim = 'duz'|'yamac'`, `type Zaman = 'gunduz'|'gece'`, `interface SceneValue { tur: Tur; varyant: string; egim: Egim; zaman: Zaman }`, `listTurler()`, `listVarianlar(tur)`, `yamacMumkun(tur, varyant)`, `resolveScene(q: {tur: Tur; varyant?: string; egim: Egim; zaman: Zaman})`. Tür sırası sabit: arsa, tarla, villa, ticari, bag, kat (etiketler manifest'ten, ama sıra bunun). Varyant sırası: arsa [agacli, agacsiz]; tarla [bugday, surulu, aycicegi]; villa [modern, tas1, tas2, tas3]; ticari [ofis]; bag [asma, zeytin, findik]; kat [bitmis, insaat]. Varyant etiketleri: agacli=Ağaçlı, agacsiz=Ağaçsız, bugday=Buğday, surulu=Sürülü, aycicegi=Ayçiçeği, modern=Modern, tas1=Taş 1, tas2=Taş 2, tas3=Taş 3, ofis=Ofis, asma=Asma, zeytin=Zeytin, findik=Fındık, bitmis=Bitmiş, insaat=İnşaat. `resolveScene` dönüşü: `{ id, tur, varyant, egim, zaman, egimYedek: boolean, src800, src1600, aspect, etiket }`; `etiket` = `"<Tür etiketi> · <Varyant etiketi>"`. Eşleşme kuralı: önce varyant+zaman ile adayları bul; egim tam eşleşirse onu al (`yamac` istenirse `yamac` tercih edilir, yoksa `yamac2`), yoksa `duz`, yoksa herhangi biri (ve `egimYedek: true`). `yamacMumkun`: ticari ve kat için false, diğerlerinde o varyantın (herhangi bir zamanda) `yamac`/`yamac2` öğesi varsa true.
2. `src/lib/dioramas/autoSelect.ts` — `autoSelectScene(input: {nitelik?: string|null; slopePercent?: number|null; treeCoverPercent?: number|null; hasBuilding?: boolean; theme?: 'light'|'dark'; hour?: number}): SceneValue`. Metni önce normalleştir (küçük harf `toLocaleLowerCase('tr-TR')`, aksanları kaldır: ı→i, ş→s, ğ→g, ü→u, ö→o, ç→c, İ→i). Anahtar kelime → tür: `tarla`→tarla; `bag|bahce|zeytin|findik`→bag; `ticari|ticaret|isyeri|dukkan|is merkezi`→ticari; `apartman|bina|kat karsiligi`→kat; `mesken|konut|villa|ev`→villa (kelime başı eşleşme; "ev" yalnız tam kelime); `arsa`→arsa; hiçbiri → arsa. Kontrol sırası: tarla, bag, ticari, kat, villa, arsa. Varyant: arsa → ağaç örtüsü ≥15 ise agacli, değilse agacsiz; `hasBuilding` ve tür arsa ise tür villa/modern. bag: metinde zeytin→zeytin, findik→findik, değilse asma. Diğerleri: tarla bugday, villa modern, ticari ofis, kat bitmis. Eğim: tür ticari/kat ise duz; slope ≥10 → yamac, aksi (null dahil) duz. Zaman: `theme` varsa dark→gece, light→gunduz; yoksa `hour` (19≤h veya h<6 → gece); ikisi de yoksa gunduz.
3. `src/components/home/SceneSelector.tsx` + `SceneSelector.module.css` — props `{ value: SceneValue; onChange: (v: SceneValue) => void; auto?: boolean }`. `'use client'`. Yapı: (a) `<div role="group" aria-label="Arazi türü">` içinde her tür için `Chip` (seçili: `selected`; `aria-pressed` Chip'ten gelir). Tür değişince `onChange({tur, varyant: <türün ilk varyantı>, egim: yamacMumkun(yeniTur, ilkVaryant) ? mevcut egim : 'duz', zaman: mevcut})`. (b) `<div role="group" aria-label="Varyant">` varyant Chip'leri; tıklanınca varyant değişir, egim `yamacMumkun` değilse 'duz'. Tek varyantlı türlerde (ofis) varyant grubunu GİZLE. (c) Eğim: `SegmentedControl ariaLabel="Eğim"` items Düz/Yamaç; `yamacMumkun` false ise segmenti HİÇ gösterme ve yerine `<p>Şehir içi: düz kullanılır</p>`. (d) Zaman: `SegmentedControl ariaLabel="Zaman"` Gündüz/Gece. (e) Önizleme: `<figure>` içinde `<img>` — `resolveScene(value)` ile; `src={src1600}`, `srcSet={`${src800} 800w, ${src1600} 1600w`}`, `sizes="(max-width: 768px) 92vw, 640px"`, `alt={`${etiket} · ${egim==='yamac'?'yamaç':'düz'} · ${zaman==='gece'?'gece':'gündüz'}`}`, `width/height` oranı `aspect`'ten (width=1600, height=round(1600/aspect)), `loading="eager"`. `<figcaption>`: sahne id'si (`resolveScene().id`) küçük monospace. (f) `auto` true ise önizleme köşesinde `Badge tone="amber"` içinde "Otomatik". Görsel dil: kap kart (`--surface`, `--line`, `--radius-card`, padding 20px), önizleme alanı `--surface-2` zemin, görsel `object-fit: contain`; kontroller arasında 16px boşluk; mobilde tür chip'leri yatay kaydırılabilir tek satır (`overflow-x: auto`, scrollbar gizli).

## Çıktı biçimi
Her dosyayı ayrı bir kod bloğunda ver; bloğun hemen üstünde tek satır: `// FILE: <yol>`. Açıklama yazma.

## Testler (değiştirme)

### src/lib/dioramas/scene.test.ts
```ts
import { listTurler, listVarianlar, resolveScene, yamacMumkun } from './scene'

describe('listTurler', () => {
  it('altı tür, Türkçe etiketle ve sabit sırayla', () => {
    expect(listTurler()).toEqual([
      { key: 'arsa', label: 'Arsa' },
      { key: 'tarla', label: 'Tarla' },
      { key: 'villa', label: 'Villa' },
      { key: 'ticari', label: 'Ticari' },
      { key: 'bag', label: 'Bağ-Bahçe' },
      { key: 'kat', label: 'Kat karşılığı' },
    ])
  })
})

describe('listVarianlar', () => {
  it('manifestteki varyantlar etiketli döner', () => {
    expect(listVarianlar('arsa')).toEqual([
      { key: 'agacli', label: 'Ağaçlı' },
      { key: 'agacsiz', label: 'Ağaçsız' },
    ])
    expect(listVarianlar('tarla').map((v) => v.key)).toEqual(['bugday', 'surulu', 'aycicegi'])
    expect(listVarianlar('ticari').map((v) => v.key)).toEqual(['ofis'])
  })
})

describe('yamacMumkun', () => {
  it('şehir içi türlerde (ticari, kat) yamaç yok', () => {
    expect(yamacMumkun('ticari', 'ofis')).toBe(false)
    expect(yamacMumkun('kat', 'bitmis')).toBe(false)
  })
  it('arsa/tarla/villa/bağ varyantlarında yamaç var', () => {
    expect(yamacMumkun('arsa', 'agacli')).toBe(true)
    expect(yamacMumkun('tarla', 'bugday')).toBe(true)
    expect(yamacMumkun('villa', 'modern')).toBe(true)
    expect(yamacMumkun('bag', 'zeytin')).toBe(true)
  })
})

describe('resolveScene', () => {
  it('tam eşleşme: id, görsel yolları, oran', () => {
    const s = resolveScene({ tur: 'villa', varyant: 'modern', egim: 'duz', zaman: 'gunduz' })
    expect(s.id).toBe('villa_modern_duz_gunduz')
    expect(s.egim).toBe('duz')
    expect(s.zaman).toBe('gunduz')
    expect(s.egimYedek).toBe(false)
    expect(s.src800).toBe('/dioramas/villa_modern_duz_gunduz-800.webp')
    expect(s.src1600).toBe('/dioramas/villa_modern_duz_gunduz-1600.webp')
    expect(s.aspect).toBeCloseTo(1.595, 2)
  })
  it('gece zamanı', () => {
    expect(resolveScene({ tur: 'arsa', varyant: 'agacli', egim: 'duz', zaman: 'gece' }).id).toBe('arsa_agacli_duz_gece')
  })
  it('yamaç: "yamac" tercih edilir (yamac2 değil)', () => {
    expect(resolveScene({ tur: 'arsa', varyant: 'agacli', egim: 'yamac', zaman: 'gunduz' }).id).toBe('arsa_agacli_yamac_gunduz')
  })
  it('yamaç istenip yoksa düze düşer ve egimYedek true', () => {
    const s = resolveScene({ tur: 'ticari', varyant: 'ofis', egim: 'yamac', zaman: 'gunduz' })
    expect(s.id).toBe('ticari_ofis_duz_gunduz')
    expect(s.egim).toBe('duz')
    expect(s.egimYedek).toBe(true)
  })
  it('düz istenip yalnız yamaç varsa (villa tas3) yamaca düşer', () => {
    const s = resolveScene({ tur: 'villa', varyant: 'tas3', egim: 'duz', zaman: 'gunduz' })
    expect(s.id).toBe('villa_tas3_yamac_gunduz')
    expect(s.egimYedek).toBe(true)
  })
  it('varyant verilmezse türün ilk varyantı', () => {
    expect(resolveScene({ tur: 'tarla', egim: 'duz', zaman: 'gunduz' }).id).toBe('tarla_bugday_duz_gunduz')
  })
  it('geçersiz varyant → ilk varyant', () => {
    expect(resolveScene({ tur: 'kat', varyant: 'yok', egim: 'duz', zaman: 'gece' }).id).toBe('kat_bitmis_duz_gece')
  })
  it('etiket: tür etiketi + varyant etiketi', () => {
    expect(resolveScene({ tur: 'bag', varyant: 'zeytin', egim: 'duz', zaman: 'gunduz' }).etiket).toBe('Bağ-Bahçe · Zeytin')
  })
  it('yamac2 hariç tüm 52 görsel için çözümleme kendi id\'sini döndürür', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const m = require('./manifest.json')
    let n = 0
    for (const [tur, t] of Object.entries<{ items: { id: string; varyant: string; egim: string; zaman: string }[] }>(m.types)) {
      for (const it of t.items) {
        if (it.egim === 'yamac2') continue
        const s = resolveScene({ tur: tur as never, varyant: it.varyant, egim: it.egim as never, zaman: it.zaman as never })
        expect(s.id).toBe(it.id)
        n++
      }
    }
    expect(n).toBe(52)
  })
})

```

### src/lib/dioramas/autoSelect.test.ts
```ts
import { autoSelectScene } from './autoSelect'

const base = { slopePercent: 3, treeCoverPercent: 0, hasBuilding: false, theme: 'light' as const }

describe('autoSelectScene · tür (nitelik)', () => {
  it.each([
    ['TARLA', 'tarla'],
    ['Tarla', 'tarla'],
    ['ARSA', 'arsa'],
    ['ARSA VASFINDA', 'arsa'],
    ['MESKEN', 'villa'],
    ['Konut', 'villa'],
    ['TİCARİ ALAN', 'ticari'],
    ['İŞYERİ', 'ticari'],
    ['APARTMAN', 'kat'],
    ['BAĞ', 'bag'],
    ['BAHÇE', 'bag'],
    ['ZEYTİNLİK', 'bag'],
    ['FINDIKLIK', 'bag'],
  ])('%s → %s', (nitelik, tur) => {
    expect(autoSelectScene({ ...base, nitelik }).tur).toBe(tur)
  })
  it('bilinmeyen veya boş nitelik → arsa', () => {
    expect(autoSelectScene({ ...base, nitelik: 'XYZ' }).tur).toBe('arsa')
    expect(autoSelectScene({ ...base, nitelik: '' }).tur).toBe('arsa')
    expect(autoSelectScene({ ...base, nitelik: null }).tur).toBe('arsa')
  })
})

describe('autoSelectScene · varyant', () => {
  it('arsa: ağaç örtüsü >= %15 → ağaçlı, altı → ağaçsız', () => {
    expect(autoSelectScene({ ...base, nitelik: 'ARSA', treeCoverPercent: 15 }).varyant).toBe('agacli')
    expect(autoSelectScene({ ...base, nitelik: 'ARSA', treeCoverPercent: 14.9 }).varyant).toBe('agacsiz')
  })
  it('arsa üzerinde bina varsa villa sahnesi', () => {
    const s = autoSelectScene({ ...base, nitelik: 'ARSA', hasBuilding: true })
    expect(s.tur).toBe('villa')
    expect(s.varyant).toBe('modern')
  })
  it('bağ: zeytin/fındık kelimesi varyantı belirler, yoksa asma', () => {
    expect(autoSelectScene({ ...base, nitelik: 'ZEYTİNLİK' }).varyant).toBe('zeytin')
    expect(autoSelectScene({ ...base, nitelik: 'FINDIKLIK' }).varyant).toBe('findik')
    expect(autoSelectScene({ ...base, nitelik: 'BAĞ' }).varyant).toBe('asma')
  })
  it('tarla → buğday, villa → modern, ticari → ofis, kat → bitmiş', () => {
    expect(autoSelectScene({ ...base, nitelik: 'TARLA' }).varyant).toBe('bugday')
    expect(autoSelectScene({ ...base, nitelik: 'MESKEN' }).varyant).toBe('modern')
    expect(autoSelectScene({ ...base, nitelik: 'TİCARİ' }).varyant).toBe('ofis')
    expect(autoSelectScene({ ...base, nitelik: 'APARTMAN' }).varyant).toBe('bitmis')
  })
})

describe('autoSelectScene · eğim', () => {
  it('< %10 düz, >= %10 yamaç', () => {
    expect(autoSelectScene({ ...base, nitelik: 'TARLA', slopePercent: 9.9 }).egim).toBe('duz')
    expect(autoSelectScene({ ...base, nitelik: 'TARLA', slopePercent: 10 }).egim).toBe('yamac')
  })
  it('ticari ve kat her zaman düz', () => {
    expect(autoSelectScene({ ...base, nitelik: 'TİCARİ', slopePercent: 30 }).egim).toBe('duz')
    expect(autoSelectScene({ ...base, nitelik: 'APARTMAN', slopePercent: 30 }).egim).toBe('duz')
  })
  it('eğim bilinmiyorsa (null) düz', () => {
    expect(autoSelectScene({ ...base, nitelik: 'ARSA', slopePercent: null }).egim).toBe('duz')
  })
})

describe('autoSelectScene · zaman', () => {
  it('tema belirler: dark → gece, light → gündüz', () => {
    expect(autoSelectScene({ ...base, nitelik: 'ARSA', theme: 'dark' }).zaman).toBe('gece')
    expect(autoSelectScene({ ...base, nitelik: 'ARSA', theme: 'light' }).zaman).toBe('gunduz')
  })
  it('tema yoksa saat belirler: 19:00–05:59 gece', () => {
    const t = (hour: number) => autoSelectScene({ nitelik: 'ARSA', slopePercent: 0, treeCoverPercent: 0, hasBuilding: false, hour }).zaman
    expect(t(6)).toBe('gunduz')
    expect(t(18)).toBe('gunduz')
    expect(t(19)).toBe('gece')
    expect(t(23)).toBe('gece')
    expect(t(2)).toBe('gece')
    expect(t(5)).toBe('gece')
  })
})

```

### src/components/home/SceneSelector.test.tsx
```ts
/** @jest-environment jsdom */
import { fireEvent, render, screen, within } from '@testing-library/react'
import { SceneSelector } from './SceneSelector'

const value = { tur: 'villa', varyant: 'modern', egim: 'duz', zaman: 'gunduz' } as const

describe('SceneSelector', () => {
  it('altı tür düğmesi, seçili olan aria-pressed', () => {
    render(<SceneSelector value={value} onChange={() => {}} />)
    const turler = screen.getByRole('group', { name: 'Arazi türü' })
    expect(within(turler).getAllByRole('button').map((b) => b.textContent)).toEqual(['Arsa', 'Tarla', 'Villa', 'Ticari', 'Bağ-Bahçe', 'Kat karşılığı'])
    expect(within(turler).getByRole('button', { name: 'Villa' })).toHaveAttribute('aria-pressed', 'true')
    expect(within(turler).getByRole('button', { name: 'Arsa' })).toHaveAttribute('aria-pressed', 'false')
  })
  it('tür değişince onChange: varyant türün ilk varyantı, diğerleri korunur', () => {
    const fn = jest.fn()
    render(<SceneSelector value={value} onChange={fn} />)
    fireEvent.click(screen.getByRole('button', { name: 'Tarla' }))
    expect(fn).toHaveBeenCalledWith({ tur: 'tarla', varyant: 'bugday', egim: 'duz', zaman: 'gunduz' })
  })
  it('varyant düğmeleri seçili türe göre', () => {
    render(<SceneSelector value={{ ...value, tur: 'arsa', varyant: 'agacli' }} onChange={() => {}} />)
    const v = screen.getByRole('group', { name: 'Varyant' })
    expect(within(v).getAllByRole('button').map((b) => b.textContent)).toEqual(['Ağaçlı', 'Ağaçsız'])
  })
  it('varyant tıklanınca onChange', () => {
    const fn = jest.fn()
    render(<SceneSelector value={{ ...value, tur: 'arsa', varyant: 'agacli' }} onChange={fn} />)
    fireEvent.click(screen.getByRole('button', { name: 'Ağaçsız' }))
    expect(fn).toHaveBeenCalledWith({ tur: 'arsa', varyant: 'agacsiz', egim: 'duz', zaman: 'gunduz' })
  })
  it('eğim ve zaman segmentleri çalışır', () => {
    const fn = jest.fn()
    render(<SceneSelector value={value} onChange={fn} />)
    fireEvent.click(screen.getByRole('radio', { name: 'Yamaç' }))
    expect(fn).toHaveBeenLastCalledWith({ ...value, egim: 'yamac' })
    fireEvent.click(screen.getByRole('radio', { name: 'Gece' }))
    expect(fn).toHaveBeenLastCalledWith({ ...value, zaman: 'gece' })
  })
  it('ticari/kat: yamaç seçeneği pasif ve açıklama görünür', () => {
    render(<SceneSelector value={{ tur: 'ticari', varyant: 'ofis', egim: 'duz', zaman: 'gunduz' }} onChange={() => {}} />)
    expect(screen.getByText('Şehir içi: düz kullanılır')).toBeInTheDocument()
    expect(screen.queryByRole('radio', { name: 'Yamaç' })).not.toBeInTheDocument()
  })
  it('tür değişince yamaç yoksa egim düze çekilir (villa yamaç → ticari)', () => {
    const fn = jest.fn()
    render(<SceneSelector value={{ ...value, egim: 'yamac' }} onChange={fn} />)
    fireEvent.click(screen.getByRole('button', { name: 'Ticari' }))
    expect(fn).toHaveBeenCalledWith({ tur: 'ticari', varyant: 'ofis', egim: 'duz', zaman: 'gunduz' })
  })
  it('önizleme: çözülen görselin srcSet/src ve dosya adı etiketi', () => {
    render(<SceneSelector value={{ ...value, egim: 'yamac', zaman: 'gece' }} onChange={() => {}} />)
    const img = screen.getByRole('img', { name: /Villa · Modern/ })
    expect(img.getAttribute('src')).toBe('/dioramas/villa_modern_yamac_gece-1600.webp')
    expect(img.getAttribute('srcset')).toContain('/dioramas/villa_modern_yamac_gece-800.webp 800w')
    expect(screen.getByText('villa_modern_yamac_gece')).toBeInTheDocument()
  })
  it('auto true iken "Otomatik" rozeti', () => {
    const { rerender } = render(<SceneSelector value={value} onChange={() => {}} />)
    expect(screen.queryByText('Otomatik')).not.toBeInTheDocument()
    rerender(<SceneSelector value={value} onChange={() => {}} auto />)
    expect(screen.getByText('Otomatik')).toBeInTheDocument()
  })
})

```
