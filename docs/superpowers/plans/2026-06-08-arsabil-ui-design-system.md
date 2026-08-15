# ArsaBil UI Design System Implementation Plan

> **For agentic workers:** This file maps `docs/superpowers/specs/2026-06-08-arsabil-ui-design-system.md` to the concrete Faz 4 plan. Use the referenced plan for implementation details.

**Goal:** 5 tema sistemini 2 temaya indirgemek, tema secimini sade dark/light toggle'a cekmek ve SSR theme flash sorununu anti-flash script ile gidermek.

**Canonical Implementation Plan:** `docs/superpowers/plans/2026-06-08-arsabil-faz4-ui-design-system.md`

## Scope

- `src/app/globals.css` tema bloklari 2 tema olacak sekilde yenilenir.
- `src/components/ui/ThemeToggle.tsx` sade dark/light toggle olur.
- `src/app/layout.tsx` head icinde localStorage tabanli anti-flash script calistirir.

## Execution Checklist

- [ ] Canonical plan Task 1 tamamlandi: globals token rewrite.
- [ ] Canonical plan Task 2 tamamlandi: ThemeToggle sadeleşti.
- [ ] Canonical plan Task 3 tamamlandi: anti-flash script eklendi.
- [ ] `npx tsc --noEmit` 0 hata.
- [ ] `npx jest --no-coverage` yesil.
- [ ] Manuel light/dark toggle ve refresh persistansi dogrulandi.

## Notes

- Bu dosya detaylari tekrar etmez; drift'i onlemek icin tek uygulama kaynagi Faz 4 planidir.
- Daha yeni `2026-06-08-arsabil-professional-ui-redesign.md` planindaki profesyonel token genisletmeleri, bu 2 tema mimarisinin uzerine uygulanir; tema sayisini tekrar artirmaz.
