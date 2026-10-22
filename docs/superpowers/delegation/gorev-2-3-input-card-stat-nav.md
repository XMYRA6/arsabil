# Görev 2+3 — Input, Card, Stat, NavPill, TabBar

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


## Ek kurallar
- Bu görevde sınıf adları: Card → `card glass accent flat padNone padM padL cardTitle cardContent`; Stat → `stat label value unit hint neutral ok bad`; NavPill → `nav pill link active logoLink right`; TabBar → `bar tab active dot` (CSS Modules anahtar adı = sınıf adı).
- `Input` ve `Card` MEVCUT dosyalardır; API'yi geriye uyumlu genişlet, CSS'i yeni tokenlarla baştan yaz. Mevcut Input/Card'da kullanılan eski `var(--m-*)`, `--input-bg`, gradient, `backdrop-filter` ve cam efektlerini KULLANMA. Yeni tokenlar: `--surface --surface-2 --line --ink --ink-secondary --canvas --blue --blue-soft --amber --amber-text --amber-soft --ok --bad --shadow-card --radius-card --radius-field --radius-pill`.
- `Card`: kart yüzeyi `--surface`, `1px solid var(--line)`, `border-radius: var(--radius-card)`, `box-shadow: var(--shadow-card)`. Varyant `glass` (varsayılan, geriye uyum) = bu temel görünüm; `flat` = gölgesiz; `accent` = `--amber-soft` dolgu + `--amber` çerçeve. `padding` prop: `none|m|l` (m=24px, l=32px, none=0; mobilde m=18px) sınıfları `padNone padM padL`; varsayılan `m`.
- `Input`: `useId()` ile id üret; `id` prop verilirse onu kullan. `<label htmlFor>`; hata varsa `aria-invalid="true"` ve `aria-describedby` hata öğesinin id'sine, hata öğesi `role="alert"`. Alan: `--surface` zemin (koyuda `--surface-2`), `1px --line`, `--radius-field`, odakta `--focus-ring` ve `border-color: var(--blue)`. Hata: `--bad` çerçeve + metin.
- `Stat`: `<dl>` içinde `<dt>` etiket, `<dd>` değer (+ opsiyonel birim `span[data-testid="stat-unit"]`) ve opsiyonel alt metin `p[data-testid="stat-hint"]`. Props `{label: string; value: ReactNode; unit?: string; hint?: string; tone?: 'neutral'|'ok'|'bad'; className?}`. Değer öğesine tone sınıfı gelir: değer metni `<span className={[styles.value, styles[tone]]}>` içinde olmalı (testler `getByText(value).className` bakıyor). Kart görünümü: `--surface` + `--line` çerçeve, `--radius-card`, 20px iç boşluk; değer 28px/700, etiket 12px/500 `--ink-secondary`.
- `NavPill` (`src/components/layout/NavPill.tsx`): props `{links: {href:string;label:string}[]; activeHref: string; logo: ReactNode; right?: ReactNode}`. `<nav aria-label="Ana menü">`; logo `<Link href="/" aria-label="Ana sayfa">`; aktif: `activeHref === href || activeHref.startsWith(href + '/')` → `aria-current="page"` + `active` sınıfı. Görünüm: ortalanmış hap (`--radius-pill`), `--surface`, `1px --line`, `--shadow-card`, `padding 10px 20px`, öğeler arası 24px; link `--ink-secondary`, aktif `--ink` + 600. `next/link` kullan. Mobilde (≤768px) gizle (`display:none`) — mobilde TabBar kullanılır.
- `TabBar` (`src/components/layout/TabBar.tsx`): props `{tabs: {href;label;icon: ReactNode;dot?: boolean}[]; activeHref: string}`. `<nav aria-label="Alt menü">`. Aktiflik: `href === '/' ? activeHref === '/' : activeHref === href || activeHref.startsWith(href + '/')`. İkon `<span aria-hidden="true">` içinde; etiket altta 10px; aktif sekme `--amber-soft` pill + `--amber-text`; `dot` varsa 8px `--amber` yuvarlak, ikonun sağ üstünde, ve görsel olarak gizli metin `<span className="sr-only-class">Okunmamış bildirim var</span>` (kendi CSS'inde `.srOnly` tanımla: position absolute, 1px, clip). Yalnız ≤768px'te görünür (`display:flex`; üstünde `display:none`), `position: fixed; bottom: calc(12px + env(safe-area-inset-bottom)); left: 50%; transform: translateX(-50%)`, hap şekilli kap `--surface` + `--line` + `--shadow-card`, sekme min genişlik 64px, dokunma hedefi ≥44px.

## Yazılacak dosyalar
src/components/ui/Input.tsx, Input.module.css, Card.tsx, Card.module.css, Stat.tsx, Stat.module.css, src/components/layout/NavPill.tsx, NavPill.module.css, TabBar.tsx, TabBar.module.css

## Çıktı biçimi
Her dosyayı ayrı bir kod bloğunda ver; bloğun hemen üstünde tek satır: `// FILE: <yol>`. Açıklama yazma.

## Mevcut dosyalar (güncelle)

### src/components/ui/Input.tsx
```tsx
import React from 'react';
import styles from './Input.module.css';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    icon?: React.ReactNode;
    rightElement?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({
    label,
    error,
    icon,
    rightElement,
    className = '',
    ...props
}) => {
    return (
        <div className={`${styles.wrapper} ${className}`}>
            {label && <label className={styles.label}>{label}</label>}
            <div className={styles.inputContainer}>
                {icon && <span className={styles.icon}>{icon}</span>}
                <input
                    className={`${styles.input} ${error ? styles.hasError : ''} ${icon ? styles.withIcon : ''} ${rightElement ? styles.withRightElement : ''}`}
                    {...props}
                />
                {rightElement && <span className={styles.rightElement}>{rightElement}</span>}
            </div>
            {error && <span className={styles.errorText}>{error}</span>}
        </div>
    );
};

```

### src/components/ui/Card.tsx
```tsx
import React from 'react';
import styles from './Card.module.css';

interface CardProps {
    children: React.ReactNode;
    className?: string;
    title?: string;
    variant?: 'glass' | 'accent' | 'flat';
}

export const Card: React.FC<CardProps> = ({ children, className = '', title, variant = 'glass' }) => {
    return (
        <div className={`${styles.card} ${styles[variant]} ${className}`}>
            {title && <h3 className={styles.cardTitle}>{title}</h3>}
            <div className={styles.cardContent}>
                {children}
            </div>
        </div>
    );
};

```

## Testler (değiştirme)

### Input.arazi.test.tsx
```tsx
/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react'
import { Input } from '../Input'

describe('Input (Arazi)', () => {
  it('etiket input ile bağlanır (getByLabelText)', () => {
    render(<Input label="E-posta" />)
    expect(screen.getByLabelText('E-posta')).toBeInTheDocument()
  })
  it('kendi id geçilirse etiket o id ile bağlanır', () => {
    render(<Input id="mail" label="E-posta" />)
    expect(screen.getByLabelText('E-posta')).toHaveAttribute('id', 'mail')
  })
  it('hata: aria-invalid + aria-describedby hata metnine bağlanır, role=alert', () => {
    render(<Input label="Şifre" error="En az 8 karakter" />)
    const input = screen.getByLabelText('Şifre')
    expect(input).toHaveAttribute('aria-invalid', 'true')
    const err = screen.getByRole('alert')
    expect(err).toHaveTextContent('En az 8 karakter')
    expect(input.getAttribute('aria-describedby')).toContain(err.id)
  })
  it('hata yokken aria-invalid yok', () => {
    render(<Input label="A" />)
    expect(screen.getByLabelText('A')).not.toHaveAttribute('aria-invalid')
  })
  it('icon ve rightElement render edilir', () => {
    render(<Input label="A" icon={<i data-testid="i" />} rightElement={<b data-testid="r" />} />)
    expect(screen.getByTestId('i')).toBeInTheDocument()
    expect(screen.getByTestId('r')).toBeInTheDocument()
  })
  it('input props (placeholder, type) geçer; className kapsayıcıya gider', () => {
    const { container } = render(<Input label="A" placeholder="x" type="email" className="ek" />)
    const input = screen.getByLabelText('A')
    expect(input).toHaveAttribute('placeholder', 'x')
    expect(input).toHaveAttribute('type', 'email')
    expect((container.firstChild as HTMLElement).className).toMatch(/ek/)
  })
})

```

### Card.arazi.test.tsx
```tsx
/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react'
import { Card } from '../Card'

describe('Card (Arazi)', () => {
  it('başlık h3 ve içerik render edilir', () => {
    render(<Card title="Özet">içerik</Card>)
    expect(screen.getByRole('heading', { level: 3, name: 'Özet' })).toBeInTheDocument()
    expect(screen.getByText('içerik')).toBeInTheDocument()
  })
  it('varsayılan varyant glass (geriye uyum) ve yeni varyantlar sınıf alır', () => {
    const { container, rerender } = render(<Card>a</Card>)
    expect((container.firstChild as HTMLElement).className).toMatch(/glass/)
    rerender(<Card variant="accent">a</Card>)
    expect((container.firstChild as HTMLElement).className).toMatch(/accent/)
    rerender(<Card variant="flat">a</Card>)
    expect((container.firstChild as HTMLElement).className).toMatch(/flat/)
  })
  it('padding prop: none|m|l sınıfları (varsayılan m)', () => {
    const { container, rerender } = render(<Card>a</Card>)
    expect((container.firstChild as HTMLElement).className).toMatch(/padM/)
    rerender(<Card padding="l">a</Card>)
    expect((container.firstChild as HTMLElement).className).toMatch(/padL/)
    rerender(<Card padding="none">a</Card>)
    expect((container.firstChild as HTMLElement).className).toMatch(/padNone/)
  })
  it('className eklenir', () => {
    const { container } = render(<Card className="ek">a</Card>)
    expect((container.firstChild as HTMLElement).className).toMatch(/ek/)
  })
})

```

### Stat.test.tsx
```tsx
/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react'
import { Stat } from '../Stat'

describe('Stat', () => {
  it('etiket, değer, birim ve alt metin', () => {
    render(<Stat label="Min. daire fiyatı" value="7.530.000" unit="₺" hint="Kâr hedefi korunarak" />)
    expect(screen.getByText('Min. daire fiyatı')).toBeInTheDocument()
    expect(screen.getByText('7.530.000')).toBeInTheDocument()
    expect(screen.getByText('₺')).toBeInTheDocument()
    expect(screen.getByText('Kâr hedefi korunarak')).toBeInTheDocument()
  })
  it('birim ve alt metin isteğe bağlı', () => {
    render(<Stat label="A" value="1" />)
    expect(screen.queryByTestId('stat-unit')).not.toBeInTheDocument()
    expect(screen.queryByTestId('stat-hint')).not.toBeInTheDocument()
  })
  it('tone: ok/bad değeri renklendirir (sınıf), varsayılan nötr', () => {
    const { rerender } = render(<Stat label="A" value="1" />)
    expect(screen.getByText('1').className).toMatch(/neutral/)
    rerender(<Stat label="A" value="1" tone="ok" />)
    expect(screen.getByText('1').className).toMatch(/ok/)
    rerender(<Stat label="A" value="1" tone="bad" />)
    expect(screen.getByText('1').className).toMatch(/bad/)
  })
  it('dl/dt/dd semantiği', () => {
    const { container } = render(<Stat label="A" value="1" />)
    expect(container.querySelector('dl')).not.toBeNull()
    expect(container.querySelector('dt')?.textContent).toBe('A')
    expect(container.querySelector('dd')?.textContent).toContain('1')
  })
})

```

### NavPill.test.tsx
```tsx
/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react'
import { NavPill } from '../NavPill'

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children, ...r }: { href: string; children: React.ReactNode }) => <a href={href} {...r}>{children}</a>,
}))

const links = [{ href: '/hesapla', label: 'Hesapla' }, { href: '/deger', label: 'Değer' }, { href: '/akif', label: 'Akif' }]

describe('NavPill', () => {
  it('nav landmark ve logo bağlantısı (ana sayfa)', () => {
    render(<NavPill links={links} activeHref="/deger" logo={<span>LOGO</span>} />)
    expect(screen.getByRole('navigation', { name: 'Ana menü' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /ana sayfa/i })).toHaveAttribute('href', '/')
    expect(screen.getByText('LOGO')).toBeInTheDocument()
  })
  it('aktif bağlantı aria-current="page", diğerleri değil', () => {
    render(<NavPill links={links} activeHref="/deger" logo={null} />)
    expect(screen.getByRole('link', { name: 'Değer' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'Hesapla' })).not.toHaveAttribute('aria-current')
  })
  it('alt yol aktif sayılır (/akif/baglan → /akif)', () => {
    render(<NavPill links={links} activeHref="/akif/baglan" logo={null} />)
    expect(screen.getByRole('link', { name: 'Akif' })).toHaveAttribute('aria-current', 'page')
  })
  it('right slot render edilir', () => {
    render(<NavPill links={links} activeHref="/" logo={null} right={<button>Giriş</button>} />)
    expect(screen.getByRole('button', { name: 'Giriş' })).toBeInTheDocument()
  })
})

```

### TabBar.test.tsx
```tsx
/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react'
import { TabBar } from '../TabBar'

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children, ...r }: { href: string; children: React.ReactNode }) => <a href={href} {...r}>{children}</a>,
}))

const Icon = () => <svg data-testid="icon" />
const tabs = [
  { href: '/', label: 'Ana sayfa', icon: <Icon /> },
  { href: '/hesapla', label: 'Hesapla', icon: <Icon /> },
  { href: '/dashboard/profile', label: 'Profil', icon: <Icon />, dot: true },
]

describe('TabBar', () => {
  it('nav landmark, her sekme link', () => {
    render(<TabBar tabs={tabs} activeHref="/hesapla" />)
    expect(screen.getByRole('navigation', { name: 'Alt menü' })).toBeInTheDocument()
    expect(screen.getAllByRole('link')).toHaveLength(3)
  })
  it('aktif sekme aria-current; "/" yalnız tam eşleşmede aktif', () => {
    render(<TabBar tabs={tabs} activeHref="/hesapla" />)
    expect(screen.getByRole('link', { name: /Hesapla/ })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: /Ana sayfa/ })).not.toHaveAttribute('aria-current')
  })
  it('alt yol: /dashboard/profile/edit → Profil aktif', () => {
    render(<TabBar tabs={tabs} activeHref="/dashboard/profile/edit" />)
    expect(screen.getByRole('link', { name: /Profil/ })).toHaveAttribute('aria-current', 'page')
  })
  it('dot: ekran okuyucu metni', () => {
    render(<TabBar tabs={tabs} activeHref="/" />)
    expect(screen.getByText('Okunmamış bildirim var')).toBeInTheDocument()
  })
  it('ikonlar aria-hidden sarmalayıcıda', () => {
    render(<TabBar tabs={tabs} activeHref="/" />)
    expect(screen.getAllByTestId('icon')[0].parentElement).toHaveAttribute('aria-hidden', 'true')
  })
})

```
