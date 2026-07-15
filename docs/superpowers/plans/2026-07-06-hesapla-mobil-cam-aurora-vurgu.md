# Hesapla Mobil — Cam Kart Düzeltmesi + Aurora Mavi Vurgu Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hesapla sayfasının mobil görünümünde, light temada koyu-lacivert-üstünde-koyu-lacivert-metin görünmezlik hatasını kart arka planlarını temaya göre ayrıştırarak (light: beyaz buzlu cam, dark: mevcut lacivert korunur) düzeltmek; `--seal-accent`'i pirinç sarısından tek ton açık Aurora mavisine çevirmek; PDF İndir ve Karşılaştır butonlarını dolgulu (reverse) stile geçirmek.

**Architecture:** Mevcut sabit `--seal-ink`/`--seal-ink-2`/`--seal-paper` token'ları, aynı mobil `@media (max-width:768px)` bloğu içinde `[data-theme="dark"] .container` / `[data-theme="light"] .container` alt-bloklarına bölünerek tema-duyarlı `--seal-surface`/`--seal-border`/`--seal-text`/`--seal-text-muted` token çiftlerine dönüştürülür. `--seal-accent` tek, paylaşılan (tema-bağımsız) bir token olarak kalır ama değeri değişir. Kart sınıfları (`.topResultCard`, `.statCard`, `.accordion`) ve buton sınıfları (`sealPrimaryBtn`, `sealOutlineBtn`, `stickyCta`) zaten bu token'ları dolaylı kullandığı için JSX/class isimleri değişmeden otomatik güncellenir; tek JSX değişikliği PDF İndir butonunun class'ının değişmesidir.

**Tech Stack:** Next.js 16 (App Router), CSS Modules, Jest + ts-jest (dosya-metni regex guard testleri, mevcut `pageStyles.scope.test.ts` deseni), Playwright (manuel/mobil smoke).

## Global Constraints

- Yalnızca mobil (`@media (max-width: 768px)`) — masaüstü hiçbir selector'da değişmez.
- `globals.css`'e yeni **global** token eklenmez; mevcut global `--shell-bg`/`--shell-border`/`--card-title`/`--muted`/`--green` token'ları okunur, yeni global token yaratılmaz.
- `AdvancedSettingsSections.tsx` (`.drawerRow`, `.luxBox`, `.stepperInput` içerikleri) değişmez.
- Karşılaştır butonunun masaüstü (`compareBtn`'in media query dışındaki temel kuralı) davranışı değişmez — yeşil outline kalır.
- Spec: `docs/superpowers/specs/2026-07-06-hesapla-mobil-cam-aurora-vurgu-design.md`.

---

## Dosya Yapısı

- **Değiştir:** `src/app/hesapla/page.module.css` — token restructure (satır ~1378-1385), kart yüzeyi override'ları (topResultCard/topResultLabel/topResultValue/topResultBadge ~1387-1407, statCard ailesi ~1572-1589, accordion ailesi ~1591-1598), yeni `button.compareBtn` mobil override (mobil blok sonuna eklenir).
- **Değiştir:** `src/app/hesapla/page.tsx` — PDF İndir butonunun `className` satırı (~320).
- **Değiştir:** `src/app/hesapla/pageStyles.scope.test.ts` — eski sabit-hex/`--seal-paper` varsayımlı testler yeni token şemasına güncellenir, yeni guard testleri eklenir.

---

### Task 1: Token restructure — tema-duyarlı seal token'ları

**Files:**
- Modify: `src/app/hesapla/page.module.css:1370-1385`
- Test: `src/app/hesapla/pageStyles.scope.test.ts` (mevcut `describe('hesapla mobil Mühür Lacivert token kapsamı', ...)` bloğu, satır 10-36)

**Interfaces:**
- Produces (sonraki task'lar bunları tüketecek): `--seal-accent` (`#4C8DFF`, paylaşılan), `--seal-accent-rgb` (`76, 141, 255`, paylaşılan), `--seal-ink` (`#0F2A43`, paylaşılan, değişmez — buton metni için), `--seal-surface`, `--seal-border`, `--seal-border-soft`, `--seal-text`, `--seal-text-muted`, `--seal-text-faint` (hepsi `[data-theme="dark"] .container` ve `[data-theme="light"] .container` içinde ayrı ayrı tanımlı).

- [ ] **Step 1: Mevcut eski testleri yeni beklenen değerlere göre güncelle (RED)**

`src/app/hesapla/pageStyles.scope.test.ts` içindeki `describe('hesapla mobil Mühür Lacivert token kapsamı', ...)` bloğunu (satır 10-36) tamamen şu içerikle değiştir:

```typescript
describe('hesapla mobil cam kart + aurora mavi vurgu token kapsamı', () => {
  it('yeni seal token\'ları globals.css içine hiç sızmamış olmalı', () => {
    expect(globalsCss).not.toMatch(/--seal-(ink|accent|surface|border|text)/);
  });

  it('--seal-accent açık Aurora mavisi olmalı (#4C8DFF), pirinç sarısı olmamalı', () => {
    expect(pageCss).toMatch(/--seal-accent:\s*#4C8DFF/);
    expect(pageCss).not.toMatch(/--seal-accent:\s*#C9A15A/);
  });

  it('--seal-accent-rgb, --seal-accent ile tutarlı olmalı (76, 141, 255)', () => {
    expect(pageCss).toMatch(/--seal-accent-rgb:\s*76,\s*141,\s*255/);
  });

  it('--seal-accent tanımı, mobil @media (max-width: 768px) bloğunun içinde olmalı', () => {
    const lastMobileMediaIndex = pageCss.lastIndexOf('@media (max-width: 768px)');
    const sealAccentIndex = pageCss.indexOf('--seal-accent:');
    expect(lastMobileMediaIndex).toBeGreaterThan(-1);
    expect(sealAccentIndex).toBeGreaterThan(lastMobileMediaIndex);
  });

  it('--seal-surface hem dark hem light tema bloğunda tanımlı olmalı', () => {
    expect(pageCss).toMatch(/\[data-theme="dark"\]\s*\.container\s*\{[^}]*--seal-surface:/);
    expect(pageCss).toMatch(/\[data-theme="light"\]\s*\.container\s*\{[^}]*--seal-surface:/);
  });

  it('light temada --seal-surface, mevcut --shell-bg camsı token\'ını kullanmalı (yeni rgba icat edilmemeli)', () => {
    expect(pageCss).toMatch(/\[data-theme="light"\]\s*\.container\s*\{[^}]*--seal-surface:\s*var\(--shell-bg\)/);
  });

  it('dark temada --seal-surface, eski lacivert gradienti korumalı', () => {
    expect(pageCss).toMatch(/\[data-theme="dark"\]\s*\.container\s*\{[^}]*--seal-surface:\s*linear-gradient\(160deg, #0F2A43 0%, #16324F 100%\)/);
  });

  it('--seal-text hem dark hem light tema bloğunda tanımlı olmalı', () => {
    expect(pageCss).toMatch(/\[data-theme="dark"\]\s*\.container\s*\{[^}]*--seal-text:/);
    expect(pageCss).toMatch(/\[data-theme="light"\]\s*\.container\s*\{[^}]*--seal-text:/);
  });

  it('light temada --seal-text, mevcut --card-title token\'ını kullanmalı', () => {
    expect(pageCss).toMatch(/\[data-theme="light"\]\s*\.container\s*\{[^}]*--seal-text:\s*var\(--card-title\)/);
  });
});
```

- [ ] **Step 2: Testi çalıştır, başarısız olduğunu doğrula**

Run: `npx jest src/app/hesapla/pageStyles.scope.test.ts --no-coverage`
Expected: FAIL — `--seal-accent: #4C8DFF` bulunamıyor, `[data-theme="dark"] .container` / `[data-theme="light"] .container` blokları henüz yok.

- [ ] **Step 3: Token bloğunu yeniden yapılandır (GREEN)**

`src/app/hesapla/page.module.css` satır 1370-1385'i (mevcut `.container` içindeki 6 seal token'ı) şu şekilde değiştir:

```css
@media (max-width: 768px) {
    .container {
        padding: calc(12px + env(safe-area-inset-top, 40px)) 0 calc(var(--bottomnav-height) + 76px) !important;
        border-radius: 0 !important;
        max-width: 100% !important;
        margin: 0 !important;
        min-height: 100dvh !important;

        /* Faz 1.5 revizyonu — Cam Kart + Aurora Mavi Vurgu (bkz. docs/superpowers/specs/2026-07-06-hesapla-mobil-cam-aurora-vurgu-design.md) */
        --seal-ink: #0F2A43;
        --seal-accent: #4C8DFF;
        --seal-accent-rgb: 76, 141, 255;
    }

    [data-theme="dark"] .container {
        --seal-surface: linear-gradient(160deg, #0F2A43 0%, #16324F 100%);
        --seal-border: rgba(76, 141, 255, 0.25);
        --seal-border-soft: rgba(76, 141, 255, 0.18);
        --seal-text: #F4F0E6;
        --seal-text-muted: rgba(244, 240, 230, 0.7);
        --seal-text-faint: rgba(244, 240, 230, 0.55);
    }

    [data-theme="light"] .container {
        --seal-surface: var(--shell-bg);
        --seal-border: var(--shell-border);
        --seal-border-soft: var(--shell-border);
        --seal-text: var(--card-title);
        --seal-text-muted: var(--muted);
        --seal-text-faint: var(--muted);
    }
```

(Bu bloğun kapanış `}`'ı ve hemen ardından gelen `.topResultCard { ... }` kuralı olduğu gibi kalır — Task 2'de değişecek.)

- [ ] **Step 4: Testi çalıştır, geçtiğini doğrula**

Run: `npx jest src/app/hesapla/pageStyles.scope.test.ts --no-coverage`
Expected: PASS (9/9 bu describe bloğunda)

- [ ] **Step 5: Commit**

```bash
git add src/app/hesapla/page.module.css src/app/hesapla/pageStyles.scope.test.ts
git commit -m "refactor(hesapla): seal token'larını tema-duyarlı yap, vurgu rengini aurora mavisine çevir"
```

---

### Task 2: Kart yüzeyi migrasyonu — topResultCard / statCard / accordion

**Files:**
- Modify: `src/app/hesapla/page.module.css:1387-1407` (topResultCard/topResultLabel/topResultValue/topResultBadge)
- Modify: `src/app/hesapla/page.module.css:1572-1598` (statCard/statCard h5/statCardValue/statCardValue span/accordion/accordionSummary — Task 1 sonrası satır numaraları ~7 satır kayabilir, `.statCard {` ve `.accordion {` metnini ara)
- Test: `src/app/hesapla/pageStyles.scope.test.ts` (yeni `describe` bloğu)

**Interfaces:**
- Consumes: Task 1'in ürettiği `--seal-surface`, `--seal-border`, `--seal-border-soft`, `--seal-text`, `--seal-text-muted`, `--seal-text-faint`, `--seal-accent-rgb`.
- Produces: Bu üç kart ailesinin artık `var(--seal-ink)`/`var(--seal-ink-2)` doğrudan referans etmediği garantisi (sonraki task'lar/gelecek bakım için).

- [ ] **Step 1: Yeni guard testini yaz (RED)**

`pageStyles.scope.test.ts` sonuna ekle:

```typescript
describe('kart yüzeyi migrasyonu — seal-ink/seal-ink-2 doğrudan kullanılmamalı', () => {
  it('topResultCard, statCard, accordion artık --seal-surface kullanmalı (eski --seal-ink-2 gradienti değil)', () => {
    expect(pageCss).toMatch(/\.topResultCard\s*\{[^}]*background:\s*var\(--seal-surface\)/);
    expect(pageCss).toMatch(/\.statCard\s*\{[^}]*background:\s*var\(--seal-surface\)/);
    expect(pageCss).toMatch(/\.accordion\s*\{[^}]*background:\s*var\(--seal-surface\)/);
  });

  it('bu üç kart artık backdrop-filter blur uygulamalı (light temada camsı yüzey için gerekli)', () => {
    const cardBlockPattern = /\.topResultCard\s*\{[^}]*backdrop-filter:\s*blur\(24px\)/;
    expect(pageCss).toMatch(cardBlockPattern);
  });

  it('topResultLabel/statCard h5 artık --seal-text-muted kullanmalı', () => {
    expect(pageCss).toMatch(/\.topResultLabel\s*\{[^}]*color:\s*var\(--seal-text-muted\)/);
    expect(pageCss).toMatch(/\.statCard h5\s*\{[^}]*color:\s*var\(--seal-text-muted\)/);
  });
});
```

- [ ] **Step 2: Testi çalıştır, başarısız olduğunu doğrula**

Run: `npx jest src/app/hesapla/pageStyles.scope.test.ts --no-coverage`
Expected: FAIL — mevcut kurallar hâlâ `var(--seal-ink)`/`linear-gradient` kullanıyor.

- [ ] **Step 3: topResultCard ailesini güncelle (GREEN, parça 1)**

`page.module.css` içinde (Task 1 sonrası) `.topResultCard { ... }` bloğundan `.topResultBadge { ... }` bloğuna kadar olan kısmı (eski satır 1387-1407) şu şekilde değiştir:

```css
    .topResultCard {
        background: var(--seal-surface);
        box-shadow: 0 16px 40px rgba(0, 0, 0, 0.35), inset 0 1px 2px rgba(255, 255, 255, 0.08);
        border-color: var(--seal-border);
        backdrop-filter: blur(24px);
        -webkit-backdrop-filter: blur(24px);
    }

    .topResultLabel {
        color: var(--seal-text-muted);
    }

    .topResultValue {
        font-family: 'JetBrains Mono', 'IBM Plex Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
        font-variant-numeric: tabular-nums;
        color: var(--seal-text);
    }

    .topResultBadge {
        background: rgba(var(--seal-accent-rgb), 0.16);
        border-color: rgba(var(--seal-accent-rgb), 0.4);
        color: var(--seal-text);
    }
```

(`.topResultBadgePricier` kuralı değişmeden kalır — `--red-rgb` kullanıyor, bu spec'in kapsamı dışında.)

- [ ] **Step 4: statCard ve accordion ailelerini güncelle (GREEN, parça 2)**

`.statCard { ... }` bloğundan `.accordionSummary { ... }` bloğuna kadar olan kısmı (eski satır 1572-1598, aralarında `.container * { overflow-wrap: break-word; }` kuralı var — o kural dokunulmadan kalır) şu şekilde değiştir:

```css
    .statCard {
        background: var(--seal-surface);
        border-color: var(--seal-border-soft);
        backdrop-filter: blur(24px);
        -webkit-backdrop-filter: blur(24px);
    }

    .statCard h5 {
        color: var(--seal-text-muted);
    }

    .statCardValue {
        font-family: 'JetBrains Mono', 'IBM Plex Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
        font-variant-numeric: tabular-nums;
        color: var(--seal-text);
    }

    .statCardValue span {
        color: var(--seal-text-faint);
    }

    .accordion {
        background: var(--seal-surface);
        border-color: var(--seal-border-soft);
        backdrop-filter: blur(24px);
        -webkit-backdrop-filter: blur(24px);
    }

    .accordionSummary {
        color: var(--seal-text);
    }
```

- [ ] **Step 5: Testi çalıştır, geçtiğini doğrula**

Run: `npx jest src/app/hesapla/pageStyles.scope.test.ts --no-coverage`
Expected: PASS (yeni describe bloğundaki 3 test de dahil)

- [ ] **Step 6: Tam jest paketini çalıştır (regresyon kontrolü)**

Run: `npx jest --no-coverage`
Expected: PASS, 125/125 (Task 1 öncesi taban + Task 1/2'de eklenen yeni testler)

- [ ] **Step 7: Commit**

```bash
git add src/app/hesapla/page.module.css src/app/hesapla/pageStyles.scope.test.ts
git commit -m "fix(hesapla): topResultCard/statCard/accordion light temada beyaz cam yüzeye geçti"
```

---

### Task 3: Buton reverse — PDF İndir + Karşılaştır

**Files:**
- Modify: `src/app/hesapla/page.tsx:320` (PDF İndir butonunun className'i)
- Modify: `src/app/hesapla/page.module.css` (mobil `@media` bloğunun sonuna yeni `button.compareBtn` override eklenir — `button.sealOutlineBtn:hover` kuralından hemen sonra eklenebilir)
- Test: `src/app/hesapla/pageStyles.scope.test.ts` (yeni `describe` bloğu)

**Interfaces:**
- Consumes: Task 1'in ürettiği `--seal-accent` (PDF için, `sealPrimaryBtn` üzerinden dolaylı), global `--green`/`--green-rgb` (`src/app/globals.css`, zaten mevcut, değişmiyor).
- Produces: Yok (bu son kullanıcı-görünür deliverable, başka task tüketmiyor).

- [ ] **Step 1: Guard testini yaz (RED)**

`pageStyles.scope.test.ts` sonuna ekle:

```typescript
describe('buton reverse — PDF İndir ve Karşılaştır dolgulu stile geçmeli', () => {
  it('PDF İndir artık sealPrimaryBtn (dolgulu) class\'ını kullanmalı, sealOutlineBtn değil', () => {
    const pageTsx = fs.readFileSync(
      path.join(__dirname, 'page.tsx'),
      'utf8'
    );
    expect(pageTsx).toMatch(/handlePdfDownload[^>]*className=\{styles\.sealPrimaryBtn\}/);
  });

  it('button.compareBtn mobilde dolgulu yeşil override almalı, override mobil media query içinde olmalı', () => {
    const lastMobileMediaIndex = pageCss.lastIndexOf('@media (max-width: 768px)');
    const matches = [...pageCss.matchAll(/button\.compareBtn\s*\{[^}]*background:\s*var\(--green\)/g)];
    expect(matches.length).toBe(1);
    expect(matches[0].index).toBeGreaterThan(lastMobileMediaIndex);
  });

  it('masaüstü (media query dışı) button.compareBtn hâlâ outline (transparan/açık arka plan) olmalı', () => {
    const outsideMobileCss = pageCss.slice(0, pageCss.lastIndexOf('@media (max-width: 768px)'));
    expect(outsideMobileCss).toMatch(/button\.compareBtn\s*\{[^}]*background:\s*rgba\(var\(--green-rgb\), 0\.08\)/);
  });
});
```

- [ ] **Step 2: Testi çalıştır, başarısız olduğunu doğrula**

Run: `npx jest src/app/hesapla/pageStyles.scope.test.ts --no-coverage`
Expected: FAIL — PDF hâlâ `sealOutlineBtn`, mobil `button.compareBtn` override'ı yok.

- [ ] **Step 3: PDF İndir butonunu sealPrimaryBtn'e geçir**

`src/app/hesapla/page.tsx:320` civarındaki satırı bul:

```tsx
        <Button variant="outline" onClick={handlePdfDownload} disabled={!result} className={styles.sealOutlineBtn}>
```

şu şekilde değiştir:

```tsx
        <Button variant="outline" onClick={handlePdfDownload} disabled={!result} className={styles.sealPrimaryBtn}>
```

(`variant="outline"` aynen kalır — bu prop yalnızca masaüstü/temel `Button` görünümünü kontrol eder, mobil override zaten `sealPrimaryBtn` class'ı üzerinden gelir.)

- [ ] **Step 4: Karşılaştır butonu için mobil override CSS'ini ekle**

`page.module.css` içinde `button.sealOutlineBtn:hover:not(:disabled) { ... }` kuralından hemen sonra (mobil `@media` bloğu içinde, `button.sealPrimaryBtn`/`button.sealOutlineBtn` ile aynı bölüm) ekle:

```css
    button.compareBtn {
        background: var(--green);
        color: white;
        border-color: var(--green);
    }

    button.compareBtn:hover:not(:disabled) {
        filter: brightness(1.05);
    }
```

- [ ] **Step 5: Testi çalıştır, geçtiğini doğrula**

Run: `npx jest src/app/hesapla/pageStyles.scope.test.ts --no-coverage`
Expected: PASS

- [ ] **Step 6: Tam jest paketini çalıştır**

Run: `npx jest --no-coverage`
Expected: PASS, tüm testler yeşil (yeni test sayısı taban + Task 1/2/3 eklemeleri)

- [ ] **Step 7: Commit**

```bash
git add src/app/hesapla/page.tsx src/app/hesapla/page.module.css src/app/hesapla/pageStyles.scope.test.ts
git commit -m "feat(hesapla): PDF İndir ve Karşılaştır butonları mobilde dolgulu (reverse) stile geçti"
```

---

### Task 4: Final doğrulama

**Files:** Yok (yalnızca komut çalıştırma + görsel kontrol)

**Interfaces:** Yok — bu task önceki 3 task'ın bütünsel doğrulamasıdır.

- [ ] **Step 1: Tip kontrolü**

Run: `npx tsc --noEmit`
Expected: 0 hata

- [ ] **Step 2: Lint**

Run: `npm run lint`
Expected: 0 ihlal

- [ ] **Step 3: Tam jest paketi**

Run: `npx jest --no-coverage`
Expected: Tüm testler PASS

- [ ] **Step 4: Dev server'ı başlat (zaten çalışmıyorsa)**

Run: `npm run dev:db` (Postgres, Docker Desktop açık olmalı) ve `npm run dev:next` (arka planda)
Expected: `http://localhost:3000` ayakta, `✓ Ready`

- [ ] **Step 5: Manuel/Playwright görsel kontrol — light tema**

`http://localhost:3000/hesapla` sayfasını 390×844 mobil viewport'ta, light temada aç. Sırayla:
- "Sonuçları Göster" butonuna bas, üst sonuç kartının (topResultCard) artık beyaz buzlu cam üzerinde koyu lacivert metinle okunaklı olduğunu doğrula.
- "Formül Parametreleri", "Proje Maliyet ve Riskleri" accordion'larını aç, içindeki tüm etiket/değerlerin (özellikle "Risk Payı") artık görünür olduğunu doğrula (bu, orijinal hatanın giderildiğinin kanıtı).
- 4 aksiyon butonunu incele: PDF İndir mavi dolgulu, Rapor Kaydet mavi dolgulu, Karşılaştır yeşil dolgulu olmalı.

- [ ] **Step 6: Manuel/Playwright görsel kontrol — dark tema**

Aynı adımları dark temada tekrarla. Kartların hâlâ koyu lacivert (önceki görünümle aynı/çok yakın) olduğunu, sadece vurgu renginin pirinçten maviye döndüğünü doğrula. Yatay taşma (horizontal overflow) olmadığını kontrol et.

- [ ] **Step 7: Masaüstü regresyon kontrolü**

`http://localhost:3000/hesapla` sayfasını masaüstü genişlikte (>768px) aç, Karşılaştır butonunun hâlâ yeşil outline (dolgulu değil) olduğunu, kartların hiç değişmediğini doğrula.

- [ ] **Step 8: Spec dosyasını "Tamamlandı" olarak işaretle**

`docs/superpowers/specs/2026-07-06-hesapla-mobil-cam-aurora-vurgu-design.md` başına Mühür Lacivert spec'indeki gibi bir "## Durum — Tamamlandı" notu ekle (commit aralığı + final review özeti ile).

- [ ] **Step 9: Commit**

```bash
git add docs/superpowers/specs/2026-07-06-hesapla-mobil-cam-aurora-vurgu-design.md
git commit -m "docs(hesapla): cam kart + aurora mavi vurgu speci tamamlandı olarak işaretle"
```
