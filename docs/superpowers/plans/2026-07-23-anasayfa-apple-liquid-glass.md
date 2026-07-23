# Ana Sayfa Apple Liquid Glass Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ArsaBil ana sayfasının (`src/app/page.tsx` + `src/app/page.module.css`) kicker'ını sadeleştirmek, blueprint/kadastro illüstrasyon aksanını fotoğrafsız cam yüzeylere eklemek, ve tüm cam yüzeyleri bugün düzeltilen nested-glass referans desenine hizalamak.

**Architecture:** Değişiklikler tamamen `src/app/page.module.css` (CSS-only) + `src/app/page.tsx`'te tek bir JSX satırı (heroBadge → kicker). Yeni component/dosya yaratılmaz. Her task kendi bölümünü kapsar, önceki task'ların class adlarına bağımlı değildir (tüm task'lar paralel/bağımsız sırayla uygulanabilir, ama sırayla gitmek review yükünü azaltır).

**Tech Stack:** Next.js 16, React 19, CSS Modules, Jest (scope-guard testleri), Playwright (görsel doğrulama, otomatik jest kapsamı dışı).

## Global Constraints

- Sadece `src/app/page.tsx` ve `src/app/page.module.css` değişir — `globals.css`'e yeni token eklenmez (mevcut `--brand-gradient`/`--aurora-*`/`--primary` yeniden kullanılır).
- Pirinç/Mühür Lacivert paleti (`#C9A15A` vb.) KULLANILMAZ. Marka vurgusu: `rgba(31, 111, 235, *)` / `var(--primary)` / `var(--brand-gradient)`.
- Fotoğraflı yüzeyler (`.cardBgImage`, `.ctaBgImage` kullanan bölümler: bento kartları, süreç kartları, vision kartları, blog kartları, cta) dokunulmaz — blueprint grid dokusu SADECE fotoğrafsız yüzeylere eklenir (stats strip, faq, hero boşlukları). Bu, spec'in "Kapsam Dışı" maddesiyle tutarlı: fotoğraflar korunur.
- Mono/tabular-nums font stack (proje genelinde `hesapla` sayfasında kullanılan, bkz. `src/app/hesapla/page.module.css:1415`): `'JetBrains Mono', 'IBM Plex Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`.
- Nested-glass referans deseni (bugün commit `2f12005`'te 3 yerde uygulandı — `.heroTeaserGlass` light-tema override'ı, `page.module.css:1155-1163`):
  ```css
  background: linear-gradient(165deg, rgba(219, 234, 254, 0.34), rgba(255, 255, 255, 0.24));
  border-color: rgba(31, 111, 235, 0.22);
  box-shadow:
    0 12px 32px rgba(31, 111, 235, 0.08),
    0 0 0 1px rgba(31, 111, 235, 0.16),
    inset 0 1px 0 rgba(255, 255, 255, 0.85);
  ```
  Her cam yüzeyde ebeveyn zincirinde başka bir `backdrop-filter`/yarı-opak-beyaz varsa, toplam opaklık ~%80'i geçmeyecek şekilde kalibre edilir (bugünkü `.mobileDeviceFrame` 0.85→0.55 deseni referans).
- `.howItWorksGrid` mobil kırılım noktası ve 3 nested-glass wash-out'u BUGÜN ZATEN DÜZELTİLDİ (commit `2f12005`) — bu plan bunları tekrar etmez, sadece referans desen olarak kullanır.
- Her task sonunda: `npx tsc --noEmit` (0 hata), `npx jest --no-coverage` (mevcut 325/325 + task'ın kendi yeni testleri), commit.
- Masaüstü (≥1024px) görünüm bu planda kasıtlı olarak değiştirilmiyor DEĞİL — bu, mobil-only bir plan değil, ama var olan grid/layout yapısı korunuyor, sadece renk/doku/tipografi kalibrasyonu yapılıyor. Her task'ın son adımı masaüstünde de (1920px) önce/sonra screenshot karşılaştırması içerir.

---

## Dosya Yapısı

- `src/app/page.tsx` — sadece Task 1'de `heroBadge` div'i `heroKicker` span'ine çevrilir. Başka JSX değişikliği yok.
- `src/app/page.module.css` — tüm görsel değişiklikler burada (var olan selector'lara ekleme/değişiklik, yeni selector eklenmez — `heroKicker` hariç).
- `src/app/pageStyles.scope.test.ts` — **yeni dosya**. Task 1'de oluşturulur, sonraki task'lar kendi `describe` bloklarını buraya ekler (projedeki `pageStyles.scope.test.ts` deseninin aynısı, tek dosyada toplanır çünkü tüm testler aynı `page.module.css`'i okuyor).

---

## Task 1: Hero Kicker Sadeleşmesi

**Files:**
- Modify: `src/app/page.tsx:628` (heroBadge div → heroKicker span)
- Modify: `src/app/page.module.css:51-63` (.heroBadge selector → .heroKicker)
- Create: `src/app/pageStyles.scope.test.ts`

**Interfaces:**
- Produces: `.heroKicker` CSS class (sonraki task'lar bundan bağımsız).

- [ ] **Step 1: Yeni scope-guard test dosyasını oluştur, kicker testini yaz (failing)**

`src/app/pageStyles.scope.test.ts`:

```typescript
import fs from 'fs';
import path from 'path';

const pageCss = fs.readFileSync(path.join(__dirname, 'page.module.css'), 'utf8');
const pageTsx = fs.readFileSync(path.join(__dirname, 'page.tsx'), 'utf8');

describe('anasayfa Apple Liquid Glass — hero kicker', () => {
  it('heroBadge (pill/emoji rozet) class tanımı artık yok', () => {
    expect(pageCss).not.toMatch(/\.heroBadge\s*\{/);
  });

  it('heroKicker sade metin olmalı: arka plan/border yok, sadece renk+tipografi', () => {
    const match = pageCss.match(/\.heroKicker\s*\{([^}]*)\}/);
    expect(match).not.toBeNull();
    const body = match![1];
    expect(body).not.toMatch(/background/);
    expect(body).not.toMatch(/border(?!-)/);
    expect(body).toMatch(/color:\s*rgba\(31,\s*111,\s*235/);
    expect(body).toMatch(/font-weight:\s*600/);
  });

  it('page.tsx artık heroBadge class\'ını kullanmıyor, heroKicker kullanıyor', () => {
    expect(pageTsx).not.toMatch(/styles\.heroBadge/);
    expect(pageTsx).toMatch(/styles\.heroKicker/);
  });

  it('page.tsx hero kicker metninde emoji/pill ikonu yok (sade metin)', () => {
    const kickerLineMatch = pageTsx.match(/styles\.heroKicker[^>]*>([^<]*)</);
    expect(kickerLineMatch).not.toBeNull();
    expect(kickerLineMatch![1]).not.toMatch(/✨/);
  });
});
```

- [ ] **Step 2: Testi çalıştırıp fail ettiğini doğrula**

Run: `npx jest src/app/pageStyles.scope.test.ts --no-coverage`
Expected: FAIL (`.heroBadge` hâlâ var, `.heroKicker` yok, `styles.heroBadge` hâlâ page.tsx'te)

- [ ] **Step 3: page.tsx'te heroBadge'i heroKicker'a çevir**

`src/app/page.tsx:628` — eski:
```tsx
          <div className={styles.heroBadge}>✨ Türkiye&apos;nin İlk Dijital Arsa Fizibilite Platformu</div>
```
yeni:
```tsx
          <span className={styles.heroKicker}>Türkiye&apos;nin İlk Dijital Arsa Fizibilite Platformu</span>
```

- [ ] **Step 4: page.module.css'te .heroBadge'i .heroKicker ile değiştir**

`src/app/page.module.css:51-63` — eski:
```css
.heroBadge {
  display: inline-block;
  padding: 8px 18px;
  background: rgba(31, 111, 235, 0.10);
  border: 1px solid rgba(31, 111, 235, 0.22);
  border-radius: 100px;
  font-size: 0.88rem;
  font-weight: 700;
  color: var(--primary);
  margin-bottom: 2rem;
  backdrop-filter: blur(10px);
  letter-spacing: 0.01em;
}
```
yeni:
```css
.heroKicker {
  display: inline-block;
  font-size: 0.88rem;
  font-weight: 600;
  color: rgba(31, 111, 235, 0.85);
  margin-bottom: 1.5rem;
  letter-spacing: 0.01em;
}
```

- [ ] **Step 5: Testi çalıştırıp geçtiğini doğrula**

Run: `npx jest src/app/pageStyles.scope.test.ts --no-coverage`
Expected: PASS (4/4)

- [ ] **Step 6: tsc + tam jest paketi**

Run: `npx tsc --noEmit`
Expected: 0 hata

Run: `npx jest --no-coverage`
Expected: 326/326 (mevcut 325 + bu task'ın 4 testi... not: dosya yeni olduğu için toplam test suite sayısı da 1 artar)

- [ ] **Step 7: Playwright ile canlı doğrulama (desktop 1920px + mobil 390px, light+dark)**

Dev server çalışıyor olmalı (`npm run dev:next`, :3000). `playwright-skill` ile hero bölümünü screenshot'la, kicker'ın artık pill/emoji olmadan sade bir metin satırı olarak göründüğünü, `heroTitle`'ın üstündeki boşluğun düzgün kaldığını doğrula.

- [ ] **Step 8: Commit**

```bash
git add src/app/page.tsx src/app/page.module.css src/app/pageStyles.scope.test.ts
git commit -m "refactor(landing): heroBadge pill rozeti sade metin kicker'a çevir"
```

---

## Task 2: Stats Strip — Tabular-Nums + Blueprint Doku Aksanı

**Files:**
- Modify: `src/app/page.module.css:134-176` (.statsStrip, .statVal)
- Modify: `src/app/pageStyles.scope.test.ts` (yeni describe bloğu eklenir)

**Interfaces:**
- Consumes: yok (Task 1'den bağımsız).
- Produces: `.statsStrip` arka planında blueprint grid dokusu; `.statVal` mono/tabular-nums.

- [ ] **Step 1: Failing testleri yaz**

`src/app/pageStyles.scope.test.ts`'e ekle:

```typescript
describe('anasayfa Apple Liquid Glass — stats strip', () => {
  it('.statsStrip blueprint grid dokusu içermeli (repeating-linear-gradient, mavi çok düşük alfa)', () => {
    const match = pageCss.match(/\.statsStrip\s*\{([^}]*)\}/);
    expect(match).not.toBeNull();
    expect(match![1]).toMatch(/repeating-linear-gradient/);
    expect(match![1]).toMatch(/rgba\(31,\s*111,\s*235,\s*0\.0[3-8]\)/);
  });

  it('.statVal tabular-nums + mono font kullanmalı', () => {
    const match = pageCss.match(/\.statVal\s*\{([^}]*)\}/);
    expect(match).not.toBeNull();
    expect(match![1]).toMatch(/font-variant-numeric:\s*tabular-nums/);
    expect(match![1]).toMatch(/JetBrains Mono/);
  });
});
```

- [ ] **Step 2: Testi çalıştırıp fail ettiğini doğrula**

Run: `npx jest src/app/pageStyles.scope.test.ts --no-coverage -t "stats strip"`
Expected: FAIL (2/2 fail)

- [ ] **Step 3: .statsStrip'e blueprint grid dokusu ekle**

`src/app/page.module.css:134-144` — eski:
```css
.statsStrip {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1px;
  background: var(--border);
  border: 1px solid var(--border);
  border-radius: 20px;
  overflow: hidden;
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
}
```
yeni:
```css
.statsStrip {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1px;
  background:
    repeating-linear-gradient(0deg, rgba(31, 111, 235, 0.05) 0 1px, transparent 1px 24px),
    repeating-linear-gradient(90deg, rgba(31, 111, 235, 0.05) 0 1px, transparent 1px 24px),
    var(--border);
  border: 1px solid var(--border);
  border-radius: 20px;
  overflow: hidden;
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
}
```

Not: `.statItem`in kendi `background: var(--panel)` (opak) olduğu için grid dokusu sadece 1px'lik `gap` seamlerinde görünür — bu kasıtlı, çok ince bir "blueprint dikiş çizgisi" hissi verir, `.statItem`in içeriğiyle çakışmaz.

- [ ] **Step 4: .statVal'a tabular-nums + mono font ekle**

`src/app/page.module.css:163-169` — eski:
```css
.statVal {
  font-size: 2.4rem;
  font-weight: 900;
  letter-spacing: -1.5px;
  color: var(--page-title-color);
  line-height: 1;
}
```
yeni:
```css
.statVal {
  font-size: 2.4rem;
  font-weight: 900;
  letter-spacing: -1.5px;
  color: var(--page-title-color);
  line-height: 1;
  font-family: 'JetBrains Mono', 'IBM Plex Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-variant-numeric: tabular-nums;
}
```

- [ ] **Step 5: Testleri çalıştırıp geçtiğini doğrula**

Run: `npx jest src/app/pageStyles.scope.test.ts --no-coverage -t "stats strip"`
Expected: PASS (2/2)

- [ ] **Step 6: tsc + tam jest**

Run: `npx tsc --noEmit && npx jest --no-coverage`
Expected: 0 hata, tüm testler PASS

- [ ] **Step 7: Playwright görsel doğrulama**

Stats strip'i desktop+mobil, light+dark'ta screenshot'la. Sayı fontunun mono'ya geçtiğini (rakamların eşit genişlikte hizalandığını), 1px gap'lerdeki ince mavi çizgi dokusunun (yakından bakınca) fark edilebilir ama göze batmadığını doğrula.

- [ ] **Step 8: Commit**

```bash
git add src/app/page.module.css src/app/pageStyles.scope.test.ts
git commit -m "style(landing): stats strip'e blueprint doku aksani + tabular-nums"
```

---

## Task 3: Bento Kartları — Tag/Num Tipografisi (Mono) + Nested-Glass Kalibrasyon Kontrolü

**Files:**
- Modify: `src/app/page.module.css:344-359` (.bentoTag, .bentoNum)
- Modify: `src/app/pageStyles.scope.test.ts`

**Interfaces:**
- Consumes: yok.
- Produces: `.bentoTag`/`.bentoNum` mono font.

**Not (spec sapması, gerekçeli):** Spec'in "Kapsam" #3 maddesi bento kartlarına blueprint arka plan dokusu öneriyordu. Gerçek kod incelemesinde `.cardBgImage` (satır 261-276) her bento kartının TAMAMINI (fotoğrafsız "boşluk" yok) düşük opaklıkta (%14-22) kaplayan bir overlay olduğu görüldü — kartın içinde ayrı bir "fotoğrafsız alan" yok. Bu yüzden blueprint arka plan dokusu bento kartlarına EKLENMEZ (fotoğrafla çakışma riski, Global Constraints'teki "fotoğraflı yüzeyler dokunulmaz" kuralıyla tutarlı) — bunun yerine "mono rakamlar" kararı (spec Kullanıcı Kararları #4) sadece tipografi seviyesinde uygulanır.

- [ ] **Step 1: Failing test yaz**

```typescript
describe('anasayfa Apple Liquid Glass — bento tag/num tipografisi', () => {
  it('.bentoNum mono font + tabular-nums kullanmalı (kadastro numaralandırma hissi)', () => {
    const match = pageCss.match(/\.bentoNum\s*\{([^}]*)\}/);
    expect(match).not.toBeNull();
    expect(match![1]).toMatch(/JetBrains Mono/);
    expect(match![1]).toMatch(/font-variant-numeric:\s*tabular-nums/);
  });

  it('.cardBgImage dokunulmamış olmalı (fotoğraf overlay korunuyor)', () => {
    expect(pageCss).toMatch(/\.cardBgImage\s*\{[^}]*opacity:\s*0\.22/);
  });
});
```

- [ ] **Step 2: Testi çalıştırıp fail ettiğini doğrula**

Run: `npx jest src/app/pageStyles.scope.test.ts --no-coverage -t "bento tag"`
Expected: FAIL (ilk test), ikinci test zaten PASS olmalı (dokunulmadığını doğrulayan negatif kontrol — bu adımda da geçmeli, dokunmadığımızın kanıtı).

- [ ] **Step 3: .bentoNum'a mono font ekle**

`src/app/page.module.css:353-359` — eski:
```css
.bentoNum {
  font-size: 0.72rem;
  font-weight: 900;
  letter-spacing: 0.06em;
  opacity: 0.35;
  color: currentColor;
}
```
yeni:
```css
.bentoNum {
  font-size: 0.72rem;
  font-weight: 900;
  letter-spacing: 0.06em;
  opacity: 0.35;
  color: currentColor;
  font-family: 'JetBrains Mono', 'IBM Plex Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-variant-numeric: tabular-nums;
}
```

- [ ] **Step 4: Testleri çalıştırıp geçtiğini doğrula**

Run: `npx jest src/app/pageStyles.scope.test.ts --no-coverage -t "bento tag"`
Expected: PASS (2/2)

- [ ] **Step 5: tsc + tam jest**

Run: `npx tsc --noEmit && npx jest --no-coverage`
Expected: 0 hata, tüm testler PASS

- [ ] **Step 6: Playwright görsel doğrulama**

4 bento kartının "01/02/03/04" numaralarının mono fonta geçtiğini, fotoğraf overlay'lerin (engine-v2-bg, cost-analysis-bg, marketplace-bg, security-pdf-bg) hiç değişmediğini desktop+mobil'de doğrula.

- [ ] **Step 7: Commit**

```bash
git add src/app/page.module.css src/app/pageStyles.scope.test.ts
git commit -m "style(landing): bento kart numaralarini mono/tabular-nums fonta gecir"
```

---

## Task 4: Süreç Nasıl Çalışır — Veri Kutusu Tabular-Nums

**Files:**
- Modify: `src/app/page.module.css:1354-1386` (.dataVal, .dataValBold, .dataValHighlight, .dataValOk)
- Modify: `src/app/pageStyles.scope.test.ts`

**Interfaces:**
- Consumes: yok.
- Produces: yok (yaprak task).

- [ ] **Step 1: Failing test yaz**

```typescript
describe('anasayfa Apple Liquid Glass — süreç kartları veri kutusu', () => {
  it('.dataVal/.dataValBold/.dataValHighlight/.dataValOk tabular-nums + mono olmalı', () => {
    for (const cls of ['dataVal', 'dataValBold', 'dataValHighlight', 'dataValOk']) {
      const re = new RegExp(`\\.${cls}\\s*\\{([^}]*)\\}`);
      const match = pageCss.match(re);
      expect(match).not.toBeNull();
      expect(match![1]).toMatch(/font-variant-numeric:\s*tabular-nums/);
    }
  });
});
```

- [ ] **Step 2: Testi çalıştırıp fail ettiğini doğrula**

Run: `npx jest src/app/pageStyles.scope.test.ts --no-coverage -t "süreç kartları"`
Expected: FAIL

- [ ] **Step 3: 4 selector'a tabular-nums + mono font ekle**

`src/app/page.module.css:1366-1386` — eski:
```css
.dataVal {
  color: var(--text);
  font-weight: 700;
}

.dataValBold {
  color: var(--primary);
  font-weight: 900;
  font-size: 0.95rem;
}

.dataValHighlight {
  color: #10b981;
  font-weight: 900;
  font-size: 0.95rem;
}

.dataValOk {
  color: #10b981;
  font-weight: 800;
}
```
yeni:
```css
.dataVal,
.dataValBold,
.dataValHighlight,
.dataValOk {
  font-family: 'JetBrains Mono', 'IBM Plex Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-variant-numeric: tabular-nums;
}

.dataVal {
  color: var(--text);
  font-weight: 700;
}

.dataValBold {
  color: var(--primary);
  font-weight: 900;
  font-size: 0.95rem;
}

.dataValHighlight {
  color: #10b981;
  font-weight: 900;
  font-size: 0.95rem;
}

.dataValOk {
  color: #10b981;
  font-weight: 800;
}
```

- [ ] **Step 4: Testleri çalıştırıp geçtiğini doğrula**

Run: `npx jest src/app/pageStyles.scope.test.ts --no-coverage -t "süreç kartları"`
Expected: PASS

- [ ] **Step 5: tsc + tam jest**

Run: `npx tsc --noEmit && npx jest --no-coverage`
Expected: 0 hata

- [ ] **Step 6: Playwright görsel doğrulama**

3 süreç kartındaki (`realEstateDataBox`) "1.250 m²", "₺18.4M", "%50.0" gibi değerlerin mono fonta geçtiğini, hizalamanın bozulmadığını doğrula.

- [ ] **Step 7: Commit**

```bash
git add src/app/page.module.css src/app/pageStyles.scope.test.ts
git commit -m "style(landing): surec kartlari veri kutusuna tabular-nums uygula"
```

---

## Task 5: Vision/Mission — Ölü CSS Temizliği + Cam Yüzey Hizalaması

**Files:**
- Modify: `src/app/page.module.css:1391-1420` (canlı `.visionCard`), `1690-1720` (ölü ikinci `.visionCard`)
- Modify: `src/app/pageStyles.scope.test.ts`

**Interfaces:**
- Consumes: yok.
- Produces: yok.

**Bulgu (bu plan yazılırken tespit edildi, spec'te yoktu):** `page.module.css`'te **iki ayrı `.visionCard` selector tanımı var** — satır 1397-1420 (gerçek kullanılan: `display:flex`, resim+metin split layout, `page.tsx:705-726`'daki markup'la eşleşiyor) ve satır 1697-1709 (eski/ölü: `text-align:center`, `flex-direction:column`, resimsiz-ikon-kart düzeni — hiçbir JSX bu düzenle eşleşmiyor, muhtemelen görsel-öncesi bir tasarımdan kalma). CSS Modules'te aynı class adı iki kez tanımlanınca dosya sırasına göre SONRAKİ blok kazanır (satır 1697 satır 1397'yi eziyor) — şu an canlı sitede hangi kuralların gerçekten uygulandığı bu yüzden belirsiz/kırılgan. Bu task, ölü bloğu siler ve tek `.visionCard` tanımını nested-glass referans desenine göre kalibre eder.

- [ ] **Step 1: Failing test yaz (tekilliği ve cam desenini doğrulayan)**

```typescript
describe('anasayfa Apple Liquid Glass — vision/mission kartları', () => {
  it('.visionCard sadece BİR kez tanımlı olmalı (ölü ikinci blok silinmiş)', () => {
    const matches = pageCss.match(/\.visionCard\s*\{/g) || [];
    expect(matches.length).toBe(1);
  });

  it('light-tema .visionCard nested-glass referans desenini kullanmalı (mavi tint gradient + kenar parıltısı box-shadow)', () => {
    const lightMatch = pageCss.match(/:global\(\[data-theme='light'\]\)\s*\.visionCard\s*\{([^}]*)\}/);
    expect(lightMatch).not.toBeNull();
    expect(lightMatch![1]).toMatch(/linear-gradient\(165deg/);
    expect(lightMatch![1]).toMatch(/inset 0 1px 0 rgba\(255,\s*255,\s*255,\s*0\.85\)/);
  });
});
```

- [ ] **Step 2: Testi çalıştırıp fail ettiğini doğrula**

Run: `npx jest src/app/pageStyles.scope.test.ts --no-coverage -t "vision/mission"`
Expected: FAIL (2/2 — şu an 2 tanım var, light override deseni yok)

- [ ] **Step 3: Ölü ikinci `.visionCard` bloğunu sil**

`src/app/page.module.css:1690-1720` civarında (tam blok, uygulama sırasında gerçek satır aralığı `grep -n "^\.visionCard"` ile teyit edilir) — sil:
```css
.visionCard {
  background: linear-gradient(135deg, rgba(31, 111, 235, 0.06), rgba(31, 111, 235, 0.02));
  border: 1px solid rgba(31, 111, 235, 0.22);
  border-radius: 24px;
  padding: 2.5rem 2rem;
  text-align: center;
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
  transition: transform 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease;
  display: flex;
  flex-direction: column;
  align-items: center;
}
```

Bu bloğun hemen üstünde/altında `.visionMission`/`.ctaSection` gibi başka canlı selector'lar olabilir — sadece bu tek `.visionCard` bloğu silinir, komşu kurallara dokunulmaz (uygulama anında dosyadan tam kopyala-sil yapılır, satır numarası referans amaçlıdır).

- [ ] **Step 4: Canlı `.visionCard`'a (satır 1397-1407) light-tema nested-glass override'ı ekle**

`src/app/page.module.css:1397-1407` — eski:
```css
.visionCard {
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 28px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
  transition: transform 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease;
}
```
yeni (aynı blok + hemen altına yeni light-override eklenir):
```css
.visionCard {
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 28px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
  transition: transform 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease;
}

:global([data-theme='light']) .visionCard {
  background: linear-gradient(165deg, rgba(219, 234, 254, 0.34), rgba(255, 255, 255, 0.24));
  border-color: rgba(31, 111, 235, 0.22);
  box-shadow:
    0 12px 32px rgba(31, 111, 235, 0.08),
    0 0 0 1px rgba(31, 111, 235, 0.16),
    inset 0 1px 0 rgba(255, 255, 255, 0.85);
}
```

Not: `src/app/page.module.css:1409`'da zaten `:global([data-theme='light']) .visionCard` tanımı olup olmadığını uygulama anında `grep -n ":global(\[data-theme='light'\]) .visionCard" src/app/page.module.css` ile teyit et — spec yazımı sırasında satır 1409 civarında böyle bir blok görüldü, varsa ÜZERİNE yeni blok eklenmez, mevcut blok yukarıdaki içerikle GÜNCELLENİR (çift tanım yaratılmaz).

- [ ] **Step 5: Testleri çalıştırıp geçtiğini doğrula**

Run: `npx jest src/app/pageStyles.scope.test.ts --no-coverage -t "vision/mission"`
Expected: PASS (2/2)

- [ ] **Step 6: tsc + tam jest**

Run: `npx tsc --noEmit && npx jest --no-coverage`
Expected: 0 hata

- [ ] **Step 7: Playwright görsel doğrulama (ÖNEMLİ — bu task'ta gerçek görsel regresyon riski var)**

Ölü CSS bloğu silindiği için vision kartlarının GERÇEKTEN hangi stille render olduğu değişebilir (önceden hangi bloğun kazandığı belirsizdi). Desktop+mobil, light+dark'ta vision/mission bölümünü screenshot'la, ÖNCESİ (bu task başlamadan önceki bir referans screenshot alınmalı, Step 0 olarak eklenebilir) ile KARŞILAŞTIR — kartların resim+metin split düzeninin (mevcut JSX yapısıyla tutarlı) bozulmadığını doğrula. Bozulma varsa (ör. metin ortalanmış/resimsiz görünüyorsa) ölü bloğun aslında canlı olduğu anlamına gelir — bu durumda Step 3'ü geri al, ölü bloğu SİLMEK yerine sadece 1697 satırındaki bloğu yeni referans desene göre güncelle, tekilleştirmeyi farklı şekilde çöz (reviewer'a raporla).

- [ ] **Step 8: Commit**

```bash
git add src/app/page.module.css src/app/pageStyles.scope.test.ts
git commit -m "fix(landing): olu ikinci .visionCard tanimini sil, nested-glass desenini uygula"
```

---

## Task 6: Blog Kartları — Kategori Rozeti + Kenar Parıltısı

**Files:**
- Modify: `src/app/page.module.css:1742-1787` (.blogCard, .blogCategoryTag)
- Modify: `src/app/pageStyles.scope.test.ts`

**Interfaces:**
- Consumes: yok.
- Produces: yok.

- [ ] **Step 1: Failing test yaz**

```typescript
describe('anasayfa Apple Liquid Glass — blog kartları', () => {
  it('.blogCard hover kenar parıltısı mavi-ailesi olmalı (zaten öyleydi, regresyon guard\'ı)', () => {
    expect(pageCss).toMatch(/\.blogCard:hover\s*\{[^}]*rgba\(31,\s*111,\s*235/);
  });

  it('.blogCategoryTag mavi-tint cam desenine geçmeli (koyu opak rozet yerine)', () => {
    const match = pageCss.match(/\.blogCategoryTag\s*\{([^}]*)\}/);
    expect(match).not.toBeNull();
    expect(match![1]).toMatch(/rgba\(31,\s*111,\s*235/);
    expect(match![1]).not.toMatch(/rgba\(15,\s*23,\s*42/);
  });
});
```

- [ ] **Step 2: Testi çalıştırıp fail ettiğini doğrula**

Run: `npx jest src/app/pageStyles.scope.test.ts --no-coverage -t "blog kartları"`
Expected: İlk test PASS (regresyon guard'ı, zaten doğru), ikinci test FAIL.

- [ ] **Step 3: .blogCategoryTag'i mavi-tint cam desenine çevir**

`src/app/page.module.css:1775-1787` — eski:
```css
.blogCategoryTag {
  position: absolute;
  top: 12px;
  left: 12px;
  background: rgba(15, 23, 42, 0.75);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: white;
  font-size: 0.7rem;
  font-weight: 800;
  padding: 4px 10px;
  border-radius: 100px;
  backdrop-filter: blur(8px);
}
```
yeni:
```css
.blogCategoryTag {
  position: absolute;
  top: 12px;
  left: 12px;
  background: rgba(15, 23, 42, 0.55);
  border: 1px solid rgba(31, 111, 235, 0.35);
  color: white;
  font-size: 0.7rem;
  font-weight: 800;
  padding: 4px 10px;
  border-radius: 100px;
  backdrop-filter: blur(8px);
}
```

Not: Rozet fotoğrafın ÜZERİNDE oturduğu için (okunabilirlik şart) koyu zemin tamamen kaldırılmaz, sadece opaklığı hafif düşürülür (0.75→0.55) ve border'ı nötr beyazdan mavi-aileye (`rgba(31,111,235,.35)`) çevrilir — marka tutarlılığı, kontrast/okunabilirlik korunur.

- [ ] **Step 4: Testleri çalıştırıp geçtiğini doğrula**

Run: `npx jest src/app/pageStyles.scope.test.ts --no-coverage -t "blog kartları"`
Expected: PASS (2/2)

- [ ] **Step 5: tsc + tam jest**

Run: `npx tsc --noEmit && npx jest --no-coverage`
Expected: 0 hata

- [ ] **Step 6: Playwright görsel doğrulama**

3 blog kartının kategori rozetinin (İnşaat 2026 / Fizibilite & Veri / Pazar Yeri & Güven) hâlâ fotoğraf üzerinde net okunabilir olduğunu, mavi kenarın görünür ama abartısız olduğunu desktop+mobil'de doğrula.

- [ ] **Step 7: Commit**

```bash
git add src/app/page.module.css src/app/pageStyles.scope.test.ts
git commit -m "style(landing): blog kategori rozetini mavi-tint cam desenine gecir"
```

---

## Task 7: FAQ — Cam Yüzey Hizalaması + Blueprint Doku Aksanı

**Files:**
- Modify: `src/app/page.module.css:1630-1660` (.faqItem light override)
- Modify: `src/app/pageStyles.scope.test.ts`

**Interfaces:**
- Consumes: yok.
- Produces: yok.

- [ ] **Step 1: Failing test yaz**

```typescript
describe('anasayfa Apple Liquid Glass — FAQ', () => {
  it('light-tema .faqItem nested-glass referans desenini kullanmalı', () => {
    const lightMatch = pageCss.match(/:global\(\[data-theme='light'\]\)\s*\.faqItem\s*\{([^}]*)\}/);
    expect(lightMatch).not.toBeNull();
    expect(lightMatch![1]).toMatch(/linear-gradient\(165deg/);
  });

  it('.faqItem blueprint grid dokusu içermeli (fotoğrafsız yüzey, aksan uygun)', () => {
    const match = pageCss.match(/\.faqItem\s*\{([^}]*)\}/);
    expect(match).not.toBeNull();
    expect(match![1]).toMatch(/repeating-linear-gradient/);
  });
});
```

- [ ] **Step 2: Testi çalıştırıp fail ettiğini doğrula**

Run: `npx jest src/app/pageStyles.scope.test.ts --no-coverage -t "FAQ"`
Expected: FAIL (2/2) — mevcut light override'da `rgba(255,255,255,.65)` düz beyaz var (bugün heroTeaserGlass'ta bulunanla AYNI wash-out riski, henüz düzeltilmemiş).

- [ ] **Step 3: .faqItem'e blueprint grid dokusu ekle**

`src/app/page.module.css:1630-1639` — eski:
```css
.faqItem {
  background: rgba(31, 111, 235, 0.05);
  border: 1px solid rgba(31, 111, 235, 0.18);
  border-radius: 20px;
  padding: 1.25rem 1.5rem;
  cursor: pointer;
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  transition: all 0.25s ease;
}
```
yeni:
```css
.faqItem {
  background:
    repeating-linear-gradient(0deg, rgba(31, 111, 235, 0.04) 0 1px, transparent 1px 20px),
    repeating-linear-gradient(90deg, rgba(31, 111, 235, 0.04) 0 1px, transparent 1px 20px),
    rgba(31, 111, 235, 0.05);
  border: 1px solid rgba(31, 111, 235, 0.18);
  border-radius: 20px;
  padding: 1.25rem 1.5rem;
  cursor: pointer;
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  transition: all 0.25s ease;
}
```

- [ ] **Step 4: light-tema `.faqItem` override'ını nested-glass referans desenine çevir (bugünkü heroTeaserGlass düzeltmesiyle aynı kök sorun)**

`src/app/page.module.css:1641-1643` civarı — eski:
```css
:global([data-theme='light']) .faqItem {
  background: rgba(255, 255, 255, 0.65);
}
```
yeni:
```css
:global([data-theme='light']) .faqItem {
  background:
    repeating-linear-gradient(0deg, rgba(31, 111, 235, 0.03) 0 1px, transparent 1px 20px),
    repeating-linear-gradient(90deg, rgba(31, 111, 235, 0.03) 0 1px, transparent 1px 20px),
    linear-gradient(165deg, rgba(219, 234, 254, 0.34), rgba(255, 255, 255, 0.24));
  border-color: rgba(31, 111, 235, 0.22);
  box-shadow:
    0 0 0 1px rgba(31, 111, 235, 0.16),
    inset 0 1px 0 rgba(255, 255, 255, 0.85);
}
```

Not: uygulama anında bu selector'ın tam mevcut içeriğini `grep -n ":global(\[data-theme='light'\]) .faqItem" -A 5 src/app/page.module.css` ile teyit et — yukarıdaki "eski" blok spec yazım anındaki taramaya dayanıyor, satır numarası kaymış olabilir.

- [ ] **Step 5: Testleri çalıştırıp geçtiğini doğrula**

Run: `npx jest src/app/pageStyles.scope.test.ts --no-coverage -t "FAQ"`
Expected: PASS (2/2)

- [ ] **Step 6: tsc + tam jest**

Run: `npx tsc --noEmit && npx jest --no-coverage`
Expected: 0 hata

- [ ] **Step 7: Playwright görsel doğrulama**

FAQ bölümünü desktop+mobil, light+dark'ta screenshot'la — light temada artık düz beyaza yıkanmadığını (hero teaser'daki bugünkü düzeltmeyle aynı görsel kalite), açık/kapalı accordion durumlarının ikisinde de metin kontrastının korunduğunu doğrula.

- [ ] **Step 8: Commit**

```bash
git add src/app/page.module.css src/app/pageStyles.scope.test.ts
git commit -m "fix(landing): faqItem light-tema wash-out'unu duzelt + blueprint doku aksani"
```

---

## Task 8: CTA — Buton/Kart Camı Hizalaması

**Files:**
- Modify: `src/app/page.module.css:1799-1811` (.ctaSection)
- Modify: `src/app/pageStyles.scope.test.ts`

**Interfaces:**
- Consumes: yok.
- Produces: yok.

- [ ] **Step 1: Failing test yaz**

```typescript
describe('anasayfa Apple Liquid Glass — CTA', () => {
  it('.ctaSection kenar parıltısı (inset highlight) içermeli, referans desenle tutarlı', () => {
    const match = pageCss.match(/\.ctaSection\s*\{([^}]*)\}/);
    expect(match).not.toBeNull();
    expect(match![1]).toMatch(/inset 0 1px 0 rgba\(255,\s*255,\s*255,\s*0\.[0-9]+\)/);
  });
});
```

- [ ] **Step 2: Testi çalıştırıp fail ettiğini doğrula**

Run: `npx jest src/app/pageStyles.scope.test.ts --no-coverage -t "CTA"`
Expected: FAIL

- [ ] **Step 3: .ctaSection'a kenar parıltısı ekle**

`src/app/page.module.css:1799-1811` — eski:
```css
.ctaSection {
  background: linear-gradient(135deg, rgba(31, 111, 235, 0.08), rgba(31, 111, 235, 0.02));
  border: 1px solid rgba(31, 111, 235, 0.22);
  border-radius: 32px;
  padding: 4.5rem 2rem;
  text-align: center;
  color: var(--text);
  box-shadow: 0 20px 50px rgba(31, 111, 235, 0.12);
  position: relative;
  overflow: hidden;
  backdrop-filter: blur(20px) saturate(1.4);
  -webkit-backdrop-filter: blur(20px) saturate(1.4);
}
```
yeni:
```css
.ctaSection {
  background: linear-gradient(135deg, rgba(31, 111, 235, 0.08), rgba(31, 111, 235, 0.02));
  border: 1px solid rgba(31, 111, 235, 0.22);
  border-radius: 32px;
  padding: 4.5rem 2rem;
  text-align: center;
  color: var(--text);
  box-shadow:
    0 20px 50px rgba(31, 111, 235, 0.12),
    inset 0 1px 0 rgba(255, 255, 255, 0.10);
  position: relative;
  overflow: hidden;
  backdrop-filter: blur(20px) saturate(1.4);
  -webkit-backdrop-filter: blur(20px) saturate(1.4);
}
```

Not: `.ctaSection` zaten `.ctaBgImage` (cta-bg.png) fotoğrafını taşıyor — burada sadece mevcut `box-shadow`'a bir `inset` katman eklendi, arka plan/renk dokunulmadı (fotoğraf korunur, Global Constraints kuralıyla tutarlı).

- [ ] **Step 4: Testi çalıştırıp geçtiğini doğrula**

Run: `npx jest src/app/pageStyles.scope.test.ts --no-coverage -t "CTA"`
Expected: PASS

- [ ] **Step 5: tsc + tam jest**

Run: `npx tsc --noEmit && npx jest --no-coverage`
Expected: 0 hata

- [ ] **Step 6: Playwright görsel doğrulama**

CTA bölümünü desktop+mobil, light+dark'ta screenshot'la, üst kenarda ince bir parıltı çizgisinin fotoğrafın üzerinde göze batmadan eklendiğini doğrula.

- [ ] **Step 7: Commit**

```bash
git add src/app/page.module.css src/app/pageStyles.scope.test.ts
git commit -m "style(landing): cta kartina kenar parlitisi ekle"
```

---

## Task 9: Final Doğrulama — Tam Sayfa Regresyon Kontrolü

**Files:**
- Yok (sadece doğrulama, kod değişikliği yok — bir hata bulunursa ilgili task'a geri dönülür).

**Interfaces:**
- Consumes: Task 1-8'in tamamı.
- Produces: Merge'e hazır onay.

- [ ] **Step 1: Tam komut paketi**

Run: `npx tsc --noEmit && npm run lint && npx jest --no-coverage`
Expected: 0 tsc hatası, 0 lint ihlali, tüm testler PASS (325 + bu planın eklediği ~15 yeni test).

- [ ] **Step 2: Playwright ile tam sayfa scroll-through, desktop 1920px, light+dark**

Dev server (`npm run dev:next`, :3000) ayakta olmalı. Ana sayfayı baştan sona yavaş scroll ederek (whileInView animasyonlarını tetikleyerek) her bölümün (hero/stats/bento/süreç/vision/blog/faq/cta) `fullPage: true` screenshot'ını al. Bugünkü (2026-07-23) oturumda kullanılan script deseni (`AFTER3-bento-widget.png` vb. tarzı) tekrarlanır.

- [ ] **Step 3: Playwright ile tam sayfa scroll-through, mobil 390px, light+dark**

Aynı scroll-through, viewport `{width:390, height:844}`. `.howItWorksGrid`'in hâlâ tek sütuna indiğini (bugünkü fix'in bu planla bozulmadığını) ayrıca doğrula.

- [ ] **Step 4: Nested-glass tarama scripti tekrar çalıştırılır**

Bugünkü oturumda kullanılan `NESTED GLASS ELEMENTS` tarama scripti (parent-child `backdrop-filter` zincirini `getComputedStyle` ile bulan) tekrar çalıştırılır — Task 5/7'de dokunulan `.visionCard`/`.faqItem` dahil, hiçbir yeni nested-glass wash-out (toplam opaklık ~%80 üstü, aynı renkte üst üste iki katman) yaratılmadığı doğrulanır.

- [ ] **Step 5: Masaüstü regresyon karşılaştırması**

Bu planın başlangıcındaki (Task 1 öncesi) bir referans screenshot seti ile şimdiki screenshot'lar karşılaştırılır — layout/grid yapısının (kaç sütun, kart boyutları, spacing) HİÇBİR yerde kasıtsız değişmediği doğrulanır (bu plan sadece renk/doku/tipografi kalibrasyonu yapıyor, layout değiştirmiyor).

- [ ] **Step 6: Bulgu varsa raporla, yoksa hazır olduğunu bildir**

Herhangi bir regresyon/wash-out bulunursa ilgili task'a (Task 1-8) dönülüp düzeltilir, bu adım tekrarlanır. Temizse plan tamamlanmış sayılır.

- [ ] **Step 7: Commit (varsa final küçük düzeltmeler) + kullanıcıya özet rapor**

```bash
git add -A
git commit -m "chore(landing): apple liquid glass plani final dogrulama"
```

(Değişiklik yoksa bu adım atlanır — sadece doğrulama task'ıydı.)

---

## Self-Review Notu (plan yazarı tarafından, uygulama öncesi)

- **Spec kapsaması:** Spec'in 8 bölümü (hero/stats/bento/süreç/vision/blog/faq/cta) → Task 1-8 birebir eşleşiyor. Nested-glass referans desenin sistematik uygulanması → Task 5 (vision) ve Task 7 (faq)'de somutlaştı (ikisi de gerçek wash-out riski taşıyan `rgba(255,255,255,.65)` benzeri kalıplar barındırıyordu). Blueprint doku aksanı → Task 2 (stats) ve Task 7 (faq)'de (fotoğrafsız yüzeyler), Task 3'te (bento) bilinçli olarak SADECE tipografi seviyesinde (gerekçe Task 3'te açıklandı). Kicker sadeleşmesi → Task 1. Mono/tabular-nums → Task 2/3/4.
- **Placeholder taraması:** Her task'ta tam eski/yeni CSS blokları var, "TODO"/"benzer şekilde" yok. Task 5 ve 7'de satır numaralarının kaymış olabileceği açıkça not edildi ve uygulama anında `grep` ile teyit talimatı verildi (bu bir placeholder değil, gerçek bir belirsizliğin dürüst işaretlenmesi).
- **Tip/isim tutarlılığı:** Tüm task'lar aynı `src/app/pageStyles.scope.test.ts` dosyasına `describe` bloğu ekliyor, çakışan class adı yok. Nested-glass referans CSS bloğu (Global Constraints'te tanımlı) Task 5/7'de birebir aynı değerlerle tekrarlanıyor.
