# Mobil UI Yeniden Tasarim Implementation Orchestration Plan

> **For agentic workers:** This is the umbrella plan for `docs/superpowers/specs/2026-07-03-mobile-ui-redesign-design.md`. Implement concrete work through the phase plans listed below.

**Goal:** 23 sayfalik mobile-first yapisal refactor'u fazlara bolerek tamamlamak; inline style kaynakli responsive sorunlarini CSS Modules + mobil primitifler ile gidermek, desktop gorunumu korumak.

**Architecture:** Faz 0 once paylasilan mobil altyapiyi kurar. Faz 1 en yuksek etkili musteri sayfalarini refactor eder. Faz 2-4 akış, ikincil ve admin sayfalari daha yeni tarihli spesifik planlarla tamamlanir.

## Phase Map

- **Faz 0:** `docs/superpowers/plans/2026-07-03-mobil-ui-faz0-temel-ve-primitifler.md`
- **Faz 1:** `docs/superpowers/plans/2026-07-03-mobil-ui-faz1-cekirdek-sayfalar.md`
- **Faz 2 akış sayfalari:** `docs/superpowers/plans/2026-07-09-mobil-faz2-akis-sayfalari.md`
- **Faz 3 ikincil sayfalar:** `docs/superpowers/plans/2026-07-12-mobil-faz3-ikincil-sayfalar.md`
- **Admin mobil kimlik:** `docs/superpowers/plans/2026-07-14-admin-panel-mobil-muhur-kimlik.md`
- **Sonraki mobil premium revizyon:** `docs/superpowers/plans/2026-07-28-mobil-faz0-temel-faz1-hesapla.md`

## Global Constraints

- Breakpoint: 768px ana mobil kesim, 480px kucuk ekran.
- Desktop layout degismez.
- Yeni inline style yazilmaz; dinamik CSS custom property istisnasi disinda stiller CSS module'dedir.
- Dokunma hedefi min 44px; form inputlari mobilde 16px font ve 48px yukseklik.
- Her faz sonunda Playwright 390x844 yatay tasma kontrolu.

---

### Gate 1: Faz 0 temel

- [ ] RTL/jsdom altyapisi.
- [ ] Mobil tokenlar.
- [ ] `AppBar`, `DataCard`, `SegmentedTabs`, `StickyActionBar`, `BottomSheet`, `SwipeGallery`.
- [ ] Mobil smoke harness.

### Gate 2: Faz 1 cekirdek sayfalar

- [ ] `/hesapla`.
- [ ] `/marketplace`.
- [ ] `/listing/[id]`.
- [ ] `/dashboard`.
- [ ] Desktop baseline farki yok.

### Gate 3: Faz 2 akis sayfalari

- [ ] `/listings/new`, `/listings/[id]/edit`.
- [ ] `/inbox`.
- [ ] `/login`, `/register`.

### Gate 4: Faz 3 ikincil sayfalar

- [ ] `compare`, profile, dashboard subpages, board/landing denetimleri.

### Gate 5: Faz 4 admin

- [ ] Admin tablolarinda mobil DataCard/CardList karsiliklari.
- [ ] Admin settings/analytics mobile tek kolon.

## Final Acceptance

- `npx tsc --noEmit`, `npx jest`, `npm run build` yesil.
- `e2e/mobil-smoke.spec.ts` fixme sayisi ilgili faz sonunda azalir ve finalde 0 olur.
- 390px viewport'ta yatay tasma yok.
- Dokunulan sayfalarda inline style sayisi azalir.
