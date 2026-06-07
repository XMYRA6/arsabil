# ArsaBil Faz 4 — UI Design System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace 5-theme CSS system with a clean 2-theme design system (Clean Light default + Rich Dark), simplify the theme toggle to dark/light only, and add an anti-flash script.

**Architecture:** Full rewrite of `src/app/globals.css` CSS variables only — all pages use `var(--)` tokens so they update automatically. `ThemeToggle.tsx` simplified from 5-palette dropdown to a simple dark/light toggle button. Anti-flash `<script>` added to `layout.tsx` `<head>` so the saved theme is applied before React hydrates (no white flash on dark theme).

**Tech Stack:** Next.js 16 App Router, CSS custom properties, TypeScript, localStorage.

---

## File Map

| File | Action |
|------|--------|
| `src/app/globals.css` | Full rewrite — keep Inter import, reset, base styles; replace all theme blocks with 2 clean themes |
| `src/components/ui/ThemeToggle.tsx` | Simplify: remove sky/mint/sand, replace dropdown with simple toggle button |
| `src/app/layout.tsx` | Add explicit `<head>` with anti-flash `<script>` before `<body>` |

---

### Task 1: Rewrite `src/app/globals.css` — 2 themes

**Files:**
- Modify: `src/app/globals.css`

No tests for CSS — TypeScript and Jest are validation enough. Manual visual check is the test.

- [ ] **Step 1: Read the current `src/app/globals.css`**

Read the full file. Note the structure: theme blocks at top, then base reset, then utility classes and animations at the bottom. You will replace ONLY the theme blocks (everything from line 1 to just before `/* ===== BASE RESET =====`). Keep everything from `/* ===== BASE RESET =====` onward unchanged.

- [ ] **Step 2: Replace the theme section**

Replace everything from the start of the file up to (but NOT including) `/* ===== BASE RESET =====` with exactly:

```css
/* =========================================================================
   ARSABIL — DUAL THEME SYSTEM (Light default / Dark)
   ========================================================================= */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');

/* ===== LIGHT THEME (default) ===== */
[data-theme="light"], :root {
  /* Backgrounds */
  --bg:      #ffffff;
  --bg-body: #f8fafc;
  --panel:   #ffffff;
  --panel-2: #f8fafc;

  /* Typography */
  --text:             #0f172a;
  --muted:            #64748b;
  --card-title:       #0f172a;
  --label-color:      #64748b;
  --val-color:        #0f172a;
  --page-title-color: #0f172a;

  /* Border */
  --border: #e2e8f0;

  /* Topbar */
  --topbar-bg:     rgba(255, 255, 255, 0.95);
  --topbar-border: #e2e8f0;
  --topbar-text:   #0f172a;

  /* Shadows */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, .05);
  --shadow:    0 1px 3px rgba(0, 0, 0, .1), 0 1px 2px rgba(0, 0, 0, .06);
  --shadow-md: 0 4px 12px rgba(0, 0, 0, .1);
  --shadow-lg: 0 8px 24px rgba(0, 0, 0, .12);
  --shadow2:   var(--shadow);

  /* Brand */
  --primary:      #2563eb;
  --primary-rgb:  37, 99, 235;
  --primary-2:    #1d4ed8;
  --primary-glow: rgba(37, 99, 235, .12);

  /* Semantic */
  --green:  #16a34a;
  --orange: #d97706;
  --red:    #dc2626;

  /* Inputs */
  --input-bg:           #ffffff;
  --input-solid:        #ffffff;
  --stat-bg:            #ffffff;
  --input-focus-border: #2563eb;
  --input-focus-shadow: 0 0 0 3px rgba(37, 99, 235, .12);

  /* Hero / CTA */
  --hero-bg:     linear-gradient(135deg, #2563eb, #1d4ed8);
  --hero-shadow: 0 8px 24px rgba(37, 99, 235, .25);
  --hero-border: rgba(255, 255, 255, .20);

  /* Shell */
  --shell-bg:     #ffffff;
  --shell-border: #e2e8f0;

  /* Radius */
  --radius-sm:   4px;
  --radius:      8px;
  --radius-md:   12px;
  --radius-lg:   16px;
  --radius-xl:   24px;
  --radius-full: 9999px;
}

/* ===== DARK THEME ===== */
[data-theme="dark"] {
  /* Backgrounds */
  --bg:      #0d1117;
  --bg-body: #0d1117;
  --panel:   #161b22;
  --panel-2: #21262d;

  /* Typography */
  --text:             #e6edf3;
  --muted:            #8b949e;
  --card-title:       #e6edf3;
  --label-color:      #8b949e;
  --val-color:        #e6edf3;
  --page-title-color: #e6edf3;

  /* Border */
  --border: #30363d;

  /* Topbar */
  --topbar-bg:     rgba(22, 27, 34, 0.95);
  --topbar-border: #30363d;
  --topbar-text:   #e6edf3;

  /* Shadows */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, .30);
  --shadow:    0 1px 3px rgba(0, 0, 0, .40), 0 1px 2px rgba(0, 0, 0, .30);
  --shadow-md: 0 4px 12px rgba(0, 0, 0, .40);
  --shadow-lg: 0 8px 24px rgba(0, 0, 0, .50);
  --shadow2:   var(--shadow);

  /* Brand */
  --primary:      #3b82f6;
  --primary-rgb:  59, 130, 246;
  --primary-2:    #2563eb;
  --primary-glow: rgba(59, 130, 246, .20);

  /* Semantic */
  --green:  #3fb950;
  --orange: #f0883e;
  --red:    #f85149;

  /* Inputs */
  --input-bg:           #21262d;
  --input-solid:        #21262d;
  --stat-bg:            #161b22;
  --input-focus-border: #3b82f6;
  --input-focus-shadow: 0 0 0 3px rgba(59, 130, 246, .20);

  /* Hero / CTA */
  --hero-bg:     linear-gradient(135deg, #1f6feb, #7c3aed);
  --hero-shadow: 0 8px 24px rgba(31, 111, 235, .30);
  --hero-border: rgba(255, 255, 255, .08);

  /* Shell */
  --shell-bg:     #161b22;
  --shell-border: #30363d;

  /* Radius */
  --radius-sm:   4px;
  --radius:      8px;
  --radius-md:   12px;
  --radius-lg:   16px;
  --radius-xl:   24px;
  --radius-full: 9999px;
}

```

- [ ] **Step 3: TypeScript check**

```
npx tsc --noEmit
```

Expected: zero errors. (CSS changes don't affect TypeScript.)

- [ ] **Step 4: Run tests**

```
npx jest --no-coverage
```

Expected: all 52 tests pass.

- [ ] **Step 5: Commit**

```
git add src/app/globals.css
git commit -m "feat: rewrite design system — Clean Light + Rich Dark, drop sky/mint/sand"
```

---

### Task 2: Simplify `src/components/ui/ThemeToggle.tsx` — 2 themes

**Files:**
- Modify: `src/components/ui/ThemeToggle.tsx`

The current component has a 5-palette dropdown with sky/mint/sand circles. Replace with a simple button: clicking switches between `dark` and `light`. No dropdown needed.

- [ ] **Step 1: Replace `src/components/ui/ThemeToggle.tsx` with the new version**

Write the entire file with this content:

```tsx
'use client'

import { useEffect, useState } from 'react'

type Theme = 'light' | 'dark'

export function ThemeToggle() {
    const [theme, setTheme] = useState<Theme>('light')
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
        const saved = localStorage.getItem('arsabil-theme') as Theme | null
        if (saved === 'dark' || saved === 'light') {
            setTheme(saved)
        }
    }, [])

    const toggle = () => {
        const next: Theme = theme === 'light' ? 'dark' : 'light'
        setTheme(next)
        if (next === 'dark') {
            document.documentElement.setAttribute('data-theme', 'dark')
        } else {
            document.documentElement.removeAttribute('data-theme')
        }
        localStorage.setItem('arsabil-theme', next)
    }

    if (!mounted) return <div style={{ width: 40, height: 40 }} />

    const isDark = theme === 'dark'

    return (
        <button
            onClick={toggle}
            aria-label="Tema değiştir"
            title={isDark ? 'Aydınlık temaya geç' : 'Karanlık temaya geç'}
            style={{
                width: 40, height: 40, borderRadius: 10,
                border: isDark
                    ? '1px solid rgba(255,255,255,.15)'
                    : '1px solid rgba(0,0,0,.1)',
                background: isDark
                    ? 'rgba(255,255,255,.08)'
                    : 'rgba(0,0,0,.05)',
                color: 'var(--topbar-text)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', transition: 'all 0.2s ease',
                flexShrink: 0,
            }}
        >
            {isDark ? (
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <circle cx="12" cy="12" r="5" />
                    <path strokeLinecap="round" d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72l1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
                </svg>
            ) : (
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
                </svg>
            )}
        </button>
    )
}
```

Note: Using `export function` avoids the `React.FC` type which would require importing React.

- [ ] **Step 2: TypeScript check**

```
npx tsc --noEmit
```

Expected: zero errors. If you see "React is not defined", add `import React from 'react'` at the top of the file.

- [ ] **Step 3: Run tests**

```
npx jest --no-coverage
```

Expected: all tests pass.

- [ ] **Step 4: Commit**

```
git add src/components/ui/ThemeToggle.tsx
git commit -m "feat: simplify ThemeToggle to dark/light only"
```

---

### Task 3: Add anti-flash script to `src/app/layout.tsx`

**Files:**
- Modify: `src/app/layout.tsx`

Without this script, users who have dark mode saved will see a brief white flash on page load (React hydrates before applying the theme). The fix is an inline `<script>` that runs synchronously in `<head>` before anything renders.

- [ ] **Step 1: Read `src/app/layout.tsx`**

Read the current file. The `RootLayout` function returns:
```tsx
<html lang="en" suppressHydrationWarning>
  <body ...>
    ...
  </body>
</html>
```

There is no explicit `<head>` tag. We need to add one.

- [ ] **Step 2: Add `<head>` with anti-flash script**

Find:
```tsx
  return (
    <html lang="en" suppressHydrationWarning>
      <body
```

Replace with:
```tsx
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('arsabil-theme');if(t==='dark')document.documentElement.setAttribute('data-theme','dark');}catch(e){}})()`,
          }}
        />
      </head>
      <body
```

- [ ] **Step 3: TypeScript check**

```
npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 4: Run tests**

```
npx jest --no-coverage
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```
git add src/app/layout.tsx
git commit -m "feat: add anti-flash theme script to layout head"
```
