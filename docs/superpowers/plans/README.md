# Superpowers Plan Coverage Index

Bu indeks, `docs/superpowers/specs/*-design.md` dosyalarinin hangi uygulama
planiyla kapandigini gosterir. Amac iki seyi onlemek:

- Ayni spec icin ikinci kez celisen plan yazmak.
- Obsolete veya umbrella spec'leri yanlislikla yeni is gibi dispatch etmek.

## Canonical Rules

- Bir spec'in birebir ayni adli plan dosyasi varsa once o okunur.
- Birebir plan dosyasi yalnizca orchestration/closure ise, icindeki
  **Canonical Implementation Plan** veya **Sub-plans** bolumu asil uygulama
  kaynagidir.
- `STATUS: OBSOLETE`, `STATUS: CLOSED` veya `STATUS: IMPLEMENTED VIA
  CANONICAL PLAN` iceren dosyalar yeni implementasyon brief'i olarak
  kullanilmaz.

## Umbrella / Closure Plans

| Spec | Plan | Meaning |
|---|---|---|
| `2026-06-07-arsabil-gelistirme-yol-haritasi-design.md` | `2026-06-07-arsabil-gelistirme-yol-haritasi.md` | Umbrella roadmap; concrete work lives in Faz 1A/1B/2/3/4 plans. |
| `2026-06-07-arsabil-faz2-design.md` | `2026-06-07-arsabil-faz2.md` | Umbrella for Faz 2A + Faz 2B. |
| `2026-06-07-arsabil-faz3b-design.md` | `2026-06-07-arsabil-faz3b.md` | Umbrella for Cloudinary photos, listing edit, SSE messaging. |
| `2026-06-07-mobile-ui-premium-redesign.md` | `2026-06-07-mobile-ui-premium-redesign.md` | Closed/superseded; do not implement older mobile premium direction. |
| `2026-06-08-arsabil-ui-design-system.md` | `2026-06-08-arsabil-ui-design-system.md` | Pointer to Faz 4 UI design system canonical plan. |
| `2026-07-03-mobile-ui-redesign-design.md` | `2026-07-03-mobile-ui-redesign.md` | Umbrella for mobile structural refactor phases. |
| `2026-07-28-mobil-premium-liquid-glass-design.md` | `2026-07-28-mobil-premium-liquid-glass.md` | Umbrella for Liquid Glass mobile phases; first canonical phase plan is Faz 0 + Faz 1 Hesapla. |
| `2026-07-29-hesapla-girdi-mimarisi-design.md` | `2026-07-29-hesapla-girdi-mimarisi.md` | Implemented via 2026-07-30 canonical plan + DURUM file. |

## Recently Added Detailed Plans

| Spec | Plan | Notes |
|---|---|---|
| `2026-06-08-arsabil-professional-ui-redesign.md` | `2026-06-08-arsabil-professional-ui-redesign.md` | Detailed CSS/token visual redesign plan. |
| `2026-07-01-emsal-arsa-maliyeti-design.md` | `2026-07-01-emsal-arsa-maliyeti.md` | Detailed Prisma/API/admin/calculator/UI plan for comparable land cost model. |

## Coverage Check

PowerShell one-liner used to check spec names without a matching plan name:

```powershell
$specs = Get-ChildItem docs\superpowers\specs -Filter *.md | ForEach-Object { $_.BaseName -replace '-design$','' }
$plans = Get-ChildItem docs\superpowers\plans -Filter *.md | ForEach-Object { ($_.BaseName -replace '-plan$','') }
Compare-Object $specs $plans | Where-Object SideIndicator -eq '<=' | Select-Object -ExpandProperty InputObject
```

Expected output after the coverage pass: no rows.
