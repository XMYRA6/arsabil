# Anasayfa Taste-Skill Revizyonu Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the "AI slop" patterns the taste-skill audit found on the ArsaBil marketing homepage (`src/app/page.tsx` + `src/app/page.module.css`) — emoji-as-icons, fake phone-mockup screenshots, 3-equal-column grids, an accordion FAQ, duplicated demo data, and an unused Inter fallback — while keeping the existing section order and content strategy intact.

**Architecture:** Eight small, independently testable tasks. Two are sitewide/foundational (font wiring, nothing else touches `layout.tsx` since Geist is already loaded there; icon library). Six are scoped to `MarketingHomePage` in `page.tsx`/`page.module.css` (radius restraint, duplicate-data fix, bento card cleanup, How-It-Works layout, Blog layout, FAQ layout). Every task follows the project's existing `pageStyles.scope.test.ts` regex-on-raw-source pattern and ends with a real `npm run build`.

**Tech Stack:** Next.js 16 (Turbopack build), React 19, CSS Modules (`composes` not used in this plan — no `@media`-nesting risk), Jest, `@phosphor-icons/react` (new dependency, Task 8).

**Spec:** `docs/superpowers/specs/2026-08-15-anasayfa-taste-skill-revizyonu-design.md`

## Global Constraints

- Do not touch `src/app/layout.tsx` — Geist is already loaded there (`--font-geist-sans`/`--font-geist-mono`), only `globals.css` needs to reference it.
- Do not touch `src/app/mobile/HomeMobile.tsx` or any file under `src/app/mobile/` — that is a separate, already-completed spec (mobile kart-dili-revizyonu) for logged-in mobile users only.
- Do not touch `ListingCard.tsx`/`.module.css` or any file outside `src/app/page.tsx`, `src/app/page.module.css`, `src/app/pageStyles.scope.test.ts`, `src/app/globals.css`, `src/app/globalsFont.scope.test.ts` (new), and `package.json`.
- **`npm run build` is MANDATORY after every task**, not just `npm test`/`npm run dev` — this project's CSS Modules/Turbopack setup has previously broken production builds in ways `npm run dev` (webpack) and Jest (regex-based) both missed silently.
- Every touched selector must keep working in both `[data-theme='light']` and the default (`[data-theme='dark'], :root`) theme — check both override blocks before editing a rule, don't just edit the base rule.
- This component (`MarketingHomePage`) renders at ALL viewport widths (desktop AND logged-out mobile visitors) — when editing a class also check the `@media (max-width: 900px)` and `@media (max-width: 640px)` blocks at the bottom of `page.module.css` for the same class, and update them so the layout doesn't break on narrow screens.

---

### Task 1: Wire the already-loaded Geist font into globals.css

**Files:**
- Modify: `src/app/globals.css:235`
- Test: Create `src/app/globalsFont.scope.test.ts`

**Interfaces:**
- Consumes: `--font-geist-sans` CSS variable, already set on `<body>` by `src/app/layout.tsx:13-16,59` (`const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });` ... `className={\`${geistSans.variable} ${geistMono.variable} antialiased\`}`). Do not modify `layout.tsx`.
- Produces: nothing consumed by later tasks.

- [ ] **Step 1: Write the failing test**

Create `src/app/globalsFont.scope.test.ts`:

```typescript
import fs from 'fs';
import path from 'path';

const globalsCss = fs.readFileSync(path.join(__dirname, 'globals.css'), 'utf8');

describe('site-geneli font — Geist bağlanması (Inter yerine)', () => {
  it('html, body kuralı artık literal Inter kullanmamalı', () => {
    const match = globalsCss.match(/html,\s*\nbody\s*\{([^}]*)\}/);
    expect(match).not.toBeNull();
    expect(match![1]).not.toMatch(/'Inter'/);
  });

  it('html, body kuralı --font-geist-sans değişkenini kullanmalı', () => {
    const match = globalsCss.match(/html,\s*\nbody\s*\{([^}]*)\}/);
    expect(match).not.toBeNull();
    expect(match![1]).toMatch(/font-family:\s*var\(--font-geist-sans\)/);
  });

  it('font-family fallback zinciri korunmalı (sistem fontlarına düşüş)', () => {
    const match = globalsCss.match(/html,\s*\nbody\s*\{([^}]*)\}/);
    expect(match).not.toBeNull();
    expect(match![1]).toMatch(/ui-sans-serif,\s*system-ui/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/app/globalsFont.scope.test.ts -v`
Expected: FAIL — first two assertions fail because `globals.css:235` still has `font-family: 'Inter', ...`.

- [ ] **Step 3: Edit globals.css**

In `src/app/globals.css`, find (around line 235):

```css
html,
body {
  max-width: 100vw;
  overflow-x: clip;
  background: var(--bg-body);
  background-color: var(--bg);
  color: var(--text);
  font-family: 'Inter', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif;
  min-height: 100dvh;
}
```

Replace the `font-family` line with:

```css
  font-family: var(--font-geist-sans), ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/app/globalsFont.scope.test.ts -v`
Expected: PASS (3/3).

- [ ] **Step 5: Real production build**

Run: `npm run build`
Expected: build succeeds with no errors (this is a pure CSS value change, but per Global Constraints this check is still mandatory every task).

- [ ] **Step 6: Commit**

```bash
git add src/app/globals.css src/app/globalsFont.scope.test.ts
git commit -m "feat(homepage): wire already-loaded Geist font into globals.css body rule"
```

---

### Task 2: Restrain `.ctaBtn` from a full pill to the site's standard button radius

**Files:**
- Modify: `src/app/page.module.css` (`.ctaBtn` rule, currently around line 1925-1940)
- Test: Modify `src/app/pageStyles.scope.test.ts`

**Interfaces:**
- Consumes: nothing from other tasks.
- Produces: nothing consumed by later tasks.

**Context:** The audit found 23 uses of `border-radius: 100px` in this file. Checking each: `.bentoBadge`/`.miniPill`/`.tkgmSeal`/`.qrVerified`/`.glassSpeedBadge`/`.teaserBadgeLive`/`.howStepTag`/`.stepLiveDot`/`.visionTag`/`.visionPill`/`.blogCategoryTag`/`.ctaTrustPill` are small text tags/badges — pill radius is correct there, not a slop pattern, leave them. `.glassRangeSlider`/`.progressTrack`/`.progressBar`/`.pdfLineFull`/`.pdfLineHalf`/`.kaksBtn` are slider tracks/progress bars/segmented buttons — pill radius is the expected convention for those, leave them. `.mobileNotchPill` is deleted entirely in Task 4. The one real offender is `.ctaBtn` — a large, primary actionable button (not a small tag) using a full 100px pill while the hero's `.primaryBtn`/`.secondaryBtn` (same visual role, same page) use `14px`. Bring it in line.

- [ ] **Step 1: Write the failing test**

In `src/app/pageStyles.scope.test.ts`, add:

```typescript
describe('anasayfa CTA butonu — pil yerine site standardı radius', () => {
  it('.ctaBtn artık tam pil (100px) değil, .primaryBtn/.secondaryBtn ile aynı 14px kullanmalı', () => {
    const match = pageCss.match(/\.ctaBtn\s*\{([^}]*)\}/);
    expect(match).not.toBeNull();
    expect(match![1]).not.toMatch(/border-radius:\s*100px/);
    expect(match![1]).toMatch(/border-radius:\s*14px/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/app/pageStyles.scope.test.ts -t "pil yerine site standardı"`
Expected: FAIL — `.ctaBtn` still has `border-radius: 100px`.

- [ ] **Step 3: Edit page.module.css**

Find (around line 1925):

```css
.ctaBtn {
  background: linear-gradient(135deg, var(--accent), var(--accent-2));
  color: white;
  padding: 1rem 2.5rem;
  border-radius: 100px;
  font-weight: 800;
  font-size: 1rem;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  transition: transform 0.2s, box-shadow 0.2s;
  box-shadow: 0 8px 24px rgba(31, 111, 235, 0.35);
  position: relative;
  z-index: 1;
}
```

Change `border-radius: 100px;` to `border-radius: 14px;`. Nothing else in this rule changes.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/app/pageStyles.scope.test.ts -t "pil yerine site standardı"`
Expected: PASS.

- [ ] **Step 5: Real production build**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 6: Commit**

```bash
git add src/app/page.module.css src/app/pageStyles.scope.test.ts
git commit -m "fix(homepage): restrain .ctaBtn to 14px radius, matching hero CTA buttons"
```

---

### Task 3: De-duplicate the "A+ Yapı İnşaat" demo scenario

**Files:**
- Modify: `src/app/page.tsx` (inside `FeaturesGrid`, Card 3 — "Akıllı Pazar Yeri", around lines 326-340)
- Test: Modify `src/app/pageStyles.scope.test.ts`

**Interfaces:**
- Consumes: nothing from other tasks.
- Produces: the exact text this task writes ("A+ Kuzey Yapı", "%44.5 Arsa Payı", "₺6.8M", "14 Ay", "4.7 • 24 Proje") is consumed by Task 8's icon-replacement step for the same lines — Task 8 must match against this task's final text, not the original.

**Context:** `FeaturesGrid`'s Card 3 widget (`.glassProposalWidget`) and the separate `HowItWorks` Step 3 box (`.realEstateDataBox` — "Müteahhit Tekliflerine Açın") both show the exact same fabricated offer: "A+ Yapı İnşaat", "⭐ 4.9 • 38 Proje Tamamlandı", "%50.0 Arsa Payı", "₺10.0M Onaylı Teminat Mektubu", "18 Ay Anahtar Teslim" — an unrelated section of the page (a general marketplace feature showcase) coincidentally showing the identical illustrative offer as a specific step-by-step tutorial elsewhere on the page. That reads as copy-pasted placeholder data. Note: the hero teaser widget and How-It-Works Steps 1-2 sharing the same example parcel (Kadıköy, 1.250 m², %50.0, ₺18.4M) is intentional continuity — the page is telling one story across those three widgets (input → report) — and is NOT touched by this task. Only Card 3's disconnected duplicate of Step 3's *offer* is a real duplication bug. The `.glassAvatar` "A+" badge is a verification-tier badge referenced elsewhere in the FAQ copy ("A+ Doğrulanmış Müteahhit") — it must stay "A+" (do not invent a new grade).

- [ ] **Step 1: Write the failing test**

In `src/app/pageStyles.scope.test.ts`, add:

```typescript
describe('anasayfa FeaturesGrid Card 3 — HowItWorks Step 3 ile aynı sahte teklif tekrarı düzeltildi', () => {
  it('Card 3 (Akıllı Pazar Yeri) artık "A+ Yapı İnşaat" firma adını kullanmamalı (Step 3 ile aynı isim)', () => {
    expect(pageTsx).not.toMatch(/A\+ Yapı İnşaat/);
  });

  it('Card 3 farklı bir A+ doğrulanmış firma adı kullanmalı: "A+ Kuzey Yapı"', () => {
    expect(pageTsx).toMatch(/A\+ Kuzey Yapı/);
  });

  it('Card 3 teklif oranı artık %50.0 değil, %44.5 olmalı', () => {
    expect(pageTsx).toMatch(/%44\.5 Arsa Payı/);
  });

  it('Card 3 teminat mektubu artık ₺10.0M değil, ₺6.8M olmalı', () => {
    expect(pageTsx).toMatch(/₺6\.8M Onaylı Teminat Mektubu/);
  });

  it('Card 3 teslim süresi artık 18 Ay değil, 14 Ay olmalı', () => {
    expect(pageTsx).toMatch(/14 Ay Anahtar Teslim/);
  });

  it('Card 3 puan/proje sayısı artık 4.9 • 38 değil, 4.7 • 24 olmalı', () => {
    expect(pageTsx).toMatch(/4\.7 • 24 Proje Tamamlandı/);
  });

  it('HowItWorks Step 3, kendi "A+ Yapı İnşaat" / %50 / ₺10.0M / 18 Ay verisini korumalı (bu görev onu değiştirmiyor)', () => {
    const stepThreeMatch = pageTsx.match(/Müteahhit Tekliflerine Açın[\s\S]{0,700}/);
    expect(stepThreeMatch).not.toBeNull();
    expect(stepThreeMatch![0]).toMatch(/A\+ Yapı İnşaat ✓/);
    expect(stepThreeMatch![0]).toMatch(/%50 Arsa Payı/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/app/pageStyles.scope.test.ts -t "sahte teklif tekrarı"`
Expected: FAIL — Card 3 still has the original duplicate text.

- [ ] **Step 3: Edit page.tsx**

Find, inside `FeaturesGrid`, Card 3 (around lines 326-340):

```tsx
            <div className={styles.glassAvatar}>A+</div>
              <div className={styles.builderMetaCol}>
                <span className={styles.builderTitle}>A+ Yapı İnşaat <span className={styles.verifiedCheck}>✓</span></span>
                <span className={styles.builderRating}>⭐ 4.9 • 38 Proje Tamamlandı</span>
              </div>
            </div>
            <div className={styles.glassOfferRow}>
              <span className={styles.offerLabel}>Kat Payı Teklifi:</span>
              <span className={styles.offerValue}>%50.0 Arsa Payı</span>
            </div>
            <div className={styles.offerSubMeta}>
              <span>🔒 ₺10.0M Onaylı Teminat Mektubu</span>
              <span>⏱️ 18 Ay Anahtar Teslim</span>
            </div>
```

Replace with:

```tsx
            <div className={styles.glassAvatar}>A+</div>
              <div className={styles.builderMetaCol}>
                <span className={styles.builderTitle}>A+ Kuzey Yapı <span className={styles.verifiedCheck}>✓</span></span>
                <span className={styles.builderRating}>⭐ 4.7 • 24 Proje Tamamlandı</span>
              </div>
            </div>
            <div className={styles.glassOfferRow}>
              <span className={styles.offerLabel}>Kat Payı Teklifi:</span>
              <span className={styles.offerValue}>%44.5 Arsa Payı</span>
            </div>
            <div className={styles.offerSubMeta}>
              <span>🔒 ₺6.8M Onaylı Teminat Mektubu</span>
              <span>⏱️ 14 Ay Anahtar Teslim</span>
            </div>
```

(The `🔒`/`⏱️` emoji stay for now — Task 8 replaces every emoji in the file in one pass, including these two, matching against this task's new text.)

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/app/pageStyles.scope.test.ts -t "sahte teklif tekrarı"`
Expected: PASS (7/7).

- [ ] **Step 5: Real production build**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 6: Commit**

```bash
git add src/app/page.tsx src/app/pageStyles.scope.test.ts
git commit -m "fix(homepage): de-duplicate FeaturesGrid Card 3's offer from HowItWorks Step 3"
```

---

### Task 4: Remove the fake phone-mockup frame and fake sequence numbers from bento cards

**Files:**
- Modify: `src/app/page.tsx` (`FeaturesGrid`, all 4 cards)
- Modify: `src/app/page.module.css` (`.mobileDeviceFrame`/`.mobileStatusBar`/`.mobileNotchPill`/`.bentoNum` rules, around lines 363-371 and 823-871)
- Test: Modify `src/app/pageStyles.scope.test.ts`

**Interfaces:**
- Consumes: Task 3's edited Card 3 text (must not reintroduce or clobber it).
- Produces: `.glassEngineWidget`/`.glassDonutWidget`/`.glassProposalWidget`/`.glassPdfWidget` become direct children of their card (no longer wrapped by `.mobileDeviceFrame`) — Task 8's icon work operates on content inside these same widgets and must be dispatched/reviewed against the post-Task-4 JSX.

- [ ] **Step 1: Write the failing test**

In `src/app/pageStyles.scope.test.ts`, add:

```typescript
describe('anasayfa bento kartları — sahte telefon mockup çerçevesi ve sahte sıra numaraları kaldırıldı', () => {
  it('.mobileDeviceFrame / .mobileStatusBar / .mobileNotchPill artık CSS\'te tanımlı değil', () => {
    expect(pageCss).not.toMatch(/\.mobileDeviceFrame\s*\{/);
    expect(pageCss).not.toMatch(/\.mobileStatusBar\s*\{/);
    expect(pageCss).not.toMatch(/\.mobileNotchPill\s*\{/);
  });

  it('.bentoNum artık CSS\'te tanımlı değil (paralel kartlarda sahte sıra numarasıydı)', () => {
    expect(pageCss).not.toMatch(/\.bentoNum\s*\{/);
  });

  it('page.tsx artık mobileDeviceFrame/mobileStatusBar/mobileNotchPill/bentoNum class\'larını kullanmıyor', () => {
    expect(pageTsx).not.toMatch(/styles\.mobileDeviceFrame/);
    expect(pageTsx).not.toMatch(/styles\.mobileStatusBar/);
    expect(pageTsx).not.toMatch(/styles\.mobileNotchPill/);
    expect(pageTsx).not.toMatch(/styles\.bentoNum/);
  });

  it('page.tsx sahte "09:41" saat metnini artık içermiyor', () => {
    expect(pageTsx).not.toMatch(/09:41/);
  });

  it('4 glass widget (engine/donut/proposal/pdf) kendi üst boşluğunu (margin-top) taşımalı, artık frame\'e bağımlı değil', () => {
    const match = pageCss.match(/\.glassEngineWidget,\s*\n\.glassDonutWidget,\s*\n\.glassProposalWidget,\s*\n\.glassPdfWidget\s*\{([^}]*)\}/);
    expect(match).not.toBeNull();
    expect(match![1]).toMatch(/margin-top:\s*1rem/);
  });

  it('page.tsx hâlâ 4 glass widget class\'ını (engine/donut/proposal/pdf) kullanıyor — sadece çerçeve kaldırıldı, içerik korundu', () => {
    expect(pageTsx).toMatch(/styles\.glassEngineWidget/);
    expect(pageTsx).toMatch(/styles\.glassDonutWidget/);
    expect(pageTsx).toMatch(/styles\.glassProposalWidget/);
    expect(pageTsx).toMatch(/styles\.glassPdfWidget/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/app/pageStyles.scope.test.ts -t "sahte telefon mockup"`
Expected: FAIL — frame classes and `.bentoNum` still exist.

- [ ] **Step 3: Edit page.tsx — remove the frame wrapper from all 4 cards, remove the 4 `.bentoNum` spans**

Card 1 (Engine v2) — find:

```tsx
            <div className={styles.bentoTop}>
              <span className={styles.bentoTag}>ENGINE V2 ALGORİTMASI</span>
              <span className={styles.bentoNum}>01</span>
            </div>
```

Replace with:

```tsx
            <div className={styles.bentoTop}>
              <span className={styles.bentoTag}>ENGINE V2 ALGORİTMASI</span>
            </div>
```

Then find (still Card 1):

```tsx
          {/* Mobile Device UX Screen Frame (Card 01) */}
          <div className={styles.mobileDeviceFrame}>
            <div className={styles.mobileStatusBar}>
              <span>09:41</span>
              <div className={styles.mobileNotchPill} />
              <span>5G 🔋</span>
            </div>
            <div className={styles.glassEngineWidget}>
```

Replace with:

```tsx
          <div className={styles.glassEngineWidget}>
```

And find the matching closing (still Card 1, after the `unitDistroPill` block):

```tsx
              <div className={styles.unitDistroPill}>
                <span>🏠 Arsa Sahibi: <strong>{landOwnerUnits} Daire</strong></span>
                <span>🏢 Müteahhit: <strong>{builderUnits} Daire</strong></span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
```

Replace with (one fewer closing `</div>` — the frame's is gone):

```tsx
              <div className={styles.unitDistroPill}>
                <span>🏠 Arsa Sahibi: <strong>{landOwnerUnits} Daire</strong></span>
                <span>🏢 Müteahhit: <strong>{builderUnits} Daire</strong></span>
              </div>
            </div>
        </div>
      </motion.div>
```

Card 2 (Detaylı Maliyet Analizi) — find:

```tsx
        <div className={styles.bentoTop}>
          <span className={styles.bentoTag}>360° FİNANSAL MODEL</span>
          <span className={styles.bentoNum}>02</span>
        </div>
```

Replace with:

```tsx
        <div className={styles.bentoTop}>
          <span className={styles.bentoTag}>360° FİNANSAL MODEL</span>
        </div>
```

Then find:

```tsx
        {/* Mobile Device UX Screen Frame (Card 02) */}
        <div className={styles.mobileDeviceFrame}>
          <div className={styles.mobileStatusBar}>
            <span>09:41</span>
            <div className={styles.mobileNotchPill} />
            <span>5G 🔋</span>
          </div>

          <div className={styles.glassDonutWidget}>
```

Replace with:

```tsx
        <div className={styles.glassDonutWidget}>
```

And find the matching closing (end of Card 2, after the legend grid):

```tsx
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── CARD 3: AKILLI PAZAR YERİ (Span 1) ── */}
```

Replace with (one fewer closing `</div>`):

```tsx
            </div>
        </div>
      </motion.div>

      {/* ── CARD 3: AKILLI PAZAR YERİ (Span 1) ── */}
```

Card 3 (Akıllı Pazar Yeri) — find:

```tsx
        <div className={styles.bentoTop}>
          <span className={styles.bentoTag}>MÜTEAHHİT PAZAR YERİ</span>
          <span className={styles.bentoNum}>03</span>
        </div>
```

Replace with:

```tsx
        <div className={styles.bentoTop}>
          <span className={styles.bentoTag}>MÜTEAHHİT PAZAR YERİ</span>
        </div>
```

Then find:

```tsx
        {/* Mobile Device UX Screen Frame (Card 03) */}
        <div className={styles.mobileDeviceFrame}>
          <div className={styles.mobileStatusBar}>
            <span>09:41</span>
            <div className={styles.mobileNotchPill} />
            <span>5G 🔋</span>
          </div>

          <div className={styles.glassProposalWidget}>
```

Replace with:

```tsx
        <div className={styles.glassProposalWidget}>
```

And find the matching closing (end of Card 3):

```tsx
            <div className={styles.glassActionPill}>Teklifi İncele & Mesaj Gönder →</div>
          </div>
        </div>
      </motion.div>

      {/* ── CARD 4: GÜVENLİ & HIZLI (Wide, Span 2) ── */}
```

Replace with:

```tsx
            <div className={styles.glassActionPill}>Teklifi İncele & Mesaj Gönder →</div>
        </div>
      </motion.div>

      {/* ── CARD 4: GÜVENLİ & HIZLI (Wide, Span 2) ── */}
```

Card 4 (Güvenli & Hızlı PDF Rapor) — find:

```tsx
            <div className={styles.bentoTop}>
              <span className={styles.bentoTag}>SANİYELER İÇİNDE ROL ALIN</span>
              <span className={styles.bentoNum}>04</span>
            </div>
```

Replace with:

```tsx
            <div className={styles.bentoTop}>
              <span className={styles.bentoTag}>SANİYELER İÇİNDE ROL ALIN</span>
            </div>
```

Then find:

```tsx
          {/* Mobile Device UX Screen Frame (Card 04) */}
          <div className={styles.mobileDeviceFrame}>
            <div className={styles.mobileStatusBar}>
              <span>09:41</span>
              <div className={styles.mobileNotchPill} />
              <span>5G 🔋</span>
            </div>

            <div className={styles.glassPdfWidget}>
```

Replace with:

```tsx
          <div className={styles.glassPdfWidget}>
```

And find the matching closing (end of Card 4, and the end of the whole `FeaturesGrid` return):

```tsx
              <div className={styles.glassPdfBtn}>
                <span>PDF Raporunu İndir</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
```

Replace with (one fewer closing `</div>`):

```tsx
              <div className={styles.glassPdfBtn}>
                <span>PDF Raporunu İndir</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
              </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
```

**After this step, run `npx tsc --noEmit` (or open the file) and fix any div-nesting mismatch reported — the exact indentation above is illustrative, JSX only cares about matched open/close tags, not indentation. Count opening vs. closing `<div>` for each card and make sure they're equal.**

- [ ] **Step 4: Edit page.module.css — delete `.bentoNum`, delete the mockup-frame block, add margin-top to the 4 widgets**

Delete the `.bentoNum` rule (around line 363-371):

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

Delete this entire block (around line 823-871):

```css
/* ══════════════════════════════════════════
   MOBILE DEVICE UX MOCKUP FRAMES
═══════════════════════════════════════════ */
.mobileDeviceFrame {
  background: rgba(15, 23, 42, 0.45);
  border: 1.5px solid rgba(31, 111, 235, 0.28);
  border-radius: 28px;
  overflow: hidden;
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.25), inset 0 0 0 1px rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  display: flex;
  flex-direction: column;
  margin-top: 1rem;
}

:global([data-theme='light']) .mobileDeviceFrame {
  background: rgba(255, 255, 255, 0.55);
  border-color: rgba(31, 111, 235, 0.22);
  box-shadow: 0 14px 36px rgba(31, 111, 235, 0.1), inset 0 0 0 1px rgba(31, 111, 235, 0.12);
}

.mobileStatusBar {
  padding: 8px 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.68rem;
  font-weight: 800;
  color: var(--muted);
  background: rgba(0, 0, 0, 0.1);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

:global([data-theme='light']) .mobileStatusBar {
  background: rgba(0, 0, 0, 0.03);
  border-bottom-color: rgba(0, 0, 0, 0.06);
}

.mobileNotchPill {
  width: 44px;
  height: 4px;
  background: rgba(255, 255, 255, 0.25);
  border-radius: 100px;
}

:global([data-theme='light']) .mobileNotchPill {
  background: rgba(0, 0, 0, 0.2);
}
```

Replace it with:

```css
/* ══════════════════════════════════════════
   BENTO CARD GLASS WIDGETS — TOP SPACING
   (frame kaldırıldı, widget'lar artık kartın
   doğrudan çocuğu; eski frame'in margin-top'ını
   burada devralıyorlar)
═══════════════════════════════════════════ */
.glassEngineWidget,
.glassDonutWidget,
.glassProposalWidget,
.glassPdfWidget {
  margin-top: 1rem;
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx jest src/app/pageStyles.scope.test.ts -t "sahte telefon mockup"`
Expected: PASS (6/6).

- [ ] **Step 6: Run the full homepage test file to catch collateral breaks**

Run: `npx jest src/app/pageStyles.scope.test.ts`
Expected: all tests pass — if any older test referenced `.bentoNum`/`.mobileDeviceFrame` text content, fix it here.

- [ ] **Step 7: Real production build**

Run: `npm run build`
Expected: build succeeds — this step also catches any unbalanced JSX tags from Step 3 that `tsc`/webpack didn't (Turbopack's JSX parser errors are clearer than a silent visual bug).

- [ ] **Step 8: Commit**

```bash
git add src/app/page.tsx src/app/page.module.css src/app/pageStyles.scope.test.ts
git commit -m "fix(homepage): remove fake phone-mockup frame and fake sequence numbers from bento cards"
```

---

### Task 5: How It Works — replace the 3-equal-column grid with an alternating (zig-zag) layout

**Files:**
- Modify: `src/app/page.module.css` (`.howItWorksGrid`, `.howStepCard`, `.howStepImageContainer` rules around lines 1269-1319, plus the `@media (max-width: 640px)` block around line 1972)
- Test: Modify `src/app/pageStyles.scope.test.ts`

**Interfaces:**
- Consumes: nothing from other tasks (no JSX change needed — the zig-zag is pure CSS via `:nth-child`).
- Produces: nothing consumed by later tasks.

- [ ] **Step 1: Write the failing test**

In `src/app/pageStyles.scope.test.ts`, add:

```typescript
describe('anasayfa How It Works — 3 eşit sütun yerine zig-zag düzen', () => {
  it('.howItWorksGrid artık 3 eşit sütun değil, dikey akış (flex column)', () => {
    const match = pageCss.match(/\.howItWorksGrid\s*\{([^}]*)\}/);
    expect(match).not.toBeNull();
    expect(match![1]).not.toMatch(/grid-template-columns/);
    expect(match![1]).toMatch(/flex-direction:\s*column/);
  });

  it('.howStepCard artık 2 sütunlu grid (görsel + içerik yan yana)', () => {
    const match = pageCss.match(/\.howStepCard\s*\{([^}]*)\}/);
    expect(match).not.toBeNull();
    expect(match![1]).toMatch(/display:\s*grid/);
    expect(match![1]).toMatch(/grid-template-columns:\s*1fr 1fr/);
  });

  it('çift sıradaki adım kartlarında görsel/içerik yer değiştirmeli (zig-zag)', () => {
    expect(pageCss).toMatch(/\.howStepCard:nth-child\(even\)\s+\.howStepImageContainer\s*\{[^}]*order:\s*2/);
    expect(pageCss).toMatch(/\.howStepCard:nth-child\(even\)\s+\.howStepContent\s*\{[^}]*order:\s*1/);
  });

  it('mobilde (max-width:640px) .howStepCard tek sütuna döner ve zig-zag sıfırlanır', () => {
    const mobileSection = pageCss.match(/@media \(max-width: 640px\) \{([\s\S]*?)\n\}/);
    expect(mobileSection).not.toBeNull();
    expect(mobileSection![1]).toMatch(/\.howStepCard\s*\{[^}]*grid-template-columns:\s*1fr/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/app/pageStyles.scope.test.ts -t "zig-zag düzen"`
Expected: FAIL.

- [ ] **Step 3: Edit page.module.css**

Find (around line 1269-1273):

```css
.howItWorksGrid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;
}
```

Replace with:

```css
.howItWorksGrid {
  display: flex;
  flex-direction: column;
  gap: 3rem;
}
```

Find (around line 1275-1285):

```css
.howStepCard {
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 24px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  transition: transform 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease;
}
```

Replace with:

```css
.howStepCard {
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 24px;
  overflow: hidden;
  display: grid;
  grid-template-columns: 1fr 1fr;
  align-items: stretch;
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  transition: transform 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease;
}

.howStepCard:nth-child(even) .howStepImageContainer {
  order: 2;
}

.howStepCard:nth-child(even) .howStepContent {
  order: 1;
}
```

Find (around line 1302-1307):

```css
.howStepImageContainer {
  width: 100%;
  aspect-ratio: 4 / 3;
  overflow: hidden;
  background: var(--panel-2);
}
```

Replace with:

```css
.howStepImageContainer {
  width: 100%;
  height: 100%;
  min-height: 320px;
  overflow: hidden;
  background: var(--panel-2);
}
```

Find, inside `@media (max-width: 640px) { ... }` (around line 1972):

```css
  .howItWorksGrid { grid-template-columns: 1fr; }
```

Replace with:

```css
  .howStepCard {
    grid-template-columns: 1fr;
  }

  .howStepCard:nth-child(even) .howStepImageContainer,
  .howStepCard:nth-child(even) .howStepContent {
    order: initial;
  }

  .howStepImageContainer {
    min-height: 200px;
  }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/app/pageStyles.scope.test.ts -t "zig-zag düzen"`
Expected: PASS (4/4).

- [ ] **Step 5: Real production build**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 6: Commit**

```bash
git add src/app/page.module.css src/app/pageStyles.scope.test.ts
git commit -m "fix(homepage): replace How-It-Works 3-column grid with alternating zig-zag layout"
```

---

### Task 6: Blog grid — replace the 3-equal-column grid with a featured + stacked layout

**Files:**
- Modify: `src/app/page.module.css` (`.blogGrid` around line 1783-1787, `.blogImageContainer` around line 1803-1809, plus the `@media (max-width: 640px)` block)
- Test: Modify `src/app/pageStyles.scope.test.ts`

**Interfaces:**
- Consumes: nothing from other tasks (no JSX change — `.blogCard:first-child` picks the featured post automatically).
- Produces: nothing consumed by later tasks.

- [ ] **Step 1: Write the failing test**

In `src/app/pageStyles.scope.test.ts`, add:

```typescript
describe('anasayfa Blog grid — 3 eşit sütun yerine öne çıkan + yığın düzeni', () => {
  it('.blogGrid artık auto-fit 3\'lü değil, 1.4fr/1fr asimetrik 2 sütun', () => {
    const match = pageCss.match(/\.blogGrid\s*\{([^}]*)\}/);
    expect(match).not.toBeNull();
    expect(match![1]).not.toMatch(/auto-fit/);
    expect(match![1]).toMatch(/grid-template-columns:\s*1\.4fr 1fr/);
  });

  it('ilk blog kartı (öne çıkan) 2 satır boyunca uzanmalı (grid-row: 1 \\/ 3)', () => {
    expect(pageCss).toMatch(/\.blogGrid \.blogCard:first-child\s*\{[^}]*grid-row:\s*1 \/ 3/);
  });

  it('öne çıkan kartın görseli daha uzun olmalı (280px)', () => {
    expect(pageCss).toMatch(/\.blogGrid \.blogCard:first-child \.blogImageContainer\s*\{[^}]*height:\s*280px/);
  });

  it('mobilde (max-width:640px) blog grid tek sütuna döner, öne çıkan kart özel span\'ı sıfırlanır', () => {
    const mobileSection = pageCss.match(/@media \(max-width: 640px\) \{([\s\S]*?)\n\}/);
    expect(mobileSection).not.toBeNull();
    expect(mobileSection![1]).toMatch(/\.blogGrid\s*\{[^}]*grid-template-columns:\s*1fr/);
    expect(mobileSection![1]).toMatch(/\.blogGrid \.blogCard:first-child\s*\{[^}]*grid-row:\s*auto/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/app/pageStyles.scope.test.ts -t "öne çıkan + yığın"`
Expected: FAIL.

- [ ] **Step 3: Edit page.module.css**

Find (around line 1783-1787):

```css
.blogGrid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem;
}
```

Replace with:

```css
.blogGrid {
  display: grid;
  grid-template-columns: 1.4fr 1fr;
  grid-template-rows: 1fr 1fr;
  gap: 2rem;
}

.blogGrid .blogCard:first-child {
  grid-row: 1 / 3;
}

.blogGrid .blogCard:first-child .blogImageContainer {
  height: 280px;
}
```

Find, inside `@media (max-width: 640px) { ... }` (after the `.howItWorksGrid`-replacement block added in Task 5), add:

```css
  .blogGrid {
    grid-template-columns: 1fr;
    grid-template-rows: none;
  }

  .blogGrid .blogCard:first-child {
    grid-row: auto;
  }

  .blogGrid .blogCard:first-child .blogImageContainer {
    height: 190px;
  }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/app/pageStyles.scope.test.ts -t "öne çıkan + yığın"`
Expected: PASS (4/4).

- [ ] **Step 5: Real production build**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 6: Commit**

```bash
git add src/app/page.module.css src/app/pageStyles.scope.test.ts
git commit -m "fix(homepage): replace blog 3-column grid with featured-post + stacked layout"
```

---

### Task 7: FAQ — replace the accordion with a two-column question list + answer panel

**Files:**
- Modify: `src/app/page.tsx` (`FaqAccordion` function, lines 538-589)
- Modify: `src/app/page.module.css` (delete `.faqList`/`.faqItem`/`.faqOpen`/`.faqQuestionRow`/`.faqQuestion`/`.faqToggleIcon`/`.faqAnswer` around lines 1673-1762; add new rules; add mobile override)
- Test: Modify `src/app/pageStyles.scope.test.ts`

**Interfaces:**
- Consumes: nothing from other tasks.
- Produces: nothing consumed by later tasks (FAQ copy has no emoji, so Task 8 does not touch this section).

- [ ] **Step 1: Write the failing test**

In `src/app/pageStyles.scope.test.ts`, add:

```typescript
describe('anasayfa FAQ — accordion yerine iki sütunlu soru/cevap düzeni', () => {
  it('eski accordion class\'ları (.faqList/.faqItem/.faqOpen) artık CSS\'te yok', () => {
    expect(pageCss).not.toMatch(/\.faqList\s*\{/);
    expect(pageCss).not.toMatch(/\.faqItem\s*\{/);
    expect(pageCss).not.toMatch(/\.faqOpen\s*\{/);
  });

  it('yeni .faqLayout iki sütunlu grid olmalı', () => {
    const match = pageCss.match(/\.faqLayout\s*\{([^}]*)\}/);
    expect(match).not.toBeNull();
    expect(match![1]).toMatch(/display:\s*grid/);
    expect(match![1]).toMatch(/grid-template-columns:\s*1fr 1\.3fr/);
  });

  it('.faqQuestionBtnActive seçili soruyu vurgulamalı (primary renk + sol kenarlık)', () => {
    const match = pageCss.match(/\.faqQuestionBtnActive\s*\{([^}]*)\}/);
    expect(match).not.toBeNull();
    expect(match![1]).toMatch(/color:\s*var\(--primary\)/);
    expect(match![1]).toMatch(/border-left-color:\s*var\(--primary\)/);
  });

  it('mobilde (max-width:640px) .faqLayout tek sütuna döner', () => {
    const mobileSection = pageCss.match(/@media \(max-width: 640px\) \{([\s\S]*?)\n\}/);
    expect(mobileSection).not.toBeNull();
    expect(mobileSection![1]).toMatch(/\.faqLayout\s*\{[^}]*grid-template-columns:\s*1fr/);
  });

  it('page.tsx artık eski faqList/faqItem/faqOpen class\'larını kullanmıyor', () => {
    expect(pageTsx).not.toMatch(/styles\.faqList/);
    expect(pageTsx).not.toMatch(/styles\.faqItem/);
    expect(pageTsx).not.toMatch(/styles\.faqOpen/);
  });

  it('page.tsx yeni faqLayout/faqQuestionList/faqQuestionBtn/faqAnswerPanel class\'larını kullanıyor', () => {
    expect(pageTsx).toMatch(/styles\.faqLayout/);
    expect(pageTsx).toMatch(/styles\.faqQuestionList/);
    expect(pageTsx).toMatch(/styles\.faqQuestionBtn/);
    expect(pageTsx).toMatch(/styles\.faqAnswerPanel/);
  });

  it('4 soru metni (Engine v2, ücretsiz mi, A+ Doğrulama, PDF resmî) hâlâ mevcut olmalı — içerik korunmalı', () => {
    expect(pageTsx).toMatch(/Engine v2 arsa payı oranını neye göre hesaplıyor\?/);
    expect(pageTsx).toMatch(/A\+ Doğrulama\)/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/app/pageStyles.scope.test.ts -t "iki sütunlu soru/cevap"`
Expected: FAIL.

- [ ] **Step 3: Edit page.tsx**

Find the entire `FaqAccordion` function (lines 538-589):

```tsx
/* ── FAQ Accordion Section ── */
function FaqAccordion() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs = [
    {
      q: 'Engine v2 arsa payı oranını neye göre hesaplıyor?',
      a: 'Engine v2 motoru; arsanızın m² büyüklüğü, emsal/KATS değeri, bölgesel birim inşaat maliyetleri (TL/m²), lüks sınıf katsayısı ve müteahhit kâr marjını hesaba katarak en adil kat karşılığı arsa payını bilimsel formüllerle anında hesaplar.'
    },
    {
      q: 'Arsa sahibi olarak ilan vermek ve rapor almak ücretsiz mi?',
      a: 'Evet! Arsa sahipleri temel fizibilite raporlarını ve pazar yeri ilanlarını tamamen ücretsiz olarak oluşturabilir ve doğrulanmış müteahhitlerin teklifine açabilir.'
    },
    {
      q: 'Müteahhitlerin doğrulanması (A+ Doğrulama) nasıl yapılıyor?',
      a: 'Platformumuza üye olan müteahhitler; vergi levhası, ticaret sicil gazetesi, tamamlanan geçmiş proje portföyleri ve yetki belgeleri kontrol edildikten sonra A+ Doğrulanmış Müteahhit rozeti almaya hak kazanırlar.'
    },
    {
      q: 'Oluşturulan PDF raporları resmî görüşmelerde kullanılabilir mi?',
      a: 'Evet. Üretilen kurumsal PDF raporları; arsa sahipleri ile müteahhitler arasındaki kat karşılığı ön görüşmelerinde, banka fizibilite toplantılarında ve değerleme süreçlerinde resmi referans belgesi olarak kullanılabilir.'
    }
  ];

  return (
    <div className={styles.faqList}>
      {faqs.map((faq, idx) => {
        const isOpen = openIndex === idx;
        return (
          <div
            key={idx}
            className={`${styles.faqItem} ${isOpen ? styles.faqOpen : ''}`}
            onClick={() => setOpenIndex(isOpen ? null : idx)}
          >
            <div className={styles.faqQuestionRow}>
              <span className={styles.faqQuestion}>{faq.q}</span>
              <span className={styles.faqToggleIcon}>{isOpen ? '−' : '+'}</span>
            </div>
            {isOpen && (
              <motion.p
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                transition={{ duration: 0.25 }}
                className={styles.faqAnswer}
              >
                {faq.a}
              </motion.p>
            )}
          </div>
        );
      })}
    </div>
  );
}
```

Replace with:

```tsx
/* ── FAQ Two-Column Section ── */
function FaqAccordion() {
  const [activeIndex, setActiveIndex] = useState<number>(0);

  const faqs = [
    {
      q: 'Engine v2 arsa payı oranını neye göre hesaplıyor?',
      a: 'Engine v2 motoru; arsanızın m² büyüklüğü, emsal/KATS değeri, bölgesel birim inşaat maliyetleri (TL/m²), lüks sınıf katsayısı ve müteahhit kâr marjını hesaba katarak en adil kat karşılığı arsa payını bilimsel formüllerle anında hesaplar.'
    },
    {
      q: 'Arsa sahibi olarak ilan vermek ve rapor almak ücretsiz mi?',
      a: 'Evet! Arsa sahipleri temel fizibilite raporlarını ve pazar yeri ilanlarını tamamen ücretsiz olarak oluşturabilir ve doğrulanmış müteahhitlerin teklifine açabilir.'
    },
    {
      q: 'Müteahhitlerin doğrulanması (A+ Doğrulama) nasıl yapılıyor?',
      a: 'Platformumuza üye olan müteahhitler; vergi levhası, ticaret sicil gazetesi, tamamlanan geçmiş proje portföyleri ve yetki belgeleri kontrol edildikten sonra A+ Doğrulanmış Müteahhit rozeti almaya hak kazanırlar.'
    },
    {
      q: 'Oluşturulan PDF raporları resmî görüşmelerde kullanılabilir mi?',
      a: 'Evet. Üretilen kurumsal PDF raporları; arsa sahipleri ile müteahhitler arasındaki kat karşılığı ön görüşmelerinde, banka fizibilite toplantılarında ve değerleme süreçlerinde resmi referans belgesi olarak kullanılabilir.'
    }
  ];

  return (
    <div className={styles.faqLayout}>
      <div className={styles.faqQuestionList}>
        {faqs.map((faq, idx) => (
          <button
            key={idx}
            type="button"
            className={`${styles.faqQuestionBtn} ${activeIndex === idx ? styles.faqQuestionBtnActive : ''}`}
            onClick={() => setActiveIndex(idx)}
          >
            {faq.q}
          </button>
        ))}
      </div>
      <motion.div
        key={activeIndex}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className={styles.faqAnswerPanel}
      >
        <p className={styles.faqAnswerText}>{faqs[activeIndex].a}</p>
      </motion.div>
    </div>
  );
}
```

- [ ] **Step 4: Edit page.module.css**

Delete this entire block (around line 1670-1762, from the `FAQ ACCORDION` header comment through `.faqAnswer`'s light-theme override):

```css
/* ══════════════════════════════════════════
   FAQ ACCORDION
═══════════════════════════════════════════ */
.faqList {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-width: 800px;
  margin: 0 auto;
}

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

:global([data-theme='light']) .faqItem {
  background:
    repeating-linear-gradient(0deg, rgba(31, 111, 235, 0.03) 0 1px, transparent 1px 20px),
    repeating-linear-gradient(90deg, rgba(31, 111, 235, 0.03) 0 1px, transparent 1px 20px),
    linear-gradient(165deg, rgba(219, 234, 254, 0.34), rgba(255, 255, 255, 0.24));
  border-color: rgba(31, 111, 235, 0.22);
  /* Light cam reçetesi .visionCard / .ctaSection ile aynı üç katmanlı yapıda:
     dış difüz gölge + halka + iç parıltı. Difüz gölgenin değeri onlardan daha
     düşük (8px/22px/0.06 — orada 12-20px/32-50px/0.08): FAQ satırları küçük ve
     alt alta 6 kez tekrar ediyor, aynı yoğunluk listeyi ağırlaştırıyordu. */
  box-shadow:
    0 8px 22px rgba(31, 111, 235, 0.06),
    0 0 0 1px rgba(31, 111, 235, 0.16),
    inset 0 1px 0 rgba(255, 255, 255, 0.85);
}

.faqItem:hover {
  border-color: rgba(31, 111, 235, 0.4);
}

.faqOpen {
  border-color: var(--primary);
  background:
    repeating-linear-gradient(0deg, rgba(31, 111, 235, 0.04) 0 1px, transparent 1px 20px),
    repeating-linear-gradient(90deg, rgba(31, 111, 235, 0.04) 0 1px, transparent 1px 20px),
    linear-gradient(135deg, rgba(31, 111, 235, 0.1), rgba(31, 111, 235, 0.03));
}

:global([data-theme='light']) .faqItem.faqOpen {
  border-color: var(--primary);
  background:
    repeating-linear-gradient(0deg, rgba(31, 111, 235, 0.03) 0 1px, transparent 1px 20px),
    repeating-linear-gradient(90deg, rgba(31, 111, 235, 0.03) 0 1px, transparent 1px 20px),
    linear-gradient(135deg, rgba(31, 111, 235, 0.10), rgba(31, 111, 235, 0.04));
}

.faqQuestionRow {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}

.faqQuestion {
  font-size: 1.05rem;
  font-weight: 800;
  color: var(--card-title);
}

.faqToggleIcon {
  font-size: 1.4rem;
  font-weight: 800;
  color: var(--primary);
  line-height: 1;
}

.faqAnswer {
  font-size: 0.92rem;
  line-height: 1.65;
  color: var(--muted);
  margin-top: 0.85rem;
  padding-top: 0.85rem;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

:global([data-theme='light']) .faqAnswer {
  border-top-color: rgba(0, 0, 0, 0.06);
}
```

Replace with:

```css
/* ══════════════════════════════════════════
   FAQ TWO-COLUMN
═══════════════════════════════════════════ */
.faqLayout {
  display: grid;
  grid-template-columns: 1fr 1.3fr;
  gap: 2.5rem;
  max-width: 1000px;
  margin: 0 auto;
  align-items: start;
}

.faqQuestionList {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.faqQuestionBtn {
  text-align: left;
  background: transparent;
  border: none;
  border-left: 3px solid transparent;
  padding: 0.85rem 1rem;
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--muted);
  cursor: pointer;
  transition: all 0.2s ease;
}

.faqQuestionBtn:hover {
  color: var(--card-title);
  background: rgba(31, 111, 235, 0.05);
}

.faqQuestionBtnActive {
  color: var(--primary);
  border-left-color: var(--primary);
  background: rgba(31, 111, 235, 0.08);
}

.faqAnswerPanel {
  background:
    repeating-linear-gradient(0deg, rgba(31, 111, 235, 0.04) 0 1px, transparent 1px 20px),
    repeating-linear-gradient(90deg, rgba(31, 111, 235, 0.04) 0 1px, transparent 1px 20px),
    rgba(31, 111, 235, 0.05);
  border: 1px solid rgba(31, 111, 235, 0.18);
  border-radius: 20px;
  padding: 2rem;
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  min-height: 200px;
}

:global([data-theme='light']) .faqAnswerPanel {
  background:
    repeating-linear-gradient(0deg, rgba(31, 111, 235, 0.03) 0 1px, transparent 1px 20px),
    repeating-linear-gradient(90deg, rgba(31, 111, 235, 0.03) 0 1px, transparent 1px 20px),
    linear-gradient(165deg, rgba(219, 234, 254, 0.34), rgba(255, 255, 255, 0.24));
  border-color: rgba(31, 111, 235, 0.22);
  box-shadow:
    0 8px 22px rgba(31, 111, 235, 0.06),
    0 0 0 1px rgba(31, 111, 235, 0.16),
    inset 0 1px 0 rgba(255, 255, 255, 0.85);
}

.faqAnswerText {
  font-size: 1rem;
  line-height: 1.75;
  color: var(--text);
}
```

Then, inside `@media (max-width: 640px) { ... }`, add:

```css
  .faqLayout {
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx jest src/app/pageStyles.scope.test.ts -t "iki sütunlu soru/cevap"`
Expected: PASS (7/7).

- [ ] **Step 6: Run the full homepage test file**

Run: `npx jest src/app/pageStyles.scope.test.ts`
Expected: all tests pass.

- [ ] **Step 7: Real production build**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 8: Commit**

```bash
git add src/app/page.tsx src/app/page.module.css src/app/pageStyles.scope.test.ts
git commit -m "fix(homepage): replace FAQ accordion with two-column question list + answer panel"
```

---

### Task 8: Install Phosphor Icons and replace every emoji-as-icon in page.tsx

**Files:**
- Modify: `package.json` (add `@phosphor-icons/react`)
- Modify: `src/app/page.tsx` (imports + every emoji occurrence listed below)
- Modify: `src/app/page.module.css` (add `.inlineIcon` utility; adapt `.verifiedCheck`)
- Test: Modify `src/app/pageStyles.scope.test.ts`

**Interfaces:**
- Consumes: Task 3's final Card 3 text ("A+ Kuzey Yapı", "%44.5", "₺6.8M", "14 Ay"), Task 4's post-frame-removal JSX structure — this task's emoji occurrences must be located against the file as those tasks left it, not the original.
- Produces: nothing consumed by later tasks (last task in the plan).

**Full replacement table** (emoji → Phosphor icon, all using the shared `.inlineIcon` class and `size={14} weight="bold"` unless noted):

| Location | Old text | New JSX |
|---|---|---|
| Card 1 `.miniPill` #1 | `⚡ Dynamic Calculation Engine` | `<Lightning className={styles.inlineIcon} size={14} weight="bold" />Dynamic Calculation Engine` |
| Card 1 `.miniPill` #2 | `📊 12.000+ Rapor Verisi` | `<ChartBar className={styles.inlineIcon} size={14} weight="bold" />12.000+ Rapor Verisi` |
| Card 1 `.unitDistroPill` #1 | `🏠 Arsa Sahibi: ...` | `<House className={styles.inlineIcon} size={14} weight="bold" />Arsa Sahibi: ...` |
| Card 1 `.unitDistroPill` #2 | `🏢 Müteahhit: ...` | `<Buildings className={styles.inlineIcon} size={14} weight="bold" />Müteahhit: ...` |
| Card 3 `.verifiedCheck` | `✓` | `<CheckCircle className={styles.verifiedCheck} size={16} weight="fill" />` (replaces the `<span className={styles.verifiedCheck}>✓</span>` entirely — icon takes the class directly, no wrapping span) |
| Card 3 `.builderRating` | `⭐ 4.7 • 24 Proje Tamamlandı` | `<Star className={styles.inlineIcon} size={14} weight="fill" />4.7 • 24 Proje Tamamlandı` |
| Card 3 offerSubMeta #1 | `🔒 ₺6.8M Onaylı Teminat Mektubu` | `<Lock className={styles.inlineIcon} size={14} weight="bold" />₺6.8M Onaylı Teminat Mektubu` |
| Card 3 offerSubMeta #2 | `⏱️ 14 Ay Anahtar Teslim` | `<Clock className={styles.inlineIcon} size={14} weight="bold" />14 Ay Anahtar Teslim` |
| Card 4 `.miniPill` #1 | `🔒 256-Bit TLS Şifreleme` | `<Lock className={styles.inlineIcon} size={14} weight="bold" />256-Bit TLS Şifreleme` |
| Card 4 `.miniPill` #2 | `📄 Anında PDF İndir` | `<FilePdf className={styles.inlineIcon} size={14} weight="bold" />Anında PDF İndir` |
| Card 4 `.pdfIcon` | `<span className={styles.pdfIcon}>📄</span>` | `<FilePdf className={styles.pdfIcon} size={20} weight="duotone" />` |
| Card 4 `.tkgmSeal` | `✓ TKGM KATMANI` | `<CheckCircle className={styles.inlineIcon} size={12} weight="bold" />TKGM KATMANI` |
| Hero `.teaserSearchIcon` | `<span className={styles.teaserSearchIcon}>🔍</span>` | `<MagnifyingGlass className={styles.teaserSearchIcon} size={16} weight="bold" />` |
| Vision card 1 `.visionTag` | `🏛️ GELECEK VİZYONU` | `<Bank className={styles.inlineIcon} size={14} weight="bold" />GELECEK VİZYONU` |
| Vision card 1 `.visionPill` ×3 | `✓ %100 Doğrulanmış Kadastro Verisi` (and the other two) | `<CheckCircle className={styles.inlineIcon} size={14} weight="bold" />%100 Doğrulanmış Kadastro Verisi` (same pattern for the other two pills) |
| Vision card 2 `.visionTag` | `⚖️ KURUMSAL MİSYON` | `<Scales className={styles.inlineIcon} size={14} weight="bold" />KURUMSAL MİSYON` |
| Vision card 2 `.visionPill` ×3 | `✓ Güvenli Sözleşme Dengesi` (and the other two) | `<CheckCircle className={styles.inlineIcon} size={14} weight="bold" />Güvenli Sözleşme Dengesi` (same pattern for the other two) |
| CTA `.ctaTrustPill` ×3 | `✓ Kredi Kartı Gerekmez` (and the other two) | `<CheckCircle className={styles.inlineIcon} size={14} weight="bold" />Kredi Kartı Gerekmez` (same pattern for the other two) |

- [ ] **Step 1: Write the failing test**

In `src/app/pageStyles.scope.test.ts`, add:

```typescript
describe('anasayfa — emoji ikonlar Phosphor React ikonlarıyla değiştirildi', () => {
  const bannedEmoji = ['⚡', '📊', '🏠', '🏢', '⭐', '🔒', '📄', '✓', '🏛️', '⚖️', '🔍', '⏱️'];

  it('page.tsx artık listelenen fonksiyonel emojilerin hiçbirini içermemeli', () => {
    for (const emoji of bannedEmoji) {
      expect(pageTsx).not.toContain(emoji);
    }
  });

  it('page.tsx @phosphor-icons/react\'ten ikon import etmeli', () => {
    expect(pageTsx).toMatch(/from ['"]@phosphor-icons\/react['"]/);
  });

  it('.inlineIcon paylaşılan yardımcı sınıfı tanımlı olmalı', () => {
    const match = pageCss.match(/\.inlineIcon\s*\{([^}]*)\}/);
    expect(match).not.toBeNull();
    expect(match![1]).toMatch(/display:\s*inline-block/);
  });

  it('package.json @phosphor-icons/react bağımlılığını içermeli', () => {
    const pkg = fs.readFileSync(path.join(__dirname, '..', '..', '..', 'package.json'), 'utf8');
    expect(pkg).toMatch(/"@phosphor-icons\/react"/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/app/pageStyles.scope.test.ts -t "Phosphor React ikonlarıyla"`
Expected: FAIL — emoji still present, package not installed, `.inlineIcon` doesn't exist.

- [ ] **Step 3: Install the package**

Run: `npm install @phosphor-icons/react`

- [ ] **Step 4: Add the icon import to page.tsx**

At the top of `src/app/page.tsx`, after the existing `import { motion, type Variants } from 'framer-motion';` line, add:

```tsx
import {
  Lightning,
  ChartBar,
  House,
  Buildings,
  CheckCircle,
  Star,
  Lock,
  Clock,
  FilePdf,
  MagnifyingGlass,
  Bank,
  Scales,
} from '@phosphor-icons/react';
```

- [ ] **Step 5: Apply every replacement from the table above**

Work through the table top to bottom, editing the exact JSX at each location. For the three `.visionPill` triads and the three `.ctaTrustPill` triads, apply the same `<CheckCircle className={styles.inlineIcon} size={14} weight="bold" />` prefix to each of the three lines individually (the table shows one example per group; all three siblings in each group get the identical treatment, only their trailing text differs).

- [ ] **Step 6: Add the `.inlineIcon` utility class and adapt `.verifiedCheck` in page.module.css**

Add near the top of the bento section (right after the `.bentoDesc` rule, around line 415, before `/* ── Alt badge ── */`):

```css
.inlineIcon {
  display: inline-block;
  vertical-align: -2px;
  margin-right: 4px;
  flex-shrink: 0;
}
```

Find the existing `.verifiedCheck` rule and confirm it works as an icon wrapper (add `display: inline-block; vertical-align: -3px;` if those properties aren't already present — check the current rule content before editing, since it previously styled a text checkmark and may already have compatible sizing).

- [ ] **Step 7: Run test to verify it passes**

Run: `npx jest src/app/pageStyles.scope.test.ts -t "Phosphor React ikonlarıyla"`
Expected: PASS (4/4).

- [ ] **Step 8: Run the full homepage test file**

Run: `npx jest src/app/pageStyles.scope.test.ts`
Expected: all tests pass — this also re-validates Task 3's and Task 4's tests against the final icon-swapped JSX.

- [ ] **Step 9: Real production build**

Run: `npm run build`
Expected: build succeeds — this is the step that actually proves `@phosphor-icons/react`'s exports and JSX are valid; Jest's regex tests can't catch a typo'd import name.

- [ ] **Step 10: Commit**

```bash
git add package.json package-lock.json src/app/page.tsx src/app/page.module.css src/app/pageStyles.scope.test.ts
git commit -m "feat(homepage): replace emoji-as-icons with Phosphor React icon components"
```

---

## Final Verification (after all 8 tasks)

- [ ] Run the entire homepage test file once more: `npx jest src/app/pageStyles.scope.test.ts` — expect all tests (old + new) to pass.
- [ ] Run `npm run build` one final time on the fully merged state.
- [ ] Start `npm run dev`, open `/` in a browser, and visually check both `[data-theme='light']` and `[data-theme='dark']` (the theme toggle is in `SiteChrome`) at desktop width (~1440px) and a narrow width (~375px) — confirm: hero renders, bento cards show their widgets natively (no phone frame), How-It-Works alternates left/right, blog shows one large + two stacked posts, FAQ shows a clickable question list with an answer panel, no emoji remain, font is visibly Geist (not Inter).
