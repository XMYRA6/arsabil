# Anasayfa Bento Kartları — Ölü Mouse-Tracking Kodunun Kaldırılması Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Anasayfadaki (`MarketingHomePage`, `src/app/page.tsx`) 4 bento kartındaki imleç-takipli 3D tilt + spotlight-takip mouse-tracking kodunu (`onMouseMove`/`onMouseLeave` + `--rx`/`--ry`/`--mx`/`--my` custom property'leri) kaldırıp tüm cihazlarda sade, tutarlı bir `:hover` davranışına indirgemek.

**Architecture:** Tek dosya çifti (`page.tsx` + `page.module.css`), tek sorumluluk. `page.module.css` yalnızca `page.tsx` tarafından import ediliyor, `.bentoCard`/`.spotlight` başka hiçbir dosyada kullanılmıyor — izolasyon riski yok. Değişiklik saf silme + literal değere sadeleştirme; yeni soyutlama eklenmiyor.

**Tech Stack:** Next.js (App Router), React, CSS Modules, Jest (`--roots "src"`), TypeScript.

## Global Constraints

- Masaüstünde davranış değişikliği kullanıcı tarafından onaylandı: imleç-takipli tilt/spotlight kalkar (bkz. spec).
- Dokunmatik/mobil genişlikte görsel fark olmamalı (zaten yoktu).
- `pageStyles.scope.test.ts`'teki mevcut testler kırılmamalı.
- `tsc --noEmit` → 0 hata, `npx jest --no-coverage --roots "src"` → tüm suite yeşil.

Spec: `docs/superpowers/specs/2026-08-07-anasayfa-bento-hover-temizligi-design.md`

---

### Task 1: Ölü mouse-tracking kodunu kaldır + regresyon-guard testleri ekle

**Files:**
- Modify: `src/app/page.tsx:29-48` (fonksiyon tanımları), `:137-138`, `:233-234`, `:324-325`, `:377-378` (prop kullanımları)
- Modify: `src/app/page.module.css:246` (transform satırı), `:247` (transition listesi), `:301` (spotlight gradient), `:245` (transform-style)
- Test: `src/app/pageStyles.scope.test.ts` (yeni describe bloğu eklenir, dosya sonuna)

**Interfaces:** Yok — tek task, dışa açılan bir arayüz yok. Değişiklik tamamen bu iki dosya içinde kapanıyor.

- [ ] **Step 1: Yeni regresyon-guard testlerini `pageStyles.scope.test.ts` dosyasının sonuna ekle (henüz kod silinmeden — bu testler şimdi FAIL etmeli)**

Dosyanın sonuna (mevcut son `});`'den sonra) şunu ekle:

```ts
describe('anasayfa bento kartları — ölü mouse-tracking kodu kaldırıldı (2026-08-07)', () => {
  it('page.tsx artık onMouseMove/onMouseLeave fonksiyon tanımlarını içermemeli', () => {
    expect(pageTsx).not.toMatch(/function onMouseMove/);
    expect(pageTsx).not.toMatch(/function onMouseLeave/);
  });

  it('page.tsx bento kartlarında onMouseMove/onMouseLeave prop\'larını kullanmamalı', () => {
    expect(pageTsx).not.toMatch(/onMouseMove=\{onMouseMove\}/);
    expect(pageTsx).not.toMatch(/onMouseLeave=\{onMouseLeave\}/);
  });

  it('page.module.css artık --rx/--ry/--mx/--my custom property referansı içermemeli', () => {
    expect(pageCss).not.toMatch(/var\(--rx/);
    expect(pageCss).not.toMatch(/var\(--ry/);
    expect(pageCss).not.toMatch(/var\(--mx/);
    expect(pageCss).not.toMatch(/var\(--my/);
  });

  it('.spotlight artık sabit merkez (50% 50%) kullanmalı', () => {
    const match = pageCss.match(/\.spotlight\s*\{([^}]*)\}/);
    expect(match).not.toBeNull();
    expect(match![1]).toMatch(/400px circle at 50% 50%/);
  });

  it('.bentoCard:hover davranışı (görsel scale + gölge + spotlight fade-in) hâlâ tanımlı olmalı — sadece tilt/imleç-takibi kalkmalı', () => {
    expect(pageCss).toMatch(/\.bentoCard:hover \.cardBgImage \{/);
    expect(pageCss).toMatch(/\.bentoCard:hover \{/);
    expect(pageCss).toMatch(/\.bentoCard:hover \.spotlight \{ opacity: 1; \}/);
  });
});
```

- [ ] **Step 2: Testlerin FAIL ettiğini doğrula (kod henüz silinmedi)**

Run: `npx jest --no-coverage --roots "src" pageStyles.scope.test.ts -t "ölü mouse-tracking kodu kaldırıldı"`
Expected: İlk 4 test FAIL (onMouseMove/onMouseLeave/--rx/--mx hâlâ mevcut), son test (`:hover` davranışı) PASS (zaten değişmedi).

- [ ] **Step 3: `page.tsx`'ten `onMouseMove`/`onMouseLeave` fonksiyon tanımlarını sil**

`src/app/page.tsx` içinde şu bloğu (satır 29-48 civarı, `/* ── Mouse spotlight & 3D tilt on each card ── */` yorumu dahil):

```tsx
/* ── Mouse spotlight & 3D tilt on each card ── */
function onMouseMove(e: React.MouseEvent<HTMLDivElement>) {
  const rect = e.currentTarget.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  const px = (x / rect.width) * 100;
  const py = (y / rect.height) * 100;
  const rx = ((y - rect.height / 2) / (rect.height / 2)) * -5;
  const ry = ((x - rect.width / 2) / (rect.width / 2)) * 5;

  e.currentTarget.style.setProperty('--mx', `${px}%`);
  e.currentTarget.style.setProperty('--my', `${py}%`);
  e.currentTarget.style.setProperty('--rx', `${rx}deg`);
  e.currentTarget.style.setProperty('--ry', `${ry}deg`);
}

function onMouseLeave(e: React.MouseEvent<HTMLDivElement>) {
  e.currentTarget.style.setProperty('--rx', '0deg');
  e.currentTarget.style.setProperty('--ry', '0deg');
}
```

tamamen sil (yorum satırı dahil).

- [ ] **Step 4: 4 bento kartındaki `onMouseMove`/`onMouseLeave` prop çiftlerini sil**

`src/app/page.tsx` içinde 4 ayrı yerde (Card 1 "ENGINE V2", Card 2 "cost-analysis", Card 3 "marketplace", Card 4 "security-pdf") şu iki satırı:

```tsx
        onMouseMove={onMouseMove}
        onMouseLeave={onMouseLeave}
```

her birinin bulunduğu `<motion.div>` açılışından sil. Örnek (Card 1, değişiklik sonrası):

```tsx
      <motion.div
        variants={cardVariants}
        className={`${styles.bentoCard} ${styles.bentoWide}`}
      >
```

Aynı deseni Card 2 (`className={styles.bentoCard}`), Card 3 (`className={styles.bentoCard}`) ve Card 4 (`className={`${styles.bentoCard} ${styles.bentoWide}`}`) için de uygula.

- [ ] **Step 5: `page.module.css`'te `.bentoCard`'ın transform/transform-style/transition tanımını sadeleştir**

Şu bloğu:

```css
.bentoCard {
  position: relative;
  overflow: hidden;
  border-radius: 24px;
  padding: 2rem;
  background: linear-gradient(135deg, rgba(var(--acc), 0.16), rgba(var(--acc), 0.06));
  border: 1px solid rgba(var(--acc), 0.32);
  color: var(--text);
  backdrop-filter: blur(18px) saturate(1.4);
  -webkit-backdrop-filter: blur(18px) saturate(1.4);
  box-shadow: 0 8px 32px rgba(var(--acc), 0.12);
  display: flex;
  flex-direction: column;
  gap: 0;
  cursor: default;
  transform-style: preserve-3d;
  transform: perspective(1000px) rotateX(var(--rx, 0deg)) rotateY(var(--ry, 0deg));
  transition: transform 0.15s ease-out, box-shadow 0.3s ease, border-color 0.3s ease;
}
```

şuna değiştir (transform/transform-style silindi, transition'dan `transform` kısmı çıkarıldı):

```css
.bentoCard {
  position: relative;
  overflow: hidden;
  border-radius: 24px;
  padding: 2rem;
  background: linear-gradient(135deg, rgba(var(--acc), 0.16), rgba(var(--acc), 0.06));
  border: 1px solid rgba(var(--acc), 0.32);
  color: var(--text);
  backdrop-filter: blur(18px) saturate(1.4);
  -webkit-backdrop-filter: blur(18px) saturate(1.4);
  box-shadow: 0 8px 32px rgba(var(--acc), 0.12);
  display: flex;
  flex-direction: column;
  gap: 0;
  cursor: default;
  transition: box-shadow 0.3s ease, border-color 0.3s ease;
}
```

- [ ] **Step 6: `.spotlight`'taki imleç-takipli gradient merkezini literal `50% 50%`'ye sadeleştir**

Şu bloğu:

```css
.spotlight {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: radial-gradient(
    400px circle at var(--mx, 50%) var(--my, 50%),
    rgba(255, 255, 255, 0.10) 0%,
    transparent 70%
  );
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.3s;
  z-index: 1;
}
```

şuna değiştir:

```css
.spotlight {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: radial-gradient(
    400px circle at 50% 50%,
    rgba(255, 255, 255, 0.10) 0%,
    transparent 70%
  );
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.3s;
  z-index: 1;
}
```

- [ ] **Step 7: Yeni testlerin artık PASS ettiğini doğrula**

Run: `npx jest --no-coverage --roots "src" pageStyles.scope.test.ts`
Expected: Dosyadaki TÜM testler (yeni eklenenler dahil) PASS.

- [ ] **Step 8: `tsc` ve tam jest suite'ini çalıştır, regresyon olmadığını doğrula**

Run: `npx tsc --noEmit`
Expected: 0 hata.

Run: `npx jest --no-coverage --roots "src"`
Expected: Tüm suite yeşil (`page.test.tsx` dahil — bu task hiçbir test-ID/rol/metin değiştirmediği için etkilenmemeli).

- [ ] **Step 9: Commit**

```bash
git add src/app/page.tsx src/app/page.module.css src/app/pageStyles.scope.test.ts
git commit -m "$(cat <<'EOF'
refactor(anasayfa): bento kartlarindaki olu mouse-tracking kodunu kaldir

onMouseMove/onMouseLeave imlec-takipli 3D tilt + spotlight-takip efekti
dokunmatikte hic tetiklenmiyordu; masaustunde de kaldirilarak tum
cihazlarda tutarli, sade bir :hover davranisina indirgendi.
EOF
)"
```

- [ ] **Step 10: Canlı doğrulama (manuel)**

Run: `npm run build && npm run start` (veya `npm run dev` — bu route dev-mode HMR sorunundan `/hesapla` gibi etkilenmiyor, ama build ile doğrulamak daha güvenli).

Tarayıcıda `http://localhost:3000/` (veya kullanılan port) aç:
- Masaüstü genişlikte bento kartlarının üzerine gelindiğinde: arka plan görseli hafifçe büyüyor, kutu gölgesi belirginleşiyor, kart merkezinde sabit (imleci takip etmeyen) bir spotlight parıltısı beliriyor, kart TİLT/eğilme YAPMIYOR.
- Tarayıcı DevTools'ta viewport'u ≤768px'e küçült, dokunmatik emülasyonla test et: görsel davranış öncekiyle birebir aynı (zaten hiçbir zaman tilt/spotlight-takibi görünmüyordu).

