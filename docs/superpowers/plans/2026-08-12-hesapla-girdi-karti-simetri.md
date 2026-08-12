# Hesapla Mobil Girdi Kartı — Simetri + Daire Büyüklüğü Elle Giriş Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mobil `/hesapla`'daki `SmartContextCard`'ı (konum çipi, Deprem Riski, Arsa Alanı) ve paylaşılan `Toggle` bileşenini `GirdiKarti`'nin zaten kullandığı mobil "Premium Liquid Glass" (`--m-*`) sistemine taşımak, ve "Daire Büyüklüğü"ne elle giriş eklemek — davranış/veri akışı/masaüstü görünüm değişmeden.

**Architecture:** `SmartContextCard.module.css` ve `Toggle.module.css`'e (ikisi de hem masaüstü hem mobilde render edilen paylaşılan dosyalar) yeni bir `@media (max-width: 768px)` bloğu eklenir — masaüstü (media query dışı) kurallar birebir korunur. `SmartContextCard.tsx`'te tek bir küçük JSX taşıması yapılır (durum metni artık `areaHeader`'ın dışında, kendi satırında). `GirdiKarti.tsx`'te "Daire büyüklüğü" statik `<span>`'i gerçek bir `<input>`'a dönüşür, davranışı masaüstündeki `page.tsx:650-654`'ün elle-giriş deseniyle birebir aynı (clamp yok).

**Tech Stack:** Next.js 16 App Router, React, CSS Modules, Jest + React Testing Library, regex tabanlı "scope" testleri (ham CSS metni üzerinde).

## Global Constraints

- Tüm yeni/değişen mobil kurallar `@media (max-width: 768px)` içinde kalmalı; masaüstü (media query dışı) hiçbir mevcut kural değişmemeli (pixel-parity).
- Mobilde taşınan/yeni metin renkleri MUTLAKA `var(--m-ink)` (başlık) veya `var(--m-body)` (ikincil metin) kullanmalı — `var(--fg)`, `var(--label-color)`, `var(--muted)` KULLANILMAMALI (`--m-*` sistemi tema-bağımsız/yalnızca-açık-tema'dır; önceki iki göçün final review'lerinde bulunan gerçek koyu-tema-kontrast regresyonunun tekrarı olmamalı).
- Panel/input kenarlık-kontrastı iyileştirmesi (kullanıcı onayıyla, spec'in "Kenarlık kontrastı" notu) yalnızca BU karttaki (`SmartContextCard`, `GirdiKarti`'nin `.stepperSatir`'i) panellere özeldir — `--m-fill`/`--m-glass-border` token'larının KENDİSİ değişmiyor, uygulamanın başka hiçbir mobil yüzeyi (`.segmentKap`, `.konumBlogu` vb.) etkilenmiyor.
- Daire Büyüklüğü elle girişinde masaüstüyle TUTARLI davranış: hiçbir clamp/sınır uygulanmıyor (yalnızca ± stepper butonları kendi `M2_MIN`/`M2_MAX` sınırlarını korur — bu davranış değişmiyor).
- Motor/hesaplama mantığı, `page.tsx`'teki state ve handler'lar (`onIsAaEnabled`, `onArsaAlani`, `onRiskLevel`, `handleApartmentSizeChange`) birebir korunuyor — yalnızca render değişiyor.
- Spec: `docs/superpowers/specs/2026-08-12-hesapla-girdi-karti-simetri-design.md`. Mockup: https://claude.ai/code/artifact/f4dbd4ce-cf59-48d3-bbfd-cccd8bbc1d9e

---

## Dosya Yapısı Özeti

| Dosya | İşlem | Sorumluluk |
|---|---|---|
| `src/app/hesapla/SmartContextCard.tsx` | Değiştir | Durum metnini `areaHeader`'ın dışına taşır (Task 1) |
| `src/app/hesapla/SmartContextCard.module.css` | Değiştir | Mobil override bloğu + kenarlık kontrastı + `margin:0` düzeltmesi (Task 1) |
| `src/app/hesapla/SmartContextCard.styles.scope.test.ts` | Oluştur | Task 1'in CSS guard testleri |
| `src/components/ui/Toggle.module.css` | Değiştir | Mobil override bloğu (Task 2) |
| `src/components/ui/Toggle.styles.scope.test.ts` | Oluştur | Task 2'nin CSS guard testleri |
| `src/app/hesapla/mobile/GirdiKarti.tsx` | Değiştir | `onApartmentSize` tipi genişler, statik span → input (Task 3) |
| `src/app/hesapla/mobile/mobile.module.css` | Değiştir | `.stepperInput` eklenir, `.stepperSatir` kenarlık kontrastı alır (Task 3) |
| `src/app/hesapla/mobile/GirdiKarti.test.tsx` | Değiştir | Kırılan bir test düzeltilir, 2 yeni test eklenir (Task 3) |

Yeni bileşen dosyası oluşturulmuyor.

---

### Task 1: `SmartContextCard` — mobil Liquid Glass göçü

**Files:**
- Modify: `src/app/hesapla/SmartContextCard.tsx`
- Modify: `src/app/hesapla/SmartContextCard.module.css`
- Create: `src/app/hesapla/SmartContextCard.styles.scope.test.ts`

**Interfaces:**
- Consumes: yok (bağımsız ilk task).
- Produces: `.areaStatus`/`.areaStatusOk` artık `<p>` olarak `areaHeader`'ın kardeşi (Task 2/3 buna bağımlı değil).

- [ ] **Step 1: Write the failing tests**

Yeni dosya `src/app/hesapla/SmartContextCard.styles.scope.test.ts`:

```ts
import fs from 'fs'
import path from 'path'

const css = fs.readFileSync(path.join(__dirname, 'SmartContextCard.module.css'), 'utf8')
const mediaIndex = css.indexOf('@media (max-width: 768px)')

describe('SmartContextCard.module.css — mobil Liquid Glass kapsamı', () => {
  it('dosyada mobil override bloğu var', () => {
    expect(mediaIndex).toBeGreaterThan(-1)
  })

  it('.riskSection, .areaSection mobilde kutulu panel + kenarlık kontrastı kullanmalı', () => {
    const mobileBlock = css.slice(mediaIndex)
    const match = mobileBlock.match(/\.riskSection,\s*\.areaSection\s*\{([^}]*)\}/)
    expect(match).not.toBeNull()
    expect(match![1]).toMatch(/rgba\(11,\s*32,\s*54,\s*\.055\)/)
    expect(match![1]).toMatch(/1px solid rgba\(11,\s*32,\s*54,\s*\.07\)/)
  })

  it('.riskPillActive mobilde var(--m-grad-btn) kullanmalı', () => {
    const mobileBlock = css.slice(mediaIndex)
    const match = mobileBlock.match(/\.riskPillActive\s*\{([^}]*)\}/)
    expect(match).not.toBeNull()
    expect(match![1]).toMatch(/var\(--m-grad-btn\)/)
  })

  it('.address/.riskHeader/.areaHeader/.riskKaynakEtiket/.riskNote/.areaStatus/.areaStatusOk mobilde var(--m-*) kullanmalı, var(--fg)/var(--label-color)/var(--muted) KULLANMAMALI', () => {
    const mobileBlock = css.slice(mediaIndex)
    const selectors = ['.address', '.riskHeader', '.riskKaynakEtiket', '.riskNote', '.areaHeader', '.areaStatus', '.areaStatusOk']
    for (const sel of selectors) {
      const re = new RegExp('\\' + sel + '\\s*\\{([^}]*)\\}')
      const m = mobileBlock.match(re)
      expect(m).not.toBeNull()
      expect(m![1]).toMatch(/var\(--m-ink\)|var\(--m-body\)|var\(--m-success\)|#b45309/)
      expect(m![1]).not.toMatch(/var\(--fg\)|var\(--label-color\)|var\(--muted\)/)
    }
  })

  it('.areaInputRow input mobilde beyaz zemin yerine kenarlık-kontrastlı zemin kullanmalı', () => {
    const mobileBlock = css.slice(mediaIndex)
    const match = mobileBlock.match(/\.areaInputRow input\s*\{([^}]*)\}/)
    expect(match).not.toBeNull()
    expect(match![1]).toMatch(/#f8fafd/)
    expect(match![1]).toMatch(/1px solid rgba\(11,\s*32,\s*54,\s*\.14\)/)
    expect(match![1]).toMatch(/font-size:\s*16px/)
  })

  it('masaüstü (media query dışı) .riskPill/.areaSection/.address tanımları DEĞİŞMEDEN kalmalı', () => {
    const desktopBlock = css.slice(0, mediaIndex)
    expect(desktopBlock).toMatch(/\.riskPill\s*\{[^}]*background:\s*var\(--card-bg\)/)
    expect(desktopBlock).toMatch(/\.areaSection\s*\{[^}]*background:\s*var\(--input-bg\)/)
    expect(desktopBlock).toMatch(/\.address\s*\{[^}]*color:\s*var\(--fg\)/)
  })

  it('.areaHeaderRight artık kullanılmıyor (JSX taşıması sonrası dead CSS temizlendi)', () => {
    expect(css).not.toMatch(/\.areaHeaderRight/)
  })

  it('.areaStatus/.areaStatusOk artık <p> oldukları için margin:0 ile UA varsayılan boşluğu iptal etmeli', () => {
    const desktopBlock = css.slice(0, mediaIndex)
    const statusMatch = desktopBlock.match(/\.areaStatus\s*\{([^}]*)\}/)
    expect(statusMatch).not.toBeNull()
    expect(statusMatch![1]).toMatch(/margin:\s*0/)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest --no-coverage src/app/hesapla/SmartContextCard.styles.scope.test.ts`
Expected: FAIL — `mediaIndex` `-1` olduğu için birçok test `.match(...)` sonucu `null` alıp patlar, `.areaHeaderRight` hâlâ dosyada olduğu için son test de FAIL.

- [ ] **Step 3: Write minimal implementation**

**3a. `SmartContextCard.module.css` — `.areaHeaderRight`'ı kaldır, `margin:0` ekle, dosyanın SONUNA mobil override bloğu ekle.**

Ara (bul ve TAMAMINI değiştir — dosyanın 121-178. satırları):

```css
.areaSection {
    background: var(--input-bg);
    border-radius: 12px;
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.areaHeader {
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--label-color);
    display: flex;
    justify-content: space-between;
}

.areaHeaderRight {
    display: flex;
    align-items: center;
    gap: 8px;
}

/* Bu anahtar (isAaEnabled) daha once yalnizca masaustunde render ediliyordu;
   simdi kart uzerinden mobilde de tiklanabilir oldugu icin projenin kendi
   `--touch-target: 44px` tabanina uymasi gerekiyor — paylasilan `Toggle`in
   gorsel yuksekligi (30px) degismeden, tiklama alani genisletiliyor
   (globals.css'teki diger Toggle kullanimlarini etkilemez, sadece burasi). */
.aaToggle {
    min-height: var(--touch-target);
}

.areaStatus {
    font-size: 0.75rem;
    color: #f59e0b;
}

.areaStatusOk {
    color: #10b981;
}

.areaInputRow {
    display: flex;
    align-items: center;
    gap: 8px;
}

.areaInputRow input {
    flex: 1;
    background: var(--card-bg);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 8px 12px;
    font-size: 1rem;
    font-weight: 600;
    color: var(--fg);
}
```

Yeni:

```css
.areaSection {
    background: var(--input-bg);
    border-radius: 12px;
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.areaHeader {
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--label-color);
    display: flex;
    justify-content: space-between;
}

/* Bu anahtar (isAaEnabled) daha once yalnizca masaustunde render ediliyordu;
   simdi kart uzerinden mobilde de tiklanabilir oldugu icin projenin kendi
   `--touch-target: 44px` tabanina uymasi gerekiyor — paylasilan `Toggle`in
   gorsel yuksekligi (30px) degismeden, tiklama alani genisletiliyor
   (globals.css'teki diger Toggle kullanimlarini etkilemez, sadece burasi). */
.aaToggle {
    min-height: var(--touch-target);
}

/* `<p>` — UA varsayilan dikey margin'i areaSection'in kendi `gap:8px`ine
   eklenip istenmeyen fazladan bosluk yaratmasin diye sifirlanir. */
.areaStatus {
    font-size: 0.75rem;
    color: #f59e0b;
    margin: 0;
}

.areaStatusOk {
    color: #10b981;
}

.areaInputRow {
    display: flex;
    align-items: center;
    gap: 8px;
}

.areaInputRow input {
    flex: 1;
    background: var(--card-bg);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 8px 12px;
    font-size: 1rem;
    font-weight: 600;
    color: var(--fg);
}

@media (max-width: 768px) {
    .unselectedBtn {
        background: rgba(21, 96, 208, .06);
        border-color: rgba(21, 96, 208, .4);
        color: var(--m-link);
        border-radius: var(--m-r-btn);
    }
    .address { color: var(--m-ink); }
    .editBtn { color: var(--m-link); }

    .riskSection, .areaSection {
        background: rgba(11, 32, 54, .055);
        border: 1px solid rgba(11, 32, 54, .07);
        border-radius: var(--m-r-inner);
    }
    .riskHeader, .areaHeader { color: var(--m-body); }
    .riskKaynakEtiket { color: var(--m-body); }
    .riskNote { color: var(--m-body); }

    /* Risk pilleri -> segment gorunumu (Yapi Standardi ile ayni desen) */
    .riskPills { gap: 5px; }
    .riskPill {
        background: transparent;
        border: none;
        border-radius: 12px;
        color: var(--m-on-glass);
        min-height: 40px;
    }
    .riskPillActive {
        background: var(--m-grad-btn);
        color: #fff;
        box-shadow: var(--m-sh-grad-btn);
        border: none;
    }

    .areaStatus { color: #b45309; }
    .areaStatusOk { color: var(--m-success); }

    .areaInputRow input {
        background: #f8fafd;
        border: 1px solid rgba(11, 32, 54, .14);
        border-radius: var(--m-r-input);
        color: var(--m-ink);
        font-size: 16px;
    }
}
```

**3b. `SmartContextCard.tsx` — durum metnini `areaHeader`'ın dışına taşı.**

Ara (bul ve TAMAMINI değiştir):

```tsx
            {/* Alani ACMA anahtari kartin ICINDE: `isAaEnabled`i cevirebilen
                tek kontrol masaustu JSX agacindaydi, mobilde parsel
                onaylamadan arsa alani HIC girilemiyordu. Kart iki platformda
                da render edildigi icin anahtar burada olunca ikisi de kazanir
                (spec: risk ve alan parselden BAGIMSIZ kullanilabilmeli). */}
            <div className={styles.areaSection}>
                <div className={styles.areaHeader}>
                    <span>Arsa Alanı</span>
                    <span className={styles.areaHeaderRight}>
                        {isAaEnabled && (
                            <span className={isAreaVerified ? styles.areaStatusOk : styles.areaStatus}>
                                {isAreaVerified ? '✓ TKGM Onaylı' : 'Elle girilmesi gerekiyor'}
                            </span>
                        )}
                        <Toggle
                            className={styles.aaToggle}
                            checked={isAaEnabled}
                            aria-label="Arsa alanını hesaba kat"
                            onChange={(e) => onIsAaEnabled(e.target.checked)}
                        />
                    </span>
                </div>
                {isAaEnabled && (
                    <div className={styles.areaInputRow}>
                        <input
                            type="number"
                            value={arsaAlani || ''}
                            onChange={(e) => onArsaAlani(Number(e.target.value))}
                            placeholder="Alanı girin"
                        />
                        <span>m²</span>
                    </div>
                )}
            </div>
```

Yeni:

```tsx
            {/* Alani ACMA anahtari kartin ICINDE: `isAaEnabled`i cevirebilen
                tek kontrol masaustu JSX agacindaydi, mobilde parsel
                onaylamadan arsa alani HIC girilemiyordu. Kart iki platformda
                da render edildigi icin anahtar burada olunca ikisi de kazanir
                (spec: risk ve alan parselden BAGIMSIZ kullanilabilmeli).
                Durum metni artik baslik+toggle satirinin DISINDA, kendi
                satirinda render oluyor — toggle KAPALIYKEN baslik+toggle
                satiri hic kirilmadan tek satirda kalir (mobil mockup'ta
                onaylanan davranis, bkz. docs/superpowers/specs/
                2026-08-12-hesapla-girdi-karti-simetri-design.md). */}
            <div className={styles.areaSection}>
                <div className={styles.areaHeader}>
                    <span>Arsa Alanı</span>
                    <Toggle
                        className={styles.aaToggle}
                        checked={isAaEnabled}
                        aria-label="Arsa alanını hesaba kat"
                        onChange={(e) => onIsAaEnabled(e.target.checked)}
                    />
                </div>
                {isAaEnabled && (
                    <p className={isAreaVerified ? styles.areaStatusOk : styles.areaStatus}>
                        {isAreaVerified ? '✓ TKGM Onaylı' : 'Elle girilmesi gerekiyor'}
                    </p>
                )}
                {isAaEnabled && (
                    <div className={styles.areaInputRow}>
                        <input
                            type="number"
                            value={arsaAlani || ''}
                            onChange={(e) => onArsaAlani(Number(e.target.value))}
                            placeholder="Alanı girin"
                        />
                        <span>m²</span>
                    </div>
                )}
            </div>
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest --no-coverage src/app/hesapla/SmartContextCard.styles.scope.test.ts src/app/hesapla/SmartContextCard.test.tsx`
Expected: tüm testler PASS (yeni scope testleri + mevcut `SmartContextCard.test.tsx`'in 10 testi — hiçbiri kırılmadı, çünkü `getByText('✓ TKGM Onaylı')` gibi sorgular DOM konumundan bağımsız çalışır).

- [ ] **Step 5: Commit**

```bash
git add src/app/hesapla/SmartContextCard.tsx src/app/hesapla/SmartContextCard.module.css src/app/hesapla/SmartContextCard.styles.scope.test.ts
git commit -m "feat(hesapla-mobil): SmartContextCard liquid glass'a tasinir, kenarlik kontrasti eklenir"
```

---

### Task 2: `Toggle` — mobil override

**Files:**
- Modify: `src/components/ui/Toggle.module.css`
- Create: `src/components/ui/Toggle.styles.scope.test.ts`

**Interfaces:**
- Consumes: yok (Task 1'den bağımsız, farklı dosya).
- Produces: yok (Task 3 buna bağımlı değil, `Toggle` bileşeni `GirdiKarti` içinde kullanılmıyor).

- [ ] **Step 1: Write the failing tests**

Yeni dosya `src/components/ui/Toggle.styles.scope.test.ts`:

```ts
import fs from 'fs'
import path from 'path'

const css = fs.readFileSync(path.join(__dirname, 'Toggle.module.css'), 'utf8')
const mediaIndex = css.indexOf('@media (max-width: 768px)')

describe('Toggle.module.css — mobil Liquid Glass kapsamı', () => {
  it('dosyada mobil override bloğu var', () => {
    expect(mediaIndex).toBeGreaterThan(-1)
  })

  it('mobilde açık durum var(--m-grad-btn) kullanmalı, boyut GirdiKarti .anahtar ile birebir (46x27/21x21/19px)', () => {
    const mobileBlock = css.slice(mediaIndex)

    const switchMatch = mobileBlock.match(/\.switch\s*\{([^}]*)\}/)
    expect(switchMatch).not.toBeNull()
    expect(switchMatch![1]).toMatch(/width:\s*46px/)
    expect(switchMatch![1]).toMatch(/height:\s*27px/)

    const checkedMatch = mobileBlock.match(/input:checked \+ \.slider\s*\{([^}]*)\}/)
    expect(checkedMatch).not.toBeNull()
    expect(checkedMatch![1]).toMatch(/var\(--m-grad-btn\)/)

    const beforeMatch = mobileBlock.match(/input:checked \+ \.slider:before\s*\{([^}]*)\}/)
    expect(beforeMatch).not.toBeNull()
    expect(beforeMatch![1]).toMatch(/translateX\(19px\)/)
  })

  it('mobilde kapalı durum var(--m-fill) kullanmalı', () => {
    const mobileBlock = css.slice(mediaIndex)
    // Duz `.slider { ... }` kurali (kapali durum) mobil blokta `input:checked
    // + .slider { ... }`den ONCE tanimli — non-global match() ilk (dogru)
    // eslesmeyi doner.
    const match = mobileBlock.match(/\.slider\s*\{([^}]*)\}/)
    expect(match).not.toBeNull()
    expect(match![1]).toMatch(/var\(--m-fill\)/)
  })

  it('masaüstü (media query dışı) .switch/input:checked + .slider tanımları DEĞİŞMEDEN kalmalı', () => {
    const desktopBlock = css.slice(0, mediaIndex)
    expect(desktopBlock).toMatch(/\.switch\s*\{[^}]*width:\s*50px/)
    expect(desktopBlock).toMatch(/input:checked \+ \.slider\s*\{[^}]*var\(--brand-gradient\)/)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest --no-coverage src/components/ui/Toggle.styles.scope.test.ts`
Expected: FAIL — `mediaIndex` `-1`, ilk üç test `null` match'te patlar.

- [ ] **Step 3: Write minimal implementation**

`Toggle.module.css` dosyasının SONUNA (son satır `input:checked + .slider:before { transform: translateX(20px); }`'den hemen sonra) ekle:

```css

@media (max-width: 768px) {
    .switch { width: 46px; height: 27px; }
    .slider { background: var(--m-fill); border: none; box-shadow: none; }
    .slider:before { width: 21px; height: 21px; box-shadow: 0 2px 6px rgba(11, 32, 54, .25); }
    input:checked + .slider {
        background: var(--m-grad-btn);
        border: none;
        box-shadow: var(--m-sh-grad-btn);
    }
    input:checked + .slider:before { transform: translateX(19px); }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest --no-coverage src/components/ui/Toggle.styles.scope.test.ts`
Expected: tüm testler PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/Toggle.module.css src/components/ui/Toggle.styles.scope.test.ts
git commit -m "feat(hesapla-mobil): Toggle mobilde GirdiKarti .anahtar ile birebir gorsele gecer"
```

---

### Task 3: `GirdiKarti` — Daire Büyüklüğü elle giriş

**Files:**
- Modify: `src/app/hesapla/mobile/GirdiKarti.tsx`
- Modify: `src/app/hesapla/mobile/mobile.module.css`
- Modify: `src/app/hesapla/mobile/GirdiKarti.test.tsx`

**Interfaces:**
- Consumes: yok (Task 1/2'den bağımsız, farklı dosyalar).
- Produces: `GirdiKartiProps.onApartmentSize: (v: number | null) => void` (önceden `(v: number) => void` idi — `page.tsx`'teki gerçek çağıran zaten `number | null` kabul ediyordu, bu yalnızca tipi gerçek davranışla eşitliyor, `page.tsx`'te değişiklik gerektirmiyor).

- [ ] **Step 1: Write the failing tests**

`src/app/hesapla/mobile/GirdiKarti.test.tsx`'te önce KIRILAN testi düzelt. Ara (bul ve değiştir):

```ts
    it('apartmentSize null iken deger yerine tire gosterir', () => {
        render(<GirdiKarti {...props({ apartmentSize: null })} />)
        expect(screen.getByText('—')).toBeInTheDocument()
    })
```

Yeni:

```ts
    it('apartmentSize null iken input placeholder tire gosterir', () => {
        render(<GirdiKarti {...props({ apartmentSize: null })} />)
        const input = screen.getByRole('spinbutton', { name: 'Daire büyüklüğü, m²' })
        expect(input).toHaveValue(null)
        expect(input).toHaveAttribute('placeholder', '—')
    })
```

Sonra dosyanın SONUNDAKİ `})` satırından (describe bloğunun kapanışı) hemen ÖNCE ekle:

```ts

    it('elle yazilan deger dogrudan onApartmentSize a iletilir (clamp yok, masaustuyle tutarli)', () => {
        const onApartmentSize = jest.fn()
        render(<GirdiKarti {...props({ apartmentSize: 140, onApartmentSize })} />)
        const input = screen.getByRole('spinbutton', { name: 'Daire büyüklüğü, m²' })
        fireEvent.change(input, { target: { value: '999' } })
        expect(onApartmentSize).toHaveBeenCalledWith(999)
    })

    it('input bosaltilinca onApartmentSize(null) cagrilir', () => {
        const onApartmentSize = jest.fn()
        render(<GirdiKarti {...props({ apartmentSize: 140, onApartmentSize })} />)
        const input = screen.getByRole('spinbutton', { name: 'Daire büyüklüğü, m²' })
        fireEvent.change(input, { target: { value: '' } })
        expect(onApartmentSize).toHaveBeenCalledWith(null)
    })
```

Dosyanın en üstündeki import satırını da güncelle. Ara:

```ts
import { render, screen } from '@testing-library/react'
```

Yeni:

```ts
import { render, screen, fireEvent } from '@testing-library/react'
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest --no-coverage src/app/hesapla/mobile/GirdiKarti.test.tsx`
Expected: FAIL — düzeltilen test artık `getByRole('spinbutton', ...)` bulamıyor (henüz `<input>` yok, hâlâ `<span>`), yeni 2 test de aynı sebeple FAIL.

- [ ] **Step 3: Write minimal implementation**

**3a. `GirdiKarti.tsx` — prop tipini genişlet.** Ara (bul ve değiştir):

```tsx
    apartmentSize: number | null;
    onApartmentSize: (v: number) => void;
```

Yeni:

```tsx
    apartmentSize: number | null;
    onApartmentSize: (v: number | null) => void;
```

**3b. `GirdiKarti.tsx` — statik span'i input'a çevir.** Ara (bul ve TAMAMINI değiştir):

```tsx
            {/* ── Daire buyuklugu ── */}
            <div className={styles.girdiSatir}>
                <span className={styles.girdiEtiket}>Daire büyüklüğü</span>
                <div className={styles.stepperSatir}>
                    <span className={`${styles.stepperDeger} mNum`}>
                        {apartmentSize ?? '—'}
                        <span className={styles.stepperBirim}> m²</span>
                    </span>
                    <button
```

Yeni:

```tsx
            {/* ── Daire buyuklugu ── */}
            <div className={styles.girdiSatir}>
                <span className={styles.girdiEtiket}>Daire büyüklüğü</span>
                <div className={styles.stepperSatir}>
                    <input
                        type="number"
                        inputMode="numeric"
                        className={`${styles.stepperInput} mNum`}
                        value={apartmentSize ?? ''}
                        placeholder="—"
                        aria-label="Daire büyüklüğü, m²"
                        onChange={(e) => onApartmentSize(e.target.value === '' ? null : Number(e.target.value))}
                    />
                    <span className={styles.stepperBirim}>m²</span>
                    <button
```

(Bu değişiklikten sonra `stepperSatir` div'inin kapanışına kadarki `−`/`+` butonları AYNEN kalır — dokunulmuyor.)

**3c. `mobile.module.css` — `.stepperInput` ekle, `.stepperSatir`'e kenarlık kontrastı ekle.** Ara (bul ve TAMAMINI değiştir):

```css
    /* ── Metrekare stepper ── */
    .stepperSatir {
        display: flex;
        align-items: center;
        height: 44px;
        padding: 3px;
        border-radius: 16px;
        background: var(--m-fill);
    }
```

Yeni:

```css
    /* ── Metrekare stepper ── */
    .stepperSatir {
        display: flex;
        align-items: center;
        height: 44px;
        padding: 3px;
        border-radius: 16px;
        background: rgba(11, 32, 54, .055);
        border: 1px solid rgba(11, 32, 54, .07);
    }
```

Sonra, aynı dosyada `.stepperDeger` bloğunu bul (bu blok değişmiyor, yalnızca hemen sonrasına `.stepperInput` eklenecek). Ara:

```css
    .stepperDeger {
        flex: 1;
        padding-left: 13px;
        font-size: 19px;
        font-weight: 800;
        color: var(--m-ink);
    }

    .stepperBirim {
```

Yeni:

```css
    .stepperDeger {
        flex: 1;
        padding-left: 13px;
        font-size: 19px;
        font-weight: 800;
        color: var(--m-ink);
    }

    /* `.stepperDeger`in gorsel ikizi ama artik odaklanip yazilabilir bir
       input — 16px font-size iOS Safari'nin odakta sayfayi otomatik
       yakinlastirmasini engellemek icin SART (projenin kendi deseni,
       bkz. `.konumAramaGiris`). */
    .stepperInput {
        flex: 1;
        min-width: 0;
        padding-left: 13px;
        font-size: 16px;
        font-weight: 800;
        color: var(--m-ink);
        background: transparent;
        border: none;
        outline: none;
    }
    .stepperInput::-webkit-outer-spin-button,
    .stepperInput::-webkit-inner-spin-button {
        -webkit-appearance: none;
        margin: 0;
    }

    .stepperBirim {
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest --no-coverage src/app/hesapla/mobile/GirdiKarti.test.tsx src/app/hesapla/mobile/mobileStyles.scope.test.ts`
Expected: tüm testler PASS — hem `GirdiKarti.test.tsx`'in tamamı (mevcut ±5 stepper testleri dahil, hiçbiri kırılmadı) hem `mobileStyles.scope.test.ts`'in "TÜM kurallar medya sorgusu içinde" guard'ı (yeni `.stepperInput`/`.stepperSatir` kuralları zaten mevcut tek büyük `@media` bloğunun İÇİNE eklendiği için bu guard otomatik geçer).

- [ ] **Step 5: Commit**

```bash
git add src/app/hesapla/mobile/GirdiKarti.tsx src/app/hesapla/mobile/mobile.module.css src/app/hesapla/mobile/GirdiKarti.test.tsx
git commit -m "feat(hesapla-mobil): Daire Buyuklugu elle girilebilir input'a donusur"
```

---

## Final Doğrulama (tüm task'lar bittikten sonra)

- [ ] **tsc:** `npx tsc --noEmit` — 0 hata.
- [ ] **Tam jest suite:** `npx jest --no-coverage --roots "src"` — tüm suite yeşil (yeni testler dahil, hiçbir mevcut test kırılmamış — özellikle `SmartContextCard.test.tsx`'in 10 testi ve `GirdiKarti.test.tsx`'in ±5 stepper testleri).
- [ ] **Canlı doğrulama (Playwright, mobil viewport 390×844, gerçek mobil UA — `https://www.arsabil.com/hesapla`, giriş GEREKMEZ, sayfa public):**
  1. `Deprem Riski` ve `Arsa Alanı` panellerinin artık aynı kutulu arka planı (kenarlıklı) paylaştığını, `getComputedStyle` ile `background`/`border`'ın eşleştiğini doğrula.
  2. `Arsa Alanı` toggle'ını aç; durum metninin ("Elle girilmesi gerekiyor") artık toggle'ı sıkıştırmadan kendi satırında olduğunu, başlık+toggle satırının kırılmadığını doğrula.
  3. `Daire Büyüklüğü` alanına gerçek bir değer (örn. `95`) elle yazıp değerin yansıdığını, ardından ± butonlarının hâlâ çalıştığını doğrula.
  4. Masaüstü genişlikte (>768px) `SmartContextCard`, `Toggle`, "Ortalama Daire Metrekaresi" alanının BİREBİR ÖNCEKİ GİBİ kaldığını doğrula — bu planın en kritik regresyon riski.
  5. Değişiklik doğrulandıktan sonra `git push origin main` + Coolify redeploy tetikle (bu oturumda kurulan akış: geçici API token üret → `GET /api/v1/deploy?uuid=g1478ljmts8umt4xvf0wyugv` → deploy `finished` olana kadar bekle → yeni commit'in deploy edildiğini doğrula → token'ı sil).
