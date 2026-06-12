# Mobile Premium Redesign Implementation Plan

> **STATUS: OBSOLETE (2026-06-11).** Bu plan navy/terracotta/cream "Premium Temiz" diline göre yazıldı; o yön 2026-06-08'de revert edildi ve 2026-06-10'da Aurora token sistemi (violet/blue/cyan) geldi. Planın hedeflediği tüm bayat değerler (eski mavi 31,111,235; mor #8b5cf6 avatar gradient'leri; eski tab/balon stilleri) aurora süpürme commit'lerinde token bazlı olarak zaten düzeltildi. Kalan tek kalıntı (inbox messagesArea yeşil gradient) 2026-06-11'de aurora cyan'a çevrildi. Bu planı UYGULAMA.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring all mobile views into the navy (#1a3c5e) + terracotta (#c8845a) + cream (#f7f5f0) design language, matching the desktop redesign already in place.

**Architecture:** Pure CSS changes across 6 modules — no JSX edits, no layout changes. Every change either (a) replaces a hardcoded old-blue `rgba(31,111,235,...)` value with the correct navy token, or (b) upgrades a generic light-theme surface to cream (`var(--bg-body)`) with navy/terracotta accents.

**Tech Stack:** CSS Modules, CSS custom properties (`var(--primary)`, `var(--accent)`, `var(--bg-body)`, `var(--border)`)

---

## File Map

| File | What changes |
|---|---|
| `src/components/layout/BottomNavbar.module.css` | Light theme bg → cream; FAB shadow → terracotta glow; active pill → navy |
| `src/app/hesapla/page.module.css` | inputCard → cream bg + navy left-border; statGridCard → navy top-border; mobileActionPrimary → 48px + gradient; heroResultCard accent → terracotta |
| `src/app/marketplace/page.module.css` | convItemActive → navy; mobile tab active → verify token usage |
| `src/app/inbox/inbox.module.css` | Active conv item → navy; message bubble → navy; background gradients → navy |
| `src/app/dashboard/profile/profile.module.css` | avatarCircle → remove purple; listRow → cream bg |
| `src/app/profile/[userId]/page.module.css` | avatarCircle → remove purple; header → cream bg |

---

## Task 1: BottomNavbar — Cream Frosted Glass + Terracotta FAB

**Files:**
- Modify: `src/components/layout/BottomNavbar.module.css:34-44` (light theme block)
- Modify: `src/components/layout/BottomNavbar.module.css:99-101` (active iconWrap)
- Modify: `src/components/layout/BottomNavbar.module.css:118-125` (active press)
- Modify: `src/components/layout/BottomNavbar.module.css:162-176` (fabItem shadow)
- Modify: `src/components/layout/BottomNavbar.module.css:177-183` (fabActive shadow)
- Modify: `src/components/layout/BottomNavbar.module.css:185-192` (fab press shadow)

- [ ] **Step 1: Replace light-theme block (lines 34-44)**

Find the existing block:
```css
:global([data-theme="light"]) .bottomNav,
:global([data-theme="sky"]) .bottomNav,
:global([data-theme="mint"]) .bottomNav,
:global([data-theme="sand"]) .bottomNav {
    background: rgba(248, 250, 252, 0.92);
    border-top: 0.5px solid #e6edf6;
    box-shadow:
        0 -0.5px 0 rgba(0, 0, 0, .04),
        0 -8px 24px rgba(0, 0, 0, .05),
        inset 0 1px 0 rgba(255, 255, 255, .80);
}
```

Replace with:
```css
:global([data-theme="light"]) .bottomNav,
:global([data-theme="sky"]) .bottomNav,
:global([data-theme="mint"]) .bottomNav,
:global([data-theme="sand"]) .bottomNav {
    background: rgba(247, 245, 240, 0.95);
    border-top: 1px solid #e5e0d8;
    box-shadow:
        0 -0.5px 0 rgba(26, 60, 94, .06),
        0 -4px 20px rgba(26, 60, 94, .06),
        inset 0 1px 0 rgba(255, 255, 255, .80);
}
```

- [ ] **Step 2: Replace active iconWrap bg (line 100)**

Find:
```css
.active .iconWrap {
    background: rgba(var(--primary-rgb, 31, 111, 235), 0.13);
}
```

Replace with:
```css
.active .iconWrap {
    background: rgba(26, 60, 94, 0.10);
}
```

- [ ] **Step 3: Replace press active bg (line 121)**

Find:
```css
.navItem:active .iconWrap {
    transform: scale(0.84);
    transition: transform 0.08s ease;
    background: rgba(var(--primary-rgb, 31, 111, 235), 0.18);
}
```

Replace with:
```css
.navItem:active .iconWrap {
    transform: scale(0.84);
    transition: transform 0.08s ease;
    background: rgba(26, 60, 94, 0.18);
}
```

- [ ] **Step 4: Replace fabItem glow shadow (lines 162-172)**

Find:
```css
.fabItem {
    background: linear-gradient(148deg, var(--primary) 0%, var(--primary-2) 100%);
    width: 54px;
    height: 54px;
    border-radius: 18px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;

    /* Apple-quality layered shadow */
    box-shadow:
        0 2px 4px rgba(0, 0, 0, 0.12),
        0 8px 22px rgba(var(--primary-rgb, 31, 111, 235), 0.42),
        0 0 0 3.5px var(--bg),
        inset 0 1px 0 rgba(255, 255, 255, 0.28),
        inset 0 -1px 0 rgba(0, 0, 0, 0.08);
```

Replace just the box-shadow line (keep all other properties):
```css
    box-shadow:
        0 2px 4px rgba(0, 0, 0, 0.12),
        0 8px 22px rgba(200, 132, 90, 0.38),
        0 0 0 3.5px var(--bg),
        inset 0 1px 0 rgba(255, 255, 255, 0.28),
        inset 0 -1px 0 rgba(0, 0, 0, 0.08);
```

- [ ] **Step 5: Replace fabActive glow shadow (lines 175-182)**

Find:
```css
.fabActive {
    box-shadow:
        0 2px 6px rgba(0, 0, 0, 0.16),
        0 14px 30px rgba(var(--primary-rgb, 31, 111, 235), 0.55),
        0 0 0 3.5px var(--bg),
        inset 0 1px 0 rgba(255, 255, 255, 0.32),
        inset 0 -1px 0 rgba(0, 0, 0, 0.10);
    transform: scale(1.07);
}
```

Replace with:
```css
.fabActive {
    box-shadow:
        0 2px 6px rgba(0, 0, 0, 0.16),
        0 14px 30px rgba(200, 132, 90, 0.52),
        0 0 0 3.5px var(--bg),
        inset 0 1px 0 rgba(255, 255, 255, 0.32),
        inset 0 -1px 0 rgba(0, 0, 0, 0.10);
    transform: scale(1.07);
}
```

- [ ] **Step 6: Replace fab press shadow (lines 185-192)**

Find:
```css
.fabContainer:active .fabItem {
    transform: scale(0.88) !important;
    transition: transform 0.08s ease !important;
    box-shadow:
        0 1px 2px rgba(0, 0, 0, 0.10),
        0 4px 10px rgba(var(--primary-rgb, 31, 111, 235), 0.28),
        0 0 0 3.5px var(--bg);
}
```

Replace with:
```css
.fabContainer:active .fabItem {
    transform: scale(0.88) !important;
    transition: transform 0.08s ease !important;
    box-shadow:
        0 1px 2px rgba(0, 0, 0, 0.10),
        0 4px 10px rgba(200, 132, 90, 0.25),
        0 0 0 3.5px var(--bg);
}
```

- [ ] **Step 7: Run TypeScript check and tests**

```powershell
cd C:\Users\emre\Desktop\arsabil-main
npx tsc --noEmit
npx jest --no-coverage
```

Expected: 0 TypeScript errors, 52/52 tests pass.

- [ ] **Step 8: Commit**

```powershell
git add src/components/layout/BottomNavbar.module.css
git commit -m "style(mobile): BottomNavbar cream frosted glass + terracotta FAB glow"
```

---

## Task 2: Hesapla — Mobile Card & Action Button Polish

**Files:**
- Modify: `src/app/hesapla/page.module.css` (mobile section, lines ~1239-1411)

- [ ] **Step 1: Update inputCard to cream + navy left border (line ~1239)**

Find:
```css
    .inputCard {
        background: var(--panel);
        border: 1px solid var(--border);
        border-radius: 14px;
        padding: 12px 14px;
    }
```

Replace with:
```css
    .inputCard {
        background: var(--bg-body);
        border: 1px solid var(--border);
        border-left: 3px solid var(--primary);
        border-radius: 14px;
        padding: 12px 14px;
    }
```

- [ ] **Step 2: Update statGridCard to navy top border (line ~1340)**

Find:
```css
    .statGridCard {
        background: var(--panel);
        border: 1px solid var(--border);
        border-radius: 14px;
        padding: 12px;
    }
```

Replace with:
```css
    .statGridCard {
        background: #fff;
        border: 1px solid var(--border);
        border-top: 3px solid var(--primary);
        border-radius: 14px;
        padding: 12px;
        box-shadow: 0 2px 8px rgba(26, 60, 94, 0.04);
    }
```

- [ ] **Step 3: Update mobileActionPrimary to 48px + navy gradient (line ~1396)**

Find:
```css
    .mobileActionPrimary {
        flex: 1;
        height: 44px;
        border-radius: 12px;
        background: var(--primary);
        color: white;
        font-weight: 800;
        font-size: 0.85rem;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 6px 18px var(--primary-glow);
        border: none;
        cursor: pointer;
        -webkit-tap-highlight-color: transparent;
    }
```

Replace with:
```css
    .mobileActionPrimary {
        flex: 1;
        height: 48px;
        border-radius: 14px;
        background: linear-gradient(135deg, var(--primary) 0%, var(--primary-2) 100%);
        color: white;
        font-weight: 800;
        font-size: 0.85rem;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 6px 18px rgba(26, 60, 94, 0.30);
        border: none;
        cursor: pointer;
        -webkit-tap-highlight-color: transparent;
    }
```

- [ ] **Step 4: Update heroResultCard accent circle to terracotta (line ~1303)**

Find:
```css
    .heroResultCard::after {
        content: '';
        position: absolute;
        top: -20px;
        right: -20px;
        width: 80px;
        height: 80px;
        background: rgba(255, 255, 255, .08);
        border-radius: 50%;
    }
```

Replace with:
```css
    .heroResultCard::after {
        content: '';
        position: absolute;
        top: -20px;
        right: -20px;
        width: 80px;
        height: 80px;
        background: rgba(200, 132, 90, 0.18);
        border-radius: 50%;
    }
```

- [ ] **Step 5: Run TypeScript check and tests**

```powershell
npx tsc --noEmit
npx jest --no-coverage
```

Expected: 0 errors, 52 pass.

- [ ] **Step 6: Commit**

```powershell
git add src/app/hesapla/page.module.css
git commit -m "style(mobile): hesapla cards cream bg, navy borders, terracotta accents"
```

---

## Task 3: Marketplace — Mobile Tab + Listing Panel

**Files:**
- Modify: `src/app/marketplace/page.module.css` (mobile section, lines ~99-168)

- [ ] **Step 1: Add cream background to inactive mobile tabs**

The existing `.mobileTabs button` at line ~111 already uses `var(--bg-body)` for background ✅ and `.mobileTabs button.activeTab` at line ~125 already uses `var(--primary)` ✅.

Improve the active tab with a gradient and the mobile tab container with a cream background:

Find:
```css
    .mobileTabs {
        display: flex;
        align-items: center;
        width: 100%;
        background: var(--panel);
        border-bottom: 1px solid var(--border);
        padding: 8px 16px;
        gap: 8px;
        flex-shrink: 0;
    }
```

Replace with:
```css
    .mobileTabs {
        display: flex;
        align-items: center;
        width: 100%;
        background: var(--bg-body);
        border-bottom: 1px solid var(--border);
        padding: 8px 16px;
        gap: 8px;
        flex-shrink: 0;
    }
```

- [ ] **Step 2: Upgrade active tab to gradient**

Find:
```css
    .mobileTabs button.activeTab {
        background: var(--primary);
        color: white;
        border-color: var(--primary);
        box-shadow: var(--shadow-md);
    }
```

Replace with:
```css
    .mobileTabs button.activeTab {
        background: linear-gradient(135deg, var(--primary) 0%, var(--primary-2) 100%);
        color: white;
        border-color: var(--primary);
        box-shadow: 0 4px 12px rgba(26, 60, 94, 0.25);
    }
```

- [ ] **Step 3: Run TypeScript check and tests**

```powershell
npx tsc --noEmit
npx jest --no-coverage
```

Expected: 0 errors, 52 pass.

- [ ] **Step 4: Commit**

```powershell
git add src/app/marketplace/page.module.css
git commit -m "style(mobile): marketplace tab bar cream bg + navy gradient active state"
```

---

## Task 4: Inbox — Active Conversation + Bubble Colors

**Files:**
- Modify: `src/app/inbox/inbox.module.css`

- [ ] **Step 1: Fix convItemActive to navy (line ~119)**

Find:
```css
.convItemActive {
    background: rgba(31, 111, 235, 0.08) !important;
    border-color: rgba(31, 111, 235, 0.15);
}
```

Replace with:
```css
.convItemActive {
    background: var(--primary-glow) !important;
    border: 1px solid rgba(26, 60, 94, 0.15);
    border-left: 3px solid var(--primary);
}
```

- [ ] **Step 2: Fix convItem hover to use cream (line ~115)**

Find:
```css
.convItem:hover {
    background: rgba(255, 255, 255, 0.05);
}
```

Replace with:
```css
.convItem:hover {
    background: var(--primary-glow);
}
```

- [ ] **Step 3: Fix message bubble to navy (line ~289)**

Find:
```css
.bubbleMine {
    background: rgba(var(--primary-rgb, 55, 151, 240), 0.15); /* Theme primary glass */
    color: var(--text);
    border: 1px solid var(--primary);
    border-radius: 22px 22px 4px 22px;
    backdrop-filter: blur(10px);
}
```

Replace with:
```css
.bubbleMine {
    background: rgba(26, 60, 94, 0.10);
    color: var(--text);
    border: 1px solid var(--primary);
    border-radius: 22px 22px 4px 22px;
    backdrop-filter: blur(10px);
}
```

- [ ] **Step 4: Fix messagesArea background gradients (line ~247)**

Find:
```css
.messagesArea {
    flex: 1;
    overflow-y: auto;
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    background-image: 
        radial-gradient(circle at 10% 90%, rgba(31, 111, 235, 0.05) 0%, transparent 40%),
        radial-gradient(circle at 90% 10%, rgba(47, 191, 113, 0.05) 0%, transparent 40%);
}
```

Replace with:
```css
.messagesArea {
    flex: 1;
    overflow-y: auto;
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    background-image: 
        radial-gradient(circle at 10% 90%, rgba(26, 60, 94, 0.04) 0%, transparent 40%),
        radial-gradient(circle at 90% 10%, rgba(200, 132, 90, 0.04) 0%, transparent 40%);
}
```

- [ ] **Step 5: Run TypeScript check and tests**

```powershell
npx tsc --noEmit
npx jest --no-coverage
```

Expected: 0 errors, 52 pass.

- [ ] **Step 6: Commit**

```powershell
git add src/app/inbox/inbox.module.css
git commit -m "style(mobile): inbox navy active state, cream hover, terracotta bubble accents"
```

---

## Task 5: Profile Pages — Remove Purple Gradient + Cream Surfaces

**Files:**
- Modify: `src/app/dashboard/profile/profile.module.css`
- Modify: `src/app/profile/[userId]/page.module.css`

- [ ] **Step 1: Fix avatarCircle gradient in dashboard profile (line ~72)**

Find:
```css
.avatarCircle {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--primary), #8b5cf6);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.6rem;
  font-weight: 900;
  color: white;
}
```

Replace with:
```css
.avatarCircle {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--primary), var(--primary-2));
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.6rem;
  font-weight: 900;
  color: white;
}
```

- [ ] **Step 2: Fix listRow background in dashboard profile (line ~221)**

Find:
```css
.listRow {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 0.875rem;
  background: var(--bg);
  border-radius: 10px;
  border: 1px solid var(--border);
  gap: 0.5rem;
  text-decoration: none;
}
```

Replace with:
```css
.listRow {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 0.875rem;
  background: var(--bg-body);
  border-radius: 10px;
  border: 1px solid var(--border);
  gap: 0.5rem;
  text-decoration: none;
}
```

- [ ] **Step 3: Fix avatarCircle gradient in public profile (line ~18)**

In `src/app/profile/[userId]/page.module.css`, find:
```css
.avatarCircle {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--primary), #8b5cf6);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.4rem;
  font-weight: 900;
  color: white;
  flex-shrink: 0;
}
```

Replace with:
```css
.avatarCircle {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--primary), var(--primary-2));
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.4rem;
  font-weight: 900;
  color: white;
  flex-shrink: 0;
}
```

- [ ] **Step 4: Fix public profile header background (line ~10)**

Find:
```css
.header {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 20px;
  padding: 1.5rem 2rem;
  margin-bottom: 1.5rem;
}
```

Replace with:
```css
.header {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  background: var(--bg-body);
  border: 1px solid var(--border);
  border-left: 4px solid var(--primary);
  border-radius: 20px;
  padding: 1.5rem 2rem;
  margin-bottom: 1.5rem;
}
```

- [ ] **Step 5: Run TypeScript check and tests**

```powershell
npx tsc --noEmit
npx jest --no-coverage
```

Expected: 0 errors, 52 pass.

- [ ] **Step 6: Commit**

```powershell
git add src/app/dashboard/profile/profile.module.css src/app/profile/[userId]/page.module.css
git commit -m "style(mobile): profiles navy gradient, cream surfaces, remove purple"
```

---

## Task 6: Final Verification

- [ ] **Step 1: Full TypeScript + test suite**

```powershell
npx tsc --noEmit && npx jest --no-coverage
```

Expected: 0 TypeScript errors, 52/52 tests pass.

- [ ] **Step 2: Visual check checklist**

Start dev server:
```powershell
npm run dev
```

Open `http://localhost:3000` on a mobile viewport (DevTools → iPhone 14 Pro, 393px). Check:

| Page | What to verify |
|---|---|
| Any page | BottomNavbar shows cream frosted glass background |
| Any page | Active BottomNavbar tab has navy pill highlight + navy label |
| Any page | Hesapla FAB casts a warm terracotta glow (not blue) |
| `/hesapla` | Swipe to Hesapla card: inputCard has navy left border, cream background |
| `/hesapla` | Result stat grid cards have navy top border |
| `/hesapla` | "Hesapla" action button is 48px tall with navy gradient |
| `/hesapla` | heroResultCard accent circle is terracotta (warm orange) not white |
| `/marketplace` | Mobile tab bar has cream background |
| `/marketplace` | Active tab (Listeler/Harita/Filtreler) shows navy gradient |
| `/inbox` | Tapping a conversation: active item has navy left border |
| `/inbox` | Message bubbles (mine) are navy tinted, not bright blue |
| `/dashboard/profile` | Avatar initials circle is navy gradient (no purple) |
| `/profile/[id]` | Header card has navy left border + cream background |

- [ ] **Step 3: Dark mode spot check**

Toggle dark mode in Profile > Settings. Verify BottomNavbar reverts to its existing dark frosted glass (untouched). No regressions.
