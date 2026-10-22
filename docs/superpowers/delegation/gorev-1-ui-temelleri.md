# Görev 1 — UI temelleri (Button güncelle, Badge, Chip, SegmentedControl)

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

## Tasarım dili
- Birincil (primary): dolu `--blue`, yazı `--blue-on`, pill (`--radius-pill`).
- İkincil (secondary): `--blue-soft` dolgu, `--blue` yazı, çerçeve YOK.
- Üçüncül (tertiary): `--surface-2` dolgu, `--ink` yazı.
- Amber: `--amber` dolgu, yazı `--ink`... (açık temada koyu yeşil-gri okunur; koyu temada `--ink` açık olduğu için amber üstünde kötü okunur → yazıya `--canvas` kullan).
- Boyutlar: s (padding 8px 14px, 13px), m (12px 20px, 14px), l (16px 28px, 16px); font-weight 600.
- Badge: küçük pill, `px 10 py 4`, 12px, 600; tonlar: neutral (`--surface-2`/`--ink-secondary`), ok (`--ok` %14 arka plan karışımı yok; sade renkli metin + `--surface-2` değil → `color-mix(in srgb, var(--ok) 16%, transparent)` arka plan, yazı `--ok`), bad aynı mantık, amber (`--amber-soft`/`--amber-text`), blue (`--blue-soft`/`--blue`).
- Chip: pill düğme, `--surface` dolgu + `1px solid var(--line)`; seçili: `--amber-soft` dolgu, `--amber` çerçeve, yazı `--amber-text`.
- SegmentedControl: kap `--surface-2` + `1px --line`, pill; seçili öğe `--amber` dolgu; roving tabindex; ok tuşları (Sağ/Aşağı = sonraki, Sol/Yukarı = önceki, sarmal) `onChange` çağırır ve odağı yeni radio'ya taşır.

## Button (mevcut dosyayı güncelle, geriye uyum zorunlu)
Mevcut `variant?: 'primary'|'secondary'|'outline'|'ghost'` → yeni: `'primary'|'secondary'|'tertiary'|'amber'|'outline'|'ghost'`. `outline` secondary gibi, `ghost` tertiary gibi render edilir (sınıf adı `secondary` / `tertiary`). Yeni: `size?: 's'|'m'|'l'` (varsayılan 'm'), `iconLeft?`, `iconRight?: ReactNode` (aria-hidden `span` içinde, metin `span` içinde), `type` varsayılanı `'button'`. `fullWidth`, `className`, `...rest` korunur. Eski `Button.module.css` içeriğini tamamen yenile (eski `--brand-gradient` ve `--primary-glow` kullanımı kalkacak).

## Yazılacak dosyalar
Button.tsx, Button.module.css, Badge.tsx, Badge.module.css, Chip.tsx, Chip.module.css, SegmentedControl.tsx, SegmentedControl.module.css

`SegmentedControl` props: `{ ariaLabel: string; items: {value: string; label: ReactNode}[]; value: string; onChange: (v: string) => void; className?: string }`.
`Badge` props: `{ tone?: 'neutral'|'ok'|'bad'|'amber'|'blue'; children; className? }`.
`Chip` props: `ButtonHTMLAttributes & { selected?: boolean }`, `aria-pressed={!!selected}`, `type="button"`.

## Çıktı biçimi
Her dosyayı ayrı bir kod bloğunda ver; bloğun hemen üstünde tek satır: `// FILE: src/components/ui/Button.tsx`. Açıklama yazma.

## Testler (değiştirme)

### Button.arazi.test.tsx
```tsx
/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react'
import { Button } from '../Button'

describe('Button (Arazi)', () => {
  it('varsayılan birincil: button.primary, boyut m', () => {
    render(<Button>Kaydet</Button>)
    const b = screen.getByRole('button', { name: 'Kaydet' })
    expect(b.className).toMatch(/primary/)
    expect(b.className).toMatch(/size-m|sizeM/)
  })
  it.each(['primary', 'secondary', 'tertiary', 'amber'] as const)('%s varyantı sınıf alır', (v) => {
    render(<Button variant={v}>X</Button>)
    expect(screen.getByRole('button').className).toMatch(new RegExp(v))
  })
  it('eski outline → secondary, ghost → tertiary (geriye uyum)', () => {
    const { rerender } = render(<Button variant="outline">A</Button>)
    expect(screen.getByRole('button').className).toMatch(/secondary/)
    rerender(<Button variant="ghost">A</Button>)
    expect(screen.getByRole('button').className).toMatch(/tertiary/)
  })
  it('boyutlar s/m/l', () => {
    const { rerender } = render(<Button size="s">A</Button>)
    expect(screen.getByRole('button').className).toMatch(/size-s|sizeS/)
    rerender(<Button size="l">A</Button>)
    expect(screen.getByRole('button').className).toMatch(/size-l|sizeL/)
  })
  it('iconLeft ve iconRight metnin yanında, aria-hidden sarmalayıcıda', () => {
    render(<Button iconLeft={<i data-testid="l" />} iconRight={<i data-testid="r" />}>Git</Button>)
    expect(screen.getByTestId('l').parentElement).toHaveAttribute('aria-hidden', 'true')
    expect(screen.getByTestId('r').parentElement).toHaveAttribute('aria-hidden', 'true')
    expect(screen.getByRole('button', { name: 'Git' })).toBeInTheDocument()
  })
  it('fullWidth ve disabled çalışır, type varsayılanı button', () => {
    render(<Button fullWidth disabled>A</Button>)
    const b = screen.getByRole('button')
    expect(b).toBeDisabled()
    expect(b.className).toMatch(/fullWidth/)
    expect(b).toHaveAttribute('type', 'button')
  })
  it('type="submit" geçilirse korunur', () => {
    render(<Button type="submit">A</Button>)
    expect(screen.getByRole('button')).toHaveAttribute('type', 'submit')
  })
})
```

### Badge.test.tsx
```tsx
/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react'
import { Badge } from '../Badge'

describe('Badge', () => {
  it('metni gösterir, varsayılan nötr', () => {
    render(<Badge>Taslak</Badge>)
    const el = screen.getByText('Taslak')
    expect(el.className).toMatch(/neutral/)
  })
  it.each(['neutral', 'ok', 'bad', 'amber', 'blue'] as const)('%s tonu', (tone) => {
    render(<Badge tone={tone}>X</Badge>)
    expect(screen.getByText('X').className).toMatch(new RegExp(tone))
  })
  it('bir span render eder ve ek className alır', () => {
    render(<Badge className="ek">X</Badge>)
    const el = screen.getByText('X')
    expect(el.tagName).toBe('SPAN')
    expect(el.className).toMatch(/ek/)
  })
})
```

### Chip.test.tsx
```tsx
/** @jest-environment jsdom */
import { fireEvent, render, screen } from '@testing-library/react'
import { Chip } from '../Chip'

describe('Chip', () => {
  it('düğme olarak render edilir, aria-pressed seçili durumu yansıtır', () => {
    const { rerender } = render(<Chip>Konut</Chip>)
    expect(screen.getByRole('button', { name: 'Konut' })).toHaveAttribute('aria-pressed', 'false')
    rerender(<Chip selected>Konut</Chip>)
    const b = screen.getByRole('button', { name: 'Konut' })
    expect(b).toHaveAttribute('aria-pressed', 'true')
    expect(b.className).toMatch(/selected/)
  })
  it('tıklayınca onClick çağrılır', () => {
    const fn = jest.fn()
    render(<Chip onClick={fn}>A</Chip>)
    fireEvent.click(screen.getByRole('button'))
    expect(fn).toHaveBeenCalledTimes(1)
  })
  it('disabled iken tıklama çalışmaz', () => {
    const fn = jest.fn()
    render(<Chip disabled onClick={fn}>A</Chip>)
    fireEvent.click(screen.getByRole('button'))
    expect(fn).not.toHaveBeenCalled()
  })
})
```

### SegmentedControl.test.tsx
```tsx
/** @jest-environment jsdom */
import { fireEvent, render, screen } from '@testing-library/react'
import { SegmentedControl } from '../SegmentedControl'

const items = [{ value: 'g', label: 'Gündüz' }, { value: 'n', label: 'Gece' }]

describe('SegmentedControl', () => {
  it('radiogroup + radio rolleri, seçili olan aria-checked', () => {
    render(<SegmentedControl ariaLabel="Zaman" items={items} value="g" onChange={() => {}} />)
    expect(screen.getByRole('radiogroup', { name: 'Zaman' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Gündüz' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('radio', { name: 'Gece' })).toHaveAttribute('aria-checked', 'false')
  })
  it('tıklayınca onChange(value)', () => {
    const fn = jest.fn()
    render(<SegmentedControl ariaLabel="Zaman" items={items} value="g" onChange={fn} />)
    fireEvent.click(screen.getByRole('radio', { name: 'Gece' }))
    expect(fn).toHaveBeenCalledWith('n')
  })
  it('seçili olanı yeniden tıklamak onChange çağırmaz', () => {
    const fn = jest.fn()
    render(<SegmentedControl ariaLabel="Zaman" items={items} value="g" onChange={fn} />)
    fireEvent.click(screen.getByRole('radio', { name: 'Gündüz' }))
    expect(fn).not.toHaveBeenCalled()
  })
  it('ok tuşları seçimi değiştirir (sağ/sol, sarmal)', () => {
    const fn = jest.fn()
    render(<SegmentedControl ariaLabel="Zaman" items={items} value="n" onChange={fn} />)
    fireEvent.keyDown(screen.getByRole('radio', { name: 'Gece' }), { key: 'ArrowRight' })
    expect(fn).toHaveBeenCalledWith('g')
  })
  it('yalnız seçili radio tab sırasındadır (roving tabindex)', () => {
    render(<SegmentedControl ariaLabel="Zaman" items={items} value="g" onChange={() => {}} />)
    expect(screen.getByRole('radio', { name: 'Gündüz' })).toHaveAttribute('tabindex', '0')
    expect(screen.getByRole('radio', { name: 'Gece' })).toHaveAttribute('tabindex', '-1')
  })
})
```
