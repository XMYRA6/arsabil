# Arsabil Studio 2D/3D MVP — Design Spec

> **Status:** Draft for phased planning. This spec turns the earlier 3D/AR vision from `docs/proje-kapsam-raporu-hesaplama-motoru-ve-harita-2026-07-01.md` into a concrete Arsabil Studio roadmap.

## Product Decision

Arsabil Studio starts as a decision-support visualization layer for land feasibility, not as a full interior-design or furniture-commerce product.

The first shipped product is **Arsabil Studio Lite**:

- 2D parcel and massing context.
- Apartment mix configuration.
- Browser-based 3D building mass preview.
- Direct integration with the existing `hesapla` calculation flow.
- Save/export hooks for scenarios and reports.

Out of scope for the MVP:

- Full Roomstyler-style interior design.
- Furniture catalog, cart, payment, BNPL or credit.
- GPS-anchored outdoor AR.
- Native mobile app.
- Photorealistic rendering.

## Reference Direction

The 3D MVP follows the spirit of OpenMap3D / OSM 3D building viewers: browser-based 3D buildings generated from map/footprint data, with simple orbit controls and export-ready geometry.

The important product adaptation is that Arsabil does not primarily render existing city buildings. It generates a proposed project mass from Arsabil's own calculation model:

- source footprint: user parcel polygon or selected parcel boundary;
- source height/floors: emsal, total construction area and configured floor assumptions;
- source program: apartment mix and optional commercial/parking bands;
- source meaning: feasibility preview, not cadastral/legal approval.

## MVP Architecture

### Data Flow

```text
hesapla inputs + parcel geometry
  -> calculator result
  -> Studio geometry adapter
  -> 2D footprint preview
  -> 3D massing scene
  -> scenario/report save payload
```

### Core Concepts

- `parcelGeometry`: GeoJSON polygon or multipolygon, normalized to a local metric coordinate system for rendering.
- `buildableFootprint`: first version may use the full polygon with configurable setback placeholders; later versions can derive a reduced footprint.
- `buildingMass`: floors, floor height, gross construction area, color bands and validation warnings.
- `unitMix`: array of apartment types such as `1+1`, `2+1`, `3+1`, with count and average area.
- `studioSnapshot`: serializable state saved with scenario/report for later reopening.

## Phased Roadmap

### Faz 0 — Veri ve Mimari Hazirlik

Goal: define the contracts that make Studio possible without hard-coding UI guesses.

- Emsal / construction-right values must be available through a stable calculator/report contract.
- Parcel polygon must be normalized into a renderable geometry contract.
- A pure TypeScript geometry layer must convert calculator state into `buildingMass`.
- Tests must prove area, floor count and warning behavior before any Three.js scene is added.

### Faz 1 — 3D Bina Kutlesi MVP

Goal: create the OpenMap3D-like first experience inside Arsabil.

- Add a `3D Onizleme` tab or panel to `hesapla`.
- Render parcel footprint and extruded building mass in WebGL.
- Use Three.js / react-three-fiber for the scene.
- Add orbit controls, floor bands and simple labels.
- Keep mobile fallback simple: static preview or lightweight 2D/summary if WebGL is too heavy.

### Faz 2 — 2D Studio Editor Lite

Goal: let users understand and adjust the proposal without entering full CAD/interior-design territory.

- Add a 2D footprint/massing board.
- Show parcel boundary, building footprint, setbacks and area annotations.
- Allow simple scenario-level controls, not freeform architectural drawing.
- Candidate libraries: Konva or Fabric.js, selected after a small spike.

### Faz 3 — Daire Karisimi Konfiguratoru

Goal: replace single aggregate unit assumptions with typed apartment mix.

- Add `unitMix` to scenario/report persistence.
- Validate total sellable/gross area against calculator output.
- Reflect unit mix visually in the 3D mass with floor or stack coloring.

### Faz 4 — Kaydetme, Raporlama ve Paylasim

Goal: make Studio output useful outside the live screen.

- Save `studioSnapshot` with reports/scenarios.
- Add images/thumbnails for dashboard and PDF.
- Add GLB/export investigation only if it supports a real workflow.

### Faz 5 — AR / Interior / Marketplace Decision Gate

Goal: decide whether to fund a separate product line.

- GPS-anchored outdoor AR requires native mobile and should not be part of the web MVP.
- Interior design requires a separate editor, asset pipeline and content strategy.
- Furniture marketplace requires business partnerships, stock/pricing feeds and regulated finance/payment decisions.

## Non-Goals

- Do not build a generic 3D city map.
- Do not depend on OSM building height completeness for Arsabil's proposed-building preview.
- Do not treat Studio geometry as legal zoning/cadastral approval.
- Do not mix the furniture marketplace into the initial Studio code path.

## Acceptance Principles

- The first Studio MVP must answer: "Bu arsada, bu fizibilite varsayimlariyla kaba proje kutlesi nasil gorunur?"
- The 3D view must be explainable by the calculator data; no hidden magic numbers.
- All geometry transformations must be testable without WebGL.
- Rendering code must consume prepared data, not recalculate feasibility rules inside the component.

