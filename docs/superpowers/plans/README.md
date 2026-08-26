# Superpowers Plan Coverage Index

Bu indeks, `docs/superpowers/specs/*-design.md` dosyalarinin hangi uygulama planiyla kapandigini gosterir. Amac iki seyi onlemek:

- Ayni spec icin ikinci kez celisen plan yazmak.
- Obsolete veya umbrella spec'leri yanlislikla yeni is gibi dispatch etmek.

## Canonical Rules

- Bir spec'in birebir ayni adli plan dosyasi varsa once o okunur.
- Birebir plan dosyasi yalnizca orchestration/closure ise, icindeki **Canonical Implementation Plan** veya **Sub-plans** bolumu asil uygulama kaynagidir.
- `STATUS: OBSOLETE`, `STATUS: CLOSED` veya `STATUS: IMPLEMENTED VIA CANONICAL PLAN` iceren dosyalar yeni implementasyon brief'i olarak kullanilmaz.

## Umbrella / Closure Plans

| Spec | Plan | Meaning |
|---|---|---|
| `2026-06-07-arsabil-gelistirme-yol-haritasi-design.md` | `2026-06-07-arsabil-gelistirme-yol-haritasi.md` | Umbrella roadmap; concrete work lives in Faz 1A/1B/2/3/4 plans. |
| `2026-06-07-arsabil-faz2-design.md` | `2026-06-07-arsabil-faz2.md` | Umbrella for Faz 2A + Faz 2B. |
| `2026-06-07-arsabil-faz3b-design.md` | `2026-06-07-arsabil-faz3b.md` | Umbrella for Cloudinary photos, listing edit, SSE messaging. |
| `2026-06-07-mobile-ui-premium-redesign.md` | `2026-06-07-mobile-ui-premium-redesign.md` | Closed/superseded; do not implement older mobile premium direction. |
| `2026-06-08-arsabil-ui-design-system.md` | `2026-06-08-arsabil-ui-design-system.md` | Pointer to Faz 4 UI design system canonical plan. |
| `2026-07-03-mobile-ui-redesign-design.md` | `2026-07-03-mobile-ui-redesign.md` | Umbrella for mobile structural refactor phases. |
| `2026-07-28-mobil-premium-liquid-glass-design.md` | `2026-07-28-mobil-premium-liquid-glass.md` | Umbrella for Liquid Glass mobile phases; Faz 0+1 and Faz 2-9 detailed plans are canonical sub-plans. |
| `2026-07-29-hesapla-girdi-mimarisi-design.md` | `2026-07-29-hesapla-girdi-mimarisi.md` | Implemented via 2026-07-30 canonical plan + DURUM file. |
| `2026-08-16-arsabil-studio-2d-3d-mvp-design.md` | `2026-08-16-arsabil-studio-2d-3d-mvp.md` | Closed via Studio execution sequence; concrete work lives in Faz 0/1/1A/1B plans. |
| `2026-08-16-arsabil-studio-karma-program-ve-teklif-senaryolari-design.md` | `2026-08-16-arsabil-studio-karma-program-ve-teklif-senaryolari.md` | Closed via Studio execution sequence; concrete work lives in Faz 2/2A/2B plans. |
| `2026-08-16-arsabil-studio-2d-editor-lite-design.md` | `2026-08-16-arsabil-studio-2d-editor-lite.md` | Closed via Studio execution sequence; concrete work lives in Faz 3/3A/3B plans. |
| `2026-08-16-arsabil-studio-rapor-paylasim-design.md` | `2026-08-16-arsabil-studio-rapor-paylasim.md` | Closed via Studio execution sequence; concrete work lives in Faz 4/4A/4B plans. |
| `2026-08-16-arsabil-studio-ar-ic-mimari-marketplace-karar-kapisi-design.md` | `2026-08-16-arsabil-studio-ar-ic-mimari-marketplace-karar-kapisi.md` | Closed via Studio execution sequence; concrete work lives in Faz 5/5A/5B plans. |
| `2026-08-19-arsabil-studio-parsel-geometrisi-ve-emsal-contract-design.md` | `2026-08-19-arsabil-studio-parsel-geometrisi-ve-emsal-contract.md` | Closed via Studio execution sequence; concrete work lives in Faz 1A/1B plans. |
| `2026-08-19-arsabil-studio-pilot-operasyon-design.md` | `2026-08-19-arsabil-studio-pilot-operasyon.md` | Closed via Studio execution sequence; concrete work lives in Faz 6A/6B plans. |

## Recently Added Detailed Plans

| Spec | Plan | Notes |
|---|---|---|
| `2026-06-08-arsabil-professional-ui-redesign.md` | `2026-06-08-arsabil-professional-ui-redesign.md` | Detailed CSS/token visual redesign plan. |
| `2026-07-01-emsal-arsa-maliyeti-design.md` | `2026-07-01-emsal-arsa-maliyeti.md` | Detailed Prisma/API/admin/calculator/UI plan for comparable land cost model. |
| `2026-07-28-mobil-premium-liquid-glass-design.md` | `2026-07-28-mobil-faz2-pazar-ilan-detay.md` | Detailed Liquid Glass Faz 2 plan for marketplace and listing detail. |
| `2026-07-28-mobil-premium-liquid-glass-design.md` | `2026-07-28-mobil-faz3-auth-ana-ekran.md` | Detailed Liquid Glass Faz 3 plan for auth and home. |
| `2026-07-28-mobil-premium-liquid-glass-design.md` | `2026-07-28-mobil-faz4-mesaj-teklif.md` | Detailed Liquid Glass Faz 4 plan for inbox, chat and offers. |
| `2026-07-28-mobil-premium-liquid-glass-design.md` | `2026-07-28-mobil-faz5-portfoy.md` | Detailed Liquid Glass Faz 5 plan for portfolio surfaces. |
| `2026-07-28-mobil-premium-liquid-glass-design.md` | `2026-07-28-mobil-faz6-profil-ayar-bildirim.md` | Detailed Liquid Glass Faz 6 plan for profile, settings and notifications. |
| `2026-07-28-mobil-premium-liquid-glass-design.md` | `2026-07-28-mobil-faz7-ilan-sihirbazi.md` | Detailed Liquid Glass Faz 7 plan for listing wizard. |
| `2026-07-28-mobil-premium-liquid-glass-design.md` | `2026-07-28-mobil-faz8-admin.md` | Detailed Liquid Glass Faz 8 plan for admin. |
| `2026-07-28-mobil-premium-liquid-glass-design.md` | `2026-07-28-mobil-faz9-durum-ekranlari.md` | Detailed Liquid Glass Faz 9 plan for state/offline screens. |
| `2026-08-15-mobil-kart-dili-revizyonu-design.md` | `2026-08-15-mobil-kart-dili-revizyonu.md` | Umbrella for mobile card-language revision; Faz 1 and Faz 2 detailed plans are canonical sub-plans. |
| `2026-08-15-mobil-kart-dili-revizyonu-design.md` | `2026-08-15-mobil-kart-dili-revizyonu-faz1.md` | Detailed Faz 1 plan for shared stat/row surfaces, message/home/report migration and alert removal. |
| `2026-08-15-mobil-kart-dili-revizyonu-design.md` | `2026-08-15-mobil-kart-dili-revizyonu-faz2.md` | Detailed Faz 2 plan for editorial listing surfaces and remaining profile/secondary mobile glass cleanup. |
| `2026-08-16-arsabil-studio-2d-3d-mvp-design.md` | `2026-08-16-arsabil-studio-faz0-veri-ve-mimari-hazirlik.md` | Detailed Arsabil Studio data/geometry contract preparation plan. |
| `2026-08-16-arsabil-studio-2d-3d-mvp-design.md` | `2026-08-16-arsabil-studio-faz1-3d-bina-kutlesi-mvp.md` | Detailed OpenMap3D-style 3D building mass MVP plan. |
| `2026-08-19-arsabil-studio-parsel-geometrisi-ve-emsal-contract-design.md` | `2026-08-19-arsabil-studio-faz1a-gercek-parsel-geometrisi-ve-emsal-contract.md` | Detailed source-labelled parcel geometry and construction-area contract plan. |
| `2026-08-19-arsabil-studio-parsel-geometrisi-ve-emsal-contract-design.md` | `2026-08-19-arsabil-studio-faz1b-3d-operasyonel-kalite.md` | Detailed 3D preview accessibility, performance and fallback plan. |
| `2026-08-16-arsabil-studio-karma-program-ve-teklif-senaryolari-design.md` | `2026-08-16-arsabil-studio-faz2-karma-program-ve-teklif-senaryolari.md` | Detailed mixed residential/commercial program and landowner offer scenario plan. |
| `2026-08-16-arsabil-studio-karma-program-ve-teklif-senaryolari-design.md` | `2026-08-19-arsabil-studio-faz2a-program-envanteri-ve-kat-bantlari.md` | Detailed program inventory, capacity and 3D floor-band plan. |
| `2026-08-16-arsabil-studio-karma-program-ve-teklif-senaryolari-design.md` | `2026-08-19-arsabil-studio-faz2b-arsa-sahibi-teklif-ve-dengeleme.md` | Detailed landowner offer, valuation and fractional-share balancing plan. |
| `2026-08-16-arsabil-studio-2d-editor-lite-design.md` | `2026-08-16-arsabil-studio-faz3-2d-editor-lite.md` | Detailed controlled 2D Studio planning board plan. |
| `2026-08-16-arsabil-studio-2d-editor-lite-design.md` | `2026-08-19-arsabil-studio-faz3a-kontrollu-2d-yerlesim-tahtasi.md` | Detailed SVG-first controlled 2D proposal-board plan. |
| `2026-08-16-arsabil-studio-2d-editor-lite-design.md` | `2026-08-19-arsabil-studio-faz3b-senaryo-taslagi-gecmis-ve-karsilastirma.md` | Detailed session draft, undo/redo and alternative comparison plan. |
| `2026-08-16-arsabil-studio-rapor-paylasim-design.md` | `2026-08-16-arsabil-studio-faz4-rapor-paylasim.md` | Detailed Studio snapshot/report/share artifact plan. |
| `2026-08-16-arsabil-studio-rapor-paylasim-design.md` | `2026-08-19-arsabil-studio-faz4a-kalici-senaryo-ve-versiyonlama.md` | Detailed immutable scenario persistence and versioning plan. |
| `2026-08-16-arsabil-studio-rapor-paylasim-design.md` | `2026-08-19-arsabil-studio-faz4b-teklif-raporu-ve-guvenli-paylasim.md` | Detailed version-pinned proposal report and secure sharing plan. |
| `2026-08-16-arsabil-studio-ar-ic-mimari-marketplace-karar-kapisi-design.md` | `2026-08-16-arsabil-studio-faz5-ar-ic-mimari-marketplace-karar-kapisi.md` | Detailed AR/interior/marketplace expansion decision-gate plan. |
| `2026-08-16-arsabil-studio-ar-ic-mimari-marketplace-karar-kapisi-design.md` | `2026-08-19-arsabil-studio-faz5a-karar-metrikleri-ve-telemetri.md` | Detailed Studio decision metrics, privacy-safe telemetry and review cadence plan. |
| `2026-08-16-arsabil-studio-ar-ic-mimari-marketplace-karar-kapisi-design.md` | `2026-08-19-arsabil-studio-faz5b-branch-spike-ve-yatirim-karari.md` | Detailed single-branch spike and evidence-based investment decision plan. |
| `2026-08-19-arsabil-studio-pilot-operasyon-design.md` | `2026-08-19-arsabil-studio-faz6a-pilot-onboarding-ve-aktivasyon.md` | Detailed pilot access, onboarding and activation plan. |
| `2026-08-19-arsabil-studio-pilot-operasyon-design.md` | `2026-08-19-arsabil-studio-faz6b-veri-kalitesi-ve-pilot-operasyon.md` | Detailed pilot data-quality and operations plan. |
| `2026-08-16-arsabil-studio-2d-3d-mvp-design.md` | `2026-08-16-arsabil-studio-execution-sequence.md` | Canonical implementation sequence for the full Arsabil Studio plan series. |

## Coverage Check

PowerShell one-liner used to check spec names without a matching plan name:

```powershell
$specs = Get-ChildItem docs\superpowers\specs -Filter *.md | ForEach-Object { $_.BaseName -replace '-design$','' }
$plans = Get-ChildItem docs\superpowers\plans -Filter *.md | ForEach-Object { ($_.BaseName -replace '-plan$','') }
Compare-Object $specs $plans | Where-Object SideIndicator -eq '<=' | Select-Object -ExpandProperty InputObject
```

Expected output after the coverage pass: no rows.






