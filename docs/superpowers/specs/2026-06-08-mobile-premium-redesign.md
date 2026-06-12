# Mobile Premium Redesign — Premium Temiz

**Date:** 2026-06-08  
**Approach:** 2 — Premium Temiz (CSS-only, no JSX changes)  
**Design language:** Navy (#1a3c5e) + Terracotta (#c8845a) + Cream (#f7f5f0) — matches desktop

---

## Scope

Full mobile redesign across 6 CSS modules. All changes are token/color updates only — no layout changes, no JSX edits.

---

## 1. BottomNavbar (`src/components/layout/BottomNavbar.module.css`)

**Problem:** Light-theme override uses cold grey (`rgba(248,250,252,0.92)`) and old-blue primary-rgb fallback (`31,111,235`).

**Changes:**
- `.bottomNav` light theme background → `rgba(247,245,240,.95)` (cream frosted glass)
- `.bottomNav` light theme border → `1px solid #e5e0d8`
- `.bottomNav` light theme shadow → `0 -4px 20px rgba(26,60,94,.06)`
- `.active .iconWrap` background → `rgba(26,60,94,.10)` (navy pill)
- `.active` color → `var(--primary)` (already correct, but fallback `--primary-rgb` must be fixed)
- `.navItem:active .iconWrap` background → `rgba(26,60,94,.18)`
- `.fabItem` box-shadow terracotta glow: replace `rgba(var(--primary-rgb,31,111,235),0.42)` → `rgba(200,132,90,.38)`
- `.fabActive` box-shadow glow → `rgba(200,132,90,.52)`
- `.fabContainer:active .fabItem` shadow → `rgba(200,132,90,.25)`
- FAB ring (`0 0 0 3.5px var(--bg)`) stays as-is — `--bg` already resolves to cream in light mode

---

## 2. Hesapla (`src/app/hesapla/page.module.css`)

**Mobile-specific selectors** (`@media (max-width: 768px)` blocks):

### `topResultCard` (hero result panel)
- Background: `linear-gradient(135deg, #1a3c5e 0%, #0f2942 100%)` (was `var(--hero-bg)` which resolved to old gradient)
- Add decorative circle: `::after` pseudo-element — `60px` circle, `rgba(200,132,90,.18)`, top-right corner
- Border-radius: `var(--radius-lg)` (16px)

### Stat/result cards (`.mobileCard`, `.statCard` in mobile context)
- Background: `#fff`
- Border: `1px solid #e5e0d8`
- Border-left: `3px solid var(--primary)` (navy)
- Border-radius: `var(--radius-md)` (14px)
- Box-shadow: `0 2px 8px rgba(26,60,94,.04)`

### Form input fields (mobile)
- Height: `48px` (from 44px)
- Background: `var(--bg-body)` — `#f7f5f0` cream
- Border: `1px solid var(--border)` — `#e5e0d8`
- Border-radius: `var(--radius-md)` (14px)

### `.primaryActionBtn` / `.mobileActionBtn`
- Background: `linear-gradient(135deg, var(--primary) 0%, var(--primary-2) 100%)`
- Box-shadow: `0 4px 14px rgba(26,60,94,.30)`

### `.mobileCardTitle`
- Color: `var(--primary)` (navy)
- Border-left: `3px solid var(--accent)` (terracotta)

---

## 3. Marketplace (`src/app/marketplace/page.module.css`)

**Mobile-specific selectors:**

### Filter chips / type toggle buttons
- Active state background: `#1a3c5e` (was `#1f6feb` old blue)
- Active state color: `white`
- Inactive: `#fff` background + `1px solid #e5e0d8` border

### Listing cards (`.listingCard`, `.propertyCard` in mobile)
- Background: `#fff`
- Border: `1px solid #e5e0d8`
- Border-radius: `var(--radius-md)` (14px)
- Box-shadow: `0 2px 10px rgba(26,60,94,.05)`
- Hover shadow: `0 6px 20px rgba(26,60,94,.10)`

### Status badges
- `Satılık` / active badges: `rgba(26,60,94,.10)` bg + `#1a3c5e` text (was old-blue)
- `Acil` / urgent badge: `rgba(200,132,90,.12)` bg + `#c8845a` text

### Filter button (CTA)
- Background: `var(--accent)` (#c8845a) — already correct from desktop spec, verify mobile selector also applies

---

## 4. Dashboard (`src/app/dashboard/dashboard.module.css`)

**Mobile-specific selectors** (`@media (max-width: 768px)`):

### Stat boxes (`.statBox` in mobile context)
- Border-top: `3px solid var(--primary)` (lacivert — already on desktop, verify mobile context also applies)
- For secondary stats (teklifler, gelir): `border-top-color: var(--accent)` (terracotta)

### Section titles (`.sectionTitle` in mobile)
- Border-left: `3px solid var(--primary)` + `padding-left: var(--space-3)` — already on desktop, verify mobile
- Font: uppercase + `letter-spacing: 0.08em`

### Nav items (mobile sidebar if shown)
- `.navItemActive`: `background: rgba(26,60,94,.10)` + `border-left: 3px solid var(--primary)` — already on desktop

---

## 5. Inbox (`src/app/inbox/inbox.module.css`)

**Mobile-specific selectors:**

### Thread list items
- Background: `var(--bg-body)` (#f7f5f0 cream, was white or transparent)
- Border-bottom: `1px solid var(--border)` (#e5e0d8)

### Active/selected thread
- Border-left: `3px solid var(--primary)` (navy)
- Background: `var(--primary-glow)` (`rgba(26,60,94,.06)`)

### Unread badge / dot indicator
- Background: `var(--accent)` (#c8845a terracotta)

---

## 6. Profile (`src/app/dashboard/profile/profile.module.css` + `src/app/profile/[userId]/page.module.css`)

**Mobile-specific selectors:**

### Profile card / avatar section
- Background: `var(--bg-body)` (cream)
- Avatar ring: `border: 3px solid var(--primary)` (navy)

### Stat row items
- Border-top: `3px solid var(--primary)` (primary stats)
- Secondary stats: `border-top-color: var(--accent)` (terracotta)

---

## Constraints

- **CSS-only:** No JSX or TypeScript changes in any file
- **Token-first:** Always use CSS custom properties (`var(--primary)`, `var(--accent)`, `var(--bg-body)`, `var(--border)`) — never hardcode hex inside rules that can use tokens
- **Mobile selectors:** All changes go inside existing `@media (max-width: 768px)` blocks or create new ones where missing
- **Dark mode:** Existing dark-mode selectors (`[data-theme="dark"]`) must not be touched — mobile changes are light-mode only unless a rule is theme-agnostic
- **No layout changes:** grid/flex/position values are not modified

---

## Success Criteria

1. BottomNavbar active tab shows navy pill highlight and navy label
2. BottomNavbar FAB casts terracotta glow (visible on light background)
3. Hesapla result hero card is navy gradient (not the old bright blue)
4. All input fields are 48px height with cream background on mobile
5. Marketplace listing cards have subtle shadow and no old-blue accents
6. Dashboard stat boxes have navy/terracotta top border on mobile
7. No TypeScript errors (`npx tsc --noEmit`)
8. All 52 tests pass (`npx jest --no-coverage`)
