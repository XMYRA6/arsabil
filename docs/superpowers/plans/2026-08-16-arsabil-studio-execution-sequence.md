# Arsabil Studio - Ana Yurutme Sirasi

> **Purpose:** This is the canonical sequencing file for the Arsabil Studio plan series. It prevents jumping into attractive but premature branches.

## Canonical Order

1. `2026-08-16-arsabil-studio-faz0-veri-ve-mimari-hazirlik.md`
2. `2026-08-16-arsabil-studio-faz1-3d-bina-kutlesi-mvp.md`
3. `2026-08-19-arsabil-studio-faz1a-gercek-parsel-geometrisi-ve-emsal-contract.md`
4. `2026-08-19-arsabil-studio-faz1b-3d-operasyonel-kalite.md`
5. `2026-08-16-arsabil-studio-faz2-karma-program-ve-teklif-senaryolari.md`
6. `2026-08-19-arsabil-studio-faz2a-program-envanteri-ve-kat-bantlari.md`
7. `2026-08-19-arsabil-studio-faz2b-arsa-sahibi-teklif-ve-dengeleme.md`
8. `2026-08-16-arsabil-studio-faz3-2d-editor-lite.md`
9. `2026-08-19-arsabil-studio-faz3a-kontrollu-2d-yerlesim-tahtasi.md`
10. `2026-08-19-arsabil-studio-faz3b-senaryo-taslagi-gecmis-ve-karsilastirma.md`
11. `2026-08-16-arsabil-studio-faz4-rapor-paylasim.md`
12. `2026-08-19-arsabil-studio-faz4a-kalici-senaryo-ve-versiyonlama.md`
13. `2026-08-19-arsabil-studio-faz4b-teklif-raporu-ve-guvenli-paylasim.md`
14. `2026-08-16-arsabil-studio-faz5-ar-ic-mimari-marketplace-karar-kapisi.md`
15. `2026-08-19-arsabil-studio-faz5a-karar-metrikleri-ve-telemetri.md`
16. `2026-08-19-arsabil-studio-faz5b-branch-spike-ve-yatirim-karari.md`

17. `2026-08-19-arsabil-studio-faz6a-pilot-onboarding-ve-aktivasyon.md`
18. `2026-08-19-arsabil-studio-faz6b-veri-kalitesi-ve-pilot-operasyon.md`
## Recommended Implementation Strategy

### Slice 1 - Prove the data core

Implement Faz 0 only.

Success:

- tested `BuildingMass`;
- explicit warnings for missing geometry/gross area;
- serializable snapshot draft.

### Slice 2 - Prove the visual premium

Implement Faz 1 with either real TKGM geometry or a clearly marked demo polygon fallback.

Success:

- `hesapla` can show a nonblank 3D building mass;
- no SSR crash;
- no hidden feasibility calculation inside the WebGL component.

### Slice 3 - Make the parcel and 3D preview trustworthy

Implement Faz 1A and Faz 1B.

Success:

- real, imported or user-drawn parcel geometry has an explicit source label;
- construction area is clearly marked estimated or authoritative;
- the 3D scene has an accessible no-WebGL fallback and bounded mobile performance.

### Slice 4 - Prove the business value

Implement Faz 2, then Faz 2A and Faz 2B.

Success:

- `2+1` / `3+1` and ground-floor shop program become a bounded unit inventory;
- every offer references inventory and dated valuation assumptions;
- `9.2` entitlement becomes transparent offer options;
- fractional share is never silently rounded.

### Slice 5 - Make the scenario operable

Implement Faz 3, then Faz 3A and Faz 3B.

Success:

- user sees parcel/footprint/program in 2D;
- controls are bounded, not CAD;
- output feeds the same snapshot;
- user can undo, compare and rebalance alternatives before persistence.

### Slice 6 - Make it shareable

Implement Faz 4, then Faz 4A and Faz 4B.

Success:

- immutable, saved/reopened Studio scenario versions;
- share/export always points to an explicit version;
- report/share summary;
- assumptions and warnings visible in export.

### Slice 7 - Decide expansion

Run Faz 5, then Faz 5A and Faz 5B, only after real evidence exists.

Success:

- AR/interior/marketplace are either funded with evidence or explicitly deferred;
- at most one branch receives a bounded spike approval.


### Slice 8 - Run a controlled pilot

Implement Faz 6A and Faz 6B after a stable core Studio release.

Success:

- pilot users reach a complete proposal flow without hidden data-quality risk;
- operations can classify issues without altering user scenarios;
- expand/pause decisions use activation, quality and support evidence.
## Do Not Skip

- Do not start Three.js before Faz 0 contracts exist.
- Do not start program or offer UI before the construction-area source is visible.
- Do not start interior design before program/offer value is proven.
- Do not start marketplace before interior design has validated demand.
- Do not start native AR before deciding whether the business wants mobile app ownership.

## Product Spine

The Studio product spine is:

```text
TKGM parsel dogrulama
  -> kaynak etiketli geometri ve insaat alani
  -> hesap motoru
  -> 2D/3D proje senaryosu
  -> karma program
  -> arsa sahibi teklif alternatifleri
  -> rapor/paylasim
```

Everything outside this spine is a later branch.


