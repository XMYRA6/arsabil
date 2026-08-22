# Arsabil Studio — Karma Program ve Teklif Senaryolari Design Spec

> **Parent spec:** `docs/superpowers/specs/2026-08-16-arsabil-studio-2d-3d-mvp-design.md`

## Product Decision

Arsabil Studio should not stop at a plain 3D building mass. The premium product moment is a negotiable project prototype:

- some parts of the building can be `2+1`;
- some parts can be `3+1`;
- the ground floor can contain rental/sellable shops;
- the user can see how calculated landowner share turns into practical offers such as `9 flats + cash for 0.2 share`, `10 flats with balancing`, or custom `flat + direct payment` alternatives.

This makes Studio a visual proposal and negotiation tool, not just a visualization widget.

## Core User Story

Given a verified TKGM parcel and a feasibility result, the user wants to answer:

> "Bu arsaya ne yapabiliriz, hangi daire/dukkan karmasi mantikli olur, arsa sahibine nasil bir teklif cikartabiliriz?"

The Studio flow should connect these into one understandable chain:

```text
TKGM parcel verification
  -> parcel area and geometry
  -> feasibility calculation
  -> massing preview
  -> residential/commercial program mix
  -> landowner entitlement
  -> offer scenario
```

## Domain Concepts

- `programMix`: allocation of building area by use.
  - residential: `1+1`, `2+1`, `3+1`, `4+1`, custom;
  - commercial: ground-floor shops, rental or sale assumption;
  - common/parking: optional non-sellable bands.
- `commercialScenario`: shop count, average shop area, rent/sale value assumption, ownership allocation.
- `landownerEntitlement`: calculated share translated into whole units and fractional balance.
- `offerScenario`: practical proposal alternatives derived from entitlement and value assumptions.

## Offer Examples

If the calculation produces `9.2` unit entitlement:

- **Option A:** `9 daire + 0.2 pay icin nakit dengeleme`.
- **Option B:** `10 daire + fazla 0.8 pay icin nakit/mahsup dengeleme`.
- **Option C:** `custom teklif`: selected flats + direct payment + optional shop/share note.

The product must never silently round `9.2` to `9` or `10`. The fractional part is a negotiation object and must be visible.

## UX Principles

- Studio panels should read like a proposal desk:
  - `Program Dagilimi`
  - `3D Kutle`
  - `Arsa Sahibi Teklifleri`
  - `Varsayimlar ve Uyarilar`
- The user should always know which values are calculated, which are assumed, and which are manually negotiated.
- Ground-floor shops should be visually distinct in 3D, because they materially change project economics.
- `2+1` and `3+1` sections should be color-coded or banded, but not over-designed like an interior design tool.
- Legal language must stay careful: "senaryo", "on teklif", "denge odemesi"; not "kesin sozlesme".

## Implementation Boundaries

- Do not build contract generation in this phase.
- Do not build payment/credit/BNPL integration.
- Do not build furniture marketplace.
- Do not require freeform CAD editing before offer scenarios can work.
- Do not hide missing assumptions. Missing unit value, shop rent or geometry should produce explicit warnings.

## Acceptance Principles

- A user can see what is proposed spatially and financially.
- Fractional arsa payi is represented as a visible decision, not a rounding error.
- Program mix and offer scenarios are saved in the future `studioSnapshot`.
- The 3D scene consumes program bands; it does not calculate entitlement itself.

