# Faz 2.5 — Akış Sayfalarına Mühür Kimliği Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** wizard (`listings/new` + `listings/[id]/edit`), `inbox`, `login` ve `register` sayfalarına, diğer 6 sayfada uygulanmış mühür/cam görsel kimliğini yalnızca mobil kırılımda kazandırmak.

**Architecture:** Her sayfa kendi `--seal-*` token setini kendi `@media (max-width: 768px)` bloğunda, sayfa kökü sınıfında ve iki tema dalında tanımlar; `globals.css` dokunulmaz. Paylaşılan `Card`/`Input`/`Button` bileşenlerinin dosyalarına dokunulmaz, sayfa-local bileşik seçicilerle (`div.sealCard`, `input.sealInput`, `button.sealSubmit`) override edilir. Wizard'da token tanımı tek noktadadır (`WizardShell.module.css`), diğer iki modül değerleri DOM mirasıyla okur.

**Tech Stack:** Next.js 16 · React 19 · CSS Modules · framer-motion (kurulu) · Jest (CSS-metin guard testleri) · Playwright (görsel doğrulama)

**Spec:** `docs/superpowers/specs/2026-07-26-faz2-5-akis-sayfalari-muhur-kimlik-design.md`

## Global Constraints

- **Yalnızca mobil.** Her yeni **görsel/token** kuralı `@media (max-width: 768px)` bloğunun İÇİNDE olacak. Masaüstünün rengi, yüzeyi ve kenarlığı değişmeyecek.
  - **Tek istisna — Task 6'nın damga animasyonu** (spec §5, kullanıcı onaylı): animasyon bir token/renk değişimi değildir ve masaüstünde de oynar. Bu, yukarıdaki kuralın ihlali DEĞİLDİR; Task 6 dışındaki hiçbir task bu istisnayı kullanamaz.
- **Kanonik aksan:** `--seal-accent: var(--aurora-cyan)` ve `--seal-accent-rgb: 43, 124, 255`. Literal hex yazılmayacak (`#4C8DFF` YANLIŞ değerdir).
- **Light dalında yeni rgba icat edilmeyecek:** `--seal-surface: var(--shell-bg)`, `--seal-border: var(--shell-border)`, `--seal-text: var(--card-title)`.
- **`globals.css` değiştirilmeyecek.** Her task'ta sızma guard'ı var.
- **Paylaşılan bileşen dosyaları değiştirilmeyecek:** `src/components/ui/{Card,Input,Button}.tsx` ve `.module.css`'leri.
- **Specificity:** tema override'ı `[data-theme="…"] .x` = (0,2,0), düz `.x` = (0,1,0). Durum sınıfları için bileşik seçici kullan (`.convItem.convItemActive`). Kuralı sona koymaya güvenme.
- **Kullanılmayan token tanımlama.** Sayfa neyi tüketiyorsa yalnızca onu tanımla (önceki fazın Minor bulgusu buydu).
- **Seçici formu:** bu dosyaların hepsi `[data-theme="dark"] .x` formunu kullanıyor (`:global(...)` sarmalayıcısı YOK). Bu form korunacak.
- Test komutu: `npx jest --no-coverage --roots "<rootDir>/src"` (ana checkout'ta düz `npx jest` worktree kopyalarını da toplar ve sahte hata verir).

## Dosya Yapısı

| Dosya | Sorumluluk | Task |
|---|---|---|
| `src/app/login/login.module.css` | login token seti + panel/form/input/submit kimliği | 1 |
| `src/app/login/login.scope.test.ts` | login guard'ları (mevcut dosyaya ekleme) | 1 |
| `src/app/register/register.module.css` | register token seti + Card/Input/Button scoped override | 2 |
| `src/app/register/page.tsx` | override sınıflarını `className` ile geçirme | 2 |
| `src/app/register/register.scope.test.ts` | register guard'ları (mevcut dosyaya ekleme) | 2 |
| `src/components/listing-wizard/WizardShell.module.css` | **tek token tanım noktası** + card + sticky butonlar | 3 |
| `src/components/listing-wizard/WizardProgress.module.css` | adım göstergesi aksan (token tanımlamaz) | 3 |
| `src/components/listing-wizard/WizardShell.scope.test.ts` | wizard guard'ları (mevcut dosyaya ekleme) | 3 |
| `src/app/inbox/inbox.module.css` | inbox token seti + kabuk yüzeyleri + `.bubbleMine` | 4, 5 |
| `src/app/inbox/inbox.scope.test.ts` | **yeni** inbox guard dosyası | 4, 5 |
| `src/components/listing-wizard/WizardProgress.tsx` | adım tamamlama mührü (imza öge) — `'use client'` + motion | 6 |
| `src/components/listing-wizard/WizardProgress.test.tsx` | mühür durum makinesi testleri (mevcut dosyaya ekleme) | 6 |

---

### Task 1: login — token temeli + panel/form/input/submit kimliği

**Files:**
- Modify: `src/app/login/login.module.css` (mobil blok dosyanın sonunda, `@media (max-width: 768px)`)
- Test: `src/app/login/login.scope.test.ts` (mevcut dosyanın sonuna yeni `describe`)

**Interfaces:**
- Produces: bu dosyada tanımlanan `--seal-*` token isimleri, sonraki task'ların birebir aynısını kullanacağı sözleşmedir: `--seal-accent`, `--seal-accent-rgb`, `--seal-surface`, `--seal-border`, `--seal-text`.
  (`--seal-border-soft` Task 1 review'unda DUSURULDU: hicbir sayfa tuketmiyordu ve planin "kullanilmayan token tanimlama" kisitini ihlal ediyordu — insan partner kararı, 2026-07-26.)
- Consumes: yok (ilk task).

**Mevcut mobil blok (dosyanın sonu, dokunmadan önce birebir bu):**

```css
@media (max-width: 768px) {
    .panel {
        grid-template-columns: 1fr;
        max-width: 500px;
    }

    .brandSide {
        padding: 2.5rem;
    }

    .formSide {
        padding: 2.5rem 2rem;
    }

    .input {
        height: var(--input-height-mobile);
        font-size: 16px; /* iOS zoom tetiklenmesin */
        box-sizing: border-box;
    }

    .submitBtn {
        min-height: var(--touch-target);
    }
}
```

- [ ] **Step 1: Failing test'i yaz**

`src/app/login/login.scope.test.ts` dosyasının SONUNA ekle (mevcut `describe` bloklarına dokunma):

```ts
describe('login mobil mühür kimliği (Faz 2.5)', () => {
  const globalsCss = fs.readFileSync(path.join(__dirname, '../globals.css'), 'utf8');

  it('seal token\'ları globals.css içine sızmamış olmalı', () => {
    expect(globalsCss).not.toMatch(/--seal-(accent|surface|border|text)/);
  });

  it('--seal-accent kanonik Aurora cyan olmalı (literal hex değil)', () => {
    expect(css).toMatch(/--seal-accent:\s*var\(--aurora-cyan\)/);
    expect(css).toMatch(/--seal-accent-rgb:\s*43,\s*124,\s*255/);
    expect(css).not.toMatch(/#4C8DFF/i);
  });

  it('token tanımları mobil media query İÇİNDE olmalı', () => {
    const mediaIndex = css.indexOf('@media (max-width: 768px)');
    expect(mediaIndex).toBeGreaterThan(-1);
    expect(css.indexOf('--seal-surface:')).toBeGreaterThan(mediaIndex);
  });

  it('--seal-surface hem dark hem light tema dalında tanımlı olmalı', () => {
    expect(css).toMatch(/\[data-theme="dark"\]\s*\.panel\s*\{[^}]*--seal-surface:/);
    expect(css).toMatch(/\[data-theme="light"\]\s*\.panel\s*\{[^}]*--seal-surface:/);
  });

  it('light dalı mevcut global cam token\'larını yeniden kullanmalı', () => {
    expect(css).toMatch(/\[data-theme="light"\]\s*\.panel\s*\{[^}]*--seal-surface:\s*var\(--shell-bg\)/);
  });

  it('.formSide ve .input mobilde seal yüzeyine geçmeli', () => {
    const mobile = css.slice(css.indexOf('@media (max-width: 768px)'));
    expect(mobile).toMatch(/\.formSide\s*\{[^}]*background:\s*var\(--seal-surface\)/);
    expect(mobile).toMatch(/\.input\s*\{[^}]*border:\s*1px solid var\(--seal-border\)/);
  });

  it('.submitBtn mobilde seal aksanına geçmeli', () => {
    const mobile = css.slice(css.indexOf('@media (max-width: 768px)'));
    expect(mobile).toMatch(/\.submitBtn\s*\{[^}]*background:\s*var\(--seal-accent\)/);
  });

  it('.input mobilde iOS zoom korumasını KORUMALI (regresyon)', () => {
    const mobile = css.slice(css.indexOf('@media (max-width: 768px)'));
    expect(mobile).toMatch(/\.input\s*\{[^}]*font-size:\s*16px/);
    expect(mobile).toMatch(/\.input\s*\{[^}]*height:\s*var\(--input-height-mobile\)/);
  });

  it('.brandSide kimliğe girmemeli (kendi marka yüzeyi korunuyor)', () => {
    const mobile = css.slice(css.indexOf('@media (max-width: 768px)'));
    expect(mobile).not.toMatch(/\.brandSide\s*\{[^}]*--seal|\.brandSide\s*\{[^}]*seal-surface/);
  });

  it('masaüstü dalı değişmemeli: .panel masaüstünde hâlâ 2 kolon', () => {
    const desktop = css.slice(0, css.indexOf('@media (max-width: 768px)'));
    expect(desktop).toMatch(/\.panel\s*\{[^}]*grid-template-columns:\s*[^;]*1fr[^;]*1fr/);
  });
});
```

> Doğrulandı (2026-07-26): `login.scope.test.ts:1-5` zaten `fs`, `path`, `const css` (login.module.css) ve `const tsx` (page.tsx) tanımlıyor. Bunları yeniden import/tanımlama; yukarıdaki testte `css` ve `globalsCss` kullanılıyor, `globalsCss` yeni eklenecek tek satırdır.

- [ ] **Step 2: Test'i çalıştır, başarısız olduğunu gör**

Run: `npx jest --no-coverage --roots "<rootDir>/src" -t "login mobil mühür"`
Expected: FAIL — `--seal-accent` bulunamadı.

- [ ] **Step 3: Mobil bloğu yaz**

`login.module.css`'in sonundaki mobil bloğu, mevcut kuralları KORUYARAK şununla değiştir:

```css
@media (max-width: 768px) {
    [data-theme="dark"] .panel {
        --seal-accent: var(--aurora-cyan);
        --seal-accent-rgb: 43, 124, 255;
        --seal-surface: linear-gradient(160deg, #0F2A43 0%, #16324F 100%);
        --seal-border: rgba(43, 124, 255, 0.25);
        --seal-text: #F4F0E6;
    }

    [data-theme="light"] .panel {
        --seal-accent: var(--aurora-cyan);
        --seal-accent-rgb: 43, 124, 255;
        --seal-surface: var(--shell-bg);
        --seal-border: var(--shell-border);
        --seal-text: var(--card-title);
    }

    .panel {
        grid-template-columns: 1fr;
        max-width: 500px;
        border: 1px solid var(--seal-border);
        border-radius: 24px;
        overflow: hidden;
    }

    .brandSide {
        padding: 2.5rem;
    }

    .formSide {
        padding: 2.5rem 2rem;
        background: var(--seal-surface);
        color: var(--seal-text);
        backdrop-filter: blur(24px);
        -webkit-backdrop-filter: blur(24px);
    }

    .input {
        height: var(--input-height-mobile);
        font-size: 16px; /* iOS zoom tetiklenmesin */
        box-sizing: border-box;
        background: transparent;
        border: 1px solid var(--seal-border);
        color: var(--seal-text);
    }

    .input:focus {
        border-color: var(--seal-accent);
        box-shadow: 0 0 0 3px rgba(var(--seal-accent-rgb), 0.18);
    }

    .submitBtn {
        min-height: var(--touch-target);
        background: var(--seal-accent);
        border: none;
        color: #fff;
    }

    .forgotLink {
        color: var(--seal-accent);
    }
}
```

- [ ] **Step 4: Test'i çalıştır, geçtiğini gör**

Run: `npx jest --no-coverage --roots "<rootDir>/src" -t "login mobil mühür"`
Expected: PASS. Ardından tam suite: `npx jest --no-coverage --roots "<rootDir>/src"` — mevcut login testleri de yeşil kalmalı.

- [ ] **Step 5: Canlı doğrulama**

Dev sunucusu ayakta değilse `npm run dev:next`. Playwright ile `http://localhost:3000/login` adresini 390×844'te, hem `arsabil-theme=light` hem `dark` localStorage değeriyle aç; ekran görüntüsü al VE `getComputedStyle(document.querySelector('[class*="formSide"]')).backgroundImage` değerinin boş olmadığını doğrula. Ekran görüntüsü tek başına kanıt değildir. 1440px'te de aç ve masaüstünün iki kolonlu kaldığını doğrula.

- [ ] **Step 6: Commit**

```bash
git add src/app/login/login.module.css src/app/login/login.scope.test.ts
git commit -m "feat(login): mobil muhur kimligi — panel/form cam yuzeyi, seal aksan input ve submit"
```

---

### Task 2: register — Card/Input/Button scoped override

**Files:**
- Modify: `src/app/register/register.module.css`
- Modify: `src/app/register/page.tsx` (yalnızca `className` geçişleri)
- Test: `src/app/register/register.scope.test.ts` (mevcut dosyanın sonuna)

**Interfaces:**
- Consumes: Task 1'in token isimleri (birebir aynı isimler, bu sayfada yeniden tanımlanır — sayfa-local kural).
- Produces: `sealCard`, `sealInput`, `sealSubmit` sınıf adları (yalnızca bu sayfa içinde).

**Kritik bağlam:** `Card`, `Input` ve `Button` `className`'i KENDİ sınıflarından sonra ekliyor:

```tsx
<div className={`${styles.card} ${styles[variant]} ${className}`}>   // Card.tsx:12
<div className={`${styles.wrapper} ${className}`}>                   // Input.tsx:20
const btnClass = `${styles.button} ${styles[variant]} ... ${className}`; // Button.tsx:16
```

Attribute'taki sıra kazandırmaz; iki tek-sınıf seçici (0,1,0) eşit specificity'dedir ve **stylesheet sırası** karar verir. Bu yüzden override'lar element+class bileşik seçiciyle yazılacak. Ayrıca `Input` `className`'i **dış wrapper div'e** koyuyor, gerçek `<input>` elemanına değil — bu yüzden `.sealInput input` inişi gerekir.

- [ ] **Step 1: Failing test'i yaz**

`register.scope.test.ts` sonuna:

```ts
describe('register mobil mühür kimliği (Faz 2.5)', () => {
  it('--seal-accent kanonik Aurora cyan olmalı', () => {
    expect(css).toMatch(/--seal-accent:\s*var\(--aurora-cyan\)/);
    expect(css).not.toMatch(/#4C8DFF/i);
  });

  it('token tanımları mobil media query İÇİNDE olmalı', () => {
    const mediaIndex = css.indexOf('@media (max-width: 768px)');
    expect(css.indexOf('--seal-surface:')).toBeGreaterThan(mediaIndex);
  });

  it('Card override\'ı bileşik seçici olmalı (sıra bağımlılığı tuzağı)', () => {
    expect(css).toMatch(/div\.sealCard\s*\{/);
  });

  it('Input override\'ı bileşik seçici + input inişi kullanmalı', () => {
    expect(css).toMatch(/\.sealInput\s+input\s*\{/);
  });

  it('Button override\'ı bileşik seçici olmalı', () => {
    expect(css).toMatch(/button\.sealSubmit\s*\{/);
  });

  it('page.tsx override sınıflarını gerçekten geçiriyor olmalı', () => {
    expect(tsx).toMatch(/styles\.sealCard/);
    expect(tsx).toMatch(/styles\.sealInput/);
    expect(tsx).toMatch(/styles\.sealSubmit/);
  });

  it('paylaşılan bileşenler hâlâ import ediliyor olmalı (dosyalarına dokunulmadı)', () => {
    expect(tsx).toMatch(/from "@\/components\/ui\/Card"/);
    expect(tsx).toMatch(/from "@\/components\/ui\/Input"/);
    expect(tsx).toMatch(/from "@\/components\/ui\/Button"/);
  });

  it('.errorBanner semantik kırmızısı korunmalı', () => {
    expect(css).toMatch(/\.errorBanner\s*\{[^}]*color:\s*var\(--red\)/);
  });
});
```

> Doğrulandı (2026-07-26): `register.scope.test.ts:1-5` zaten `fs`, `path`, `const css` (register.module.css) ve `const tsx` (page.tsx) tanımlıyor. Yeniden tanımlama.

- [ ] **Step 2: Test'i çalıştır, başarısız olduğunu gör**

Run: `npx jest --no-coverage --roots "<rootDir>/src" -t "register mobil mühür"`
Expected: FAIL.

- [ ] **Step 3: CSS'i yaz**

`register.module.css`'in sonundaki mobil bloğu şununla değiştir:

```css
@media (max-width: 768px) {
    [data-theme="dark"] .page {
        --seal-accent: var(--aurora-cyan);
        --seal-accent-rgb: 43, 124, 255;
        --seal-surface: linear-gradient(160deg, #0F2A43 0%, #16324F 100%);
        --seal-border: rgba(43, 124, 255, 0.25);
        --seal-text: #F4F0E6;
    }

    [data-theme="light"] .page {
        --seal-accent: var(--aurora-cyan);
        --seal-accent-rgb: 43, 124, 255;
        --seal-surface: var(--shell-bg);
        --seal-border: var(--shell-border);
        --seal-text: var(--card-title);
    }

    .page {
        padding: 0 1rem;
    }

    .header {
        margin-bottom: 1.5rem;
    }

    div.sealCard {
        background: var(--seal-surface);
        border: 1px solid var(--seal-border);
        border-radius: 24px;
        color: var(--seal-text);
        backdrop-filter: blur(24px);
        -webkit-backdrop-filter: blur(24px);
    }

    .sealInput input {
        height: var(--input-height-mobile);
        font-size: 16px;
        background: transparent;
        border: 1px solid var(--seal-border);
        color: var(--seal-text);
        box-sizing: border-box;
    }

    .sealInput input:focus {
        border-color: var(--seal-accent);
        box-shadow: 0 0 0 3px rgba(var(--seal-accent-rgb), 0.18);
    }

    button.sealSubmit {
        min-height: var(--touch-target);
        background: var(--seal-accent);
        border: none;
        color: #fff;
    }

    .footerLink {
        color: var(--seal-accent);
    }
}
```

- [ ] **Step 4: JSX'te sınıfları geçir**

`src/app/register/page.tsx`:
- `<Card>` → `<Card className={styles.sealCard}>`
- Üç `<Input ... />` çağrısının her birine `className={styles.sealInput}` ekle.
- `<Button type="submit" variant="primary" fullWidth disabled={loading}>` → aynı props + `className={styles.sealSubmit}`.

Başka hiçbir şeyi değiştirme.

- [ ] **Step 5: Test'i çalıştır, geçtiğini gör**

Run: `npx jest --no-coverage --roots "<rootDir>/src"`
Expected: tüm suite PASS.

- [ ] **Step 6: Canlı doğrulama**

390×844, `/register`, light + dark. `getComputedStyle` ile gerçek `<input>` elemanının `borderColor`'ının `--seal-border`'a çözüldüğünü doğrula (wrapper'ın değil — `Input` className'i wrapper'a koyuyor, bu tam da testin yakaladığı tuzak). 1440px'te masaüstünün değişmediğini doğrula.

- [ ] **Step 7: Commit**

```bash
git add src/app/register/register.module.css src/app/register/page.tsx src/app/register/register.scope.test.ts
git commit -m "feat(register): mobil muhur kimligi — paylasilan Card/Input/Button icin bilesik secici override"
```

---

### Task 3: WizardShell + WizardProgress

**Files:**
- Modify: `src/components/listing-wizard/WizardShell.module.css` (**tek token tanım noktası**)
- Modify: `src/components/listing-wizard/WizardProgress.module.css` (token TANIMLAMAZ, tüketir)
- Test: `src/components/listing-wizard/WizardShell.scope.test.ts` (mevcut dosyanın sonuna)

**Interfaces:**
- Consumes: Task 1'in token isim sözleşmesi.
- Produces: `.container` üzerinde tanımlı `--seal-*` değerleri; `wizard.module.css` ve `WizardProgress.module.css` bunları DOM mirasıyla okur, yeniden tanımlamaz.

**Mevcut mobil blok (birebir):**

```css
@media (max-width: 768px) {
  .container {
    padding: 1rem 1rem calc(var(--bottomnav-height) + 76px);
  }

  .card { padding: 1.25rem; }

  .pageTitle {
    display: none;
  }

  .stepTitle {
    display: none;
  }

  .nav {
    display: none;
  }
}
```

- [ ] **Step 1: Failing test'i yaz**

`WizardShell.scope.test.ts` sonuna:

```ts
describe('wizard mobil mühür kimliği (Faz 2.5)', () => {
  const progressCss = fs.readFileSync(path.join(__dirname, 'WizardProgress.module.css'), 'utf8');
  const wizardCss = fs.readFileSync(path.join(__dirname, 'wizard.module.css'), 'utf8');

  it('token tanımı YALNIZCA WizardShell.module.css\'te olmalı (tek kaynak)', () => {
    expect(css).toMatch(/--seal-surface:/);
    expect(progressCss).not.toMatch(/--seal-[a-z-]*:/);
    expect(wizardCss).not.toMatch(/--seal-[a-z-]*:/);
  });

  it('--seal-accent kanonik Aurora cyan olmalı', () => {
    expect(css).toMatch(/--seal-accent:\s*var\(--aurora-cyan\)/);
    expect(css).not.toMatch(/#4C8DFF/i);
  });

  it('token tanımları mobil media query İÇİNDE olmalı', () => {
    const mediaIndex = css.indexOf('@media (max-width: 768px)');
    expect(css.indexOf('--seal-surface:')).toBeGreaterThan(mediaIndex);
  });

  it('.card mobilde seal cam yüzeyine geçmeli', () => {
    const mobile = css.slice(css.indexOf('@media (max-width: 768px)'));
    expect(mobile).toMatch(/\.card\s*\{[^}]*background:\s*var\(--seal-surface\)/);
  });

  it('.stickyNextBtn seal aksan dolgusu, .stickyBackBtn outline almalı', () => {
    const mobile = css.slice(css.indexOf('@media (max-width: 768px)'));
    expect(mobile).toMatch(/\.stickyNextBtn\s*\{[^}]*background:\s*var\(--seal-accent\)/);
    expect(mobile).toMatch(/\.stickyBackBtn\s*\{[^}]*border:\s*1px solid var\(--seal-border\)/);
  });

  it('WizardProgress aktif/tamamlanmış durumları mobilde seal aksanı tüketmeli', () => {
    const mobile = progressCss.slice(progressCss.indexOf('@media (max-width: 768px)'));
    expect(mobile).toMatch(/\.circleActive\s*\{[^}]*background:\s*var\(--seal-accent\)/);
    expect(mobile).toMatch(/\.circleDone\s*\{[^}]*background:\s*var\(--seal-accent\)/);
    expect(mobile).toMatch(/\.connectorDone\s*\{[^}]*background:\s*var\(--seal-accent\)/);
  });

  it('masaüstü dalları korunmalı: .nav/.pageTitle/.stepTitle mobilde hâlâ gizli', () => {
    const mobile = css.slice(css.indexOf('@media (max-width: 768px)'));
    expect(mobile).toMatch(/\.pageTitle\s*\{[^}]*display:\s*none/);
    expect(mobile).toMatch(/\.stepTitle\s*\{[^}]*display:\s*none/);
    expect(mobile).toMatch(/\.nav\s*\{[^}]*display:\s*none/);
  });

  it('masaüstü .nextBtn hâlâ brand-gradient kullanmalı (değişmedi)', () => {
    const desktop = css.slice(0, css.indexOf('@media (max-width: 768px)'));
    expect(desktop).toMatch(/\.nextBtn\s*\{[^}]*background:\s*var\(--brand-gradient\)/);
  });
});
```

- [ ] **Step 2: Test'i çalıştır, başarısız olduğunu gör**

Run: `npx jest --no-coverage --roots "<rootDir>/src" -t "wizard mobil mühür"`
Expected: FAIL.

- [ ] **Step 3: WizardShell.module.css mobil bloğunu yaz**

```css
@media (max-width: 768px) {
  [data-theme="dark"] .container {
    --seal-accent: var(--aurora-cyan);
    --seal-accent-rgb: 43, 124, 255;
    --seal-surface: linear-gradient(160deg, #0F2A43 0%, #16324F 100%);
    --seal-border: rgba(43, 124, 255, 0.25);
    --seal-text: #F4F0E6;
  }

  [data-theme="light"] .container {
    --seal-accent: var(--aurora-cyan);
    --seal-accent-rgb: 43, 124, 255;
    --seal-surface: var(--shell-bg);
    --seal-border: var(--shell-border);
    --seal-text: var(--card-title);
  }

  .container {
    padding: 1rem 1rem calc(var(--bottomnav-height) + 76px);
  }

  .card {
    padding: 1.25rem;
    background: var(--seal-surface);
    border: 1px solid var(--seal-border);
    border-radius: 24px;
    color: var(--seal-text);
    backdrop-filter: blur(24px);
    -webkit-backdrop-filter: blur(24px);
  }

  .pageTitle {
    display: none;
  }

  .stepTitle {
    display: none;
  }

  .nav {
    display: none;
  }

  .stickyBackBtn {
    background: transparent;
    border: 1px solid var(--seal-border);
    color: var(--seal-text);
  }

  .stickyNextBtn {
    background: var(--seal-accent);
    color: #fff;
  }
}
```

- [ ] **Step 4: WizardProgress.module.css mobil bloğunu genişlet**

Mevcut mobil blok korunarak (kesinlikle token TANIMLAMADAN):

```css
@media (max-width: 768px) {
  .circle {
    width: 22px;
    height: 22px;
    font-size: 0.65rem;
  }

  .label {
    display: none;
  }

  .connector {
    margin-bottom: 0;
  }

  .circleActive {
    background: var(--seal-accent);
    border-color: var(--seal-accent);
  }

  .circleDone {
    background: var(--seal-accent);
    border-color: var(--seal-accent);
  }

  .connectorDone {
    background: var(--seal-accent);
  }

  .connectorActive {
    background: var(--seal-accent);
  }
}
```

- [ ] **Step 5: Test'i çalıştır, geçtiğini gör**

Run: `npx jest --no-coverage --roots "<rootDir>/src"`
Expected: tüm suite PASS (mevcut `WizardShell.test.tsx` ve `WizardProgress.test.tsx` dahil).

- [ ] **Step 6: Canlı doğrulama — İKİ tüketici de**

`/listings/new` VE mevcut bir ilanın `/listings/<id>/edit` sayfası, 390×844, light + dark. Miras zincirini ölçerek doğrula: `getComputedStyle(document.querySelector('[class*="circleActive"]')).backgroundColor` değerinin `rgb(43, 124, 255)` olması, token'ın `WizardShell`'in `.container`'ından `WizardProgress`'e DOM üzerinden indiğini kanıtlar. 1440px'te masaüstü `.nav`'ın hâlâ göründüğünü doğrula.

> `/listings/*` middleware ile auth'a bağlı. Docker kapalıysa: `npm run dev:db` → `npx prisma@5.22.0 migrate deploy` → `/login` üzerinden `manualcheck@local.test` / `Test1234!` ile gir. Hydration bitmeden input doldurma (`waitForTimeout(1500)`), `networkidle` yerine `domcontentloaded` kullan.

- [ ] **Step 7: Commit**

```bash
git add src/components/listing-wizard/WizardShell.module.css src/components/listing-wizard/WizardProgress.module.css src/components/listing-wizard/WizardShell.scope.test.ts
git commit -m "feat(wizard): mobil muhur kimligi — tek token kaynagi WizardShell, progress ve sticky butonlar aksana gecti"
```

---

### Task 4: inbox — kabuk yüzeyleri

**Files:**
- Modify: `src/app/inbox/inbox.module.css`
- Test: `src/app/inbox/inbox.scope.test.ts` (**yeni dosya**)

**Interfaces:**
- Consumes: Task 1 token isim sözleşmesi.
- Produces: inbox `--seal-*` tanımları; Task 5 aynı bloğa `.bubbleMine` ekleyecek.

**Mevcut değerler (dokunmadan önce):** `.sidebar { background: transparent }`, `.chatHeader { background: var(--panel); backdrop-filter: blur(15px) }`, `.inputArea { background: var(--panel) }`, `.inputWrapper { background: var(--panel-2) }`, `.convItemActive { background: rgba(var(--primary-rgb), 0.08) !important }`.

- [ ] **Step 1: Failing test'i yaz — yeni dosya**

`src/app/inbox/inbox.scope.test.ts`:

```ts
import fs from 'fs';
import path from 'path';

const css = fs.readFileSync(path.join(__dirname, 'inbox.module.css'), 'utf8');
const globalsCss = fs.readFileSync(path.join(__dirname, '../globals.css'), 'utf8');
const mobile = () => css.slice(css.indexOf('@media (max-width: 768px)'));

describe('inbox mobil mühür kimliği (Faz 2.5) — kabuk', () => {
  it('seal token\'ları globals.css içine sızmamış olmalı', () => {
    expect(globalsCss).not.toMatch(/--seal-(accent|surface|border|text|recessed)/);
  });

  it('--seal-accent kanonik Aurora cyan olmalı', () => {
    expect(css).toMatch(/--seal-accent:\s*var\(--aurora-cyan\)/);
    expect(css).not.toMatch(/#4C8DFF/i);
  });

  it('token tanımları mobil media query İÇİNDE olmalı', () => {
    const mediaIndex = css.indexOf('@media (max-width: 768px)');
    expect(mediaIndex).toBeGreaterThan(-1);
    expect(css.indexOf('--seal-surface:')).toBeGreaterThan(mediaIndex);
  });

  it('kabuk yüzeyleri seal-surface tüketmeli', () => {
    expect(mobile()).toMatch(/\.sidebar\s*\{[^}]*background:\s*var\(--seal-surface\)/);
    expect(mobile()).toMatch(/\.chatHeader\s*\{[^}]*background:\s*var\(--seal-surface\)/);
    expect(mobile()).toMatch(/\.inputArea\s*\{[^}]*background:\s*var\(--seal-surface\)/);
  });

  it('.inputWrapper bir kademe geri (recessed) tonda olmalı — panelle aynı camda kaybolmasın', () => {
    expect(mobile()).toMatch(/\.inputWrapper\s*\{[^}]*background:\s*var\(--seal-recessed\)/);
  });

  it('.convItemActive bileşik seçici kullanmalı (tema override\'ına karşı specificity)', () => {
    expect(mobile()).toMatch(/\.convItem\.convItemActive\s*\{/);
  });

  it('mevcut !important zinciri büyütülmemeli — yeni kurallarda !important yok', () => {
    const newRules = mobile().match(/\.convItem\.convItemActive\s*\{([^}]*)\}/);
    expect(newRules).not.toBeNull();
    expect(newRules![1]).not.toMatch(/!important/);
  });

  it('.unreadBadge semantik rengi kimliğe alınmamalı', () => {
    expect(mobile()).not.toMatch(/\.unreadBadge\s*\{[^}]*--seal-accent/);
  });
});
```

- [ ] **Step 2: Test'i çalıştır, başarısız olduğunu gör**

Run: `npx jest --no-coverage --roots "<rootDir>/src" inbox.scope`
Expected: FAIL.

- [ ] **Step 3: Token tanımlarını ve kabuk kurallarını mobil bloğun SONUNA ekle**

Mevcut mobil bloktaki hiçbir kuralı silme; bloğun kapanış `}`'inden hemen önceye ekle:

```css
    [data-theme="dark"] .inboxContainer {
        --seal-accent: var(--aurora-cyan);
        --seal-accent-rgb: 43, 124, 255;
        --seal-surface: linear-gradient(160deg, #0F2A43 0%, #16324F 100%);
        --seal-recessed: rgba(255, 255, 255, 0.05);
        --seal-border: rgba(43, 124, 255, 0.25);
        --seal-text: #F4F0E6;
    }

    [data-theme="light"] .inboxContainer {
        --seal-accent: var(--aurora-cyan);
        --seal-accent-rgb: 43, 124, 255;
        --seal-surface: var(--shell-bg);
        --seal-recessed: rgba(31, 111, 235, 0.05);
        --seal-border: var(--shell-border);
        --seal-text: var(--card-title);
    }

    .sidebar {
        background: var(--seal-surface);
        border-right-color: var(--seal-border);
    }

    .sidebarHeader {
        border-bottom-color: var(--seal-border);
    }

    .chatHeader {
        background: var(--seal-surface);
        border-bottom-color: var(--seal-border);
    }

    .inputArea {
        background: var(--seal-surface);
        border-top-color: var(--seal-border);
    }

    .inputWrapper {
        background: var(--seal-recessed);
        border-color: var(--seal-border);
    }

    .inputWrapper:focus-within {
        border-color: var(--seal-accent);
        box-shadow: 0 0 0 3px rgba(var(--seal-accent-rgb), 0.18);
    }

    .convItem.convItemActive {
        background: rgba(var(--seal-accent-rgb), 0.12);
        border-color: rgba(var(--seal-accent-rgb), 0.28);
    }
```

> `.sidebar`'ın mobil bloğundaki mevcut `width: 100% !important` kuralına DOKUNMA — yeni kural farklı property'lere yazıyor, çakışma yok.

- [ ] **Step 4: Test'i çalıştır, geçtiğini gör**

Run: `npx jest --no-coverage --roots "<rootDir>/src"`
Expected: tüm suite PASS.

- [ ] **Step 5: Canlı doğrulama**

`/inbox`, 390×844, light + dark (auth gerekir — Task 3'teki giriş yordamı). Konuşma listesi ve sohbet görünümü arasında geçiş yap; `.convItemActive`'in gerçekten aksan tonuna geçtiğini `getComputedStyle(...).backgroundColor` ile doğrula (`!important` taşıyan eski kuralın kazanmadığını kanıtlar). 1440px'te masaüstünün değişmediğini doğrula.

- [ ] **Step 6: Commit**

```bash
git add src/app/inbox/inbox.module.css src/app/inbox/inbox.scope.test.ts
git commit -m "feat(inbox): mobil muhur kimligi — kenar cubugu, sohbet basligi ve yazma alani cam yuzeye gecti"
```

---

### Task 5: inbox — `.bubbleMine` aksanı + negatif guard'lar

**Files:**
- Modify: `src/app/inbox/inbox.module.css` (Task 4'ün eklediği bloğun sonuna)
- Test: `src/app/inbox/inbox.scope.test.ts` (yeni `describe`)

**Interfaces:**
- Consumes: Task 4'ün `--seal-accent` / `--seal-accent-rgb` tanımları.

**Mevcut değer:** `.bubbleMine { background: var(--brand-gradient); color: #fff; border: none; border-radius: 22px 22px 4px 22px; }`

- [ ] **Step 1: Failing test'i yaz**

`inbox.scope.test.ts` sonuna:

```ts
describe('inbox mobil mühür kimliği (Faz 2.5) — sohbet balonları', () => {
  it('.bubbleMine mobilde seal aksanına geçmeli', () => {
    expect(mobile()).toMatch(/\.bubbleMine\s*\{[^}]*background:\s*var\(--seal-accent\)/);
  });

  it('.bubbleMine masaüstünde brand-gradient olarak KALMALI', () => {
    const desktop = css.slice(0, css.indexOf('@media (max-width: 768px)'));
    expect(desktop).toMatch(/\.bubbleMine\s*\{[^}]*background:\s*var\(--brand-gradient\)/);
  });

  it('.bubbleTheirs kimliğe alınmamalı (okunabilirlik kararı)', () => {
    expect(mobile()).not.toMatch(/\.bubbleTheirs\s*\{[^}]*--seal|\.bubbleTheirs\s*\{[^}]*seal-accent/);
  });

  it('kaydırılan mesaj listesine backdrop-filter eklenmemeli (performans kararı)', () => {
    expect(mobile()).not.toMatch(/\.messagesArea\s*\{[^}]*backdrop-filter/);
    expect(mobile()).not.toMatch(/\.bubble\s*\{[^}]*backdrop-filter/);
    expect(mobile()).not.toMatch(/\.bubbleMine\s*\{[^}]*backdrop-filter/);
  });

  it('.bubbleMine köşe yarıçapı korunmalı (kuyruk yönü değişmesin)', () => {
    const desktop = css.slice(0, css.indexOf('@media (max-width: 768px)'));
    expect(desktop).toMatch(/\.bubbleMine\s*\{[^}]*border-radius:\s*22px 22px 4px 22px/);
  });
});
```

- [ ] **Step 2: Test'i çalıştır, başarısız olduğunu gör**

Run: `npx jest --no-coverage --roots "<rootDir>/src" -t "sohbet balonları"`
Expected: FAIL.

- [ ] **Step 3: Kuralı ekle**

Task 4'ün eklediği kuralların sonuna (hâlâ mobil blok içinde):

```css
    .bubbleMine {
        background: var(--seal-accent);
    }
```

Sadece `background`. `color`, `border`, `border-radius` masaüstü tanımından miras kalır.

- [ ] **Step 4: Test'i çalıştır, geçtiğini gör**

Run: `npx jest --no-coverage --roots "<rootDir>/src"`
Expected: tüm suite PASS.

- [ ] **Step 5: Kontrast ölçümü**

`/inbox` 390px, light + dark: kendi balonundaki beyaz metnin `#2b7cff` üzerindeki kontrast oranını hesapla. Beyaz metin `#2b7cff` zeminde = **3.87:1** (relatif luminans 0.2215). Bu, 0.9rem gövde metni için WCAG AA'nın (4.5:1) ALTINDADIR. Ölçüm bunu doğrularsa `.bubbleMine`'a mobilde koyulaştırılmış bir ton uygula:

```css
    .bubbleMine {
        background: color-mix(in srgb, var(--seal-accent) 82%, #0F2A43);
    }
```

ve testi bu değere göre güncelle (`color-mix` + `var(--seal-accent)` içermeli). Sonucu tekrar ölç, ≥ 4.5:1 olduğunu kanıtla. **Bu adımı ölçmeden atlama** — balon metni sohbetin ana içeriğidir.

- [ ] **Step 6: Commit**

```bash
git add src/app/inbox/inbox.module.css src/app/inbox/inbox.scope.test.ts
git commit -m "feat(inbox): kendi mesaj balonu mobilde seal aksanina gecti, kontrast olculerek dogrulandi"
```

---

### Task 6: Adım Tamamlama Mührü (imza öge)

**Files:**
- Modify: `src/components/listing-wizard/WizardProgress.tsx`
- Test: `src/components/listing-wizard/WizardProgress.test.tsx` (mevcut dosyaya ekleme)

**Interfaces:**
- Consumes: `currentStep: number` (mevcut prop, değişmiyor) ve Task 3'ün `--seal-accent` token'ı.
- Produces: yeni public arayüz yok. Bileşenin dış sözleşmesi (`<WizardProgress currentStep={n} />`) aynen korunur.

**Neden bu tasarım:** ilk spec "İlanı Yayınla başarısında damga" diyordu; `WizardStep5Preview` salt sunum bileşeni (`data`/`publishing`/`onPublish`) ve `listings/new/page.tsx:63-65` başarıda anında `router.push` yapıyor — gösterilecek bir an yok. İmza anı bu yüzden adım tamamlanmasına taşındı (kullanıcı onaylı, 2026-07-26).

**Mevcut kod (birebir, `WizardProgress.tsx:10-35`):** `done`/`active` değerleri `currentStep`'ten türetiliyor; daire `<div className={...}>{done ? '✓' : step}</div>`. Yeni state EKLENMEYECEK.

- [ ] **Step 1: Failing test'i yaz**

`WizardProgress.test.tsx` sonuna ekle (mevcut dört testi değiştirme):

```tsx
describe('WizardProgress — adım tamamlama mührü (Faz 2.5)', () => {
  it('tamamlanan adımın dairesi damga animasyonu için motion değerlerini taşımalı', () => {
    const { container } = render(<WizardProgress currentStep={3} />);
    const circles = container.querySelectorAll('[data-seal-state]');
    expect(circles.length).toBe(5);
    expect(circles[0].getAttribute('data-seal-state')).toBe('done');
    expect(circles[1].getAttribute('data-seal-state')).toBe('done');
    expect(circles[2].getAttribute('data-seal-state')).toBe('active');
    expect(circles[3].getAttribute('data-seal-state')).toBe('idle');
  });

  it('ilk adımda hiçbir daire done durumunda olmamalı', () => {
    const { container } = render(<WizardProgress currentStep={1} />);
    const states = Array.from(container.querySelectorAll('[data-seal-state]'))
      .map((el) => el.getAttribute('data-seal-state'));
    expect(states).not.toContain('done');
    expect(states[0]).toBe('active');
  });
});
```

> `data-seal-state` attribute'u testin animasyonu gözlemleyebilmesi içindir; jsdom gerçek animasyonu çalıştırmaz, gözlenebilir olan durum makinesidir.

- [ ] **Step 2: Test'i çalıştır, başarısız olduğunu gör**

Run: `npx jest --no-coverage --roots "<rootDir>/src" WizardProgress`
Expected: FAIL — `data-seal-state` taşıyan eleman yok (`circles.length` 0).

- [ ] **Step 3: Bileşeni güncelle**

`WizardProgress.tsx`'i şununla değiştir (yalnızca daire kısmı değişiyor; etiket, konektör ve `STEP_LABELS` aynen kalır):

```tsx
'use client'

import React from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import styles from './WizardProgress.module.css'

const STEP_LABELS = ['Konum', 'Detay', 'Fotoğraf', 'Fizibilite', 'Yayınla']

interface Props {
  currentStep: number
}

export function WizardProgress({ currentStep }: Props) {
  const reduceMotion = useReducedMotion()

  return (
    <div className={styles.progress}>
      {STEP_LABELS.map((label, i) => {
        const step = i + 1
        const done = step < currentStep
        const active = step === currentStep
        const sealState = done ? 'done' : active ? 'active' : 'idle'
        return (
          <React.Fragment key={step}>
            <div className={styles.node}>
              <motion.div
                data-seal-state={sealState}
                className={`${styles.circle} ${active ? styles.circleActive : ''} ${done ? styles.circleDone : ''}`}
                animate={sealState}
                variants={{
                  idle: { scale: 1 },
                  active: { scale: 1 },
                  done: reduceMotion ? { scale: 1 } : { scale: [1.35, 0.94, 1] },
                }}
                transition={{ duration: reduceMotion ? 0 : 0.18, ease: 'easeOut' }}
              >
                {done ? '✓' : step}
              </motion.div>
              <span className={`${styles.label} ${active ? styles.labelActive : ''} ${done ? styles.labelDone : ''}`}>
                {label}
              </span>
            </div>
            {i < STEP_LABELS.length - 1 && (
              <div className={`${styles.connector} ${done ? styles.connectorDone : ''} ${active ? styles.connectorActive : ''}`} />
            )}
          </React.Fragment>
        )
      })}
    </div>
  )
}
```

Kritik noktalar:
- `'use client'` şart — framer-motion istemci bileşeni gerektirir.
- `scale: [1.35, 0.94, 1]` keyframe dizisi, durum `done`'a döndüğünde bir kez oynar; sonraki render'larda durum değişmediği için tekrar oynamaz.
- `reduceMotion` true iken keyframe dizisi yerine sabit `scale: 1` verilir (`duration: 0` ile birlikte).

- [ ] **Step 4: Test'i çalıştır, geçtiğini gör**

Run: `npx jest --no-coverage --roots "<rootDir>/src" WizardProgress`
Expected: PASS — mevcut 4 test + yeni 2 test.

Eğer mevcut testler framer-motion yüzünden patlarsa, test dosyasının başına şu mock'u ekle (repo'da RTL + framer-motion birlikte kullanılan başka bir teste bak, aynı deseni kullan):

```tsx
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, animate, variants, transition, ...props }: any) => <div {...props}>{children}</div>,
  },
  useReducedMotion: () => false,
}));
```

- [ ] **Step 5: Tam suite**

Run: `npx jest --no-coverage --roots "<rootDir>/src"` → PASS. `npx tsc --noEmit` → 0.

- [ ] **Step 6: Canlı doğrulama**

`/listings/new`, 390px: adımlar arasında ileri git; her adım tamamlandığında dairenin bir kez damga gibi oturduğunu ekran kaydı/ardışık ekran görüntüsüyle doğrula. Ardından Playwright'ta `reducedMotion: 'reduce'` context seçeneğiyle tekrar et — animasyon oynamamalı, daireler doğrudan son durumda olmalı. Masaüstünde (1440px) akışın bozulmadığını doğrula.

- [ ] **Step 7: Commit**

```bash
git add src/components/listing-wizard/WizardProgress.tsx src/components/listing-wizard/WizardProgress.test.tsx
git commit -m "feat(wizard): adim tamamlama muhru — daire done'a donerken tek seferlik damga (reduced-motion destekli)"
```

---

### Task 7: Final doğrulama

**Files:** yok (yalnızca doğrulama; bulgu çıkarsa ilgili task'ın dosyası)

- [ ] **Step 1: Tam komut paketi**

```bash
npx tsc --noEmit
npx jest --no-coverage --roots "<rootDir>/src"
npx eslint
npm run build
```

Hepsi temiz olmalı. `eslint`'te bu plandan bağımsız, önceden var olan bulgular varsa raporla ama düzeltme.

- [ ] **Step 2: Playwright — 4 sayfa × 2 tema × 2 kırılım**

`/login`, `/register`, `/listings/new`, `/inbox` sayfalarını 390×844 ve 1440×900'de, `arsabil-theme` localStorage değeri `light` ve `dark` iken aç. Her biri için:
- Ekran görüntüsü al.
- `getComputedStyle` ile en az bir seal yüzeyinin gerçekten çözüldüğünü doğrula.
- 1440px'te sayfanın masaüstü görünümünün değişmediğini doğrula.

- [ ] **Step 3: Yatay taşma kontrolü**

Dört sayfanın her birinde 390px'te `document.documentElement.scrollWidth <= clientWidth` olduğunu doğrula.

- [ ] **Step 4: globals.css sızma kontrolü**

```bash
git diff main --stat -- src/app/globals.css
```

Çıktı boş olmalı. Boş değilse Global Constraints ihlali var, düzelt.

- [ ] **Step 5: Paylaşılan bileşen dokunulmazlığı**

```bash
git diff main --stat -- src/components/ui/
```

Çıktı boş olmalı.

- [ ] **Step 6: Bulguları raporla**

Bulunan her kusuru ilgili task'a geri besle ve düzelt; düzeltme sonrası ilgili guard testini de güçlendir.

---

## Self-Review Notları

- **Spec kapsamı:** §3 token mimarisi → Task 1-4; §4.1 login → Task 1; §4.2 register → Task 2; §4.3 wizard → Task 3; §4.4 inbox → Task 4 (kabuk) + Task 5 (balon); §5 imza öge → Task 6; §7 doğrulama → her task'ın canlı doğrulama adımı + Task 7. §6'daki beş tuzağın hepsi Global Constraints'e veya ilgili task'a taşındı.
- **Spec §5 plan yazımı sırasında revize edildi.** Orijinal "yayınlama başarısında damga" fikri koddan doğrulanınca uygulanamaz çıktı (`WizardStep5Preview` salt sunum bileşeni; `listings/new/page.tsx:63-65` başarıda anında `router.push` yapıyor). Kullanıcı onayıyla imza anı adım tamamlanmasına taşındı; spec dosyası da aynı gün güncellendi, plan ile spec arasında sapma yok.
- **Bilinçli ekleme:** Spec kontrast ölçümünü açıkça istemiyordu; `.bubbleMine`'ın beyaz metni `#2b7cff` üzerinde 3.68:1 verdiği için Task 5 Step 5'e ölçüm + koşullu koyulaştırma adımı eklendi. Bu, bugün anasayfada aynı sınıftan bir ihlalin (`.bentoTag`, 2.6:1) bulunmuş olmasının doğrudan sonucudur.
- **Token seti:** spec §3 sekiz token adı listeliyor; planda sayfa başına yalnızca tüketilenler tanımlanıyor (`--seal-text-faint` ve çoğu sayfada `--seal-recessed` tanımlanmıyor). Bu, önceki fazın "tüketilmeyen token'lar kalıyor" Minor bulgusuna karşı bilinçli bir sıkılaştırmadır.
